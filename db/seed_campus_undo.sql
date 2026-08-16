-- ============================================================================
-- UNIsport — Undo the campus seed (db/seed_campus.sql)
-- ----------------------------------------------------------------------------
-- Removes the 60 generated residents entirely, and every training log this
-- seed wrote — including the history it gave seed_demo.sql's 14 people, whose
-- accounts and profiles are left untouched.
--
-- Nothing belonging to a REAL account is touched: every id it deletes starts
-- with the de11a / de11b demo prefixes.
--
-- IDEMPOTENT: safe to run more than once.
-- ============================================================================

delete from public.workout_logs
 where user_id::text like 'de11b%'
    or partner_id::text like 'de11b%';

-- The training history this seed gave seed_demo's 14 people (they had none of
-- their own — seed_demo.sql only ever seeded the owner's logs).
delete from public.workout_logs where user_id::text like 'de11a%';

delete from auth.users where id::text like 'de11b%';  -- cascades to profiles

drop table if exists public.campus_seed_people;
