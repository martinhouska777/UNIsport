-- ============================================================================
-- UNIsport — THE VARSITY FEED (posts, kudos, and who is allowed to see them)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS FOR
--   Today "jak kdo kde zajel" happens on Instagram. This is that, inside the
--   app: an athlete logs a session, and — as a SEPARATE, deliberate step after
--   saving — puts it on the feed with a photo and a comment.
--
-- WHERE THE DATA LIVES
--   Nowhere new. `varsity_logs` stays the single source of truth and stays
--   PRIVATE (RLS = own rows only, db/varsity_logs.sql). A post does not copy
--   the session, it POINTS at it, and `varsity_feed_list` — SECURITY DEFINER —
--   reads a curated, public-safe summary out of it. Same shape as the normal
--   app's feed (db/posts_workout.sql).
--
--   The log's own NOTE is deliberately NOT in that summary. The note is what
--   you write for yourself and (on a team workout) for the coach; the words on
--   the feed are the ones you type when you share. Two audiences, two texts —
--   the private one never leaks into the public one.
--
-- WHO SEES WHAT (the owner's rule)
--   Every post picks its audience when it is published:
--     'team'     — only your own squad.
--     'everyone' — every varsity athlete, at every school. The Instagram slot.
--   And: THE COACH SEES NOTHING. Not their squad's team posts, not the open
--   ones. The Coach Console has no Feed tab, and — because a hidden tab is a
--   promise, not a rule — every function here returns empty for anyone whose
--   role on their squad is 'coach'.
--
-- SECURITY: the tables have RLS ENABLED with NO policies, so they are only
-- reachable through the SECURITY DEFINER functions below, which always act for
-- auth.uid(). Same pattern as db/posts.sql, db/follows.sql, db/messages.sql.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- Needs db/varsity_teams.sql and db/varsity_logs.sql to exist first.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.varsity_posts (
  id             uuid primary key default gen_random_uuid(),
  author_id      uuid not null references auth.users (id) on delete cascade,
  -- Name copied at publish time, exactly like db/varsity_results.sql does for
  -- the board: the feed must never need read access to anybody's profile.
  author_name    text not null default '',
  -- The squad this was posted from, and its school, both COPIED at publish
  -- time. A post belongs to the team it was written on; changing squads later
  -- must not silently move somebody's old posts to a new one.
  team_id        uuid not null references public.varsity_teams (id) on delete cascade,
  team_name      text not null default '',
  university_key text not null default 'harvard',   -- lib/themes.ts key
  audience       text not null default 'team',      -- 'team' | 'everyone'
  -- The session this post is about (the normal case). Nullable so a deleted
  -- log leaves the post standing rather than erasing feed history.
  log_id         uuid references public.varsity_logs (id) on delete set null,
  -- The words and the picture, written AT SHARE TIME — never while logging.
  body           text not null default '',
  -- One downscaled JPEG data URL, like posts.photo. Object storage is the
  -- right answer eventually; a data URL is the right answer for a feature
  -- that isn't proven yet.
  photo          text,
  created_at     timestamptz not null default now(),
  constraint varsity_posts_audience check (audience in ('team', 'everyone')),
  constraint varsity_posts_body_len check (length(body) <= 600),
  -- A post has to be about something: a session, or words, or a picture.
  constraint varsity_posts_not_empty
    check (log_id is not null or length(btrim(body)) > 0 or photo is not null)
);

-- One post per session: sharing the same piece twice is a mistake, not a
-- feature, and this is what lets the log screen say "On the feed" instead of
-- offering to share it again.
create unique index if not exists varsity_posts_one_per_log_idx
  on public.varsity_posts (log_id) where log_id is not null;
create index if not exists varsity_posts_created_idx on public.varsity_posts (created_at desc);
create index if not exists varsity_posts_team_idx    on public.varsity_posts (team_id, created_at desc);

-- 💪 — the one reaction, same as the normal feed.
create table if not exists public.varsity_post_kudos (
  post_id    uuid not null references public.varsity_posts (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);

alter table public.varsity_posts      enable row level security;
alter table public.varsity_post_kudos enable row level security;

-- ---------------------------------------------------------------------------
-- Who is asking?
-- ---------------------------------------------------------------------------
-- The caller's approved squad, in one place so every function below agrees
-- about it. It returns NOTHING for a coach — that single line is what makes
-- "the coach sees nothing" a rule rather than a hidden tab.
create or replace function public.varsity_feed_me()
returns table (team_id uuid, team_name text, university_key text)
language sql
stable
security definer
set search_path = public
as $$
  select m.team_id, t.name, t.university_key
    from public.varsity_members m
    join public.varsity_teams t on t.id = m.team_id
   where m.user_id = auth.uid()
     and m.status = 'approved'
     and m.role <> 'coach'
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Write
-- ---------------------------------------------------------------------------

-- Publish a post. `p_log` shares one of YOUR OWN logged sessions.
create or replace function public.varsity_post_create(
  p_log      uuid default null,
  p_body     text default '',
  p_photo    text default null,
  p_audience text default 'team'
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  txt    text := btrim(coalesce(p_body, ''));
  pic    text := nullif(btrim(coalesce(p_photo, '')), '');
  aud    text := coalesce(nullif(btrim(p_audience), ''), 'team');
  mine   record;
  new_id uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if aud not in ('team', 'everyone') then raise exception 'unknown audience'; end if;
  if length(txt) > 600 then raise exception 'post too long'; end if;
  -- Only ever an inline image. Anything else would let a post point the app at
  -- a URL somebody else controls.
  if pic is not null and pic not like 'data:image/%' then
    raise exception 'photo must be an inline image';
  end if;

  select * into mine from public.varsity_feed_me();
  if mine.team_id is null then raise exception 'not on a squad'; end if;

  -- A session IS the content; a post without one still has to say something.
  if p_log is null and length(txt) = 0 and pic is null then
    raise exception 'empty post';
  end if;

  -- You can only ever share your own session. Without this, any id would do.
  if p_log is not null and not exists (
    select 1 from public.varsity_logs l where l.id = p_log and l.athlete_id = me
  ) then
    raise exception 'that session is not yours';
  end if;

  insert into public.varsity_posts
      (author_id, author_name, team_id, team_name, university_key, audience, log_id, body, photo)
  values (
    me,
    coalesce(nullif((select p.data->>'name' from public.profiles p where p.id = me), ''), 'Athlete'),
    mine.team_id, mine.team_name, mine.university_key, aud, p_log, txt, pic
  )
  -- Sharing an already-shared session is a no-op that returns the post it
  -- already has, rather than an error the UI would have to explain.
  on conflict (log_id) where log_id is not null do nothing
  returning varsity_posts.id into new_id;

  if new_id is null then
    select vp.id into new_id from public.varsity_posts vp
     where vp.log_id = p_log and vp.author_id = me;
  end if;
  return new_id;
end;
$$;

-- Take your own post down (no-op if it isn't yours).
create or replace function public.varsity_post_delete(p_post uuid)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.varsity_posts
   where id = p_post and author_id = auth.uid();
$$;

-- Is this session of mine already on the feed? Returns the post id, or null.
create or replace function public.varsity_post_for_log(p_log uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select vp.id from public.varsity_posts vp
   where vp.log_id = p_log and vp.author_id = auth.uid();
$$;

-- Toggle 💪. Returns the settled count and whether you are in it, so the card
-- can land on the real number instead of guessing.
create or replace function public.varsity_post_kudos_toggle(p_post uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  had  boolean;
  mine record;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into mine from public.varsity_feed_me();
  if mine.team_id is null then raise exception 'not on a squad'; end if;

  -- You may only react to a post you are allowed to SEE — the same test the
  -- feed itself applies, so a guessed id is worth nothing.
  if not exists (
    select 1 from public.varsity_posts vp
     where vp.id = p_post
       and (vp.audience = 'everyone' or vp.team_id = mine.team_id)
  ) then
    raise exception 'no such post';
  end if;

  select exists (select 1 from public.varsity_post_kudos k
                  where k.post_id = p_post and k.user_id = me)
    into had;

  if had then
    delete from public.varsity_post_kudos where post_id = p_post and user_id = me;
  else
    insert into public.varsity_post_kudos (post_id, user_id) values (p_post, me)
      on conflict do nothing;
  end if;

  return jsonb_build_object(
    'kudos',  (select count(*) from public.varsity_post_kudos where post_id = p_post)::int,
    'kudoed', not had
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Read
-- ---------------------------------------------------------------------------
-- The feed itself.
--   scope 'team'     — your own squad only (where the 'team' posts live).
--   scope 'everyone' — every squad's open posts, plus your own squad's.
-- Newest first, paged. Empty for a coach, and empty for anyone on no squad.
create or replace function public.varsity_feed_list(
  p_scope  text default 'everyone',
  p_limit  int  default 20,
  p_offset int  default 0
)
returns table (
  id           uuid,
  author_id    uuid,
  author_name  text,
  team_id      uuid,
  team_name    text,
  school_key   text,
  audience     text,
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
  with me as (select * from public.varsity_feed_me())
  select
    vp.id,
    vp.author_id,
    vp.author_name,
    vp.team_id,
    vp.team_name,
    vp.university_key,
    vp.audience,
    vp.body,
    vp.photo,
    vp.created_at,
    (select count(*) from public.varsity_post_kudos k where k.post_id = vp.id)::int,
    exists (select 1 from public.varsity_post_kudos k
             where k.post_id = vp.id and k.user_id = auth.uid()),
    vp.author_id = auth.uid(),
    -- The public-safe view of the session: what was done, and the numbers.
    -- NOT the log's own note — that one stays private (see the header).
    case when l.id is null then null else jsonb_build_object(
      'id',       l.id,
      'date',     l.log_date,
      'title',    l.title,
      'category', l.category,
      'minutes',  l.minutes,
      'metres',   l.metres,
      'split',    l.split
    ) end
  from public.varsity_posts vp
  cross join me
  left join public.varsity_logs l on l.id = vp.log_id
  where me.team_id is not null
    and case
          when p_scope = 'team' then vp.team_id = me.team_id
          else vp.audience = 'everyone' or vp.team_id = me.team_id
        end
  order by vp.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 50))
  offset greatest(0, coalesce(p_offset, 0));
$$;

grant execute on function public.varsity_feed_me()                           to authenticated;
grant execute on function public.varsity_post_create(uuid, text, text, text) to authenticated;
grant execute on function public.varsity_post_delete(uuid)                   to authenticated;
grant execute on function public.varsity_post_for_log(uuid)                  to authenticated;
grant execute on function public.varsity_post_kudos_toggle(uuid)             to authenticated;
grant execute on function public.varsity_feed_list(text, int, int)           to authenticated;
