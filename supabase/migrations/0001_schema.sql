-- Herufi ecommerce schema
-- Tables, constraints, indexes, triggers, search, RLS, storage and RPCs.

create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.order_status as enum ('pending','confirmed','processing','shipped','delivered','cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('customer','admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.account_status as enum ('active','suspended');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.coupon_type as enum ('percentage','fixed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  email text,
  full_name text check (char_length(full_name) <= 120),
  avatar_url text,
  phone text check (char_length(phone) <= 40),
  role public.user_role not null default 'customer',
  status public.account_status not null default 'active',
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists profiles_role_idx on public.profiles(role);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Admin check used by RLS. SECURITY DEFINER so it can read profiles without recursion.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- Create profile, cart and wishlist for each new auth user.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (user_id) do nothing;
  insert into public.carts (user_id) values (new.id) on conflict (user_id) do nothing;
  insert into public.wishlists (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists categories_sort_idx on public.categories(sort_order);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 1 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '',
  details text[] not null default '{}',
  specifications jsonb not null default '{}'::jsonb,
  price numeric(10,2) not null check (price >= 0),
  compare_at_price numeric(10,2) check (compare_at_price is null or compare_at_price >= 0),
  discount_percent int generated always as (
    case when compare_at_price is not null and compare_at_price > price and compare_at_price > 0
      then floor((compare_at_price - price) / compare_at_price * 100)::int
      else 0 end
  ) stored,
  brand text not null default '',
  sku text unique,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  rating numeric(2,1) not null default 0 check (rating between 0 and 5),
  review_count int not null default 0 check (review_count >= 0),
  sales_count int not null default 0 check (sales_count >= 0),
  is_featured boolean not null default false,
  is_active boolean not null default true,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_category_idx on public.products(category_id) where is_active;
create index if not exists products_brand_idx on public.products(brand) where is_active;
create index if not exists products_price_idx on public.products(price) where is_active;
create index if not exists products_created_idx on public.products(created_at desc) where is_active;
create index if not exists products_sales_idx on public.products(sales_count desc) where is_active;
create index if not exists products_rating_idx on public.products(rating desc, review_count desc) where is_active;
create index if not exists products_discount_idx on public.products(discount_percent desc) where is_active and discount_percent > 0;
create index if not exists products_featured_idx on public.products(is_featured) where is_active and is_featured;
create index if not exists products_search_idx on public.products using gin(search_vector);
create index if not exists products_name_trgm_idx on public.products using gin(name extensions.gin_trgm_ops);
create index if not exists products_brand_trgm_idx on public.products using gin(brand extensions.gin_trgm_ops);
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Search vector includes the category name, so it is maintained by trigger.
create or replace function public.products_search_vector()
returns trigger language plpgsql as $$
declare cat_name text;
begin
  select name into cat_name from public.categories where id = new.category_id;
  new.search_vector :=
      setweight(to_tsvector('simple', coalesce(new.name, '')), 'A')
   || setweight(to_tsvector('simple', coalesce(new.brand, '')), 'A')
   || setweight(to_tsvector('simple', coalesce(cat_name, '')), 'B')
   || setweight(to_tsvector('english', coalesce(new.description, '')), 'C');
  return new;
end $$;
create trigger products_search_vector_trg before insert or update of name, brand, description, category_id
  on public.products for each row execute function public.products_search_vector();

create or replace function public.categories_refresh_search()
returns trigger language plpgsql as $$
begin
  if new.name is distinct from old.name then
    update public.products set category_id = category_id where category_id = new.id;
  end if;
  return new;
end $$;
create trigger categories_refresh_search_trg after update on public.categories
  for each row execute function public.categories_refresh_search();

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  sort_order int not null default 0
);
create index if not exists product_images_product_idx on public.product_images(product_id, sort_order);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),   -- e.g. "Size", "Color"
  value text not null check (char_length(value) between 1 and 60), -- e.g. "M", "Sage"
  additional_price numeric(10,2) not null default 0,
  stock_quantity int not null default 0 check (stock_quantity >= 0),
  sort_order int not null default 0,
  unique (product_id, name, value)
);
create index if not exists product_variants_product_idx on public.product_variants(product_id, sort_order);

-- ---------------------------------------------------------------------------
-- Cart & wishlist
-- ---------------------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid references public.product_variants(id) on delete cascade,
  quantity int not null check (quantity between 1 and 99),
  price numeric(10,2) not null check (price >= 0),
  saved_for_later boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists cart_items_unique_line
  on public.cart_items(cart_id, product_id, coalesce(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists cart_items_cart_idx on public.cart_items(cart_id);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (wishlist_id, product_id)
);

-- ---------------------------------------------------------------------------
-- Customer data
-- ---------------------------------------------------------------------------
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  region text,
  postal_code text not null,
  country text not null default 'US',
  phone text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists addresses_user_idx on public.addresses(user_id);

-- Only display metadata is stored. Card numbers never reach the database.
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  brand text not null,
  last4 text not null check (last4 ~ '^[0-9]{4}$'),
  exp_month int not null check (exp_month between 1 and 12),
  exp_year int not null check (exp_year between 2000 and 2100),
  cardholder_name text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists payment_methods_user_idx on public.payment_methods(user_id);

create table if not exists public.product_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  viewed_at timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index if not exists product_views_recent_idx on public.product_views(user_id, viewed_at desc);

-- ---------------------------------------------------------------------------
-- Coupons & orders
-- ---------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,32}$'),
  description text,
  type public.coupon_type not null,
  value numeric(10,2) not null check (value > 0),
  min_subtotal numeric(10,2) not null default 0,
  expires_at timestamptz,
  usage_limit int check (usage_limit is null or usage_limit > 0),
  used_count int not null default 0 check (used_count >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (type <> 'percentage' or value <= 100)
);

create sequence if not exists public.order_number_seq start 100245;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  order_number text not null unique default ('HF-' || nextval('public.order_number_seq')),
  status public.order_status not null default 'pending',
  email text not null,
  subtotal numeric(10,2) not null check (subtotal >= 0),
  discount numeric(10,2) not null default 0 check (discount >= 0),
  shipping numeric(10,2) not null default 0 check (shipping >= 0),
  tax numeric(10,2) not null default 0 check (tax >= 0),
  total numeric(10,2) not null check (total >= 0),
  coupon_code text,
  delivery_method text not null default 'standard',
  shipping_address jsonb not null,
  payment_method jsonb not null default '{}'::jsonb,
  payment_status text not null default 'paid' check (payment_status in ('pending','paid','refunded','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders(user_id, created_at desc);
create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_at desc);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  product_slug text,
  image_url text,
  quantity int not null check (quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  variant text
);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_items_product_idx on public.order_items(product_id);

-- ---------------------------------------------------------------------------
-- Reviews and Q&A
-- ---------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Verified buyer',
  rating int not null check (rating between 1 and 5),
  title text not null check (char_length(title) between 1 and 120),
  content text not null check (char_length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists reviews_product_idx on public.reviews(product_id, created_at desc);
create unique index if not exists reviews_one_per_user on public.reviews(product_id, user_id) where user_id is not null;

create or replace function public.refresh_product_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p set
    rating = coalesce((select round(avg(rating)::numeric, 1) from public.reviews where product_id = pid), 0),
    review_count = (select count(*) from public.reviews where product_id = pid)
  where p.id = pid;
  return null;
end $$;
create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_product_rating();

create table if not exists public.product_questions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Customer',
  question text not null check (char_length(question) between 5 and 1000),
  answer text,
  answered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists product_questions_product_idx on public.product_questions(product_id, created_at desc);

-- Auth trigger (after carts/wishlists exist)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
