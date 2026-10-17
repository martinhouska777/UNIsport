-- ============================================================================
-- UNIsport: erg photos and crew videos, for the team only
-- ----------------------------------------------------------------------------
-- Both buckets were already private (no public links, every view goes through
-- a short-lived signed URL), but the rule for who may sign one was "any
-- signed-in account". A student who has never been on a team could open a
-- rower's monitor photo or a crew's video if they had its path.
--
-- After this, the files follow the rows they belong to: whoever can read the
-- team's results (varsity_results) can open the photos behind them, and
-- whoever can read the crew videos list (varsity_videos) can play and add the
-- files. That is public.varsity_is_member(): an approved member of a team,
-- coaches included. The privacy page already says exactly this ("so it can be
-- opened from your team's results").
--
-- Writing stays as it was: an erg photo only inside your own folder, a crew
-- video file deleted only by whoever uploaded it.
--
-- The rower's own log photos (log-photos, db/varsity_log_photos.sql) already
-- follow the log and are not touched here.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- 1 ── Erg photos behind the team's results ─────────────────────────────────
drop policy if exists "Erg photos readable by signed-in users" on storage.objects;
drop policy if exists "Erg photos readable by the team" on storage.objects;
create policy "Erg photos readable by the team"
  on storage.objects for select
  using (bucket_id = 'erg-photos' and public.varsity_is_member());

-- 2 ── Crew videos ──────────────────────────────────────────────────────────
drop policy if exists "Crew videos readable by signed-in users" on storage.objects;
drop policy if exists "Crew video files readable by the team" on storage.objects;
create policy "Crew video files readable by the team"
  on storage.objects for select
  using (bucket_id = 'crew-videos' and public.varsity_is_member());

drop policy if exists "Crew videos insertable by signed-in users" on storage.objects;
drop policy if exists "Crew video files addable by the team" on storage.objects;
create policy "Crew video files addable by the team"
  on storage.objects for insert
  with check (bucket_id = 'crew-videos' and public.varsity_is_member());

-- 3 ── Check: seven rules, and both "readable" ones say varsity_is_member ───
select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
  and (qual like '%erg-photos%' or qual like '%crew-videos%'
       or with_check like '%erg-photos%' or with_check like '%crew-videos%')
order by policyname;
