-- ============================================================================
-- UNIsport — REMOVE the varsity demo data added by db/seed_varsity_demo.sql
-- ----------------------------------------------------------------------------
-- The plan, sessions and lineups are shared team-wide rows keyed by date, so
-- they can't be marked with a `de11…` id. The seed recorded every key it wrote
-- in public.demo_seed_keys, and this removes exactly those — anything built
-- afterwards by hand stays.
--
-- The squad membership is left in place (leaving it is what keeps Varsity Mode
-- reachable); remove it by hand if you want the mode to disappear again.
--
-- IDEMPOTENT: safe to run twice.
-- ============================================================================

delete from public.varsity_logs where id::text like 'de11e%';

delete from public.varsity_lineups l
 using public.demo_seed_keys k
 where k.kind = 'lineup' and k.key = l.day_key;

delete from public.varsity_plan_sessions s
 using public.demo_seed_keys k
 where k.kind = 'plan_session' and k.key = s.day_key;

delete from public.varsity_plan_blocks b
 using public.demo_seed_keys k
 where k.kind = 'block' and k.key = b.id;

delete from public.varsity_coach_notes n
 using public.demo_seed_keys k
 where k.kind = 'coach_note' and k.key = n.athlete_id::text;

drop table if exists public.demo_seed_keys;
