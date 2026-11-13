-- Bigger money columns.
--
-- Money was numeric(10,2): at most TSh 99,999,999.99. That's too small for a shop selling phones
-- and laptops: a line of 25 iPhones, or a business order, would overflow. Every numeric(10,2)
-- column in public becomes numeric(14,2) (up to about TSh 1 trillion), and resolve_lines(), which
-- rounds line prices to the column size, uses the new size too.

-- products.discount_percent is generated from price/compare_at_price, and Postgres can't change the
-- type of a column a generated column uses, so it's dropped and re-added around the change.
alter table public.products drop column if exists discount_percent;

do $$
declare c record; tr record; saved text[] := '{}';
begin
  -- Triggers that fire on changes to specific money columns (e.g. price-drop alerts) block a type
  -- change: keep their definitions, drop them, and re-create them afterwards.
  for tr in
    select t.tgname, t.tgrelid::regclass as tbl, pg_get_triggerdef(t.oid) as def
    from pg_trigger t
    where not t.tgisinternal and t.tgattr::int2[] <> '{}'::int2[]
      and exists (select 1 from unnest(t.tgattr::int2[]) k join pg_attribute a on a.attrelid = t.tgrelid and a.attnum = k
                  where format_type(a.atttypid, a.atttypmod) = 'numeric(10,2)')
  loop
    saved := saved || tr.def;
    execute format('drop trigger %I on %s', tr.tgname, tr.tbl);
  end loop;

  for c in
    select table_name, column_name from information_schema.columns
    where table_schema = 'public' and data_type = 'numeric' and numeric_precision = 10 and numeric_scale = 2
    order by table_name, column_name
  loop
    execute format('alter table public.%I alter column %I type numeric(14,2)', c.table_name, c.column_name);
  end loop;

  for i in 1 .. coalesce(array_length(saved, 1), 0) loop
    execute saved[i];
  end loop;
end $$;

alter table public.products add column discount_percent int generated always as (
  case when compare_at_price is not null and compare_at_price > price and compare_at_price > 0
    then floor((compare_at_price - price) / compare_at_price * 100)::int
    else 0 end
) stored;
create index if not exists products_discount_idx on public.products(discount_percent desc) where is_active and discount_percent > 0;

-- resolve_lines: same as 0013, with numeric(14,2) rounding.
create or replace function public.resolve_lines(items jsonb)
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
  select x.id, x.v_id, x.quantity, u.unit, (u.unit * x.quantity)::numeric(14,2),
         x.name, x.slug,
         case when x.v_id is null then null else x.v_name || ': ' || x.v_value end,
         coalesce(x.v_image, (select pi.image_url from product_images pi where pi.product_id = x.id order by pi.sort_order limit 1)),
         coalesce(x.v_stock, x.stock_quantity),
         x.gp is not null and x.gp < x.price
  from priced x
  cross join lateral (select (case when x.gp is not null and x.gp < x.price then x.gp else x.price end + x.extra)::numeric(14,2) as unit) u;
$$;
revoke all on function public.resolve_lines(jsonb) from public, anon, authenticated;
