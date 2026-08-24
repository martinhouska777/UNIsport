-- ============================================================================
-- UNIsport — Sharing a logged session to the feed (Slice 2)
-- ----------------------------------------------------------------------------
-- THE STRAVA SHAPE. A post is now, first and foremost, a WORKOUT: you log the
-- session into your calendar with a comment and a photo exactly as before, and
-- one switch also puts it on the feed. What people see there is the session —
-- what you trained, where, with whom, the numbers, your comment, your picture —
-- and what they can do is give it 💪.
--
-- WHERE THE DATA LIVES
--   Nowhere new. `workout_logs` stays the single source of truth and stays
--   PRIVATE (RLS = own rows only, db/workout_logs.sql). A post does not copy
--   the session; it POINTS at it (posts.workout_log_id), and `feed_list` — a
--   SECURITY DEFINER function — reads a curated, public-safe summary out of it,
--   exactly the way get_public_profile exposes a subset of a profile.
--
--   That means editing a session updates its post, and deleting the session
--   leaves the post standing as a plain photo-and-words post rather than
--   silently deleting somebody's feed history. It also means a workout is only
--   ever readable by others when its owner deliberately created a post for it.
--
--   Only the FIRST photo travels with the feed row, plus a count. Session
--   photos are inline data URLs; twenty posts' worth of every photo would be a
--   several-megabyte page load for one screen of cards.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- Run db/posts.sql first (this replaces two of its functions).
-- ============================================================================

-- Both functions change shape, and Postgres won't let CREATE OR REPLACE change
-- a return type or silently add an overload — so the old ones go first.
drop function if exists public.post_create(text, text);
drop function if exists public.feed_list(text, text, int, int);

-- One post per session: sharing the same workout twice is a mistake, not a
-- feature, and this is what lets the log sheet show "Shared" instead of
-- offering to share it again.
create unique index if not exists posts_one_per_log_idx
  on public.posts (workout_log_id)
  where workout_log_id is not null;

-- THE ONE THAT BROKE SHARING. db/posts.sql insisted a post carry words or a
-- picture of its own. A shared session has neither — the session IS the
-- content — so every "Share to feed" failed the check and the switch looked
-- like it did nothing. The third arm is the fix.
alter table public.posts drop constraint if exists posts_not_empty;
alter table public.posts add constraint posts_not_empty
  check (length(btrim(body)) > 0 or photo is not null or workout_log_id is not null);

-- ---------------------------------------------------------------------------
-- Write
-- ---------------------------------------------------------------------------

-- Publish a post. `log_id` attaches one of YOUR OWN logged sessions.
create or replace function public.post_create(
  body_text  text,
  photo_data text default null,
  log_id     uuid default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  txt    text := btrim(coalesce(body_text, ''));
  pic    text := nullif(btrim(coalesce(photo_data, '')), '');
  uni    text;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if length(txt) > 600 then raise exception 'post too long'; end if;
  if pic is not null and pic not like 'data:image/%' then
    raise exception 'photo must be an inline image';
  end if;

  -- A session IS the content, so a workout post needs no words and no picture
  -- of its own. A post without one still has to say something.
  if log_id is null and length(txt) = 0 and pic is null then
    raise exception 'empty post';
  end if;

  -- You can only ever share your own session. Without this, any id would do.
  if log_id is not null and not exists (
    select 1 from public.workout_logs w where w.id = log_id and w.user_id = me
  ) then
    raise exception 'that session is not yours';
  end if;

  select coalesce(nullif(p.data->>'university', ''), 'harvard')
    into uni
    from public.profiles p
   where p.id = me;
  if uni is null then raise exception 'finish onboarding first'; end if;

  insert into public.posts (author_id, university_key, body, photo, workout_log_id)
    values (me, uni, txt, pic, log_id)
    -- Sharing an already-shared session is a no-op that returns the post it
    -- already has, rather than an error the UI would have to explain.
    on conflict (workout_log_id) where workout_log_id is not null do nothing
    returning posts.id into new_id;

  if new_id is null then
    select p.id into new_id from public.posts p
     where p.workout_log_id = log_id and p.author_id = me;
  end if;
  return new_id;
end;
$$;

-- Which of my sessions are already on the feed. One call, so the "pick a
-- session" list can grey out what's already shared without asking per row.
create or replace function public.my_shared_log_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.workout_log_id from public.posts p
   where p.author_id = auth.uid()
     and p.workout_log_id is not null;
$$;

-- Is this session of mine already on the feed? Returns the post id, or null.
-- Lets the log sheet say "Shared" and offer to take it down again.
create or replace function public.post_for_log(log_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id from public.posts p
   where p.workout_log_id = log_id
     and p.author_id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Read
-- ---------------------------------------------------------------------------

-- The feed. Same two scopes as before; each row now also carries the session
-- behind it, when there is one.
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
  mine         boolean,
  workout      jsonb
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
    p.author_id = auth.uid(),
    -- The public-safe view of the session. Everything here is what the author
    -- chose to put on a post; nothing else from workout_logs is exposed.
    case when w.id is null then null else jsonb_build_object(
      'id',         w.id,
      'date',       w.log_date,
      'activity',   w.activity,
      'gym',        coalesce(w.gym, ''),
      'partner',    coalesce(w.partner, ''),
      'partnerId',  w.partner_id,
      'exercises',  coalesce(w.exercises, '[]'::jsonb),
      'metrics',    coalesce(w.metrics, '{}'::jsonb),
      'note',       coalesce(w.note, ''),
      -- First photo only — see the header note on page weight.
      'photo',      w.photos->>0,
      'photoCount', coalesce(jsonb_array_length(w.photos), 0)
    ) end
  from public.posts p
  join public.profiles a on a.id = p.author_id
  left join public.workout_logs w on w.id = p.workout_log_id
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

grant execute on function public.post_create(text, text, uuid)     to authenticated;
grant execute on function public.post_for_log(uuid)                to authenticated;
grant execute on function public.my_shared_log_ids()               to authenticated;
grant execute on function public.feed_list(text, text, int, int)   to authenticated;
