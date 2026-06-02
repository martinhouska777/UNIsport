-- ============================================================================
-- UNIsport — Messages (Slice: Direct messages + Community channels, persisted)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   Real, stored-forever messaging for the Messages tab:
--     • Direct (1:1) conversations between two users.
--     • Community channels open to everyone at the university.
--
-- SECURITY MODEL (same philosophy as db/matching.sql)
--   The message tables have Row-Level Security ENABLED with NO policies, so they
--   are NOT directly readable/writable over the API. All access goes through the
--   SECURITY DEFINER functions below, which enforce membership using auth.uid().
--   This keeps private DMs locked to their two participants while letting the
--   frontend read another person's display name (which RLS on `profiles` would
--   otherwise hide).
--
--   Sender display name (and, for channels, residence) is DENORMALISED onto each
--   message at insert time, so listing a thread never needs to read other
--   people's profile rows.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- A direct conversation between two users. The pair is stored ordered
-- (user_lo < user_hi) so each pair has exactly one row.
create table if not exists public.dm_conversations (
  id         uuid primary key default gen_random_uuid(),
  user_lo    uuid not null,
  user_hi    uuid not null,
  created_at timestamptz not null default now(),
  unique (user_lo, user_hi),
  check (user_lo <> user_hi)
);

create table if not exists public.dm_messages (
  id          uuid primary key default gen_random_uuid(),
  conv_id     uuid not null references public.dm_conversations (id) on delete cascade,
  sender_id   uuid not null,
  sender_name text not null default '',
  body        text not null,
  created_at  timestamptz not null default now()
);
create index if not exists dm_messages_conv_idx
  on public.dm_messages (conv_id, created_at);

-- Per-user "last read" marker — powers unread counts.
create table if not exists public.dm_reads (
  conv_id      uuid not null references public.dm_conversations (id) on delete cascade,
  user_id      uuid not null,
  last_read_at timestamptz not null default 'epoch',
  primary key (conv_id, user_id)
);

-- Community channels (open to everyone). Seeded below.
create table if not exists public.channels (
  id   uuid primary key default gen_random_uuid(),
  key  text unique not null,
  name text not null,
  icon text not null default 'message',  -- maps to an icon in components/icons.tsx
  sort int  not null default 0
);

create table if not exists public.channel_messages (
  id                uuid primary key default gen_random_uuid(),
  channel_id        uuid not null references public.channels (id) on delete cascade,
  sender_id         uuid not null,
  sender_name       text not null default '',
  sender_residence  text,
  sender_class_year text,
  body              text not null,
  created_at        timestamptz not null default now()
);
-- Class year was added after the first version; add it to existing databases.
alter table public.channel_messages add column if not exists sender_class_year text;
create index if not exists channel_messages_channel_idx
  on public.channel_messages (channel_id, created_at);

create table if not exists public.channel_reads (
  channel_id   uuid not null references public.channels (id) on delete cascade,
  user_id      uuid not null,
  last_read_at timestamptz not null default 'epoch',
  primary key (channel_id, user_id)
);

-- Which channels each user has chosen to JOIN. Browsing/reading is open to all,
-- but posting (and unread badges) require membership — joining is opt-in.
create table if not exists public.channel_members (
  channel_id uuid not null references public.channels (id) on delete cascade,
  user_id    uuid not null,
  joined_at  timestamptz not null default now(),
  primary key (channel_id, user_id)
);

-- Lock every table: no policies → no direct API access. Only the SECURITY
-- DEFINER functions below (which check auth.uid()) can touch them.
alter table public.dm_conversations enable row level security;
alter table public.dm_messages      enable row level security;
alter table public.dm_reads         enable row level security;
alter table public.channels         enable row level security;
alter table public.channel_messages enable row level security;
alter table public.channel_reads    enable row level security;
alter table public.channel_members  enable row level security;

-- ---------------------------------------------------------------------------
-- Seed the community channels (idempotent).
-- ---------------------------------------------------------------------------
insert into public.channels (key, name, icon, sort) values
  ('general',              'general',            'barbell',  1),
  ('form-and-programming', 'form & programming', 'bulb',     2),
  ('nutrition',            'nutrition',          'activity', 3),
  ('wins-and-prs',         'wins & PRs',         'star',     4),
  ('running',              'running',            'run',      5)
on conflict (key) do nothing;

-- ===========================================================================
-- DIRECT MESSAGE FUNCTIONS
-- ===========================================================================

-- Find (or create) the conversation between the caller and other_id; return id.
create or replace function public.dm_start(other_id uuid)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  lo  uuid := least(me, other_id);
  hi  uuid := greatest(me, other_id);
  cid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if other_id is null or other_id = me then raise exception 'invalid recipient'; end if;

  insert into public.dm_conversations (user_lo, user_hi)
    values (lo, hi)
    on conflict (user_lo, user_hi) do nothing;

  select id into cid
    from public.dm_conversations
    where user_lo = lo and user_hi = hi;
  return cid;
end;
$$;

-- The caller's conversations, newest activity first, with the other person's
-- name, the last message, and the caller's unread count.
create or replace function public.dm_list()
returns table (
  conversation_id uuid,
  other_id        uuid,
  other_name      text,
  last_body       text,
  last_at         timestamptz,
  last_from_me    boolean,
  unread          integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    case when c.user_lo = auth.uid() then c.user_hi else c.user_lo end,
    coalesce((
      select p.data->>'name' from public.profiles p
      where p.id = case when c.user_lo = auth.uid() then c.user_hi else c.user_lo end
    ), 'Member'),
    lm.body,
    lm.created_at,
    (lm.sender_id = auth.uid()),
    coalesce((
      select count(*) from public.dm_messages m
      where m.conv_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select last_read_at from public.dm_reads r
           where r.conv_id = c.id and r.user_id = auth.uid()), 'epoch')
    ), 0)::int
  from public.dm_conversations c
  left join lateral (
    select body, created_at, sender_id
    from public.dm_messages m
    where m.conv_id = c.id
    order by created_at desc
    limit 1
  ) lm on true
  where c.user_lo = auth.uid() or c.user_hi = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

-- All messages in a conversation (oldest first). Marks the thread read. Errors
-- if the caller isn't one of the two participants.
create or replace function public.dm_thread(conversation_id uuid)
returns table (
  id          uuid,
  sender_id   uuid,
  sender_name text,
  body        text,
  created_at  timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if not exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id and (c.user_lo = me or c.user_hi = me)
  ) then
    raise exception 'not a participant';
  end if;

  insert into public.dm_reads (conv_id, user_id, last_read_at)
    values (conversation_id, me, now())
    on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  return query
    select m.id, m.sender_id, m.sender_name, m.body, m.created_at
    from public.dm_messages m
    where m.conv_id = conversation_id
    order by m.created_at asc;
end;
$$;

-- Post a message to a conversation (participant only); returns the saved row.
create or replace function public.dm_send(conversation_id uuid, message_text text)
returns table (
  id          uuid,
  sender_id   uuid,
  sender_name text,
  body        text,
  created_at  timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  nm     text;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if message_text is null or length(btrim(message_text)) = 0 then
    raise exception 'empty message';
  end if;
  if not exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id and (c.user_lo = me or c.user_hi = me)
  ) then
    raise exception 'not a participant';
  end if;

  select coalesce(p.data->>'name', 'Member') into nm
    from public.profiles p where p.id = me;

  insert into public.dm_messages (conv_id, sender_id, sender_name, body)
    values (conversation_id, me, nm, btrim(message_text))
    returning dm_messages.id into new_id;

  -- The sender has implicitly read up to now.
  insert into public.dm_reads (conv_id, user_id, last_read_at)
    values (conversation_id, me, now())
    on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  return query
    select m.id, m.sender_id, m.sender_name, m.body, m.created_at
    from public.dm_messages m where m.id = new_id;
end;
$$;

-- ===========================================================================
-- COMMUNITY CHANNEL FUNCTIONS
-- ===========================================================================

-- These three gained columns (joined / sender_class_year) after the first
-- version. Postgres can't change a function's OUT columns via create-or-replace,
-- so drop the old versions first — makes re-running this script safe.
drop function if exists public.channel_list();
drop function if exists public.channel_thread(uuid);
drop function if exists public.channel_send(uuid, text);

-- Every channel with its last message, the caller's unread count, and whether
-- the caller has joined it.
create or replace function public.channel_list()
returns table (
  channel_id       uuid,
  key              text,
  name             text,
  icon             text,
  last_body        text,
  last_sender_name text,
  last_at          timestamptz,
  unread           integer,
  joined           boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    ch.id, ch.key, ch.name, ch.icon,
    lm.body, lm.sender_name, lm.created_at,
    coalesce((
      select count(*) from public.channel_messages m
      where m.channel_id = ch.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select last_read_at from public.channel_reads r
           where r.channel_id = ch.id and r.user_id = auth.uid()), 'epoch')
    ), 0)::int,
    exists(
      select 1 from public.channel_members mem
      where mem.channel_id = ch.id and mem.user_id = auth.uid()
    )
  from public.channels ch
  left join lateral (
    select body, sender_name, created_at
    from public.channel_messages m
    where m.channel_id = ch.id
    order by created_at desc
    limit 1
  ) lm on true
  order by ch.sort, ch.name;
$$;

-- Join / leave a channel (opt-in membership). Joining is required to post.
create or replace function public.channel_join(chan_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.channels ch where ch.id = chan_id) then
    raise exception 'unknown channel';
  end if;
  insert into public.channel_members (channel_id, user_id)
    values (chan_id, me)
    on conflict (channel_id, user_id) do nothing;
end;
$$;

create or replace function public.channel_leave(chan_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.channel_members
    where channel_id = chan_id and user_id = me;
end;
$$;

-- All messages in a channel (oldest first). Marks the channel read.
create or replace function public.channel_thread(chan_id uuid)
returns table (
  id                uuid,
  sender_id         uuid,
  sender_name       text,
  sender_residence  text,
  sender_class_year text,
  body              text,
  created_at        timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;

  insert into public.channel_reads (channel_id, user_id, last_read_at)
    values (chan_id, me, now())
    on conflict (channel_id, user_id) do update set last_read_at = excluded.last_read_at;

  return query
    select m.id, m.sender_id, m.sender_name, m.sender_residence,
           m.sender_class_year, m.body, m.created_at
    from public.channel_messages m
    where m.channel_id = chan_id
    order by m.created_at asc;
end;
$$;

-- Post a message to a channel; returns the saved row. Requires membership
-- (the caller must have joined the channel — joining is opt-in).
create or replace function public.channel_send(chan_id uuid, message_text text)
returns table (
  id                uuid,
  sender_id         uuid,
  sender_name       text,
  sender_residence  text,
  sender_class_year text,
  body              text,
  created_at        timestamptz
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  nm     text;
  res    text;
  cls    text;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if message_text is null or length(btrim(message_text)) = 0 then
    raise exception 'empty message';
  end if;
  if not exists (select 1 from public.channels ch where ch.id = chan_id) then
    raise exception 'unknown channel';
  end if;
  if not exists (
    select 1 from public.channel_members mem
    where mem.channel_id = chan_id and mem.user_id = me
  ) then
    raise exception 'join the channel to post';
  end if;

  select coalesce(p.data->>'name', 'Member'),
         nullif(p.data->>'residence', ''),
         nullif(p.data->>'classYear', '')
    into nm, res, cls
    from public.profiles p where p.id = me;

  insert into public.channel_messages
      (channel_id, sender_id, sender_name, sender_residence, sender_class_year, body)
    values (chan_id, me, nm, res, cls, btrim(message_text))
    returning channel_messages.id into new_id;

  insert into public.channel_reads (channel_id, user_id, last_read_at)
    values (chan_id, me, now())
    on conflict (channel_id, user_id) do update set last_read_at = excluded.last_read_at;

  return query
    select m.id, m.sender_id, m.sender_name, m.sender_residence,
           m.sender_class_year, m.body, m.created_at
    from public.channel_messages m where m.id = new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Let signed-in users call these via Supabase RPC.
-- ---------------------------------------------------------------------------
grant execute on function public.dm_start(uuid)            to authenticated;
grant execute on function public.dm_list()                 to authenticated;
grant execute on function public.dm_thread(uuid)           to authenticated;
grant execute on function public.dm_send(uuid, text)       to authenticated;
grant execute on function public.channel_list()            to authenticated;
grant execute on function public.channel_join(uuid)        to authenticated;
grant execute on function public.channel_leave(uuid)       to authenticated;
grant execute on function public.channel_thread(uuid)      to authenticated;
grant execute on function public.channel_send(uuid, text)  to authenticated;
