-- UNIsport — a teammate's REAL calendar, when they share it
-- 2026-09-27, launch audit item 27. NOT APPLIED — waiting for the owner's yes.
-- ---------------------------------------------------------------------------
-- The teammate card has a Calendar button (owner, 2026-09-21), and every
-- athlete has a "Teammates see my calendar" switch that starts ON. Until now
-- that calendar showed invented sessions. With this, it shows the rower's real
-- logged sessions, read-only, and only while they leave the switch on.
--
-- WHY IT WAITS: it widens who can read real training data in the database —
-- every approved squad member could read every teammate's logs (sessions,
-- distances, times, efforts and notes) unless that teammate switched sharing
-- off. Nobody has opted in; the switch simply starts on. Run it only if that
-- is what the owner wants. Needs db/varsity_team_cards_2026-09-27.sql first
-- (varsity_shares_calendar).
--
-- UNDO:
--   drop policy if exists "Teammate logs readable when shared" on public.varsity_logs;

drop policy if exists "Teammate logs readable when shared" on public.varsity_logs;
create policy "Teammate logs readable when shared"
  on public.varsity_logs for select
  to authenticated
  using (public.varsity_shares_calendar(athlete_id));
