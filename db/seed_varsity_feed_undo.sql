-- ============================================================================
-- UNIsport — REMOVE the varsity feed filler written by db/seed_varsity_feed.sql
-- ----------------------------------------------------------------------------
-- Every invented athlete has an id starting `feedb…` and every invented squad
-- `feedc…`. Deleting the accounts takes their profiles, sessions, posts, 💪 and
-- squad memberships with them — including the three teammates that were put on
-- the owner's own squad, who come off it here and leave it exactly as it was.
-- Deleting the squads takes the seven invented ones away.
--
-- Nothing belonging to a real account, and no real squad, is touched.
--
-- Safe to run even if the seed was never run. IDEMPOTENT.
-- ============================================================================

delete from auth.users           where id::text like 'feedb%';
delete from public.varsity_teams where id::text like 'feedc%';

drop table if exists public.vfeed_seed_mates;
drop table if exists public.vfeed_seed_posts;
drop table if exists public.vfeed_seed_people;
drop table if exists public.vfeed_seed_teams;
