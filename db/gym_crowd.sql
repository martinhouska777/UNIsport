-- ============================================================================
-- UNIsport — Gym crowd reports ("how busy is it RIGHT NOW"), shared campus-wide
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   The four buttons on a gym page (Quiet / Moderate / Busy / Packed) used to
--   save into ONE student's browser, so nobody else ever saw a report — while
--   the screen showed it as if the campus had spoken. This table makes a report
--   a shared fact: one row per PERSON per GYM, holding their latest answer and
--   when they gave it. Tapping again replaces your own row; it never adds a
--   second vote.
--
--   The app reads the rows from the last two hours (the freshness rule is DATA
--   in lib/gymSocial.ts and is passed in), works out which level most people
--   said, and shows the honest sample size: "2 people said Busy in the last
--   hour". With no fresh rows it falls back to the typical-week prediction
--   ("Usually busy", lib/gymBusyness.ts).
--
-- SECURITY: same pattern as db/buddy_board.sql / db/workout_logs.sql — RLS is
--   ENABLED with NO policies, so the table is reachable ONLY through the
--   SECURITY DEFINER functions below, which act for auth.uid(). A user can never
--   report as someone else, and the read never hands out WHO reported — only
--   the level, the time, and whether a row is the caller's own.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.gym_crowd_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  gym_slug   text not null,                       -- lib/gyms.ts slug (globally unique across schools)
  level      text not null,                       -- quiet | moderate | busy | packed (lib/gymSocial.ts CROWD_LEVELS)
  created_at timestamptz not null default now(),  -- when THIS answer was given (re-reporting resets it)
  unique (user_id, gym_slug)                      -- one live answer per person per gym
);

create index if not exists gym_crowd_reports_gym_time_idx
  on public.gym_crowd_reports (gym_slug, created_at desc);

alter table public.gym_crowd_reports enable row level security;

-- ---------------------------------------------------------------------------
-- File a report for the caller: "this gym is <level> right now". Replaces the
-- caller's previous answer for that gym (and re-stamps it as now), so one
-- person is always exactly one voice in the count.
-- ---------------------------------------------------------------------------
create or replace function public.gym_crowd_report(p_gym_slug text, p_level text)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_gym_slug is null or length(btrim(p_gym_slug)) = 0 then
    raise exception 'gym required';
  end if;
  if p_level is null or length(btrim(p_level)) = 0 then
    raise exception 'level required';
  end if;

  insert into public.gym_crowd_reports (user_id, gym_slug, level, created_at)
    values (me, btrim(p_gym_slug), lower(btrim(p_level)), now())
  on conflict (user_id, gym_slug)
    do update set level = excluded.level, created_at = now();
end;
$$;

-- ---------------------------------------------------------------------------
-- Every report from the last `fresh_minutes` minutes, for ALL gyms in one call
-- (the gyms list needs all of them at once; the gym page just picks its own).
-- Anonymous on purpose: no user id comes back, only whether the row is YOURS,
-- so the buttons can highlight your own answer rather than the campus's.
-- The freshness window is passed in rather than fixed here, so the one number
-- in lib/gymSocial.ts (CROWD_FRESH_MS) stays the single source of truth.
-- ---------------------------------------------------------------------------
drop function if exists public.gym_crowd_recent(integer);

create or replace function public.gym_crowd_recent(fresh_minutes integer default 120)
returns table (
  gym_slug   text,
  level      text,
  created_at timestamptz,
  mine       boolean)
language sql
stable
security definer
set search_path = public
as $$
  select r.gym_slug, r.level, r.created_at, (r.user_id = auth.uid()) as mine
  from public.gym_crowd_reports r
  where auth.uid() is not null
    and r.created_at > now() - make_interval(mins => greatest(1, fresh_minutes))
  order by r.gym_slug, r.created_at desc;
$$;

grant execute on function public.gym_crowd_report(text, text)   to authenticated;
grant execute on function public.gym_crowd_recent(integer)      to authenticated;
