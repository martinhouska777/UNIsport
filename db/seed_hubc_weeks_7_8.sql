-- ============================================================================
-- UNIsport: HUBC FALL 2026, WEEKS 7 AND 8, and the lineup sheet for Thu 22 Oct AM
-- ----------------------------------------------------------------------------
-- Typed from the team's two sheets (owner, 2026-10-22, for showing the coaches):
--   "HUBC training 26_27 - Phase 2"   Week 7 (10/19-10/25) and Week 8, which the
--                                     sheet heads "10/16-11/1"; its days are
--                                     Mon 26 Oct to Sun 1 Nov.
--   "HUBC line ups 26-27 - 10_22 AM"  headed "16-18k UT2": Corrigan, Engstrom
--                                     and Hamlin (eights), three Hudson pairs,
--                                     Wu in the single, and the ten not in a
--                                     boat (Launch, 3x25' UT2, Rx, OYO).
--
-- Same rules as db/seed_hubc_fall_2026.sql, which holds weeks 1 to 6:
--   colour on the sheet gives the zone: green UT2, yellow/orange UT1, red hard,
--     magenta weights, grey and cyan flex, olive off;
--   AM is the sheet's "7am in house", PM keeps the app's 4:30 (the sheet says
--     Monday and Wednesday afternoons follow class times);
--   push-off is 7:15am for the eights and 7:30am for the small boats, as before;
--   crew notes stay empty, a coaching instruction is the coach's to type.
--
-- My call, not on the sheet: Mon 26 Oct PM "30'@20" is put on the WATER.
--
-- SAFE TO RE-RUN. Every row is keyed by a fixed date or day_key.
-- Run: node scripts/db/run-sql.mjs C:/Unisport/db/seed_hubc_weeks_7_8.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. The block runs to the last day on the sheet, Sun 1 Nov, so the athletes
--    see the whole of week 8 (athleteHome only shows days inside a published
--    block). It never shortens a block that already runs longer.
-- ---------------------------------------------------------------------------
update public.varsity_plan_blocks
   set end_date = greatest(end_date, date '2026-11-01'), updated_at = now()
 where id = 'hubc-fall-2026';

-- ---------------------------------------------------------------------------
-- 2. Every slot of the two weeks, cell by cell. day_key is
--    '<year>-<ZERO-BASED month>-<day>-<AM|PM>': October is 9, November 10.
-- ---------------------------------------------------------------------------
insert into public.varsity_plan_sessions
  (day_key, category, intensity, description, time, location, note, team_workout, board, updated_at)
select k, cat, zone, descr, case when k like '%-AM' then '7:00 AM' else '4:30 PM' end,
       null, null, false, 'average', now()
from (values
-- == Week 7 (19-25 Oct) ======================================================
-- Monday to Wednesday is one merged olive cell: OFF.
('2026-9-19-AM','off',null,''),
('2026-9-19-PM','off',null,''),
('2026-9-20-AM','off',null,''),
('2026-9-20-PM','off',null,''),
('2026-9-21-AM','off',null,''),
('2026-9-21-PM','off',null,''),
('2026-9-22-AM','water','UT2','16k UT2 in 8s'),
('2026-9-22-PM','weights',null,'Weights at Palmer Dixon'),
('2026-9-23-AM','flex',null,'Flex: 60'' erg, 75'' bike, 50'' run'),
('2026-9-23-PM','water','UT2','16k UT2 in 8s'),
('2026-9-24-AM','water','UT1','2x3mi, Piece 1: DPS, Piece 2: @24'),
('2026-9-24-PM','flex',null,'Recovery/Flex: 45'' volume OR Full roll out + core circuit'),
('2026-9-25-AM','off',null,''),
('2026-9-25-PM','off',null,''),
-- == Week 8 (26 Oct to 1 Nov) ================================================
('2026-9-26-AM','water','UT2','18k UT2 in 8s OR 14k UT2 in 2-s'),
('2026-9-26-PM','water','UT1','30''@20, including 45'' total UT2 warm up and cool down'),
('2026-9-27-AM','water','UT2','18k UT2 in 8s OR 14k UT2 in 2-s'),
('2026-9-27-PM','weights',null,'Weights at Palmer Dixon'),
('2026-9-28-AM','off',null,''),
('2026-9-28-PM','water','UT2','16k UT2'),
('2026-9-29-AM','water','hard','4x3'' OPEN in small boats'),
('2026-9-29-PM','weights',null,'Weights at Palmer Dixon'),
('2026-9-30-AM','flex',null,'Flex: 65'' erg, 80'' bike, 55'' run'),
('2026-9-30-PM','water','UT2','16k UT2'),
('2026-9-31-AM','water','UT1','2x3mi, Piece 1: DPS, Piece 2: @26'),
('2026-9-31-PM','flex',null,'Recovery/Flex: 45'' volume OR Full roll out + core circuit'),
('2026-10-1-AM','off',null,''),
('2026-10-1-PM','off',null,'')
) as s(k, cat, zone, descr)
on conflict (day_key) do update set
  category = excluded.category, intensity = excluded.intensity,
  description = excluded.description, time = excluded.time, location = excluded.location,
  note = excluded.note, team_workout = excluded.team_workout, board = excluded.board,
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. THE LINEUP SHEET, Thu 22 Oct AM. Seats run bow to stroke, roster ids from
--    lib/varsity/coachLineup.ts ("HK" is Jack Hansen-Knarhoi). The three Hudson
--    pairs are read off the sheet's fourth column in pairs: Hazen and Paul,
--    Kiio and Thomas, Plimpton and Farkas. Metres and minutes stay empty: what
--    a crew actually did is entered after the outing.
-- ---------------------------------------------------------------------------
insert into public.varsity_lineups (day_key, boats, status, updated_at) values
('2026-9-22-AM', '[
  {"id":"boat-1022-corrigan","badge":"8+","name":"Corrigan","dock":"7:15am","oars":"Yellow","note":"","hasCox":true,"coxId":"nat-toms","metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"cleugh"},{"label":"2","athleteId":"obyrne"},{"label":"3","athleteId":"martin-houska"},{"label":"4","athleteId":"schinnerl"},{"label":"5","athleteId":"jack-sulger"},{"label":"6","athleteId":"joseph-baker"},{"label":"7","athleteId":"marco-gandola"},{"label":"8","athleteId":"sam-gallaudet"}]},
  {"id":"boat-1022-engstrom","badge":"8+","name":"Engstrom","dock":"7:15am","oars":"Blue","note":"","hasCox":true,"coxId":"cate-frerichs","metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"luca-vicino"},{"label":"2","athleteId":"rabinovitz"},{"label":"3","athleteId":"ryan-cornelius"},{"label":"4","athleteId":"wolskel"},{"label":"5","athleteId":"sam-woodgate"},{"label":"6","athleteId":"marcus-chung"},{"label":"7","athleteId":"bob-rawlinson"},{"label":"8","athleteId":"pierce-lapham"}]},
  {"id":"boat-1022-hamlin","badge":"8+","name":"Hamlin","dock":"7:15am","oars":"2x yellow","note":"","hasCox":true,"coxId":"miller","metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"elias"},{"label":"2","athleteId":"elam-hughes"},{"label":"3","athleteId":"kynan-tallec-botos"},{"label":"4","athleteId":"jack-hansen-knarhoi"},{"label":"5","athleteId":"charles-richards"},{"label":"6","athleteId":"alex-sanchez-fretz"},{"label":"7","athleteId":"owen-finnerty"},{"label":"8","athleteId":"adam-cech"}]},
  {"id":"boat-1022-pair-1","badge":"2-","name":"Hudson","dock":"7:30am","oars":"Cow","note":"","hasCox":false,"coxId":null,"metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"hazen"},{"label":"2","athleteId":"julian-paul"}]},
  {"id":"boat-1022-pair-2","badge":"2-","name":"Hudson","dock":"7:30am","oars":"Cow","note":"","hasCox":false,"coxId":null,"metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"mike-thomas"}]},
  {"id":"boat-1022-pair-3","badge":"2-","name":"Hudson","dock":"7:30am","oars":"Cow","note":"","hasCox":false,"coxId":null,"metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"teddy-plimpton"},{"label":"2","athleteId":"george-farkas"}]},
  {"id":"boat-1022-single","badge":"1x","name":"","dock":"7:30am","oars":"","note":"","hasCox":false,"coxId":null,"metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"wu"}]}
]'::jsonb, 'published', now())
on conflict (day_key) do update set
  boats = excluded.boats, status = excluded.status, updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. THE TEN NOT IN A BOAT, down the right of the sheet. Launch, the erg
--    (3x25' UT2) and OYO are that day only; Rx runs until the coach brings
--    them back in.
-- ---------------------------------------------------------------------------
delete from public.varsity_availability
 where from_date = date '2026-10-22'
   and athlete_id in ('grieser','nick-yoo','branco','george-burney','saeed','mason-cruz-abrams',
                      'alp-karadogan','kevin-weldon','o-cruz-abrams','yu');

insert into public.varsity_availability (athlete_id, reason, from_date, until_date, updated_at) values
  ('grieser',           'LAUNCH', '2026-10-22', '2026-10-22', now()),
  ('nick-yoo',          'LAUNCH', '2026-10-22', '2026-10-22', now()),
  ('branco',            'LAUNCH', '2026-10-22', '2026-10-22', now()),
  ('george-burney',     'ERG',    '2026-10-22', '2026-10-22', now()),
  ('saeed',             'ERG',    '2026-10-22', '2026-10-22', now()),
  ('mason-cruz-abrams', 'ERG',    '2026-10-22', '2026-10-22', now()),
  ('alp-karadogan',     'RX',     '2026-10-22', null,         now()),
  ('kevin-weldon',      'RX',     '2026-10-22', null,         now()),
  ('o-cruz-abrams',     'RX',     '2026-10-22', null,         now()),
  ('yu',                'OYO',    '2026-10-22', '2026-10-22', now());
