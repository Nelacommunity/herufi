-- Where a product is bought (e.g. its 1688 / Taobao / Alibaba page). Staff only.
--
-- Kept out of public.products on purpose: products are readable by anyone with the public
-- (anon) key, so a column there could be fetched straight from the API even if no page showed
-- it. This table has no anon access and RLS limits it to staff who manage products.

create table if not exists public.product_sources (
  product_id uuid primary key references public.products(id) on delete cascade,
  source_url text not null check (char_length(source_url) <= 2000 and source_url ~* '^https?://'),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.product_sources enable row level security;
revoke all on public.product_sources from anon;
grant select, insert, update, delete on public.product_sources to authenticated;

drop policy if exists "product_sources: staff read" on public.product_sources;
create policy "product_sources: staff read" on public.product_sources for select to authenticated
  using (public.has_permission('products.edit') or public.has_permission('products.create') or public.has_permission('orders.view'));

drop policy if exists "product_sources: staff write" on public.product_sources;
create policy "product_sources: staff write" on public.product_sources for all to authenticated
  using (public.has_permission('products.edit') or public.has_permission('products.create'))
  with check (public.has_permission('products.edit') or public.has_permission('products.create'));
