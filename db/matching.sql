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
--     4. match_candidates()     — THE scoring engine (see below).
--     5. match_browse()         — everyone, affinity + logistics, /100.
--     6. match_session_search() — logistics-first for one day+hour, /92.
--     7. match_pair()           — the same row for ONE person, for their profile.
--
--   WHY A VIEW: the functions read from the view, never from the raw json.
--   When real per-university tables arrive later (varsity mode / more schools),
--   we rewrite ONLY the view to point at them — the functions and the frontend
--   keep working unchanged.
--
--   WHY AN ENGINE: the scoring used to be copy-pasted into browse and session
--   search, so every tweak had to be made twice and the two lists could drift
--   apart. Now match_candidates() scores a searcher against everyone ONCE, and
--   the three public functions are thin wrappers that filter and order its rows.
--   Tune a weight in one place and every surface agrees.
--
--   WHY IT RETURNS FACTS, NOT JUST POINTS: the app has to tell a student WHY
--   someone is at the top of their list ("Both from Czechia", "Economics",
--   "Climbing, Coffee"). Points alone can't say that, so the engine also returns
--   the actual overlapping values. Every reason shown in the UI is therefore a
--   real fact out of the database, never a guess or a generated sentence.
--
-- SECURITY
--   profiles has Row-Level Security: a user can only SELECT their own row.
--   Matching must read OTHER users, so the functions are SECURITY DEFINER (they
--   run with the definer's rights, bypassing RLS) but only ever return safe
--   match data: display name, score breakdown, and the facts the searcher
--   ALREADY SHARES with the candidate — never the candidate's raw private json.
--   In particular, shared_interests is the INTERSECTION with the searcher's own
--   interests, so it can never leak an interest the searcher didn't already
--   have. The unfiltered lists stay internal to the engine (c_* columns) purely
--   so the wrappers can apply filters, and are not exposed by any wrapper.
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
--
--    Permissive on missing data: only EXCLUDE when the preference is a concrete
--    'male'/'female' AND the other person's gender is known AND they conflict.
--    A blank/null preference means "no preference"; a blank/null gender (the
--    user skipped the question) must NOT be filtered out — otherwise a single
--    unanswered field silently removes a real person from everyone's results.
-- ---------------------------------------------------------------------------
create or replace function public.pref_allows(pref text, g text)
returns boolean
language sql
immutable
as $$
  select pref is null or pref = '' or pref = 'any'  -- no concrete preference
      or g is null or g = ''                        -- other gender unknown → allow
      or pref = g;                                  -- concrete pref matches
$$;

-- ---------------------------------------------------------------------------
-- 2b. Availability slot → hour range. Everything that compares "when are you
--     free" goes through here, so a slot's stored TEXT never has to be compared
--     directly.
--
--     TWO formats are understood, because both exist in saved profiles:
--       '07:00-09:00'  exact hours — written by the profile's week editor
--       'AM'           coarse block — still written by onboarding
--
--     Exact hours are used as-is; a named block widens to the range it always
--     stood for. That means people who edited their week and people who only
--     ever onboarded still match each other, with no data migration.
--     Mirrors BLOCK_HOURS in lib/schedule.ts — keep the two in step.
--
--     Returns null for anything unrecognised or inverted, and null never
--     overlaps, so a bad slot is ignored rather than matching everyone.
-- ---------------------------------------------------------------------------
create or replace function public.block_range(block text)
returns numrange
language plpgsql
immutable
as $$
declare
  t  text := lower(trim(coalesce(block, '')));
  lo numeric;
  hi numeric;
begin
  -- Exact hours, e.g. '07:00-09:00' or '7:00 - 9:30'.
  if t ~ '^[0-9]{1,2}:[0-9]{2}\s*-\s*[0-9]{1,2}:[0-9]{2}$' then
    lo := trim(split_part(split_part(t, '-', 1), ':', 1))::numeric
        + trim(split_part(split_part(t, '-', 1), ':', 2))::numeric / 60;
    hi := trim(split_part(split_part(t, '-', 2), ':', 1))::numeric
        + trim(split_part(split_part(t, '-', 2), ':', 2))::numeric / 60;
    if hi <= lo then
      return null;
    end if;
    return numrange(lo, hi);
  end if;

  return case t
    when 'early am' then numrange(5, 8)    -- 5–8 AM
    when 'am'       then numrange(8, 11)   -- 8–11 AM
    when 'midday'   then numrange(11, 14)  -- 11 AM–2 PM
    when 'pm'       then numrange(14, 18)  -- 2–6 PM
    when 'late pm'  then numrange(18, 22)  -- 6–10 PM
    else null
  end;
end;
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
-- Wrappers before the engine, engine before the view — each depends on the next.
drop function if exists public.match_browse(uuid);
drop function if exists public.match_browse(uuid, text, text[], text, text, text);
drop function if exists public.match_session_search(uuid, text, text, text, text, text);
drop function if exists public.match_session_search(uuid, text, text, numeric, text, text, text);
drop function if exists public.match_session_search(uuid, text, text, numeric, text, text, text, text, text[]);
drop function if exists public.match_pair(uuid, uuid);
drop function if exists public.match_candidates(uuid);
drop view if exists public.match_profiles;

create view public.match_profiles as
select
  p.id,
  coalesce(p.data->>'name', '')                                   as name,
  coalesce(nullif(p.data->>'university', ''), 'harvard')          as university_id,
  lower(coalesce(p.data->>'sex', ''))                             as gender,
  lower(coalesce(nullif(p.data->>'partnerPreference', ''), 'any')) as partner_pref,
  lower(coalesce(p.data->>'trainingType', ''))                   as training_type,
  lower(coalesce(p.data->>'primaryActivity', ''))               as primary_activity,
  /*
    EVERYTHING they do — their main activity plus whatever they added on the
    "anything else you do?" screen — as one array of keys.

    This is what lets matching ask "do they do running at all" instead of "is
    running their main thing". The old question made somebody who lifts first
    and runs twice a week invisible to every single running search, forever.
  */
  (
    select coalesce(jsonb_agg(a.val), '[]'::jsonb)
    from (
      select lower(nullif(p.data->>'primaryActivity', '')) as val
      union
      select lower(nullif(o->>'key', ''))
      from jsonb_array_elements(coalesce(p.data->'otherActivities', '[]'::jsonb)) o
    ) a
    where a.val is not null
  )                                                              as activities,
  -- The extras in full, because they carry the "3x a week" the UI quotes back.
  coalesce(p.data->'otherActivities', '[]'::jsonb)              as other_activities,
  p.data->>'experienceLevel'                                     as level,
  /*
    How practised they are, 1-3. Experience level is a GYM question — a runner
    is asked how long they have been running instead, and until now that answer
    never reached the score, so every runner in the app silently forfeited the
    12 points this component is worth. Read whichever question they were
    actually asked.
  */
  case
    when lower(coalesce(p.data->>'primaryActivity', '')) = 'running'
      then case p.data->>'runningExperience'
             when 'Just started' then 1
             when 'Under a year' then 1
             when '1-3 years'    then 2
             when '1–3 years' then 2
             when '3+ years'     then 3
             else null
           end
    else case lower(coalesce(p.data->>'experienceLevel', ''))
           when 'beginner' then 1
           when 'intermediate' then 2
           when 'advanced' then 3
           else null
         end
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
-- 4. THE ENGINE — match_candidates(searcher_id)
--    Scores the searcher against every candidate who clears the shared gates,
--    ONCE. Returns each score component separately, the real overlapping facts
--    behind those components, and the raw fields the wrappers filter on.
--
--    It does NOT total the score and does NOT order — those differ per surface
--    (browse counts schedule, session search doesn't), so the wrappers decide.
--
--    WEIGHTS (change them HERE and every surface follows):
--      AFFINITY  (50): interests 18 | concentration 12 | origin 12 | languages 8
--      LOGISTICS (50): activity 12 | gym 12 | level 12 | schedule 8 | training 6
--
--    WHY THE WEIGHTS MOVED: until now the gym BUILDING you go to was worth 20
--    points and what you actually DO there was worth nothing at all, which is
--    backwards. The three logistics questions — what you do, where, and at what
--    level — are each worth the same 12 now, and the 6 points that funded it
--    came off shared interests, which was the single heaviest thing in the app.
-- ============================================================================
create or replace function public.match_candidates(searcher_id uuid)
returns table (
  candidate_id       uuid,
  name               text,
  level              text,
  residence          text,
  -- score components
  interests_pts      numeric,
  concentration_pts  numeric,
  origin_pts         numeric,
  languages_pts      numeric,
  gym_pts            numeric,
  level_pts          numeric,
  schedule_pts       numeric,
  training_pts       numeric,
  activity_pts       numeric,
  -- the facts behind those components (what the UI shows as reasons)
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
  -- internal: the candidate's own values, so the wrappers can filter on them.
  -- No wrapper returns these to the client.
  c_concentration    text,
  c_activities       jsonb,
  c_gender           text,
  c_interests        jsonb,
  c_top_gyms         jsonb,
  c_schedule         jsonb
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

    round(comp.interests, 1),
    round(comp.concentration, 1),
    round(comp.origin, 1),
    round(comp.languages, 1),
    round(comp.gym, 1),
    round(comp.level, 1),
    round(comp.schedule, 1),
    round(comp.training, 1),
    round(comp.activity, 1),

    comp.shared_interests,
    comp.shared_languages,
    -- Only name the concentration when it actually matched.
    case when me.concentration is not null and me.concentration = c.concentration
         then c.concentration end,
    -- Country first; region only when the countries DIFFER, so two Czechs are
    -- never described as merely "both from Europe".
    case when me.country is not null and me.country = c.country
         then c.country end,
    case when me.region is not null and me.region = c.region
          and me.country is distinct from c.country
         then c.region end,
    comp.shared_gym,
    comp.level_note,
    comp.shared_activity,
    comp.activity_note,
    freq.their_freq,

    c.concentration,
    c.activities,
    c.gender,
    c.interests,
    c.top_gyms,
    c.schedule
  from me, public.match_profiles c
  cross join lateral (
    select
      -- Shared interests: 18 pts, full at 4+ overlapping.
      18 * least((
        select count(*)
        from jsonb_array_elements_text(me.interests) as x(val)
        join jsonb_array_elements_text(c.interests)  as y(val) on x.val = y.val
      ), 4) / 4.0 as interests,

      -- ...and the interests themselves, for the "why" line on the card.
      (
        select coalesce(array_agg(x.val order by x.val), '{}'::text[])
        from jsonb_array_elements_text(me.interests) as x(val)
        join jsonb_array_elements_text(c.interests)  as y(val) on x.val = y.val
      ) as shared_interests,

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
        from jsonb_array_elements_text(me.languages) as x(val)
        join jsonb_array_elements_text(c.languages)  as y(val) on x.val = y.val
      ), 3) / 3.0 as languages,

      (
        select coalesce(array_agg(x.val order by x.val), '{}'::text[])
        from jsonb_array_elements_text(me.languages) as x(val)
        join jsonb_array_elements_text(c.languages)  as y(val) on x.val = y.val
      ) as shared_languages,

      -- Gym overlap, rank-aware: 12 pts. For each gym both list in their top 3,
      -- rank 1 is worth 3, rank 2 -> 2, rank 3 -> 1; add the two users' rank
      -- weights (max 6 = both rank 1) and take the best shared gym. None = 0.
      coalesce((
        select 12 * max((4 - s.ord) + (4 - cc.ord)) / 6.0
        from jsonb_array_elements_text(me.top_gyms) with ordinality s(gym, ord)
        join jsonb_array_elements_text(c.top_gyms)  with ordinality cc(gym, ord)
          on s.gym = cc.gym
        where s.ord <= 3 and cc.ord <= 3
      ), 0) as gym,

      -- ...and WHICH gym that was — the best-ranked one they share.
      (
        select s.gym
        from jsonb_array_elements_text(me.top_gyms) with ordinality s(gym, ord)
        join jsonb_array_elements_text(c.top_gyms)  with ordinality cc(gym, ord)
          on s.gym = cc.gym
        where s.ord <= 3 and cc.ord <= 3
        order by (4 - s.ord) + (4 - cc.ord) desc, s.ord
        limit 1
      ) as shared_gym,

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

      -- Which of those cases fired, so the UI can word it correctly instead of
      -- guessing from the points alone.
      case
        when me.level_rank is null or c.level_rank is null then null
        when me.level_rank = c.level_rank then 'same'
        when abs(me.level_rank - c.level_rank) >= 1
             and ((me.level_rank > c.level_rank and me.give_mentor    and c.receive_mentor)
               or (c.level_rank > me.level_rank and c.give_mentor    and me.receive_mentor))
          then 'mentor'
        when abs(me.level_rank - c.level_rank) = 1 then 'close'
        else null
      end as level_note,

      -- Schedule overlap: 8 pts (deliberately low), full at 3+ shared slots.
      --
      -- Compared as overlapping RANGES on the same day, not as identical text.
      -- Text equality only worked while everyone stored the same five block
      -- names; with exact hours it scores '07:00-09:00' against '07:30-09:30'
      -- as no overlap at all, which is plainly wrong, and never matches an
      -- hours profile with a blocks one. Counts DISTINCT slots of mine that
      -- overlap at least one of theirs, so one long slot spanning several of
      -- theirs still counts once.
      8 * least((
        select count(*)
        from (
          select distinct sx.d, sx.b
          from (
            select je.key as d, v as b
            from jsonb_each(me.schedule) je
            cross join jsonb_array_elements_text(je.value) v
          ) sx
          join (
            select je.key as d, v as b
            from jsonb_each(c.schedule) je
            cross join jsonb_array_elements_text(je.value) v
          ) cx
            on sx.d = cx.d
           and public.block_range(sx.b) && public.block_range(cx.b)
        ) matched
      ), 3) / 3.0 as schedule,

      /*
        WHAT YOU ACTUALLY DO TOGETHER: 12 pts.

        Rank-aware, in the same spirit as the gym. Sharing your MAIN activity is
        the real thing and scores full. Being someone's side activity is worth
        most of it — a gym-first person really can run with a runner, they just
        do it less often. Two people who each do it on the side score least. And
        sharing nothing scores 0 WITHOUT being excluded: a lifter and a runner
        from the same town, in the same concentration, are still worth knowing.
        They just shouldn't be at the top of each other's list.
      */
      case
        when me.primary_activity <> '' and me.primary_activity = c.primary_activity then 12
        when me.primary_activity <> '' and c.activities ? me.primary_activity then 8
        when c.primary_activity  <> '' and me.activities ? c.primary_activity then 8
        when exists (
          select 1 from jsonb_array_elements_text(me.activities) x(val)
          where c.activities ? x.val
        ) then 5
        else 0
      end as activity,

      -- WHICH activity that was. Their main one wins ties, because that is the
      -- one they can actually be relied on to turn up for.
      case
        when me.primary_activity <> '' and me.primary_activity = c.primary_activity
          then me.primary_activity
        when c.primary_activity <> '' and me.activities ? c.primary_activity
          then c.primary_activity
        when me.primary_activity <> '' and c.activities ? me.primary_activity
          then me.primary_activity
        else (
          select x.val from jsonb_array_elements_text(me.activities) x(val)
          where c.activities ? x.val limit 1
        )
      end as shared_activity,

      -- ...and in what SHAPE, so the UI words it honestly instead of guessing
      -- from the points. "You both run" and "she runs too" are not the same
      -- sentence and shouldn't be written by the same line of code.
      case
        when me.primary_activity <> '' and me.primary_activity = c.primary_activity then 'both_main'
        when c.primary_activity  <> '' and me.activities ? c.primary_activity then 'their_main'
        when me.primary_activity <> '' and c.activities ? me.primary_activity then 'they_also'
        when exists (
          select 1 from jsonb_array_elements_text(me.activities) x(val)
          where c.activities ? x.val
        ) then 'both_side'
        else null
      end as activity_note,

      -- Training-type alignment: 6 pts. Both flexible (partner/either) = 6.
      case
        when me.training_type in ('partner', 'either')
         and c.training_type  in ('partner', 'either') then 6
        when c.training_type in ('partner', 'either')   then 3
        else 0
      end as training
  ) comp
  /*
    How often THEY do the activity the two of you share — "3x a week", straight
    off their "anything else you do?" answer. Only their extras carry a
    frequency; a main activity has none, because that screen asks about it in
    full and never asks for a number.
  */
  cross join lateral (
    select (
      select o->>'perWeek'
      from jsonb_array_elements(c.other_activities) o
      where lower(o->>'key') = comp.shared_activity
        and coalesce(o->>'perWeek', '') <> ''
      limit 1
    ) as their_freq
  ) freq
  where c.id <> me.id
    and c.university_id = me.university_id
    and c.training_type is distinct from 'solo'
    and public.pref_allows(me.partner_pref, c.gender)
    and public.pref_allows(c.partner_pref, me.gender);
$$;

-- ============================================================================
-- 5. match_browse(...) — every compatible partner, scored out of 100, best
--    first. Every filter is OPTIONAL; null means "don't narrow on this".
--
--      concentration_filter — only people concentrating in this subject.
--      interests_filter     — only people into at least ONE of these. Picking
--                             more interests therefore WIDENS the net; the
--                             score still floats people sharing more to the top.
--      gym_filter / level_filter / gender_filter — as before.
-- ============================================================================
create or replace function public.match_browse(
  searcher_id          uuid,
  concentration_filter text   default null,
  interests_filter     text[] default null,
  gym_filter           text   default null,
  level_filter         text   default null,
  gender_filter        text   default null
)
returns table (
  candidate_id       uuid,
  name               text,
  level              text,
  residence          text,
  score              numeric,
  interests_pts      numeric,
  concentration_pts  numeric,
  origin_pts         numeric,
  languages_pts      numeric,
  gym_pts            numeric,
  level_pts          numeric,
  activity_pts       numeric,
  schedule_pts       numeric,
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
  their_activity_freq text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.candidate_id, m.name, m.level, m.residence,
    round(m.interests_pts + m.concentration_pts + m.origin_pts + m.languages_pts
        + m.gym_pts + m.level_pts + m.schedule_pts + m.training_pts
        + m.activity_pts, 1) as total,
    m.interests_pts, m.concentration_pts, m.origin_pts, m.languages_pts,
    m.gym_pts, m.level_pts, m.activity_pts, m.schedule_pts, m.training_pts,
    m.shared_interests, m.shared_languages, m.same_concentration,
    m.shared_country, m.shared_region, m.shared_gym, m.level_note,
    m.shared_activity, m.activity_note, m.their_activity_freq
  from public.match_candidates(searcher_id) m
  where (concentration_filter is null or m.c_concentration = concentration_filter)
    and (interests_filter is null or exists (
          select 1 from jsonb_array_elements_text(m.c_interests) as z(val)
          where z.val = any (interests_filter)))
    and (gym_filter    is null or m.c_top_gyms ? gym_filter)
    and (level_filter  is null or m.level      = level_filter)
    and (gender_filter is null or m.c_gender   = lower(gender_filter))
  order by total desc;
$$;

-- ============================================================================
-- 6. match_session_search(...) — "find me a partner doing THIS activity, on
--    THIS day, around THIS hour."
--
--    REQUIRED inputs (the search makes no sense without them):
--      activity_filter — 'gym'|'running'|'cardio'|'other'; everyone who does
--                        this at all, whether it is their main thing or one of
--                        the extras they added in onboarding.
--      target_day      — a day key: 'mon'..'sun'.
--      target_hour     — the hour you want to train, 24h clock, 30-min steps OK
--                        (e.g. 15 = 3 PM, 15.5 = 3:30 PM). A candidate qualifies
--                        if ANY of their free-time blocks that day overlaps the
--                        window [target_hour - 2, target_hour + 2] — so 3 PM
--                        also surfaces people free at, say, 1 PM or 5 PM.
--
--    OPTIONAL inputs (null = no filter), set in the on-screen filter sheet:
--      gym / level / gender / concentration / interests — as in match_browse.
--
--    Survivors are ranked by the SAME score MINUS the schedule component (the
--    slot is already fixed), so the max here is 92. Activity IS still scored
--    even though it was filtered on: somebody whose MAIN thing is running is a
--    better running partner than somebody who runs on the side, and the ranking
--    should say so.
-- ============================================================================
create or replace function public.match_session_search(
  searcher_id          uuid,
  activity_filter      text,
  target_day           text,
  target_hour          numeric,
  gym_filter           text   default null,
  level_filter         text   default null,
  gender_filter        text   default null,
  concentration_filter text   default null,
  interests_filter     text[] default null
)
returns table (
  candidate_id       uuid,
  name               text,
  level              text,
  residence          text,
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
  their_activity_freq text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.candidate_id, m.name, m.level, m.residence,
    round(m.interests_pts + m.concentration_pts + m.origin_pts + m.languages_pts
        + m.gym_pts + m.level_pts + m.training_pts + m.activity_pts, 1) as total,
    m.interests_pts, m.concentration_pts, m.origin_pts, m.languages_pts,
    m.gym_pts, m.level_pts, m.activity_pts, m.training_pts,
    m.shared_interests, m.shared_languages, m.same_concentration,
    m.shared_country, m.shared_region, m.shared_gym, m.level_note,
    m.shared_activity, m.activity_note, m.their_activity_freq
  from public.match_candidates(searcher_id) m
  -- "Do they do this AT ALL", not "is it their main thing". That one word is
  -- the whole fix: a gym-first person who also runs twice a week is now
  -- findable by somebody looking for a running partner.
  where m.c_activities ? lower(activity_filter)
    and exists (
      select 1
      from jsonb_array_elements_text(
             coalesce(m.c_schedule -> target_day, '[]'::jsonb)
           ) b
      where public.block_range(b) && numrange(target_hour - 2, target_hour + 2)
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

-- ============================================================================
-- 7. match_pair(searcher_id, other_id) — the SAME row for exactly one person.
--    Powers the "Why you match" block on someone's profile, so the reasons
--    survive a refresh or a shared link instead of being carried in the URL.
--    Scored out of 100 (schedule included) like browse. Returns no rows when
--    the two don't pass the shared gates — the profile then shows no reasons.
-- ============================================================================
create or replace function public.match_pair(searcher_id uuid, other_id uuid)
returns table (
  candidate_id       uuid,
  name               text,
  level              text,
  residence          text,
  score              numeric,
  interests_pts      numeric,
  concentration_pts  numeric,
  origin_pts         numeric,
  languages_pts      numeric,
  gym_pts            numeric,
  level_pts          numeric,
  activity_pts       numeric,
  schedule_pts       numeric,
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
  their_activity_freq text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.candidate_id, m.name, m.level, m.residence,
    round(m.interests_pts + m.concentration_pts + m.origin_pts + m.languages_pts
        + m.gym_pts + m.level_pts + m.schedule_pts + m.training_pts
        + m.activity_pts, 1),
    m.interests_pts, m.concentration_pts, m.origin_pts, m.languages_pts,
    m.gym_pts, m.level_pts, m.activity_pts, m.schedule_pts, m.training_pts,
    m.shared_interests, m.shared_languages, m.same_concentration,
    m.shared_country, m.shared_region, m.shared_gym, m.level_note,
    m.shared_activity, m.activity_note, m.their_activity_freq
  from public.match_candidates(searcher_id) m
  where m.candidate_id = other_id;
$$;

-- ---------------------------------------------------------------------------
-- 8. Let signed-in users call the three wrappers via Supabase RPC. The engine
--    stays private: it exposes each candidate's unfiltered interests and
--    schedule so the wrappers can filter on them, and nothing outside this file
--    should read those. The wrappers are SECURITY DEFINER, so they can still
--    call it.
-- ---------------------------------------------------------------------------
revoke all on function public.match_candidates(uuid) from public;

grant execute on function public.match_browse(uuid, text, text[], text, text, text)
  to authenticated;
grant execute on function public.match_session_search(
  uuid, text, text, numeric, text, text, text, text, text[]
) to authenticated;
grant execute on function public.match_pair(uuid, uuid) to authenticated;
