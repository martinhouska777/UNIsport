-- SCREENSHOT PREP (owner, 2026-09-16): today's plan on Varsity Home reads
-- Water UT1 in the morning and Water UT2 "14k" in the afternoon (it was a
-- weights session). The morning was already Water UT1. Day keys use the month
-- INDEX (September = 8).
update public.varsity_plan_sessions
   set category = 'water', intensity = 'UT2', description = '14k', updated_at = now()
 where day_key = '2026-8-16-PM';

update public.varsity_plan_sessions
   set category = 'water', intensity = 'UT1', updated_at = now()
 where day_key = '2026-8-16-AM';
