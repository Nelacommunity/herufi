-- Keep the shopper's bag until the payment actually succeeds.
--
-- Before: place_order emptied a signed-in shopper's bag as soon as the (unpaid) order was
-- created, so a failed or cancelled payment left them with an empty bag.
-- Now: the bag is cleared only when the order is paid (settle_order_payment), and only the
-- lines that were bought. "Try again" after a failure re-uses the same bag; the abandoned
-- unpaid order is released by cancel_unpaid_order() so it doesn't keep holding stock.

-- place_order: same as 0016 without the bag clean-up.
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

-- Remove the purchased lines from the buyer's bag (signed-in shoppers; guests' bags live in the browser).
create or replace function public.clear_purchased_cart_lines(p_order_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  delete from cart_items ci
  using carts c, orders o, order_items oi
  where o.id = p_order_id and o.user_id is not null and c.user_id = o.user_id and ci.cart_id = c.id
    and not ci.saved_for_later and oi.order_id = o.id and ci.product_id = oi.product_id
    and ((ci.variant_id is null and oi.variant is null)
      or exists (select 1 from product_variants v where v.id = ci.variant_id and oi.variant = v.name || ': ' || v.value));
$$;
revoke all on function public.clear_purchased_cart_lines(uuid) from public, anon, authenticated;

-- settle_order_payment: same as 0016, plus clearing the bought lines from the bag once paid.
create or replace function public.settle_order_payment(p_reference text, p_outcome text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_order public.orders;
begin
  if p_outcome not in ('paid', 'failed') then raise exception 'INVALID_OUTCOME'; end if;
  select * into v_order from orders where payment_reference = p_reference for update;
  if not found then return 'unknown'; end if;

  if v_order.payment_status <> 'pending' then
    if p_outcome = 'paid' and v_order.payment_status = 'failed' then
      update orders set payment_status = 'paid' where id = v_order.id;
      return 'late_payment';
    end if;
    return 'already_' || v_order.payment_status;
  end if;

  if p_outcome = 'paid' then
    update orders set payment_status = 'paid', status = 'confirmed' where id = v_order.id;
    perform public.clear_purchased_cart_lines(v_order.id);
    return 'paid';
  end if;
  perform public.release_unpaid_order(v_order.id);
  return 'failed';
end $$;
revoke all on function public.settle_order_payment(text, text) from public, anon, authenticated;
grant execute on function public.settle_order_payment(text, text) to service_role;

-- The shopper gave up on an unpaid order and is checking out again: release it now instead of
-- waiting for it to expire. Only a still-pending order changes. Called by the app (service role)
-- for the order placed in the same browser, after confirming with Snippe it wasn't paid.
create or replace function public.cancel_unpaid_order(p_order_number text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_order public.orders;
begin
  select * into v_order from orders where order_number = p_order_number for update;
  if not found then return 'unknown'; end if;
  if v_order.payment_status <> 'pending' or v_order.status <> 'pending' then return 'already_' || v_order.payment_status; end if;
  perform public.release_unpaid_order(v_order.id);
  return 'cancelled';
end $$;
revoke all on function public.cancel_unpaid_order(text) from public, anon, authenticated;
grant execute on function public.cancel_unpaid_order(text) to service_role;
