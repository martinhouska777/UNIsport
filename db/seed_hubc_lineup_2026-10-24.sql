-- ============================================================================
-- UNIsport: HUBC lineup for Sat 24 Oct AM
-- ----------------------------------------------------------------------------
-- Typed from the team's lineup sheet (owner, 2026-10-24: "put there todays
-- lineups"). The sheet is headed "16-18k UT2", the same heading Thursday's sheet
-- carried; the boats go on today's one water session, the morning ("2x3mi,
-- Piece 1: DPS, Piece 2: @24"), which the plan keeps as it is.
--
--   Engstrom (8+)    Toms coxing, yellow oars
--   Hamlin (8+)      Frerichs coxing, 2x yellow oars
--   92 (8+)          Branco coxing, blue oars
--   Filippi (4+)     Grieser coxing, Cow oars
--
-- Seats run bow to stroke, roster ids from lib/varsity/coachLineup.ts ("HK" is
-- Jack Hansen-Knarhoi, "Vicino, L" is Luca Vicino). The four sits in the sheet's
-- rows 5 to stroke: Kiio bow, Paul 2, Plimpton 3, Thomas stroke. Push-off is
-- 7:15am for every boat, as Thursday's eights. Metres and minutes stay empty:
-- what a crew did is entered after the outing.
--
-- SAFE TO RE-RUN. Keyed by the day_key and today's date.
-- Run: node scripts/db/run-sql.mjs C:/Unisport/db/seed_hubc_lineup_2026-10-24.sql
-- ============================================================================

-- 1. The boats, published.
insert into public.varsity_lineups (day_key, boats, status, updated_at) values
('2026-9-24-AM', '[
  {"id":"boat-1024-engstrom","badge":"8+","name":"Engstrom","dock":"7:15am","oars":"Yellow","note":"","hasCox":true,"coxId":"nat-toms","metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"cleugh"},{"label":"2","athleteId":"alex-sanchez-fretz"},{"label":"3","athleteId":"kynan-tallec-botos"},{"label":"4","athleteId":"schinnerl"},{"label":"5","athleteId":"jack-sulger"},{"label":"6","athleteId":"jack-hansen-knarhoi"},{"label":"7","athleteId":"marco-gandola"},{"label":"8","athleteId":"sam-gallaudet"}]},
  {"id":"boat-1024-hamlin","badge":"8+","name":"Hamlin","dock":"7:15am","oars":"2x yellow","note":"","hasCox":true,"coxId":"cate-frerichs","metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"owen-finnerty"},{"label":"2","athleteId":"elam-hughes"},{"label":"3","athleteId":"ryan-cornelius"},{"label":"4","athleteId":"pierce-lapham"},{"label":"5","athleteId":"sam-woodgate"},{"label":"6","athleteId":"marcus-chung"},{"label":"7","athleteId":"bob-rawlinson"},{"label":"8","athleteId":"adam-cech"}]},
  {"id":"boat-1024-92","badge":"8+","name":"92","dock":"7:15am","oars":"Blue","note":"","hasCox":true,"coxId":"branco","metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"elias"},{"label":"2","athleteId":"george-farkas"},{"label":"3","athleteId":"martin-houska"},{"label":"4","athleteId":"rabinovitz"},{"label":"5","athleteId":"charles-richards"},{"label":"6","athleteId":"wolskel"},{"label":"7","athleteId":"luca-vicino"},{"label":"8","athleteId":"obyrne"}]},
  {"id":"boat-1024-filippi","badge":"4+","name":"Filippi","dock":"7:15am","oars":"Cow","note":"","hasCox":true,"coxId":"grieser","metres":null,"minutes":null,
   "seats":[{"label":"1","athleteId":"asante-kiio"},{"label":"2","athleteId":"julian-paul"},{"label":"3","athleteId":"teddy-plimpton"},{"label":"4","athleteId":"mike-thomas"}]}
]'::jsonb, 'published', now())
on conflict (day_key) do update set
  boats = excluded.boats, status = excluded.status, updated_at = now();

-- 2. Not in a boat, down the right of the sheet. Launch, the erg (3x25' UT2)
--    and OYO are today only. Rx: Karadogan, Weldon and O Cruz-Abrams are still
--    out from Thursday (open-ended), so only Baker is added, open-ended too.
delete from public.varsity_availability
 where from_date = date '2026-10-24'
   and athlete_id in ('miller','nick-yoo','george-burney','saeed','mason-cruz-abrams','hazen','wu',
                      'joseph-baker','yu');

insert into public.varsity_availability (athlete_id, reason, from_date, until_date, updated_at) values
  ('miller',            'LAUNCH', '2026-10-24', '2026-10-24', now()),
  ('nick-yoo',          'LAUNCH', '2026-10-24', '2026-10-24', now()),
  ('george-burney',     'ERG',    '2026-10-24', '2026-10-24', now()),
  ('saeed',             'ERG',    '2026-10-24', '2026-10-24', now()),
  ('mason-cruz-abrams', 'ERG',    '2026-10-24', '2026-10-24', now()),
  ('hazen',             'ERG',    '2026-10-24', '2026-10-24', now()),
  ('wu',                'ERG',    '2026-10-24', '2026-10-24', now()),
  ('joseph-baker',      'RX',     '2026-10-24', null,         now()),
  ('yu',                'OYO',    '2026-10-24', '2026-10-24', now());
