-- ============================================================================
-- UNIsport — MARTIN HOUSKA on the Match tab, first card (landing screenshots)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   One more invented-but-true person in the demo campus: the owner himself,
--   as the student the demo account (martinhouska701@gmail.com) meets first
--   when it opens Match → Browse. Owner, 2026-09-15: "Martin Houska will appear
--   only on the Match tab, as the first one — interested in business, startups,
--   social media and AI, doing Economics, speaks Czech, trains in Quincy."
--
-- HOW HE COMES FIRST
--   Browse sorts by match_candidates() (db/matching.sql): shared interests 18,
--   same concentration 12, same country 12, shared languages 8, shared gym 12,
--   level 12, schedule the rest. Nothing is pinned — this profile simply shares
--   the demo account's real answers wherever that is compatible with the
--   owner's facts: his gyms are Quincy PLUS the account's own top gyms, his
--   schedule is the account's schedule, his level is the account's level, and
--   up to three of the account's interests are appended to his own five.
--   Whatever the account answered, he scores at or near the top.
--
-- SAFE TO RE-RUN
--   Deletes and recreates its own row (id de11a015…, the same de11a… family as
--   db/seed_demo.sql, so seed_demo_undo.sql removes him too). NOTE: re-running
--   db/seed_demo.sql wipes every de11a… person and re-creates only its own 14 —
--   run THIS file again afterwards.
--
--   The account has to exist and have finished onboarding, like every seed.
-- ============================================================================

do $$
declare
  demo_email constant text := 'martinhouska701@gmail.com';
  me         uuid;
  my         jsonb;
  my_gyms    jsonb;
  my_ints    jsonb;
  my_sched   jsonb;
  my_level   text;
  mh         constant uuid := 'de11a015-0000-4000-8000-000000000015';
  gyms       jsonb;
  ints       jsonb;
begin
  select u.id into me from auth.users u where lower(u.email) = lower(demo_email);
  if me is null then
    raise exception 'No account for % — sign up in the app with that email first.', demo_email;
  end if;
  select p.data into my from public.profiles p where p.id = me and p.onboarding_completed;
  if my is null then
    raise exception 'The account % has not finished onboarding — finish it in the app, then re-run.', demo_email;
  end if;

  my_gyms  := coalesce(my->'topGyms', '[]'::jsonb);
  my_ints  := coalesce(my->'interests', '[]'::jsonb);
  my_sched := coalesce(my->'trainingSchedule', '{"mon":["PM"],"wed":["PM"],"fri":["PM"],"sat":["AM"]}'::jsonb);
  my_level := coalesce(nullif(my->>'experienceLevel', ''), 'advanced');

  -- Quincy first (his own gym), then the account's gyms, no repeats, top 3.
  gyms := (
    select coalesce(jsonb_agg(g order by ord), '[]'::jsonb)
    from (
      select g, min(ord) as ord
      from (
        select 'Quincy'::text as g, 0::bigint as ord
        union all
        select value, ordinality from jsonb_array_elements_text(my_gyms) with ordinality
      ) x
      group by g
      order by min(ord)
      limit 3
    ) t
  );

  -- His five, then up to three of the account's, no repeats.
  ints := (
    select coalesce(jsonb_agg(i order by ord), '[]'::jsonb)
    from (
      select i, min(ord) as ord
      from (
        select v.i, v.ord::bigint
        from (values ('Business',1),('Startups',2),('Tech',3),('Social media',4),('AI',5)) v(i, ord)
        union all
        select s.value, 10 + s.ordinality
        from (select * from jsonb_array_elements_text(my_ints) with ordinality limit 3) s
      ) x
      group by i
    ) t
  );

  -- Start clean: the same cascade seed_demo.sql relies on (auth.users → profiles).
  delete from public.follows where follower_id = mh or followee_id = mh;
  delete from auth.users where id = mh;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000', mh, 'authenticated', 'authenticated',
    'martin.houska@demo.unisport.test', null,
    now(), now() - interval '120 days', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', 'Martin Houska')
  );

  insert into public.profiles (id, data, onboarding_completed, updated_at)
  values (
    mh,
    jsonb_build_object(
      'name',              'Martin Houska',
      'classYear',         '''28',
      'sex',               'Male',
      'residence',         'Quincy',
      'primaryActivity',   'gym',
      'activityOther',     '',
      'experienceLevel',   my_level,
      'gymSplit',          'Full body',
      'runningDistance',   '',
      'runningPace',       '',
      'cardioType',        '',
      -- A rower who lifts: rowing is the other thing he does (OtherActivity in
      -- lib/onboarding.ts — key, how often, days, note).
      'otherActivities',   '[{"key":"cardio","perWeek":"5+","days":[],"note":"Rowing"}]'::jsonb,
      'topGyms',           gyms,
      'trainingSchedule',  my_sched,
      'concentration',     'Economics',
      'hometownCity',      'Prague',
      'hometownCountry',   'Czechia',
      'languages',         '["English","Czech"]'::jsonb,
      'interests',         ints,
      'trainingType',      'either',
      'partnerPreference', 'any',
      'mentorFreshmen',    true,
      'beMentored',        false,
      'helpOthers',        true,
      'getHelp',           false,
      'bio',               'Rower from Prague, Economics concentrator. Lift at Quincy between practices. Building things on the side — startups, social media, AI.',
      'photo',             null
    ),
    true,
    now() - interval '2 days'
  );

  raise notice 'Martin Houska is on the campus (gyms %, interests %).', gyms, ints;
end $$;
