-- ============================================================================
-- UNIsport — VARSITY "SHOT DAY" OVERRIDE (landing-page screenshots only)
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
--   The landing animation pans down the Varsity Home screen: plan → lineup →
--   next race → coach's note. With the normal demo data, TODAY's lineup is three
--   eights' worth of seats (22 rows), so the pan spends most of its travel
--   scrolling names and barely reaches the race and the note.
--
--   This script rewrites TODAY — and only today — as a small-boat day:
--     AM · 1V Four · Newell   — a straight four (4−), John Brown in 3 seat
--     PM · Pair · Weld        — a coxless pair (2−), John Brown stroking
--   Six seat rows instead of twenty-two, so the pan reaches the race and the
--   coach's note while the reader is still looking.
--
--   Today's PM was a rest slot ("Off"), which would contradict a published PM
--   lineup, so it also becomes a short water session.
--
-- NAMES
--   Every name comes from the demo roster in lib/varsity/coachLineup.ts. John
--   Brown IS the screenshot account (martinhouska701@gmail.com), which is what
--   makes one seat light up as "You".
--
-- SAFE TO RE-RUN, AND REVERSIBLE
--   Re-running db/seed_varsity_demo.sql puts today's normal three boats back and
--   returns the PM slot to "Off". Run this one AFTER that one, on the day you
--   are shooting.
-- ============================================================================

do $$
declare
  base    text;    -- '<year>-<0-based month>-<day>', the key sessionKey() builds
  am_key  text;
  pm_key  text;
begin
  base := extract(year from current_date)::int || '-' ||
          (extract(month from current_date)::int - 1) || '-' ||
          extract(day from current_date)::int;
  am_key := base || '-AM';
  pm_key := base || '-PM';

  -- --- The AM session and its four -----------------------------------------
  -- Whatever weekday this runs on, the AM becomes a water session — a boat
  -- lineup published under an erg morning would contradict itself on screen.
  insert into public.varsity_plan_sessions (day_key, category, intensity, description, time, updated_at)
  values (am_key, 'water', 'UT2', '2×20'' at rate 20', '7:00 AM', now())
  on conflict (day_key) do update
    set category = excluded.category, intensity = excluded.intensity,
        description = excluded.description, time = excluded.time, updated_at = now();
  insert into public.demo_seed_keys (kind, key) values ('plan_session', am_key) on conflict do nothing;

  -- Seats are stored bow → stroke; Home reverses them so stroke sits at the top.
  update public.varsity_lineups
     set boats = '[
           {"id":"boat-4am","badge":"4-","name":"1V Four","dock":"Newell","note":"Two by twenty at rate 20. Full pressure off the second piece.","hasCox":false,"coxId":null,
            "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"jack-dorney"},{"label":"3","athleteId":"john-brown"},{"label":"S","athleteId":"alexander-grundy"}]}
         ]'::jsonb,
         status = 'published',
         updated_at = now()
   where day_key = am_key;

  if not found then
    insert into public.varsity_lineups (day_key, boats, status, updated_at)
    values (am_key, '[
           {"id":"boat-4am","badge":"4-","name":"1V Four","dock":"Newell","note":"Two by twenty at rate 20. Full pressure off the second piece.","hasCox":false,"coxId":null,
            "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"jack-dorney"},{"label":"3","athleteId":"john-brown"},{"label":"S","athleteId":"alexander-grundy"}]}
         ]'::jsonb, 'published', now());
    insert into public.demo_seed_keys (kind, key) values ('lineup', am_key) on conflict do nothing;
  end if;

  -- --- The PM pair, and the session it belongs to ---------------------------
  insert into public.varsity_plan_sessions (day_key, category, intensity, description, time, updated_at)
  values (pm_key, 'water', 'UT2', 'Pairs — 60'' technical', '4:30 PM', now())
  on conflict (day_key) do update
    set category = excluded.category, intensity = excluded.intensity,
        description = excluded.description, time = excluded.time, updated_at = now();
  insert into public.demo_seed_keys (kind, key) values ('plan_session', pm_key) on conflict do nothing;

  insert into public.varsity_lineups (day_key, boats, status, updated_at)
  values (pm_key, '[
           {"id":"boat-2pm","badge":"2-","name":"Pair","dock":"Weld","note":"Steering practice — stay off the wall through the turn.","hasCox":false,"coxId":null,
            "seats":[{"label":"1","athleteId":"luca-vicino"},{"label":"S","athleteId":"john-brown"}]}
         ]'::jsonb, 'published', now())
  on conflict (day_key) do update
    set boats = excluded.boats, status = excluded.status, updated_at = now();
  insert into public.demo_seed_keys (kind, key) values ('lineup', pm_key) on conflict do nothing;

  raise notice 'Shot day set: % (four) and % (pair).', am_key, pm_key;
end $$;
