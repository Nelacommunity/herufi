-- Free shipping applies to sea freight only, and is applied automatically.
-- Every option now reports its full calculated price (list_price) alongside the charged price,
-- so the storefront can advertise the saving (struck-through price + "Free").

alter table public.shipping_rates add column if not exists free_max_cbm numeric(10,4);

-- Air cargo and express are always charged; sea freight is free on every order by default
-- (free_over = 0). Admins can set a minimum order (free_over) or a volume cap (free_max_cbm).
update public.shipping_rates set free_over = null, free_max_kg = null where method in ('standard', 'express');
update public.shipping_rates set free_over = 0, free_max_cbm = null where method = 'sea';

-- Show the free option first.
update public.shipping_rates set sort_order = case method when 'sea' then 0 when 'standard' then 1 else 2 end;

create or replace function public.shipping_options(items jsonb, discounted_subtotal numeric default 0)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r public.shipping_rates;
  v_kg numeric; v_cbm numeric; v_blocked text[]; v_charge numeric; v_list numeric; v_free boolean;
  v_result jsonb := '[]'::jsonb;
begin
  select coalesce(sum(l.weight_kg * l.qty), 0), coalesce(sum(l.volume_cbm * l.qty), 0) into v_kg, v_cbm
    from public.shipping_lines(items) l;

  for r in select * from shipping_rates where is_active order by sort_order loop
    select coalesce(array_agg(distinct l.name order by l.name), '{}') into v_blocked
      from public.shipping_lines(items) l where not (r.method = any(l.methods));

    if r.rate_per_cbm is not null then
      v_charge := round(v_cbm, 4);
      v_list := greatest(r.min_charge, ceil(v_cbm * r.rate_per_cbm / 500) * 500);
      v_free := r.free_over is not null and discounted_subtotal >= r.free_over
                and (r.free_max_cbm is null or v_cbm <= r.free_max_cbm);
    else
      v_charge := greatest(0.5, ceil(greatest(v_kg, v_cbm * r.volumetric_kg_per_cbm) * 2) / 2.0);
      v_list := greatest(r.min_charge, v_charge * r.rate_per_kg);
      v_free := r.free_over is not null and discounted_subtotal >= r.free_over
                and (r.free_max_kg is null or v_charge <= r.free_max_kg);
    end if;
    if v_kg = 0 then v_list := 0; v_free := false; end if;

    v_result := v_result || jsonb_build_object(
      'method', r.method,
      'available', cardinality(v_blocked) = 0,
      'blocked_by', to_jsonb(v_blocked),
      'list_price', v_list,
      'free', v_free,
      'price', case when v_free then 0 else v_list end,
      'chargeable', v_charge,
      'unit', case when r.rate_per_cbm is not null then 'cbm' else 'kg' end,
      'rate', coalesce(r.rate_per_kg, r.rate_per_cbm),
      'min_charge', r.min_charge,
      'free_over', r.free_over,
      'free_max_kg', r.free_max_kg,
      'free_max_cbm', r.free_max_cbm,
      'eta_min', r.eta_min_days,
      'eta_max', r.eta_max_days,
      'weight_kg', round(v_kg, 3),
      'volume_cbm', round(v_cbm, 4)
    );
  end loop;
  return v_result;
end $$;

-- Record how much shipping the customer saved, for receipts and reporting.
alter table public.orders add column if not exists shipping_saved numeric(12,2) not null default 0 check (shipping_saved >= 0);

create or replace function public.record_shipping_saving()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Runs once per insert statement (place_order inserts all items of an order in one statement).
  update orders o set shipping_saved = coalesce((
    select (opt->>'list_price')::numeric - (opt->>'price')::numeric
    from jsonb_array_elements(public.shipping_options(
      (select jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'quantity', oi.quantity))
         from order_items oi where oi.order_id = o.id and oi.product_id is not null),
      o.subtotal - o.discount)) opt
    where opt->>'method' = o.delivery_method), 0)
  where o.id in (select distinct order_id from new_items) and o.shipping = 0;
  return null;
end $$;

drop trigger if exists order_items_shipping_saving on public.order_items;
create trigger order_items_shipping_saving after insert on public.order_items
  referencing new table as new_items
  for each statement execute function public.record_shipping_saving();
