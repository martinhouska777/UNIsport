-- ============================================================================
-- UNIsport — workout count for somebody else's profile
-- ----------------------------------------------------------------------------
-- Owner, 2026-10-03: on another person's profile "we want to see the number of
-- logged workouts, then following … and then partners". Your own Profile tab
-- already shows "Workouts": every session you have logged (countWorkouts in
-- lib/supabase/workouts.ts). Somebody else's profile now shows the same number
-- for them. workout_logs is RLS'd to its owner, so the count comes through a
-- SECURITY DEFINER function — the same shape as partner_count
-- (db/partner_count.sql): only the number leaves the database, never what,
-- when or with whom.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================
create or replace function public.workout_count(target uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int
  from public.workout_logs l
  where auth.uid() is not null
    and l.user_id = target;
$$;

grant execute on function public.workout_count(uuid) to authenticated;

notify pgrst, 'reload schema';
