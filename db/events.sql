-- ============================================================================
-- UNIsport — Event counters
-- ----------------------------------------------------------------------------
-- WHAT THIS IS FOR
--   db/leaderboards.sql answers "where does everybody stand". This file answers
--   a different question: "how far along is this week's task". It returns the
--   raw COUNTERS an event is measured against, for one window, for the caller
--   and for every house.
--
-- THE SPLIT THAT MATTERS — the same one as the boards
--   This file COUNTS. It does not know what any event ASKS FOR. The tasks,
--   their targets, their alternative routes and what they pay all live in
--   lib/events.ts as data, so changing "train 5 days" to six is one line in a
--   TypeScript file and needs no migration. Nothing in here mentions a target.
--
--   The one thing that is duplicated on purpose is the DISTANCE WEIGHTING
--   (running and rowing 1:1, cycling a third). Summing has to happen next to
--   the rows, so the weights are passed IN as arguments from lib/events.ts —
--   that file stays the place they are decided.
--
-- THE METRICS, and why each is counted the way it is
--   days             separate days trained on. Every log counts: this is the
--                    "did you turn up" number and a day is a day.
--   partners         different people trained with. A real account picked from
--                    the app — a name typed into a box is not a partner.
--   new_partners     of those, the ones never trained with BEFORE this window.
--                    Decided over ALL of history, so somebody met in October is
--                    not new again in November just because the window moved.
--   gym_sessions     sessions logged as a gym session
--   cardio_sessions  sessions logged as a run OR as cardio
--                    Both session counts use the SAME two-a-day cap as points
--                    (db/leaderboards.sql): otherwise "three lifts this week"
--                    is finished in one evening by tapping Log Session.
--   distance_km      weighted kilometres, normalised to km first — rowing is
--                    stored in METRES and running in kilometres, so a 2,000 m
--                    row would otherwise read as two thousand.
--
-- PRIVACY — the same contract as the boards
--   workout_logs is private (RLS: you read only your own rows), so these are
--   SECURITY DEFINER. What leaves the database is a handful of TOTALS, plus a
--   house name for the race. Never a workout, an exercise, a note, a photo or
--   a date.
--
-- DEPENDS ON db/leaderboards.sql for initials_of(). Run that one first.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- What one log's distance is worth, in weighted kilometres.
--
-- Mirrors weightedKm() in lib/events.ts. The three weights arrive as arguments
-- so the decision stays in the data file; the units are handled here because
-- they are a property of how the row was stored, not a rule anybody chose.
-- ---------------------------------------------------------------------------
create or replace function public.event_km(
  metrics    jsonb,
  activity   text,
  w_running  numeric default 1,
  w_rowing   numeric default 1,
  w_cycling  numeric default 0.3333333333
)
returns numeric
language sql
immutable
as $$
  select case
    -- Anything that isn't a plain number is not a distance. Guarding here
    -- rather than casting blindly: one bad row must not fail a whole board.
    when coalesce(metrics->>'distance', '') !~ '^[0-9]+(\.[0-9]+)?$' then 0
    else
      (metrics->>'distance')::numeric
      * case lower(coalesce(metrics->>'unit', 'km'))
          when 'm'  then 0.001
          when 'mi' then 1.60934
          else 1
        end
      * case lower(coalesce(nullif(metrics->>'cardioType', ''), activity))
          when 'running' then w_running
          when 'rowing'  then w_rowing
          when 'cycling' then w_cycling
          -- Everything else counts 1:1 — the safe default, not the correct
          -- one. See the note on swimming in lib/events.ts.
          else 1
        end
  end;
$$;

-- ---------------------------------------------------------------------------
-- Every counter an event can be measured against, for one person or for all.
--
-- `since_date` NULL means all of history, which nothing currently asks for —
-- the callers pass this Monday or the 1st.
-- ---------------------------------------------------------------------------
drop function if exists public.event_counters(date, boolean, numeric, numeric, numeric);

create function public.event_counters(
  since_date date,
  only_me    boolean default false,
  w_running  numeric default 1,
  w_rowing   numeric default 1,
  w_cycling  numeric default 0.3333333333
)
returns table (
  user_id         uuid,
  name            text,
  residence       text,
  days            int,
  partners        int,
  new_partners    int,
  gym_sessions    int,
  cardio_sessions int,
  distance_km     numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- Every log, tagged with whether this partner had been trained with before.
  -- The window runs over ALL history so "first time" stays true, and the
  -- period is applied afterwards.
  tagged as (
    select
      w.user_id as uid,
      w.log_date,
      w.id,
      w.activity,
      w.metrics,
      w.partner_id,
      case
        when w.partner_id is null then false
        else row_number() over (
               partition by w.user_id, w.partner_id
               order by w.log_date, w.id
             ) = 1
      end as first_time
    from public.workout_logs w
    where not only_me or w.user_id = auth.uid()
  ),
  in_window as (
    select t.* from tagged t
    where since_date is null or t.log_date >= since_date
  ),
  -- Session counts use the two-most-valuable-a-day cap, exactly as points do.
  -- A session with a partner outranks a solo one when a day has to be cut.
  capped as (
    select c.uid, c.activity
    from (
      select
        t.*,
        row_number() over (
          partition by t.uid, t.log_date
          order by (t.partner_id is not null) desc, t.id
        ) as rn_day
      from in_window t
    ) c
    where c.rn_day <= 2
  ),
  sessions as (
    select
      c.uid,
      count(*) filter (where c.activity = 'gym')::int as gym_n,
      count(*) filter (where c.activity in ('running', 'cardio'))::int as cardio_n
    from capped c
    group by c.uid
  ),
  -- Turning up, who with, and how far: every log, uncapped. The cap exists to
  -- stop a session count being farmed in an evening; "trained on nine separate
  -- days" and "met four people" cannot be farmed that way, and a busy Tuesday
  -- should not hide either.
  variety as (
    select
      t.uid,
      count(distinct t.log_date)::int as day_n,
      count(distinct t.partner_id)::int as partner_n,
      count(distinct t.partner_id) filter (where t.first_time)::int as new_partner_n,
      coalesce(
        sum(public.event_km(t.metrics, t.activity, w_running, w_rowing, w_cycling)),
        0
      ) as km
    from in_window t
    group by t.uid
  )
  select
    p.id,
    coalesce(nullif(p.data->>'name', ''), 'Member'),
    p.data->>'residence',
    coalesce(v.day_n, 0),
    coalesce(v.partner_n, 0),
    coalesce(v.new_partner_n, 0),
    coalesce(s.gym_n, 0),
    coalesce(s.cardio_n, 0),
    round(coalesce(v.km, 0), 1)
  from public.profiles p
  left join variety v  on v.uid = p.id
  left join sessions s on s.uid = p.id
  where p.onboarding_completed
    and (not only_me or p.id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- The same counters added up per house or dorm — the interhouse race.
--
-- `members` and `actives` are what make the race fair to a small house: every
-- target in lib/events.ts marked `perMember` is multiplied by `members`, so a
-- house of forty is asked for forty times what a house of one is. `actives` is
-- the count the "everyone in" race is measured on.
--
-- WHICH NAMES ARE A HOUSE IS DATA (lib/onboarding.ts), passed in as
-- `only_keys` exactly as db/leaderboards.sql takes it — so this file never
-- learns a single house name, and "off campus" never turns up as a house.
-- ---------------------------------------------------------------------------
drop function if exists public.event_house_counters(date, text[], numeric, numeric, numeric);

create function public.event_house_counters(
  since_date date,
  only_keys  text[] default null,
  w_running  numeric default 1,
  w_rowing   numeric default 1,
  w_cycling  numeric default 0.3333333333
)
returns table (
  key             text,
  members         int,
  actives         int,
  days            int,
  partners        int,
  new_partners    int,
  gym_sessions    int,
  cardio_sessions int,
  distance_km     numeric,
  is_mine         boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  people as (
    select c.* from public.event_counters(since_date, false, w_running, w_rowing, w_cycling) c
  ),
  my_key as (
    select nullif(q.data->>'residence', '') as grp
    from public.profiles q where q.id = auth.uid()
  ),
  grouped as (
    select
      pe.residence as grp,
      count(*)::int as n_members,
      /*
        "Trained at all" has to mean any log, not any capped session: somebody
        whose whole month was one Sunday run still turned up, and the race that
        asks for everybody is exactly the one that must count them.
      */
      count(*) filter (
        where pe.days > 0
      )::int as n_actives,
      sum(pe.days)::int as n_days,
      sum(pe.partners)::int as n_partners,
      sum(pe.new_partners)::int as n_new_partners,
      sum(pe.gym_sessions)::int as n_gym,
      sum(pe.cardio_sessions)::int as n_cardio,
      round(sum(pe.distance_km), 1) as n_km
    from people pe
    where nullif(pe.residence, '') is not null
      and (only_keys is null or pe.residence = any (only_keys))
    group by pe.residence
  )
  select
    g.grp,
    g.n_members,
    g.n_actives,
    g.n_days,
    g.n_partners,
    g.n_new_partners,
    g.n_gym,
    g.n_cardio,
    g.n_km,
    g.grp is not distinct from (select mk.grp from my_key mk)
  from grouped g
  order by g.grp;
$$;

grant execute on function public.event_km(jsonb, text, numeric, numeric, numeric)               to authenticated;
grant execute on function public.event_counters(date, boolean, numeric, numeric, numeric)       to authenticated;
grant execute on function public.event_house_counters(date, text[], numeric, numeric, numeric)  to authenticated;
