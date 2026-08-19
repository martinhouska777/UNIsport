-- UNIsport — what a COACH may read about their own squad
-- ---------------------------------------------------------------------------
-- The owner's ask: "give coaches access to all the data from team as athletes
-- have — the erg and water and calendar of athletes."
--
-- Most of it was never locked. varsity_results (erg) and varsity_telemetry
-- (water) are already readable by any signed-in user, because they are a TEAM
-- board by design. The one genuinely private table is varsity_logs — an
-- athlete's own training diary — which is "own rows only" and therefore
-- invisible to everyone including their coach. That is what this file changes.
--
-- THREE THINGS IT DELIBERATELY DOES NOT DO:
--   1. It grants SELECT only. A coach can read a session, never write, edit or
--      delete one. The log stays the athlete's own record.
--   2. It is COACH only, not captain. A captain handles invites and the waiting
--      room (varsity_teams.sql); reading a teammate's whole training diary is a
--      different kind of power, and a captain is still a peer on the squad.
--   3. It never opens public.profiles. A coach gets a NARROW card (name, class
--      year, and the varsity block: side, height, weight, status, PRs) through
--      the function below — not the whole profile row, which also holds the
--      normal-mode onboarding answers that have nothing to do with rowing.
--
-- Run in the Supabase SQL editor, or: node scripts/run-sql.mjs db/varsity_coach_reads.sql
-- IDEMPOTENT — safe to re-run.

-- ---------------------------------------------------------------------------
-- Is p_athlete on a team where the CALLER is an approved coach?
--
-- SECURITY DEFINER for the same reason as the helpers in varsity_teams.sql: it
-- is read from inside a policy and must not re-trigger that policy.
--
-- The coalesce() is load-bearing, exactly as in varsity_can_admin: exists()
-- cannot return NULL, but keeping the shape identical means the next person to
-- edit this cannot reintroduce the NULL-is-not-false bug by accident.
-- ---------------------------------------------------------------------------
create or replace function public.varsity_is_my_athlete(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (
    select 1
    from public.varsity_members coach
    join public.varsity_members athlete on athlete.team_id = coach.team_id
    where coach.user_id   = auth.uid()
      and coach.role      = 'coach'
      and coach.status    = 'approved'
      and athlete.user_id = p_athlete
      and athlete.status  = 'approved'
  ), false);
$$;

grant execute on function public.varsity_is_my_athlete(uuid) to authenticated;

-- ── The calendar: a coach may READ their squad's logged sessions ────────────
-- Additive. "Own logs readable" still stands, so this is the only new access,
-- and there is no matching insert / update / delete policy on purpose.
drop policy if exists "Squad logs readable by their coach" on public.varsity_logs;
create policy "Squad logs readable by their coach"
  on public.varsity_logs for select
  using (public.varsity_is_my_athlete(athlete_id));

-- ---------------------------------------------------------------------------
-- The athlete card. Everything the coach's athlete screen shows ABOUT a person
-- rather than about their training, and nothing else out of profiles.
--
-- Passing your own id works too, so one code path serves both cases.
-- ---------------------------------------------------------------------------
create or replace function public.varsity_athlete_card(p_athlete uuid)
returns table (name text, class_year text, varsity jsonb)
language sql stable security definer set search_path = public as $$
  select
    coalesce(p.data ->> 'name', ''),
    coalesce(p.data ->> 'classYear', ''),
    coalesce(p.data -> 'varsity', '{}'::jsonb)
  from public.profiles p
  where p.id = p_athlete
    and (p_athlete = auth.uid() or public.varsity_is_my_athlete(p_athlete));
$$;

grant execute on function public.varsity_athlete_card(uuid) to authenticated;
