-- ============================================================================
-- UNIsport — partner count for somebody else's profile
-- ----------------------------------------------------------------------------
-- The owner's own Profile tab shows "Partners": how many DIFFERENT people they
-- have logged a session with. Somebody else's profile now shows the same
-- number beside Followers / Following. workout_logs is RLS'd to its owner, so
-- the count comes through a SECURITY DEFINER function; only the number leaves
-- the database, never who or when. Same rule as lib/supabase/workouts.ts
-- listPartners(): a partner counts when the log is theirs, a real person was
-- picked, and the other side either confirmed or was never asked.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================
create or replace function public.partner_count(target uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(distinct l.partner_id)::int
  from public.workout_logs l
  where auth.uid() is not null
    and l.user_id = target
    and l.partner_id is not null
    and (l.partner_status is null or l.partner_status = 'confirmed');
$$;

grant execute on function public.partner_count(uuid) to authenticated;
