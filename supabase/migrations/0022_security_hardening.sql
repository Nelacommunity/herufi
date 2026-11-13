-- Security hardening from the November 2026 audit.

-- 1. Trigger functions are SECURITY DEFINER and, by Supabase's default privileges, were callable by
--    anyone as RPCs. Triggers don't need EXECUTE at fire time, so revoke it.
do $$
declare f text;
begin
  foreach f in array array[
    'coupons_check_assignee()', 'handle_new_user()', 'order_items_use_group_price()', 'products_notify_saved()',
    'record_shipping_saving()', 'refresh_product_rating()', 'variants_notify_restock()', 'variants_notify_restock_insert()'
  ] loop
    if to_regprocedure('public.' || f) is not null then
      execute format('revoke all on function public.%s from public, anon, authenticated', f);
    end if;
  end loop;
end $$;

-- 2. Reviews: only real buyers can review, and the "Verified buyer" badge is now backed by data.
alter table public.reviews add column if not exists verified boolean not null default false;

create or replace function public.has_bought(p_product uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from orders o join order_items oi on oi.order_id = o.id
    where o.user_id = auth.uid() and oi.product_id = p_product and o.payment_status = 'paid' and o.status <> 'cancelled'
  );
$$;
revoke all on function public.has_bought(uuid) from public, anon;
grant execute on function public.has_bought(uuid) to authenticated;

drop policy if exists "reviews: insert own" on public.reviews;
do $$
declare p record;
begin
  -- Replace whatever insert policy reviews had with the buyers-only one.
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'reviews' and cmd = 'INSERT' loop
    execute format('drop policy %I on public.reviews', p.policyname);
  end loop;
end $$;
create policy "reviews: buyers insert own" on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()) and public.has_bought(product_id));

-- verified/created_at are set by the database, never by the client.
create or replace function public.reviews_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.verified := new.user_id is not null and exists (
    select 1 from orders o join order_items oi on oi.order_id = o.id
    where o.user_id = new.user_id and oi.product_id = new.product_id and o.payment_status = 'paid' and o.status <> 'cancelled');
  new.created_at := now();
  return new;
end $$;
revoke all on function public.reviews_stamp() from public, anon, authenticated;
drop trigger if exists reviews_stamp on public.reviews;
create trigger reviews_stamp before insert on public.reviews for each row execute function public.reviews_stamp();

-- Questions: the posting time is set by the database too.
create or replace function public.questions_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  new.answered_at := null;
  return new;
end $$;
revoke all on function public.questions_stamp() from public, anon, authenticated;
drop trigger if exists questions_stamp on public.product_questions;
create trigger questions_stamp before insert on public.product_questions for each row execute function public.questions_stamp();

-- 3. Don't publish shoppers' account ids next to their reviews and questions.
revoke select on public.reviews from anon, authenticated;
grant select (id, product_id, author_name, rating, title, content, created_at, verified) on public.reviews to anon, authenticated;
revoke select on public.product_questions from anon, authenticated;
grant select (id, product_id, author_name, question, answer, answered_at, created_at) on public.product_questions to anon, authenticated;

-- 4. Cap payment attempts per order so nobody can spam mobile-money prompts using an order.
alter table public.orders add column if not exists payment_attempts int not null default 0;
