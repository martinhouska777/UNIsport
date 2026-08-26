-- ============================================================================
-- UNIsport — FEED FILLER: invented students at the other seven schools
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   The normal-mode feed (db/posts.sql) is the ONE screen that deliberately
--   crosses the wall between universities: Match only ever offers people at
--   your own school, the feed shows every campus. On an empty database that
--   promise is invisible — "All schools" and one Harvard post look identical.
--   This script fills it: 16 invented students at Yale, Princeton, Columbia,
--   Brown, Cornell, Dartmouth, Penn and Harvard, with 26 posts spread over the
--   last six days, some of them shared training sessions, all of them with 💪
--   already on them.
--
--   Everything is INVENTED. No real person's name, message or account is used.
--   The email addresses are made-up names on the real university domains, so
--   they look right in the database; nothing in the app ever displays them.
--   They have NO password, so none of these accounts can ever be logged into.
--
-- WHAT IT DOES NOT DO
--   No photos. A photo is a base64 data URL — a hand-written one would be
--   megabytes of noise in a file meant to be read. The cards show the session,
--   the words and the reactions, which is what this is for.
--
-- WHAT THE OWNER'S OWN ACCOUNT SEES
--   Feed → Everyone → All schools: everything below, newest first.
--   Feed → Everyone → a school chip: just that campus.
--   Feed → Following: NOTHING new — nobody follows these people yet. That is
--   on purpose; following someone from the feed is the thing being shown off,
--   not something a seed should quietly pre-do.
--
-- SAFE TO RE-RUN
--   Every account this writes has an id starting `feeda…`, and the script wipes
--   its own previous run first. Deleting those accounts cascades to their
--   profiles, posts, sessions and reactions, so nothing is left behind and
--   nothing belonging to a real account is ever touched.
--
-- TO REMOVE IT AGAIN
--   Run db/seed_feed_undo.sql.
--
-- NEEDS: db/profiles.sql, db/workout_logs.sql, db/posts.sql, db/posts_workout.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- THE PEOPLE. Edit names / schools / bios here — nothing is hardcoded further
-- down. A plain table rather than a TEMP one because the Supabase SQL editor
-- does not guarantee a temp table survives a whole script; RLS is on with no
-- policies, so no client can ever read it, and the undo drops it.
--
-- `topGyms` is left empty for everyone outside Harvard on purpose: lib/gyms.ts
-- only knows Harvard's gyms, and putting Malkin on a Yale profile would be the
-- one visibly false thing in an otherwise plausible set of people.
-- ---------------------------------------------------------------------------
drop table if exists public.feed_seed_people;
create table public.feed_seed_people (
  id         uuid,
  email      text,
  name       text,
  school     text,      -- lib/themes.ts key
  class_year text,
  sex        text,
  activity   text,
  level      text,
  split      text,
  run_dist   text,
  run_pace   text,
  cardio     text,
  gyms       jsonb,
  conc       text,
  country    text,
  langs      jsonb,
  ints       jsonb,
  bio        text
);
alter table public.feed_seed_people enable row level security;  -- no policies: server-side only

insert into public.feed_seed_people values
('feeda001-0000-4000-8000-000000000001','nora.whitfield@yale.edu','Nora Whitfield','yale','''28','Female',
 'running','intermediate','','10K','5:05 /km','','[]'::jsonb,
 'Government','United States','["English"]','["Running","Coffee","Reading","Politics"]',
 'East Rock loops most mornings. Payne Whitney when it rains.'),

('feeda002-0000-4000-8000-000000000002','elias.brandt@yale.edu','Elias Brandt','yale','''27','Male',
 'gym','advanced','Upper-Lower','','','','[]'::jsonb,
 'Mechanical Engineering','Germany','["English","German"]','["Climbing","Tech","Coffee","Outdoors"]',
 'Payne Whitney regular. Pull day is the good day.'),

('feeda003-0000-4000-8000-000000000003','priyanka.menon@yale.edu','Priyanka Menon','yale','''29','Female',
 'cardio','intermediate','','','','Rowing','[]'::jsonb,
 'Molecular & Cellular Biology','India','["English","Hindi"]','["Science","Music","Foodie"]',
 'Erg between labs. Steady state, headphones, no conversation.'),

('feeda004-0000-4000-8000-000000000004','maya.lindqvist@princeton.edu','Maya Lindqvist','princeton','''29','Female',
 'gym','intermediate','Push-Pull-Legs','','','','[]'::jsonb,
 'Economics','Sweden','["English","Swedish"]','["Coffee","Travel","Climbing","Music"]',
 'Dillon Gym, mostly evenings. Chasing a 100kg squat.'),

('feeda005-0000-4000-8000-000000000005','owen.achebe@princeton.edu','Owen Achebe','princeton','''28','Male',
 'cardio','advanced','','','','Swimming','[]'::jsonb,
 'Computer Science','Nigeria','["English"]','["Tech","Music","Foodie","Gaming"]',
 'Pool five mornings a week. Ask me about flip turns, not about squats.'),

('feeda006-0000-4000-8000-000000000006','ruth.halvorsen@columbia.edu','Ruth Halvorsen','columbia','''27','Female',
 'gym','advanced','Bro split','','','','[]'::jsonb,
 'History of Art & Architecture','Norway','["English","Norwegian"]','["Art","Photography","Coffee"]',
 'Dodge at 6am, because in New York there is no other time.'),

('feeda007-0000-4000-8000-000000000007','diego.marchetti@columbia.edu','Diego Marchetti','columbia','''30','Male',
 'running','beginner','','5K','6:10 /km','','[]'::jsonb,
 'Undecided','Italy','["English","Italian"]','["Running","Cooking","Music"]',
 'First year, first winter, first proper pair of shoes. Riverside Park.'),

('feeda008-0000-4000-8000-000000000008','simone.adeyemi@brown.edu','Simone Adeyemi','brown','''28','Female',
 'gym','intermediate','Full body','','','','[]'::jsonb,
 'Sociology','United States','["English"]','["Dance","Volunteering","Foodie"]',
 'Nelson Fitness Center. Deadlift day is my favourite day.'),

('feeda009-0000-4000-8000-000000000009','tobias.lund@brown.edu','Tobias Lund','brown','''27','Male',
 'cardio','intermediate','','','','Cycling','[]'::jsonb,
 'Environmental Sci. & Engineering','Denmark','["English","Danish"]','["Cycling","Outdoors","Sustainability"]',
 'Out to Bristol and back on Sundays. Always room for one more wheel.'),

('feeda010-0000-4000-8000-000000000010','wes.nakamura@cornell.edu','Wes Nakamura','cornell','''29','Male',
 'gym','intermediate','Upper-Lower','','','','[]'::jsonb,
 'Applied Mathematics','Japan','["English","Japanese"]','["Gaming","Chess","Tech"]',
 'Teagle Hall. Ithaca winters make the gym an easy decision.'),

('feeda011-0000-4000-8000-000000000011','hannah.boateng@cornell.edu','Hannah Boateng','cornell','''28','Female',
 'running','advanced','','Half marathon','4:50 /km','','[]'::jsonb,
 'Government','Ghana','["English"]','["Running","Reading","Politics"]',
 'Gorges in October, treadmill in February. No shame in either.'),

('feeda012-0000-4000-8000-000000000012','annika.solberg@dartmouth.edu','Annika Solberg','dartmouth','''27','Female',
 'cardio','advanced','','','','Rowing','[]'::jsonb,
 'Neuroscience','Norway','["English","Norwegian"]','["Outdoors","Hiking","Science"]',
 'Erg tests and river mornings. Hanover is cold and I have made peace with it.'),

('feeda013-0000-4000-8000-000000000013','marcus.ellery@upenn.edu','Marcus Ellery','penn','''28','Male',
 'gym','advanced','Push-Pull-Legs','','','','[]'::jsonb,
 'Economics','United States','["English"]','["Investing","Podcasts","Coffee"]',
 'Pottruck, 5pm, every weekday. Consistency is the whole trick.'),

('feeda014-0000-4000-8000-000000000014','leila.haddad@upenn.edu','Leila Haddad','penn','''30','Female',
 'gym','beginner','Full body','','','','[]'::jsonb,
 'Undecided','Lebanon','["English","Arabic","French"]','["Art","Cooking","Travel"]',
 'Six weeks in. Still writing the whole session down on my phone.'),

('feeda015-0000-4000-8000-000000000015','julia.reyes@college.harvard.edu','Julia Reyes','harvard','''29','Female',
 'gym','intermediate','Push-Pull-Legs','','','',
 '["Malkin Athletic Center","Hemenway Gymnasium"]',
 'Sociology','Mexico','["English","Spanish"]','["Coffee","Dance","Travel"]',
 'MAC most evenings. Happy to show anyone around who is new to the room.'),

('feeda016-0000-4000-8000-000000000016','theo.lindberg@college.harvard.edu','Theo Lindberg','harvard','''27','Male',
 'running','intermediate','','10K','4:55 /km','',
 '["Hemenway Gymnasium","Malkin Athletic Center"]',
 'Physics','Sweden','["English","Swedish"]','["Running","Science","Podcasts"]',
 'River loops, then whatever is left of me goes to Hemenway.');

-- ---------------------------------------------------------------------------
-- THE POSTS. `hours_ago` is how far back the post is dated — that ordering is
-- the whole feel of the feed, so it is data, not an accident of insert order.
--
-- A row with `w_activity` filled in is a SHARED SESSION: the script writes the
-- workout log first and the post points at it, exactly as the app does when
-- somebody taps "Share to feed" (db/posts_workout.sql). `body` is then the
-- comment written at share time.
-- ---------------------------------------------------------------------------
drop table if exists public.feed_seed_posts;
create table public.feed_seed_posts (
  id          uuid,
  log_id      uuid,      -- filled in only for shared sessions
  author      uuid,
  hours_ago   numeric,
  body        text,
  w_activity  text,      -- 'gym' | 'running' | 'cardio' | null
  w_gym       text,
  w_exercises jsonb,
  w_metrics   jsonb,
  w_note      text
);
alter table public.feed_seed_posts enable row level security;  -- no policies: server-side only

insert into public.feed_seed_posts values
-- ── shared sessions ───────────────────────────────────────────────────────
('feeda1a1-0000-4000-8000-000000000001','feeda1b1-0000-4000-8000-000000000001','feeda002-0000-4000-8000-000000000002',
 5,'Third week of this block and the top set finally stopped feeling heavy.',
 'gym','Payne Whitney Gymnasium',
 '[{"name":"Barbell Row","muscle":"Back","sets":[{"weight":"60","reps":"8","type":"W","done":true},{"weight":"85","reps":"6","done":true},{"weight":"85","reps":"6","done":true},{"weight":"85","reps":"5","done":true}]},
   {"name":"Pull-Up","muscle":"Back","sets":[{"weight":"BW","reps":"10","done":true},{"weight":"BW","reps":"8","done":true},{"weight":"BW","reps":"7","done":true}]},
   {"name":"Face Pull","muscle":"Shoulders","sets":[{"weight":"25","reps":"15","done":true},{"weight":"25","reps":"15","done":true}]}]'::jsonb,
 '{"weightUnit":"kg"}'::jsonb,'Rows moved well.'),

('feeda1a1-0000-4000-8000-000000000002','feeda1b1-0000-4000-8000-000000000002','feeda011-0000-4000-8000-000000000011',
 9,'Six miles before an 8:40 lecture. Would not recommend, would do again.',
 'running','','[]'::jsonb,
 '{"distance":"9.7","unit":"km","duration":"46:30"}'::jsonb,'Cold and flat. Legs fine.'),

('feeda1a1-0000-4000-8000-000000000003','feeda1b1-0000-4000-8000-000000000003','feeda012-0000-4000-8000-000000000012',
 20,'2k test. Not a personal best, but the first one this winter that did not fall apart at 1200m.',
 'cardio','','[]'::jsonb,
 '{"cardioType":"Rowing","distance":"2000","unit":"m","duration":"7:31"}'::jsonb,'Held 1:52 to the last 300.'),

('feeda1a1-0000-4000-8000-000000000004','feeda1b1-0000-4000-8000-000000000004','feeda004-0000-4000-8000-000000000004',
 27,'95kg for five. The 100 is happening before spring break.',
 'gym','Dillon Gymnasium',
 '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"60","reps":"8","type":"W","done":true},{"weight":"85","reps":"5","done":true},{"weight":"95","reps":"5","done":true},{"weight":"95","reps":"5","done":true}]},
   {"name":"Bulgarian Split Squat","muscle":"Legs","sets":[{"weight":"20","reps":"10","done":true},{"weight":"20","reps":"10","done":true}]},
   {"name":"Hamstring Curl","muscle":"Legs","sets":[{"weight":"35","reps":"12","done":true},{"weight":"35","reps":"12","done":true}]}]'::jsonb,
 '{"weightUnit":"kg"}'::jsonb,''),

('feeda1a1-0000-4000-8000-000000000005','feeda1b1-0000-4000-8000-000000000005','feeda005-0000-4000-8000-000000000005',
 34,'Long course morning. The pool was empty and I had four lanes to myself.',
 'cardio','','[]'::jsonb,
 '{"cardioType":"Swimming","distance":"3000","unit":"m","duration":"52:00"}'::jsonb,'Main set 10×200 on 3:00.'),

('feeda1a1-0000-4000-8000-000000000006','feeda1b1-0000-4000-8000-000000000006','feeda008-0000-4000-8000-000000000008',
 50,'First time pulling 100kg off the floor. I have been staring at that number since September.',
 'gym','Nelson Fitness Center',
 '[{"name":"Deadlift","muscle":"Back","sets":[{"weight":"70","reps":"5","type":"W","done":true},{"weight":"90","reps":"3","done":true},{"weight":"100","reps":"1","done":true}]},
   {"name":"Goblet Squat","muscle":"Legs","sets":[{"weight":"24","reps":"12","done":true},{"weight":"24","reps":"12","done":true}]},
   {"name":"Plank","muscle":"Core","sets":[{"weight":"BW","reps":"60s","done":true},{"weight":"BW","reps":"60s","done":true}]}]'::jsonb,
 '{"weightUnit":"kg"}'::jsonb,'Belt on for the single.'),

('feeda1a1-0000-4000-8000-000000000007','feeda1b1-0000-4000-8000-000000000007','feeda016-0000-4000-8000-000000000016',
 62,'Weeks Bridge to the Eliot Bridge and back. Ice on the path by the boathouse — go carefully out there.',
 'running','','[]'::jsonb,
 '{"distance":"11.2","unit":"km","duration":"55:10"}'::jsonb,''),

('feeda1a1-0000-4000-8000-000000000008','feeda1b1-0000-4000-8000-000000000008','feeda013-0000-4000-8000-000000000013',
 77,'Push day. Nothing exciting, which after four years is the entire point.',
 'gym','Pottruck Health & Fitness Center',
 '[{"name":"Bench Press","muscle":"Chest","sets":[{"weight":"60","reps":"8","type":"W","done":true},{"weight":"90","reps":"5","done":true},{"weight":"95","reps":"5","done":true},{"weight":"95","reps":"4","done":true}]},
   {"name":"Overhead Press","muscle":"Shoulders","sets":[{"weight":"50","reps":"6","done":true},{"weight":"50","reps":"6","done":true},{"weight":"50","reps":"5","done":true}]},
   {"name":"Cable Fly","muscle":"Chest","sets":[{"weight":"20","reps":"12","done":true},{"weight":"20","reps":"12","done":true}]}]'::jsonb,
 '{"weightUnit":"kg"}'::jsonb,''),

('feeda1a1-0000-4000-8000-000000000009','feeda1b1-0000-4000-8000-000000000009','feeda007-0000-4000-8000-000000000007',
 88,'Ran the whole 5k without stopping. In October I could not do two.',
 'running','','[]'::jsonb,
 '{"distance":"5.0","unit":"km","duration":"30:40"}'::jsonb,'Riverside Park, south and back.'),

-- ── written posts ─────────────────────────────────────────────────────────
('feeda1a1-0000-4000-8000-000000000010',null,'feeda001-0000-4000-8000-000000000001',
 2,'Anyone else running the New Haven road race in the spring? Looking for someone to do the long runs with — I am slow on purpose on Sundays.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000011',null,'feeda006-0000-4000-8000-000000000006',
 7,'Dodge is shut for the long weekend and I am genuinely unsure what to do with myself.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000012',null,'feeda010-0000-4000-8000-000000000010',
 12,'PSA for anyone at Teagle: the squat racks are free between 2 and 4. I have been coming at 6pm like an idiot all semester.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000013',null,'feeda003-0000-4000-8000-000000000003',
 16,'Three weeks of steady state and my split at the same heart rate has come down by four seconds. Boring works.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000014',null,'feeda015-0000-4000-8000-000000000015',
 23,'If you are a first-year and the weight room feels intimidating: come at 4pm on a Tuesday. It is half empty and nobody is watching you.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000015',null,'feeda009-0000-4000-8000-000000000009',
 31,'60km along the coast this morning, headwind the entire way back. Worth it for the light at the halfway point.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000016',null,'feeda014-0000-4000-8000-000000000014',
 39,'Week six of actually going. The part nobody tells you is that the hardest set is putting your shoes on.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000017',null,'feeda002-0000-4000-8000-000000000002',
 45,'Reading week starts Monday, which means the gym will be empty and I will be in it twice a day like a lunatic.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000018',null,'feeda011-0000-4000-8000-000000000011',
 56,'Half marathon on the 12th of April. The training block starts tomorrow. Somebody please hold me to this.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000019',null,'feeda004-0000-4000-8000-000000000004',
 68,'Swapped to Push-Pull-Legs six weeks ago after two years of full body. Recovery is better, ego is worse.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000020',null,'feeda012-0000-4000-8000-000000000012',
 74,'Minus eleven this morning and the launch was frozen to the dock. Erg it is.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000021',null,'feeda005-0000-4000-8000-000000000005',
 83,'Does anyone in this app actually swim? Every post I see is a squat rack or a river. Say hello, I am lonely over here.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000022',null,'feeda016-0000-4000-8000-000000000016',
 95,'Rest day. Went for a walk instead and told myself it was cross-training.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000023',null,'feeda008-0000-4000-8000-000000000008',
 104,'Two of us and one bar on Monday evenings. If anyone at Brown wants to be the third, the more people counting my reps the better.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000024',null,'feeda013-0000-4000-8000-000000000013',
 112,'Deload week. Every single lift feels like a warm-up and I hate all of it.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000025',null,'feeda007-0000-4000-8000-000000000007',
 126,'Bought proper shoes. Turns out the reason my shins hurt was not "being unfit", it was owning one pair of trainers since 2023.',
 null,null,null,null,null),

('feeda1a1-0000-4000-8000-000000000026',null,'feeda001-0000-4000-8000-000000000001',
 138,'Cold, dark, 6:10am, went anyway. That is the whole post.',
 null,null,null,null,null);

-- ---------------------------------------------------------------------------
-- Write it all.
-- ---------------------------------------------------------------------------
do $$
begin
  -- --- 1. Wipe any previous run of THIS script ------------------------------
  -- One delete is enough: auth.users → profiles → posts / workout_logs /
  -- post_kudos all cascade from it.
  delete from auth.users where id::text like 'feeda%';

  -- --- 2. The accounts ------------------------------------------------------
  -- Minimal auth rows with no password, so none of these can ever be logged
  -- into. Same shape as db/seed_demo.sql.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  )
  select
    '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email, null,
    now(), now() - interval '120 days', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p.name)
  from public.feed_seed_people p;

  -- The profile. `university` is the key a post copies at publish time, and is
  -- the reason a Yale card says Yale (components/feed/PostCard.tsx).
  insert into public.profiles (id, data, onboarding_completed, updated_at)
  select
    p.id,
    jsonb_build_object(
      'name',              p.name,
      'university',        p.school,
      'classYear',         p.class_year,
      'sex',               p.sex,
      'residence',         '',
      'primaryActivity',   p.activity,
      'activityOther',     '',
      'experienceLevel',   p.level,
      'gymSplit',          p.split,
      'runningDistance',   p.run_dist,
      'runningPace',       p.run_pace,
      'cardioType',        p.cardio,
      'topGyms',           p.gyms,
      'trainingSchedule',  '{}'::jsonb,
      'concentration',     p.conc,
      'hometownCountry',   p.country,
      'languages',         p.langs,
      'interests',         p.ints,
      'trainingType',      'either',
      'partnerPreference', 'any',
      'mentorFreshmen',    false,
      'beMentored',        false,
      'helpOthers',        true,
      'getHelp',           p.level = 'beginner',
      'bio',               p.bio,
      'photo',             null
    ),
    true,
    now() - interval '2 days'
  from public.feed_seed_people p;

  -- --- 3. The shared sessions ----------------------------------------------
  -- The log is written first; the post points at it. The log itself stays
  -- private (RLS = own rows only) — the feed reads it through feed_list, which
  -- exposes a curated summary and nothing else.
  insert into public.workout_logs
    (id, user_id, log_date, activity, gym, partner, partner_id, exercises, metrics, photos, note, created_at)
  select
    s.log_id, s.author,
    (now() - (s.hours_ago || ' hours')::interval)::date,
    s.w_activity, nullif(s.w_gym, ''), '', null,
    coalesce(s.w_exercises, '[]'::jsonb),
    coalesce(s.w_metrics, '{}'::jsonb),
    '[]'::jsonb,
    coalesce(s.w_note, ''),
    now() - (s.hours_ago || ' hours')::interval
  from public.feed_seed_posts s
  where s.log_id is not null;

  -- --- 4. The posts ---------------------------------------------------------
  insert into public.posts
    (id, author_id, university_key, body, photo, workout_log_id, created_at)
  select
    s.id, s.author, pe.school, coalesce(s.body, ''), null, s.log_id,
    now() - (s.hours_ago || ' hours')::interval
  from public.feed_seed_posts s
  join public.feed_seed_people pe on pe.id = s.author;

  -- --- 5. 💪 ----------------------------------------------------------------
  -- Between two and eight of the OTHER invented students on each post. Which
  -- ones is decided by a hash of the two ids, so the same script always
  -- produces the same feed — a demo that reshuffles itself on every run is a
  -- demo nobody can point at twice.
  insert into public.post_kudos (post_id, user_id, created_at)
  select p.id, k.id, p.created_at + interval '25 minutes'
  from public.posts p
  join lateral (
    select pe.id
      from public.feed_seed_people pe
     where pe.id <> p.author_id
     order by md5(pe.id::text || p.id::text)
     limit 2 + (get_byte(decode(md5(p.id::text), 'hex'), 0) % 7)
  ) k on true
  where p.author_id::text like 'feeda%'
  on conflict do nothing;

  raise notice 'Feed filled: % people, % posts.',
    (select count(*) from public.feed_seed_people),
    (select count(*) from public.feed_seed_posts);
end $$;
