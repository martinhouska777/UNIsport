-- ============================================================================
-- UNDO db/seed_buddy_board_demo.sql — deletes every Buddy Board post the
-- invented students (the de11a… family) ever made. (They also expire on their
-- own the day after their date; db/seed_demo_undo.sql removes them too.)
-- ============================================================================

delete from public.buddy_posts where author::text like 'de11a%';
