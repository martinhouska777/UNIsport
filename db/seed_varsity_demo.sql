-- ============================================================================
-- UNIsport — VARSITY DEMO DATA for screenshots (squad, plan, lineups, logs)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   Fills Varsity Mode so it can be photographed: the demo account is put on a squad,
--   a PUBLISHED training block runs from five weeks ago to the Head of the
--   Charles, every day in that window has AM/PM sessions, the water practices
--   have published boat lineups, and the owner has five weeks of their own
--   training logged so the Statistics screen has a real graph.
--
-- WHAT IS ALREADY FAKE WITHOUT ANY DATABASE
--   The squad roster, each teammate's profile and training month, and the erg
--   rankings are DERIVED in lib/varsity/* (teamProfiles.ts, teamTraining.ts,
--   ergRankings.ts). They need nothing from here — the Team screens are already
--   full. This script only fills what genuinely lives in the database.
--
-- WHAT IT DELIBERATELY LEAVES EMPTY
--   Today's and tomorrow's sessions are NOT logged, so "log straight from your
--   training plan" can be shot live on the phone.
--
-- SAFE TO RE-RUN, AND REVERSIBLE
--   The plan, sessions and lineups are one shared team-wide set of rows keyed by
--   date, so they cannot carry a `de11…` marker like the student demo data does.
--   Instead this script records every key it writes in public.demo_seed_keys,
--   and db/seed_varsity_demo_undo.sql removes exactly those rows — anything the
--   owner builds themselves afterwards is left alone.
--
-- RUN db/seed_demo.sql FIRST (it is the one that checks the account exists).
-- ============================================================================

-- What this script wrote, so the undo can remove exactly that and nothing else.
create table if not exists public.demo_seed_keys (
  kind text not null,
  key  text not null,
  primary key (kind, key)
);
alter table public.demo_seed_keys enable row level security;  -- no policies: server-side only

-- ---------------------------------------------------------------------------
-- The training week the coach repeats through the block. Edit it here — the
-- whole nine-week window is generated from these seven days.
-- Descriptions are taken from the app's own quick-fill suggestions.
-- ---------------------------------------------------------------------------
drop table if exists public.demo_seed_week;
create table public.demo_seed_week (
  dow         int,      -- 0 = Sunday … 6 = Saturday
  period      text,     -- AM | PM
  category    text,     -- water | erg | weights | off | flex
  intensity   text,     -- UT2 | UT1 | hard (water + erg only)
  description text
);
alter table public.demo_seed_week enable row level security;  -- no policies: server-side only

insert into public.demo_seed_week values
  -- A REALISTIC WEEK (owner, 2026-09-15): "water 14k and erg 3×20, something
  -- like that, and weights 3× a week". Four water days (Tue / Wed / Fri / Sat
  -- mornings — the days the boat lineups below are published for), two ergs,
  -- three lifts, one flex afternoon, Sunday off.
  (1,'AM','erg',    'UT2',  '3×20'' UT2, r18–20'),
  (1,'PM','weights', null,  'Main strength — squat, pull, press'),
  (2,'AM','water',  'UT2',  '14k steady state'),
  (2,'PM','off',     null,  ''),
  (3,'AM','water',  'UT1',  '4×12'' UT1 at r24'),
  (3,'PM','weights', null,  'Power — cleans, jumps, core'),
  (4,'AM','erg',   'hard',  '8×500m, 1:30 rest'),
  (4,'PM','flex',    null,  '45 mins'),
  (5,'AM','water',  'UT2',  '14k steady state'),
  (5,'PM','weights', null,  'Main strength — squat, pull, press'),
  (6,'AM','water', 'hard',  '3×5'' at r30, 2k+2'),
  (6,'PM','off',     null,  ''),
  (0,'AM','off',     null,  ''),
  (0,'PM','off',     null,  '');

-- ---------------------------------------------------------------------------
-- Everything else runs in one block so it can share the owner's id + dates.
-- ---------------------------------------------------------------------------
do $$
declare
  owner_email constant text := 'martinhouska701@gmail.com';
  me          uuid;
  v_team      uuid;
  v_from      date;
  v_to        date;
  v_race      date;
  v_oct       date;
  v_tue       date;   -- the last Tuesday before today
  boats_a     jsonb;
  boats_b     jsonb;
  n           int;
begin
  -- --- 0. The owner --------------------------------------------------------
  select u.id into me from auth.users u where lower(u.email) = lower(owner_email);
  v_tue := current_date - (((extract(dow from current_date)::int - 2 + 6) % 7) + 1);
  if me is null then
    raise exception 'No account for % — sign up in the app first.', owner_email;
  end if;
  if not exists (select 1 from public.profiles where id = me) then
    raise exception 'No profile for % — finish onboarding (or run db/seed_demo.sql first).', owner_email;
  end if;

  -- The varsity side needs its own little setup flag flipped.
  update public.profiles set varsity_setup_completed = true where id = me;

  -- --- 1. The squad --------------------------------------------------------
  select id into v_team from public.varsity_teams where name = 'Harvard Rowing' limit 1;
  if v_team is null then
    insert into public.varsity_teams (name, email_domain, created_by)
    values ('Harvard Rowing', null, me)
    returning id into v_team;
    insert into public.demo_seed_keys (kind, key) values ('team', v_team::text)
      on conflict do nothing;
  end if;

  -- Approved member. An EXISTING role is kept (this never demotes a real coach);
  -- someone joining for the first time here becomes coach, so both the athlete
  -- screens and the Coach Console are reachable.
  insert into public.varsity_members (team_id, user_id, role, status)
  values (v_team, me, 'coach', 'approved')
  on conflict (team_id, user_id) do update set status = 'approved';

  -- --- 2. The block, ending at the Head of the Charles ----------------------
  -- Third Sunday of October; next year's if this year's has already been rowed.
  v_oct  := make_date(extract(year from current_date)::int, 10, 1);
  v_race := v_oct + ((7 - extract(dow from v_oct)::int) % 7) + 14;
  if v_race < current_date then
    v_oct  := make_date(extract(year from current_date)::int + 1, 10, 1);
    v_race := v_oct + ((7 - extract(dow from v_oct)::int) % 7) + 14;
  end if;

  -- The Monday on or before the 1st of LAST month, so the calendar has one
  -- whole month filled in (owner, 2026-09-16: "fill the whole training
  -- calendar — like August"), not just the last five weeks.
  v_from := date_trunc('week', date_trunc('month', current_date) - interval '1 month')::date;
  v_to   := least(v_race, (current_date + interval '28 days')::date);

  insert into public.varsity_plan_blocks (id, name, start_date, end_date, status, race_name, race_date, updated_at)
  values ('de11-blk-hocr', 'Road to the Charles', v_from, v_race, 'published',
          'Head of the Charles', v_race, now())
  on conflict (id) do update
    set name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date,
        status = excluded.status, race_name = excluded.race_name, race_date = excluded.race_date,
        updated_at = now();
  insert into public.demo_seed_keys (kind, key) values ('block', 'de11-blk-hocr') on conflict do nothing;

  -- --- 3. Nine weeks of sessions -------------------------------------------
  -- day_key is '<year>-<0-based month>-<day>-<AM|PM>' — the same string
  -- sessionKey() builds in lib/varsity/coachPlan.ts.
  with days as (
    select d::date as d from generate_series(v_from, v_to, interval '1 day') d
  ),
  slots as (
    select d,
           extract(dow from d)::int as dow,
           extract(year from d)::int || '-' || (extract(month from d)::int - 1) || '-' || extract(day from d)::int as base
    from days
  ),
  written as (
    insert into public.varsity_plan_sessions (day_key, category, intensity, description, time, updated_at)
    select s.base || '-' || w.period, w.category, w.intensity, w.description,
           case w.period when 'AM' then '7:00 AM' else '4:30 PM' end, now()
    from slots s
    join public.demo_seed_week w on w.dow = s.dow
    on conflict (day_key) do update
      set category = excluded.category, intensity = excluded.intensity,
          description = excluded.description, time = excluded.time, updated_at = now()
    -- xmax = 0 marks a row this statement really INSERTED, as opposed to one
    -- that already existed and was updated. Only the new ones are recorded, so
    -- the undo can never delete a session the coach built by hand.
    returning day_key, (xmax = 0) as was_new
  )
  insert into public.demo_seed_keys (kind, key)
  select 'plan_session', day_key from written where was_new
  on conflict do nothing;

  -- --- 4. Boat lineups for the water practices ------------------------------
  -- Seats reference the roster ids in lib/varsity/coachLineup.ts. Two variants
  -- so consecutive practices are not identical.
  boats_a := '[
    {"id":"boat-1v","badge":"8+","name":"Hosea","dock":"7:15am","oars":"Red set","note":"Two by twenty at rate 20. Full pressure off the second piece.","hasCox":true,"coxId":"cate-frerichs",
     "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"luca-vicino"},{"label":"3","athleteId":"marcus-chung"},{"label":"4","athleteId":"mason-cruz-abrams"},{"label":"5","athleteId":"jack-dorney"},{"label":"6","athleteId":"john-brown"},{"label":"7","athleteId":"alexander-grundy"},{"label":"S","athleteId":"george-farkas"}]},
    {"id":"boat-2v","badge":"8+","name":"Mississippi","dock":"7:15am","oars":"Blue set","note":"Stay behind the 1V through the Powerhouse.","hasCox":true,"coxId":"micah-john",
     "seats":[{"label":"1","athleteId":"sam-gallaudet"},{"label":"2","athleteId":"marco-gandola"},{"label":"3","athleteId":"apostolos-lykomitros"},{"label":"4","athleteId":"tyler-horler"},{"label":"5","athleteId":"teddy-plimpton"},{"label":"6","athleteId":"sam-davidson"},{"label":"7","athleteId":"jordan-dykema"},{"label":"S","athleteId":"jack-hansen-knarhoi"}]},
    {"id":"boat-3v","badge":"4+","name":"Kestrel","dock":"7:30am","oars":"White set","note":"Technical work, half pressure.","hasCox":true,"coxId":"iris-hennin",
     "seats":[{"label":"1","athleteId":"owen-finnerty"},{"label":"2","athleteId":"marco-vicino"},{"label":"3","athleteId":"pierce-lapham"},{"label":"S","athleteId":"julian-paul"}]}
  ]'::jsonb;

  boats_b := '[
    {"id":"boat-1v","badge":"8+","name":"Hosea","dock":"7:15am","oars":"Red set","note":"Head race practice — full course, no stopping.","hasCox":true,"coxId":"nick-yoo",
     "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"marcus-chung"},{"label":"3","athleteId":"luca-vicino"},{"label":"4","athleteId":"jack-dorney"},{"label":"5","athleteId":"john-brown"},{"label":"6","athleteId":"mason-cruz-abrams"},{"label":"7","athleteId":"george-farkas"},{"label":"S","athleteId":"alexander-grundy"}]},
    {"id":"boat-2v","badge":"8+","name":"Mississippi","dock":"7:15am","oars":"Blue set","note":"Rate cap 26 until the bridge.","hasCox":true,"coxId":"nat-toms",
     "seats":[{"label":"1","athleteId":"sam-gallaudet"},{"label":"2","athleteId":"apostolos-lykomitros"},{"label":"3","athleteId":"marco-gandola"},{"label":"4","athleteId":"teddy-plimpton"},{"label":"5","athleteId":"tyler-horler"},{"label":"6","athleteId":"jordan-dykema"},{"label":"7","athleteId":"sam-davidson"},{"label":"S","athleteId":"jack-hansen-knarhoi"}]},
    {"id":"boat-4","badge":"4-","name":"Kestrel","dock":"7:30am","oars":"White set","note":"Steering practice.","hasCox":false,"coxId":null,
     "seats":[{"label":"1","athleteId":"ben-scott"},{"label":"2","athleteId":"sam-woodgate"},{"label":"3","athleteId":"mike-thomas"},{"label":"S","athleteId":"joseph-baker"}]}
  ]'::jsonb;

  with days as (
    select d::date as d from generate_series(v_from, v_to, interval '1 day') d
  ),
  water as (
    select d,
           extract(year from d)::int || '-' || (extract(month from d)::int - 1) || '-' || extract(day from d)::int || '-AM' as day_key,
           extract(dow from d)::int as dow
    from days
    where extract(dow from d)::int in (2, 3, 5, 6)   -- Tue / Wed / Fri / Sat are on the water
  ),
  written as (
    insert into public.varsity_lineups (day_key, boats, status, updated_at)
    select w.day_key,
           case when w.dow in (2, 5) then boats_a else boats_b end,
           'published', now()
    from water w
    on conflict (day_key) do update
      set boats = excluded.boats, status = excluded.status, updated_at = now()
    returning day_key, (xmax = 0) as was_new
  )
  insert into public.demo_seed_keys (kind, key)
  select 'lineup', day_key from written where was_new
  on conflict do nothing;

  -- --- 5. The owner's own logs (five weeks, up to YESTERDAY) ----------------
  -- Today and tomorrow stay unlogged on purpose: that is the shot of logging a
  -- session straight from the plan.
  delete from public.varsity_logs where id::text like 'de11e%';

  with days as (
    select d::date as d from generate_series(v_from, current_date - 1, interval '1 day') d
  ),
  slots as (
    select d,
           extract(dow from d)::int as dow,
           extract(doy from d)::int as doy,
           extract(year from d)::int || '-' || (extract(month from d)::int - 1) || '-' || extract(day from d)::int as base
    from days
  ),
  sess as (
    select s.d, s.doy, w.period, w.category, w.intensity, w.description, s.base || '-' || w.period as day_key
    from slots s
    join public.demo_seed_week w on w.dow = s.dow
    where w.category <> 'off'
    -- Nothing missed (owner, 2026-09-16: the statistics went "up and down").
  )
  insert into public.varsity_logs (id, athlete_id, log_date, period, day_key, source, title, category, minutes, metres, split, note)
  select
    ('de11e000-0000-4000-8000-' || lpad(to_hex((row_number() over (order by d, period))::int), 12, '0'))::uuid,
    me, d, period, day_key, 'plan',
    -- The coach's own words, the way a real log carries them ("14k steady
    -- state"), not "Water · UT2".
    coalesce(nullif(description, ''), initcap(category)),
    category,
    -- MINUTES ARE EVEN DAY TO DAY (owner, 2026-09-16: "make the statistics
    -- more consistent"). Every training day lands between ~95 and ~125
    -- minutes: a morning on its own (Tue, Sat) is the long outing, a morning
    -- with a lift after it is the shorter one. Sunday is the only zero.
    case
      when category = 'water' and intensity = 'UT2' and extract(dow from d) = 2 then 95 + mod(doy, 3) * 2
      when category = 'water' and intensity = 'UT2'  then 70 + mod(doy, 3) * 2
      when category = 'water' and intensity = 'UT1'  then 68 + mod(doy, 3) * 2
      when category = 'water' and intensity = 'hard' then 96 + mod(doy, 3) * 2
      when category = 'erg'   and intensity = 'UT2'  then 70
      when category = 'erg'   and intensity = 'hard' then 55 + mod(doy, 3) * 2
      when category = 'erg'                          then 60
      when category = 'weights' then 46 + mod(doy, 2) * 2
      else 45
    end,
    case
      when category = 'water' and intensity = 'UT2'  then 14000 + mod(doy, 5) * 250   -- the 14k, give or take
      when category = 'water' and intensity = 'UT1'  then 12000 + mod(doy, 4) * 250
      when category = 'water' and intensity = 'hard' then 13000 + mod(doy, 4) * 250
      when category = 'erg'   and intensity = 'UT2'  then 15600 + mod(doy, 6) * 100   -- 3×20' at ~1:55
      when category = 'erg'   and intensity = 'UT1'  then 13600 + mod(doy, 5) * 200
      when category = 'erg'   and intensity = 'hard' then 7000 + mod(doy, 3) * 200    -- 8×500 plus the warm-up
      else null
    end,
    case
      when category = 'erg'   and intensity = 'UT2'  then '1:5' || (4 + mod(doy, 4))
      when category = 'erg'   and intensity = 'hard' then '1:3' || (6 + mod(doy, 4))
      when category = 'water' and intensity = 'UT2'  then '2:2' || (2 + mod(doy, 5))
      when category = 'water' and intensity = 'UT1'  then '2:0' || (6 + mod(doy, 4))
      when category = 'water' and intensity = 'hard' then '1:5' || (0 + mod(doy, 4))
      else null
    end,
    ''
  from sess
  -- A slot the athlete has already logged for real is left exactly as it is.
  on conflict (athlete_id, day_key) do nothing;

  -- A few sessions nobody prescribed — the "extra" training the plan never asks
  -- for, which is half the point of the log.
  -- Always on a TUESDAY afternoon — the one training day with nothing after
  -- the outing — so an extra evens the week out instead of spiking it.
  insert into public.varsity_logs (id, athlete_id, log_date, period, day_key, source, title, category, minutes, metres, split, note)
  values
    ('de11e000-0000-4000-8000-00000000f001', me, v_tue - 7,  'PM', null, 'extra', 'Easy shakeout run', 'run',  28, 5500,  null, 'Legs felt heavy after the 8×500.'),
    ('de11e000-0000-4000-8000-00000000f002', me, v_tue - 14, 'PM', null, 'extra', 'Bike — recovery spin', 'bike', 30, 14000, null, ''),
    ('de11e000-0000-4000-8000-00000000f003', me, v_tue - 28, 'PM', null, 'extra', 'Core + mobility', 'flex',  25, null,  null, ''),
    ('de11e000-0000-4000-8000-00000000f004', me, v_tue - 35, 'PM', null, 'extra', 'Easy run', 'run', 30, 6000, null, '');

  -- --- 5b. The owner on the roster, and one day out --------------------------
  -- rosterId is which seat in the lineups is "You". It had been claimed as
  -- somebody else's (cameron-beyki), so no boat ever lit up for John Brown.
  -- The days out: ONE injured Sunday (a rest day, so nothing logged clashes
  -- with it) instead of three "Sick" days that sat on top of training
  -- (owner, 2026-09-16).
  update public.profiles
  set data = jsonb_set(
        jsonb_set(data, '{varsity,rosterId}', '"john-brown"', true),
        '{varsity,daysOut}',
        jsonb_build_object(
          to_char(current_date - case when extract(dow from current_date)::int = 0 then 7 else extract(dow from current_date)::int end, 'YYYY-MM-DD'),
          jsonb_build_object('reason', 'injured', 'note', 'Tweaked my lower back on the erg — resting it.')
        ),
        true)
  where id = me and data ? 'varsity';

  -- --- 6. One note from the coach ------------------------------------------
  -- Only written if the owner has none, and remembered so the undo can tell
  -- ours from a real one.
  if not exists (select 1 from public.varsity_coach_notes where athlete_id = me) then
    insert into public.varsity_coach_notes (athlete_id, note, updated_at)
    values (me, 'Sitting up well this week. Keep the hands moving away at the same speed when the rate comes up — it slips at 32.', now());
    insert into public.demo_seed_keys (kind, key) values ('coach_note', me::text) on conflict do nothing;
  end if;

  select count(*) into n from public.varsity_logs where athlete_id = me;
  raise notice 'Varsity demo loaded for %. Race: Head of the Charles on %. Logs on file: %.', owner_email, v_race, n;
end $$;

-- The helper table is LEFT IN PLACE (row-level security on, no policies).
-- db/seed_varsity_demo_undo.sql drops it.
