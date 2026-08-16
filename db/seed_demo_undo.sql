-- ============================================================================
-- UNIsport — REMOVE the demo data added by db/seed_demo.sql
-- ----------------------------------------------------------------------------
-- Deletes the 14 invented students and everything written in their name, plus
-- the eight weeks of demo workout history on the owner's account. Real accounts
-- and real content are untouched: every demo row is identified by an id (or an
-- author id) starting `de11…`.
--
-- NOT undone (harmless, and possibly wanted): the owner's membership of the
-- five community channels — the same thing a tap on "Join" does.
--
-- IDEMPOTENT: safe to run twice.
-- ============================================================================

-- Demo workouts: the seeded eight weeks, plus anything the app auto-logged from
-- a demo session plan (those carry a demo person as the training partner).
delete from public.workout_logs     where id::text like 'de11f%'
                                       or partner_id::text like 'de11a%';
delete from public.channel_messages where sender_id::text like 'de11a%';
delete from public.channel_members  where user_id::text like 'de11a%';
delete from public.buddy_posts      where author::text like 'de11a%';
delete from public.dm_conversations where user_lo::text like 'de11a%' or user_hi::text like 'de11a%';
delete from public.follows          where follower_id::text like 'de11a%' or followee_id::text like 'de11a%';
delete from auth.users              where id::text like 'de11a%';  -- cascades to profiles

-- The seed's helper table.
drop table if exists public.demo_seed_people;
