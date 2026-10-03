-- Row Level Security, column privileges and storage policies.

alter table public.profiles          enable row level security;
alter table public.categories        enable row level security;
alter table public.products          enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_variants  enable row level security;
alter table public.carts             enable row level security;
alter table public.cart_items        enable row level security;
alter table public.wishlists         enable row level security;
alter table public.wishlist_items    enable row level security;
alter table public.addresses         enable row level security;
alter table public.payment_methods   enable row level security;
alter table public.product_views     enable row level security;
alter table public.coupons           enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.reviews           enable row level security;
alter table public.product_questions enable row level security;

-- Profiles ------------------------------------------------------------------
create policy "profiles: read own" on public.profiles
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
create policy "profiles: update own" on public.profiles
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "profiles: admin update" on public.profiles
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Users may only touch their own editable columns; role/status/email are not writable from the API.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, avatar_url, phone, marketing_opt_in) on public.profiles to authenticated;

-- Catalog: public read of active rows, admin write ---------------------------
create policy "categories: public read" on public.categories for select using (true);
create policy "categories: admin write" on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "products: public read active" on public.products for select
  using (is_active or public.is_admin());
create policy "products: admin write" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- rating/review_count/sales_count/search_vector are maintained by triggers and RPCs only.
revoke insert, update on public.products from anon, authenticated;
grant insert (category_id, name, slug, description, details, specifications, price, compare_at_price, brand, sku,
              stock_quantity, is_featured, is_active)
  on public.products to authenticated;
grant update (category_id, name, slug, description, details, specifications, price, compare_at_price, brand, sku,
              stock_quantity, is_featured, is_active)
  on public.products to authenticated;

create policy "product_images: public read" on public.product_images for select using (true);
create policy "product_images: admin write" on public.product_images for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "product_variants: public read" on public.product_variants for select using (true);
create policy "product_variants: admin write" on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Cart ---------------------------------------------------------------------
create policy "carts: own" on public.carts for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "cart_items: own" on public.cart_items for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

-- Wishlist -----------------------------------------------------------------
create policy "wishlists: own" on public.wishlists for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "wishlist_items: own" on public.wishlist_items for all to authenticated
  using (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())))
  with check (exists (select 1 from public.wishlists w where w.id = wishlist_id and w.user_id = (select auth.uid())));

-- Addresses, payment methods, views ------------------------------------------
create policy "addresses: own" on public.addresses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "payment_methods: own" on public.payment_methods for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "product_views: own" on public.product_views for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Coupons: no direct read for customers (validated through RPC); admin manages.
create policy "coupons: admin" on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Orders: read own; writes happen only through place_order() or by admins.
create policy "orders: read own" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
create policy "orders: admin update" on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke insert, delete on public.orders from anon, authenticated;
revoke update on public.orders from anon, authenticated;
grant update (status, payment_status) on public.orders to authenticated;

create policy "order_items: read own" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.user_id = (select auth.uid()) or public.is_admin())));
revoke insert, update, delete on public.order_items from anon, authenticated;

-- Reviews & questions -----------------------------------------------------
create policy "reviews: public read" on public.reviews for select using (true);
create policy "reviews: write own" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "reviews: delete own or admin" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

create policy "questions: public read" on public.product_questions for select using (true);
create policy "questions: ask" on public.product_questions for insert to authenticated
  with check (user_id = (select auth.uid()) and answer is null);
create policy "questions: admin answer" on public.product_questions for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('category-images', 'category-images', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif']),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "catalog images: admin write" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images','category-images') and public.is_admin());
create policy "catalog images: admin update" on storage.objects for update to authenticated
  using (bucket_id in ('product-images','category-images') and public.is_admin());
create policy "catalog images: admin delete" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images','category-images') and public.is_admin());

-- Avatars live under avatars/<user_id>/...
create policy "avatars: own write" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
