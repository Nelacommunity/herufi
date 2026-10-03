-- Business logic RPCs. Prices, stock and totals are always computed here, never trusted from the client.

-- ---------------------------------------------------------------------------
-- Search
-- ---------------------------------------------------------------------------

-- Turns free text into a prefix tsquery: "wire head" -> 'wire:* & head:*'
create or replace function public.to_prefix_tsquery(q text)
returns tsquery language sql immutable as $$
  select case when coalesce(trim(q), '') = '' then null else
    to_tsquery('simple', (
      select string_agg(quote_literal(lower(t)) || ':*', ' & ')
      from regexp_split_to_table(regexp_replace(q, '[^[:alnum:]\s-]', ' ', 'g'), '[\s-]+') as t
      where t <> ''
    ))
  end;
$$;

-- Set-returning so PostgREST can apply further filters, ordering and range on top.
create or replace function public.search_products(q text)
returns setof public.products language sql stable as $$
  select p.* from public.products p
  where p.is_active and (
        p.search_vector @@ public.to_prefix_tsquery(q)
     or p.search_vector @@ websearch_to_tsquery('english', q)
     or q operator(extensions.<%) p.name
     or p.brand ilike q || '%'
  )
  order by
    ts_rank(p.search_vector, coalesce(public.to_prefix_tsquery(q), websearch_to_tsquery('english', q))) desc,
    extensions.word_similarity(q, p.name) desc,
    p.sales_count desc;
$$;

create or replace function public.search_suggestions(q text, max_results int default 6)
returns table (id uuid, name text, slug text, brand text, price numeric, compare_at_price numeric, image_url text, category_name text, category_slug text)
language sql stable as $$
  select s.id, s.name, s.slug, s.brand, s.price, s.compare_at_price,
    (select i.image_url from public.product_images i where i.product_id = s.id order by i.sort_order limit 1),
    c.name, c.slug
  from public.search_products(q) s
  left join public.categories c on c.id = s.category_id
  limit greatest(1, least(max_results, 20));
$$;

create or replace function public.brand_facets(p_category_id uuid default null)
returns table (brand text, product_count bigint) language sql stable as $$
  select brand, count(*) from public.products
  where is_active and brand <> '' and (p_category_id is null or category_id = p_category_id)
  group by brand order by brand;
$$;

create or replace function public.category_counts()
returns table (category_id uuid, product_count bigint) language sql stable as $$
  select category_id, count(*) from public.products where is_active and category_id is not null group by category_id;
$$;

-- ---------------------------------------------------------------------------
-- Pricing
-- ---------------------------------------------------------------------------

-- Resolves client-supplied lines ([{product_id, variant_id, quantity}]) against the catalog.
create or replace function public.resolve_lines(items jsonb)
returns table (
  product_id uuid, variant_id uuid, quantity int, unit_price numeric, line_total numeric,
  product_name text, product_slug text, variant_label text, image_url text, available int
) language sql stable security definer set search_path = public as $$
  with input as (
    select (e->>'product_id')::uuid as product_id,
           nullif(e->>'variant_id', '')::uuid as variant_id,
           greatest(1, least(99, coalesce((e->>'quantity')::int, 1))) as quantity
    from jsonb_array_elements(coalesce(items, '[]'::jsonb)) e
  )
  select p.id, v.id, i.quantity,
         (p.price + coalesce(v.additional_price, 0))::numeric(10,2),
         ((p.price + coalesce(v.additional_price, 0)) * i.quantity)::numeric(10,2),
         p.name, p.slug,
         case when v.id is null then null else v.name || ': ' || v.value end,
         (select pi.image_url from product_images pi where pi.product_id = p.id order by pi.sort_order limit 1),
         coalesce(v.stock_quantity, p.stock_quantity)
  from input i
  join products p on p.id = i.product_id and p.is_active
  left join product_variants v on v.id = i.variant_id and v.product_id = p.id;
$$;

create or replace function public.shipping_cost(method text, discounted_subtotal numeric)
returns numeric language sql immutable as $$
  select case method
    when 'express' then 18.00
    when 'next_day' then 32.00
    else case when discounted_subtotal >= 100 or discounted_subtotal = 0 then 0 else 8.00 end
  end::numeric(10,2);
$$;

create or replace function public.coupon_discount(p_code text, p_subtotal numeric, out discount numeric, out message text)
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  discount := 0; message := null;
  if coalesce(trim(p_code), '') = '' then return; end if;
  select * into c from coupons where code = upper(trim(p_code));
  if not found or not c.is_active then message := 'This code isn''t valid.'; return; end if;
  if c.expires_at is not null and c.expires_at < now() then message := 'This code has expired.'; return; end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then message := 'This code has reached its usage limit.'; return; end if;
  if p_subtotal < c.min_subtotal then
    message := 'Spend $' || to_char(c.min_subtotal, 'FM999990.00') || ' or more to use this code.'; return;
  end if;
  discount := least(p_subtotal,
    case c.type when 'percentage' then round(p_subtotal * c.value / 100, 2) else c.value end);
end $$;

-- Authoritative quote used by cart, checkout and place_order.
create or replace function public.quote_order(items jsonb, delivery_method text default 'standard', coupon_code text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_subtotal numeric; v_discount numeric; v_msg text; v_shipping numeric; v_tax numeric; v_lines jsonb;
begin
  select coalesce(sum(line_total), 0), coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    into v_subtotal, v_lines from public.resolve_lines(items) r;
  select d.discount, d.message into v_discount, v_msg from public.coupon_discount(coupon_code, v_subtotal) d;
  v_shipping := public.shipping_cost(delivery_method, v_subtotal - v_discount);
  v_tax := round((v_subtotal - v_discount) * 0.08, 2);
  return jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'coupon_code', case when v_discount > 0 then upper(trim(coupon_code)) else null end,
    'coupon_message', v_msg,
    'shipping', v_shipping,
    'tax', v_tax,
    'total', v_subtotal - v_discount + v_shipping + v_tax
  );
end $$;

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  items jsonb, email text, shipping_address jsonb, delivery_method text, payment jsonb, coupon_code text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  q jsonb; line record; v_order public.orders; v_uid uuid := auth.uid();
begin
  if delivery_method not in ('standard','express','next_day') then raise exception 'Invalid delivery method'; end if;
  if email is null or email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'A valid email is required'; end if;
  if shipping_address is null or coalesce(shipping_address->>'line1','') = '' or coalesce(shipping_address->>'city','') = ''
     or coalesce(shipping_address->>'postal_code','') = '' or coalesce(shipping_address->>'full_name','') = '' then
    raise exception 'A complete shipping address is required';
  end if;
  if v_uid is not null and exists (select 1 from profiles where user_id = v_uid and status = 'suspended') then
    raise exception 'This account is suspended';
  end if;

  q := public.quote_order(items, delivery_method, coupon_code);
  if jsonb_array_length(q->'lines') = 0 then raise exception 'Your bag is empty'; end if;
  if coupon_code is not null and trim(coupon_code) <> '' and (q->>'coupon_message') is not null then
    raise exception '%', q->>'coupon_message';
  end if;

  -- Lock and decrement stock. Raises if anything sold out in the meantime.
  for line in select * from public.resolve_lines(items) loop
    if line.variant_id is not null then
      update product_variants set stock_quantity = stock_quantity - line.quantity
        where id = line.variant_id and stock_quantity >= line.quantity;
    else
      update products set stock_quantity = stock_quantity - line.quantity
        where id = line.product_id and stock_quantity >= line.quantity;
    end if;
    if not found then raise exception 'Only % left of %', line.available, line.product_name; end if;
    update products set sales_count = sales_count + line.quantity where id = line.product_id;
  end loop;

  insert into orders (user_id, status, email, subtotal, discount, shipping, tax, total, coupon_code,
                      delivery_method, shipping_address, payment_method, payment_status)
  values (v_uid, 'confirmed', lower(email), (q->>'subtotal')::numeric, (q->>'discount')::numeric,
          (q->>'shipping')::numeric, (q->>'tax')::numeric, (q->>'total')::numeric, q->>'coupon_code',
          delivery_method, shipping_address,
          jsonb_build_object('brand', payment->>'brand', 'last4', right(coalesce(payment->>'last4',''), 4)),
          'paid')
  returning * into v_order;

  insert into order_items (order_id, product_id, product_name, product_slug, image_url, quantity, price, variant)
  select v_order.id, r.product_id, r.product_name, r.product_slug, r.image_url, r.quantity, r.unit_price, r.variant_label
  from public.resolve_lines(items) r;

  if q->>'coupon_code' is not null then
    update coupons set used_count = used_count + 1 where code = q->>'coupon_code';
  end if;

  if v_uid is not null then
    delete from cart_items ci using carts c
      where ci.cart_id = c.id and c.user_id = v_uid and not ci.saved_for_later;
  end if;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number, 'total', v_order.total);
end $$;

revoke all on function public.place_order(jsonb, text, jsonb, text, jsonb, text) from public;
grant execute on function public.place_order(jsonb, text, jsonb, text, jsonb, text) to anon, authenticated;
revoke all on function public.resolve_lines(jsonb) from public, anon, authenticated;
revoke all on function public.coupon_discount(text, numeric) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cart & wishlist (authenticated)
-- ---------------------------------------------------------------------------
create or replace function public.my_cart_id()
returns uuid language plpgsql security definer set search_path = public as $$
declare cid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into carts (user_id) values (auth.uid()) on conflict (user_id) do update set updated_at = now()
  returning id into cid;
  return cid;
end $$;

create or replace function public.cart_set_item(p_product_id uuid, p_variant_id uuid, p_quantity int, p_saved_for_later boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_cart_id(); v_price numeric;
begin
  delete from cart_items where cart_id = cid and product_id = p_product_id
    and variant_id is not distinct from p_variant_id;
  if p_quantity <= 0 then return; end if;
  select unit_price into v_price from public.resolve_lines(jsonb_build_array(jsonb_build_object(
    'product_id', p_product_id, 'variant_id', p_variant_id, 'quantity', 1)));
  if v_price is null then raise exception 'Product unavailable'; end if;
  insert into cart_items (cart_id, product_id, variant_id, quantity, price, saved_for_later)
  values (cid, p_product_id, p_variant_id, least(p_quantity, 99), v_price, coalesce(p_saved_for_later, false));
end $$;

-- Merges a guest cart into the account cart (keeps the larger quantity per line).
create or replace function public.cart_merge(items jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid := public.my_cart_id(); r record; existing int;
begin
  for r in select * from public.resolve_lines(items) loop
    select quantity into existing from cart_items where cart_id = cid and product_id = r.product_id
      and variant_id is not distinct from r.variant_id;
    if existing is null then
      insert into cart_items (cart_id, product_id, variant_id, quantity, price)
      values (cid, r.product_id, r.variant_id, r.quantity, r.unit_price);
    elsif r.quantity > existing then
      update cart_items set quantity = r.quantity, price = r.unit_price where cart_id = cid and product_id = r.product_id
        and variant_id is not distinct from r.variant_id;
    end if;
  end loop;
end $$;

create or replace function public.my_wishlist_id()
returns uuid language plpgsql security definer set search_path = public as $$
declare wid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into wishlists (user_id) values (auth.uid()) on conflict (user_id) do update set user_id = excluded.user_id
  returning id into wid;
  return wid;
end $$;

create or replace function public.wishlist_set(p_product_id uuid, p_saved boolean)
returns void language plpgsql security definer set search_path = public as $$
declare wid uuid := public.my_wishlist_id();
begin
  if p_saved then
    insert into wishlist_items (wishlist_id, product_id) values (wid, p_product_id) on conflict do nothing;
  else
    delete from wishlist_items where wishlist_id = wid and product_id = p_product_id;
  end if;
end $$;

create or replace function public.wishlist_merge(product_ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare wid uuid := public.my_wishlist_id();
begin
  insert into wishlist_items (wishlist_id, product_id)
  select wid, p.id from products p where p.id = any(product_ids)
  on conflict do nothing;
end $$;

revoke all on function public.my_cart_id(), public.my_wishlist_id() from public, anon;
revoke all on function public.cart_set_item(uuid, uuid, int, boolean), public.cart_merge(jsonb),
  public.wishlist_set(uuid, boolean), public.wishlist_merge(uuid[]) from public, anon;
grant execute on function public.my_cart_id(), public.my_wishlist_id(), public.cart_set_item(uuid, uuid, int, boolean),
  public.cart_merge(jsonb), public.wishlist_set(uuid, boolean), public.wishlist_merge(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Recommendations
-- ---------------------------------------------------------------------------
create or replace function public.recommended_product_ids(max_results int default 8)
returns table (id uuid) language plpgsql stable security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  return query
  with signals as (
    select p.category_id, p.brand, 3 as weight from order_items oi
      join orders o on o.id = oi.order_id join products p on p.id = oi.product_id where o.user_id = v_uid
    union all
    select p.category_id, p.brand, 2 from wishlist_items wi
      join wishlists w on w.id = wi.wishlist_id join products p on p.id = wi.product_id where w.user_id = v_uid
    union all
    select p.category_id, p.brand, 1 from product_views pv join products p on p.id = pv.product_id where pv.user_id = v_uid
  ),
  seen as (
    select oi.product_id from order_items oi join orders o on o.id = oi.order_id where o.user_id = v_uid
  ),
  scored as (
    select p.id,
      coalesce((select sum(s.weight) from signals s where s.category_id = p.category_id), 0) * 2
      + coalesce((select sum(s.weight) from signals s where s.brand = p.brand), 0)
      + p.rating + ln(1 + p.sales_count) as score
    from products p
    where p.is_active and p.stock_quantity > 0 and p.id not in (select product_id from seen where product_id is not null)
  )
  select scored.id from scored order by score desc limit max_results;
end $$;

-- ---------------------------------------------------------------------------
-- Admin
-- ---------------------------------------------------------------------------
create or replace function public.admin_metrics(days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => days); prev timestamptz := since - make_interval(days => days); r jsonb;
begin
  if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from orders where created_at >= since and status <> 'cancelled'), 0),
    'revenue_prev', coalesce((select sum(total) from orders where created_at >= prev and created_at < since and status <> 'cancelled'), 0),
    'orders', (select count(*) from orders where created_at >= since),
    'orders_prev', (select count(*) from orders where created_at >= prev and created_at < since),
    'customers', (select count(*) from profiles where role = 'customer'),
    'new_customers', (select count(*) from profiles where role = 'customer' and created_at >= since),
    'products', (select count(*) from products where is_active),
    'low_stock', (select count(*) from products where is_active and stock_quantity < 10),
    'aov', coalesce((select round(avg(total), 2) from orders where created_at >= since and status <> 'cancelled'), 0),
    'repeat_rate', coalesce((select round(100.0 * count(*) filter (where n > 1) / nullif(count(*), 0), 1)
                              from (select user_id, count(*) n from orders where user_id is not null group by user_id) t), 0),
    'cart_to_order', coalesce((select round(100.0 * (select count(distinct user_id) from orders where created_at >= since and user_id is not null)
                              / nullif((select count(distinct c.user_id) from carts c join cart_items ci on ci.cart_id = c.id) +
                                       (select count(distinct user_id) from orders where created_at >= since and user_id is not null), 0), 1)), 0),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d::date, 'revenue', coalesce(x.revenue, 0), 'orders', coalesce(x.orders, 0)) order by d)
              from generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') d
              left join (select date_trunc('day', created_at) as bucket, sum(total) as revenue, count(*) as orders
                         from orders where created_at >= since and status <> 'cancelled' group by 1) x on x.bucket = d), '[]'::jsonb),
    'status_breakdown', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from orders group by status) s), '{}'::jsonb),
    'top_products', coalesce((select jsonb_agg(t) from (
        select oi.product_name as name, sum(oi.quantity) as units, sum(oi.quantity * oi.price) as revenue
        from order_items oi join orders o on o.id = oi.order_id
        where o.created_at >= since and o.status <> 'cancelled'
        group by oi.product_name order by revenue desc limit 5) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;

create or replace function public.admin_reorder_categories(ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  update categories c set sort_order = t.ord - 1
  from unnest(ids) with ordinality as t(id, ord) where c.id = t.id;
end $$;

create or replace function public.admin_set_customer_status(p_user_id uuid, p_status public.account_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot change your own status'; end if;
  update profiles set status = p_status where user_id = p_user_id;
end $$;

revoke all on function public.admin_metrics(int), public.admin_reorder_categories(uuid[]),
  public.admin_set_customer_status(uuid, public.account_status) from public, anon;
grant execute on function public.admin_metrics(int), public.admin_reorder_categories(uuid[]),
  public.admin_set_customer_status(uuid, public.account_status) to authenticated;
