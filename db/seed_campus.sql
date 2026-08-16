-- ============================================================================
-- UNIsport — Campus seed (people + training history, for the leaderboards)
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
--   db/seed_demo.sql creates 14 rich demo people (bios, chats, matches) but no
--   logged workouts, and only the owner's own account has training history. A
--   leaderboard needs a POPULATION: with 15 accounts and one of them training,
--   every board reads "you, then nobody".
--
--   This script adds 60 quiet residents — 4 in each of the 12 Houses and 3 in
--   each of 4 Yard dorms — and gives EVERY demo account (these 60 plus the 14
--   from seed_demo) eight weeks of plausible training history.
--
--   They are ordinary profiles, so they also show up in Match and in people
--   search. That is deliberate: a campus app with 15 students in it doesn't
--   look like a campus. db/seed_campus_undo.sql removes every one of them.
--
-- NOT LOGIN-ABLE: the auth rows are created with no password, exactly as
--   seed_demo.sql does, so none of these can ever be signed into.
--
-- RE-RUN ORDER: seed_demo.sql wipes workout logs whose partner is one of its 14
--   people, so if you ever re-run seed_demo.sql, run THIS script again after it.
--
-- IDEMPOTENT: safe to run repeatedly — it wipes its own previous run first.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The generated roster lives in an ordinary table (a TEMP table cannot
--    survive from one statement to the next in the SQL editor). RLS on, no
--    policies: server-side only, unreachable from the app.
-- ---------------------------------------------------------------------------
drop table if exists public.campus_seed_people;
create table public.campus_seed_people (
  seq        int primary key,
  id         uuid,
  email      text,
  name       text,
  class_year text,
  sex        text,
  residence  text,
  activity   text,
  level      text,
  split      text,
  gyms       jsonb,
  sched      jsonb,
  conc       text,
  country    text,
  langs      jsonb,
  ints       jsonb,
  ttype      text,
  bio        text,
  keenness   int   -- roughly how many days a week this person trains (1–6)
);
alter table public.campus_seed_people enable row level security;

insert into public.campus_seed_people
select
  i,
  ('de11b000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid,
  'campus' || lpad(i::text, 3, '0') || '@demo.unisport.test',
  -- The surname index carries an extra `(i-1)/30` term. Without it, a plain
  -- mod-30 map repeats every 30 people and numbers 1 and 31 get the same name.
  first_names[((i * 7) % 30) + 1] || ' ' || last_names[((i * 11 + (i - 1) / 30) % 30) + 1],
  class_year,
  case when i % 2 = 0 then 'Female' else 'Male' end,
  residence,
  activities[((i * 5) % 4) + 1],
  levels[((i * 3) % 3) + 1],
  splits[((i * 13) % 4) + 1],
  -- Their own house gym plus one main gym (freshmen: two main gyms).
  case when class_year = '''30'
       then to_jsonb(array[main_gyms[((i * 3) % 3) + 1], main_gyms[((i * 5) % 3) + 1]])
       else to_jsonb(array[residence, main_gyms[((i * 3) % 3) + 1]])
  end,
  scheds[((i * 17) % 4) + 1],
  concs[((i * 19) % 10) + 1],
  countries[((i * 23) % 8) + 1],
  to_jsonb(array['English']),
  to_jsonb(array[ints_pool[((i * 29) % 10) + 1], ints_pool[((i * 31) % 10) + 1]]),
  ttypes[((i * 37) % 3) + 1],
  '',
  -- Roughly what share of days out of ten this person trains (2–8). The squared
  -- term matters: any plain `i * k % n` splits 60 people into equal buckets, and
  -- a leaderboard where ten people share the exact same score looks generated.
  2 + ((i * i * 7 + i * 3) % 7)
from (
  select
    i,
    -- 1–48: four upperclassmen in each of the 12 Houses.
    -- 49–60: three freshmen in each of four Yard dorms.
    case when i <= 48
         then (array['Adams','Cabot','Currier','Dunster','Eliot','Kirkland',
                     'Leverett','Lowell','Mather','Pforzheimer','Quincy','Winthrop'])[((i - 1) % 12) + 1]
         -- Pennypacker is in here because the demo account lives there: a house
         -- with one resident can't be on a house-vs-house board.
         else (array['Canaday','Pennypacker','Thayer','Weld'])[((i - 49) % 4) + 1]
    end as residence,
    case when i <= 48
         then (array['''27','''28','''29'])[(((i - 1) / 12) % 3) + 1]
         else '''30'
    end as class_year,
    array['Anna','Ben','Clara','Daniel','Emma','Felix','Grace','Henry','Isabel','Jonas',
          'Klara','Lucas','Maya','Noah','Olivia','Peter','Quinn','Rosa','Sam','Tess',
          'Ulrich','Vera','Will','Xenia','Yannick','Zoe','Adam','Bella','Caleb','Dara'] as first_names,
    array['Aldrich','Barros','Chen','Delgado','Ericson','Fontaine','Grigoryan','Halvorsen','Iyer','Jansen',
          'Kowalski','Lindqvist','Moreau','Nakamura','Okafor','Petrov','Quintero','Rasmussen','Silva','Takahashi',
          'Ustinov','Volkov','Whitfield','Ximenes','Yamada','Zielinski','Ahmadi','Bergman','Costa','Dubois'] as last_names,
    array['gym','running','cardio','gym'] as activities,
    array['beginner','intermediate','advanced'] as levels,
    array['Push-Pull-Legs','Upper-Lower','Full Body','Bro Split'] as splits,
    array['Malkin Athletic Center','Hemenway Gymnasium','Murr Center'] as main_gyms,
    array[
      '{"mon":["PM"],"wed":["PM"],"fri":["PM"]}'::jsonb,
      '{"tue":["Early AM"],"thu":["Early AM"],"sat":["AM"]}'::jsonb,
      '{"mon":["AM"],"tue":["PM"],"thu":["PM"],"sun":["Midday"]}'::jsonb,
      '{"wed":["Late PM"],"fri":["PM"],"sat":["Midday"],"sun":["AM"]}'::jsonb
    ] as scheds,
    array['Economics','Computer Science','Mathematics','Government','History',
          'Psychology','Biology','Statistics','English','Physics'] as concs,
    array['United States','Germany','Brazil','Japan','Nigeria',
          'Sweden','India','Spain'] as countries,
    array['Coffee','Climbing','Travel','Music','Film',
          'Cooking','Reading','Football','Photography','Hiking'] as ints_pool,
    array['partner','solo','group'] as ttypes
  from generate_series(1, 60) as i
) g;

-- ---------------------------------------------------------------------------
-- 2. Wipe any previous run, then create the accounts.
-- ---------------------------------------------------------------------------
-- Every training log this script has ever written (for the 60 residents AND
-- for seed_demo's 14 people), so re-running can't double up.
delete from public.workout_logs
 where user_id::text like 'de11a%' or user_id::text like 'de11b%';
delete from auth.users where id::text like 'de11b%';  -- cascades to profiles

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
)
select
  '00000000-0000-0000-0000-000000000000', c.id, 'authenticated', 'authenticated',
  c.email, null,
  now(), now() - interval '120 days', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('name', c.name)
from public.campus_seed_people c;

insert into public.profiles (id, data, onboarding_completed, updated_at)
select
  c.id,
  jsonb_build_object(
    'name',              c.name,
    'classYear',         c.class_year,
    'sex',               c.sex,
    'residence',         c.residence,
    'primaryActivity',   c.activity,
    'activityOther',     '',
    'experienceLevel',   c.level,
    'gymSplit',          c.split,
    'runningDistance',   case when c.activity = 'running' then '5-10 km' else '' end,
    'runningPace',       '',
    'cardioType',        case when c.activity = 'cardio' then 'Swimming' else '' end,
    'topGyms',           c.gyms,
    'trainingSchedule',  c.sched,
    'concentration',     c.conc,
    'hometownCountry',   c.country,
    'languages',         c.langs,
    'interests',         c.ints,
    'trainingType',      c.ttype,
    'partnerPreference', 'any',
    'mentorFreshmen',    c.seq % 5 = 0,
    'beMentored',        c.class_year = '''30',
    'helpOthers',        c.seq % 3 = 0,
    'getHelp',           c.level = 'beginner',
    'bio',               c.bio,
    'photo',             null
  ),
  true,
  now() - interval '5 days'
from public.campus_seed_people c;

-- ---------------------------------------------------------------------------
-- 3. Eight weeks of training history for the 60 residents.
--
--    A person trains on day `d` when a fixed arithmetic pattern says so, on
--    roughly `keenness` days in ten — so the boards have a believable spread
--    from "twice a month" to "almost daily" and the same every time this runs.
--    The `(d * seq) % 11` term stops the pattern from being a clean cycle, which
--    is what keeps two people of equal keenness from finishing exactly level.
--    Roughly a third of sessions are logged with a housemate, rotating between
--    them, which is what gives the "most partners" board something to rank.
-- ---------------------------------------------------------------------------
insert into public.workout_logs
  (user_id, log_date, activity, gym, partner, partner_id, exercises, metrics, photos, note, created_at)
select
  c.id,
  (current_date - d.n),
  c.activity,
  (c.gyms->>0),
  case when (d.n * 5 + c.seq) % 3 = 0 then bud.name else '' end,
  case when (d.n * 5 + c.seq) % 3 = 0 then bud.id   else null end,
  case when c.activity in ('running', 'cardio') then '[]'::jsonb
       else '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"80","reps":"5","done":true},{"weight":"85","reps":"5","done":true},{"weight":"85","reps":"5","done":true}]},
              {"name":"Bench Press","muscle":"Chest","sets":[{"weight":"60","reps":"8","done":true},{"weight":"60","reps":"8","done":true}]}]'::jsonb
  end,
  case when c.activity = 'running'
       then '{"distance":"6.0","unit":"km","duration":"32:00"}'::jsonb
       when c.activity = 'cardio'
       then '{"cardioType":"Swimming","distance":"1.5","unit":"km","duration":"40:00"}'::jsonb
       else '{"weightUnit":"kg"}'::jsonb
  end,
  '[]'::jsonb,
  '',
  now() - (d.n || ' days')::interval
from public.campus_seed_people c
cross join generate_series(0, 55) as d(n)
left join lateral (
  select q.id, q.name
  from public.campus_seed_people q
  where q.residence = c.residence and q.seq <> c.seq
  order by ((q.seq * 3 + d.n) % 7), q.seq
  limit 1
) bud on true
where ((d.n * 13 + c.seq * 29 + (d.n * c.seq) % 11) % 10) < c.keenness;

-- ---------------------------------------------------------------------------
-- 4. The same history for seed_demo's 14 people, so they aren't the only
--    accounts on campus sitting on zero.
-- ---------------------------------------------------------------------------
insert into public.workout_logs
  (user_id, log_date, activity, gym, partner, partner_id, exercises, metrics, photos, note, created_at)
select
  p.id,
  (current_date - d.n),
  coalesce(nullif(p.data->>'primaryActivity', ''), 'gym'),
  coalesce(p.data->'topGyms'->>0, 'Malkin Athletic Center'),
  '',
  null,
  case when p.data->>'primaryActivity' in ('running', 'cardio') then '[]'::jsonb
       else '[{"name":"Deadlift","muscle":"Back","sets":[{"weight":"100","reps":"5","done":true},{"weight":"110","reps":"3","done":true}]},
              {"name":"Pull-Up","muscle":"Back","sets":[{"weight":"0","reps":"8","done":true},{"weight":"0","reps":"7","done":true}]}]'::jsonb
  end,
  case when p.data->>'primaryActivity' = 'running'
       then '{"distance":"7.0","unit":"km","duration":"37:00"}'::jsonb
       when p.data->>'primaryActivity' = 'cardio'
       then '{"cardioType":"Rowing","distance":"5.0","unit":"km","duration":"22:00"}'::jsonb
       else '{"weightUnit":"kg"}'::jsonb
  end,
  '[]'::jsonb,
  '',
  now() - (d.n || ' days')::interval
from public.profiles p
cross join generate_series(0, 55) as d(n)
-- The last two hex characters of the id (01…14) stand in for a per-person seed,
-- so each of the 14 gets their own training rhythm, two to five days a week.
where p.id::text like 'de11a%'
  and ((d.n * 13 + ('x' || right(replace(p.id::text, '-', ''), 2))::bit(8)::int * 29) % 7)
      < (2 + (('x' || right(replace(p.id::text, '-', ''), 2))::bit(8)::int % 4));
