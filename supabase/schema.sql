-- ===========================================================================
-- PulseBoard database schema  (run in Supabase → SQL editor)
-- Row-level security is ON everywhere. Users can read ONLY their own data.
-- OAuth tokens live in account_secrets, which has NO client policies at all —
-- only the service-role key (used inside Netlify Functions) can touch it.
-- ===========================================================================

-- ---- profiles (mirrors auth.users) ----------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

-- auto-create a profile row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end; $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---- social_accounts ------------------------------------------------------
create table if not exists public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  platform text not null check (platform in ('facebook','instagram','tiktok')),
  external_id text not null,
  username text not null,
  display_name text,
  avatar_url text,
  status text not null default 'connected' check (status in ('connected','expired','revoked')),
  connected_at timestamptz not null default now(),
  last_synced_at timestamptz,
  unique (user_id, platform, external_id)
);
alter table public.social_accounts enable row level security;

drop policy if exists "accounts owner all" on public.social_accounts;
create policy "accounts owner all" on public.social_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- account_secrets  (SERVICE ROLE ONLY — no policies = clients blocked) --
create table if not exists public.account_secrets (
  account_id uuid primary key references public.social_accounts on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  extra jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.account_secrets enable row level security;
-- intentionally NO policies: only the service-role key bypasses RLS.

-- ---- helper: does the current user own this account? ----------------------
create or replace function public.owns_account(acc uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.social_accounts a where a.id = acc and a.user_id = auth.uid());
$$;

-- ---- metrics_daily --------------------------------------------------------
create table if not exists public.metrics_daily (
  account_id uuid not null references public.social_accounts on delete cascade,
  platform text not null,
  date date not null,
  followers bigint not null default 0,
  reach bigint not null default 0,
  impressions bigint not null default 0,
  views bigint not null default 0,
  engagements bigint not null default 0,
  primary key (account_id, date)
);
alter table public.metrics_daily enable row level security;
drop policy if exists "metrics owner read" on public.metrics_daily;
create policy "metrics owner read" on public.metrics_daily
  for select using (public.owns_account(account_id));

-- ---- content --------------------------------------------------------------
create table if not exists public.content (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts on delete cascade,
  platform text not null,
  external_id text not null,
  title text not null default '',
  media_type text not null default 'Post',
  permalink text,
  published_at timestamptz not null default now(),
  views bigint not null default 0,
  likes bigint not null default 0,
  comments bigint not null default 0,
  shares bigint not null default 0,
  saves bigint not null default 0,
  reach bigint not null default 0,
  avg_watch_seconds int,
  retention_pct int,
  unique (account_id, external_id)
);
alter table public.content enable row level security;
drop policy if exists "content owner read" on public.content;
create policy "content owner read" on public.content
  for select using (public.owns_account(account_id));

-- ---- audience_snapshots ---------------------------------------------------
create table if not exists public.audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.social_accounts on delete cascade,
  platform text not null,
  captured_on date not null,
  age jsonb not null default '{}',
  gender jsonb not null default '{}',
  countries jsonb not null default '{}',
  devices jsonb not null default '{}',
  active_hours jsonb not null default '[]',
  unique (account_id, captured_on)
);
alter table public.audience_snapshots enable row level security;
drop policy if exists "audience owner read" on public.audience_snapshots;
create policy "audience owner read" on public.audience_snapshots
  for select using (public.owns_account(account_id));

-- helpful indexes
create index if not exists idx_metrics_account_date on public.metrics_daily (account_id, date);
create index if not exists idx_content_account_views on public.content (account_id, views desc);
