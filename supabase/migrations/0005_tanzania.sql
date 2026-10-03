-- Tanzania storefront: TZS pricing, China → Tanzania delivery methods, 18% VAT,
-- Tanzanian address rules (phone required, postcode optional) and language-neutral error codes
-- that the app translates (English / Swahili).

-- Delivery: standard = air cargo (10–14 days), express = express air (5–7 days), sea = sea freight (30–45 days).
create or replace function public.shipping_cost(method text, discounted_subtotal numeric)
returns numeric language sql immutable as $$
  select case
    when discounted_subtotal = 0 then 0
    when method = 'express' then 45000
    when method = 'sea' then 8000
    else case when discounted_subtotal >= 250000 then 0 else 15000 end
  end::numeric(10,2);
$$;

-- Coupon messages are codes: invalid | expired | limit | min:<amount>
create or replace function public.coupon_discount(p_code text, p_subtotal numeric, out discount numeric, out message text)
language plpgsql stable security definer set search_path = public as $$
declare c public.coupons;
begin
  discount := 0; message := null;
  if coalesce(trim(p_code), '') = '' then return; end if;
  select * into c from coupons where code = upper(trim(p_code));
  if not found or not c.is_active then message := 'invalid'; return; end if;
  if c.expires_at is not null and c.expires_at < now() then message := 'expired'; return; end if;
  if c.usage_limit is not null and c.used_count >= c.usage_limit then message := 'limit'; return; end if;
  if p_subtotal < c.min_subtotal then message := 'min:' || c.min_subtotal::bigint; return; end if;
  discount := least(p_subtotal,
    case c.type when 'percentage' then round(p_subtotal * c.value / 100, 0) else c.value end);
end $$;
revoke all on function public.coupon_discount(text, numeric) from public, anon, authenticated;

create or replace function public.quote_order(items jsonb, delivery_method text default 'standard', coupon_code text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_subtotal numeric; v_discount numeric; v_msg text; v_shipping numeric; v_tax numeric; v_lines jsonb;
begin
  select coalesce(sum(line_total), 0), coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    into v_subtotal, v_lines from public.resolve_lines(items) r;
  select d.discount, d.message into v_discount, v_msg from public.coupon_discount(coupon_code, v_subtotal) d;
  v_shipping := public.shipping_cost(delivery_method, v_subtotal - v_discount);
  v_tax := round((v_subtotal - v_discount) * 0.18, 0); -- VAT 18%
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

-- Errors are raised as codes: EMPTY_BAG, INVALID_EMAIL, INVALID_ADDRESS, INVALID_DELIVERY,
-- SUSPENDED, COUPON:<code>, OUT_OF_STOCK:<available>:<product name>
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

  q := public.quote_order(items, delivery_method, coupon_code);
  if jsonb_array_length(q->'lines') = 0 then raise exception 'EMPTY_BAG'; end if;
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

-- Tanzanian addresses: postcode is optional.
alter table public.addresses alter column postal_code drop not null;
alter table public.addresses alter column country set default 'TZ';

