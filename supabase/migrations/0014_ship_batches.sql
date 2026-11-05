-- Consolidated shipping batches.
-- Goods leave the China warehouse twice a month, on the 14th and the 28th. An order joins a
-- batch only if it was placed at least 12 days before it (so suppliers can deliver to the
-- warehouse in time); otherwise it waits for the next one. Dates are Tanzania local time.
--
-- Order flow: pending → confirmed (paid) → processing ("Packed": in our warehouse, waiting
-- for its batch) → shipped ("In transit": the batch has left) → delivered.
-- Keep the constants in sync with SHIP_DAYS / SHIP_CUTOFF_DAYS in src/lib/shipping.ts.

create or replace function public.next_ship_date(p_at timestamptz default now())
returns date language plpgsql stable set search_path = public as $$
declare
  d date := (p_at at time zone 'Africa/Dar_es_Salaam')::date;
  m date := date_trunc('month', d)::date;
  b date;
begin
  for i in 0..2 loop
    foreach b in array array[(m + make_interval(months => i))::date + 13, (m + make_interval(months => i))::date + 27] loop
      if d <= b - 12 then return b; end if;
    end loop;
  end loop;
end $$;

alter table public.orders add column if not exists ship_date date;
update public.orders set ship_date = public.next_ship_date(created_at) where ship_date is null;
alter table public.orders alter column ship_date set not null;
create index if not exists orders_ship_date_idx on public.orders(ship_date, status);

create or replace function public.orders_set_ship_date()
returns trigger language plpgsql set search_path = public as $$
begin
  new.ship_date := coalesce(new.ship_date, public.next_ship_date(new.created_at));
  return new;
end $$;

drop trigger if exists orders_ship_date on public.orders;
create trigger orders_ship_date before insert on public.orders
  for each row execute function public.orders_set_ship_date();

-- Close a batch: every packed order due on or before p_date goes in transit, and orders
-- that never reached the warehouse roll over to the next batch.
create or replace function public.admin_dispatch_batch(p_date date)
returns table (shipped int, rolled int) language plpgsql security definer set search_path = public as $$
declare next_batch date;
begin
  if not public.has_permission('orders.update') then raise exception 'Forbidden' using errcode = '42501'; end if;
  if p_date > (now() at time zone 'Africa/Dar_es_Salaam')::date then raise exception 'This batch has not reached its shipping date yet'; end if;
  -- The batch after p_date, for orders that missed it (no new cutoff: they're already late).
  next_batch := case when extract(day from p_date) < 28
    then date_trunc('month', p_date)::date + 27
    else (date_trunc('month', p_date) + interval '1 month')::date + 13 end;
  update orders set status = 'shipped' where status = 'processing' and ship_date <= p_date;
  get diagnostics shipped = row_count;
  update orders set ship_date = next_batch where status in ('pending', 'confirmed') and ship_date <= p_date;
  get diagnostics rolled = row_count;
  return next;
end $$;

revoke all on function public.admin_dispatch_batch(date) from public, anon;
grant execute on function public.admin_dispatch_batch(date) to authenticated;
grant execute on function public.next_ship_date(timestamptz) to anon, authenticated;
