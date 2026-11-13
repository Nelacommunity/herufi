-- Rate limiting.
--
-- 1. rate_limits + hit_rate_limit(): fixed-window counters the website uses to limit each visitor
--    (by IP) on checkout, payments, search, reviews and the newsletter. Service role only.
-- 2. place_order caps open unpaid orders per account and email, and bursts of guest orders,
--    so nobody can tie up stock with fake orders, including through the API directly.

create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Counts one hit for `p_key` in the current window; returns false once the limit is exceeded.
create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds); v_hits int;
begin
  insert into rate_limits (key, window_start, hits) values (left(p_key, 200), v_window, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  -- Occasional tidy-up of old windows.
  if random() < 0.01 then delete from rate_limits where window_start < now() - interval '1 day'; end if;
  return v_hits <= p_limit;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- place_order: same as 0018, plus the abuse limits.
create or replace function public.place_order(
  items jsonb, email text, shipping_address jsonb, delivery_method text, payment jsonb, coupon_code text default null
) returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  q jsonb; line record; v_order public.orders; v_uid uuid := auth.uid();
begin
  if delivery_method not in ('standard','express','sea') then raise exception 'INVALID_DELIVERY'; end if;
  if email is null or email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'INVALID_EMAIL'; end if;
  if shipping_address is null
     or coalesce(shipping_address->>'full_name','') = '' or coalesce(shipping_address->>'line1','') = ''
     or coalesce(shipping_address->>'city','') = '' or coalesce(shipping_address->>'phone','') = '' then
    raise exception 'INVALID_ADDRESS';
  end if;
  if v_uid is not null and exists (select 1 from profiles where user_id = v_uid and status = 'suspended') then
    raise exception 'SUSPENDED';
  end if;

  -- Abuse limits (also apply to the mobile app and direct API calls, which skip the website's
  -- per-visitor limits). Unpaid orders hold stock, so cap how many one shopper can have open.
  if v_uid is not null and (select count(*) from orders o where o.user_id = v_uid and o.payment_status = 'pending') >= 3 then
    raise exception 'TOO_MANY_PENDING';
  end if;
  if (select count(*) from orders o where o.email = lower(place_order.email) and o.payment_status = 'pending') >= 3 then
    raise exception 'TOO_MANY_PENDING';
  end if;
  -- A burst of unpaid guest orders from everywhere at once is almost certainly a script.
  if v_uid is null and (select count(*) from orders o where o.user_id is null and o.payment_status = 'pending'
                        and o.created_at > now() - interval '10 minutes') >= 40 then
    raise exception 'BUSY';
  end if;

  q := public.quote_order(items, delivery_method, coupon_code);
  if jsonb_array_length(q->'lines') = 0 then raise exception 'EMPTY_BAG'; end if;
  if not (q->>'shipping_available')::boolean then raise exception 'DELIVERY_UNAVAILABLE'; end if;
  if coupon_code is not null and trim(coupon_code) <> '' and (q->>'coupon_message') is not null then
    raise exception 'COUPON:%', q->>'coupon_message';
  end if;

  for line in select * from public.resolve_lines(items) loop
    if line.variant_id is not null then
      update product_variants set stock_quantity = stock_quantity - line.quantity
        where id = line.variant_id and stock_quantity >= line.quantity;
    else
      update products set stock_quantity = stock_quantity - line.quantity
        where id = line.product_id and stock_quantity >= line.quantity;
    end if;
    if not found then raise exception 'OUT_OF_STOCK:%:%', line.available, line.product_name; end if;
    update products set sales_count = sales_count + line.quantity where id = line.product_id;
  end loop;

  insert into orders (user_id, status, email, subtotal, discount, shipping, tax, total, coupon_code,
                      delivery_method, shipping_address, payment_method, payment_status, payment_provider)
  values (v_uid, 'pending', lower(email), (q->>'subtotal')::numeric, (q->>'discount')::numeric,
          (q->>'shipping')::numeric, (q->>'tax')::numeric, (q->>'total')::numeric, q->>'coupon_code',
          delivery_method, shipping_address,
          jsonb_build_object('brand', payment->>'brand', 'last4', right(coalesce(payment->>'last4',''), 4)),
          'pending', 'snippe')
  returning * into v_order;

  insert into order_items (order_id, product_id, product_name, product_slug, image_url, quantity, price, variant)
  select v_order.id, r.product_id, r.product_name, r.product_slug, r.image_url, r.quantity, r.unit_price, r.variant_label
  from public.resolve_lines(items) r;

  if q->>'coupon_code' is not null then
    update coupons set used_count = used_count + 1 where code = q->>'coupon_code';
  end if;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number, 'total', v_order.total);
end $$;

revoke all on function public.place_order(jsonb, text, jsonb, text, jsonb, text) from public;
grant execute on function public.place_order(jsonb, text, jsonb, text, jsonb, text) to anon, authenticated;
