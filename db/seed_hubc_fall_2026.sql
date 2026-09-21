-- ============================================================================
-- UNIsport — THE SQUAD'S REAL FALL BLOCK, so the app can be shown to the coaches
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   The coach's own two sheets, typed into the app instead of a spreadsheet:
--     1. "HUBC Fall 2026" — six Monday–Sunday weeks from Mon 7 Sep to the Head
--        of the Charles on Sat 17 Oct, every day's AM and PM slot filled with
--        the words the sheet uses, in the zone the sheet's colour gives it
--        (green UT2, orange/yellow UT1, red hard, magenta weights, grey flex,
--        olive off).
--     2. The lineup sheet for the 16k UT2 — three eights (Engstrom, Hamlin,
--        92), a pair and a coxed four, published, plus the ten people who were
--        not in a boat that morning: Rx, the ergs, OYO and the launch.
--
--   Seats reference roster ids in lib/varsity/coachLineup.ts, which carries the
--   squad's real names.
--
-- SAFE TO RE-RUN. Every row is keyed by date or by a fixed id, so running it
-- twice rewrites the same rows. Anything the coach then builds by hand inside
-- these six weeks WILL be overwritten by the next run — that is the point: the
-- sheet is the source, this is the import.
--
-- Run it with node + DATABASE_URL (see the notes in db/seed_varsity_demo.sql)
-- or paste it into the Supabase SQL editor.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The junk test block the console was left with ("Hhh", race "Tyy"). It
--    overlaps these six weeks, and two published blocks over one day leaves
--    the athlete's Home picking between them.
-- ---------------------------------------------------------------------------
delete from public.varsity_plan_blocks where name = 'Hhh' or race_name = 'Tyy';

-- ---------------------------------------------------------------------------
-- 2. The block. Published, so the squad can see it, and pointed at the race.
-- ---------------------------------------------------------------------------
insert into public.varsity_plan_blocks
  (id, name, start_date, end_date, status, race_name, race_date, updated_at)
values
  ('hubc-fall-2026', 'HUBC Fall 2026', '2026-09-07', '2026-10-18', 'published',
   'Head of the Charles', '2026-10-17', now())
on conflict (id) do update set
  name = excluded.name, start_date = excluded.start_date, end_date = excluded.end_date,
  status = excluded.status, race_name = excluded.race_name, race_date = excluded.race_date,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. Every slot in the six weeks, cell by cell off the sheet.
--    `mins`, `metres` and `split` are not part of the plan — they are what a
--    session of that size comes out as, and step 7 uses them to fill in the
--    training the squad has already done.
-- ---------------------------------------------------------------------------
drop table if exists public.hubc_fall_slots;
create table public.hubc_fall_slots (
  d date, period text, category text, intensity text, description text,
  location text, team_workout boolean default false, board text,
  mins int, metres int, split text
);
alter table public.hubc_fall_slots enable row level security;  -- server-side only

insert into public.hubc_fall_slots
  (d, period, category, intensity, description, location, team_workout, board, mins, metres, split) values
-- == Week 1 · 7-13 Sep ======================================================
('2026-09-07','AM','water','UT2','UT2 Mixed Eights','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-09-07','PM','water','UT1','RP3/Water :50/:10 off Mixed Eights — one on RP3, one on water','Newell Boathouse',false,null,60,13000,'2:18'),
('2026-09-08','AM','water','UT2','UT2 Small Boats','Newell Boathouse',false,null,65,14500,'2:14'),
('2026-09-08','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-09-09','AM','off',null,'',null,false,null,null,null,null),
('2026-09-09','PM','water','UT2','Skill and Drill Mixed Eight','Newell Boathouse',false,null,60,12000,'2:30'),
('2026-09-10','AM','water','hard','HOCR Prep Mixed Eights','Newell Boathouse',false,null,70,15000,'2:20'),
('2026-09-10','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-09-11','AM','water','UT2','UT2 Small Boats','Newell Boathouse',false,null,65,14500,'2:14'),
('2026-09-11','PM','water','UT2','UT2 Mixed Eights','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-09-12','AM','water','UT1','Basin Shots Mixed Eights','Newell Boathouse',false,null,55,11000,'2:30'),
('2026-09-12','PM','flex',null,'Recovery/Flex: 45'' volume OR Full roll out + core circuit',null,false,null,45,null,null),
('2026-09-13','AM','off',null,'',null,false,null,null,null,null),
('2026-09-13','PM','off',null,'',null,false,null,null,null,null),
-- == Week 2 · 14-20 Sep =====================================================
('2026-09-14','AM','water','UT2','12-14k UT2 small boats','Newell Boathouse',false,null,60,13000,'2:18'),
('2026-09-14','PM','water','UT2','16k UT2','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-09-15','AM','water','hard','3x10''@26','Newell Boathouse',false,null,60,13500,'2:13'),
('2026-09-15','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-09-16','AM','off',null,'',null,false,null,null,null,null),
('2026-09-16','PM','water','UT2','14-16k','Newell Boathouse',false,null,66,15000,'2:12'),
('2026-09-17','AM','water','UT2','16k','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-09-17','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-09-18','AM','water','UT2','14-16k UT2 small boats','Newell Boathouse',false,null,66,15000,'2:12'),
('2026-09-18','PM','water','UT2','12k UT2','Newell Boathouse',false,null,53,12000,'2:12'),
('2026-09-19','AM','water','UT1','3x5'' @ 28','Newell Boathouse',false,null,55,12000,'2:16'),
('2026-09-19','PM','flex',null,'Recovery/Flex: 45'' volume OR Full roll out + core circuit',null,false,null,45,null,null),
('2026-09-20','AM','off',null,'',null,false,null,null,null,null),
('2026-09-20','PM','off',null,'',null,false,null,null,null,null),
-- == Week 3 · 21-27 Sep · the week the lineup sheet is from ==================
('2026-09-21','AM','water','UT2','16k UT2','Newell Boathouse',true,'average',70,16000,'2:11'),
('2026-09-21','PM','erg','hard','5k TEST','Newell erg room',true,'ranked',17,5000,'1:42'),
('2026-09-22','AM','water','UT2','14-16k UT2 small boats','Newell Boathouse',false,null,66,15000,'2:12'),
('2026-09-22','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-09-23','AM','off',null,'',null,false,null,null,null,null),
('2026-09-23','PM','water','UT2','14k Skill and Drill','Newell Boathouse',false,null,65,14000,'2:19'),
('2026-09-24','AM','water','hard','3x12''@28','Newell Boathouse',false,null,65,14500,'2:14'),
('2026-09-24','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-09-25','AM','water','UT2','14-16k UT2 small boats','Newell Boathouse',false,null,66,15000,'2:12'),
('2026-09-25','PM','water','UT2','12k UT2','Newell Boathouse',false,null,53,12000,'2:12'),
('2026-09-26','AM','water','UT1','3x5'' @ 30','Newell Boathouse',false,null,55,12000,'2:16'),
('2026-09-26','PM','flex',null,'Recovery/Flex: 45'' volume OR Full roll out + core circuit',null,false,null,45,null,null),
('2026-09-27','AM','off',null,'',null,false,null,null,null,null),
('2026-09-27','PM','off',null,'',null,false,null,null,null,null),
-- == Week 4 · 28 Sep - 4 Oct ================================================
('2026-09-28','AM','water','UT2','14-16k UT2 small boats','Newell Boathouse',false,null,66,15000,'2:12'),
('2026-09-28','PM','water','UT2','16k UT2','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-09-29','AM','water','hard','3x2.5k @ 30','Newell Boathouse',false,null,60,13000,'2:18'),
('2026-09-29','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-09-30','AM','off',null,'',null,false,null,null,null,null),
('2026-09-30','PM','water','UT2','16k UT2','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-10-01','AM','water','UT2','18k UT2','Newell Boathouse',false,null,79,18000,'2:12'),
('2026-10-01','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-10-02','AM','water','UT2','2xHOC course UT2','Newell Boathouse',false,null,68,15000,'2:16'),
('2026-10-02','PM','water','UT2','12k UT2','Newell Boathouse',false,null,53,12000,'2:12'),
('2026-10-03','AM','water','hard','2 miles at 32, 1 mile at 34, .5 mile at 34','Newell Boathouse',true,'ranked',65,14000,'2:19'),
('2026-10-03','PM','flex',null,'Recovery/Flex: 45'' volume OR Full roll out + core circuit',null,false,null,45,null,null),
('2026-10-04','AM','off',null,'',null,false,null,null,null,null),
('2026-10-04','PM','off',null,'',null,false,null,null,null,null),
-- == Week 5 · 5-11 Oct ======================================================
('2026-10-05','AM','water','hard','2x2 miles at race pace','Newell Boathouse',true,'ranked',65,14000,'2:19'),
('2026-10-05','PM','water','UT2','16k UT2','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-10-06','AM','water','UT2','16k UT2','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-10-06','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-10-07','AM','off',null,'',null,false,null,null,null,null),
('2026-10-07','PM','water','UT1','18k UT2, some race pace work by boat','Newell Boathouse',false,null,80,18000,'2:13'),
('2026-10-08','AM','water','UT2','18k','Newell Boathouse',false,null,79,18000,'2:12'),
('2026-10-08','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-10-09','AM','water','UT2','2xHOC course UT2','Newell Boathouse',false,null,68,15000,'2:16'),
('2026-10-09','PM','water','UT2','12k UT2','Newell Boathouse',false,null,53,12000,'2:12'),
('2026-10-10','AM','water','hard','3x 1 mile at pace','Newell Boathouse',true,'ranked',60,13000,'2:18'),
('2026-10-10','PM','flex',null,'Recovery/Flex: 45'' volume OR Full roll out + core circuit',null,false,null,45,null,null),
('2026-10-11','AM','off',null,'',null,false,null,null,null,null),
('2026-10-11','PM','off',null,'',null,false,null,null,null,null),
-- == Week 6 · 12-18 Oct · race week =========================================
('2026-10-12','AM','water','hard','Full Pull','Newell Boathouse',true,'ranked',70,16000,'2:15'),
('2026-10-12','PM','water','UT2','12k','Newell Boathouse',false,null,53,12000,'2:12'),
('2026-10-13','AM','water','UT2','16k','Newell Boathouse',false,null,70,16000,'2:11'),
('2026-10-13','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-10-14','AM','off',null,'',null,false,null,null,null,null),
('2026-10-14','PM','water','UT2','14k Skill and Drill','Newell Boathouse',false,null,65,14000,'2:19'),
('2026-10-15','AM','water','hard','2x1 mile at pace','Newell Boathouse',false,null,55,12000,'2:18'),
('2026-10-15','PM','weights',null,'Weights at Palmer Dixon OR Flex training','Palmer Dixon',false,null,50,null,null),
('2026-10-16','AM','water','UT2','Row over the course, some bursts','Newell Boathouse',false,null,55,12500,'2:12'),
('2026-10-16','PM','off',null,'HClub Event',null,false,null,null,null,null),
('2026-10-17','AM','water','hard','HEAD OF THE CHARLES — racing for Club 8s','Charles River',false,null,60,12000,'2:05'),
('2026-10-17','PM','off',null,'',null,false,null,null,null,null),
('2026-10-18','AM','water','hard','HEAD OF THE CHARLES — racing for Champ 8s','Charles River',false,null,60,12000,'2:05'),
('2026-10-18','PM','off',null,'',null,false,null,null,null,null);

-- day_key is '<year>-<ZERO-BASED month>-<day>-<AM|PM>' — the same string
-- sessionKey() builds in lib/varsity/coachPlan.ts. September is 8, October 9.
insert into public.varsity_plan_sessions
  (day_key, category, intensity, description, time, location, team_workout, board, updated_at)
select
  extract(year from d)::int || '-' || (extract(month from d)::int - 1) || '-' || extract(day from d)::int || '-' || period,
  category, intensity, description,
  case period when 'AM' then '7:00 AM' else '4:30 PM' end,
  location, team_workout, coalesce(board, 'average'), now()
from public.hubc_fall_slots
on conflict (day_key) do update set
  category = excluded.category, intensity = excluded.intensity,
  description = excluded.description, time = excluded.time, location = excluded.location,
  team_workout = excluded.team_workout, board = excluded.board, updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. THE LINEUP SHEET. Three eights, a pair and a coxed four, bow to stroke.
--    Boat ids are 1V / 2V / 3V / the small boats, which is also what the crew
--    videos already in the database hang off (db/varsity_videos.sql).
--    `dock` is the push-off time; the sheet does not record one, so the eights
--    are set to the squad's usual 7:15 and the small boats fifteen minutes
--    later. Notes are left EMPTY on purpose — a coaching instruction is the
--    coach's to type, not ours to invent.
-- ---------------------------------------------------------------------------
drop table if exists public.hubc_fall_boats;
create table public.hubc_fall_boats (variant text, boats jsonb);
alter table public.hubc_fall_boats enable row level security;  -- server-side only

insert into public.hubc_fall_boats (variant, boats) values
('A', '[
  {"id":"boat-1v","badge":"8+","name":"Engstrom","dock":"7:15am","oars":"Yellow","note":"","hasCox":true,"coxId":"miller",
   "seats":[{"label":"1","athleteId":"cleugh"},{"label":"2","athleteId":"elam-hughes"},{"label":"3","athleteId":"jack-sulger"},{"label":"4","athleteId":"pierce-lapham"},{"label":"5","athleteId":"sam-woodgate"},{"label":"6","athleteId":"jack-hansen-knarhoi"},{"label":"7","athleteId":"marco-gandola"},{"label":"8","athleteId":"sam-gallaudet"}]},
  {"id":"boat-2v","badge":"8+","name":"Hamlin","dock":"7:15am","oars":"Blue","note":"","hasCox":true,"coxId":"cate-frerichs",
   "seats":[{"label":"1","athleteId":"bob-rawlinson"},{"label":"2","athleteId":"joseph-baker"},{"label":"3","athleteId":"elias"},{"label":"4","athleteId":"marcus-chung"},{"label":"5","athleteId":"kynan-tallec-botos"},{"label":"6","athleteId":"obyrne"},{"label":"7","athleteId":"owen-finnerty"},{"label":"8","athleteId":"alex-sanchez-fretz"}]},
  {"id":"boat-3v","badge":"8+","name":"92","dock":"7:15am","oars":"2xblue","note":"","hasCox":true,"coxId":"branco",
   "seats":[{"label":"1","athleteId":"wu"},{"label":"2","athleteId":"rabinovitz"},{"label":"3","athleteId":"teddy-plimpton"},{"label":"4","athleteId":"wolskel"},{"label":"5","athleteId":"martin-houska"},{"label":"6","athleteId":"adam-cech"},{"label":"7","athleteId":"ryan-cornelius"},{"label":"8","athleteId":"george-farkas"}]},
  {"id":"boat-pair","badge":"2-","name":"","dock":"7:30am","oars":"2xyellow","note":"","hasCox":false,"coxId":null,
   "seats":[{"label":"1","athleteId":"o-cruz-abrams"},{"label":"2","athleteId":"mason-cruz-abrams"}]},
  {"id":"boat-4","badge":"4+","name":"","dock":"7:30am","oars":"2xyellow","note":"","hasCox":true,"coxId":"nick-yoo",
   "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"julian-paul"},{"label":"3","athleteId":"hazen"},{"label":"4","athleteId":"kevin-weldon"}]}
]'::jsonb),
-- The same five crews with the two eights' bow seats swapped, so a coach
-- stepping back through last week does not find fifteen identical mornings.
('B', '[
  {"id":"boat-1v","badge":"8+","name":"Engstrom","dock":"7:15am","oars":"Yellow","note":"","hasCox":true,"coxId":"miller",
   "seats":[{"label":"1","athleteId":"bob-rawlinson"},{"label":"2","athleteId":"elam-hughes"},{"label":"3","athleteId":"jack-sulger"},{"label":"4","athleteId":"pierce-lapham"},{"label":"5","athleteId":"sam-woodgate"},{"label":"6","athleteId":"jack-hansen-knarhoi"},{"label":"7","athleteId":"marco-gandola"},{"label":"8","athleteId":"sam-gallaudet"}]},
  {"id":"boat-2v","badge":"8+","name":"Hamlin","dock":"7:15am","oars":"Blue","note":"","hasCox":true,"coxId":"cate-frerichs",
   "seats":[{"label":"1","athleteId":"cleugh"},{"label":"2","athleteId":"joseph-baker"},{"label":"3","athleteId":"elias"},{"label":"4","athleteId":"marcus-chung"},{"label":"5","athleteId":"kynan-tallec-botos"},{"label":"6","athleteId":"obyrne"},{"label":"7","athleteId":"owen-finnerty"},{"label":"8","athleteId":"alex-sanchez-fretz"}]},
  {"id":"boat-3v","badge":"8+","name":"92","dock":"7:15am","oars":"2xblue","note":"","hasCox":true,"coxId":"branco",
   "seats":[{"label":"1","athleteId":"wu"},{"label":"2","athleteId":"rabinovitz"},{"label":"3","athleteId":"teddy-plimpton"},{"label":"4","athleteId":"wolskel"},{"label":"5","athleteId":"martin-houska"},{"label":"6","athleteId":"adam-cech"},{"label":"7","athleteId":"ryan-cornelius"},{"label":"8","athleteId":"george-farkas"}]},
  {"id":"boat-pair","badge":"2-","name":"","dock":"7:30am","oars":"2xyellow","note":"","hasCox":false,"coxId":null,
   "seats":[{"label":"1","athleteId":"o-cruz-abrams"},{"label":"2","athleteId":"mason-cruz-abrams"}]},
  {"id":"boat-4","badge":"4+","name":"","dock":"7:30am","oars":"2xyellow","note":"","hasCox":true,"coxId":"nick-yoo",
   "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"julian-paul"},{"label":"3","athleteId":"hazen"},{"label":"4","athleteId":"kevin-weldon"}]}
]'::jsonb);

-- FIRST, clear every practice inside the six weeks. The console was carrying
-- lineups from the old demo data: crews published on mornings this plan has
-- as OFF, and half-built drafts on days weeks ahead. A lineup is only ever
-- right next to the session it belongs to, so the whole range is rewritten
-- from the sheet rather than merged with what was there.
delete from public.varsity_lineups l
 where exists (
   select 1 from public.hubc_fall_slots s
    where l.day_key = extract(year from s.d)::int || '-' || (extract(month from s.d)::int - 1) || '-' || extract(day from s.d)::int || '-' || s.period
 );

-- Every water practice from the start of the block up to today gets its boats.
-- A practice that has already happened also carries what the crew actually did
-- (metres + working minutes on each boat — lib/varsity/boatWork.ts), which is
-- what the season's mileage is added up from. Today's morning has not happened
-- yet, so it carries neither.
insert into public.varsity_lineups (day_key, boats, status, updated_at)
select
  extract(year from s.d)::int || '-' || (extract(month from s.d)::int - 1) || '-' || extract(day from s.d)::int || '-' || s.period,
  (select jsonb_agg(
            case when s.d < current_date
              then b || jsonb_build_object('metres', s.metres, 'minutes', s.mins)
              else b || jsonb_build_object('metres', null, 'minutes', null)
            end)
     from jsonb_array_elements(v.boats) b),
  'published', now()
from public.hubc_fall_slots s
join public.hubc_fall_boats v
  on v.variant = case when extract(dow from s.d)::int in (1, 3, 5) then 'A' else 'B' end
where s.category = 'water'
  and s.d <= current_date
on conflict (day_key) do update set
  boats = excluded.boats, status = excluded.status, updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. THE TEN WHO WERE NOT IN A BOAT, down the right-hand side of the sheet.
--    Rx is a rehab block and runs until the coach brings them back; the ergs,
--    OYO and the launch are just this morning.
-- ---------------------------------------------------------------------------
-- The reasons a live database will accept. It shipped with only INJ and SICK;
-- the squad sheet also has Rx, the ergs, OYO and the launch (db/varsity_availability.sql).
alter table public.varsity_availability drop constraint if exists varsity_availability_reason_check;
alter table public.varsity_availability add constraint varsity_availability_reason_check
  check (reason in ('INJ', 'SICK', 'RX', 'ERG', 'OYO', 'LAUNCH'));
delete from public.varsity_availability
 where athlete_id in ('alp-karadogan','charles-richards','luca-vicino',
                      'george-burney','saeed','schinnerl',
                      'yu','mike-thomas','nat-toms','grieser');

insert into public.varsity_availability (athlete_id, reason, from_date, until_date, updated_at) values
  ('alp-karadogan',   'RX',     current_date - 9, null,         now()),
  ('charles-richards','RX',     current_date - 5, null,         now()),
  ('luca-vicino',     'RX',     current_date - 2, null,         now()),
  ('george-burney',   'ERG',    current_date,     current_date, now()),
  ('saeed',           'ERG',    current_date,     current_date, now()),
  ('schinnerl',       'ERG',    current_date,     current_date, now()),
  ('yu',              'OYO',    current_date,     current_date, now()),
  ('mike-thomas',     'OYO',    current_date,     current_date, now()),
  ('nat-toms',        'OYO',    current_date,     current_date, now()),
  ('grieser',         'LAUNCH', current_date,     current_date, now());

-- ---------------------------------------------------------------------------
-- 6. WHICH SEAT IS MINE. Both demo accounts claim the owner's own seat — 5 in
--    92 — so the athlete side lights up "You" whichever one is signed in.
-- ---------------------------------------------------------------------------
update public.profiles
   set data = jsonb_set(coalesce(data, '{}'::jsonb), '{varsity,rosterId}', '"martin-houska"', true)
 where id in (
   select u.id from auth.users u
    where lower(u.email) in ('martinhouska777@gmail.com', 'martinhouska701@gmail.com')
 );

-- ---------------------------------------------------------------------------
-- 7. THE TRAINING ALREADY DONE — weeks 1 and 2, up to yesterday, logged
--    against the plan in the coach's own words. Today is left UNLOGGED: that
--    is the demo of logging a session straight off the plan.
-- ---------------------------------------------------------------------------
delete from public.varsity_logs where id::text like 'de11e%' and log_date >= '2026-09-07';

insert into public.varsity_logs
  (id, athlete_id, log_date, period, day_key, source, title, category, minutes, metres, split, note)
select
  ('de11e1' || a.tag || '-0000-4000-8000-' || lpad(to_hex((row_number() over (partition by a.tag order by s.d, s.period))::int), 12, '0'))::uuid,
  a.id, s.d, s.period,
  extract(year from s.d)::int || '-' || (extract(month from s.d)::int - 1) || '-' || extract(day from s.d)::int || '-' || s.period,
  'plan',
  coalesce(nullif(s.description, ''), initcap(s.category)),
  s.category,
  -- A day's work is never exactly what was written down: a couple of minutes
  -- either way, so the statistics read like training and not like a table.
  s.mins + mod(extract(doy from s.d)::int, 3) - 1,
  s.metres,
  s.split,
  ''
from public.hubc_fall_slots s
cross join (
  select u.id, case when lower(u.email) like '%701%' then '01' else '02' end as tag
    from auth.users u
   where lower(u.email) in ('martinhouska777@gmail.com', 'martinhouska701@gmail.com')
) a
where s.category <> 'off'
  and s.d >= '2026-09-07'
  and s.d < current_date
on conflict (athlete_id, day_key) do nothing;

-- ---------------------------------------------------------------------------
-- 8. THE DAILY CHECK-IN for the last week (lib/varsity/checkIn.ts) — hours
--    slept, and tiredness and soreness out of ten. Kept on the profile, so
--    there is no table for it.
-- ---------------------------------------------------------------------------
update public.profiles p
   set data = jsonb_set(coalesce(p.data, '{}'::jsonb), '{varsity,checkIns}', c.blob, true)
  from (
    select jsonb_object_agg(
             to_char(current_date - g, 'YYYY-MM-DD'),
             jsonb_build_object(
               'sleep', 6 + mod(g, 3),
               'tired', 4 + mod(g * 3, 4),
               'sore',  3 + mod(g * 2, 4))) as blob
      from generate_series(1, 7) g
  ) c
 where p.id in (
   select u.id from auth.users u
    where lower(u.email) in ('martinhouska777@gmail.com', 'martinhouska701@gmail.com')
 );

-- The two helper tables stay in place (row-level security on, no policies) so
-- the import can be re-run or adjusted. Drop them with:
--   drop table if exists public.hubc_fall_slots, public.hubc_fall_boats;
