-- ============================================================================
-- UNIsport — Gym reviews: three scores and a comment, from the people who train there
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   A gym page used to show "4.8 · 142 ratings" — numbers invented in
--   lib/gyms.ts and printed on a real, named campus gym. They were cut for
--   exactly that reason. This is the honest replacement: every number on the
--   page is a row in this table, written by a signed-in student.
--
--   One row per PERSON per GYM (the primary key), so rating a gym twice edits
--   your review rather than stuffing the average. Each row carries up to three
--   scores — equipment, cleanliness, atmosphere — and an optional comment.
--   A score is 1..5 or null ("didn't say"), and the row's OVERALL is the
--   average of the ones that were given. The gym's score is the average of
--   those overalls.
--
-- SECURITY: the pattern db/gym_crowd.sql and db/buddy_board.sql use — RLS is
--   ENABLED with NO policies, so the table is reachable only through the
--   SECURITY DEFINER functions below, which act for auth.uid(). You can only
--   ever write your own row, and deleting somebody else's does nothing.
--
--   A review is signed: the reader gets the author's name and photo, because a
--   comment about a real gym from nobody in particular is worth nothing. It is
--   the same join db/buddy_board.sql makes.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.gym_reviews (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  gym_slug    text not null,                     -- lib/gyms.ts slug (unique across schools)
  equipment   smallint check (equipment   between 1 and 5),
  cleanliness smallint check (cleanliness between 1 and 5),
  atmosphere  smallint check (atmosphere  between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, gym_slug)
);

create index if not exists gym_reviews_gym_time_idx
  on public.gym_reviews (gym_slug, updated_at desc);

alter table public.gym_reviews enable row level security;

-- ---------------------------------------------------------------------------
-- The average of the scores somebody actually gave, or null if they gave none.
-- Kept in one place so the summary and the review list can never disagree.
-- ---------------------------------------------------------------------------
create or replace function public.gym_review_overall(
  p_equipment smallint, p_cleanliness smallint, p_atmosphere smallint)
returns numeric
language sql
immutable
as $fn$
  select avg(v) from unnest(array[p_equipment, p_cleanliness, p_atmosphere]) as v
  where v is not null;
$fn$;

-- ---------------------------------------------------------------------------
-- Write (or rewrite) YOUR review of one gym. Every field is optional, but a
-- review with no score at all and no comment is nothing, and is refused.
-- Passing null for a score clears it.
-- ---------------------------------------------------------------------------
create or replace function public.gym_review_save(
  p_gym_slug    text,
  p_equipment   smallint default null,
  p_cleanliness smallint default null,
  p_atmosphere  smallint default null,
  p_comment     text     default null)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  body text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_gym_slug is null or length(btrim(p_gym_slug)) = 0 then
    raise exception 'gym required';
  end if;
  if p_equipment is null and p_cleanliness is null
     and p_atmosphere is null and body is null then
    raise exception 'nothing to save';
  end if;

  insert into public.gym_reviews as r
    (user_id, gym_slug, equipment, cleanliness, atmosphere, comment)
  values
    (me, btrim(p_gym_slug), p_equipment, p_cleanliness, p_atmosphere, left(body, 600))
  on conflict (user_id, gym_slug) do update
    set equipment   = excluded.equipment,
        cleanliness = excluded.cleanliness,
        atmosphere  = excluded.atmosphere,
        comment     = excluded.comment,
        updated_at  = now();
end;
$fn$;

-- ---------------------------------------------------------------------------
-- Take YOUR review down. Somebody else's row is untouched.
-- ---------------------------------------------------------------------------
create or replace function public.gym_review_remove(p_gym_slug text)
returns void
language sql
volatile
security definer
set search_path = public
as $fn$
  delete from public.gym_reviews
  where user_id = auth.uid() and gym_slug = btrim(p_gym_slug);
$fn$;

-- ---------------------------------------------------------------------------
-- Every review of ONE gym, newest first, signed with the author's name and
-- photo, and flagged when it is the caller's own (so the page can offer edit).
-- ---------------------------------------------------------------------------
drop function if exists public.gym_reviews_for(text, integer);

create or replace function public.gym_reviews_for(p_gym_slug text, p_limit integer default 50)
returns table (
  user_id      uuid,
  author_name  text,
  author_photo text,
  equipment    smallint,
  cleanliness  smallint,
  atmosphere   smallint,
  overall      numeric,
  comment      text,
  updated_at   timestamptz,
  mine         boolean)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    r.user_id,
    coalesce(p.data->>'name', 'Member') as author_name,
    p.data->>'photo'                    as author_photo,
    r.equipment, r.cleanliness, r.atmosphere,
    public.gym_review_overall(r.equipment, r.cleanliness, r.atmosphere) as overall,
    r.comment,
    r.updated_at,
    (r.user_id = auth.uid()) as mine
  from public.gym_reviews r
  join public.profiles p on p.id = r.user_id
  where auth.uid() is not null
    and r.gym_slug = btrim(p_gym_slug)
  order by (r.user_id = auth.uid()) desc, r.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 200));
$fn$;

-- ---------------------------------------------------------------------------
-- EVERY gym's score in one call — the Gyms list paints all its cards from one
-- read, and the gym page picks its own slug out of it. Per-category averages
-- come back too, because that is what the breakdown bars draw.
-- ---------------------------------------------------------------------------
drop function if exists public.gym_review_summary();

create or replace function public.gym_review_summary()
returns table (
  gym_slug        text,
  reviews         integer,
  score           numeric,
  equipment_avg   numeric,
  cleanliness_avg numeric,
  atmosphere_avg  numeric,
  comments        integer)
language sql
stable
security definer
set search_path = public
as $fn$
  select
    r.gym_slug,
    count(*)::integer as reviews,
    avg(public.gym_review_overall(r.equipment, r.cleanliness, r.atmosphere)) as score,
    avg(r.equipment)   as equipment_avg,
    avg(r.cleanliness) as cleanliness_avg,
    avg(r.atmosphere)  as atmosphere_avg,
    count(*) filter (where r.comment is not null)::integer as comments
  from public.gym_reviews r
  where auth.uid() is not null
  group by r.gym_slug;
$fn$;

grant execute on function public.gym_review_overall(smallint, smallint, smallint) to authenticated;
grant execute on function public.gym_review_save(text, smallint, smallint, smallint, text) to authenticated;
grant execute on function public.gym_review_remove(text)        to authenticated;
grant execute on function public.gym_reviews_for(text, integer)  to authenticated;
grant execute on function public.gym_review_summary()            to authenticated;
