-- Variant photos: a variant (e.g. Color: Red) can point at one of its product's images.
-- The storefront shows that photo when the variant is chosen; the product's first image stays the cover.
-- Orders placed with a variant store the variant's photo on the order line.

alter table public.product_variants add column if not exists image_url text
  check (image_url is null or (char_length(image_url) <= 2048 and image_url ~ '^https://'));

-- Same as 0003, except the line image prefers the chosen variant's photo over the product cover.
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
         coalesce(v.image_url, (select pi.image_url from product_images pi where pi.product_id = p.id order by pi.sort_order limit 1)),
         coalesce(v.stock_quantity, p.stock_quantity)
  from input i
  join products p on p.id = i.product_id and p.is_active
  left join product_variants v on v.id = i.variant_id and v.product_id = p.id;
$$;
revoke all on function public.resolve_lines(jsonb) from public, anon, authenticated;
