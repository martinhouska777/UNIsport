-- UNIsport — varsity-first sign-up
-- ---------------------------------------------------------------------------
-- Until now one flag, profiles.onboarding_completed, decided whether an account
-- could use the app at all — and it meant "finished the nine-step STUDENT
-- onboarding". That forced a rower who arrived through a team invite to answer
-- questions about gym splits and training partners before seeing Monday's
-- session.
--
-- So the one flag becomes two independent facts about the same account:
--   onboarding_completed      — the student side is set up (Gyms, Match, Messages)
--   varsity_setup_completed   — the short athlete setup is done (name + class year)
--
-- Either one on its own is a usable app. Both can be true. The account, the
-- profile row and the login are shared — these are two capabilities, not two
-- accounts.
--
-- Run this in the Supabase SQL editor. IDEMPOTENT.

alter table public.profiles
  add column if not exists varsity_setup_completed boolean not null default false;

-- Existing accounts finished the student flow, which asks for name and class
-- year, so they already have everything the varsity side needs. Marking them
-- keeps them out of a setup screen they don't need.
update public.profiles
   set varsity_setup_completed = true
 where onboarding_completed = true
   and varsity_setup_completed = false;

comment on column public.profiles.varsity_setup_completed is
  'The short varsity athlete setup (name + class year) is done. Independent of onboarding_completed, which covers the student side.';
