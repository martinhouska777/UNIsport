-- UNIsport — Varsity crew videos (a video belongs to a BOAT, not to a folder)
-- ---------------------------------------------------------------------------
-- The problem this replaces: one shared cloud drive where everybody dumps
-- footage, nobody names anything, and no rower can tell which clip they are in.
--
-- The fix is that a video is never filed on its own. It is attached to ONE boat
-- in ONE practice — and the lineup already knows the date, the session, the
-- rigging, the boat and who sat in every seat. So the title writes itself and
-- the app can always answer "which of these am I in, and where".
--
-- The CREW IS COPIED IN, not looked up later (`crew` below). A lineup gets
-- edited for weeks after an outing; the video has to keep saying who was
-- actually in the boat when the camera was rolling.
--
-- Storage today is the private `crew-videos` bucket (`storage_path`). Step 2 of
-- this feature uploads to the squad's own drive instead, which is why
-- `external_url` already exists beside it: the row does not change shape when
-- the destination does, and old rows keep playing.
--
-- Visibility is THE WHOLE TEAM (the owner's call) — every signed-in user reads
-- every video. What keeps it from turning back into the drive is not secrecy,
-- it is that each row carries its boat, its date and its seats.
--
-- Run in the Supabase SQL editor (matches db/varsity_lineups.sql conventions).

create table if not exists public.varsity_videos (
  id            uuid primary key default gen_random_uuid(),
  day_key       text not null,                  -- '<year>-<monthIndex>-<day>-<AM|PM>'
  boat_id       text not null,                  -- Boat.id inside that practice's lineup
  boat_name     text not null default '',       -- '1V' — copied, so a renamed boat keeps its history
  boat_badge    text not null default '',       -- '8+' | '4+' | '4-' | '2-'
  title         text not null,                  -- built by the app, never typed by hand
  note          text not null default '',       -- optional two words: 'start', '20 stroke'
  storage_path  text,                           -- object in the private 'crew-videos' bucket
  external_url  text,                           -- step 2: the same file on the squad's drive
  crew          jsonb not null default '[]'::jsonb,  -- [{ seat, athleteId, name, side, cox }]
  added_by      uuid references auth.users(id) default auth.uid(),
  created_at    timestamptz not null default now()
);

-- Every screen that reads videos reads them by practice, then by boat.
create index if not exists varsity_videos_day_idx on public.varsity_videos (day_key, created_at);

alter table public.varsity_videos enable row level security;

create policy "Crew videos readable by signed-in users"
  on public.varsity_videos for select
  using (auth.role() = 'authenticated');

create policy "Crew videos insertable by signed-in users"
  on public.varsity_videos for insert
  with check (auth.role() = 'authenticated');

-- Editing the note / title stays with whoever put the video up.
create policy "Own crew video updatable"
  on public.varsity_videos for update
  using (auth.uid() = added_by);

-- Deleting is NOT team-wide, on purpose: a video is somebody's upload and the
-- team can already see it. Only the person who added it can take it down.
-- (When real teams land, a coach gets this too, the same way varsity_can_admin
-- grants it elsewhere.)
create policy "Own crew video deletable"
  on public.varsity_videos for delete
  using (auth.uid() = added_by);

-- ---------------------------------------------------------------------------
-- THE FILES
-- ---------------------------------------------------------------------------
-- PRIVATE bucket; playback goes through short-lived signed URLs, so a copied
-- link is worthless tomorrow and nothing can be hotlinked out of the app.
--
-- Path convention: '<day_key>/<boat_id>/<random>.<ext>'. Unlike the erg photos,
-- the first folder is NOT a user id — a crew video belongs to a boat, and the
-- squad shares it — so the write policy below is team-wide, matching lineups.
--
-- `file_size_limit` is the ceiling for ONE file (500 MB here). Supabase's own
-- plan limit still applies on top of it and is lower on the free plan — which
-- is exactly why step 2 moves uploads onto the squad's drive, where a full
-- practice video has somewhere to go.
insert into storage.buckets (id, name, public, file_size_limit)
values ('crew-videos', 'crew-videos', false, 524288000)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

drop policy if exists "Crew videos readable by signed-in users" on storage.objects;
create policy "Crew videos readable by signed-in users"
  on storage.objects for select
  using (bucket_id = 'crew-videos' and auth.role() = 'authenticated');

drop policy if exists "Crew videos insertable by signed-in users" on storage.objects;
create policy "Crew videos insertable by signed-in users"
  on storage.objects for insert
  with check (bucket_id = 'crew-videos' and auth.role() = 'authenticated');

-- Only the uploader can remove the file, mirroring the row policy above.
drop policy if exists "Own crew video file deletable" on storage.objects;
create policy "Own crew video file deletable"
  on storage.objects for delete
  using (bucket_id = 'crew-videos' and owner = auth.uid());
