-- Weight/volume-based cargo pricing from China to Tanzania, with per-product method availability.
--   Air cargo (standard) and express are charged per kg on the chargeable weight
--   = max(actual weight, volumetric weight), rounded up to 0.5 kg.
--   Sea freight is charged per cubic metre (CBM).
-- A method is available for an order only if every product in it allows that method.

-- Product shipping attributes ----------------------------------------------------
alter table public.products
  add column if not exists weight_kg numeric(8,3) not null default 0.5 check (weight_kg > 0),
  add column if not exists length_cm numeric(7,1) not null default 20 check (length_cm > 0),
  add column if not exists width_cm numeric(7,1) not null default 15 check (width_cm > 0),
  add column if not exists height_cm numeric(7,1) not null default 10 check (height_cm > 0),
  add column if not exists shipping_methods text[] not null default '{standard,express,sea}'
    check (cardinality(shipping_methods) > 0 and shipping_methods <@ array['standard','express','sea']);

alter table public.products
  add column if not exists volume_cbm numeric(12,6) generated always as (length_cm * width_cm * height_cm / 1000000.0) stored;

-- Products use column-level grants (see 0002_security.sql); allow admins to set the new columns.
grant insert (weight_kg, length_cm, width_cm, height_cm, shipping_methods) on public.products to authenticated;
grant update (weight_kg, length_cm, width_cm, height_cm, shipping_methods) on public.products to authenticated;

-- Rates (admin-editable) ------------------------------------------------------------
create table if not exists public.shipping_rates (
  method text primary key check (method in ('standard','express','sea')),
  rate_per_kg numeric(12,2) check (rate_per_kg is null or rate_per_kg >= 0),     -- air / express
  rate_per_cbm numeric(14,2) check (rate_per_cbm is null or rate_per_cbm >= 0),  -- sea
  volumetric_kg_per_cbm numeric(8,2) not null default 167,  -- 167 = 6000 cm³/kg divisor
  min_charge numeric(12,2) not null default 0,
  free_over numeric(14,2),        -- free when the discounted subtotal reaches this…
  free_max_kg numeric(8,2),       -- …and the chargeable weight is at most this
  eta_min_days int not null check (eta_min_days > 0),
  eta_max_days int not null check (eta_max_days >= eta_min_days),
  is_active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now(),
  check ((rate_per_kg is null) <> (rate_per_cbm is null))
);
create trigger shipping_rates_updated_at before update on public.shipping_rates
  for each row execute function public.set_updated_at();

alter table public.shipping_rates enable row level security;
create policy "shipping_rates: public read" on public.shipping_rates for select using (true);
create policy "shipping_rates: admin write" on public.shipping_rates for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.shipping_rates from anon, authenticated;

insert into public.shipping_rates (method, rate_per_kg, rate_per_cbm, volumetric_kg_per_cbm, min_charge, free_over, free_max_kg, eta_min_days, eta_max_days, sort_order)
values
  ('standard', 28000, null, 167, 14000, 250000, 2, 10, 14, 0),
  ('express',  55000, null, 200, 55000, null,   null, 5, 7, 1),
  ('sea',      null, 1000000, 167, 15000, null, null, 35, 45, 2)
on conflict (method) do nothing;

-- Pricing -----------------------------------------------------------------------------
create or replace function public.shipping_lines(items jsonb)
returns table (product_id uuid, qty int, weight_kg numeric, volume_cbm numeric, methods text[], name text)
language sql stable security definer set search_path = public as $$
  select p.id, l.qty, p.weight_kg, p.volume_cbm, p.shipping_methods, p.name
  from (
    select (e->>'product_id')::uuid as product_id, greatest(1, least(99, coalesce((e->>'quantity')::int, 1))) as qty
    from jsonb_array_elements(coalesce(items, '[]'::jsonb)) e
  ) l
  join products p on p.id = l.product_id and p.is_active;
$$;
revoke all on function public.shipping_lines(jsonb) from public, anon, authenticated;

-- Returns one entry per active method:
-- { method, available, blocked_by[], price, chargeable, unit, rate, min_charge, free_over, free_max_kg,
--   eta_min, eta_max, weight_kg, volume_cbm }
create or replace function public.shipping_options(items jsonb, discounted_subtotal numeric default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r public.shipping_rates;
  v_kg numeric; v_cbm numeric; v_blocked text[]; v_charge numeric; v_price numeric;
  v_result jsonb := '[]'::jsonb;
begin
  select coalesce(sum(l.weight_kg * l.qty), 0), coalesce(sum(l.volume_cbm * l.qty), 0) into v_kg, v_cbm
    from public.shipping_lines(items) l;

  for r in select * from shipping_rates where is_active order by sort_order loop
    select coalesce(array_agg(distinct l.name order by l.name), '{}') into v_blocked
      from public.shipping_lines(items) l where not (r.method = any(l.methods));

    if r.rate_per_cbm is not null then
      v_charge := round(v_cbm, 4);
      v_price := greatest(r.min_charge, ceil(v_cbm * r.rate_per_cbm / 500) * 500);
    else
      v_charge := greatest(0.5, ceil(greatest(v_kg, v_cbm * r.volumetric_kg_per_cbm) * 2) / 2.0);
      v_price := greatest(r.min_charge, v_charge * r.rate_per_kg);
      if r.free_over is not null and discounted_subtotal >= r.free_over
         and (r.free_max_kg is null or v_charge <= r.free_max_kg) then
        v_price := 0;
      end if;
    end if;
    if v_kg = 0 then v_price := 0; end if;

    v_result := v_result || jsonb_build_object(
      'method', r.method,
      'available', cardinality(v_blocked) = 0,
      'blocked_by', to_jsonb(v_blocked),
      'price', v_price,
      'chargeable', v_charge,
      'unit', case when r.rate_per_cbm is not null then 'cbm' else 'kg' end,
      'rate', coalesce(r.rate_per_kg, r.rate_per_cbm),
      'min_charge', r.min_charge,
      'free_over', r.free_over,
      'free_max_kg', r.free_max_kg,
      'eta_min', r.eta_min_days,
      'eta_max', r.eta_max_days,
      'weight_kg', round(v_kg, 3),
      'volume_cbm', round(v_cbm, 4)
    );
  end loop;
  return v_result;
end $$;

-- quote_order now prices the chosen method from shipping_options and returns every option.
create or replace function public.quote_order(items jsonb, delivery_method text default 'standard', coupon_code text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_subtotal numeric; v_discount numeric; v_msg text; v_tax numeric; v_lines jsonb; v_options jsonb; v_chosen jsonb;
begin
  select coalesce(sum(line_total), 0), coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
    into v_subtotal, v_lines from public.resolve_lines(items) r;
  select d.discount, d.message into v_discount, v_msg from public.coupon_discount(coupon_code, v_subtotal) d;
  v_options := public.shipping_options(items, v_subtotal - v_discount);
  select o into v_chosen from jsonb_array_elements(v_options) o where o->>'method' = delivery_method;
  v_tax := round((v_subtotal - v_discount) * 0.18, 0); -- VAT 18%
  return jsonb_build_object(
    'lines', v_lines,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'coupon_code', case when v_discount > 0 then upper(trim(coupon_code)) else null end,
    'coupon_message', v_msg,
    'delivery_method', delivery_method,
    'shipping', coalesce((v_chosen->>'price')::numeric, 0),
    'shipping_available', coalesce((v_chosen->>'available')::boolean, false),
    'shipping_options', v_options,
    'tax', v_tax,
    'total', v_subtotal - v_discount + coalesce((v_chosen->>'price')::numeric, 0) + v_tax
  );
end $$;

-- place_order: same as 0005 plus a check that the chosen method is available for every item.
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

drop function if exists public.shipping_cost(text, numeric);
