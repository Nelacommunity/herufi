-- Engagement: group buying, daily check-in rewards and alerts for saved items.
--
-- Group buying: a product can have a group price and a group size (2-5 people). A shopper starts a group and
--   shares the link; when enough people join before it expires, every member can buy that product once at the
--   group price (locked when the group started) for a few days. Nobody pays until the group is complete.
-- Daily check-in: signed-in shoppers check in once a day; every full streak (default 7 days) earns a personal,
--   single-use discount code.
-- Alerts: price drops and restocks of saved (wishlist) items, group updates and rewards land in an in-app inbox;
--   /api/notifications/push forwards new ones to phones with the Expo push service.

-- ---------------------------------------------------------------------------
-- Settings (one row)
-- ---------------------------------------------------------------------------
create table if not exists public.engagement_settings (
  id boolean primary key default true check (id),
  checkin_enabled boolean not null default true,
  checkin_cycle int not null default 7 check (checkin_cycle between 2 and 30),
  checkin_reward_type public.coupon_type not null default 'fixed',
  checkin_reward_value numeric(10,2) not null default 2000 check (checkin_reward_value > 0),
  checkin_min_subtotal numeric(10,2) not null default 20000 check (checkin_min_subtotal >= 0),
  checkin_coupon_days int not null default 14 check (checkin_coupon_days between 1 and 90),
  group_hours int not null default 24 check (group_hours between 1 and 168),
  group_price_days int not null default 7 check (group_price_days between 1 and 30),
  updated_at timestamptz not null default now(),
  check (checkin_reward_type <> 'percentage' or checkin_reward_value <= 100)
);
insert into public.engagement_settings (id) values (true) on conflict do nothing;
alter table public.engagement_settings enable row level security;
drop policy if exists "engagement_settings: read" on public.engagement_settings;
drop policy if exists "engagement_settings: manage" on public.engagement_settings;
create policy "engagement_settings: read" on public.engagement_settings for select using (true);
create policy "engagement_settings: manage" on public.engagement_settings for update to authenticated
  using (public.has_permission('discounts.manage')) with check (public.has_permission('discounts.manage'));
revoke insert, delete on public.engagement_settings from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Personal discount codes (check-in rewards)
-- ---------------------------------------------------------------------------
alter table public.coupons add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;
create index if not exists coupons_owner_idx on public.coupons(owner_user_id) where owner_user_id is not null;
drop policy if exists "coupons: own read" on public.coupons;
create policy "coupons: own read" on public.coupons for select to authenticated using (owner_user_id = (select auth.uid()));

-- Same as 0005, plus: a personal code only works for its owner.
create or replace function public.coupon_discount(p_code text, p_subtotal numeric, out discount numeric, out message text)
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  discount := 0; message := null;
  if coalesce(trim(p_code), '') = '' then return; end if;
  select * into c from coupons where code = upper(trim(p_code));
  if not found or not c.is_active then message := 'invalid'; return; end if;
  if c.owner_user_id is not null and c.owner_user_id is distinct from auth.uid() then message := 'invalid'; return; end if;
  if c.expires_at is not null and c.expires_at < now() then message := 'expired'; return; end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then message := 'limit'; return; end if;
  if p_subtotal < c.min_subtotal then message := 'min:' || c.min_subtotal::bigint; return; end if;
  discount := least(p_subtotal,
    case c.type when 'percentage' then round(p_subtotal * c.value / 100, 0) else c.value end);
end $$;
revoke all on function public.coupon_discount(text, numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Notifications inbox and push tokens
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('price_drop', 'back_in_stock', 'group_joined', 'group_complete', 'checkin_reward')),
  product_id uuid references public.products(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
create index if not exists notifications_unpushed_idx on public.notifications(created_at) where pushed_at is null;
alter table public.notifications enable row level security;
drop policy if exists "notifications: own read" on public.notifications;
drop policy if exists "notifications: own mark read" on public.notifications;
create policy "notifications: own read" on public.notifications for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: own mark read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update, delete on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

create table if not exists public.push_tokens (
  token text primary key check (token ~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  locale text not null default 'en' check (locale in ('en', 'sw')),
  platform text check (platform in ('ios', 'android', 'web')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens(user_id);
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

create or replace function public.register_push_token(p_token text, p_locale text default 'en', p_platform text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  insert into push_tokens (token, user_id, locale, platform)
  values (p_token, auth.uid(), case when p_locale = 'sw' then 'sw' else 'en' end, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, locale = excluded.locale, platform = excluded.platform, updated_at = now();
end $$;

create or replace function public.unregister_push_token(p_token text)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from push_tokens where token = p_token and user_id = auth.uid();
end $$;

-- Saved-item alerts: price drops (at least 1%) and restocks, at most one of each per product per day.
create or replace function public.notify_saved(p_product uuid, p_kind text, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into notifications (user_id, kind, product_id, data)
  select distinct w.user_id, p_kind, p_product, p_data
  from wishlist_items wi join wishlists w on w.id = wi.wishlist_id
  where wi.product_id = p_product
    and not exists (select 1 from notifications n where n.user_id = w.user_id and n.product_id = p_product
                    and n.kind = p_kind and n.created_at > now() - interval '24 hours');
$$;
revoke all on function public.notify_saved(uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.products_notify_saved()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.is_active then return null; end if;
  if new.price < old.price * 0.99 then
    perform public.notify_saved(new.id, 'price_drop',
      jsonb_build_object('name', new.name, 'slug', new.slug, 'old_price', old.price, 'new_price', new.price));
  end if;
  if old.stock_quantity = 0 and new.stock_quantity > 0
     and not exists (select 1 from product_variants v where v.product_id = new.id) then
    perform public.notify_saved(new.id, 'back_in_stock', jsonb_build_object('name', new.name, 'slug', new.slug));
  end if;
  return null;
end $$;
drop trigger if exists products_notify_saved on public.products;
create trigger products_notify_saved after update of price, stock_quantity on public.products
  for each row execute function public.products_notify_saved();

-- A product with options is back in stock when its options' total stock goes from 0 to more than 0.
create or replace function public.variants_notify_restock()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select p.id, p.name, p.slug
    from products p
    join (select n.product_id, sum(n.stock_quantity) as added from new_rows n group by n.product_id) n on n.product_id = p.id
    left join (select o.product_id, sum(o.stock_quantity) as removed from old_rows o group by o.product_id) o on o.product_id = p.id
    cross join lateral (select coalesce(sum(v.stock_quantity), 0) as now_total from product_variants v where v.product_id = p.id) t
    where p.is_active and t.now_total > 0 and t.now_total - n.added + coalesce(o.removed, 0) = 0
  loop
    perform public.notify_saved(r.id, 'back_in_stock', jsonb_build_object('name', r.name, 'slug', r.slug));
  end loop;
  return null;
end $$;

create or replace function public.variants_notify_restock_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select p.id, p.name, p.slug
    from products p
    join (select n.product_id, sum(n.stock_quantity) as added from new_rows n group by n.product_id) n on n.product_id = p.id
    cross join lateral (select coalesce(sum(v.stock_quantity), 0) as now_total from product_variants v where v.product_id = p.id) t
    where p.is_active and t.now_total > 0 and t.now_total - n.added = 0
      -- New options on a product that had none: only a restock if the product itself was sold out.
      and (exists (select 1 from product_variants v where v.product_id = p.id and v.id not in (select id from new_rows))
           or p.stock_quantity = 0)
  loop
    perform public.notify_saved(r.id, 'back_in_stock', jsonb_build_object('name', r.name, 'slug', r.slug));
  end loop;
  return null;
end $$;

drop trigger if exists variants_notify_restock on public.product_variants;
create trigger variants_notify_restock after update on public.product_variants
  referencing old table as old_rows new table as new_rows
  for each statement execute function public.variants_notify_restock();
drop trigger if exists variants_notify_restock_insert on public.product_variants;
create trigger variants_notify_restock_insert after insert on public.product_variants
  referencing new table as new_rows
  for each statement execute function public.variants_notify_restock_insert();

-- ---------------------------------------------------------------------------
-- Daily check-in
-- ---------------------------------------------------------------------------
create table if not exists public.checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  primary key (user_id, day)
);
alter table public.checkins enable row level security;
drop policy if exists "checkins: own read" on public.checkins;
create policy "checkins: own read" on public.checkins for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on public.checkins from anon, authenticated;

-- Today's date in Tanzania, so the day rolls over at local midnight.
create or replace function public.tz_today() returns date language sql stable as $$
  select (now() at time zone 'Africa/Dar_es_Salaam')::date;
$$;

create or replace function public.checkin_streak(p_user uuid)
returns int language plpgsql stable security definer set search_path = public as $$
declare d date := public.tz_today(); n int := 0;
begin
  if not exists (select 1 from checkins where user_id = p_user and day = d) then d := d - 1; end if;
  while n < 1000 and exists (select 1 from checkins where user_id = p_user and day = d) loop
    n := n + 1; d := d - 1;
  end loop;
  return n;
end $$;
revoke all on function public.checkin_streak(uuid) from public, anon, authenticated;

-- { enabled, checked_today, streak, cycle, progress, reward_type, reward_value, min_subtotal, reward }
-- `progress` is how many of the current cycle's days are done; `reward` is the code earned by this call, if any.
create or replace function public.checkin_status(p_reward jsonb default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare s public.engagement_settings; v_streak int; v_today boolean;
begin
  select * into s from engagement_settings where id;
  if auth.uid() is null then
    return jsonb_build_object('enabled', s.checkin_enabled, 'signed_in', false, 'cycle', s.checkin_cycle,
      'reward_type', s.checkin_reward_type, 'reward_value', s.checkin_reward_value, 'min_subtotal', s.checkin_min_subtotal);
  end if;
  v_streak := public.checkin_streak(auth.uid());
  v_today := exists (select 1 from checkins where user_id = auth.uid() and day = public.tz_today());
  return jsonb_build_object(
    'enabled', s.checkin_enabled, 'signed_in', true,
    'checked_today', v_today, 'streak', v_streak, 'cycle', s.checkin_cycle,
    'progress', case when v_streak > 0 and v_streak % s.checkin_cycle = 0 and v_today then s.checkin_cycle else v_streak % s.checkin_cycle end,
    'reward_type', s.checkin_reward_type, 'reward_value', s.checkin_reward_value, 'min_subtotal', s.checkin_min_subtotal,
    'reward', p_reward
  );
end $$;

create or replace function public.daily_checkin()
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare s public.engagement_settings; v_uid uuid := auth.uid(); v_streak int; v_code text; v_reward jsonb;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from profiles where user_id = v_uid and status = 'suspended') then raise exception 'SUSPENDED'; end if;
  select * into s from engagement_settings where id;
  if not s.checkin_enabled then return public.checkin_status(); end if;

  insert into checkins (user_id, day) values (v_uid, public.tz_today()) on conflict do nothing;
  if found then
    v_streak := public.checkin_streak(v_uid);
    if v_streak % s.checkin_cycle = 0 then
      v_code := 'STREAK-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
      insert into coupons (code, description, type, value, min_subtotal, expires_at, usage_limit, owner_user_id, created_by)
      values (v_code, 'Check-in reward (' || v_streak || '-day streak)', s.checkin_reward_type, s.checkin_reward_value,
              s.checkin_min_subtotal, now() + make_interval(days => s.checkin_coupon_days), 1, v_uid, null);
      v_reward := jsonb_build_object('code', v_code, 'type', s.checkin_reward_type, 'value', s.checkin_reward_value,
        'min_subtotal', s.checkin_min_subtotal, 'expires_at', now() + make_interval(days => s.checkin_coupon_days));
      insert into notifications (user_id, kind, data) values (v_uid, 'checkin_reward', v_reward);
    end if;
  end if;
  return public.checkin_status(v_reward);
end $$;

-- ---------------------------------------------------------------------------
-- Group buying
-- ---------------------------------------------------------------------------
alter table public.products add column if not exists group_price numeric(10,2) check (group_price is null or group_price > 0);
alter table public.products add column if not exists group_size int not null default 2 check (group_size between 2 and 5);
alter table public.products drop constraint if exists products_group_price_below_price;
alter table public.products add constraint products_group_price_below_price check (group_price is null or group_price < price);
grant insert (group_price, group_size), update (group_price, group_size) on public.products to authenticated;

create table if not exists public.group_buys (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 8)),
  product_id uuid not null references public.products(id) on delete cascade,
  leader_id uuid not null references auth.users(id) on delete cascade,
  size int not null check (size between 2 and 5),
  unit_price numeric(10,2) not null check (unit_price > 0),   -- group price, locked when the group starts
  status text not null default 'open' check (status in ('open', 'complete')),
  expires_at timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists group_buys_product_idx on public.group_buys(product_id, status);
create table if not exists public.group_members (
  group_id uuid not null references public.group_buys(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  order_id uuid references public.orders(id) on delete set null,   -- set when the group price is used
  primary key (group_id, user_id)
);
create index if not exists group_members_user_idx on public.group_members(user_id);
alter table public.group_buys enable row level security;
alter table public.group_members enable row level security;
revoke all on public.group_buys, public.group_members from anon, authenticated;

-- Staff with order access can see groups (reporting).
drop policy if exists "group_buys: staff read" on public.group_buys;
drop policy if exists "group_members: staff read" on public.group_members;
create policy "group_buys: staff read" on public.group_buys for select to authenticated using (public.has_permission('orders.view'));
create policy "group_members: staff read" on public.group_members for select to authenticated using (public.has_permission('orders.view'));
grant select on public.group_buys, public.group_members to authenticated;

-- The shopper's usable group price for a product: a complete group they're in, not yet used, still in its window.
create or replace function public.my_group_price(p_product uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select min(g.unit_price) from group_buys g
  join group_members m on m.group_id = g.id
  where auth.uid() is not null and m.user_id = auth.uid() and m.order_id is null
    and g.product_id = p_product and g.status = 'complete'
    and g.completed_at > now() - make_interval(days => (select group_price_days from engagement_settings where id));
$$;
revoke all on function public.my_group_price(uuid) from public, anon, authenticated;

-- Same as 0011, plus: a line uses the shopper's unlocked group price (plus the option's extra) when lower,
-- and says so in `group_buy`.
drop function if exists public.resolve_lines(jsonb);
create function public.resolve_lines(items jsonb)
returns table (
  product_id uuid, variant_id uuid, quantity int, unit_price numeric, line_total numeric,
  product_name text, product_slug text, variant_label text, image_url text, available int, group_buy boolean
) language sql stable security definer set search_path = public as $$
  with input as (
    select (e->>'product_id')::uuid as product_id,
           nullif(e->>'variant_id', '')::uuid as variant_id,
           greatest(1, least(99, coalesce((e->>'quantity')::int, 1))) as quantity
    from jsonb_array_elements(coalesce(items, '[]'::jsonb)) e
  ),
  priced as (
    select i.quantity, p.*, v.id as v_id, v.name as v_name, v.value as v_value, v.image_url as v_image,
           v.stock_quantity as v_stock, coalesce(v.additional_price, 0) as extra,
           public.my_group_price(p.id) as gp
    from input i
    join products p on p.id = i.product_id and p.is_active
    left join product_variants v on v.id = i.variant_id and v.product_id = p.id
  )
  select x.id, x.v_id, x.quantity, u.unit, (u.unit * x.quantity)::numeric(10,2),
         x.name, x.slug,
         case when x.v_id is null then null else x.v_name || ': ' || x.v_value end,
         coalesce(x.v_image, (select pi.image_url from product_images pi where pi.product_id = x.id order by pi.sort_order limit 1)),
         coalesce(x.v_stock, x.stock_quantity),
         x.gp is not null and x.gp < x.price
  from priced x
  cross join lateral (select (case when x.gp is not null and x.gp < x.price then x.gp else x.price end + x.extra)::numeric(10,2) as unit) u;
$$;
revoke all on function public.resolve_lines(jsonb) from public, anon, authenticated;

-- When an order line is bought at the group price, mark that group membership as used.
create or replace function public.order_items_use_group_price()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  select user_id into v_user from orders where id = new.order_id;
  if v_user is null or new.product_id is null then return null; end if;
  update group_members m set order_id = new.order_id
  where (m.group_id, m.user_id) = (
    select gm.group_id, gm.user_id from group_members gm join group_buys g on g.id = gm.group_id
    where gm.user_id = v_user and gm.order_id is null and g.product_id = new.product_id and g.status = 'complete'
      and g.completed_at > now() - make_interval(days => (select group_price_days from engagement_settings where id))
    order by g.unit_price, g.completed_at limit 1);
  return null;
end $$;
drop trigger if exists order_items_use_group_price on public.order_items;
create trigger order_items_use_group_price after insert on public.order_items
  for each row execute function public.order_items_use_group_price();

-- Public view of one group: product, slots (initials only), status and the viewer's place in it.
create or replace function public.group_info(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare g public.group_buys; v_members jsonb; v_count int; v_mine public.group_members; v_status text; v_days int;
begin
  select * into g from group_buys where code = upper(trim(p_code));
  if not found then return null; end if;
  select group_price_days into v_days from engagement_settings where id;
  select count(*), coalesce(jsonb_agg(jsonb_build_object(
           'initial', upper(left(coalesce(nullif(trim(pr.full_name), ''), split_part(pr.email, '@', 1), '?'), 1)),
           'leader', m.user_id = g.leader_id,
           'me', m.user_id = auth.uid()) order by m.joined_at), '[]'::jsonb)
    into v_count, v_members
  from group_members m left join profiles pr on pr.user_id = m.user_id where m.group_id = g.id;
  select * into v_mine from group_members where group_id = g.id and user_id = auth.uid();
  v_status := case when g.status = 'complete' then 'complete' when g.expires_at < now() then 'expired' else 'open' end;
  return jsonb_build_object(
    'code', g.code, 'status', v_status, 'size', g.size, 'joined', v_count, 'members', v_members,
    'expires_at', g.expires_at, 'completed_at', g.completed_at,
    'hours', round(extract(epoch from g.expires_at - g.created_at) / 3600),
    'price_until', case when g.completed_at is not null then g.completed_at + make_interval(days => v_days) end,
    'unit_price', g.unit_price,
    'am_member', v_mine.user_id is not null,
    'used', v_mine.order_id is not null,
    'can_buy', v_mine.user_id is not null and v_mine.order_id is null and g.status = 'complete'
               and g.completed_at > now() - make_interval(days => v_days),
    'product', (select jsonb_build_object('id', p.id, 'slug', p.slug, 'name', p.name, 'brand', p.brand, 'price', p.price,
                  'in_stock', p.stock_quantity > 0 or exists (select 1 from product_variants v where v.product_id = p.id and v.stock_quantity > 0),
                  'image', (select pi.image_url from product_images pi where pi.product_id = p.id order by pi.sort_order limit 1))
                from products p where p.id = g.product_id)
  );
end $$;

-- Errors: AUTH_REQUIRED, SUSPENDED, NO_GROUP_PRICE, OUT_OF_STOCK, TOO_MANY
create or replace function public.start_group(p_product uuid)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); p public.products; v_code text; s public.engagement_settings;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from profiles where user_id = v_uid and status = 'suspended') then raise exception 'SUSPENDED'; end if;
  select * into p from products where id = p_product and is_active;
  if not found or p.group_price is null or p.group_price >= p.price then raise exception 'NO_GROUP_PRICE'; end if;
  if not (p.stock_quantity > 0 or exists (select 1 from product_variants v where v.product_id = p.id and v.stock_quantity > 0)) then
    raise exception 'OUT_OF_STOCK';
  end if;
  -- Already in an open group for this product: reuse it.
  select g.code into v_code from group_buys g join group_members m on m.group_id = g.id
  where m.user_id = v_uid and g.product_id = p_product and g.status = 'open' and g.expires_at > now()
  order by g.created_at desc limit 1;
  if v_code is not null then return public.group_info(v_code); end if;
  if (select count(*) from group_buys where leader_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'TOO_MANY';
  end if;
  select * into s from engagement_settings where id;
  insert into group_buys (product_id, leader_id, size, unit_price, expires_at)
  values (p.id, v_uid, p.group_size, p.group_price, now() + make_interval(hours => s.group_hours))
  returning code into v_code;
  insert into group_members (group_id, user_id) select id, v_uid from group_buys where code = v_code;
  return public.group_info(v_code);
end $$;

-- Errors: AUTH_REQUIRED, SUSPENDED, NOT_FOUND, EXPIRED, FULL, TOO_MANY
create or replace function public.join_group(p_code text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); g public.group_buys; v_count int; v_name text;
begin
  if v_uid is null then raise exception 'AUTH_REQUIRED'; end if;
  if exists (select 1 from profiles where user_id = v_uid and status = 'suspended') then raise exception 'SUSPENDED'; end if;
  select * into g from group_buys where code = upper(trim(p_code)) for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if exists (select 1 from group_members where group_id = g.id and user_id = v_uid) then return public.group_info(g.code); end if;
  if g.status = 'complete' then raise exception 'FULL'; end if;
  if g.expires_at < now() then raise exception 'EXPIRED'; end if;
  if (select count(*) from group_members where user_id = v_uid and joined_at > now() - interval '1 day') >= 20 then
    raise exception 'TOO_MANY';
  end if;

  insert into group_members (group_id, user_id) values (g.id, v_uid);
  select count(*) into v_count from group_members where group_id = g.id;
  select name into v_name from products where id = g.product_id;
  if v_count >= g.size then
    update group_buys set status = 'complete', completed_at = now() where id = g.id;
    insert into notifications (user_id, kind, product_id, data)
    select m.user_id, 'group_complete', g.product_id, jsonb_build_object('code', g.code, 'name', v_name, 'price', g.unit_price)
    from group_members m where m.group_id = g.id;
  else
    insert into notifications (user_id, kind, product_id, data)
    values (g.leader_id, 'group_joined', g.product_id,
            jsonb_build_object('code', g.code, 'name', v_name, 'joined', v_count, 'size', g.size));
  end if;
  return public.group_info(g.code);
end $$;

-- The shopper's groups, newest first.
create or replace function public.my_groups()
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(public.group_info(g.code) order by g.created_at desc), '[]'::jsonb)
  from group_buys g join group_members m on m.group_id = g.id
  where m.user_id = auth.uid() and g.created_at > now() - interval '60 days';
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.register_push_token(text, text, text), public.unregister_push_token(text),
  public.checkin_status(jsonb), public.daily_checkin(), public.group_info(text), public.start_group(uuid),
  public.join_group(text), public.my_groups(), public.tz_today() from public, anon, authenticated;
grant execute on function public.checkin_status(jsonb), public.group_info(text), public.tz_today() to anon, authenticated;
grant execute on function public.register_push_token(text, text, text), public.unregister_push_token(text),
  public.daily_checkin(), public.start_group(uuid), public.join_group(text), public.my_groups() to authenticated;
