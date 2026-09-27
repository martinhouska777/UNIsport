-- UNIsport — what a TEAMMATE may see about another rower on the squad
-- 2026-09-27, launch audit item 27 ("invented numbers shown as real").
-- ---------------------------------------------------------------------------
-- Profile → Team → a rower used to show a DERIVED card — invented height,
-- weight, class and erg bests under the squad's real names — because nobody
-- but the athlete (and their coach, db/varsity_coach_reads.sql) can read a
-- profile row. The app now shows the real card for a rower with a linked
-- account and "No profile yet" for the rest. This file is what lets a
-- teammate read the real one.
--
-- WHAT IT DOES
--   1. varsity_team_cards(p_team) — for a caller who is an APPROVED member of
--      p_team, one row per approved member of that team: account id, name,
--      class year, the roster seat they claimed (data.varsity.rosterId), and
--      the teammate card: team year, rower/cox, side, height, weight, status,
--      erg bests and whether they share their calendar. NOTHING ELSE from
--      profiles — no check-ins, no days out, no onboarding answers, no email.
--      The same fields the invented card always showed, now the real ones.
--   2. varsity_shares_calendar(p_athlete) — true when the caller and
--      p_athlete are approved on the same team and p_athlete has not switched
--      "Teammates see my calendar" off (data.varsity.showCalendar; absent
--      counts as on, as the app has always said).
--   3. (moved to db/varsity_teammate_logs_2026-09-27.sql, NOT applied — it
--      needs the owner's yes) a SELECT-only policy on varsity_logs using (2),
--      so the Calendar button on a teammate's card opens their REAL month.
--
-- APPLIED 2026-09-27 (parts 1 and 2). Without part 3 a teammate's calendar
-- reads empty — nothing invented, nothing of theirs shown.
--
-- UNDO
--   drop policy if exists "Teammate logs readable when shared" on public.varsity_logs;
--   drop function if exists public.varsity_shares_calendar(uuid);
--   drop function if exists public.varsity_team_cards(uuid);
--
-- IDEMPOTENT — safe to re-run. Run in the Supabase SQL editor, or:
--   node scripts/run-sql.mjs db/varsity_team_cards_2026-09-27.sql
-- ---------------------------------------------------------------------------

create or replace function public.varsity_team_cards(p_team uuid)
returns table (user_id uuid, name text, class_year text, roster_id text, card jsonb)
language sql stable security definer set search_path = public as $$
  select
    m.user_id,
    coalesce(p.data ->> 'name', ''),
    coalesce(p.data ->> 'classYear', ''),
    nullif(p.data -> 'varsity' ->> 'rosterId', ''),
    jsonb_strip_nulls(jsonb_build_object(
      'teamYear',     p.data -> 'varsity' -> 'teamYear',
      'boatRole',     p.data -> 'varsity' -> 'boatRole',
      'side',         p.data -> 'varsity' -> 'side',
      'heightCm',     p.data -> 'varsity' -> 'heightCm',
      'weightKg',     p.data -> 'varsity' -> 'weightKg',
      'status',       p.data -> 'varsity' -> 'status',
      'prs',          p.data -> 'varsity' -> 'prs',
      'showCalendar', p.data -> 'varsity' -> 'showCalendar'
    ))
  from public.varsity_members m
  join public.profiles p on p.id = m.user_id
  where m.team_id = p_team
    and m.status = 'approved'
    and exists (
      select 1 from public.varsity_members me
      where me.team_id = p_team
        and me.user_id = auth.uid()
        and me.status  = 'approved'
    );
$$;

-- SECURITY DEFINER because it is read from inside a policy on varsity_logs and
-- must read profiles / varsity_members without re-entering their own policies.
-- coalesce(exists …, false) keeps the NULL-is-not-false shape of the helpers
-- in varsity_coach_reads.sql.
create or replace function public.varsity_shares_calendar(p_athlete uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(exists (
    select 1
    from public.varsity_members me
    join public.varsity_members them on them.team_id = me.team_id
    join public.profiles p            on p.id = them.user_id
    where me.user_id   = auth.uid()
      and me.status    = 'approved'
      and them.user_id = p_athlete
      and them.status  = 'approved'
      and coalesce(p.data -> 'varsity' ->> 'showCalendar', 'true') <> 'false'
  ), false);
$$;

revoke execute on function public.varsity_team_cards(uuid)     from public, anon;
revoke execute on function public.varsity_shares_calendar(uuid) from public, anon;
grant  execute on function public.varsity_team_cards(uuid)     to authenticated;
grant  execute on function public.varsity_shares_calendar(uuid) to authenticated;

-- The third part — teammates reading each other's LOGS when the calendar is
-- shared — is in db/varsity_teammate_logs_2026-09-27.sql, held back for the
-- owner's yes: it widens who can read real training data.
