-- Snippe payment collection (mobile money USSD push + hosted card checkout).
-- Orders are now created as pending/unpaid; the Snippe webhook (service role)
-- settles them via settle_order_payment(). Nothing client-side can mark an
-- order paid.

alter table public.orders
  add column if not exists payment_reference text,
  add column if not exists payment_provider text;
create unique index if not exists orders_payment_reference_key on public.orders(payment_reference) where payment_reference is not null;

-- Snippe may deliver a webhook event more than once; every processed event id is recorded here first.
create table if not exists public.snippe_webhook_events (
  id text primary key,
  event_type text not null,
  received_at timestamptz not null default now()
);
alter table public.snippe_webhook_events enable row level security;
-- No policies: only the service role (webhook route) touches this table.

-- place_order: identical to 0006 except the order starts pending/unpaid and
-- stays that way until Snippe confirms the payment.
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

  if v_uid is not null then
    delete from cart_items ci using carts c
      where ci.cart_id = c.id and c.user_id = v_uid and not ci.saved_for_later;
  end if;

  return jsonb_build_object('id', v_order.id, 'order_number', v_order.order_number, 'total', v_order.total);
end $$;

revoke all on function public.place_order(jsonb, text, jsonb, text, jsonb, text) from public;
grant execute on function public.place_order(jsonb, text, jsonb, text, jsonb, text) to anon, authenticated;

-- Called only by the webhook route (service role). Idempotent: only a pending
-- order can be settled. A failed/expired/cancelled payment cancels the order
-- and returns its stock.
create or replace function public.settle_order_payment(p_reference text, p_outcome text)
returns text language plpgsql volatile security definer set search_path = public as $$
declare v_order public.orders;
begin
  select * into v_order from orders where payment_reference = p_reference for update;
  if not found then return 'unknown'; end if;
  if v_order.payment_status <> 'pending' then return 'already_' || v_order.payment_status; end if;

  if p_outcome = 'paid' then
    update orders set payment_status = 'paid', status = 'confirmed' where id = v_order.id;
    return 'paid';
  elsif p_outcome = 'failed' then
    update product_variants v set stock_quantity = v.stock_quantity + oi.quantity
      from order_items oi
      where oi.order_id = v_order.id and v.product_id = oi.product_id and oi.variant = v.name || ': ' || v.value;
    update products p set stock_quantity = p.stock_quantity + oi.quantity, sales_count = greatest(0, p.sales_count - oi.quantity)
      from order_items oi
      where oi.order_id = v_order.id and p.id = oi.product_id and oi.variant is null;
    update orders set payment_status = 'failed', status = 'cancelled' where id = v_order.id;
    return 'failed';
  end if;
  raise exception 'INVALID_OUTCOME';
end $$;

revoke all on function public.settle_order_payment(text, text) from public, anon, authenticated;
grant execute on function public.settle_order_payment(text, text) to service_role;
