-- ============================================================================
-- UNIsport — database schema (DESIGN ONLY, NOT CONNECTED YET)
-- ----------------------------------------------------------------------------
-- Target: PostgreSQL / Supabase. This file is a planning artifact for the data
-- model we expect to need. Nothing in the app talks to a database yet.
--
-- White-label note: each university's brand colors live in `universities.theme`
-- as JSON, mirroring lib/themes.ts. Adding a school later = INSERT one row.
-- ============================================================================

-- Needed for gen_random_uuid().
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerated types
-- ---------------------------------------------------------------------------
create type match_status as enum ('pending', 'accepted', 'declined', 'cancelled');
create type session_status as enum ('open', 'full', 'cancelled', 'completed');
create type channel_kind as enum ('direct', 'session');

-- ---------------------------------------------------------------------------
-- universities — one row per white-label tenant. Theme colors stored as data.
-- ---------------------------------------------------------------------------
create table universities (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,            -- url-safe slug, e.g. 'harvard'
  name        text not null,                   -- 'Harvard University'
  theme       jsonb not null,                  -- token set: { primary, accent, ... }
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- profiles — app user, 1:1 with Supabase auth.users. Each belongs to a school.
-- ---------------------------------------------------------------------------
create table profiles (
  id            uuid primary key,              -- == auth.users.id (FK added once auth exists)
  university_id uuid not null references universities (id) on delete restrict,
  display_name  text not null,
  bio           text,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index profiles_university_idx on profiles (university_id);

-- ---------------------------------------------------------------------------
-- gyms — physical facilities, scoped to a university.
-- ---------------------------------------------------------------------------
create table gyms (
  id            uuid primary key default gen_random_uuid(),
  university_id uuid not null references universities (id) on delete cascade,
  name          text not null,
  description   text,
  address       text,
  latitude      double precision,
  longitude     double precision,
  created_at    timestamptz not null default now()
);
create index gyms_university_idx on gyms (university_id);

-- ---------------------------------------------------------------------------
-- sessions — a scheduled workout at a gym, hosted by a profile.
-- ---------------------------------------------------------------------------
create table sessions (
  id          uuid primary key default gen_random_uuid(),
  gym_id      uuid not null references gyms (id) on delete cascade,
  host_id     uuid not null references profiles (id) on delete cascade,
  activity    text not null,                   -- e.g. 'lifting', 'running'
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  capacity    integer not null default 2 check (capacity >= 1),
  status      session_status not null default 'open',
  created_at  timestamptz not null default now()
);
create index sessions_gym_idx on sessions (gym_id);
create index sessions_host_idx on sessions (host_id);
create index sessions_starts_at_idx on sessions (starts_at);

-- join table: who's attending a session
create table session_participants (
  session_id  uuid not null references sessions (id) on delete cascade,
  profile_id  uuid not null references profiles (id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (session_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- matches — workout-partner pairing between two profiles.
-- ---------------------------------------------------------------------------
create table matches (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references profiles (id) on delete cascade,
  addressee_id  uuid not null references profiles (id) on delete cascade,
  status        match_status not null default 'pending',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
create index matches_addressee_idx on matches (addressee_id);

-- ---------------------------------------------------------------------------
-- channels — a conversation. Either a direct match chat or a session chat.
-- ---------------------------------------------------------------------------
create table channels (
  id          uuid primary key default gen_random_uuid(),
  kind        channel_kind not null,
  match_id    uuid references matches (id) on delete cascade,   -- set when kind='direct'
  session_id  uuid references sessions (id) on delete cascade,  -- set when kind='session'
  created_at  timestamptz not null default now(),
  -- exactly one source depending on kind
  check (
    (kind = 'direct'  and match_id is not null and session_id is null) or
    (kind = 'session' and session_id is not null and match_id is null)
  )
);

-- who can see / post in a channel
create table channel_members (
  channel_id  uuid not null references channels (id) on delete cascade,
  profile_id  uuid not null references profiles (id) on delete cascade,
  last_read_at timestamptz,                    -- powers the unread badge
  primary key (channel_id, profile_id)
);

-- ---------------------------------------------------------------------------
-- messages — individual chat messages within a channel.
-- ---------------------------------------------------------------------------
create table messages (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references channels (id) on delete cascade,
  sender_id   uuid not null references profiles (id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index messages_channel_created_idx on messages (channel_id, created_at);

-- ============================================================================
-- LATER (not now):
--   * Add FK profiles.id -> auth.users(id) once Supabase auth is wired up.
--   * Enable Row Level Security on every table and add per-university policies.
--   * Seed `universities` with the same data that lives in lib/themes.ts.
-- ============================================================================
