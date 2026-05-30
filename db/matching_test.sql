-- ============================================================================
-- UNIsport — manual test queries for the matching functions.
-- Paste these into the Supabase SQL editor AFTER running db/matching.sql.
-- (The SQL editor runs with elevated rights, so it sees every profile.)
-- ============================================================================

-- --- 0. Sanity: who is onboarded and matchable? -----------------------------
-- The matching functions only consider rows where onboarding_completed = true.
-- Grab a real id from here to use as the "searcher" below.
select id, name, gender, partner_pref, training_type, level, country, region
from public.match_profiles
order by name;

-- TIP: you need at least 2 onboarded accounts whose gender prefs allow each
-- other and where the candidate's training type is NOT "Solo", or results come
-- back empty. The fastest way to get test data is to sign up a few accounts in
-- the app and complete onboarding for each.

-- --- 1. FUNCTION 1: browse matches (out of 100) -----------------------------
-- Replace the uuid with one from query 0.
select *
from public.match_browse('00000000-0000-0000-0000-000000000000');

-- Read it like this: `score` is the total. The *_pts columns are the parts:
--   AFFINITY  -> interests_pts (max 22) + concentration_pts (12)
--                + origin_pts (12) + languages_pts (8)              = 54
--   LOGISTICS -> gym_pts (20) + level_pts (12)
--                + schedule_pts (8) + training_pts (6)              = 46
-- They should add up to `score`. Higher = better match, already sorted.

-- --- 2. FUNCTION 2: session search (out of 92 — schedule is fixed) ----------
-- "Find me a partner at this gym, on this day + time block."
-- target_gym  = a gym NAME exactly as in lib/gyms.ts
-- target_day  = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
-- target_block= 'Early AM' | 'AM' | 'Midday' | 'PM' | 'Late PM'
select *
from public.match_session_search(
  '00000000-0000-0000-0000-000000000000',  -- searcher id
  'Hemenway Gymnasium',                     -- target gym name
  'wed',                                     -- day
  'PM'                                       -- time block
);

-- With the optional level / gender filters (pass null to skip one):
select *
from public.match_session_search(
  '00000000-0000-0000-0000-000000000000',
  'Hemenway Gymnasium',
  'wed',
  'PM',
  'intermediate',  -- level_filter  (or null)
  null             -- gender_filter ('male'/'female', or null)
);
