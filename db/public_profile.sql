-- ============================================================================
-- UNIsport — public profile read (Slice: view another person's profile)
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
--   profiles has Row-Level Security: a signed-in user can only SELECT their OWN
--   row (see db/matching.sql). But the "View Profile" button on a match card
--   needs to show SOMEONE ELSE'S profile. So, exactly like the matching
--   functions, this is a SECURITY DEFINER function: it runs with the definer's
--   rights (bypassing RLS) but only ever returns a curated, PUBLIC-SAFE subset
--   of the onboarding json — never the whole blob, never preference fields.
--
--   It returns a jsonb shaped as a SUBSET of the onboarding profile, so the
--   frontend can feed it straight into profileFromOnboarding() (lib/currentUser
--   .ts) — the same mapping the owner's own Profile tab already uses.
--
--   Returns NULL when the id is unknown or that user hasn't finished onboarding.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================
create or replace function public.get_public_profile(profile_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'name',             p.data->>'name',
    'classYear',        p.data->>'classYear',
    'residence',        p.data->>'residence',
    'bio',              p.data->>'bio',
    'photo',            p.data->>'photo',
    'primaryActivity',  p.data->>'primaryActivity',
    'experienceLevel',  p.data->>'experienceLevel',
    'gymSplit',         p.data->>'gymSplit',
    'topGyms',          coalesce(p.data->'topGyms', '[]'::jsonb),
    'trainingSchedule', coalesce(p.data->'trainingSchedule', '{}'::jsonb),
    'concentration',    p.data->>'concentration',
    'hometownCountry',  p.data->>'hometownCountry',
    'languages',        coalesce(p.data->'languages', '[]'::jsonb),
    'interests',        coalesce(p.data->'interests', '[]'::jsonb),
    'mentorFreshmen',   coalesce((p.data->>'mentorFreshmen')::boolean, false),
    'helpOthers',       coalesce((p.data->>'helpOthers')::boolean, false),
    -- Photos & personal records are only exposed when the owner has them set to
    -- "Shown to others" (defaults to shown when the flag is absent). This is the
    -- privacy gate: hidden sections never leave the database.
    'photos',           case when coalesce((p.data->>'showPhotos')::boolean, true)
                             then coalesce(p.data->'photos', '[]'::jsonb)
                             else '[]'::jsonb end,
    'personalRecords',  case when coalesce((p.data->>'showPersonalRecords')::boolean, true)
                             then coalesce(p.data->'personalRecords', '[]'::jsonb)
                             else '[]'::jsonb end
  )
  from public.profiles p
  where p.id = profile_id
    and p.onboarding_completed = true;
$$;

-- Let signed-in users call it via Supabase RPC.
grant execute on function public.get_public_profile(uuid) to authenticated;
