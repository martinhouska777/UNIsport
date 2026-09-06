-- ============================================================================
-- UNIsport — Gym Buddy Board (Slice: find a partner by workout focus + day)
-- ----------------------------------------------------------------------------
-- A lightweight "looking for a partner" board. A user POSTS what they want to
-- train (legs / arms / chest…) on a coarse day + time-of-day ("legs, Thursday
-- afternoon"); everyone else sees the open posts and can Message the poster
-- (the existing DM system). This is the data the matchers can't provide:
-- onboarding never asks workout focus, and a post is an intent for ONE upcoming
-- session, not "when I'm generally free".
--
-- Posts are for the COMING WEEK and auto-expire once that day passes, so the
-- board always shows real, current intent.
--
-- SECURITY: same pattern as db/follows.sql / db/messages.sql — the table has
-- RLS ENABLED with NO policies, so it is reachable ONLY through the SECURITY
-- DEFINER functions below, which act for auth.uid(). A user can never post or
-- delete as someone else.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create table if not exists public.buddy_posts (
  id           uuid primary key default gen_random_uuid(),
  author       uuid not null,
  focus        text not null,            -- legs / push / pull / arms / chest / back / core / full / cardio
  day          text not null,            -- mon … sun (matches lib/onboarding.ts weekDays)
  time_of_day  text not null,            -- morning / afternoon / evening
  gym          text,                     -- optional, a name from lib/gyms.ts
  note         text,                     -- optional one-liner
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null
);
/*
  The hour they actually mean to go, 24h clock with 30-minute steps (10 = 10 AM,
  17.5 = 5:30 PM). Nullable, so posts made before this existed keep working.

  WHY: "Thursday afternoon" cannot answer "who is training around 9?", and that
  question is the whole point of the session search. A post is somebody actively
  looking for a partner, so it is the best answer the search has — but only if it
  says an hour. time_of_day is still filled in, derived from this, so the coarse
  filter and every old post keep working unchanged.
*/
alter table public.buddy_posts add column if not exists hour numeric;

create index if not exists buddy_posts_expires_idx on public.buddy_posts (expires_at);
create index if not exists buddy_posts_when_idx    on public.buddy_posts (day, hour);
create index if not exists buddy_posts_author_idx  on public.buddy_posts (author);

alter table public.buddy_posts enable row level security;

-- ---------------------------------------------------------------------------
-- Helper: the next calendar date for a weekday key (mon…sun), counting today
-- if today IS that day. Postgres dow: 0=Sun … 6=Sat.
-- ---------------------------------------------------------------------------
create or replace function public.buddy_next_date(day_key text)
returns date
language sql
stable
as $$
  select (current_date + (
    ( case day_key
        when 'sun' then 0 when 'mon' then 1 when 'tue' then 2 when 'wed' then 3
        when 'thu' then 4 when 'fri' then 5 when 'sat' then 6 else 1 end
      - extract(dow from current_date)::int + 7 ) % 7
  ) * interval '1 day')::date;
$$;

-- ---------------------------------------------------------------------------
-- Which of the app's ACTIVITIES a workout focus belongs to, so a board post and
-- a session search can be compared at all. The search speaks gym/running/cardio
-- (lib/onboarding.ts); the board speaks legs/push/run (lib/buddyBoard.ts).
--
-- A FUNCTION rather than a stored column on purpose: change the mapping here and
-- every post ever written moves with it.
-- ---------------------------------------------------------------------------
create or replace function public.buddy_focus_activity(p_focus text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(p_focus, ''))
           when 'run'    then 'running'
           when 'cardio' then 'cardio'
           else 'gym'
         end;
$$;

-- ---------------------------------------------------------------------------
-- Create a post for the caller. Returns the new id. expires_at = noon the day
-- AFTER the target day, so a post stays visible through its whole day (with a
-- timezone buffer) then drops off.
-- ---------------------------------------------------------------------------
drop function if exists public.buddy_post_create(text, text, text, text, text);

create or replace function public.buddy_post_create(
  p_focus text, p_day text, p_hour numeric, p_gym text, p_note text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me  uuid := auth.uid();
  nid uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_focus is null or p_day is null or p_hour is null then
    raise exception 'focus, day and hour are required';
  end if;

  insert into public.buddy_posts (author, focus, day, hour, time_of_day, gym, note, expires_at)
  values (
    me, p_focus, p_day, p_hour,
    -- Derived, never asked: one answer, two shapes, so they can never disagree.
    case when p_hour < 12 then 'morning'
         when p_hour < 17 then 'afternoon'
         else 'evening' end,
    nullif(trim(coalesce(p_gym, '')), ''),
    nullif(trim(coalesce(p_note, '')), ''),
    (public.buddy_next_date(p_day) + interval '1 day' + interval '12 hours')
  )
  returning id into nid;

  return nid;
end;
$$;

-- ---------------------------------------------------------------------------
-- The open board: every non-expired post from OTHER users, optionally narrowed
-- by focus / day / time (null = ignore that filter). Joined to profiles so the
-- card can show who posted. Newest first.
-- ---------------------------------------------------------------------------
-- Dropped first: the shape changed (it returns the hour now), and Postgres
-- refuses to replace a function whose returns-table differs.
drop function if exists public.buddy_board_list(text, text, text);

create or replace function public.buddy_board_list(
  focus_filter text default null,
  day_filter   text default null,
  time_filter  text default null)
returns table (
  id           uuid,
  author       uuid,
  focus        text,
  day          text,
  hour         numeric,
  time_of_day  text,
  gym          text,
  note         text,
  created_at   timestamptz,
  author_name  text,
  author_photo text)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id, b.author, b.focus, b.day, b.hour, b.time_of_day, b.gym, b.note, b.created_at,
    coalesce(p.data->>'name', 'Member') as author_name,
    p.data->>'photo'                    as author_photo
  from public.buddy_posts b
  left join public.profiles p on p.id = b.author
  where b.expires_at > now()
    and b.author <> auth.uid()
    and (focus_filter is null or b.focus = focus_filter)
    and (day_filter   is null or b.day = day_filter)
    and (time_filter  is null or b.time_of_day = time_filter)
  order by b.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- WHO PUT THEIR HAND UP FOR THIS SESSION.
--
-- The session search asks "who trains running on Thursday around 9?" and answers
-- it from people's general SCHEDULES. This answers the same question from the
-- board instead: people who actively posted that they want a partner for one
-- specific session. They are the better answer — a schedule says someone is
-- usually free, a post says they are looking right now — so the Match tab shows
-- these first.
--
-- Matched on activity (via buddy_focus_activity, so "legs" answers a gym search
-- and "run" a running one), the same day, and an hour within the window. Posts
-- written before hours existed have no hour and simply cannot be matched by
-- time, so they stay on the board and out of the search.
-- ---------------------------------------------------------------------------
create or replace function public.buddy_for_session(
  activity_filter text,
  day_filter      text,
  target_hour     numeric,
  window_hours    numeric default 2)
returns table (
  id           uuid,
  author       uuid,
  focus        text,
  day          text,
  hour         numeric,
  time_of_day  text,
  gym          text,
  note         text,
  created_at   timestamptz,
  author_name  text,
  author_photo text)
language sql
stable
security definer
set search_path = public
as $$
  select
    b.id, b.author, b.focus, b.day, b.hour, b.time_of_day, b.gym, b.note, b.created_at,
    coalesce(p.data->>'name', 'Member') as author_name,
    p.data->>'photo'                    as author_photo
  from public.buddy_posts b
  left join public.profiles p on p.id = b.author
  where b.expires_at > now()
    and b.author <> auth.uid()
    and b.hour is not null
    and b.day = day_filter
    and public.buddy_focus_activity(b.focus) = lower(activity_filter)
    and abs(b.hour - target_hour) <= window_hours
  -- Closest to the hour you asked for first; a dead-on 9 beats a 7.
  order by abs(b.hour - target_hour), b.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- The caller's own active posts (for the "Your posts" list + Remove button).
-- ---------------------------------------------------------------------------
drop function if exists public.buddy_my_posts();

create or replace function public.buddy_my_posts()
returns table (
  id          uuid,
  focus       text,
  day         text,
  hour        numeric,
  time_of_day text,
  gym         text,
  note        text,
  created_at  timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.focus, b.day, b.hour, b.time_of_day, b.gym, b.note, b.created_at
  from public.buddy_posts b
  where b.author = auth.uid() and b.expires_at > now()
  order by b.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Delete one of the caller's own posts (no-op if not theirs).
-- ---------------------------------------------------------------------------
create or replace function public.buddy_post_delete(post_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not authenticated'; end if;
  delete from public.buddy_posts where id = post_id and author = me;
end;
$$;

grant execute on function public.buddy_next_date(text)                       to authenticated;
grant execute on function public.buddy_focus_activity(text)                  to authenticated;
grant execute on function public.buddy_post_create(text, text, numeric, text, text) to authenticated;
grant execute on function public.buddy_board_list(text, text, text)          to authenticated;
grant execute on function public.buddy_for_session(text, text, numeric, numeric) to authenticated;
grant execute on function public.buddy_my_posts()                            to authenticated;
grant execute on function public.buddy_post_delete(uuid)                     to authenticated;
