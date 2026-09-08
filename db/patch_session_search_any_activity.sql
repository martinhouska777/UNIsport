-- Session search: "Other" now means EVERY activity.
-- Run this once in the Supabase SQL editor. It only replaces match_session_search;
-- nothing else in the database is touched. Source of truth: db/matching.sql.

drop function if exists public.match_session_search(
  uuid, text, text, numeric, text, text, text, text, text[], numeric);

create or replace function public.match_session_search(
  searcher_id          uuid,
  activity_filter      text,
  target_day           text,
  target_hour          numeric,
  gym_filter           text   default null,
  level_filter         text   default null,
  gender_filter        text   default null,
  concentration_filter text   default null,
  interests_filter     text[] default null,
  /*
    How far either side of the hour still counts, in hours. Two by default.

    The app widens it and asks again when the exact hour turns up nobody: an
    empty result is not the honest answer when three people are training that
    same day two hours later. Better to show them and say so.
  */
  window_hours         numeric default 2
)
returns table (
  candidate_id       uuid,
  name               text,
  level              text,
  residence          text,
  class_year         text,
  main_activity      text,
  score              numeric,
  interests_pts      numeric,
  concentration_pts  numeric,
  origin_pts         numeric,
  languages_pts      numeric,
  gym_pts            numeric,
  level_pts          numeric,
  activity_pts       numeric,
  training_pts       numeric,
  shared_interests   text[],
  shared_languages   text[],
  same_concentration text,
  shared_country     text,
  shared_region      text,
  shared_gym         text,
  level_note         text,
  shared_activity    text,
  activity_note      text,
  their_activity_freq text,
  -- THEIR OWN values, shared or not — see match_browse above.
  their_concentration text,
  their_interests    text[],
  their_gym          text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.candidate_id, m.name, m.level, m.residence, m.class_year, m.main_activity,
    round(m.interests_pts + m.concentration_pts + m.origin_pts + m.languages_pts
        + m.gym_pts + m.level_pts + m.training_pts + m.activity_pts, 1) as total,
    m.interests_pts, m.concentration_pts, m.origin_pts, m.languages_pts,
    m.gym_pts, m.level_pts, m.activity_pts, m.training_pts,
    m.shared_interests, m.shared_languages, m.same_concentration,
    m.shared_country, m.shared_region, m.shared_gym, m.level_note,
    m.shared_activity, m.activity_note, m.their_activity_freq,
    m.c_concentration,
    array(select distinct z.val from jsonb_array_elements_text(m.c_interests) as z(val)),
    m.c_top_gyms->>0
  from public.match_candidates(searcher_id) m
  -- "Do they do this AT ALL", not "is it their main thing". That one word is
  -- the whole fix: a gym-first person who also runs twice a week is now
  -- findable by somebody looking for a running partner.
  -- NULL activity_filter = every activity. "Other" on the search screen sends
  -- null: on a campus that is still filling up, somebody who ticked Other is
  -- better served by everyone training that day than by an empty list.
  where (activity_filter is null or m.c_activities ? lower(activity_filter))
    and exists (
      select 1
      from jsonb_array_elements_text(
             coalesce(m.c_schedule -> target_day, '[]'::jsonb)
           ) b
      where public.block_range(b)
            && numrange(target_hour - window_hours, target_hour + window_hours)
    )
    and (concentration_filter is null or m.c_concentration = concentration_filter)
    and (interests_filter is null or exists (
          select 1 from jsonb_array_elements_text(m.c_interests) as z(val)
          where z.val = any (interests_filter)))
    and (gym_filter    is null or m.c_top_gyms ? gym_filter)
    and (level_filter  is null or m.level      = level_filter)
    and (gender_filter is null or m.c_gender   = lower(gender_filter))
  order by total desc;
$$;

grant execute on function public.match_session_search(
  uuid, text, text, numeric, text, text, text, text, text[], numeric
) to authenticated;
