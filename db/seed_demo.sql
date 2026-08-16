-- ============================================================================
-- UNIsport — DEMO DATA for screenshots (fake students, chats, board, history)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   A one-shot filler of realistic-looking content so the app can be
--   screenshotted for the landing page: 14 invented students with full
--   profiles, follows, DM threads (incl. a planned session), community-channel
--   chatter, gym-buddy board posts, and eight weeks of workout history on the
--   OWNER's own account.
--
--   Everything is INVENTED. No real person's name, photo or message is used.
--
-- WHO IT ATTACHES TO
--   The owner account is found by email at the top (OWNER_EMAIL below). That
--   account must already exist and have finished onboarding; if it hasn't, the
--   script stops with a clear message instead of writing half the data.
--
-- MATCHES ARE REAL, NOT FAKED
--   The Match tab scores people with db/matching.sql. So the demo profiles are
--   nudged AFTER insert to share the owner's real gyms / concentration /
--   country / interests — that way the "why you match" reasons on the cards are
--   genuine facts out of the database, exactly as they would be for real users.
--
-- SAFE TO RE-RUN
--   Every demo row is written with an id (or an author id) starting `de11…`, so
--   the script wipes its own previous run first. Nothing that belongs to a real
--   account is touched, with ONE exception, noted in the teardown below: the
--   owner is joined to the five community channels (a tap they could do
--   themselves) and that join is left in place.
--
-- TO REMOVE ALL DEMO DATA LATER
--   Run db/seed_demo_undo.sql.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The 14 invented students. Edit names / details here — nothing is hardcoded
-- further down. It is a plain table rather than a TEMP one because the Supabase
-- SQL editor does not guarantee a temp table survives the whole script; row-level
-- security is on with no policies, so no client can ever read it, and
-- db/seed_demo_undo.sql drops it.
-- ---------------------------------------------------------------------------
drop table if exists public.demo_seed_people;
create table public.demo_seed_people (
  id         uuid,
  email      text,
  name       text,
  class_year text,
  sex        text,
  residence  text,
  activity   text,
  level      text,
  split      text,
  run_dist   text,
  run_pace   text,
  cardio     text,
  gyms       jsonb,
  sched      jsonb,
  conc       text,
  country    text,
  langs      jsonb,
  ints       jsonb,
  ttype      text,
  mentor     boolean,
  help       boolean,
  bio        text
);
alter table public.demo_seed_people enable row level security;  -- no policies: server-side only

insert into public.demo_seed_people values
('de11a001-0000-4000-8000-000000000001','elena.vasquez@demo.unisport.test','Elena Vásquez','''28','Female','Leverett',
 'gym','intermediate','Push-Pull-Legs','','','',
 '["Malkin Athletic Center","Hemenway Gymnasium"]',
 '{"mon":["PM"],"wed":["PM","Late PM"],"fri":["PM"],"sat":["AM"]}',
 'Economics','Spain','["English","Spanish"]','["Coffee","Climbing","Travel","Startups"]',
 'partner',true,true,'Lifting since sophomore year. Always down for a spotter on leg day.'),

('de11a002-0000-4000-8000-000000000002','marcus.chen@demo.unisport.test','Marcus Chen','''27','Male','Eliot',
 'gym','advanced','Upper-Lower','','','',
 '["Malkin Athletic Center","Murr Center"]',
 '{"tue":["Early AM"],"thu":["Early AM"],"sat":["AM"],"sun":["Midday"]}',
 'Computer Science','United States','["English","Mandarin"]','["Tech","Gaming","Investing","Coffee"]',
 'either',false,true,'6am lifts before class. Happy to help anyone dial in their form.'),

('de11a003-0000-4000-8000-000000000003','priya.raghunathan@demo.unisport.test','Priya Raghunathan','''29','Female','Currier',
 'running','intermediate','','10K','5:20 /km','',
 '["Hemenway Gymnasium","Malkin Athletic Center"]',
 '{"mon":["Early AM"],"wed":["Early AM"],"fri":["Early AM"],"sun":["AM"]}',
 'Neuroscience','India','["English","Hindi"]','["Running","Reading","Foodie","Science"]',
 'partner',true,false,'Training for the spring half. Charles River loops most mornings.'),

('de11a004-0000-4000-8000-000000000004','tomas.novak@demo.unisport.test','Tomáš Novák','''28','Male','Mather',
 'gym','intermediate','Push-Pull-Legs','','','',
 '["Malkin Athletic Center","Hemenway Gymnasium"]',
 '{"mon":["Late PM"],"tue":["PM"],"thu":["Late PM"],"sat":["Midday"]}',
 'Economics','Czechia','["English","Czech","German"]','["Coffee","Startups","Chess","Travel"]',
 'partner',false,true,'From Prague. Bench is my weak point, legs are not.'),

('de11a005-0000-4000-8000-000000000005','sofia.bianchi@demo.unisport.test','Sofia Bianchi','''30','Female','Canaday',
 'gym','beginner','Full body','','','',
 '["Hemenway Gymnasium"]',
 '{"tue":["PM"],"thu":["PM"],"sun":["Midday"]}',
 'Undecided','Italy','["English","Italian","French"]','["Art","Photography","Cooking","Music"]',
 'partner',false,false,'First year, brand new to the weight room. Looking for someone patient.'),

('de11a006-0000-4000-8000-000000000006','jonah.whitfield@demo.unisport.test','Jonah Whitfield','''27','Male','Adams',
 'gym','advanced','Bro split','','','',
 '["Murr Center","Malkin Athletic Center"]',
 '{"mon":["PM"],"tue":["PM"],"wed":["PM"],"fri":["PM"]}',
 'Government','United States','["English"]','["Politics","Podcasts","Investing","Foodie"]',
 'either',true,true,'Four years in the MAC. Ask me about programming, not about cardio.'),

('de11a007-0000-4000-8000-000000000007','amara.okafor@demo.unisport.test','Amara Okafor','''28','Female','Quincy',
 'cardio','intermediate','','','','Rowing',
 '["Malkin Athletic Center","Hemenway Gymnasium"]',
 '{"mon":["Midday"],"wed":["Midday"],"fri":["Midday"],"sat":["AM"]}',
 'Molecular & Cellular Biology','Nigeria','["English","Swahili"]','["Music","Volunteering","Foodie","Dance"]',
 'partner',true,false,'Erg intervals between labs. Midday sessions only.'),

('de11a008-0000-4000-8000-000000000008','daniel.kim@demo.unisport.test','Daniel Kim','''29','Male','Lowell',
 'gym','intermediate','Upper-Lower','','','',
 '["Malkin Athletic Center"]',
 '{"tue":["Late PM"],"thu":["Late PM"],"sat":["PM"],"sun":["PM"]}',
 'Applied Mathematics','South Korea','["English","Korean"]','["Tech","Gaming","Coffee","Chess"]',
 'either',false,false,'Late-night lifter. Consistency over intensity.'),

('de11a009-0000-4000-8000-000000000009','isabela.ferreira@demo.unisport.test','Isabela Ferreira','''28','Female','Dunster',
 'running','advanced','','Half marathon','4:45 /km','',
 '["Hemenway Gymnasium","Murr Center"]',
 '{"tue":["Early AM"],"thu":["Early AM"],"sat":["Early AM"],"sun":["AM"]}',
 'Environmental Sci. & Engineering','Brazil','["English","Portuguese","Spanish"]','["Running","Outdoors","Sustainability","Hiking"]',
 'partner',true,true,'Long run Saturdays, everyone welcome. I do not drop people.'),

('de11a010-0000-4000-8000-000000000010','lukas.meier@demo.unisport.test','Lukas Meier','''27','Male','Kirkland',
 'gym','advanced','Push-Pull-Legs','','','',
 '["Malkin Athletic Center","Murr Center"]',
 '{"mon":["AM"],"wed":["AM"],"fri":["AM"],"sat":["Midday"]}',
 'Mechanical Engineering','Germany','["English","German"]','["Climbing","Outdoors","Science","Cycling"]',
 'either',false,true,'Powerlifting-ish. Happy to spot heavy squats.'),

('de11a011-0000-4000-8000-000000000011','hana.suzuki@demo.unisport.test','Hana Suzuki','''29','Female','Winthrop',
 'gym','beginner','Full body','','','',
 '["Hemenway Gymnasium","Malkin Athletic Center"]',
 '{"mon":["Midday"],"wed":["PM"],"fri":["Midday"]}',
 'Statistics','Japan','["English","Japanese"]','["Reading","Coffee","Photography","Yoga"]',
 'partner',false,false,'Three months in. Trying to make it a habit, not a phase.'),

('de11a012-0000-4000-8000-000000000012','owen.brady@demo.unisport.test','Owen Brady','''30','Male','Thayer',
 'gym','beginner','Upper-Lower','','','',
 '["Hemenway Gymnasium"]',
 '{"tue":["Late PM"],"thu":["Late PM"],"sun":["PM"]}',
 'History','Ireland','["English"]','["Music","Film","Foodie","Travel"]',
 'partner',false,false,'Freshman, still figuring out which machine does what.'),

('de11a013-0000-4000-8000-000000000013','nadia.haddad@demo.unisport.test','Nadia Haddad','''28','Female','Cabot',
 'gym','intermediate','Push-Pull-Legs','','','',
 '["Malkin Athletic Center","Hemenway Gymnasium"]',
 '{"mon":["PM"],"wed":["PM"],"thu":["PM"],"sat":["AM"]}',
 'Psychology','Lebanon','["English","Arabic","French"]','["Coffee","Travel","Writing","Yoga"]',
 'partner',true,false,'Evening lifter. Prefer training with the same person every week.'),

('de11a014-0000-4000-8000-000000000014','ryan.oneill@demo.unisport.test','Ryan O''Neill','''27','Male','Pforzheimer',
 'gym','intermediate','Bro split','','','',
 '["Malkin Athletic Center"]',
 '{"tue":["PM"],"thu":["PM"],"fri":["Late PM"],"sun":["Midday"]}',
 'Economics','United States','["English","Spanish"]','["Finance","Investing","Podcasts","Foodie"]',
 'either',false,true,'Econ concentrator, gym is the only part of my week that is scheduled.');

-- ---------------------------------------------------------------------------
-- Everything else runs in one block so it can share the owner's id.
-- ---------------------------------------------------------------------------
do $$
declare
  owner_email  constant text := 'martinhouska701@gmail.com';
  me           uuid;
  my           jsonb;
  my_gyms      jsonb;
  my_conc      text;
  my_country   text;
  my_ints      jsonb;
  conv         uuid;
  plan_a       uuid;
  plan_b       uuid;
  plan_c       uuid;
begin
  -- --- 0. Find the owner ----------------------------------------------------
  select u.id into me from auth.users u where lower(u.email) = lower(owner_email);
  if me is null then
    raise exception 'No account for % — sign up in the app with that email first, then re-run.', owner_email;
  end if;

  select p.data into my from public.profiles p
   where p.id = me and p.onboarding_completed;
  if my is null then
    raise exception 'The account % has not finished onboarding — finish it in the app, then re-run.', owner_email;
  end if;

  -- The owner's real answers, used below to make the matches genuine.
  my_gyms    := coalesce(nullif(my->'topGyms', '[]'::jsonb), '["Malkin Athletic Center","Hemenway Gymnasium"]'::jsonb);
  my_conc    := nullif(my->>'concentration', '');
  my_country := nullif(my->>'hometownCountry', '');
  my_ints    := coalesce(my->'interests', '[]'::jsonb);

  -- --- 1. Wipe any previous run of THIS script ------------------------------
  delete from public.workout_logs     where id::text like 'de11f%'
                                         or partner_id::text like 'de11a%';
  delete from public.channel_messages where sender_id::text like 'de11a%';
  delete from public.channel_members  where user_id::text like 'de11a%';
  delete from public.buddy_posts      where author::text like 'de11a%';
  delete from public.dm_conversations where user_lo::text like 'de11a%' or user_hi::text like 'de11a%';
  delete from public.follows          where follower_id::text like 'de11a%' or followee_id::text like 'de11a%';
  delete from auth.users              where id::text like 'de11a%';  -- cascades to profiles

  -- --- 2. The 14 people -----------------------------------------------------
  -- Minimal auth rows: no password, so none of these can ever be logged into.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  )
  select
    '00000000-0000-0000-0000-000000000000', d.id, 'authenticated', 'authenticated', d.email, null,
    now(), now() - interval '90 days', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', d.name)
  from public.demo_seed_people d;

  insert into public.profiles (id, data, onboarding_completed, updated_at)
  select
    d.id,
    jsonb_build_object(
      'name',              d.name,
      'classYear',         d.class_year,
      'sex',               d.sex,
      'residence',         d.residence,
      'primaryActivity',   d.activity,
      'activityOther',     '',
      'experienceLevel',   d.level,
      'gymSplit',          d.split,
      'runningDistance',   d.run_dist,
      'runningPace',       d.run_pace,
      'cardioType',        d.cardio,
      'topGyms',           d.gyms,
      'trainingSchedule',  d.sched,
      'concentration',     d.conc,
      'hometownCountry',   d.country,
      'languages',         d.langs,
      'interests',         d.ints,
      'trainingType',      d.ttype,
      'partnerPreference', 'any',
      'mentorFreshmen',    d.mentor,
      'beMentored',        d.class_year = '''30',
      'helpOthers',        d.help,
      'getHelp',           d.level = 'beginner',
      'bio',               d.bio,
      'photo',             null
    ),
    true,
    now() - interval '3 days'
  from public.demo_seed_people d;

  -- --- 3. Make the matches REAL --------------------------------------------
  -- Share the owner's actual gyms / concentration / country / interests with
  -- some of them, so the match cards can state true shared facts.
  update public.profiles p
     set data = jsonb_set(p.data, '{topGyms}', my_gyms)
   where p.id in ('de11a001-0000-4000-8000-000000000001','de11a002-0000-4000-8000-000000000002',
                  'de11a004-0000-4000-8000-000000000004','de11a006-0000-4000-8000-000000000006',
                  'de11a010-0000-4000-8000-000000000010','de11a013-0000-4000-8000-000000000013',
                  'de11a014-0000-4000-8000-000000000014','de11a008-0000-4000-8000-000000000008');

  -- Two people, not more: the same concentration on every card reads as fake,
  -- and it must never contradict a bio that already names a field of study
  -- (Ryan's bio says he is an Econ concentrator, so he keeps Economics).
  if my_conc is not null then
    update public.profiles p
       set data = jsonb_set(p.data, '{concentration}', to_jsonb(my_conc))
     where p.id in ('de11a001-0000-4000-8000-000000000001','de11a004-0000-4000-8000-000000000004');
  end if;

  if my_country is not null then
    update public.profiles p
       set data = jsonb_set(p.data, '{hometownCountry}', to_jsonb(my_country))
     where p.id in ('de11a004-0000-4000-8000-000000000004','de11a013-0000-4000-8000-000000000013');
  end if;

  if jsonb_array_length(my_ints) > 0 then
    update public.profiles p
       set data = jsonb_set(
             p.data, '{interests}',
             (select coalesce(jsonb_agg(distinct v), '[]'::jsonb)
                from jsonb_array_elements(
                       p.data->'interests'
                       || (select coalesce(jsonb_agg(i), '[]'::jsonb)
                             from (select i from jsonb_array_elements(my_ints) i limit 3) s)
                     ) v))
     where p.id::text like 'de11a%';
  end if;

  -- --- 4. Follows -----------------------------------------------------------
  insert into public.follows (follower_id, followee_id, created_at)
  select d.id, me, now() - (row_number() over (order by d.name) || ' days')::interval
    from public.demo_seed_people d
   where d.id <> 'de11a005-0000-4000-8000-000000000005'
  on conflict do nothing;

  insert into public.follows (follower_id, followee_id, created_at)
  select me, d.id, now() - interval '5 days'
    from public.demo_seed_people d
   where d.id in ('de11a001-0000-4000-8000-000000000001','de11a002-0000-4000-8000-000000000002',
                  'de11a004-0000-4000-8000-000000000004','de11a006-0000-4000-8000-000000000006',
                  'de11a009-0000-4000-8000-000000000009','de11a013-0000-4000-8000-000000000013')
  on conflict do nothing;

  -- --- 5. Direct messages ---------------------------------------------------

  -- (a) Ryan — an accepted session plan, sitting in the thread.
  conv := gen_random_uuid();
  insert into public.dm_conversations (id, user_lo, user_hi, created_at) values
    (conv, least(me,'de11a014-0000-4000-8000-000000000014'::uuid),
           greatest(me,'de11a014-0000-4000-8000-000000000014'::uuid), now() - interval '11 days');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv,'de11a014-0000-4000-8000-000000000014','Ryan O''Neill','Hey! Saw we match on legs day at the MAC — want to train together this week?', now() - interval '2 days 4 hours'),
    (conv, me, coalesce(my->>'name','Me'),'Yeah, I am in. I usually go around 8.', now() - interval '2 days 3 hours'),
    (conv,'de11a014-0000-4000-8000-000000000014','Ryan O''Neill','Perfect, 8 works. I need a spotter for squats anyway.', now() - interval '2 days 3 hours');

  plan_a := gen_random_uuid();
  insert into public.session_plans (id, conv_id, proposer_id, activity, place, scheduled_at, status, created_at) values
    (plan_a, conv, 'de11a014-0000-4000-8000-000000000014','gym','Malkin Athletic Center',
     date_trunc('day', now() + interval '1 day') + interval '18 hours', 'accepted', now() - interval '2 days 2 hours');
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, plan_id, created_at) values
    (conv,'de11a014-0000-4000-8000-000000000014','Ryan O''Neill','📅 Session plan: gym · Malkin Athletic Center','plan', plan_a, now() - interval '2 days 2 hours');
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv,'de11a014-0000-4000-8000-000000000014','Ryan O''Neill','See you there 💪', now() - interval '20 hours');

  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now() - interval '30 hours') on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  -- (b) Tomáš — a proposed plan still waiting on the owner's answer.
  conv := gen_random_uuid();
  insert into public.dm_conversations (id, user_lo, user_hi, created_at) values
    (conv, least(me,'de11a004-0000-4000-8000-000000000004'::uuid),
           greatest(me,'de11a004-0000-4000-8000-000000000004'::uuid), now() - interval '6 days');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv,'de11a004-0000-4000-8000-000000000004','Tomáš Novák','Ahoj! Finally someone else who trains late.', now() - interval '6 days'),
    (conv, me, coalesce(my->>'name','Me'),'Ha, the gym is empty after 9. Much better.', now() - interval '6 days' + interval '20 minutes'),
    (conv,'de11a004-0000-4000-8000-000000000004','Tomáš Novák','Exactly. Want to do a pull session this week?', now() - interval '5 hours');

  plan_b := gen_random_uuid();
  insert into public.session_plans (id, conv_id, proposer_id, activity, place, scheduled_at, status, created_at) values
    (plan_b, conv, 'de11a004-0000-4000-8000-000000000004','gym','Hemenway Gymnasium',
     date_trunc('day', now() + interval '3 days') + interval '19 hours', 'proposed', now() - interval '5 hours');
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, plan_id, created_at) values
    (conv,'de11a004-0000-4000-8000-000000000004','Tomáš Novák','📅 Session plan: gym · Hemenway Gymnasium','plan', plan_b, now() - interval '5 hours');

  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now() - interval '2 days') on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  -- (c) Isabela — running.
  conv := gen_random_uuid();
  insert into public.dm_conversations (id, user_lo, user_hi, created_at) values
    (conv, least(me,'de11a009-0000-4000-8000-000000000009'::uuid),
           greatest(me,'de11a009-0000-4000-8000-000000000009'::uuid), now() - interval '4 days');
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv,'de11a009-0000-4000-8000-000000000009','Isabela Ferreira','Saturday long run is at 7 from Weeks Bridge if you want in — easy pace, nobody gets dropped.', now() - interval '4 days'),
    (conv, me, coalesce(my->>'name','Me'),'That is early but I am tempted.', now() - interval '3 days 22 hours'),
    (conv,'de11a009-0000-4000-8000-000000000009','Isabela Ferreira','It is 8km, you will survive 🙂', now() - interval '3 days 21 hours');
  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now()) on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  -- (d) Sofia — a freshman asking for help (unread).
  conv := gen_random_uuid();
  insert into public.dm_conversations (id, user_lo, user_hi, created_at) values
    (conv, least(me,'de11a005-0000-4000-8000-000000000005'::uuid),
           greatest(me,'de11a005-0000-4000-8000-000000000005'::uuid), now() - interval '1 day');
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv,'de11a005-0000-4000-8000-000000000005','Sofia Bianchi','Hi! Your profile says you help beginners — is that still true? 😅', now() - interval '3 hours');
  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now() - interval '1 day') on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  -- (e) Marcus — short, older thread.
  conv := gen_random_uuid();
  insert into public.dm_conversations (id, user_lo, user_hi, created_at) values
    (conv, least(me,'de11a002-0000-4000-8000-000000000002'::uuid),
           greatest(me,'de11a002-0000-4000-8000-000000000002'::uuid), now() - interval '17 days');
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv, me, coalesce(my->>'name','Me'),'What are you running for upper body volume right now?', now() - interval '9 days'),
    (conv,'de11a002-0000-4000-8000-000000000002','Marcus Chen','16 sets a week, split over two days. Anything more and my elbows complain.', now() - interval '9 days' + interval '40 minutes');
  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now()) on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  -- (f) Nadia — a session that ALREADY HAPPENED, waiting for "did this happen?".
  -- She has already said yes; the moment the owner taps yes too, the app turns
  -- it into a verified workout on both calendars. That is the plan → log loop,
  -- ready to be shown in one tap.
  conv := gen_random_uuid();
  insert into public.dm_conversations (id, user_lo, user_hi, created_at) values
    (conv, least(me,'de11a013-0000-4000-8000-000000000013'::uuid),
           greatest(me,'de11a013-0000-4000-8000-000000000013'::uuid), now() - interval '8 days');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv,'de11a013-0000-4000-8000-000000000013','Nadia Haddad','Still on for legs at 8?', now() - interval '4 days'),
    (conv, me, coalesce(my->>'name','Me'),'Yes, see you at the MAC.', now() - interval '4 days' + interval '15 minutes');

  plan_c := gen_random_uuid();
  insert into public.session_plans (id, conv_id, proposer_id, activity, place, scheduled_at, status, proposer_answer, created_at) values
    (plan_c, conv, 'de11a013-0000-4000-8000-000000000013','gym','Malkin Athletic Center',
     date_trunc('day', now() - interval '2 days') + interval '18 hours', 'accepted', 'yes', now() - interval '4 days');
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, plan_id, created_at) values
    (conv,'de11a013-0000-4000-8000-000000000013','Nadia Haddad','📅 Session plan: gym · Malkin Athletic Center','plan', plan_c, now() - interval '4 days');

  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now()) on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  -- --- 6. Community channels ------------------------------------------------
  -- The demo people join and post; the owner joins so the tab looks lived-in.
  insert into public.channel_members (channel_id, user_id, joined_at)
  select c.id, d.id, now() - interval '20 days' from public.channels c cross join public.demo_seed_people d
  on conflict do nothing;

  insert into public.channel_members (channel_id, user_id, joined_at)
  select c.id, me, now() - interval '20 days' from public.channels c
  on conflict do nothing;

  insert into public.channel_messages (channel_id, sender_id, sender_name, sender_residence, sender_class_year, body, created_at)
  select c.id, m.person, p.data->>'name', p.data->>'residence', p.data->>'classYear', m.body, now() - (m.mins || ' minutes')::interval
  from (values
    ('general','de11a006-0000-4000-8000-000000000006'::uuid,'MAC is packed until about 7, then it empties out. Public service announcement.',2600),
    ('general','de11a011-0000-4000-8000-000000000011'::uuid,'Does anyone know if Hemenway keeps the squat racks open during reading period?',1900),
    ('general','de11a002-0000-4000-8000-000000000002'::uuid,'Yes, same hours. Only the pool closes early.',1840),
    ('general','de11a013-0000-4000-8000-000000000013'::uuid,'Looking for one more person for a Wednesday evening group. Two of us so far.',420),
    ('general','de11a012-0000-4000-8000-000000000012'::uuid,'New here — is the house gym worth it or should I just walk to the MAC?',95),
    ('general','de11a001-0000-4000-8000-000000000001'::uuid,'House gym for a quick session, MAC if you actually want to lift heavy.',60),

    ('form-and-programming','de11a005-0000-4000-8000-000000000005'::uuid,'How do you know if your squat depth is actually deep enough?',3100),
    ('form-and-programming','de11a010-0000-4000-8000-000000000010'::uuid,'Film it from the side, one rep, phone on the floor. You will know immediately.',3040),
    ('form-and-programming','de11a006-0000-4000-8000-000000000006'::uuid,'Also stop chasing depth with weight on the bar. Fix it empty first.',2980),
    ('form-and-programming','de11a008-0000-4000-8000-000000000008'::uuid,'Upper-lower four days a week has been better for me than PPL, purely because I actually show up.',780),
    ('form-and-programming','de11a002-0000-4000-8000-000000000002'::uuid,'The best program is the one that survives midterms.',720),

    ('nutrition','de11a007-0000-4000-8000-000000000007'::uuid,'Annenberg protein tier list: eggs, then the grilled chicken, then everything else.',2200),
    ('nutrition','de11a014-0000-4000-8000-000000000014'::uuid,'Greek yogurt bar is criminally underrated.',2150),
    ('nutrition','de11a003-0000-4000-8000-000000000003'::uuid,'Anyone else struggle to eat enough before a 6am run? I cannot do solid food that early.',540),
    ('nutrition','de11a009-0000-4000-8000-000000000009'::uuid,'Banana and coffee. That is the whole strategy.',500),

    ('wins-and-prs','de11a004-0000-4000-8000-000000000004'::uuid,'140kg deadlift for 3. Two years ago I could not do 100. 🎉',4300),
    ('wins-and-prs','de11a011-0000-4000-8000-000000000011'::uuid,'First unassisted pull-up this morning!!',1500),
    ('wins-and-prs','de11a001-0000-4000-8000-000000000001'::uuid,'Amazing 👏 that one is such a milestone.',1460),
    ('wins-and-prs','de11a010-0000-4000-8000-000000000010'::uuid,'Squat 3x5 at 120kg, felt light for once.',300),

    ('running','de11a009-0000-4000-8000-000000000009'::uuid,'Saturday long run: 7am, Weeks Bridge, 8–12km depending who shows. Easy pace.',2900),
    ('running','de11a003-0000-4000-8000-000000000003'::uuid,'In. Bringing a friend from Currier.',2840),
    ('running','de11a007-0000-4000-8000-000000000007'::uuid,'River path was icy near the boathouse this morning, be careful.',260)
  ) as m(chan, person, body, mins)
  join public.channels c on c.key = m.chan
  join public.profiles p on p.id = m.person;

  -- --- 7. Gym buddy board ---------------------------------------------------
  insert into public.buddy_posts (author, focus, day, time_of_day, gym, note, created_at, expires_at)
  select b.author, b.focus, b.day, b.tod, b.gym, b.note,
         now() - (b.mins || ' minutes')::interval,
         public.buddy_next_date(b.day) + interval '1 day' + interval '12 hours'
  from (values
    ('de11a013-0000-4000-8000-000000000013'::uuid,'legs','wed','evening','Malkin Athletic Center','Squats + accessories, need a spotter.',180),
    ('de11a012-0000-4000-8000-000000000012'::uuid,'push','thu','evening','Hemenway Gymnasium','Total beginner, happy to follow someone who knows what they are doing.',400),
    ('de11a010-0000-4000-8000-000000000010'::uuid,'pull','fri','morning','Malkin Athletic Center','Heavy deadlifts, 8am sharp.',900),
    ('de11a007-0000-4000-8000-000000000007'::uuid,'cardio','mon','afternoon','Malkin Athletic Center','Erg intervals, 45 min.',1500),
    ('de11a005-0000-4000-8000-000000000005'::uuid,'full','sun','afternoon','Hemenway Gymnasium','Full body, very light. Just want company.',260),
    ('de11a014-0000-4000-8000-000000000014'::uuid,'chest','tue','evening','Malkin Athletic Center',null,60)
  ) as b(author, focus, day, tod, gym, note, mins);

  -- --- 8. The owner's own training history (eight weeks) --------------------
  insert into public.workout_logs (id, user_id, log_date, activity, gym, partner, partner_id, exercises, metrics, photos, note, created_at)
  select
    ('de11f000-0000-4000-8000-' || lpad(to_hex(w.n), 12, '0'))::uuid,
    me,
    (current_date - w.days_ago),
    w.activity,
    w.gym,
    w.partner,
    w.partner_id,
    w.exercises,
    w.metrics,
    '[]'::jsonb,
    w.note,
    now() - (w.days_ago || ' days')::interval
  from (values
    (1,  1,'gym','Malkin Athletic Center','Ryan O''Neill','de11a014-0000-4000-8000-000000000014'::uuid,
     '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"60","reps":"8","type":"W","done":true},{"weight":"90","reps":"5","done":true},{"weight":"100","reps":"5","done":true},{"weight":"100","reps":"5","done":true}]},
        {"name":"Romanian Deadlift","muscle":"Legs","sets":[{"weight":"80","reps":"10","done":true},{"weight":"80","reps":"10","done":true},{"weight":"80","reps":"9","done":true}]},
        {"name":"Leg Press","muscle":"Legs","sets":[{"weight":"160","reps":"12","done":true},{"weight":"160","reps":"12","done":true}]},
        {"name":"Standing Calf Raise","muscle":"Calves","sets":[{"weight":"60","reps":"15","done":true},{"weight":"60","reps":"15","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,'Squats moved well. Ryan spotted the top sets.'),

    (2,  3,'gym','Malkin Athletic Center','',null,
     '[{"name":"Bench Press","muscle":"Chest","sets":[{"weight":"40","reps":"10","type":"W","done":true},{"weight":"70","reps":"6","done":true},{"weight":"75","reps":"5","done":true},{"weight":"75","reps":"4","done":true}]},
        {"name":"Overhead Press","muscle":"Shoulders","sets":[{"weight":"40","reps":"8","done":true},{"weight":"40","reps":"8","done":true},{"weight":"40","reps":"7","done":true}]},
        {"name":"Cable Fly","muscle":"Chest","sets":[{"weight":"20","reps":"12","done":true},{"weight":"20","reps":"12","done":true}]},
        {"name":"Triceps Pushdown","muscle":"Triceps","sets":[{"weight":"30","reps":"12","done":true},{"weight":"30","reps":"12","done":true},{"weight":"30","reps":"10","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (3,  5,'running','','',null,'[]'::jsonb,
     '{"distance":"6.4","unit":"km","duration":"33:10"}'::jsonb,'River loop, easy.'),

    (4,  6,'gym','Hemenway Gymnasium','Tomáš Novák','de11a004-0000-4000-8000-000000000004'::uuid,
     '[{"name":"Deadlift","muscle":"Back","sets":[{"weight":"100","reps":"5","type":"W","done":true},{"weight":"130","reps":"3","done":true},{"weight":"140","reps":"3","done":true}]},
        {"name":"Pull-Up","muscle":"Back","sets":[{"weight":"0","reps":"8","done":true},{"weight":"0","reps":"7","done":true},{"weight":"0","reps":"6","done":true}]},
        {"name":"Seated Cable Row","muscle":"Back","sets":[{"weight":"55","reps":"12","done":true},{"weight":"55","reps":"12","done":true},{"weight":"55","reps":"11","done":true}]},
        {"name":"Barbell Curl","muscle":"Biceps","sets":[{"weight":"30","reps":"10","done":true},{"weight":"30","reps":"9","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,'140 for 3 felt solid. Late session, gym empty.'),

    (5,  8,'gym','Malkin Athletic Center','',null,
     '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"90","reps":"5","done":true},{"weight":"97.5","reps":"5","done":true},{"weight":"97.5","reps":"5","done":true}]},
        {"name":"Bulgarian Split Squat","muscle":"Legs","sets":[{"weight":"20","reps":"10","done":true},{"weight":"20","reps":"10","done":true}]},
        {"name":"Leg Curl","muscle":"Legs","sets":[{"weight":"45","reps":"12","done":true},{"weight":"45","reps":"12","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (6, 10,'gym','Malkin Athletic Center','Marcus Chen','de11a002-0000-4000-8000-000000000002'::uuid,
     '[{"name":"Bench Press","muscle":"Chest","sets":[{"weight":"70","reps":"6","done":true},{"weight":"72.5","reps":"5","done":true},{"weight":"72.5","reps":"5","done":true}]},
        {"name":"Incline Dumbbell Press","muscle":"Chest","sets":[{"weight":"26","reps":"10","done":true},{"weight":"26","reps":"9","done":true}]},
        {"name":"Lateral Raise","muscle":"Shoulders","sets":[{"weight":"10","reps":"15","done":true},{"weight":"10","reps":"15","done":true},{"weight":"10","reps":"12","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,'Marcus fixed my bar path on bench.'),

    (7, 12,'running','','',null,'[]'::jsonb,
     '{"distance":"8.1","unit":"km","duration":"44:05"}'::jsonb,'Saturday group run with Isabela.'),

    (8, 13,'gym','Hemenway Gymnasium','',null,
     '[{"name":"Deadlift","muscle":"Back","sets":[{"weight":"120","reps":"5","done":true},{"weight":"130","reps":"3","done":true},{"weight":"130","reps":"3","done":true}]},
        {"name":"Lat Pulldown","muscle":"Back","sets":[{"weight":"60","reps":"10","done":true},{"weight":"60","reps":"10","done":true},{"weight":"60","reps":"9","done":true}]},
        {"name":"Face Pull","muscle":"Back","sets":[{"weight":"25","reps":"15","done":true},{"weight":"25","reps":"15","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (9, 15,'gym','Malkin Athletic Center','',null,
     '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"90","reps":"5","done":true},{"weight":"95","reps":"5","done":true},{"weight":"95","reps":"5","done":true}]},
        {"name":"Leg Press","muscle":"Legs","sets":[{"weight":"150","reps":"12","done":true},{"weight":"150","reps":"12","done":true}]},
        {"name":"Plank","muscle":"Core","sets":[{"weight":"0","reps":"60","done":true},{"weight":"0","reps":"60","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (10,17,'gym','Malkin Athletic Center','Nadia Haddad','de11a013-0000-4000-8000-000000000013'::uuid,
     '[{"name":"Overhead Press","muscle":"Shoulders","sets":[{"weight":"37.5","reps":"8","done":true},{"weight":"37.5","reps":"8","done":true},{"weight":"37.5","reps":"7","done":true}]},
        {"name":"Dumbbell Bench Press","muscle":"Chest","sets":[{"weight":"28","reps":"10","done":true},{"weight":"28","reps":"9","done":true}]},
        {"name":"Chest Dip","muscle":"Chest","sets":[{"weight":"0","reps":"10","done":true},{"weight":"0","reps":"8","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (11,19,'cardio','Malkin Athletic Center','',null,'[]'::jsonb,
     '{"cardioType":"Rowing","distance":"5000","unit":"m","duration":"19:40"}'::jsonb,'Erg, steady state.'),

    (12,20,'gym','Hemenway Gymnasium','',null,
     '[{"name":"Bent-Over Row","muscle":"Back","sets":[{"weight":"60","reps":"10","done":true},{"weight":"60","reps":"10","done":true},{"weight":"60","reps":"9","done":true}]},
        {"name":"Pull-Up","muscle":"Back","sets":[{"weight":"0","reps":"7","done":true},{"weight":"0","reps":"6","done":true},{"weight":"0","reps":"5","done":true}]},
        {"name":"Hammer Curl","muscle":"Biceps","sets":[{"weight":"14","reps":"12","done":true},{"weight":"14","reps":"11","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (13,22,'gym','Malkin Athletic Center','',null,
     '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"85","reps":"5","done":true},{"weight":"92.5","reps":"5","done":true},{"weight":"92.5","reps":"5","done":true}]},
        {"name":"Romanian Deadlift","muscle":"Legs","sets":[{"weight":"75","reps":"10","done":true},{"weight":"75","reps":"10","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (14,24,'running','','',null,'[]'::jsonb,
     '{"distance":"5.0","unit":"km","duration":"25:52"}'::jsonb,'Fastest 5k so far.'),

    (15,26,'gym','Malkin Athletic Center','Ryan O''Neill','de11a014-0000-4000-8000-000000000014'::uuid,
     '[{"name":"Bench Press","muscle":"Chest","sets":[{"weight":"67.5","reps":"6","done":true},{"weight":"70","reps":"5","done":true},{"weight":"70","reps":"5","done":true}]},
        {"name":"Cable Fly","muscle":"Chest","sets":[{"weight":"17.5","reps":"12","done":true},{"weight":"17.5","reps":"12","done":true}]},
        {"name":"Triceps Pushdown","muscle":"Triceps","sets":[{"weight":"27.5","reps":"12","done":true},{"weight":"27.5","reps":"12","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (16,28,'gym','Hemenway Gymnasium','',null,
     '[{"name":"Deadlift","muscle":"Back","sets":[{"weight":"120","reps":"5","done":true},{"weight":"125","reps":"3","done":true}]},
        {"name":"Seated Cable Row","muscle":"Back","sets":[{"weight":"50","reps":"12","done":true},{"weight":"50","reps":"12","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (17,31,'gym','Malkin Athletic Center','',null,
     '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"85","reps":"5","done":true},{"weight":"90","reps":"5","done":true},{"weight":"90","reps":"5","done":true}]},
        {"name":"Leg Curl","muscle":"Legs","sets":[{"weight":"40","reps":"12","done":true},{"weight":"40","reps":"12","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (18,33,'running','','',null,'[]'::jsonb,
     '{"distance":"7.2","unit":"km","duration":"39:30"}'::jsonb,''),

    (19,35,'gym','Malkin Athletic Center','Lukas Meier','de11a010-0000-4000-8000-000000000010'::uuid,
     '[{"name":"Overhead Press","muscle":"Shoulders","sets":[{"weight":"35","reps":"8","done":true},{"weight":"35","reps":"8","done":true},{"weight":"35","reps":"8","done":true}]},
        {"name":"Lateral Raise","muscle":"Shoulders","sets":[{"weight":"9","reps":"15","done":true},{"weight":"9","reps":"15","done":true}]},
        {"name":"Chest Dip","muscle":"Chest","sets":[{"weight":"0","reps":"9","done":true},{"weight":"0","reps":"8","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (20,38,'gym','Hemenway Gymnasium','',null,
     '[{"name":"Bent-Over Row","muscle":"Back","sets":[{"weight":"57.5","reps":"10","done":true},{"weight":"57.5","reps":"10","done":true}]},
        {"name":"Lat Pulldown","muscle":"Back","sets":[{"weight":"55","reps":"12","done":true},{"weight":"55","reps":"11","done":true}]},
        {"name":"Barbell Curl","muscle":"Biceps","sets":[{"weight":"27.5","reps":"10","done":true},{"weight":"27.5","reps":"10","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (21,40,'gym','Malkin Athletic Center','',null,
     '[{"name":"Back Squat","muscle":"Legs","sets":[{"weight":"80","reps":"5","done":true},{"weight":"87.5","reps":"5","done":true},{"weight":"87.5","reps":"5","done":true}]},
        {"name":"Leg Press","muscle":"Legs","sets":[{"weight":"140","reps":"12","done":true},{"weight":"140","reps":"12","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (22,43,'cardio','Malkin Athletic Center','',null,'[]'::jsonb,
     '{"cardioType":"Cycling","distance":"18","unit":"km","duration":"40:00"}'::jsonb,''),

    (23,45,'gym','Malkin Athletic Center','',null,
     '[{"name":"Bench Press","muscle":"Chest","sets":[{"weight":"65","reps":"6","done":true},{"weight":"67.5","reps":"5","done":true},{"weight":"67.5","reps":"5","done":true}]},
        {"name":"Machine Chest Press","muscle":"Chest","sets":[{"weight":"50","reps":"12","done":true},{"weight":"50","reps":"11","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,''),

    (24,48,'gym','Hemenway Gymnasium','',null,
     '[{"name":"Deadlift","muscle":"Back","sets":[{"weight":"110","reps":"5","done":true},{"weight":"120","reps":"3","done":true}]},
        {"name":"Pull-Up","muscle":"Back","sets":[{"weight":"0","reps":"6","done":true},{"weight":"0","reps":"5","done":true}]}]'::jsonb,
     '{"weightUnit":"kg"}'::jsonb,'Back after a week off.')
  ) as w(n, days_ago, activity, gym, partner, partner_id, exercises, metrics, note);

  raise notice 'Demo data loaded for % — 14 people, 5 conversations, 22 channel messages, 6 board posts, 24 workouts.', owner_email;
end $$;

-- The helper table is LEFT IN PLACE (row-level security on, no policies, so no
-- client can read it). db/seed_demo_undo.sql drops it.
