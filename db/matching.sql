-- ============================================================================
-- UNIsport — partner matching (Slice: matching algorithm)
-- ----------------------------------------------------------------------------
-- HOW THIS FITS TODAY'S DATA
--   The whole onboarding questionnaire is stored as ONE json blob per user in
--   public.profiles.data (see db/profiles.sql). There are no user_gyms /
--   user_schedule / universities tables yet — everything matching needs already
--   lives inside that json.
--
--   So this file does NOT restructure storage. Instead it adds a thin
--   "translation layer":
--     1. match_region(country)  — derive a continent/region for origin scoring.
--     2. pref_allows(pref, g)   — gender-preference helper.
--     3. match_profiles (VIEW)  — reads each profile's json as clean columns.
--     4. match_browse()         — Function 1 (affinity + logistics, /100).
--     5. match_session_search() — Function 2 (logistics-first, /92).
--
--   WHY A VIEW: the two functions read from the view, never from the raw json.
--   When real per-university tables arrive later (varsity mode / more schools),
--   we rewrite ONLY the view to point at them — the functions and the frontend
--   keep working unchanged.
--
-- SECURITY
--   profiles has Row-Level Security: a user can only SELECT their own row.
--   Matching must read OTHER users, so both functions are SECURITY DEFINER
--   (they run with the definer's rights, bypassing RLS) but only ever return
--   safe match data (display name + score breakdown), never raw private json.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Region lookup — turns a hometown country into a coarse continent/region
--    so "origin match" can award partial credit (same region) when the exact
--    country differs. Countries match the list in lib/onboarding.ts.
-- ---------------------------------------------------------------------------
create or replace function public.match_region(country text)
returns text
language sql
immutable
as $$
  select case
    when country is null or country = '' then null
    when country = any (array[
      'United States','Canada'
    ]) then 'North America'
    when country = any (array[
      'Mexico','Guatemala','Belize','El Salvador','Honduras','Nicaragua',
      'Costa Rica','Panama','Bahamas','Cuba','Jamaica','Haiti',
      'Dominican Republic','Dominica','Barbados','Trinidad & Tobago','Grenada'
    ]) then 'Central America & Caribbean'
    when country = any (array[
      'Argentina','Bolivia','Brazil','Chile','Colombia','Ecuador','Guyana',
      'Paraguay','Peru','Uruguay','Venezuela'
    ]) then 'South America'
    when country = any (array[
      'Albania','Andorra','Austria','Belarus','Belgium','Bosnia & Herzegovina',
      'Bulgaria','Croatia','Cyprus','Czechia','Denmark','Estonia','Finland',
      'France','Germany','Greece','Hungary','Iceland','Ireland','Italy',
      'Kosovo','Latvia','Liechtenstein','Lithuania','Luxembourg','Malta',
      'Moldova','Monaco','Montenegro','Netherlands','North Macedonia','Norway',
      'Poland','Portugal','Romania','Russia','Serbia','Slovakia','Slovenia',
      'Spain','Sweden','Switzerland','Ukraine','United Kingdom'
    ]) then 'Europe'
    when country = any (array[
      'Bahrain','Iran','Iraq','Israel','Jordan','Kuwait','Lebanon','Oman',
      'Qatar','Saudi Arabia','Syria','Turkey','United Arab Emirates','Yemen'
    ]) then 'Middle East'
    when country = any (array[
      'Algeria','Angola','Benin','Botswana','Burkina Faso','Burundi','Cameroon',
      'Cape Verde','Central African Republic','Chad','Comoros','Congo',
      'Djibouti','Egypt','Eswatini','Ethiopia','Gabon','Gambia','Ghana',
      'Guinea','Kenya','Lesotho','Liberia','Libya','Madagascar','Malawi',
      'Mali','Mauritania','Mauritius','Morocco','Mozambique','Namibia','Niger',
      'Nigeria','Rwanda','Senegal','Somalia','South Africa','South Sudan',
      'Sudan','Tanzania','Togo','Tunisia','Uganda','Zambia','Zimbabwe'
    ]) then 'Africa'
    when country = any (array[
      'Afghanistan','Armenia','Azerbaijan','Bangladesh','Bhutan','Brunei',
      'Cambodia','China','Georgia','India','Indonesia','Japan','Kazakhstan',
      'Kyrgyzstan','Laos','Malaysia','Maldives','Mongolia','Myanmar','Nepal',
      'North Korea','Pakistan','Philippines','Singapore','South Korea',
      'Sri Lanka','Taiwan','Tajikistan','Thailand','Turkmenistan','Uzbekistan',
      'Vietnam'
    ]) then 'Asia'
    when country = any (array[
      'Australia','Fiji','New Zealand','Papua New Guinea'
    ]) then 'Oceania'
    else 'Other'
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Gender-preference helper. Stored values are lowercased: gender is
--    'male'/'female'; pref is 'any'/'male'/'female' (missing/blank = 'any').
-- ---------------------------------------------------------------------------
create or replace function public.pref_allows(pref text, g text)
returns boolean
language sql
immutable
as $$
  select pref is null or pref = '' or pref = 'any' or pref = g;
$$;

-- ---------------------------------------------------------------------------
-- 3. The translation-layer view. One row per ONBOARDED profile, with the json
--    flattened into clean columns. Arrays stay as jsonb (interests/languages/
--    top_gyms/schedule) and are read with json operators in the functions.
--
--    NOTE on university_id: single-tenant today (everyone = 'harvard'). When
--    real universities arrive, change ONLY this expression to read the real
--    column — nothing downstream changes.
-- ---------------------------------------------------------------------------
-- Drop dependents first so re-running can change the view's / functions' shape.
drop function if exists public.match_browse(uuid);
drop function if exists public.match_session_search(uuid, text, text, text, text, text);
drop view if exists public.match_profiles;

create view public.match_profiles as
select
  p.id,
  coalesce(p.data->>'name', '')                                   as name,
  coalesce(nullif(p.data->>'university', ''), 'harvard')          as university_id,
  lower(coalesce(p.data->>'sex', ''))                             as gender,
  lower(coalesce(nullif(p.data->>'partnerPreference', ''), 'any')) as partner_pref,
  lower(coalesce(p.data->>'trainingType', ''))                   as training_type,
  p.data->>'experienceLevel'                                     as level,
  case lower(coalesce(p.data->>'experienceLevel', ''))
    when 'beginner' then 1
    when 'intermediate' then 2
    when 'advanced' then 3
    else null
  end                                                            as level_rank,
  coalesce((p.data->>'helpOthers')::boolean, false)              as give_mentor,
  coalesce((p.data->>'getHelp')::boolean, false)                 as receive_mentor,
  nullif(p.data->>'concentration', '')                          as concentration,
  nullif(p.data->>'hometownCountry', '')                        as country,
  public.match_region(nullif(p.data->>'hometownCountry', ''))   as region,
  nullif(p.data->>'residence', '')                             as residence,
  coalesce(p.data->'topGyms', '[]'::jsonb)                      as top_gyms,
  coalesce(p.data->'interests', '[]'::jsonb)                    as interests,
  coalesce(p.data->'languages', '[]'::jsonb)                    as languages,
  coalesce(p.data->'trainingSchedule', '{}'::jsonb)            as schedule
from public.profiles p
where p.onboarding_completed = true;

-- ============================================================================
-- 4. FUNCTION 1 — match_browse(searcher_id)
--    Every candidate that passes the shared gates, scored out of 100, highest
--    first, with each component broken out for debugging.
--
--    AFFINITY (54): interests 22 | concentration 12 | origin 12 | languages 8
--    LOGISTICS (46): gym 20 | level 12 | schedule 8 | training type 6
-- ============================================================================
create or replace function public.match_browse(searcher_id uuid)
returns table (
  candidate_id      uuid,
  name              text,
  level             text,
  residence         text,
  score             numeric,
  interests_pts     numeric,
  concentration_pts numeric,
  origin_pts        numeric,
  languages_pts     numeric,
  gym_pts           numeric,
  level_pts         numeric,
  schedule_pts      numeric,
  training_pts      numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select * from public.match_profiles where id = searcher_id
  )
  select
    c.id,
    c.name,
    c.level,
    c.residence,
    round(comp.interests + comp.concentration + comp.origin + comp.languages
          + comp.gym + comp.level + comp.schedule + comp.training, 1) as score,
    round(comp.interests, 1),
    round(comp.concentration, 1),
    round(comp.origin, 1),
    round(comp.languages, 1),
    round(comp.gym, 1),
    round(comp.level, 1),
    round(comp.schedule, 1),
    round(comp.training, 1)
  from me, public.match_profiles c
  cross join lateral (
    select
      -- Shared interests: 22 pts, full at 4+ overlapping.
      22 * least((
        select count(*)
        from jsonb_array_elements_text(me.interests) a
        join jsonb_array_elements_text(c.interests) b on a = b
      ), 4) / 4.0 as interests,

      -- Same concentration: 12 if equal (and set), else 0.
      case when me.concentration is not null and me.concentration = c.concentration
           then 12 else 0 end as concentration,

      -- Origin: same country 12, same region 7, else 0.
      case when me.country is not null and me.country = c.country then 12
           when me.region  is not null and me.region  = c.region  then 7
           else 0 end as origin,

      -- Shared languages: 8 pts, full at 3+ overlapping.
      8 * least((
        select count(*)
        from jsonb_array_elements_text(me.languages) a
        join jsonb_array_elements_text(c.languages) b on a = b
      ), 3) / 3.0 as languages,

      -- Gym overlap, rank-aware: 20 pts. For each gym both list in their top 3,
      -- rank 1 is worth 3, rank 2 -> 2, rank 3 -> 1; add the two users' rank
      -- weights (max 6 = both rank 1) and take the best shared gym. None = 0.
      coalesce((
        select 20 * max((4 - s.ord) + (4 - cc.ord)) / 6.0
        from jsonb_array_elements_text(me.top_gyms) with ordinality s(gym, ord)
        join jsonb_array_elements_text(c.top_gyms)  with ordinality cc(gym, ord)
          on s.gym = cc.gym
        where s.ord <= 3 and cc.ord <= 3
      ), 0) as gym,

      -- Level proximity: same 12, one step 6, two steps 0. EXCEPTION: if there
      -- is a gap AND the more-advanced user offers mentorship while the other
      -- wants it, treat the gap as a bonus instead -> full 12.
      case
        when me.level_rank is null or c.level_rank is null then 0
        when abs(me.level_rank - c.level_rank) >= 1
             and ((me.level_rank > c.level_rank and me.give_mentor    and c.receive_mentor)
               or (c.level_rank > me.level_rank and c.give_mentor    and me.receive_mentor))
          then 12
        else greatest(12 - 6 * abs(me.level_rank - c.level_rank), 0)
      end as level,

      -- Schedule overlap: 8 pts (deliberately low), full at 3+ shared slots.
      8 * least((
        select count(*)
        from (
          select je.key as d, v as b
          from jsonb_each(me.schedule) je
          cross join jsonb_array_elements_text(je.value) v
        ) sx
        join (
          select je.key as d, v as b
          from jsonb_each(c.schedule) je
          cross join jsonb_array_elements_text(je.value) v
        ) cx on sx.d = cx.d and sx.b = cx.b
      ), 3) / 3.0 as schedule,

      -- Training-type alignment: 6 pts. Both flexible (partner/either) = 6.
      case
        when me.training_type in ('partner', 'either')
         and c.training_type  in ('partner', 'either') then 6
        when c.training_type in ('partner', 'either')   then 3
        else 0
      end as training
  ) comp
  where c.id <> me.id
    and c.university_id = me.university_id
    and c.training_type is distinct from 'solo'
    and public.pref_allows(me.partner_pref, c.gender)
    and public.pref_allows(c.partner_pref, me.gender)
  order by score desc;
$$;

-- ============================================================================
-- 5. FUNCTION 2 — match_session_search(...)
--    Logistics-first: "find me a partner at THIS gym, on THIS day+block".
--    Hard filters: the shared gates PLUS gym-in-top-3, schedule has the slot,
--    and optional level / gender filters. Survivors are ranked by the SAME
--    affinity + logistics score MINUS the schedule component (the slot is
--    already fixed), so the max here is 92, not 100.
--
--    target_gym is the gym NAME (gyms live in lib/gyms.ts, stored as names).
--    target_day  is a day key: 'mon'..'sun'.
--    target_block is a block label: 'Early AM','AM','Midday','PM','Late PM'.
--    level_filter / gender_filter are optional (null = no filter).
-- ============================================================================
create or replace function public.match_session_search(
  searcher_id   uuid,
  target_gym    text,
  target_day    text,
  target_block  text,
  level_filter  text default null,
  gender_filter text default null
)
returns table (
  candidate_id      uuid,
  name              text,
  level             text,
  residence         text,
  score             numeric,
  interests_pts     numeric,
  concentration_pts numeric,
  origin_pts        numeric,
  languages_pts     numeric,
  gym_pts           numeric,
  level_pts         numeric,
  training_pts      numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select * from public.match_profiles where id = searcher_id
  )
  select
    c.id,
    c.name,
    c.level,
    c.residence,
    round(comp.interests + comp.concentration + comp.origin + comp.languages
          + comp.gym + comp.level + comp.training, 1) as score,
    round(comp.interests, 1),
    round(comp.concentration, 1),
    round(comp.origin, 1),
    round(comp.languages, 1),
    round(comp.gym, 1),
    round(comp.level, 1),
    round(comp.training, 1)
  from me, public.match_profiles c
  cross join lateral (
    select
      22 * least((
        select count(*)
        from jsonb_array_elements_text(me.interests) a
        join jsonb_array_elements_text(c.interests) b on a = b
      ), 4) / 4.0 as interests,

      case when me.concentration is not null and me.concentration = c.concentration
           then 12 else 0 end as concentration,

      case when me.country is not null and me.country = c.country then 12
           when me.region  is not null and me.region  = c.region  then 7
           else 0 end as origin,

      8 * least((
        select count(*)
        from jsonb_array_elements_text(me.languages) a
        join jsonb_array_elements_text(c.languages) b on a = b
      ), 3) / 3.0 as languages,

      coalesce((
        select 20 * max((4 - s.ord) + (4 - cc.ord)) / 6.0
        from jsonb_array_elements_text(me.top_gyms) with ordinality s(gym, ord)
        join jsonb_array_elements_text(c.top_gyms)  with ordinality cc(gym, ord)
          on s.gym = cc.gym
        where s.ord <= 3 and cc.ord <= 3
      ), 0) as gym,

      case
        when me.level_rank is null or c.level_rank is null then 0
        when abs(me.level_rank - c.level_rank) >= 1
             and ((me.level_rank > c.level_rank and me.give_mentor    and c.receive_mentor)
               or (c.level_rank > me.level_rank and c.give_mentor    and me.receive_mentor))
          then 12
        else greatest(12 - 6 * abs(me.level_rank - c.level_rank), 0)
      end as level,

      case
        when me.training_type in ('partner', 'either')
         and c.training_type  in ('partner', 'either') then 6
        when c.training_type in ('partner', 'either')   then 3
        else 0
      end as training
  ) comp
  where c.id <> me.id
    and c.university_id = me.university_id
    and c.training_type is distinct from 'solo'
    and public.pref_allows(me.partner_pref, c.gender)
    and public.pref_allows(c.partner_pref, me.gender)
    -- logistics hard filters:
    and c.top_gyms ? target_gym
    and coalesce(c.schedule -> target_day, '[]'::jsonb) ? target_block
    and (level_filter  is null or c.level  = level_filter)
    and (gender_filter is null or c.gender = lower(gender_filter))
  order by score desc;
$$;

-- ---------------------------------------------------------------------------
-- 6. Let signed-in users call these via Supabase RPC.
-- ---------------------------------------------------------------------------
grant execute on function public.match_browse(uuid) to authenticated;
grant execute on function public.match_session_search(uuid, text, text, text, text, text) to authenticated;
