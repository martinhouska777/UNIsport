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
create index if not exists buddy_posts_expires_idx on public.buddy_posts (expires_at);
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
-- Create a post for the caller. Returns the new id. expires_at = noon the day
-- AFTER the target day, so a post stays visible through its whole day (with a
-- timezone buffer) then drops off.
-- ---------------------------------------------------------------------------
create or replace function public.buddy_post_create(
  p_focus text, p_day text, p_time_of_day text, p_gym text, p_note text)
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
  if p_focus is null or p_day is null or p_time_of_day is null then
    raise exception 'focus, day and time_of_day are required';
  end if;

  insert into public.buddy_posts (author, focus, day, time_of_day, gym, note, expires_at)
  values (
    me, p_focus, p_day, p_time_of_day,
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
create or replace function public.buddy_board_list(
  focus_filter text default null,
  day_filter   text default null,
  time_filter  text default null)
returns table (
  id           uuid,
  author       uuid,
  focus        text,
  day          text,
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
    b.id, b.author, b.focus, b.day, b.time_of_day, b.gym, b.note, b.created_at,
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
-- The caller's own active posts (for the "Your posts" list + Remove button).
-- ---------------------------------------------------------------------------
create or replace function public.buddy_my_posts()
returns table (
  id          uuid,
  focus       text,
  day         text,
  time_of_day text,
  gym         text,
  note        text,
  created_at  timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select b.id, b.focus, b.day, b.time_of_day, b.gym, b.note, b.created_at
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
grant execute on function public.buddy_post_create(text, text, text, text, text) to authenticated;
grant execute on function public.buddy_board_list(text, text, text)          to authenticated;
grant execute on function public.buddy_my_posts()                            to authenticated;
grant execute on function public.buddy_post_delete(uuid)                     to authenticated;
