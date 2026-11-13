-- Order update emails (Resend): one row per order + event, so each email is sent once,
-- failures are retried, and staff can see what the customer was sent.

-- The language the shopper used at checkout; emails are written in it.
alter table public.orders add column if not exists locale text check (locale in ('en', 'sw'));

create table if not exists public.order_notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  event text not null check (event in ('confirmed', 'processing', 'shipped', 'delivered', 'cancelled')),
  channel text not null default 'email' check (channel in ('email')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  attempts int not null default 0,
  last_error text,
  provider_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (order_id, event, channel)
);
create index if not exists order_notifications_retry_idx on public.order_notifications(status, created_at) where status <> 'sent';

alter table public.order_notifications enable row level security;
revoke all on public.order_notifications from anon;
grant select on public.order_notifications to authenticated;
drop policy if exists "order_notifications: staff read" on public.order_notifications;
create policy "order_notifications: staff read" on public.order_notifications for select to authenticated
  using (public.has_permission('orders.view'));
-- Writes happen only server-side with the service role.
