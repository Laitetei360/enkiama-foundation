create extension if not exists pgcrypto;

        create table if not exists public.volunteer_applications (
          id uuid primary key default gen_random_uuid(),
          first_name text not null check (char_length(trim(first_name)) between 1 and 100),
          last_name text not null check (char_length(trim(last_name)) between 1 and 100),
          email text not null check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          phone text not null check (char_length(trim(phone)) <= 50),
          availability text not null check (char_length(trim(availability)) <= 250),
          motivation text not null check (char_length(trim(motivation)) between 10 and 5000),
          status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
          created_at timestamptz not null default now()
        );

        create table if not exists public.mentor_applications (
          id uuid primary key default gen_random_uuid(),
          first_name text not null check (char_length(trim(first_name)) between 1 and 100),
          last_name text not null check (char_length(trim(last_name)) between 1 and 100),
          email text not null check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          phone text not null check (char_length(trim(phone)) <= 50),
          availability text not null check (char_length(trim(availability)) <= 250),
          motivation text not null check (char_length(trim(motivation)) between 10 and 5000),
          status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
          created_at timestamptz not null default now()
        );

        create table if not exists public.partnership_applications (
          id uuid primary key default gen_random_uuid(),
          first_name text not null check (char_length(trim(first_name)) between 1 and 100),
          last_name text not null check (char_length(trim(last_name)) between 1 and 100),
          email text not null check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          organization text not null check (char_length(trim(organization)) <= 200),
          partnership_type text not null check (char_length(trim(partnership_type)) <= 120),
          partnership_idea text not null check (char_length(trim(partnership_idea)) between 10 and 5000),
          status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
          created_at timestamptz not null default now()
        );

        create table if not exists public.program_applications (
          id uuid primary key default gen_random_uuid(),
          first_name text not null check (char_length(trim(first_name)) between 1 and 100),
          last_name text not null check (char_length(trim(last_name)) between 1 and 100),
          email text not null check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          phone text not null check (char_length(trim(phone)) <= 50),
          age integer not null check (age between 16 and 35),
          program_name text not null check (char_length(trim(program_name)) <= 160),
          goals text check (goals is null or char_length(trim(goals)) <= 5000),
          status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
          created_at timestamptz not null default now()
        );

        create table if not exists public.donations (
          id uuid primary key default gen_random_uuid(),
          name text not null check (char_length(trim(name)) between 1 and 200),
          email text not null check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          amount numeric(12, 2) not null check (amount > 0),
          currency text not null default 'KES' check (currency in ('KES', 'USD', 'EUR', 'GBP')),
          payment_method text not null check (payment_method in ('mpesa', 'paypal', 'wise', 'card', 'bank')),
          payment_status text not null default 'pending' check (payment_status in ('pending', 'completed', 'failed')),
          anonymous boolean not null default false,
          receipt_number text unique,
          created_at timestamptz not null default now()
        );

        create table if not exists public.sponsor_applications (
          id uuid primary key default gen_random_uuid(),
          name text not null check (char_length(trim(name)) between 1 and 200),
          email text not null check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          amount numeric(12, 2) not null check (amount > 0),
          currency text not null default 'KES' check (currency in ('KES', 'USD', 'EUR', 'GBP')),
          payment_method text not null check (payment_method in ('mpesa', 'paypal', 'wise', 'card', 'bank')),
          status text not null default 'pending' check (status in ('pending', 'reviewed', 'approved', 'rejected')),
          receipt_number text unique,
          created_at timestamptz not null default now()
        );

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

        alter table public.contact_messages add column if not exists status text not null default 'new' check (status in ('new', 'read', 'replied'));

        create table if not exists public.story_submissions (
          id uuid primary key default gen_random_uuid(),
          title text not null check (char_length(trim(title)) between 1 and 200),
          content text not null check (char_length(trim(content)) between 10 and 10000),
          author_name text check (author_name is null or char_length(trim(author_name)) <= 200),
          author_email text check (
            author_email is null
            or (
              char_length(trim(author_email)) <= 254
              and author_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
            )
          ),
          author_location text check (author_location is null or char_length(trim(author_location)) <= 200),
          category text not null check (category in ('education', 'technology', 'heritage', 'women', 'community')),
          status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
          views integer not null default 0 check (views >= 0),
          likes integer not null default 0 check (likes >= 0),
          created_at timestamptz not null default now()
        );

        create table if not exists public.newsletter_subscribers (
          id uuid primary key default gen_random_uuid(),
          email text not null unique check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          name text check (name is null or char_length(trim(name)) <= 200),
          subscribed boolean not null default true,
          created_at timestamptz not null default now()
        );

        create table if not exists public.users (
          id uuid primary key default gen_random_uuid(),
          first_name text not null check (char_length(trim(first_name)) between 1 and 100),
          last_name text not null check (char_length(trim(last_name)) between 1 and 100),
          email text not null unique check (
            char_length(trim(email)) <= 254
            and email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
          ),
          password_hash text not null,
          role text not null default 'user' check (role in ('user', 'mentor', 'volunteer', 'admin')),
          phone text,
          location text,
          bio text,
          avatar text,
          is_verified boolean not null default false,
          created_at timestamptz not null default now()
        );

        alter table public.volunteer_applications enable row level security;
        alter table public.mentor_applications enable row level security;
        alter table public.partnership_applications enable row level security;
        alter table public.program_applications enable row level security;
        alter table public.donations enable row level security;
        alter table public.sponsor_applications enable row level security;
        alter table public.contact_messages enable row level security;
        alter table public.story_submissions enable row level security;
        alter table public.newsletter_subscribers enable row level security;
        alter table public.users enable row level security;

        drop policy if exists "Anyone can submit contact messages" on public.contact_messages;

        revoke all on public.volunteer_applications from anon, authenticated;
        revoke all on public.mentor_applications from anon, authenticated;
        revoke all on public.partnership_applications from anon, authenticated;
        revoke all on public.program_applications from anon, authenticated;
        revoke all on public.donations from anon, authenticated;
        revoke all on public.sponsor_applications from anon, authenticated;
        revoke all on public.contact_messages from anon, authenticated;
        revoke all on public.story_submissions from anon, authenticated;
        revoke all on public.newsletter_subscribers from anon, authenticated;
        revoke all on public.users from anon, authenticated;

        -- No public RLS policies are created. The Express backend writes with the Supabase
        -- service role key, which must remain only in backend environment variables.
