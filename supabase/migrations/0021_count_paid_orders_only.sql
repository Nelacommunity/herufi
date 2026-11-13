-- Dashboard and reports count only orders that were actually paid, and failed orders are removed.
--
-- Since Snippe (0016), an order exists from the moment checkout starts, before any money moves.
-- Orders whose payment failed or never happened were showing up in the dashboard's order count,
-- status breakdown, coupon reports and recent orders. A "real" order now means payment_status
-- 'paid' (or 'refunded': it was paid, then cancelled). Revenue counts paid, not-cancelled orders.

create or replace function public.admin_metrics(days int default 30)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare since timestamptz := now() - make_interval(days => days); prev timestamptz := since - make_interval(days => days); r jsonb;
begin
  if not public.has_permission('analytics.view') then raise exception 'Forbidden' using errcode = '42501'; end if;
  with placed as (select * from orders where payment_status in ('paid', 'refunded')),
       earning as (select * from orders where payment_status = 'paid' and status <> 'cancelled')
  select jsonb_build_object(
    'revenue', coalesce((select sum(total) from earning where created_at >= since), 0),
    'revenue_prev', coalesce((select sum(total) from earning where created_at >= prev and created_at < since), 0),
    'orders', (select count(*) from placed where created_at >= since),
    'orders_prev', (select count(*) from placed where created_at >= prev and created_at < since),
    'customers', (select count(*) from profiles where role = 'customer'),
    'new_customers', (select count(*) from profiles where role = 'customer' and created_at >= since),
    'products', (select count(*) from products where is_active),
    'low_stock', (select count(*) from products where is_active and stock_quantity < 10),
    'aov', coalesce((select round(avg(total), 2) from earning where created_at >= since), 0),
    'repeat_rate', coalesce((select round(100.0 * count(*) filter (where n > 1) / nullif(count(*), 0), 1)
                              from (select user_id, count(*) n from placed where user_id is not null group by user_id) t), 0),
    'cart_to_order', coalesce((select round(100.0 * (select count(distinct user_id) from placed where created_at >= since and user_id is not null)
                              / nullif((select count(distinct c.user_id) from carts c join cart_items ci on ci.cart_id = c.id) +
                                       (select count(distinct user_id) from placed where created_at >= since and user_id is not null), 0), 1)), 0),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('day', d::date, 'revenue', coalesce(x.revenue, 0), 'orders', coalesce(x.orders, 0)) order by d)
              from generate_series(date_trunc('day', since), date_trunc('day', now()), interval '1 day') d
              left join (select date_trunc('day', created_at) as bucket, sum(total) as revenue, count(*) as orders
                         from earning where created_at >= since group by 1) x on x.bucket = d), '[]'::jsonb),
    'status_breakdown', coalesce((select jsonb_object_agg(status, n) from (select status, count(*) n from placed group by status) s), '{}'::jsonb),
    'top_products', coalesce((select jsonb_agg(t) from (
        select oi.product_name as name, sum(oi.quantity) as units, sum(oi.quantity * oi.price) as revenue
        from order_items oi join earning o on o.id = oi.order_id
        where o.created_at >= since
        group by oi.product_name order by revenue desc limit 5) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;

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
    left join orders o on o.coupon_code = c.code and o.payment_status = 'paid'
    where v_admin is null or c.assigned_admin_id = v_admin
    group by c.id, p.full_name, p.email
  ) t;
  return r;
end $$;

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
    from orders o where o.coupon_code = upper(p_code) and o.payment_status in ('paid', 'refunded')
    order by o.created_at desc limit 200;
end $$;

-- Unpaid checkouts where no payment was ever started are released after 10 minutes (was 1 hour).
-- Ones with a Snippe payment are checked against Snippe by the app; 24 hours stays as a backstop.
create or replace function public.expire_unpaid_orders()
returns int language plpgsql volatile security definer set search_path = public as $$
declare r record; n int := 0;
begin
  for r in
    select id from orders
    where payment_status = 'pending' and status = 'pending'
      and ((payment_reference is null and created_at < now() - interval '10 minutes')
        or created_at < now() - interval '24 hours')
    for update skip locked
  loop
    perform public.release_unpaid_order(r.id);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.expire_unpaid_orders() from public, anon, authenticated;
grant execute on function public.expire_unpaid_orders() to service_role;

-- Deletes one failed order (its stock was already returned when it failed). Re-checks the state
-- under a lock so a paid or still-open order can never be removed. The app calls this 10 minutes
-- after the failure, once Snippe confirms the payment didn't complete.
create or replace function public.delete_failed_order(p_order_id uuid)
returns boolean language plpgsql volatile security definer set search_path = public as $$
begin
  perform 1 from orders where id = p_order_id and payment_status = 'failed' and status = 'cancelled' for update;
  if not found then return false; end if;
  delete from orders where id = p_order_id;
  return true;
end $$;
revoke all on function public.delete_failed_order(uuid) from public, anon, authenticated;
grant execute on function public.delete_failed_order(uuid) to service_role;
