-- ---------------------------------------------------------------------------
-- THE MONITOR PHOTO STAYS WITH THE SESSION                        2026-10-02
-- ---------------------------------------------------------------------------
-- APPLIED 2026-10-02 (column, private bucket, 4 policies checked). Idempotent — safe to re-run.
--   node scripts/run-sql.mjs db/varsity_log_photos.sql
--
-- WHY. Until now a scanned erg photo was only kept when the session was a TEAM
-- workout, and then in `erg-photos` (db/varsity_results.sql), which every
-- signed-in user can read — right for a squad board, wrong for a private log.
-- Every other scan threw the picture away after reading it, so neither the
-- rower nor their coach could check a number against the screen it came off.
--
-- WHAT IT ADDS.
--   • varsity_logs.photo_path — where that session's photo is, or null.
--   • a PRIVATE bucket `log-photos`, path '<athlete_id>/<log_id>.jpg'.
--
-- WHO SEES A PHOTO: exactly who can read the session it belongs to. The read
-- policy asks varsity_logs, under the CALLER's own row-level security, whether
-- a log points at this photo — so today that is the rower and their approved
-- coach (db/varsity_coach_reads.sql), and if the teammate-calendar policy is
-- ever run (db/varsity_teammate_logs_2026-09-27.sql) the photo follows the log
-- to those teammates with no second rule to keep in step. A coach who leaves the
-- team loses the photos with the logs.
--
-- WHO WRITES: only the owner, only inside a folder named with their own user
-- id — the same rule as erg-photos. The owner can also always read their own
-- folder, which the upload needs (an upsert reads before it replaces) in the
-- moment before the log row has been pointed at the new file.
--
-- UNDO:
--   drop policy if exists "Log photos readable with their log" on storage.objects;
--   drop policy if exists "Own log photo insertable" on storage.objects;
--   drop policy if exists "Own log photo updatable" on storage.objects;
--   drop policy if exists "Own log photo deletable" on storage.objects;
--   alter table public.varsity_logs drop column if exists photo_path;
--   (and empty + delete the log-photos bucket in Storage)

alter table public.varsity_logs add column if not exists photo_path text;

-- The read policy below looks a photo up by its path, once per photo opened.
create index if not exists varsity_logs_photo_path
  on public.varsity_logs (photo_path)
  where photo_path is not null;

insert into storage.buckets (id, name, public)
values ('log-photos', 'log-photos', false)
on conflict (id) do nothing;

-- READ: your own folder, or any photo a log you can read points at.
drop policy if exists "Log photos readable with their log" on storage.objects;
create policy "Log photos readable with their log"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'log-photos'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1 from public.varsity_logs l
        where l.photo_path = objects.name
      )
    )
  );

-- WRITE: only inside your own folder.
drop policy if exists "Own log photo insertable" on storage.objects;
create policy "Own log photo insertable"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own log photo updatable" on storage.objects;
create policy "Own log photo updatable"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own log photo deletable" on storage.objects;
create policy "Own log photo deletable"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'log-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
