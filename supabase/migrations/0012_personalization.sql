-- Personalised "For you" feed that learns from each shopper.
--
-- The apps log light-weight behaviour events (views, time spent, taps on feed cards, searches, and which
-- cards were shown). for_you_feed() turns them into a ranking per shopper:
--   * interest in products, categories, brands and a price range, with older activity fading out
--     (half-life 7 days; purchases 30 days),
--   * "people who looked at this also looked at" similarity from every shopper's activity,
--   * recent searches,
--   * popularity, rating, newness and real discounts for cold start,
--   * fatigue for cards shown repeatedly without a tap,
--   * a per-shopper bandit over the reason a card was picked ("similar", "search", "deal", ...): reasons this
--     shopper taps get boosted, reasons they ignore get damped,
--   * some exploration (more for new shoppers) and a per-category diversity penalty.
-- Guests are tracked by a random device id; claim_device_activity() moves it to their account on sign-in.

create table if not exists public.shopper_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  device_id text check (device_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  kind text not null check (kind in ('view', 'dwell', 'click', 'impression', 'search')),
  product_id uuid references public.products(id) on delete cascade,
  query text check (char_length(query) <= 100),
  reason text check (char_length(reason) <= 20),
  weight real not null default 1 check (weight between 0 and 5),
  created_at timestamptz not null default now(),
  check (user_id is not null or device_id is not null)
);
create index if not exists shopper_events_user_idx on public.shopper_events(user_id, created_at desc) where user_id is not null;
create index if not exists shopper_events_device_idx on public.shopper_events(device_id, created_at desc) where device_id is not null;
create index if not exists shopper_events_product_idx on public.shopper_events(product_id, created_at desc) where product_id is not null;
create index if not exists shopper_events_recent_idx on public.shopper_events(created_at);

-- Only reachable through the functions below.
alter table public.shopper_events enable row level security;
revoke all on public.shopper_events from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Logging
-- ---------------------------------------------------------------------------
create or replace function public.track_events(p_device text, p_events jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_dev text := case when p_device ~ '^[A-Za-z0-9_-]{8,64}$' then p_device end;
  uuid_re constant text := '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
begin
  if (v_uid is null and v_dev is null) or jsonb_typeof(p_events) is distinct from 'array' then return; end if;
  -- Flood guard: at most 600 events per shopper per hour.
  if (select count(*) from shopper_events e
      where e.created_at > now() - interval '1 hour'
        and case when v_uid is not null then e.user_id = v_uid else e.device_id = v_dev end) > 600 then
    return;
  end if;

  insert into shopper_events (user_id, device_id, kind, product_id, query, reason, weight)
  select v_uid, v_dev, x.e->>'kind', p.id,
         left(nullif(trim(x.e->>'query'), ''), 100),
         left(nullif(x.e->>'reason', ''), 20),
         least(greatest(coalesce(case when jsonb_typeof(x.e->'weight') = 'number' then (x.e->>'weight')::real end, 1), 0), 5)
  from (select value as e from jsonb_array_elements(p_events) limit 50) x
  left join products p on p.id = case when x.e->>'product_id' ~ uuid_re then (x.e->>'product_id')::uuid end
  where x.e->>'kind' in ('view', 'dwell', 'click', 'impression', 'search')
    and (p.id is not null or (x.e->>'kind' = 'search' and coalesce(trim(x.e->>'query'), '') <> ''));

  -- Keep the table small: drop activity older than 180 days now and then.
  if random() < 0.002 then
    delete from shopper_events where created_at < now() - interval '180 days';
  end if;
end $$;

-- Moves a guest's activity to the signed-in account.
create or replace function public.claim_device_activity(p_device text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_device !~ '^[A-Za-z0-9_-]{8,64}$' then return; end if;
  update shopper_events set user_id = auth.uid() where device_id = p_device and user_id is null;
end $$;

-- "Clear my history": the shopper's activity on this device and account.
create or replace function public.clear_my_activity(p_device text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then delete from shopper_events where user_id = auth.uid(); end if;
  if p_device ~ '^[A-Za-z0-9_-]{8,64}$' then
    delete from shopper_events where device_id = p_device and (user_id is null or user_id = auth.uid());
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Ranking
-- ---------------------------------------------------------------------------
-- p_hot:    products the device knows the shopper wants (guest bag and saved items).
-- p_anchor: the product being looked at ("You may also like" on a product page).
-- p_exclude: ids already on screen, for infinite scroll.
-- p_seed:   changes the exploration order; keep it fixed while paging one feed.
create or replace function public.for_you_feed(
  p_device text default null,
  p_limit int default 20,
  p_exclude uuid[] default '{}',
  p_hot uuid[] default '{}',
  p_anchor uuid default null,
  p_seed text default ''
)
returns table (id uuid, reason text, anchor_id uuid, anchor_name text, score real)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
  v_dev text := case when p_device ~ '^[A-Za-z0-9_-]{8,64}$' then p_device end;
  v_events int;
  v_explore real;
begin
  select count(*) into v_events from shopper_events e
  where (e.user_id = v_uid or e.device_id = v_dev) and e.kind <> 'impression' and e.created_at > now() - interval '90 days';
  -- New shoppers see more variety; it settles as we learn what they like.
  v_explore := 0.2 + 0.6 / (1 + v_events / 15.0);

  return query
  with mine as (
    select e.kind, e.product_id, e.query, e.reason, e.weight,
           exp(-ln(2) * extract(epoch from now() - e.created_at) / (7 * 86400))::real as decay,
           e.created_at
    from shopper_events e
    where (e.user_id = v_uid or e.device_id = v_dev) and e.created_at > now() - interval '90 days'
    order by e.created_at desc
    limit 1000
  ),
  -- Interest per product -----------------------------------------------------
  signals as (
    select m.product_id, (case m.kind when 'view' then 1.0 when 'dwell' then 0.5 * m.weight when 'click' then 0.5 else 0 end * m.decay)::real as w
      from mine m where m.product_id is not null and m.kind in ('view', 'dwell', 'click')
    union all
    select oi.product_id, (5 * exp(-ln(2) * extract(epoch from now() - o.created_at) / (30 * 86400)))::real
      from orders o join order_items oi on oi.order_id = o.id
      where v_uid is not null and o.user_id = v_uid and oi.product_id is not null and o.created_at > now() - interval '1 year'
    union all
    select ci.product_id, 4::real from carts c join cart_items ci on ci.cart_id = c.id where v_uid is not null and c.user_id = v_uid
    union all
    select wi.product_id, 3::real from wishlists w join wishlist_items wi on wi.wishlist_id = w.id where v_uid is not null and w.user_id = v_uid
    union all
    select h, 3.5::real from unnest(coalesce(p_hot, '{}')) h
    union all
    select p_anchor, 10::real where p_anchor is not null
  ),
  interest as (
    select s.product_id, sum(s.w)::real as w from signals s group by s.product_id having sum(s.w) > 0
  ),
  liked as (
    select i.product_id, i.w, p.category_id, p.brand, ln(greatest(p.price, 1)) as lp, p.name
    from interest i join products p on p.id = i.product_id
  ),
  cat_aff as (
    select l.category_id, sum(l.w) / nullif((select sum(w) from liked), 0) as a from liked l where l.category_id is not null group by l.category_id
  ),
  brand_aff as (
    select l.brand, sum(l.w) / nullif((select sum(w) from liked), 0) as a from liked l where l.brand <> '' group by l.brand
  ),
  price_band as (
    select sum(l.w * l.lp) / nullif(sum(l.w), 0) as mu,
           greatest(0.35, sqrt(greatest(sum(l.w * l.lp * l.lp) / nullif(sum(l.w), 0) - power(sum(l.w * l.lp) / nullif(sum(l.w), 0), 2), 0))) as sigma
    from liked l
  ),
  -- The product in each category this shopper cares most about, for "Because you viewed ...".
  cat_anchor as (
    select distinct on (l.category_id) l.category_id, l.product_id, l.name from liked l order by l.category_id, l.w desc
  ),
  -- "Also viewed" from everyone else's recent activity --------------------
  seeds as (select l.product_id, l.w, l.name from liked l order by l.w desc limit 12),
  peers as (
    select distinct coalesce(e.user_id::text, e.device_id) as who, e.product_id
    from shopper_events e
    where e.product_id is not null and e.kind in ('view', 'dwell', 'click') and e.created_at > now() - interval '60 days'
      and not coalesce(e.user_id = v_uid or e.device_id = v_dev, false)
  ),
  item_n as (select pe.product_id, count(*)::real as n from peers pe group by pe.product_id),
  co_raw as (
    select b.product_id, s.product_id as seed, s.name as seed_name, s.w / sqrt(na.n * nb.n) as sim
    from seeds s
    join peers a on a.product_id = s.product_id
    join peers b on b.who = a.who and b.product_id <> a.product_id
    join item_n na on na.product_id = a.product_id
    join item_n nb on nb.product_id = b.product_id
  ),
  co as (
    select c.product_id, sum(c.sim) as sim,
           (array_agg(c.seed order by c.sim desc))[1] as seed,
           (array_agg(c.seed_name order by c.sim desc))[1] as seed_name
    from co_raw c group by c.product_id
  ),
  co_max as (select greatest(max(sim), 1e-9) as m from co),
  -- Searches -----------------------------------------------------------------
  searches as (
    select m.query, sum(m.decay) as w from mine m where m.kind = 'search' and m.query is not null
    group by m.query order by sum(m.decay) desc limit 8
  ),
  search_hit as (
    select p.id as product_id, sum(s.w) as w
    from searches s join products p on p.is_active and p.search_vector @@ public.to_prefix_tsquery(s.query)
    group by p.id
  ),
  search_max as (select greatest(max(w), 1e-9) as m from search_hit),
  -- Feedback on cards shown --------------------------------------------------
  shown as (
    select m.product_id,
           count(*) filter (where m.kind = 'impression' and m.created_at > now() - interval '3 days') as seen,
           count(*) filter (where m.kind = 'click') as taps
    from mine m where m.product_id is not null and m.kind in ('impression', 'click') group by m.product_id
  ),
  -- Per-shopper bandit over reasons: posterior tap rate vs. a 10% prior.
  bandit as (
    select m.reason,
           least(1.8, greatest(0.6,
             ((count(*) filter (where m.kind = 'click') + 1.0) / (count(*) filter (where m.kind = 'impression') + 10.0)) / 0.1
           ))::real as mult
    from mine m where m.reason is not null and m.kind in ('impression', 'click') group by m.reason
  ),
  bought as (
    select oi.product_id from orders o join order_items oi on oi.order_id = o.id
    where v_uid is not null and o.user_id = v_uid and oi.product_id is not null
  ),
  in_bag as (
    select ci.product_id from carts c join cart_items ci on ci.cart_id = c.id where v_uid is not null and c.user_id = v_uid
    union select h from unnest(coalesce(p_hot, '{}')) h
  ),
  pop_max as (select greatest(max(ln(1 + p.sales_count)), 1e-9) as m from products p where p.is_active),
  -- Candidates and their score parts -----------------------------------------
  parts as (
    select p.id, p.category_id, p.name,
      coalesce(ca.a, 0) * 1.6                                                       as s_cat,
      coalesce(ba.a, 0) * 0.6                                                       as s_brand,
      coalesce(co.sim / (select m from co_max), 0) * 2.0                            as s_co,
      coalesce(sh.w / (select m from search_max), 0) * 1.4                          as s_search,
      case when pb.mu is null then 0
           else 0.8 * exp(-power(ln(greatest(p.price, 1)) - pb.mu, 2) / (2 * power(pb.sigma, 2))) end as s_price,
      0.5 * ln(1 + p.sales_count) / (select m from pop_max)                         as s_pop,
      0.3 * ((p.rating * p.review_count + 4.0 * 5) / (p.review_count + 5) - 3) / 2 as s_quality,
      0.45 * greatest(0, 1 - extract(epoch from now() - p.created_at) / (14 * 86400)) as s_new,
      0.35 * least(1, p.discount_percent / 50.0)                                    as s_deal,
      -- Viewed but not bought: worth showing again, less so once it has been shown a few times.
      case when i.w is not null and p.id <> coalesce(p_anchor, '00000000-0000-0000-0000-000000000000'::uuid)
           then 0.6 * least(1, i.w / 3) else 0 end                                 as s_again,
      least(1.5, 0.25 * coalesce(sw.seen, 0) * case when coalesce(sw.taps, 0) > 0 then 0.4 else 1 end) as fatigue,
      v_explore * ('x' || substr(md5(p.id::text || coalesce(p_seed, '') || coalesce(v_uid::text, v_dev, '')), 1, 7))::bit(28)::int / 268435455.0 as s_explore,
      co.seed as co_seed, co.seed_name as co_seed_name,
      can.product_id as cat_seed, can.name as cat_seed_name
    from products p
    left join cat_aff ca on ca.category_id = p.category_id
    left join brand_aff ba on ba.brand = p.brand
    left join co on co.product_id = p.id
    left join search_hit sh on sh.product_id = p.id
    left join interest i on i.product_id = p.id
    left join shown sw on sw.product_id = p.id
    left join cat_anchor can on can.category_id = p.category_id and can.product_id <> p.id
    cross join price_band pb
    where p.is_active
      and p.id <> all(coalesce(p_exclude, '{}'))
      and p.id is distinct from p_anchor
      and p.id not in (select b.product_id from bought b)
      and p.id not in (select ib.product_id from in_bag ib where ib.product_id is not null)
      and (p.stock_quantity > 0 or exists (select 1 from product_variants v where v.product_id = p.id and v.stock_quantity > 0))
  ),
  labelled as (
    select pa.*,
      case
        when g <= 0 or g = pa.s_explore then 'explore'
        when g = pa.s_co then 'similar'
        when g = pa.s_search then 'search'
        when g = pa.s_again then 'again'
        when g = pa.s_cat + pa.s_brand then case when pa.cat_seed is not null then 'viewed' when pa.s_again > 0 then 'again' else 'category' end
        when g = pa.s_deal * 2 then 'deal'
        when g = pa.s_new * 2 then 'new'
        else 'popular' end as why
    from parts pa
    cross join lateral (select greatest(pa.s_co, pa.s_cat + pa.s_brand, pa.s_search, pa.s_again, pa.s_deal * 2,
                                        pa.s_new * 2, pa.s_pop + pa.s_quality, pa.s_explore) as g) gx
  ),
  scored as (
    select l.*,
      ((l.s_cat + l.s_brand + l.s_co + l.s_search + l.s_price + l.s_pop + l.s_quality + l.s_new + l.s_deal + l.s_again + l.s_explore - l.fatigue)
        * coalesce(b.mult, 1))::real as total
    from labelled l left join bandit b on b.reason = l.why
  ),
  diverse as (
    select s.*, row_number() over (partition by s.category_id order by s.total desc) as cat_rank from scored s
  )
  select d.id, d.why,
         case d.why when 'similar' then d.co_seed when 'viewed' then d.cat_seed end,
         case d.why when 'similar' then d.co_seed_name when 'viewed' then d.cat_seed_name end,
         -- Each further pick from the same category counts a little less, so the feed stays varied.
         (case when d.total > 0 then d.total * power(0.85, d.cat_rank - 1) else d.total end)::real as rank_score
  from diverse d
  order by rank_score desc, d.id
  limit least(greatest(coalesce(p_limit, 20), 1), 60);
end $$;

revoke all on function public.track_events(text, jsonb), public.claim_device_activity(text),
  public.clear_my_activity(text), public.for_you_feed(text, int, uuid[], uuid[], uuid, text) from public, anon, authenticated;
grant execute on function public.track_events(text, jsonb), public.clear_my_activity(text),
  public.for_you_feed(text, int, uuid[], uuid[], uuid, text) to anon, authenticated;
grant execute on function public.claim_device_activity(text) to authenticated;
