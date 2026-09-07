-- ============================================================================
-- UNIsport — bring the demo campus up to today, and make it train like people
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
--   Two measured problems with the seeded campus, both of which made the events
--   impossible to look at rather than merely thin:
--
--   1. IT STOPPED. db/seed_campus.sql generates `current_date - n` for n in
--      0..55, so the logs end on the day that file was last run — 26 August.
--      Every "this week" and "this month" screen has been empty ever since,
--      which is why the boards had to be read on All time to show anything.
--
--   2. NOBODY DID TWO SPORTS. That seed gives each person ONE activity and logs
--      only that, so out of 71 people who train, exactly ONE did both lifting
--      and cardio. "Hybrid athlete" was not hard on this campus, it was
--      arithmetically impossible. Partners were picked by a fixed rule too, so
--      the most anybody had was three, and a first-time partner almost never
--      happened.
--
--   Real students are not like that: they lift AND run, they train with
--   different people, and some weeks they go five times. This file fills the
--   current month with activity that behaves that way.
--
-- IT IS ADDITIVE, AND ONLY ITS OWN ROWS ARE REPLACEABLE
--   Nothing already in the table is rewritten. Every row written here carries
--   `metrics->>'seed' = 'recent'`, and re-running deletes only those — so the
--   original seeded history, the chat-planned VERIFIED sessions, and anything a
--   real person logged are all left alone.
--
-- DEMO ACCOUNTS ONLY: scoped to `%@demo.unisport.test`.
--
-- DETERMINISTIC: who trains, on which day, at what, and with whom all come out
--   of a hash of the person's id and the date. Re-running produces the same
--   campus rather than reshuffling it.
--
-- PARTNERS ARE MUTUAL. When A trains with B, B's calendar gets the session too.
--   The old seed only wrote one side, which is not what the app does — a
--   confirmed plan writes a log for each person (db/session_plans.sql) — and a
--   one-sided partner is invisible to half of the pair.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- Only ever this file's own rows.
delete from public.workout_logs where metrics->>'seed' = 'recent';

-- ---------------------------------------------------------------------------
-- Who, when, what, and with whom
-- ---------------------------------------------------------------------------
create temporary table recent_plan on commit drop as
with
demo as (
  select
    p.id,
    coalesce(nullif(p.data->>'name', ''), 'Member') as name,
    nullif(p.data->>'residence', '') as residence,
    (p.data->'topGyms'->>0) as gym,
    abs(hashtext(p.id::text)) as h
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email like '%@demo.unisport.test'
    and p.onboarding_completed
),
/*
  The current month up to today. Not a fixed number of days back: the point of
  this file is that "this month" and "this week" have something in them, so it
  has to be anchored to the calendar the screens are reading.
*/
span as (
  select generate_series(date_trunc('month', current_date)::date, current_date, interval '1 day')::date as d
),
rolled as (
  select
    dm.id, dm.name, dm.residence, dm.gym, dm.h, s.d,
    -- 0 lifter · 1 cardio · 2 hybrid. A third of the campus does both, which
    -- is roughly true of a real gym and is what makes the hybrid task real.
    (dm.h % 3) as style,
    -- 0 keen · 1 regular · 2 steady · 3 occasional
    (dm.h % 4) as volume,
    abs(hashtext(dm.id::text || s.d::text)) as hd
  from demo dm
  cross join span s
)
select
  r.id,
  r.name,
  r.residence,
  r.gym,
  r.d,
  r.hd,
  case
    when r.style = 0 then 'gym'
    when r.style = 1 then (case when r.hd % 2 = 0 then 'running' else 'cardio' end)
    -- The hybrid: gym three days in five, something aerobic the rest.
    else (
      case when r.hd % 5 < 3 then 'gym'
           when r.hd % 2 = 0 then 'running'
           else 'cardio'
      end
    )
  end as activity,
  /*
    Who trained on a given day, by how often they train at all. The keen ones
    turn up most days, the occasional ones twice a week — so the boards have a
    spread rather than everybody sitting on the same number.
  */
  (r.hd % 10) < case r.volume when 0 then 8 when 1 then 6 when 2 then 4 else 3 end as trained,
  /*
    A third of sessions have somebody else in them. Half of those partners come
    from the person's own house (the ones you keep training with) and half from
    anywhere on campus (the ones you have never met — which is what makes
    "meet somebody new" possible at all).
  */
  case
    when r.hd % 3 <> 0 then null
    when r.hd % 2 = 0 then (
      select q.id from demo q
      where q.id <> r.id and q.residence is not distinct from r.residence
      order by md5(r.id::text || r.d::text || q.id::text)
      limit 1
    )
    else (
      select q.id from demo q
      where q.id <> r.id
      order by md5(r.id::text || r.d::text || q.id::text)
      limit 1
    )
  end as partner_id
from rolled r;

delete from recent_plan where not trained;

-- ---------------------------------------------------------------------------
-- The sessions themselves
--
-- Distances are varied so the weighted-kilometre rule has something to chew
-- on: mostly runs and swims, the odd row on the water in METRES and the odd
-- ride, which is the case the 1/3 weighting exists for (lib/events.ts).
-- ---------------------------------------------------------------------------
insert into public.workout_logs
  (user_id, log_date, activity, gym, partner, partner_id, exercises, metrics, photos, note, created_at)
select
  pl.id,
  pl.d,
  pl.activity,
  case when pl.activity = 'gym' then coalesce(pl.gym, 'Malkin Athletic Center') else null end,
  coalesce(bud.name, ''),
  pl.partner_id,
  case
    when pl.activity <> 'gym' then '[]'::jsonb
    else jsonb_build_array(
      jsonb_build_object(
        'name', case pl.hd % 4
                  when 0 then 'Back Squat'
                  when 1 then 'Bench Press'
                  when 2 then 'Deadlift'
                  else 'Overhead Press' end,
        'muscle', case pl.hd % 4
                    when 0 then 'Legs'
                    when 1 then 'Chest'
                    when 2 then 'Back'
                    else 'Shoulders' end,
        'sets', jsonb_build_array(
          jsonb_build_object('weight', (40 + (pl.hd % 12) * 5)::text, 'reps', '8', 'done', true),
          jsonb_build_object('weight', (45 + (pl.hd % 12) * 5)::text, 'reps', '6', 'done', true),
          jsonb_build_object('weight', (50 + (pl.hd % 12) * 5)::text, 'reps', '5', 'done', true)
        )
      ),
      jsonb_build_object(
        'name', case pl.hd % 3 when 0 then 'Pull-up' when 1 then 'Barbell Row' else 'Lat Pulldown' end,
        'muscle', 'Back',
        'sets', jsonb_build_array(
          jsonb_build_object('weight', '', 'reps', '10', 'done', true),
          jsonb_build_object('weight', '', 'reps', '8', 'done', true)
        )
      )
    )
  end,
  case
    when pl.activity = 'running' then jsonb_build_object(
      'seed', 'recent',
      'distance', round((4 + (pl.hd % 9))::numeric, 1)::text,
      'unit', 'km',
      'duration', (22 + (pl.hd % 30)) || ':00'
    )
    when pl.activity = 'cardio' then (
      case pl.hd % 5
        -- On the water, logged in metres — the unit the app really stores for
        -- rowing, and the one that has to be normalised before it is weighted.
        when 0 then jsonb_build_object(
          'seed', 'recent', 'cardioType', 'Rowing',
          'distance', ((4 + pl.hd % 4) * 1000)::text, 'unit', 'm',
          'duration', (18 + (pl.hd % 12)) || ':00'
        )
        -- The one that counts a third.
        when 1 then jsonb_build_object(
          'seed', 'recent', 'cardioType', 'Cycling',
          'distance', round((15 + (pl.hd % 25))::numeric, 1)::text, 'unit', 'km',
          'duration', (40 + (pl.hd % 40)) || ':00'
        )
        else jsonb_build_object(
          'seed', 'recent', 'cardioType', 'Swimming',
          'distance', round((1 + (pl.hd % 3) * 0.5)::numeric, 1)::text, 'unit', 'km',
          'duration', (30 + (pl.hd % 20)) || ':00'
        )
      end
    )
    else jsonb_build_object('seed', 'recent', 'weightUnit', 'kg')
  end,
  '[]'::jsonb,
  '',
  pl.d + time '18:00'
from recent_plan pl
left join public.profiles bud_p on bud_p.id = pl.partner_id
left join lateral (
  select coalesce(nullif(bud_p.data->>'name', ''), 'Member') as name
) bud on true;

-- ---------------------------------------------------------------------------
-- The other half of every partnered session
--
-- Same day, same activity, sides swapped — so it shows on both calendars and
-- both people get the partner credit, which is what the app itself does when a
-- planned session is confirmed.
--
-- `on conflict` is not available (there is no unique key on a log), so the
-- mirror is skipped where that pair already has a row for that day: without
-- that, two people who each picked the other would get two copies each.
-- ---------------------------------------------------------------------------
insert into public.workout_logs
  (user_id, log_date, activity, gym, partner, partner_id, exercises, metrics, photos, note, created_at)
select
  pl.partner_id,
  pl.d,
  pl.activity,
  case when pl.activity = 'gym' then coalesce(pl.gym, 'Malkin Athletic Center') else null end,
  pl.name,
  pl.id,
  '[]'::jsonb,
  jsonb_build_object('seed', 'recent', 'mirror', true)
    || case
         when pl.activity = 'running' then jsonb_build_object(
           'distance', round((4 + (pl.hd % 9))::numeric, 1)::text, 'unit', 'km',
           'duration', (22 + (pl.hd % 30)) || ':00'
         )
         when pl.activity = 'cardio' then jsonb_build_object(
           'cardioType', 'Swimming',
           'distance', round((1 + (pl.hd % 3) * 0.5)::numeric, 1)::text, 'unit', 'km',
           'duration', (30 + (pl.hd % 20)) || ':00'
         )
         else jsonb_build_object('weightUnit', 'kg')
       end,
  '[]'::jsonb,
  '',
  pl.d + time '18:00'
from recent_plan pl
where pl.partner_id is not null
  and not exists (
    select 1 from public.workout_logs w
    where w.user_id = pl.partner_id
      and w.log_date = pl.d
      and w.partner_id = pl.id
  );
