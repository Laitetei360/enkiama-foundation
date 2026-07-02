alter table public.users add column if not exists phone text;
alter table public.users add column if not exists avatar text;

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  path text not null,
  referrer text,
  user_agent text,
  ip_hash text,
  created_at timestamptz not null default now()
);

alter table public.site_visits enable row level security;
revoke all on public.site_visits from anon, authenticated;

create index if not exists site_visits_created_at_idx on public.site_visits (created_at desc);
create index if not exists site_visits_page_idx on public.site_visits (page);
