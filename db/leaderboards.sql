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
--   WHAT LEAVES THE DATABASE: a name, initials, house, class year and a NUMBER.
--   Never a workout, never an exercise, never a note, never a photo, never a
--   date. Nobody can reconstruct what anyone actually did from a leaderboard.
--
-- HOW A SCORE IS COUNTED
--   One "session" = one logged workout, but a single day counts at most TWICE.
--   Without that cap the board is won by whoever taps "Log Session" the most
--   times in an evening rather than by whoever trains the most, and a board
--   that can be farmed stops meaning anything the week people notice.
--
-- PERIODS
--   'week'  — since Monday of the current week
--   'month' — since the 1st of the current month  (default)
--   'all'   — everything ever
--   Boards reset, which is the point: a season nobody can still win is a season
--   nobody plays. Every month, everyone starts level again.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- Start date of a leaderboard period.
create or replace function public.leaderboard_since(period text)
returns date
language sql
immutable
as $$
  select case lower(coalesce(period, 'month'))
           when 'week' then (date_trunc('week',  current_date))::date
           when 'all'  then '1900-01-01'::date
           else             (date_trunc('month', current_date))::date
         end;
$$;

-- "Elena Vásquez" → "EV". Used instead of profile photos: photos are stored as
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
-- The individual boards
--   board = 'campus'   — everyone, by sessions
--         = 'house'    — only the caller's own house/dorm, by sessions
--         = 'partners' — everyone, by how many DIFFERENT people they trained with
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_people(
  board   text default 'campus',
  period  text default 'month',
  limit_n int  default 50
)
returns table (
  rank       int,
  user_id    uuid,
  name       text,
  initials   text,
  residence  text,
  class_year text,
  score      int,
  is_me      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  bounds as (select public.leaderboard_since(period) as since),
  -- Sessions per person, with the two-a-day cap described at the top.
  sessions as (
    select d.user_id, sum(least(d.c, 2))::int as n
    from (
      select w.user_id, w.log_date, count(*) as c
      from public.workout_logs w, bounds b
      where w.log_date >= b.since
      group by 1, 2
    ) d
    group by 1
  ),
  -- Distinct real training partners per person (free-text names don't count —
  -- only someone actually picked from the app).
  partners as (
    select w.user_id, count(distinct w.partner_id)::int as n
    from public.workout_logs w, bounds b
    where w.log_date >= b.since and w.partner_id is not null
    group by 1
  ),
  scored as (
    select
      p.id,
      coalesce(nullif(p.data->>'name', ''), 'Member') as name,
      p.data->>'residence' as residence,
      p.data->>'classYear' as class_year,
      case when lower(board) = 'partners'
           then coalesce(pt.n, 0)
           else coalesce(s.n, 0)
      end as score
    from public.profiles p
    left join sessions s  on s.user_id  = p.id
    left join partners pt on pt.user_id = p.id
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
    (rank() over (order by sc.score desc, sc.name))::int,
    sc.id,
    sc.name,
    public.initials_of(sc.name),
    sc.residence,
    sc.class_year,
    sc.score,
    sc.id = auth.uid()
  from scored sc
  where sc.score > 0
  order by 1
  limit greatest(coalesce(limit_n, 50), 1);
$$;

-- ---------------------------------------------------------------------------
-- The team boards
--   kind = 'house' — the 12 houses / Yard dorms against each other
--        = 'year'  — class year against class year
--
-- Ranked by sessions PER MEMBER, not by total: otherwise the biggest group wins
-- every month forever and the small ones stop trying by week two. A group needs
-- at least `min_members` people signed up to appear at all, so one very keen
-- person in an otherwise empty house can't top the table on their own.
-- ---------------------------------------------------------------------------
create or replace function public.leaderboard_groups(
  kind        text default 'house',
  period      text default 'month',
  min_members int  default 1
)
returns table (
  rank         int,
  key          text,
  members      int,
  actives      int,   -- how many of them actually trained this period
  sessions     int,
  avg_sessions numeric,
  is_mine      boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  bounds as (select public.leaderboard_since(period) as since),
  sessions as (
    select d.user_id, sum(least(d.c, 2))::int as n
    from (
      select w.user_id, w.log_date, count(*) as c
      from public.workout_logs w, bounds b
      where w.log_date >= b.since
      group by 1, 2
    ) d
    group by 1
  ),
  member_of as (
    select
      p.id,
      nullif(case when lower(kind) = 'year' then p.data->>'classYear'
                  else p.data->>'residence' end, '') as key,
      coalesce(s.n, 0) as n
    from public.profiles p
    left join sessions s on s.user_id = p.id
    where p.onboarding_completed
  ),
  my_key as (
    select nullif(case when lower(kind) = 'year' then p.data->>'classYear'
                       else p.data->>'residence' end, '') as key
    from public.profiles p where p.id = auth.uid()
  ),
  grouped as (
    select
      m.key,
      count(*)::int                              as members,
      count(*) filter (where m.n > 0)::int       as actives,
      sum(m.n)::int                              as sessions,
      round(sum(m.n)::numeric / count(*), 1)     as avg_sessions
    from member_of m
    where m.key is not null
    group by m.key
    having count(*) >= greatest(coalesce(min_members, 1), 1)
  )
  select
    (rank() over (order by g.avg_sessions desc, g.sessions desc, g.key))::int,
    g.key,
    g.members,
    g.actives,
    g.sessions,
    g.avg_sessions,
    g.key is not distinct from (select key from my_key)
  from grouped g
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- The caller's own standing — everything the one-line strip on the Profile tab
-- needs, in a single round trip.
--
-- `next_gap` / `next_name` are the point of the whole feature: "2 more and you
-- pass Marcus" is a reason to train tonight in a way that "you are 7th" is not.
-- It looks inside your own house first (a board you can realistically move in)
-- and only falls back to campus if nobody in your house is ahead of you.
--
-- Every reference below is table-qualified and the CTEs are deliberately named
-- nothing like the output columns: in a SQL-language function the RETURNS TABLE
-- names are in scope, so a bare `sessions` would be ambiguous.
-- ---------------------------------------------------------------------------
create or replace function public.my_leaderboard_standing(period text default 'month')
returns table (
  sessions      int,
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
  next_gap      int,   -- sessions needed to draw level with them
  next_scope    text   -- 'house' | 'campus' | null
)
language sql
stable
security definer
set search_path = public
as $$
  with
  bounds as (select public.leaderboard_since(period) as since),
  sess as (
    select d.uid, sum(least(d.c, 2))::int as n
    from (
      select w.user_id as uid, w.log_date, count(*) as c
      from public.workout_logs w, bounds b
      where w.log_date >= b.since
      group by 1, 2
    ) d
    group by 1
  ),
  ppl as (
    select
      p.id as uid,
      coalesce(nullif(p.data->>'name', ''), 'Member') as who,
      p.data->>'residence' as res,
      p.data->>'classYear' as yr,
      coalesce(s.n, 0) as n
    from public.profiles p
    left join sess s on s.uid = p.id
    where p.onboarding_completed
  ),
  myrow as (select x.* from ppl x where x.uid = auth.uid()),
  mypart as (
    select count(distinct w.partner_id)::int as n
    from public.workout_logs w, bounds b
    where w.user_id = auth.uid() and w.log_date >= b.since and w.partner_id is not null
  ),
  -- Same minimum as the screen uses (see MIN_GROUP_MEMBERS in lib/leaderboards
  -- .ts), so the rank shown on the strip is the rank shown on the board.
  hgrp as (select * from public.leaderboard_groups('house', period, 3)),
  ygrp as (select * from public.leaderboard_groups('year',  period, 3)),
  -- Nearest person above me: housemates first (pri 0), then anyone (pri 1).
  nxt as (
    select
      x.who as who,
      (x.n - (select m.n from myrow m))::int as gap,
      case when x.res is not null and x.res = (select m.res from myrow m)
           then 'house' else 'campus' end as scope,
      case when x.res is not null and x.res = (select m.res from myrow m)
           then 0 else 1 end as pri
    from ppl x
    where x.uid <> auth.uid()
      and x.n > (select m.n from myrow m)
    order by 4, 2, 1
    limit 1
  )
  select
    m.n,
    (select mp.n from mypart mp),
    m.res,
    m.yr,
    case when m.n > 0
         then (select count(*)::int + 1 from ppl x where x.n > m.n) end,
    (select count(*)::int from ppl x where x.n > 0),
    case when m.n > 0 and m.res is not null
         then (select count(*)::int + 1 from ppl x where x.res = m.res and x.n > m.n) end,
    (select count(*)::int from ppl x where x.res is not null and x.res = m.res and x.n > 0),
    (select h.rank from hgrp h where h.key = m.res),
    (select count(*)::int from hgrp h),
    (select y.rank from ygrp y where y.key = m.yr),
    (select count(*)::int from ygrp y),
    (select x.who   from nxt x),
    (select x.gap   from nxt x),
    (select x.scope from nxt x)
  from myrow m;
$$;

grant execute on function public.leaderboard_since(text)             to authenticated;
grant execute on function public.initials_of(text)                   to authenticated;
grant execute on function public.leaderboard_people(text, text, int) to authenticated;
grant execute on function public.leaderboard_groups(text, text, int) to authenticated;
grant execute on function public.my_leaderboard_standing(text)       to authenticated;
