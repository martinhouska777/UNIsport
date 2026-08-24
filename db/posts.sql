-- ============================================================================
-- UNIsport — Feed posts (Slice 1: the feed becomes real)
-- ----------------------------------------------------------------------------
-- A post is the ONE thing in Zone 2 that deliberately crosses the wall between
-- universities. Match only ever offers partners at your own school
-- (db/matching.sql: `c.university_id = me.university_id`); the feed is open, so
-- Harvard sees Yale, and a DM to someone at Yale already works — db/messages.sql
-- `dm_start` never asked which school you are at.
--
-- WHAT A POST IS
--   Text, a photo, or both. Nothing is auto-published: `workout_logs` stays
--   private per-user (RLS = own rows only) and always will. Sharing a session
--   is a separate, deliberate act — the workout attachment lands in the next
--   slice and is why `workout_log_id` already exists here as a nullable column.
--
-- SECURITY: same pattern as db/follows.sql and db/messages.sql — the tables
-- have RLS ENABLED with NO policies, so they are only reachable through the
-- SECURITY DEFINER functions below, which always act for auth.uid(). Nobody can
-- write a post, or a kudos, as somebody else.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references public.profiles (id) on delete cascade,
  -- The author's school, COPIED at publish time rather than joined at read
  -- time. A post belongs to the school it was written at: the demo switcher
  -- (and, one day, graduating) must not silently move somebody's old posts to
  -- a different campus. Same key space as lib/themes.ts ('harvard', 'yale', …).
  university_key text not null default 'harvard',
  body           text not null default '',
  -- One downscaled JPEG data URL, exactly like workout_logs.photos. Object
  -- storage is the right answer eventually; a data URL is the right answer for
  -- a feature that isn't proven yet.
  photo          text,
  -- Reserved for the next slice: the session this post is about. Nullable, and
  -- the feed reads nothing from it yet.
  workout_log_id uuid references public.workout_logs (id) on delete set null,
  created_at     timestamptz not null default now(),
  -- A post has to actually say something.
  constraint posts_not_empty check (length(btrim(body)) > 0 or photo is not null),
  constraint posts_body_len  check (length(body) <= 600)
);

create index if not exists posts_created_idx on public.posts (created_at desc);
create index if not exists posts_author_idx  on public.posts (author_id, created_at desc);
create index if not exists posts_school_idx  on public.posts (university_key, created_at desc);

-- 💪 — the one reaction. Comments are a later slice, on purpose: a feed nobody
-- posts to doesn't need a comment box.
create table if not exists public.post_kudos (
  post_id    uuid not null references public.posts (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.posts      enable row level security;
alter table public.post_kudos enable row level security;

-- ---------------------------------------------------------------------------
-- Write
-- ---------------------------------------------------------------------------

-- Publish a post. Returns its id.
create or replace function public.post_create(body_text text, photo_data text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  txt  text := btrim(coalesce(body_text, ''));
  pic  text := nullif(btrim(coalesce(photo_data, '')), '');
  uni  text;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if length(txt) = 0 and pic is null then raise exception 'empty post'; end if;
  if length(txt) > 600 then raise exception 'post too long'; end if;
  -- Only ever an inline image. Anything else would let a post point the app at
  -- a URL somebody else controls.
  if pic is not null and pic not like 'data:image/%' then
    raise exception 'photo must be an inline image';
  end if;

  -- The same coalesce db/matching.sql uses, so a profile written before the
  -- university key existed still lands somewhere sensible.
  select coalesce(nullif(p.data->>'university', ''), 'harvard')
    into uni
    from public.profiles p
   where p.id = me;
  if uni is null then raise exception 'finish onboarding first'; end if;

  insert into public.posts (author_id, university_key, body, photo)
    values (me, uni, txt, pic)
    returning posts.id into new_id;
  return new_id;
end;
$$;

-- Delete your own post (no-op if it isn't yours).
create or replace function public.post_delete(post uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.posts where id = post and author_id = auth.uid();
$$;

-- Toggle 💪 on a post. Returns the new count and whether YOU are in it, so the
-- card can settle on the real number instead of guessing.
create or replace function public.post_kudos_toggle(post uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  had  boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from public.posts where id = post) then
    raise exception 'no such post';
  end if;

  select exists (select 1 from public.post_kudos k
                 where k.post_id = post and k.user_id = me)
    into had;

  if had then
    delete from public.post_kudos where post_id = post and user_id = me;
  else
    insert into public.post_kudos (post_id, user_id) values (post, me)
      on conflict do nothing;
  end if;

  return jsonb_build_object(
    'kudos',  (select count(*) from public.post_kudos where post_id = post)::int,
    'kudoed', not had
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Read
-- ---------------------------------------------------------------------------

-- The feed itself.
--   scope 'following' — people you follow, PLUS your own posts. Excluding your
--                       own would leave a new account staring at an empty tab
--                       right after publishing its first post.
--   scope 'everyone'  — every school, unless `school` narrows it to one.
-- Newest first, paged.
create or replace function public.feed_list(
  scope       text default 'everyone',
  school      text default null,
  page_limit  int  default 20,
  page_offset int  default 0
)
returns table (
  id           uuid,
  author_id    uuid,
  author_name  text,
  school_key   text,
  body         text,
  photo        text,
  created_at   timestamptz,
  kudos        int,
  kudoed       boolean,
  mine         boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.author_id,
    coalesce(nullif(a.data->>'name', ''), 'Member') as author_name,
    p.university_key,
    p.body,
    p.photo,
    p.created_at,
    (select count(*) from public.post_kudos k where k.post_id = p.id)::int,
    exists (select 1 from public.post_kudos k
            where k.post_id = p.id and k.user_id = auth.uid()),
    p.author_id = auth.uid()
  from public.posts p
  join public.profiles a on a.id = p.author_id
  where auth.uid() is not null
    and (school is null or p.university_key = school)
    and (
      scope <> 'following'
      or p.author_id = auth.uid()
      or exists (select 1 from public.follows f
                 where f.follower_id = auth.uid() and f.followee_id = p.author_id)
    )
  order by p.created_at desc
  limit greatest(1, least(coalesce(page_limit, 20), 50))
  offset greatest(0, coalesce(page_offset, 0));
$$;

grant execute on function public.post_create(text, text)          to authenticated;
grant execute on function public.post_delete(uuid)                to authenticated;
grant execute on function public.post_kudos_toggle(uuid)          to authenticated;
grant execute on function public.feed_list(text, text, int, int)  to authenticated;
