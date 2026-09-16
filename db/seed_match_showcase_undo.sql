-- ============================================================================
-- UNIsport — UNDO db/seed_match_showcase.sql
--   Puts the three hidden accounts back on the Match tab with the answer they
--   had before, and removes the eight showcase students.
-- ============================================================================

update public.profiles p
set data = (p.data - 'trainingTypeBeforeShowcase' - 'trainingType')
  || case when jsonb_typeof(p.data->'trainingTypeBeforeShowcase') = 'string'
          then jsonb_build_object('trainingType', p.data->'trainingTypeBeforeShowcase')
          else '{}'::jsonb end
where p.data ? 'trainingTypeBeforeShowcase';

delete from public.follows
where follower_id in (select ('de11a0' || n || '-0000-4000-8000-0000000000' || n)::uuid from generate_series(16, 23) n)
   or followee_id in (select ('de11a0' || n || '-0000-4000-8000-0000000000' || n)::uuid from generate_series(16, 23) n);

delete from auth.users
where id in (select ('de11a0' || n || '-0000-4000-8000-0000000000' || n)::uuid from generate_series(16, 23) n);
