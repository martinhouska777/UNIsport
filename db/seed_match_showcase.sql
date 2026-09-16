-- ============================================================================
-- UNIsport — MATCH TAB SHOWCASE (landing screenshots)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   Owner, 2026-09-16: Martin Houska first on the demo account's Match tab,
--   then a spread of different people — not everyone Economics, not everyone
--   at the Malkin Athletic Center. Two things:
--
--   1. HIDES three accounts from Match (trainingType → "solo", the same switch
--      as "Do you prefer to train alone?" in onboarding). They are the owner's
--      own accounts: martinhouska777 (his real one — it was a second "Martin
--      Houska" card), martinhouska702 ("Demetrios") and plapham@… ("Pierce
--      Lapper"), which carry real friends' names and can't be in a public
--      picture. Their previous answer is saved in data.trainingTypeBeforeShowcase
--      so db/seed_match_showcase_undo.sql can put it back.
--
--   2. ADDS eight invented students (ids de11a016…de11a023, the same de11a…
--      family as db/seed_demo.sql, so seed_demo_undo.sql removes them too).
--      Each has a different concentration, house, home country, gym and set of
--      interests. They rank high for the demo account (martinhouska701, "John
--      Brown") honestly: through the scorer in db/matching.sql — shared
--      schedule, mentoring, a shared interest or language — never pinned.
--
-- SAFE TO RE-RUN. Run db/seed_martin_match.sql first if Martin is missing.
-- ============================================================================

-- 1. Hide the three real accounts from Match -----------------------------------
update public.profiles p
set data = p.data
  || jsonb_build_object('trainingTypeBeforeShowcase',
       coalesce(p.data->'trainingTypeBeforeShowcase', p.data->'trainingType', 'null'::jsonb))
  || '{"trainingType":"solo"}'::jsonb
from auth.users u
where u.id = p.id
  and lower(u.email) in (
    'martinhouska777@gmail.com',
    'martinhouska702@gmail.com',
    'plapham@college.harvard.edg'
  );

-- 2. Eight different students -------------------------------------------------
do $$
declare
  demo_email constant text := 'martinhouska701@gmail.com';
  me       uuid;
  my_sched jsonb;
  r        record;
begin
  select u.id into me from auth.users u where lower(u.email) = lower(demo_email);
  if me is null then
    raise exception 'No account for % — sign up in the app with that email first.', demo_email;
  end if;
  -- Everyone trains at least partly when the demo account does, so the week
  -- lines up; each person then adds a slot of their own.
  select coalesce(p.data->'trainingSchedule', '{}'::jsonb) into my_sched
  from public.profiles p where p.id = me;

  for r in
    select * from (values
      ('de11a016-0000-4000-8000-000000000016'::uuid, 'Leah Goldberg',  'Female', '''27', 'Eliot',
       'Computer Science', 'Tel Aviv', 'Israel',
       'gym', 'advanced', '', '',
       '["Eliot","Hemenway Gymnasium","Malkin Athletic Center"]'::jsonb,
       '["Startups","Finance","Climbing","Coffee","Podcasts"]'::jsonb,
       '["English","Hebrew","German"]'::jsonb,
       '[{"key":"running","perWeek":"2×","days":[],"note":""}]'::jsonb,
       '{"sat":["10:00-12:00"]}'::jsonb,
       'CS junior, ex-army climber. Happy to spot and to show a beginner around the free weights.'),

      ('de11a017-0000-4000-8000-000000000017'::uuid, 'Kwame Mensah',   'Male',   '''28', 'Currier',
       'Applied Mathematics', 'Accra', 'Ghana',
       'running', '', '', '3+ years',
       '["Malkin Athletic Center","Currier"]'::jsonb,
       '["Investing","Finance","Startups","Chess","Music"]'::jsonb,
       '["English","French"]'::jsonb,
       '[{"key":"gym","perWeek":"3×","days":[],"note":"Legs + core"}]'::jsonb,
       '{"sun":["07:00-09:00"]}'::jsonb,
       'Distance runner from Accra. River loop before class, lift three times a week. Always up for a chess game after.'),

      ('de11a018-0000-4000-8000-000000000018'::uuid, 'Sofía Ramírez',  'Female', '''29', 'Dunster',
       'Government', 'Madrid', 'Spain',
       'gym', 'intermediate', '', '',
       '["Dunster","Murr Center","Malkin Athletic Center"]'::jsonb,
       '["Politics","Travel","Dance","Business","Finance"]'::jsonb,
       '["English","Spanish","German"]'::jsonb,
       '[{"key":"cardio","perWeek":"2×","days":[],"note":"Swimming"}]'::jsonb,
       '{"thu":["17:00-19:00"]}'::jsonb,
       'Government sophomore from Madrid. Lifting at Dunster and the MAC, swimming when I can. Looking for someone to keep me consistent.'),

      ('de11a019-0000-4000-8000-000000000019'::uuid, 'Hiroshi Tanaka', 'Male',   '''30', 'Weld',
       'Mechanical Engineering', 'Osaka', 'Japan',
       'gym', 'beginner', '', '',
       '["Murr Center","Malkin Athletic Center","Hemenway Gymnasium"]'::jsonb,
       '["Martial Arts","Gaming","Cooking","Startups","Business"]'::jsonb,
       '["English","Japanese"]'::jsonb,
       '[{"key":"other","perWeek":"2×","days":[],"note":"Judo"}]'::jsonb,
       '{"sat":["14:00-16:00"]}'::jsonb,
       'First-year in Weld. Did judo back home, new to the weight room. Will cook for a good training partner.'),

      ('de11a020-0000-4000-8000-000000000020'::uuid, 'Adaeze Nwosu',   'Female', '''27', 'Winthrop',
       'Neuroscience', 'Lagos', 'Nigeria',
       'gym', 'intermediate', '', '',
       '["Winthrop","Malkin Athletic Center"]'::jsonb,
       '["Yoga","Science","Reading","Startups","Finance"]'::jsonb,
       '["English","French"]'::jsonb,
       '[{"key":"other","perWeek":"2×","days":[],"note":"Yoga"}]'::jsonb,
       '{"tue":["18:00-20:00"]}'::jsonb,
       'Neuro senior, lab mornings, gym in between. Upper-lower split at the MAC and a lot of yoga.'),

      ('de11a021-0000-4000-8000-000000000021'::uuid, 'Inès Moreau',    'Female', '''28', 'Lowell',
       'History of Art & Architecture', 'Lyon', 'France',
       'gym', 'advanced', '', '',
       '["Lowell","Malkin Athletic Center"]'::jsonb,
       '["Art","Photography","Fashion","Finance","Business"]'::jsonb,
       '["English","French","German"]'::jsonb,
       '[{"key":"cardio","perWeek":"3×","days":[],"note":"Cycling"}]'::jsonb,
       '{"sun":["10:00-12:00"]}'::jsonb,
       'Art history junior from Lyon. Powerlifting at Lowell, cycling to the museums. Glad to teach the big three.'),

      ('de11a022-0000-4000-8000-000000000022'::uuid, 'Arjun Mehta',    'Male',   '''28', 'Mather',
       'Public Policy', 'Mumbai', 'India',
       'gym', 'intermediate', '', '',
       '["Mather","Malkin Athletic Center","Hemenway Gymnasium"]'::jsonb,
       '["Sustainability","Volunteering","Foodie","Business","Startups"]'::jsonb,
       '["English","Hindi"]'::jsonb,
       '[{"key":"running","perWeek":"1×","days":[],"note":""}]'::jsonb,
       '{"wed":["19:00-21:00"]}'::jsonb,
       'Public policy, climate work, cricket at heart. Push-pull-legs at Mather, the MAC when it is empty.'),

      ('de11a023-0000-4000-8000-000000000023'::uuid, 'Emma Callahan',  'Female', '''30', 'Hollis',
       'History & Literature', 'Denver', 'United States',
       'running', '', '', 'Under a year',
       '["Malkin Athletic Center","Murr Center"]'::jsonb,
       '["Writing","Film","Hiking","Startups","Finance"]'::jsonb,
       '["English","Spanish","German"]'::jsonb,
       '[{"key":"gym","perWeek":"2×","days":[],"note":""}]'::jsonb,
       '{"sat":["08:00-10:00"]}'::jsonb,
       'First-year in Hollis training for my first half marathon. Mountains girl, writing a lot, lifting a little.')
    ) v(id, name, sex, class_year, residence, concentration, city, country,
        activity, level, cardio, run_exp, gyms, interests, languages, others, extra_sched, bio)
  loop
    delete from public.follows where follower_id = r.id or followee_id = r.id;
    delete from auth.users where id = r.id;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    ) values (
      '00000000-0000-0000-0000-000000000000', r.id, 'authenticated', 'authenticated',
      'showcase' || right(r.id::text, 2) || '@demo.unisport.test', null,
      now(), now() - interval '90 days', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', r.name)
    );

    insert into public.profiles (id, data, onboarding_completed, updated_at)
    values (
      r.id,
      jsonb_build_object(
        'name',              r.name,
        'university',        'harvard',
        'classYear',         r.class_year,
        'sex',               r.sex,
        'residence',         r.residence,
        'primaryActivity',   r.activity,
        'activityOther',     '',
        'experienceLevel',   r.level,
        'gymSplit',          case when r.activity = 'gym' then 'Upper-Lower' else '' end,
        'runningDistance',   '',
        'runningPace',       '',
        'runningExperience', r.run_exp,
        'cardioType',        r.cardio,
        'otherActivities',   r.others,
        'topGyms',           r.gyms,
        'trainingSchedule',  my_sched || r.extra_sched,
        'concentration',     r.concentration,
        'hometownCity',      r.city,
        'hometownCountry',   r.country,
        'languages',         r.languages,
        'interests',         r.interests,
        'trainingType',      'either',
        'partnerPreference', 'any',
        'mentorFreshmen',    false,
        'beMentored',        false,
        'helpOthers',        r.level in ('intermediate', 'advanced') or r.run_exp = '3+ years',
        'getHelp',           false,
        'bio',               r.bio,
        'photo',             null
      ),
      true,
      now() - interval '3 days'
    );
  end loop;

  raise notice 'Match showcase: 3 accounts hidden, 8 students added.';
end $$;
