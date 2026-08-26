-- ============================================================================
-- UNIsport — REMOVE the feed filler written by db/seed_feed.sql
-- ----------------------------------------------------------------------------
-- Every account that script created has an id starting `feeda…`, and everything
-- else it wrote hangs off those accounts by foreign key: the profile, the
-- workout logs, the posts, and every 💪 on them. So deleting the accounts is
-- the whole teardown — there is no second list to keep in step with the seed.
--
-- Nothing belonging to a real account is touched. A real person's 💪 on a fake
-- post disappears with the post, which is correct: the post is gone.
--
-- Safe to run even if the seed was never run. IDEMPOTENT.
-- ============================================================================

delete from auth.users where id::text like 'feeda%';

drop table if exists public.feed_seed_posts;
drop table if exists public.feed_seed_people;
