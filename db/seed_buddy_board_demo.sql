-- ============================================================================
-- UNIsport — BUDDY BOARD POSTS FOR THE SOCIAL SHOOT (invented students)
-- ----------------------------------------------------------------------------
-- Owner, 2026-09-28: the Match carousel gets a Buddy Board slide and a "Find by
-- time" slide, and the board was empty. Twelve posts, one per invented student
-- (the de11a… family from db/seed_demo.sql and db/seed_match_showcase.sql),
-- each on the next date of its own weekday. One-off, for the photos: posts
-- expire the day after their date (db/buddy_board.sql), so these are gone
-- within a week by themselves. db/seed_buddy_board_demo_undo.sql deletes them
-- sooner. SAFE TO RE-RUN: an author already posted on that date is skipped.
-- ============================================================================

insert into public.buddy_posts
  (author, focus, post_date, day, hour, time_of_day, gym, note, created_at, expires_at)
select
  t.author, t.focus, d.dt, t.day, t.hour,
  case when t.hour < 12 then 'morning' when t.hour < 17 then 'afternoon' else 'evening' end,
  t.gym, t.note,
  -- a different age for each, so the board (newest first) reads mixed
  now() - make_interval(mins => t.mins),
  d.dt + interval '1 day' + interval '12 hours'
from (values
  ('de11a016-0000-4000-8000-000000000016'::uuid, 'legs',   'tue',  7.0, 'Malkin Athletic Center', 'Squats and RDLs, need a spotter.',                         12),
  ('de11a002-0000-4000-8000-000000000002'::uuid, 'push',   'tue', 18.0, 'Hemenway Gymnasium',     'Bench day. Beginners welcome.',                            95),
  ('de11a003-0000-4000-8000-000000000003'::uuid, 'run',    'wed',  7.0, null,                     'Easy 5 miles along the river.',                            40),
  ('de11a019-0000-4000-8000-000000000019'::uuid, 'pull',   'wed', 17.5, 'Malkin Athletic Center', 'Back and biceps, about an hour.',                          150),
  ('de11a007-0000-4000-8000-000000000007'::uuid, 'cardio', 'thu',  8.0, 'Malkin Athletic Center', 'Erg intervals, 45 min.',                                   220),
  ('de11a018-0000-4000-8000-000000000018'::uuid, 'full',   'thu', 19.0, 'Dunster',                'Full body, nothing heavy. Mostly want company.',           65),
  ('de11a017-0000-4000-8000-000000000017'::uuid, 'run',    'fri',  6.5, null,                     'Tempo run, 8 min miles.',                                  300),
  ('de11a022-0000-4000-8000-000000000022'::uuid, 'chest',  'fri', 16.0, 'Hemenway Gymnasium',     null,                                                       180),
  ('de11a021-0000-4000-8000-000000000021'::uuid, 'legs',   'sat', 10.0, 'Malkin Athletic Center', 'First proper leg day, would love someone who knows the machines.', 25),
  ('de11a023-0000-4000-8000-000000000023'::uuid, 'run',    'sun',  9.0, null,                     'Long run, 10 miles, slow pace.',                           410),
  ('de11a008-0000-4000-8000-000000000008'::uuid, 'back',   'sun', 15.0, 'Hemenway Gymnasium',     'Deadlifts.',                                               130),
  ('de11a020-0000-4000-8000-000000000020'::uuid, 'arms',   'mon', 18.5, 'Winthrop',               null,                                                       500)
) as t(author, focus, day, hour, gym, note, mins)
cross join lateral (select public.buddy_next_date(t.day) as dt) d
where exists (select 1 from public.profiles p where p.id = t.author)
  and not exists (
    select 1 from public.buddy_posts b
    where b.author = t.author and b.post_date = d.dt
  );
