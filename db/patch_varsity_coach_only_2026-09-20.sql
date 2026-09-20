-- ---------------------------------------------------------------------------
-- THE COACH'S WORK IS THE COACH'S TO WRITE                        2026-09-20
-- ---------------------------------------------------------------------------
-- Run this in the Supabase SQL editor. READ THE PRE-FLIGHT BELOW FIRST.
--
-- WHY. The training plan, the lineups, the coach's notes and availability all
-- had one rule: "is this person signed in?" Nothing about which squad they are
-- on, nothing about whether they are the coach. The app only shows the builders
-- to a coach, but the rule is enforced at the DATABASE, and the database is
-- reachable directly. A squad member with a little knowledge could rewrite
-- tomorrow's session, change the lineups, or write a note that appears to come
-- from the coach — and read the notes the coach wrote about everyone else.
--
-- WHAT THIS DOES.
--   READ   — approved members of a squad. (Was: anyone with an account, which
--            includes every ordinary student who has never touched Varsity.)
--   WRITE  — coaches only. Captains deliberately NOT included: a captain
--            invites and approves people, and has never been allowed to build
--            plans (db/varsity_teams.sql).
--   Coach notes are narrower still: an athlete reads their OWN note, and only
--   a coach reads anyone else's.
--   varsity_results and varsity_videos keep their existing owner-only writes;
--   only their READS are narrowed from "any account" to "the squad".
--
-- WHAT IT DOES NOT DO — READ THIS. It does not separate the squads, because
-- the DATA is not separated: varsity_plan_blocks, varsity_plan_sessions,
-- varsity_lineups, varsity_coach_notes and varsity_availability have no
-- team_id at all. There is ONE shared plan, and every squad reads it. On
-- 2026-09-20 the database held EIGHT teams (Harvard, Yale, Columbia, Brown,
-- Dartmouth, Penn, Cornell, Princeton — the invented squads behind the Feed),
-- 17 approved athletes between them, and two approved coaches, both Harvard.
--
-- So the honest boundary this script can draw today is "on a squad" and "is a
-- coach", not "on THIS squad". That is no worse than what is there now — a
-- Yale athlete already reads the Harvard plan, because there is only one — and
-- it is a great deal better than "has an account at all". Real separation
-- means putting team_id on those five tables, backfilling it, teaching the app
-- to send it, and then these policies gain `and team_id = ...`. That is the
-- next slice, and it is a migration rather than a rewrite BECAUSE of this one.
--
-- IT DOES NOT TOUCH the two storage buckets (erg-photos, crew-videos), whose
-- own read rules are still "any signed-in account". Closing the tables means
-- a non-member can no longer find out what is in them, which is most of it.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- PRE-FLIGHT — run this on its own FIRST and look at what comes back.
-- ===========================================================================
-- Every account that will still be able to write after this runs must appear
-- here with role 'coach' and status 'approved'. If the person who builds the
-- plans is NOT in this list, fix their membership BEFORE running the rest,
-- or the console will go read-only for them.
--
--   select m.user_id, m.role, m.status, t.name as team,
--          (p.data ->> 'name') as person
--   from public.varsity_members m
--   join public.varsity_teams t on t.id = m.team_id
--   left join public.profiles p on p.id = m.user_id
--   order by m.role, m.status;
--
-- ===========================================================================


-- ── Who is who. No team argument — see the header: the tables these guard
--    have no team_id to compare one against. SECURITY DEFINER so a policy can
--    read varsity_members without needing a policy on varsity_members. ──────
create or replace function public.varsity_is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.varsity_members m
    where m.user_id = auth.uid() and m.status = 'approved'
  );
$$;

-- Coach only. NOT captain — see the header.
create or replace function public.varsity_is_coach()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.varsity_members m
    where m.user_id = auth.uid() and m.status = 'approved' and m.role = 'coach'
  );
$$;

revoke execute on function public.varsity_is_member() from public, anon;
revoke execute on function public.varsity_is_coach()  from public, anon;
grant  execute on function public.varsity_is_member() to authenticated, service_role;
grant  execute on function public.varsity_is_coach()  to authenticated, service_role;


-- ── Clear the old rules off these tables COMPLETELY ────────────────────────
-- Policies are permissive and OR together, so one forgotten "signed-in users"
-- policy left behind would undo the whole script. Drop by discovery, not by
-- name, so nothing added since can survive.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'varsity_plan_blocks', 'varsity_plan_sessions', 'varsity_lineups',
        'varsity_coach_notes', 'varsity_availability',
        'varsity_results', 'varsity_videos'
      )
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;


-- ── THE PLAN ───────────────────────────────────────────────────────────────
create policy "Plan blocks readable by the squad"
  on public.varsity_plan_blocks for select using (public.varsity_is_member());
create policy "Plan blocks written by the coach"
  on public.varsity_plan_blocks for insert with check (public.varsity_is_coach());
create policy "Plan blocks updated by the coach"
  on public.varsity_plan_blocks for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Plan blocks deleted by the coach"
  on public.varsity_plan_blocks for delete using (public.varsity_is_coach());

create policy "Plan sessions readable by the squad"
  on public.varsity_plan_sessions for select using (public.varsity_is_member());
create policy "Plan sessions written by the coach"
  on public.varsity_plan_sessions for insert with check (public.varsity_is_coach());
create policy "Plan sessions updated by the coach"
  on public.varsity_plan_sessions for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Plan sessions deleted by the coach"
  on public.varsity_plan_sessions for delete using (public.varsity_is_coach());


-- ── THE LINEUPS ────────────────────────────────────────────────────────────
create policy "Lineups readable by the squad"
  on public.varsity_lineups for select using (public.varsity_is_member());
create policy "Lineups written by the coach"
  on public.varsity_lineups for insert with check (public.varsity_is_coach());
create policy "Lineups updated by the coach"
  on public.varsity_lineups for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Lineups deleted by the coach"
  on public.varsity_lineups for delete using (public.varsity_is_coach());


-- ── THE COACH'S NOTES — your own, or the coach's ───────────────────────────
create policy "Your own note, or the coach's view of everyone"
  on public.varsity_coach_notes for select
  using (athlete_id = auth.uid() or public.varsity_is_coach());
create policy "Notes written by the coach"
  on public.varsity_coach_notes for insert with check (public.varsity_is_coach());
create policy "Notes updated by the coach"
  on public.varsity_coach_notes for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Notes deleted by the coach"
  on public.varsity_coach_notes for delete using (public.varsity_is_coach());


-- ── AVAILABILITY (the coach marks people out from the Lineup pool) ─────────
create policy "Availability readable by the squad"
  on public.varsity_availability for select using (public.varsity_is_member());
create policy "Availability written by the coach"
  on public.varsity_availability for insert with check (public.varsity_is_coach());
create policy "Availability updated by the coach"
  on public.varsity_availability for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Availability deleted by the coach"
  on public.varsity_availability for delete using (public.varsity_is_coach());


-- ── RESULTS — unchanged except the read. Your own row is yours to write. ───
create policy "Results readable by the squad"
  on public.varsity_results for select using (public.varsity_is_member());
create policy "Own result insertable"
  on public.varsity_results for insert with check (auth.uid() = athlete_id);
create policy "Own result updatable"
  on public.varsity_results for update
  using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);
create policy "Own result deletable"
  on public.varsity_results for delete using (auth.uid() = athlete_id);


-- ── CREW VIDEOS — same: the read narrows, the writes stay with whoever
--    added the video. Any member may ADD one (they always could). ───────────
create policy "Crew videos readable by the squad"
  on public.varsity_videos for select using (public.varsity_is_member());
create policy "Crew videos addable by the squad"
  on public.varsity_videos for insert with check (public.varsity_is_member());
create policy "Own crew video updatable"
  on public.varsity_videos for update using (auth.uid() = added_by);
create policy "Own crew video deletable"
  on public.varsity_videos for delete using (auth.uid() = added_by);


-- ===========================================================================
-- CHECK AFTERWARDS — in the app, not in SQL, because that is what matters.
--   As the COACH: Plan, Lineups, Team and Settings all open, and an edit
--     still saves (the save state says "Saved").
--   As an ATHLETE: Home shows the published plan, the boats and your own
--     technical note — and nothing has gone blank.
--   As an ORDINARY STUDENT (no squad): everything works exactly as before;
--     none of these tables were ever on their screens.
--
-- If a screen goes empty, the cause is almost always a membership row that
-- is not status='approved' — re-run the pre-flight query at the top.
--
-- TO UNDO, if something is wrong and people are waiting: re-run the four
-- original files, which recreate the old permissive policies —
--   db/varsity_plan.sql, db/varsity_lineups.sql,
--   db/varsity_coach_notes.sql, db/varsity_availability.sql
-- (they are `create policy`, so drop the new ones first with the same DO
-- block above). Then say so, and we look again.
-- ===========================================================================
