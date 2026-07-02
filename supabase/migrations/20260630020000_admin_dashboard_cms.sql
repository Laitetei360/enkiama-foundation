create extension if not exists pgcrypto;

        create table if not exists public.site_content (
          id uuid primary key default gen_random_uuid(),
          page text not null check (char_length(trim(page)) between 1 and 80),
          section text not null check (char_length(trim(section)) between 1 and 120),
          content_key text not null check (char_length(trim(content_key)) between 1 and 180),
          content_value text not null,
          content_type text not null default 'text' check (content_type in ('text', 'long_text', 'image_url', 'url', 'number', 'json')),
          created_at timestamptz not null default now(),
          updated_at timestamptz not null default now(),
          unique (page, section, content_key)
        );

        alter table public.site_content enable row level security;
        revoke all on public.site_content from anon, authenticated;

        insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        values (
          'site-assets',
          'site-assets',
          true,
          6291456,
          array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
        )
        on conflict (id) do update
        set public = excluded.public,
            file_size_limit = excluded.file_size_limit,
            allowed_mime_types = excluded.allowed_mime_types;
