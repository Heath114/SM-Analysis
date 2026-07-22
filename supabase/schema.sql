-- ===========================================================================
-- PulseBoard database schema  (run in Supabase -> SQL editor)
--
-- ISOLATED SCHEMA: everything lives in its own `pulseboard` schema so it can
-- safely share a Supabase project with your other apps without colliding with
-- their public.* tables. PulseBoard adds NOTHING to auth.users (no triggers),
-- so it cannot disturb any other app in the project.
--
-- Row-level security is ON everywhere. Users read ONLY their own data.
-- OAuth tokens live in account_secrets, which has NO client policies at all --
-- only the service-role key (used inside Netlify Functions) can touch it.
--
-- >>> ONE DASHBOARD STEP REQUIRED <<<
-- After running this, go to Supabase -> Project Settings -> API -> "Exposed
-- schemas" (a.k.a. Data API / schema list) and ADD `pulseboard` to the list
-- (keep `public`, `graphql_public`). Save. Without this the REST API returns
-- PGRST106 "schema must be one of ..." and the app can't read/write.
-- ===========================================================================

create schema if not exists pulseboard;

-- Let the API roles use the schema; RLS still gates every row. The service
-- role bypasses RLS (used only inside Netlify Functions).
grant usage on schema pulseboard to anon, authenticated, service_role;
grant all on all tables    in schema pulseboard to anon, authenticated, service_role;
grant all on all sequences in schema pulseboard to anon, authenticated, service_role;
alter default privileges in schema pulseboard grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema pulseboard grant all on sequences to anon, authenticated, service_role;

-- ---- social_accounts ------------------------------------------------------
create table if not exists pulseboard.social_accounts (
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
alter table pulseboard.social_accounts enable row level security;

drop policy if exists "accounts owner all" on pulseboard.social_accounts;
create policy "accounts owner all" on pulseboard.social_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- account_secrets  (SERVICE ROLE ONLY -- no policies = clients blocked) --
create table if not exists pulseboard.account_secrets (
  account_id uuid primary key references pulseboard.social_accounts on delete cascade,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz,
  extra jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table pulseboard.account_secrets enable row level security;
-- intentionally NO policies: only the service-role key bypasses RLS.

-- ---- helper: does the current user own this account? ----------------------
create or replace function pulseboard.owns_account(acc uuid)
returns boolean language sql stable security definer set search_path = pulseboard as $$
  select exists (select 1 from pulseboard.social_accounts a where a.id = acc and a.user_id = auth.uid());
$$;

-- ---- metrics_daily --------------------------------------------------------
create table if not exists pulseboard.metrics_daily (
  account_id uuid not null references pulseboard.social_accounts on delete cascade,
  platform text not null,
  date date not null,
  followers bigint not null default 0,
  reach bigint not null default 0,
  impressions bigint not null default 0,
  views bigint not null default 0,
  engagements bigint not null default 0,
  primary key (account_id, date)
);
alter table pulseboard.metrics_daily enable row level security;
drop policy if exists "metrics owner read" on pulseboard.metrics_daily;
create policy "metrics owner read" on pulseboard.metrics_daily
  for select using (pulseboard.owns_account(account_id));

-- ---- content --------------------------------------------------------------
create table if not exists pulseboard.content (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references pulseboard.social_accounts on delete cascade,
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
alter table pulseboard.content enable row level security;
drop policy if exists "content owner read" on pulseboard.content;
create policy "content owner read" on pulseboard.content
  for select using (pulseboard.owns_account(account_id));

-- ---- audience_snapshots ---------------------------------------------------
create table if not exists pulseboard.audience_snapshots (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references pulseboard.social_accounts on delete cascade,
  platform text not null,
  captured_on date not null,
  age jsonb not null default '{}',
  gender jsonb not null default '{}',
  countries jsonb not null default '{}',
  devices jsonb not null default '{}',
  active_hours jsonb not null default '[]',
  unique (account_id, captured_on)
);
alter table pulseboard.audience_snapshots enable row level security;
drop policy if exists "audience owner read" on pulseboard.audience_snapshots;
create policy "audience owner read" on pulseboard.audience_snapshots
  for select using (pulseboard.owns_account(account_id));

-- ---- goals (user-set targets) ---------------------------------------------
create table if not exists pulseboard.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  metric text not null check (metric in ('followers','reach','views','engagements')),
  scope text not null default 'all',   -- 'all' or a platform id
  target bigint not null check (target > 0),
  due_date date,
  created_at timestamptz not null default now()
);
alter table pulseboard.goals enable row level security;
drop policy if exists "goals owner all" on pulseboard.goals;
create policy "goals owner all" on pulseboard.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---- report_shares (public read-only report links) -----------------------
-- The payload is a self-contained snapshot (no tokens, no raw rows). There is
-- deliberately NO anon select policy: the public /r/:slug page reads through a
-- Netlify function using the service-role key, so owners keep full control.
create table if not exists pulseboard.report_shares (
  slug text primary key,
  user_id uuid not null references auth.users on delete cascade,
  payload jsonb not null,
  created_at timestamptz not null default now()
);
alter table pulseboard.report_shares enable row level security;
drop policy if exists "shares owner all" on pulseboard.report_shares;
create policy "shares owner all" on pulseboard.report_shares
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- helpful indexes
create index if not exists idx_metrics_account_date on pulseboard.metrics_daily (account_id, date);
create index if not exists idx_content_account_views on pulseboard.content (account_id, views desc);
create index if not exists idx_goals_user on pulseboard.goals (user_id);
create index if not exists idx_shares_user on pulseboard.report_shares (user_id);

-- Re-assert grants for the tables just created (default privileges cover
-- future objects; this covers the ones in this script explicitly).
grant all on all tables    in schema pulseboard to anon, authenticated, service_role;
grant all on all sequences in schema pulseboard to anon, authenticated, service_role;
