-- Computers & Gaming category (laptops, gaming PCs, monitors, keyboards, mice, headsets).
-- Its SEO landing copy lives in src/lib/seo-keywords.ts under the "computers" slug.
insert into public.categories (name, slug, description, image_url, sort_order)
select
  'Computers & Gaming',
  'computers',
  'Laptops, gaming PCs, monitors and peripherals for work and play.',
  'https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=80',
  coalesce((select max(sort_order) + 1 from public.categories), 0)
on conflict (slug) do nothing;
