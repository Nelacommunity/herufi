create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  created_at timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
-- Anyone may subscribe; only admins may read the list.
create policy "newsletter: subscribe" on public.newsletter_subscribers for insert to anon, authenticated with check (true);
create policy "newsletter: admin read" on public.newsletter_subscribers for select to authenticated using (public.is_admin());
revoke update, delete on public.newsletter_subscribers from anon, authenticated;
