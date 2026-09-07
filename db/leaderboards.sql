-- ============================================================================
-- UNIsport — Leaderboards
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
--   workout_logs is PRIVATE: RLS lets a signed-in user read only their own rows
--   (db/workout_logs.sql), and profiles is the same (db/profiles.sql). A
--   leaderboard has to count EVERYBODY, so — exactly like db/public_profile.sql
--   and db/matching.sql — these are SECURITY DEFINER functions: they run with
--   the definer's rights but only ever hand back a curated, public-safe result.
--
--   WHAT LEAVES THE DATABASE: a name, initials, house, class year and a handful
--   of NUMBERS. Never a workout, never an exercise, never a note, never a
--   photo, never a date. Nobody can reconstruct what anyone actually did from a
--   leaderboard.
--
-- THE SPLIT THAT MATTERS
--   This file COUNTS SESSIONS. It does not know what one is WORTH. What a
--   session earns, and what a partner multiplies it by, lives in lib/points.ts
--   as data — so changing the new-partner multiplier is one line in a
--   TypeScript file and needs no migration.
--
--   The one exception is the three rates passed IN as arguments, used purely to
--   ORDER a board before it is cut to a limit. The caller supplies them from
--   lib/points.ts, so there is still exactly one source of truth.
--
-- HOW A SESSION IS COUNTED
--   Every logged workout is tagged with its KIND:
--     solo         — trained alone
--     partner      — trained with someone from the app, met before
--     new_partner  — trained with someone from the app for the FIRST time
--
--   A partner only counts when it is a real account picked from the people
--   list. A name typed into a box is not a partner, here or anywhere else in
--   this file: you cannot invent people to score off.
--
--   THE CAP: a single day counts at most TWICE, and when a day holds more than
--   two sessions the most valuable two are the ones kept. Without the cap the
--   board is won by whoever taps "Log Session" the most times in an evening
--   rather than by whoever trains the most, and a board that can be farmed
--   stops meaning anything the week people notice.
--
-- PERIODS
--   'month'    — since the 1st of the current month  (default)
--   'semester' — since the start of the current term: Sep 1 (fall), Jan 1
--                (spring), Jun 1 (summer)
--   'all'      — everything ever
--   Boards reset, which is the point: a season nobody can still win is a season
--   nobody plays. Every month, everyone starts level again — and the semester
--   board is the longer race that a single good month can't decide.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Start date of a leaderboard period.
--
-- A "semester" is the academic term the calendar is in right now: Sep–Dec is
-- the fall term, Jan–May the spring term, Jun–Aug the summer. Deriving it from
-- the month means no term-dates table to maintain and nothing to forget to
-- update in August — the board rolls over on its own.
create or replace function public.leaderboard_since(period text)
returns date
language sql
immutable
as $$
  select case lower(coalesce(period, 'month'))
           when 'all'      then '1900-01-01'::date
           when 'semester' then make_date(
             extract(year from current_date)::int,
             case when extract(month from current_date) >= 9 then 9
                  when extract(month from current_date) >= 6 then 6
                  else 1
             end,
             1
           )
           else (date_trunc('month', current_date))::date
         end;
$$;

-- "Elena Vasquez" -> "EV". Used instead of profile photos: photos are stored as
-- data URLs inside profiles.data, and fifty of those would be several megabytes
-- down a phone connection for one screen.
create or replace function public.initials_of(full_name text)
returns text
language sql
immutable
as $$
  select coalesce(string_agg(upper(left(w, 1)), '' order by ord), '?')
  from (
    select w, ord
    from unnest(string_to_array(btrim(coalesce(full_name, '')), ' '))
         with ordinality as t(w, ord)
    where w <> ''
    order by ord
    limit 2
  ) s;
$$;

-- ---------------------------------------------------------------------------
-- The one place a session is tagged and capped
--
-- Every board in this file is built on this: sessions per person, split into
-- the three kinds, for one period. Written once so the campus board, the house
-- board, the team boards and the Profile strip can never disagree about what
-- somebody's month looked like.
--
-- "First time with this partner" is decided over ALL of history, deliberately:
-- somebody you met in October is not new again in November just because the
-- board reset. The window therefore runs before the period filter.
-- ---------------------------------------------------------------------------
drop function if exists public.leaderboard_session_kinds(date);

create function public.leaderboard_session_kinds(since_date date)
returns table (
  user_id     uuid,
  solo        int,
  partner     int,
  new_partner int
)
language sql
stable
security definer
set search_path = public
as $$
  with
  tagged as (
    select
      w.user_id as uid,
      w.log_date,
      w.id,
      case
        when w.partner_id is null then 0
        when row_number() over (
               partition by w.user_id, w.partner_id
               order by w.log_date, w.id
             ) = 1 then 2
        else 1
      end as kind
    from public.workout_logs w
  ),
  in_window as (
    select t.* from tagged t
    where since_date is null or t.log_date >= since_date
  ),
  -- The two most valuable sessions of any one day, and no more.
  capped as (
    select c.uid, c.kind
    from (
      select
        t.*,
        row_number() over (
          partition by t.uid, t.log_date
          order by t.kind desc, t.id
        ) as rn_day
      from in_window t
    ) c
    where c.rn_day <= 2
  )
  select
    c.uid,
    count(*) filter (where c.kind = 0)::int,
    count(*) filter (where c.kind = 1)::int,
    count(*) filter (where c.kind = 2)::int
  from capped c
  group by c.uid;
$$;

-- This one is internal plumbing, not an endpoint: it reports per-person
-- counters for EVERYBODY, and only the curated boards below are meant to be
-- callable. Postgres grants EXECUTE to PUBLIC by default, so it is taken away
-- explicitly. The boards still reach it because a function called inside a
-- SECURITY DEFINER function runs as the definer.
revoke all on function public.leaderboard_session_kinds(date) from public;

-- ---------------------------------------------------------------------------
-- The individual boards
--   board = 'campus'   — everyone, by POINTS
--         = 'house'    — only the caller's own house/dorm, by points
--         = 'partners' — everyone, by how many DIFFERENT people they trained
--                        with. The one board not scored in points: counting
--                        people is the whole question it answers.
-- ---------------------------------------------------------------------------
drop function if exists public.leaderboard_people(text, text, int);
drop function if exists public.leaderboard_people(text, text, int, int, int, int);

create function public.leaderboard_people(
  board       text default 'campus',
  period      text default 'month',
  limit_n     int  default 50,
  -- From lib/points.ts, for ORDERING only.
  pts_solo    int  default 10,
  pts_partner int  default 15,
  pts_new     int  default 25
)
returns table (
  rank        int,
  user_id     uuid,
  name        text,
  initials    text,
  residence   text,
  class_year  text,
  score       int,   -- points, or partners on the partners board
  solo        int,
  partner     int,
  new_partner int,
  partners    int,   -- different people trained with
  is_me       boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  bounds as (select public.leaderboard_since(period) as since),
  kinds as (
    select k.* from public.leaderboard_session_kinds(
      (select b.since from bounds b)
    ) k
  ),
  -- Distinct real training partners. Deliberately counted from every log
  -- rather than the capped set: the cap exists to stop points being farmed,
  -- and "trained with nine different people" is not something a busy Tuesday
  -- should be able to hide.
  partner_count as (
    select w.user_id as uid, count(distinct w.partner_id)::int as n
    from public.workout_logs w, bounds b
    where w.log_date >= b.since and w.partner_id is not null
    group by 1
  ),
  scored as (
    select
      p.id,
      coalesce(nullif(p.data->>'name', ''), 'Member') as who,
      p.data->>'residence' as res,
      p.data->>'classYear' as yr,
      coalesce(k.solo, 0)        as n_solo,
      coalesce(k.partner, 0)     as n_partner,
      coalesce(k.new_partner, 0) as n_new,
      coalesce(pc.n, 0)          as n_partners,
      case when lower(board) = 'partners'
           then coalesce(pc.n, 0)
           else coalesce(k.solo, 0) * pts_solo
              + coalesce(k.partner, 0) * pts_partner
              + coalesce(k.new_partner, 0) * pts_new
      end as pts
    from public.profiles p
    left join kinds k          on k.user_id = p.id
    left join partner_count pc on pc.uid    = p.id
    where p.onboarding_completed
      and (
        lower(board) <> 'house'
        or p.data->>'residence' = (
             select q.data->>'residence' from public.profiles q where q.id = auth.uid()
           )
      )
  )
  -- WHERE runs before the window function, so a zero never takes up a rank:
  -- ranks describe the people who actually turned up.
  select
    (rank() over (order by sc.pts desc, sc.who))::int,
    sc.id,
    sc.who,
    public.initials_of(sc.who),
    sc.res,
    sc.yr,
    sc.pts,
    sc.n_solo,
    sc.n_partner,
    sc.n_new,
    sc.n_partners,
    sc.id = auth.uid()
  from scored sc
  where sc.pts > 0
  order by 1
  limit greatest(coalesce(limit_n, 50), 1);
$$;

-- ---------------------------------------------------------------------------
-- The team boards
--   kind = 'house' — the 12 houses / Yard dorms against each other
--        = 'year'  — class year against class year
--
-- Ranked by POINTS PER MEMBER, not by total: otherwise the biggest group wins
-- every month forever and the small ones stop trying by week two. Per member is
-- also the honest measure of whether a house is actually USING the app, which
-- is the number the interhouse competition will one day open on. A group needs
-- at least `min_members` people signed up to appear at all, so one very keen
-- person in an otherwise empty house can't top the table on their own.
-- ---------------------------------------------------------------------------
drop function if exists public.leaderboard_groups(text, text, int);
drop function if exists public.leaderboard_groups(text, text, int, int, int, int);

create function public.leaderboard_groups(
  kind        text default 'house',
  period      text default 'month',
  min_members int  default 1,
  pts_solo    int  default 10,
  pts_partner int  default 15,
  pts_new     int  default 25
)
returns table (
  rank       int,
  key        text,
  members    int,
  actives    int,   -- how many of them actually trained this period
  sessions   int,
  points     int,
  avg_points numeric,
  is_mine    boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  bounds as (select public.leaderboard_since(period) as since),
  kinds as (
    select k.* from public.leaderboard_session_kinds(
      (select b.since from bounds b)
    ) k
  ),
  member_of as (
    select
      p.id,
      nullif(case when lower(kind) = 'year' then p.data->>'classYear'
                  else p.data->>'residence' end, '') as grp,
      coalesce(k.solo, 0) + coalesce(k.partner, 0) + coalesce(k.new_partner, 0) as n,
      coalesce(k.solo, 0) * pts_solo
        + coalesce(k.partner, 0) * pts_partner
        + coalesce(k.new_partner, 0) * pts_new as pts
    from public.profiles p
    left join kinds k on k.user_id = p.id
    where p.onboarding_completed
  ),
  my_key as (
    select nullif(case when lower(kind) = 'year' then p.data->>'classYear'
                       else p.data->>'residence' end, '') as grp
    from public.profiles p where p.id = auth.uid()
  ),
  grouped as (
    select
      m.grp,
      count(*)::int                            as n_members,
      count(*) filter (where m.n > 0)::int     as n_actives,
      sum(m.n)::int                            as n_sessions,
      sum(m.pts)::int                          as n_points,
      round(sum(m.pts)::numeric / count(*), 1) as per_member
    from member_of m
    where m.grp is not null
    group by m.grp
    having count(*) >= greatest(coalesce(min_members, 1), 1)
  )
  -- A group that scored nothing is left off, exactly as a person who scored
  -- nothing is left off the individual boards: a table of twelve houses all
  -- reading 0.0 looks broken rather than honest, and the screen has a proper
  -- empty state to say so. WHERE runs before the window function, so a zero
  -- never takes up a rank either.
  select
    (rank() over (order by g.per_member desc, g.n_points desc, g.grp))::int,
    g.grp,
    g.n_members,
    g.n_actives,
    g.n_sessions,
    g.n_points,
    g.per_member,
    g.grp is not distinct from (select mk.grp from my_key mk)
  from grouped g
  where g.n_points > 0
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- The caller's own standing — everything the one-line strip on the Profile tab
-- and the header of the boards screen need, in a single round trip.
--
-- `next_gap` / `next_name` are the point of the whole feature: "40 points and
-- you pass Marcus" is a reason to train tonight in a way that "you are 7th" is
-- not. It looks inside your own house first (a board you can realistically
-- move in) and only falls back to campus if nobody in your house is ahead.
--
-- Every reference below is table-qualified and the CTEs are deliberately named
-- nothing like the output columns: in a SQL-language function the RETURNS TABLE
-- names are in scope, so a bare `sessions` would be ambiguous.
-- ---------------------------------------------------------------------------
drop function if exists public.my_leaderboard_standing(text);
drop function if exists public.my_leaderboard_standing(text, int, int, int);

create function public.my_leaderboard_standing(
  period      text default 'month',
  pts_solo    int  default 10,
  pts_partner int  default 15,
  pts_new     int  default 25
)
returns table (
  points        int,
  sessions      int,
  solo          int,
  partner       int,
  new_partner   int,
  partners      int,
  residence     text,
  class_year    text,
  campus_rank   int,   -- null until you have logged something
  campus_total  int,
  house_rank_in int,   -- my place among my own housemates
  house_actives int,   -- how many housemates trained this period
  house_rank    int,   -- my house's place on the house-vs-house board
  house_total   int,
  year_rank     int,
  year_total    int,
  next_name     text,  -- the person immediately above me
  next_gap      int,   -- POINTS needed to draw level with them
  next_scope    text   -- 'house' | 'campus' | null
)
language sql
stable
security definer
set search_path = public
as $$
  with
  bounds as (select public.leaderboard_since(period) as since),
  kinds as (
    select k.* from public.leaderboard_session_kinds(
      (select b.since from bounds b)
    ) k
  ),
  ppl as (
    select
      p.id as uid,
      coalesce(nullif(p.data->>'name', ''), 'Member') as who,
      p.data->>'residence' as res,
      p.data->>'classYear' as yr,
      coalesce(k.solo, 0)        as n_solo,
      coalesce(k.partner, 0)     as n_partner,
      coalesce(k.new_partner, 0) as n_new,
      coalesce(k.solo, 0) * pts_solo
        + coalesce(k.partner, 0) * pts_partner
        + coalesce(k.new_partner, 0) * pts_new as pts
    from public.profiles p
    left join kinds k on k.user_id = p.id
    where p.onboarding_completed
  ),
  myrow as (select x.* from ppl x where x.uid = auth.uid()),
  mypart as (
    select count(distinct w.partner_id)::int as n
    from public.workout_logs w, bounds b
    where w.user_id = auth.uid() and w.log_date >= b.since and w.partner_id is not null
  ),
  -- Same minimum and same rates as the screen uses, so the rank shown on the
  -- strip is the rank shown on the board.
  hgrp as (
    select * from public.leaderboard_groups('house', period, 3, pts_solo, pts_partner, pts_new)
  ),
  ygrp as (
    select * from public.leaderboard_groups('year', period, 3, pts_solo, pts_partner, pts_new)
  ),
  -- Nearest person above me: housemates first (pri 0), then anyone (pri 1).
  nxt as (
    select
      x.who as who,
      (x.pts - (select m.pts from myrow m))::int as gap,
      case when x.res is not null and x.res = (select m.res from myrow m)
           then 'house' else 'campus' end as scope,
      case when x.res is not null and x.res = (select m.res from myrow m)
           then 0 else 1 end as pri
    from ppl x
    where x.uid <> auth.uid()
      and x.pts > (select m.pts from myrow m)
    order by 4, 2, 1
    limit 1
  )
  select
    m.pts,
    m.n_solo + m.n_partner + m.n_new,
    m.n_solo,
    m.n_partner,
    m.n_new,
    (select mp.n from mypart mp),
    m.res,
    m.yr,
    case when m.pts > 0
         then (select count(*)::int + 1 from ppl x where x.pts > m.pts) end,
    (select count(*)::int from ppl x where x.pts > 0),
    case when m.pts > 0 and m.res is not null
         then (select count(*)::int + 1 from ppl x where x.res = m.res and x.pts > m.pts) end,
    (select count(*)::int from ppl x where x.res is not null and x.res = m.res and x.pts > 0),
    (select h.rank from hgrp h where h.key = m.res),
    (select count(*)::int from hgrp h),
    (select y.rank from ygrp y where y.key = m.yr),
    (select count(*)::int from ygrp y),
    (select x.who   from nxt x),
    (select x.gap   from nxt x),
    (select x.scope from nxt x)
  from myrow m;
$$;

grant execute on function public.leaderboard_since(text)                            to authenticated;
grant execute on function public.initials_of(text)                                  to authenticated;
grant execute on function public.leaderboard_people(text, text, int, int, int, int)  to authenticated;
grant execute on function public.leaderboard_groups(text, text, int, int, int, int)  to authenticated;
grant execute on function public.my_leaderboard_standing(text, int, int, int)        to authenticated;
