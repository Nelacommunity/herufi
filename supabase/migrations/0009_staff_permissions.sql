-- Step 2 of 2: staff roles, granular admin permissions and discount codes owned by an admin.
-- Run after 0008_super_admin_role.sql (in a separate run).
--
--   customer     - shopper.
--   admin        - staff; can only do what `permissions` lists.
--   super_admin  - everything, plus managing staff (create/remove admins and other super admins).
--
-- Every rule is enforced here, in Row Level Security and SECURITY DEFINER functions, so the website,
-- the admin app and any API client all obey the same permissions.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists permissions text[] not null default '{}';

alter table public.profiles drop constraint if exists profiles_permissions_known;
alter table public.profiles add constraint profiles_permissions_known check (permissions <@ array[
  'analytics.view',
  'orders.view', 'orders.update',
  'products.create', 'products.edit', 'products.delete',
  'categories.manage',
  'customers.view', 'customers.suspend',
  'discounts.manage',
  'shipping.manage',
  'questions.answer'
]::text[]);

-- role/permissions/status are never writable directly (column grants in 0002 only allow name, avatar, phone, opt-in);
-- staff changes go through admin_set_staff() below.

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role::text in ('admin', 'super_admin') and status = 'active'
  );
$$;

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role::text = 'super_admin' and status = 'active'
  );
$$;

create or replace function public.has_permission(p text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and status = 'active'
      and (role::text = 'super_admin' or (role::text = 'admin' and p = any(permissions)))
  );
$$;

grant execute on function public.is_admin(), public.is_super_admin(), public.has_permission(text) to anon, authenticated;

-- Existing admins had full access; keep it by making them super admins.
update public.profiles set role = 'super_admin' where role = 'admin';

-- ---------------------------------------------------------------------------
-- Policies: replace blanket is_admin() checks with specific permissions
-- ---------------------------------------------------------------------------

-- Profiles: staff with customers.view can read accounts; only super admins may edit other people's profiles.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('customers.view'));
drop policy if exists "profiles: admin update" on public.profiles;
create policy "profiles: admin update" on public.profiles for update to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- Catalog
drop policy if exists "categories: admin write" on public.categories;
create policy "categories: admin write" on public.categories for all to authenticated
  using (public.has_permission('categories.manage')) with check (public.has_permission('categories.manage'));

drop policy if exists "products: admin write" on public.products;
drop policy if exists "products: admin insert" on public.products;
drop policy if exists "products: admin update" on public.products;
drop policy if exists "products: admin delete" on public.products;
create policy "products: admin insert" on public.products for insert to authenticated
  with check (public.has_permission('products.create'));
create policy "products: admin update" on public.products for update to authenticated
  using (public.has_permission('products.edit')) with check (public.has_permission('products.edit'));
create policy "products: admin delete" on public.products for delete to authenticated
  using (public.has_permission('products.delete'));

drop policy if exists "product_images: admin write" on public.product_images;
create policy "product_images: admin write" on public.product_images for all to authenticated
  using (public.has_permission('products.create') or public.has_permission('products.edit'))
  with check (public.has_permission('products.create') or public.has_permission('products.edit'));

drop policy if exists "product_variants: admin write" on public.product_variants;
create policy "product_variants: admin write" on public.product_variants for all to authenticated
  using (public.has_permission('products.create') or public.has_permission('products.edit'))
  with check (public.has_permission('products.create') or public.has_permission('products.edit'));

drop policy if exists "questions: admin answer" on public.product_questions;
create policy "questions: admin answer" on public.product_questions for update to authenticated
  using (public.has_permission('questions.answer')) with check (public.has_permission('questions.answer'));

drop policy if exists "reviews: delete own or admin" on public.reviews;
create policy "reviews: delete own or admin" on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('products.edit'));

-- Orders
drop policy if exists "orders: read own" on public.orders;
create policy "orders: read own" on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or public.has_permission('orders.view'));
drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update" on public.orders for update to authenticated
  using (public.has_permission('orders.update')) with check (public.has_permission('orders.update'));

drop policy if exists "order_items: read own" on public.order_items;
create policy "order_items: read own" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id
                 and (o.user_id = (select auth.uid()) or public.has_permission('orders.view'))));

-- Shipping & newsletter
drop policy if exists "shipping_rates: admin write" on public.shipping_rates;
create policy "shipping_rates: admin write" on public.shipping_rates for update to authenticated
  using (public.has_permission('shipping.manage')) with check (public.has_permission('shipping.manage'));

drop policy if exists "newsletter: admin read" on public.newsletter_subscribers;
create policy "newsletter: admin read" on public.newsletter_subscribers for select to authenticated
  using (public.has_permission('customers.view'));

-- Storage: product photos follow product permissions, category covers follow categories.manage.
drop policy if exists "catalog images: admin write" on storage.objects;
drop policy if exists "catalog images: admin update" on storage.objects;
drop policy if exists "catalog images: admin delete" on storage.objects;
create policy "catalog images: admin write" on storage.objects for insert to authenticated with check (
  (bucket_id = 'product-images' and (public.has_permission('products.create') or public.has_permission('products.edit')))
  or (bucket_id = 'category-images' and public.has_permission('categories.manage')));
create policy "catalog images: admin update" on storage.objects for update to authenticated using (
  (bucket_id = 'product-images' and (public.has_permission('products.create') or public.has_permission('products.edit')))
  or (bucket_id = 'category-images' and public.has_permission('categories.manage')));
create policy "catalog images: admin delete" on storage.objects for delete to authenticated using (
  (bucket_id = 'product-images' and (public.has_permission('products.create') or public.has_permission('products.edit')))
  or (bucket_id = 'category-images' and public.has_permission('categories.manage')));

-- ---------------------------------------------------------------------------
-- Discount codes belong to an admin, so each admin's sales can be tracked
-- ---------------------------------------------------------------------------
alter table public.coupons add column if not exists assigned_admin_id uuid references public.profiles(user_id) on delete set null;
alter table public.coupons add column if not exists created_by uuid default auth.uid() references public.profiles(user_id) on delete set null;
create index if not exists coupons_assigned_admin_idx on public.coupons(assigned_admin_id);
create index if not exists orders_coupon_code_idx on public.orders(coupon_code) where coupon_code is not null;

drop policy if exists "coupons: admin" on public.coupons;
drop policy if exists "coupons: staff read" on public.coupons;
drop policy if exists "coupons: manage" on public.coupons;
-- Read: discount managers see every code; any admin sees the codes assigned to them.
create policy "coupons: staff read" on public.coupons for select to authenticated using (
  public.has_permission('discounts.manage') or (assigned_admin_id = (select auth.uid()) and public.is_admin()));
-- Write: super admins manage any code; admins with discounts.manage manage only codes assigned to themselves.
create policy "coupons: manage" on public.coupons for all to authenticated
  using (public.is_super_admin() or (public.has_permission('discounts.manage') and assigned_admin_id = (select auth.uid())))
  with check (public.is_super_admin() or (public.has_permission('discounts.manage') and assigned_admin_id = (select auth.uid())));

-- Codes can only be assigned to staff.
create or replace function public.coupons_check_assignee()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.assigned_admin_id is not null and not exists (
    select 1 from profiles where user_id = new.assigned_admin_id and role::text in ('admin', 'super_admin')
  ) then
    raise exception 'Discount codes can only be assigned to an admin' using errcode = '23514';
  end if;
  return new;
end $$;
drop trigger if exists coupons_check_assignee on public.coupons;
create trigger coupons_check_assignee before insert or update of assigned_admin_id on public.coupons
  for each row execute function public.coupons_check_assignee();

-- Per-code sales report. Admins without discounts.manage only ever see their own codes.
create or replace function public.admin_coupon_report(p_admin uuid default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_admin uuid := p_admin; r jsonb;
begin
  if not public.is_admin() then raise exception 'Forbidden' using errcode = '42501'; end if;
  if not public.has_permission('discounts.manage') then v_admin := auth.uid(); end if;
  select coalesce(jsonb_agg(row_to_json(t) order by t.revenue desc, t.code), '[]'::jsonb) into r from (
    select c.id, c.code, c.type, c.value, c.is_active, c.expires_at, c.usage_limit, c.used_count,
           c.assigned_admin_id, coalesce(p.full_name, p.email) as assigned_admin_name,
           count(o.id) filter (where o.status <> 'cancelled') as orders,
           coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0) as revenue,
           coalesce(sum(o.discount) filter (where o.status <> 'cancelled'), 0) as discount_given,
           max(o.created_at) as last_order_at
    from coupons c
    left join profiles p on p.user_id = c.assigned_admin_id
    left join orders o on o.coupon_code = c.code
    where v_admin is null or c.assigned_admin_id = v_admin
    group by c.id, p.full_name, p.email
  ) t;
  return r;
end $$;

-- Orders placed with one code (number, date, totals, status; no customer details).
create or replace function public.admin_coupon_orders(p_code text)
returns table (id uuid, order_number text, created_at timestamptz, total numeric, discount numeric, status public.order_status)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (public.has_permission('discounts.manage') or exists (
    select 1 from coupons c where c.code = upper(p_code) and c.assigned_admin_id = auth.uid() and public.is_admin()
  )) then
    raise exception 'Forbidden' using errcode = '42501';
  end if;
  return query select o.id, o.order_number, o.created_at, o.total, o.discount, o.status
    from orders o where o.coupon_code = upper(p_code) order by o.created_at desc limit 200;
end $$;

-- ---------------------------------------------------------------------------
-- Staff management (super admins only)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_staff(p_email text, p_role text, p_permissions text[] default '{}')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_target profiles%rowtype;
begin
  if not public.is_super_admin() then raise exception 'Only super admins can manage staff' using errcode = '42501'; end if;
  if p_role not in ('customer', 'admin', 'super_admin') then raise exception 'Unknown role'; end if;
  select * into v_target from profiles where lower(email) = lower(trim(p_email));
  if not found then raise exception 'No account uses that email. Ask them to sign up on the store first.'; end if;
  if v_target.user_id = auth.uid() then raise exception 'You can''t change your own role. Ask another super admin.'; end if;
  update profiles
    set role = p_role::public.user_role,
        permissions = case when p_role = 'admin' then coalesce(p_permissions, '{}') else '{}' end
    where user_id = v_target.user_id;
  return jsonb_build_object('user_id', v_target.user_id, 'email', v_target.email, 'role', p_role);
end $$;

-- ---------------------------------------------------------------------------
-- Existing admin functions now check specific permissions
-- ---------------------------------------------------------------------------
create or replace function public.admin_reorder_categories(ids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('categories.manage') then raise exception 'Forbidden' using errcode = '42501'; end if;
  update categories c set sort_order = t.ord - 1
  from unnest(ids) with ordinality as t(id, ord) where c.id = t.id;
end $$;

create or replace function public.admin_set_customer_status(p_user_id uuid, p_status public.account_status)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('customers.suspend') then raise exception 'Forbidden' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot change your own status'; end if;
  -- Staff accounts are managed by super admins only.
  if not public.is_super_admin() and exists (select 1 from profiles where user_id = p_user_id and role::text <> 'customer') then
    raise exception 'Only a super admin can suspend staff accounts' using errcode = '42501';
  end if;
  update profiles set status = p_status where user_id = p_user_id;
end $$;

-- admin_metrics keeps its body; only the permission check changes.
do $$
declare def text;
begin
  select pg_get_functiondef('public.admin_metrics(int)'::regprocedure) into def;
  def := replace(def, 'if not public.is_admin() then', 'if not public.has_permission(''analytics.view'') then');
  execute def;
end $$;

revoke all on function public.admin_coupon_report(uuid), public.admin_coupon_orders(text), public.admin_set_staff(text, text, text[]) from public, anon;
grant execute on function public.admin_coupon_report(uuid), public.admin_coupon_orders(text), public.admin_set_staff(text, text, text[]) to authenticated;
