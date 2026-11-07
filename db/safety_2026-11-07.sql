-- ============================================================================
-- UNIsport, Delete account, Block and Report (2026-11-07)
-- ----------------------------------------------------------------------------
-- What the App Store asks of an app where people write to each other
-- (App Review Guidelines 1.2 and 5.1.1(v)):
--
--   1. DELETE ACCOUNT from inside the app. The app calls /api/account/delete,
--      which deletes the auth user with the service key. Everything keyed to
--      the user with "on delete cascade" goes with it; this file adds the two
--      things that would otherwise stop or outlive the delete:
--        * varsity_videos.added_by had no "on delete", so a rower who once
--          added a video could not be deleted at all. Now it is set to null.
--        * a clean-up on auth.users for the tables that hold a user id with no
--          foreign key (follows, open Sessions board posts, channel members),
--          so a deleted person stops counting as a follower and their open
--          posts leave the board.
--   2. BLOCK. A row in `blocks`. Either side of a block disappears for the
--      other in the app (blocked_ids() feeds the client), they unfollow each
--      other, and the database refuses a direct message between them.
--   3. REPORT. A row in `reports`, insert only: nobody reads them through the
--      app. The owner reads them in Supabase (Table editor > reports).
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- 1. DELETE ACCOUNT ----------------------------------------------------------

do $$
begin
  if to_regclass('public.varsity_videos') is not null then
    alter table public.varsity_videos drop constraint if exists varsity_videos_added_by_fkey;
    alter table public.varsity_videos
      add constraint varsity_videos_added_by_fkey
      foreign key (added_by) references auth.users (id) on delete set null;
  end if;
end $$;

create or replace function public.forget_deleted_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.follows') is not null then
    delete from public.follows where follower_id = old.id or followee_id = old.id;
  end if;
  if to_regclass('public.buddy_posts') is not null then
    delete from public.buddy_posts where author = old.id;
  end if;
  if to_regclass('public.channel_members') is not null then
    delete from public.channel_members where user_id = old.id;
  end if;
  if to_regclass('public.channel_join_requests') is not null then
    delete from public.channel_join_requests where user_id = old.id;
  end if;
  return old;
end;
$$;

drop trigger if exists forget_deleted_user on auth.users;
create trigger forget_deleted_user
  after delete on auth.users
  for each row execute function public.forget_deleted_user();

-- 2. BLOCK -------------------------------------------------------------------

create table if not exists public.blocks (
  blocker_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists blocks_blocked_idx on public.blocks (blocked_id);

alter table public.blocks enable row level security;

drop policy if exists "blocks: read own" on public.blocks;
create policy "blocks: read own" on public.blocks
  for select to authenticated using (blocker_id = auth.uid());

drop policy if exists "blocks: add own" on public.blocks;
create policy "blocks: add own" on public.blocks
  for insert to authenticated with check (blocker_id = auth.uid());

drop policy if exists "blocks: remove own" on public.blocks;
create policy "blocks: remove own" on public.blocks
  for delete to authenticated using (blocker_id = auth.uid());

-- Everyone on the other side of a block with the caller, in either direction:
-- the people the app hides from you (and hides you from). Ids only.
create or replace function public.blocked_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select blocked_id from public.blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.blocks where blocked_id = auth.uid()
$$;

-- The people the caller blocked, for Settings > Blocked: name and photo.
create or replace function public.blocked_people()
returns table (id uuid, name text, photo text)
language sql
stable
security definer
set search_path = public
as $$
  select b.blocked_id, coalesce(nullif(p.data->>'name', ''), 'Member'), p.data->>'photo'
  from public.blocks b
  left join public.profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc
$$;

revoke all on function public.blocked_ids() from public, anon;
revoke all on function public.blocked_people() from public, anon;
grant execute on function public.blocked_ids() to authenticated;
grant execute on function public.blocked_people() to authenticated;

-- A block ends the follows both ways, the way Instagram does it.
create or replace function public.blocks_unfollow()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if to_regclass('public.follows') is not null then
    delete from public.follows
    where (follower_id = new.blocker_id and followee_id = new.blocked_id)
       or (follower_id = new.blocked_id and followee_id = new.blocker_id);
  end if;
  return new;
end;
$$;

drop trigger if exists blocks_unfollow on public.blocks;
create trigger blocks_unfollow
  after insert on public.blocks
  for each row execute function public.blocks_unfollow();

-- No direct message between two people when either has blocked the other.
-- On the table, so it holds for dm_send, plan cards and anything added later.
create or replace function public.dm_messages_block_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  other uuid;
begin
  select case when c.user_lo = new.sender_id then c.user_hi else c.user_lo end
    into other
    from public.dm_conversations c
    where c.id = new.conv_id;
  if other is not null and exists (
    select 1 from public.blocks b
    where (b.blocker_id = new.sender_id and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = new.sender_id)
  ) then
    raise exception 'blocked';
  end if;
  return new;
end;
$$;

drop trigger if exists dm_messages_block_guard on public.dm_messages;
create trigger dm_messages_block_guard
  before insert on public.dm_messages
  for each row execute function public.dm_messages_block_guard();

-- 3. REPORT ------------------------------------------------------------------

create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid default auth.uid(),
  reported_user uuid,                     -- whose post, message or profile
  kind          text not null check (kind in ('person', 'message', 'post', 'review')),
  target_id     text,                     -- the message, post or review's own id
  body          text,                     -- a copy of what was reported, kept if it is deleted
  reason        text not null,
  status        text not null default 'open',
  created_at    timestamptz not null default now()
);
create index if not exists reports_open_idx on public.reports (created_at desc) where status = 'open';

alter table public.reports enable row level security;

drop policy if exists "reports: file own" on public.reports;
create policy "reports: file own" on public.reports
  for insert to authenticated with check (reporter_id = auth.uid());
-- No select, update or delete policy: the app can file a report, never read one.
