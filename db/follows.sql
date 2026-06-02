-- ============================================================================
-- UNIsport — Follows (Slice: Follow button on another person's profile)
-- ----------------------------------------------------------------------------
-- A lightweight directed follow graph: "I follow you" (not mutual). Powers the
-- Follow / Following button on the other-person profile and the "Following"
-- count on the owner's own Profile tab.
--
-- SECURITY: same pattern as db/messages.sql — the table has RLS ENABLED with NO
-- policies, so it is only reachable through the SECURITY DEFINER functions
-- below, which act for auth.uid(). A user can never write a follow as someone
-- else.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create table if not exists public.follows (
  follower_id uuid not null,
  followee_id uuid not null,
  created_at  timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);
create index if not exists follows_followee_idx on public.follows (followee_id);

alter table public.follows enable row level security;

-- Follow someone (idempotent).
create or replace function public.follow_user(target uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if target is null or target = me then raise exception 'invalid target'; end if;
  insert into public.follows (follower_id, followee_id)
    values (me, target)
    on conflict do nothing;
end;
$$;

-- Unfollow someone (no-op if not following).
create or replace function public.unfollow_user(target uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.follows where follower_id = me and followee_id = target;
end;
$$;

-- The caller's relationship to `target`: do I follow them, their follower count,
-- and whether they follow me back.
create or replace function public.follow_status(target uuid)
returns table (following boolean, followers integer, follows_back boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (select 1 from public.follows f
            where f.follower_id = auth.uid() and f.followee_id = target),
    (select count(*) from public.follows f where f.followee_id = target)::int,
    exists (select 1 from public.follows f
            where f.follower_id = target and f.followee_id = auth.uid());
$$;

-- The caller's own following / followers totals (for the Profile tab stat).
create or replace function public.my_follow_counts()
returns table (following integer, followers integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    (select count(*) from public.follows where follower_id = auth.uid())::int,
    (select count(*) from public.follows where followee_id = auth.uid())::int;
$$;

grant execute on function public.follow_user(uuid)     to authenticated;
grant execute on function public.unfollow_user(uuid)   to authenticated;
grant execute on function public.follow_status(uuid)   to authenticated;
grant execute on function public.my_follow_counts()    to authenticated;
