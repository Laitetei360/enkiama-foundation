create extension if not exists pgcrypto;

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 2 and 200),
  email text not null check (
    char_length(trim(email)) <= 254
    and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
  ),
  phone text check (phone is null or char_length(trim(phone)) <= 50),
  organisation text check (organisation is null or char_length(trim(organisation)) <= 200),
  reason text not null check (reason in ('general', 'programs', 'partnership', 'volunteer', 'donate', 'media', 'other')),
  message text not null check (char_length(trim(message)) between 10 and 5000),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can submit contact messages" on public.contact_messages;
create policy "Anyone can submit contact messages"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

-- No SELECT/UPDATE/DELETE policies are created, so public website visitors cannot read or modify submissions.
grant insert on public.contact_messages to anon, authenticated;
