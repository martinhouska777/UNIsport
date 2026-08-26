-- ============================================================================
-- UNIsport — VARSITY FEED FILLER: invented squads at the other Ivies
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   The varsity feed (db/varsity_posts.sql) is where "how did everyone go
--   today" moves off Instagram and into the app. Two scopes, and a post picks
--   its audience when it is published:
--       Team     — your own squad only.
--       Everyone — every varsity athlete, at every school.
--   This fills both: seven invented squads (Yale, Princeton, Brown, Cornell,
--   Dartmouth, Penn, Columbia), 14 invented athletes on them, and 16 open posts
--   across the last five days — mostly shared sessions, with 💪 already on them.
--   Then, so the tab the app OPENS on is not empty, it puts three invented
--   teammates on the OWNER'S OWN squad and gives them team-only posts.
--
--   Everything is INVENTED. The email addresses are made-up names on real
--   university domains; nothing in the app displays them, and the accounts have
--   NO password, so none of them can ever be logged into.
--
-- TWO THINGS TO KNOW BEFORE RUNNING IT
--   1. THE COACH SEES NOTHING. That is the owner's own rule, enforced in
--      varsity_feed_me(). If the account you look from is the squad's coach,
--      the feed stays empty however much is seeded — log in as an athlete.
--   2. The three teammates on your squad are real members of it, so they also
--      appear on the Team screens and in the coach's roster. That is what makes
--      the Team feed work; db/seed_varsity_feed_undo.sql takes them off again.
--
-- WHAT IT DOES NOT DO
--   No photos (a hand-written data URL would be megabytes of noise), and it
--   never touches the training plan, lineups or results — db/seed_varsity_demo.sql
--   is the script for those.
--
-- SAFE TO RE-RUN
--   Every account has an id starting `feedb…` and every squad `feedc…`, and the
--   script wipes its own previous run first. Deleting an account cascades to its
--   profile, sessions, posts, reactions and squad membership.
--
-- TO REMOVE IT AGAIN
--   Run db/seed_varsity_feed_undo.sql.
--
-- NEEDS: db/profiles.sql, db/varsity_teams.sql, db/varsity_logs.sql and
--        db/varsity_posts.sql — run that last one first if you never have.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- THE SQUADS. A squad is invented content, so it lives here as data.
-- `email_domain` is left null: nobody is ever going to redeem an invite to one
-- of these, and a domain lock on a fake squad would only be a trap later.
-- ---------------------------------------------------------------------------
drop table if exists public.vfeed_seed_teams;
create table public.vfeed_seed_teams (
  id     uuid,
  name   text,
  school text            -- lib/themes.ts key
);
alter table public.vfeed_seed_teams enable row level security;  -- no policies: server-side only

insert into public.vfeed_seed_teams values
('feedc001-0000-4000-8000-000000000001','Yale Heavyweight Crew','yale'),
('feedc002-0000-4000-8000-000000000002','Princeton Lightweight Crew','princeton'),
('feedc003-0000-4000-8000-000000000003','Brown Women''s Rowing','brown'),
('feedc004-0000-4000-8000-000000000004','Cornell Heavyweight Crew','cornell'),
('feedc005-0000-4000-8000-000000000005','Dartmouth Rowing','dartmouth'),
('feedc006-0000-4000-8000-000000000006','Penn Heavyweight Crew','penn'),
('feedc007-0000-4000-8000-000000000007','Columbia Rowing','columbia');

-- ---------------------------------------------------------------------------
-- THE ATHLETES. Two per squad. Every one of them is an approved ATHLETE — no
-- invented coaches and no invented captains, because a fake person with the
-- power to approve members or edit a plan is a fake person who can confuse a
-- real screen.
-- ---------------------------------------------------------------------------
drop table if exists public.vfeed_seed_people;
create table public.vfeed_seed_people (
  id         uuid,
  email      text,
  name       text,
  team       uuid,
  class_year text,
  sex        text,
  country    text,
  bio        text
);
alter table public.vfeed_seed_people enable row level security;  -- no policies: server-side only

insert into public.vfeed_seed_people values
('feedb001-0000-4000-8000-000000000001','callum.hartley@yale.edu','Callum Hartley','feedc001-0000-4000-8000-000000000001','''28','Male','United Kingdom','Two seat. Housatonic mornings, erg afternoons.'),
('feedb002-0000-4000-8000-000000000002','viktor.tamm@yale.edu','Viktor Tamm','feedc001-0000-4000-8000-000000000001','''27','Male','Estonia','Stroke side since school. Winter is for the erg and I have accepted it.'),
('feedb003-0000-4000-8000-000000000003','noah.feldman@princeton.edu','Noah Feldman','feedc002-0000-4000-8000-000000000002','''29','Male','United States','Lightweight. Weighing in is its own sport.'),
('feedb004-0000-4000-8000-000000000004','tom.van.der.berg@princeton.edu','Tom van der Berg','feedc002-0000-4000-8000-000000000002','''28','Male','Netherlands','Carnegie flat water is the best water. No arguments taken.'),
('feedb005-0000-4000-8000-000000000005','georgia.mullen@brown.edu','Georgia Mullen','feedc003-0000-4000-8000-000000000003','''28','Female','Ireland','Seekonk at 5:45am. Coffee afterwards is non-negotiable.'),
('feedb006-0000-4000-8000-000000000006','emilia.rossi@brown.edu','Emilia Rossi','feedc003-0000-4000-8000-000000000003','''30','Female','Italy','Novice last year, in the second eight this year. Still cannot believe it.'),
('feedb007-0000-4000-8000-000000000007','sam.okoye@cornell.edu','Sam Okoye','feedc004-0000-4000-8000-000000000004','''27','Male','United States','Six seat. Cayuga is either glass or a washing machine, never in between.'),
('feedb008-0000-4000-8000-000000000008','lars.eriksen@cornell.edu','Lars Eriksen','feedc004-0000-4000-8000-000000000004','''29','Male','Denmark','Erg numbers are not the boat, but they are not nothing either.'),
('feedb009-0000-4000-8000-000000000009','freya.lindholm@dartmouth.edu','Freya Lindholm','feedc005-0000-4000-8000-000000000005','''28','Female','Sweden','Connecticut River. Cold hands, good water.'),
('feedb010-0000-4000-8000-000000000010','isaac.warrick@dartmouth.edu','Isaac Warrick','feedc005-0000-4000-8000-000000000005','''27','Male','Canada','Bow pair. Steering is a skill and I am still learning it.'),
('feedb011-0000-4000-8000-000000000011','joaquin.silva@upenn.edu','Joaquín Silva','feedc006-0000-4000-8000-000000000006','''28','Male','Chile','Schuylkill every morning. Boathouse Row in the fog is worth the alarm.'),
('feedb012-0000-4000-8000-000000000012','henry.aldridge@upenn.edu','Henry Aldridge','feedc006-0000-4000-8000-000000000006','''30','Male','United States','First year, last boat, biggest appetite.'),
('feedb013-0000-4000-8000-000000000013','mira.chandran@columbia.edu','Mira Chandran','feedc007-0000-4000-8000-000000000007','''29','Female','India','Harlem River, 5am, before the city notices.'),
('feedb014-0000-4000-8000-000000000014','anton.kowalski@columbia.edu','Anton Kowalski','feedc007-0000-4000-8000-000000000007','''27','Male','Poland','Four years of winter erging for six minutes in May.');

-- ---------------------------------------------------------------------------
-- THE POSTS. `hours_ago` sets the order, which is the whole feel of a feed.
-- A row with `w_title` filled in is a SHARED SESSION: the script writes the
-- varsity log first and the post points at it, exactly as the app does when an
-- athlete taps "Share to feed" AFTER saving (components/varsity/feed/
-- ShareToFeedStep.tsx). The log's own private note is never the post's words —
-- `body` is what gets typed at share time, and only that is public.
--
-- Every post here is audience 'everyone': these are other schools' squads, and
-- a team-only post from a squad you are not on would be seeded into a hole
-- nobody can see.
-- ---------------------------------------------------------------------------
drop table if exists public.vfeed_seed_posts;
create table public.vfeed_seed_posts (
  id        uuid,
  log_id    uuid,     -- filled in only for shared sessions
  author    uuid,
  hours_ago numeric,
  body      text,
  w_title   text,
  w_cat     text,     -- water | erg | weights | flex | run | other
  w_minutes int,
  w_metres  int,
  w_split   text,
  w_note    text      -- the PRIVATE note on the log. Deliberately not the post.
);
alter table public.vfeed_seed_posts enable row level security;  -- no policies: server-side only

insert into public.vfeed_seed_posts values
('feedb2a1-0000-4000-8000-000000000001','feedb1a1-0000-4000-8000-000000000001','feedb002-0000-4000-8000-000000000002',
 3,'2k test done. 6:18.4 — eleven seconds off the autumn one and I will take it.',
 'Erg · 2k test','erg',7,2000,'1:34','Went out at 1:31, held on. Legs gone by 1500.'),

('feedb2a1-0000-4000-8000-000000000002','feedb1a1-0000-4000-8000-000000000002','feedb005-0000-4000-8000-000000000005',
 6,'Flat water for the first time in three weeks. Whole crew looked half a length longer.',
 'Water · UT2','water',95,22000,null,'Better run at the finish once we dropped the rate.'),

('feedb2a1-0000-4000-8000-000000000003','feedb1a1-0000-4000-8000-000000000003','feedb007-0000-4000-8000-000000000007',
 11,'4×2k off 5. The third one is where the session actually starts.',
 'Erg · 4×2k','erg',44,8000,'1:37','Splits 1:36 / 1:37 / 1:38 / 1:36.'),

('feedb2a1-0000-4000-8000-000000000004','feedb1a1-0000-4000-8000-000000000004','feedb011-0000-4000-8000-000000000011',
 15,'Fog on the Schuylkill so thick we could not see Boathouse Row from the middle of the river.',
 'Water · UT1','water',80,18500,null,'Steady, rate 22, nothing heroic.'),

('feedb2a1-0000-4000-8000-000000000005','feedb1a1-0000-4000-8000-000000000005','feedb003-0000-4000-8000-000000000003',
 21,'Weights before breakfast because the tank was booked out all afternoon.',
 'Weights · main strength','weights',70,null,null,'Squat 5×5 at 90. Felt heavier than it is.'),

('feedb2a1-0000-4000-8000-000000000006','feedb1a1-0000-4000-8000-000000000006','feedb009-0000-4000-8000-000000000009',
 26,'Minus nine and the riggers froze between pieces. Ten out of ten morning anyway.',
 'Water · UT2','water',85,19000,null,''),

('feedb2a1-0000-4000-8000-000000000007','feedb1a1-0000-4000-8000-000000000007','feedb014-0000-4000-8000-000000000014',
 32,'30 minutes on the erg with the screen covered. Best rate work I have done all winter.',
 'Erg · 30'' rate ladder','erg',30,8100,'1:51','No screen. Went entirely off feel.'),

('feedb2a1-0000-4000-8000-000000000008','feedb1a1-0000-4000-8000-000000000008','feedb006-0000-4000-8000-000000000006',
 38,'First 5k under 20 minutes. In September I could not finish one.',
 'Erg · 5k','erg',20,5000,'1:59','Negative split by two seconds.'),

('feedb2a1-0000-4000-8000-000000000009','feedb1a1-0000-4000-8000-000000000009','feedb001-0000-4000-8000-000000000001',
 47,'Long one. Two hours, one bottle, several regrets.',
 'Water · UT2','water',120,26000,null,'Down to the bridge and back twice.'),

('feedb2a1-0000-4000-8000-000000000010','feedb1a1-0000-4000-8000-000000000010','feedb012-0000-4000-8000-000000000012',
 55,'Every part of me hurts and I have been doing this for four months. Does it stop?',
 'Erg · 3×20''','erg',60,15600,'1:56',''),

('feedb2a1-0000-4000-8000-000000000011','feedb1a1-0000-4000-8000-000000000011','feedb013-0000-4000-8000-000000000013',
 63,'Sunrise over the Harlem River. This is why the alarm goes off at 4:40.',
 'Water · UT1','water',75,17200,null,'Good pressure from bow four.'),

('feedb2a1-0000-4000-8000-000000000012','feedb1a1-0000-4000-8000-000000000012','feedb008-0000-4000-8000-000000000008',
 71,'8×500 flat out. Coach called it "a conversation with your own limits" which is one way of putting it.',
 'Erg · 8×500m','erg',35,4000,'1:29','Held 1:29 through six, then 1:31.'),

('feedb2a1-0000-4000-8000-000000000013',null,'feedb004-0000-4000-8000-000000000004',
 80,'Anyone else racing at the end of March? Would be good to know who is actually going to be there before we all pretend to be surprised on the day.',
 null,null,null,null,null,null),

('feedb2a1-0000-4000-8000-000000000014',null,'feedb010-0000-4000-8000-000000000010',
 92,'Steering a straight course in a crosswind is the single hardest thing I have tried to learn. Six weeks and I am still finding the buoys.',
 null,null,null,null,null,null),

('feedb2a1-0000-4000-8000-000000000015',null,'feedb005-0000-4000-8000-000000000005',
 104,'Reminder to the first years that everyone here was slow once, including the people you think were not.',
 null,null,null,null,null,null),

('feedb2a1-0000-4000-8000-000000000016',null,'feedb002-0000-4000-8000-000000000002',
 118,'Winter training is just doing the same three sessions until one day the boat feels different. That day happened this morning.',
 null,null,null,null,null,null);

-- ---------------------------------------------------------------------------
-- THE OWNER'S OWN SQUAD. Three teammates and their team-only posts, so the
-- feed's DEFAULT tab has something in it. Which squad that is gets worked out
-- below — nothing here names a school, because whichever squad the owner is on
-- is the right one.
-- ---------------------------------------------------------------------------
drop table if exists public.vfeed_seed_mates;
create table public.vfeed_seed_mates (
  id        uuid,
  email     text,
  name      text,
  post_id   uuid,
  log_id    uuid,
  audience  text,
  hours_ago numeric,
  body      text,
  w_title   text,
  w_cat     text,
  w_minutes int,
  w_metres  int,
  w_split   text
);
alter table public.vfeed_seed_mates enable row level security;  -- no policies: server-side only

insert into public.vfeed_seed_mates values
('feedb9a1-0000-4000-8000-000000000001','will.tanner@demo.unisport.test','Will Tanner',
 'feedb2b1-0000-4000-8000-000000000001','feedb1b1-0000-4000-8000-000000000001','team',
 4,'Session done. Whoever left the fan on rate 10 for the whole warm-up, we need to talk.',
 'Erg · 3×20''','erg',60,15900,'1:53'),

('feedb9a2-0000-4000-8000-000000000002','ben.iverson@demo.unisport.test','Ben Iverson',
 'feedb2b1-0000-4000-8000-000000000002','feedb1b1-0000-4000-8000-000000000002','team',
 13,'Weights this morning. Everything on the sheet, nothing extra, for once.',
 'Weights · main strength','weights',75,null,null),

('feedb9a3-0000-4000-8000-000000000003','matt.kwon@demo.unisport.test','Matt Kwon',
 'feedb2b1-0000-4000-8000-000000000003',null,'everyone',
 29,'Best water of the winter this morning and half the squad missed it. Set your alarms.',
 null,null,null,null,null);

-- ---------------------------------------------------------------------------
-- Write it all.
-- ---------------------------------------------------------------------------
do $$
declare
  -- Whose squad the three teammates join. If this address has no account, the
  -- script falls back to the most recently created approved athlete on any
  -- squad — on a demo database that is the account you have been testing with.
  owner_email constant text := 'martinhouska777@gmail.com';
  my_team     uuid;
  my_team_nm  text;
  my_team_uni text;
begin
  -- --- 1. Wipe any previous run of THIS script ------------------------------
  -- Deleting the accounts cascades to profiles, logs, posts, kudos and squad
  -- membership; the squads themselves are the only separate line.
  delete from auth.users          where id::text like 'feedb%';
  delete from public.varsity_teams where id::text like 'feedc%';

  -- --- 2. The squads --------------------------------------------------------
  insert into public.varsity_teams (id, name, university_key, email_domain, created_by, created_at)
  select t.id, t.name, t.school, null, null, now() - interval '200 days'
  from public.vfeed_seed_teams t;

  -- --- 3. The athletes ------------------------------------------------------
  -- Minimal auth rows with no password, so none of these can be logged into.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  )
  select
    '00000000-0000-0000-0000-000000000000', p.id, 'authenticated', 'authenticated', p.email, null,
    now(), now() - interval '150 days', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', p.name)
  from public.vfeed_seed_people p;

  insert into public.profiles (id, data, onboarding_completed, updated_at)
  select
    p.id,
    jsonb_build_object(
      'name',            p.name,
      'university',      t.school,
      'classYear',       p.class_year,
      'sex',             p.sex,
      'residence',       '',
      'primaryActivity', 'cardio',
      'cardioType',      'Rowing',
      'experienceLevel', 'advanced',
      'topGyms',         '[]'::jsonb,
      'hometownCountry', p.country,
      'languages',       '["English"]'::jsonb,
      'interests',       '[]'::jsonb,
      'bio',             p.bio,
      'photo',           null
    ),
    true,
    now() - interval '5 days'
  from public.vfeed_seed_people p
  join public.vfeed_seed_teams t on t.id = p.team;

  insert into public.varsity_members (team_id, user_id, role, status, invite_id, created_at)
  select p.team, p.id, 'athlete', 'approved', null, now() - interval '150 days'
  from public.vfeed_seed_people p;

  -- --- 4. Their sessions ----------------------------------------------------
  -- `day_key` stays null: these are logged sessions, not slots out of somebody
  -- else's training plan, and null is what the app writes for an extra.
  insert into public.varsity_logs
    (id, athlete_id, log_date, period, day_key, source, title, category, minutes, metres, split, note, created_at)
  select
    s.log_id, s.author,
    (now() - (s.hours_ago || ' hours')::interval)::date,
    case when s.hours_ago::int % 24 < 12 then 'AM' else 'PM' end,
    null, 'extra', s.w_title, s.w_cat, s.w_minutes, s.w_metres, s.w_split,
    coalesce(s.w_note, ''),
    now() - (s.hours_ago || ' hours')::interval
  from public.vfeed_seed_posts s
  where s.log_id is not null;

  -- --- 5. Their posts -------------------------------------------------------
  insert into public.varsity_posts
    (id, author_id, author_name, team_id, team_name, university_key, audience, log_id, body, photo, created_at)
  select
    s.id, s.author, pe.name, t.id, t.name, t.school, 'everyone', s.log_id,
    coalesce(s.body, ''), null,
    now() - (s.hours_ago || ' hours')::interval
  from public.vfeed_seed_posts s
  join public.vfeed_seed_people pe on pe.id = s.author
  join public.vfeed_seed_teams  t  on t.id  = pe.team;

  -- --- 6. The owner's own squad --------------------------------------------
  select m.team_id, t.name, t.university_key
    into my_team, my_team_nm, my_team_uni
    from public.varsity_members m
    join public.varsity_teams t on t.id = m.team_id
    join auth.users u on u.id = m.user_id
   where lower(u.email) = lower(owner_email)
     and m.status = 'approved'
     and m.role <> 'coach'
   limit 1;

  if my_team is null then
    select m.team_id, t.name, t.university_key
      into my_team, my_team_nm, my_team_uni
      from public.varsity_members m
      join public.varsity_teams t on t.id = m.team_id
      join auth.users u on u.id = m.user_id
     where m.status = 'approved'
       and m.role <> 'coach'
       and m.user_id::text not like 'feedb%'
     order by u.created_at desc
     limit 1;
  end if;

  if my_team is null then
    raise notice 'No squad found to attach teammates to — the Team tab will be empty. Join a squad in the app as an athlete, then re-run this script.';
  else
    raise notice 'Teammates added to squad: % (%)', my_team_nm, my_team_uni;

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )
    select
      '00000000-0000-0000-0000-000000000000', m.id, 'authenticated', 'authenticated', m.email, null,
      now(), now() - interval '150 days', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('name', m.name)
    from public.vfeed_seed_mates m;

    insert into public.profiles (id, data, onboarding_completed, updated_at)
    select
      m.id,
      jsonb_build_object(
        'name',            m.name,
        'university',      my_team_uni,
        'primaryActivity', 'cardio',
        'cardioType',      'Rowing',
        'experienceLevel', 'advanced',
        'topGyms',         '[]'::jsonb,
        'languages',       '["English"]'::jsonb,
        'interests',       '[]'::jsonb,
        'bio',             'Squad teammate.',
        'photo',           null
      ),
      true,
      now() - interval '5 days'
    from public.vfeed_seed_mates m;

    insert into public.varsity_members (team_id, user_id, role, status, invite_id, created_at)
    select my_team, m.id, 'athlete', 'approved', null, now() - interval '150 days'
    from public.vfeed_seed_mates m;

    insert into public.varsity_logs
      (id, athlete_id, log_date, period, day_key, source, title, category, minutes, metres, split, note, created_at)
    select
      m.log_id, m.id,
      (now() - (m.hours_ago || ' hours')::interval)::date,
      'AM', null, 'extra', m.w_title, m.w_cat, m.w_minutes, m.w_metres, m.w_split, '',
      now() - (m.hours_ago || ' hours')::interval
    from public.vfeed_seed_mates m
    where m.log_id is not null;

    insert into public.varsity_posts
      (id, author_id, author_name, team_id, team_name, university_key, audience, log_id, body, photo, created_at)
    select
      m.post_id, m.id, m.name, my_team, my_team_nm, my_team_uni, m.audience, m.log_id,
      m.body, null, now() - (m.hours_ago || ' hours')::interval
    from public.vfeed_seed_mates m;
  end if;

  -- --- 7. 💪 ----------------------------------------------------------------
  -- Between two and seven of the other invented athletes on each post, picked
  -- by a hash of the two ids so every run produces the same feed. A team-only
  -- post is only ever reacted to by somebody on that same squad — the counts
  -- have to obey the same rule the feed does.
  insert into public.varsity_post_kudos (post_id, user_id, created_at)
  select vp.id, k.id, vp.created_at + interval '30 minutes'
  from public.varsity_posts vp
  join lateral (
    select mm.user_id as id
      from public.varsity_members mm
     where mm.user_id::text like 'feedb%'
       and mm.user_id <> vp.author_id
       and (vp.audience = 'everyone' or mm.team_id = vp.team_id)
     order by md5(mm.user_id::text || vp.id::text)
     limit 2 + (get_byte(decode(md5(vp.id::text), 'hex'), 0) % 6)
  ) k on true
  where vp.author_id::text like 'feedb%'
  on conflict do nothing;

  raise notice 'Varsity feed filled: % squads, % athletes, % open posts.',
    (select count(*) from public.vfeed_seed_teams),
    (select count(*) from public.vfeed_seed_people),
    (select count(*) from public.vfeed_seed_posts);
end $$;
