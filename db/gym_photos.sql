-- ============================================================================
-- UNIsport — Gym photos, submitted by the people who train there
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   The gym page used to promise a photo carousel it could never fill: nobody
--   was going to walk fifteen gyms with a camera, and certainly not at every
--   school. So the pictures come from students instead. Anyone signed in can
--   add a photo to a gym; everyone at the school sees it; you can take your own
--   down. The newest photo also becomes the gym's picture on the Gyms list.
--
--   One row per PHOTO: who added it, which gym (the lib/gyms.ts slug, which is
--   unique across schools), where the file sits in storage, and when.
--
-- SECURITY: same pattern as db/gym_crowd.sql — RLS is ENABLED with NO policies,
--   so the table is reachable ONLY through the SECURITY DEFINER functions below,
--   which act for auth.uid(). The read never hands out WHO added a photo, only
--   whether a row is the caller's own (so the page can offer "remove" on it).
--
-- STORAGE: the PUBLIC `gym-photos` bucket. A picture of a campus gym is not a
--   secret, and a public bucket means the Gyms list can paint a dozen cards with
--   plain, cacheable urls instead of signing each one. Writes are still fenced:
--   the storage policy only lets you write inside a folder named with your own
--   user id ('<user_id>/<gym_slug>/<stamp>.jpg', built in lib/supabase/gymPhotos.ts).
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.gym_photos (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  gym_slug   text not null,                       -- lib/gyms.ts slug
  path       text not null,                       -- object path inside the gym-photos bucket
  created_at timestamptz not null default now()
);

create index if not exists gym_photos_gym_time_idx
  on public.gym_photos (gym_slug, created_at desc);

alter table public.gym_photos enable row level security;

-- ---------------------------------------------------------------------------
-- Record a photo the caller has just uploaded. The path must be inside the
-- caller's own folder — the same rule the storage policy enforces — so a row
-- can never point at somebody else's file.
-- ---------------------------------------------------------------------------
create or replace function public.gym_photo_add(p_gym_slug text, p_path text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_gym_slug is null or length(btrim(p_gym_slug)) = 0 then
    raise exception 'gym required';
  end if;
  if p_path is null or position(me::text || '/' in p_path) <> 1 then
    raise exception 'path must be inside your own folder';
  end if;

  insert into public.gym_photos (user_id, gym_slug, path)
    values (me, btrim(p_gym_slug), p_path)
    returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Take down one of YOUR photos. Removing someone else's row does nothing.
-- (The file itself is removed by the app, under the storage policy.)
-- ---------------------------------------------------------------------------
create or replace function public.gym_photo_remove(p_id uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.gym_photos
  where id = p_id and user_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- The newest photos of EVERY gym in one call (the Gyms list paints all its
-- cards from one read; the gym page picks its own slug). Capped per gym so a
-- popular gym can't turn the read into a wall of rows. Anonymous on purpose:
-- no user id comes back, only whether the row is YOURS.
-- ---------------------------------------------------------------------------
drop function if exists public.gym_photos_recent(integer);

create or replace function public.gym_photos_recent(per_gym integer default 24)
returns table (
  id         uuid,
  gym_slug   text,
  path       text,
  created_at timestamptz,
  mine       boolean)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.gym_slug, p.path, p.created_at, (p.user_id = auth.uid()) as mine
  from (
    select *, row_number() over (partition by gym_slug order by created_at desc) as rn
    from public.gym_photos
  ) p
  where auth.uid() is not null
    and p.rn <= greatest(1, per_gym)
  order by p.gym_slug, p.created_at desc;
$$;

grant execute on function public.gym_photo_add(text, text)     to authenticated;
grant execute on function public.gym_photo_remove(uuid)        to authenticated;
grant execute on function public.gym_photos_recent(integer)    to authenticated;

-- ---------------------------------------------------------------------------
-- STORAGE — the public bucket and who may write where.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('gym-photos', 'gym-photos', true)
on conflict (id) do nothing;

-- READ: public bucket, so plain urls work; this policy lets the client list/
-- fetch object metadata too, which a public bucket does not cover by itself.
drop policy if exists "Gym photos readable by everyone" on storage.objects;
create policy "Gym photos readable by everyone"
  on storage.objects for select
  using (bucket_id = 'gym-photos');

-- WRITE: only inside your own folder.
drop policy if exists "Own gym photo insertable" on storage.objects;
create policy "Own gym photo insertable"
  on storage.objects for insert
  with check (
    bucket_id = 'gym-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Own gym photo deletable" on storage.objects;
create policy "Own gym photo deletable"
  on storage.objects for delete
  using (
    bucket_id = 'gym-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
