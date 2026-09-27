-- ============================================================================
-- UNIsport — checks for the partner-tag guard (db/partner_requests.sql)
-- ----------------------------------------------------------------------------
-- Plays three real accounts (A logs, B is the partner, C is somebody else)
-- through every way the app can write a tag, as the app's own role, and
-- raises 'TEST FAILED n: …' the moment one comes out wrong.
--
-- NOTHING IS KEPT: it all happens inside one transaction that ends in
-- ROLLBACK. To check a NEW copy of partner_requests.sql before it goes live,
-- open the transaction first and run that file inside it:
--   begin;  <db/partner_requests.sql>  <this file>
-- (this file's own "begin" then only warns, and its rollback undoes both).
-- A clean run ends without an error; the first failure stops it.
-- ============================================================================

begin;

-- The cast: the first three accounts, whoever they are.
select set_config('t.a', (select id::text from public.profiles order by id offset 0 limit 1), true);
select set_config('t.b', (select id::text from public.profiles order by id offset 1 limit 1), true);
select set_config('t.c', (select id::text from public.profiles order by id offset 2 limit 1), true);

-- Written as the database itself, which the guard lets through untouched:
-- L, a tag from before tags had to be accepted (no status = counted) …
with x as (
  insert into public.workout_logs (user_id, log_date, activity, partner, partner_id, partner_status)
  values (current_setting('t.a')::uuid, current_date - 10, 'gym', 'B', current_setting('t.b')::uuid, null)
  returning id)
select set_config('t.legacy', (select id::text from x), true);
-- … O, a solo session logged three days ago …
with x as (
  insert into public.workout_logs (user_id, log_date, activity, created_at)
  values (current_setting('t.a')::uuid, current_date - 3, 'gym', now() - interval '3 days')
  returning id)
select set_config('t.old', (select id::text from x), true);
-- … E, a request B was sent 25 hours ago on a row made just now (the window
-- runs from the ask, not from the row) …
with x as (
  insert into public.workout_logs (user_id, log_date, activity, partner, partner_id, partner_status, partner_asked_at)
  values (current_setting('t.a')::uuid, current_date - 1, 'gym', 'B', current_setting('t.b')::uuid,
          'pending', now() - interval '25 hours')
  returning id)
select set_config('t.late', (select id::text from x), true);
-- … and S, A tagged as A's own partner, the way a doctored request could.
with x as (
  insert into public.workout_logs (user_id, log_date, activity, partner, partner_id, partner_status, partner_asked_at)
  values (current_setting('t.a')::uuid, current_date, 'gym', 'A', current_setting('t.a')::uuid, 'pending', now())
  returning id)
select set_config('t.self', (select id::text from x), true);

-- ── As A, through the app's role ────────────────────────────────────────────
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);

-- 1. A new tag that claims to be confirmed and to be B's copy of something:
--    it is a request, it is nobody's copy, and B is asked now.
with x as (
  insert into public.workout_logs
    (user_id, log_date, activity, partner, partner_id, partner_status, mirror_of, partner_asked_at)
  values (current_setting('t.a')::uuid, current_date, 'gym', 'B', current_setting('t.b')::uuid,
          'confirmed', current_setting('t.legacy')::uuid, now() - interval '5 days')
  returning id)
select set_config('t.r1', (select id::text from x), true);
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.r1')::uuid;
  if w.partner_status is distinct from 'pending' then raise exception 'TEST FAILED 1: status %', w.partner_status; end if;
  if w.mirror_of is not null then raise exception 'TEST FAILED 1: mirror_of was kept'; end if;
  if w.partner_asked_at is distinct from now() then raise exception 'TEST FAILED 1: asked at %', w.partner_asked_at; end if;
end $$;

-- 2. No partner but a status: no status.
with x as (
  insert into public.workout_logs (user_id, log_date, activity, partner_status, partner_asked_at)
  values (current_setting('t.a')::uuid, current_date, 'gym', 'confirmed', now())
  returning id)
select set_config('t.r2', (select id::text from x), true);
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.r2')::uuid;
  if w.partner_status is not null or w.partner_asked_at is not null then
    raise exception 'TEST FAILED 2: % / %', w.partner_status, w.partner_asked_at; end if;
end $$;

-- 3. Yourself as the partner: refused.
do $$ begin
  begin
    insert into public.workout_logs (user_id, log_date, activity, partner_id)
    values (current_setting('t.a')::uuid, current_date, 'gym', current_setting('t.a')::uuid);
    raise exception 'TEST FAILED 3: a self-tag was saved';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;
end $$;

-- (as the database: B was asked two hours ago, so a moved window shows)
reset role;
update public.workout_logs set partner_asked_at = now() - interval '2 hours'
  where id = current_setting('t.r1')::uuid;
set local role authenticated;

-- 4. An edit that keeps B cannot confirm the tag or move its window — and
--    the rest of the edit still lands.
update public.workout_logs
  set partner_status = 'confirmed', partner_asked_at = null, note = 'edited'
  where id = current_setting('t.r1')::uuid;
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.r1')::uuid;
  if w.partner_status is distinct from 'pending' then raise exception 'TEST FAILED 4: status %', w.partner_status; end if;
  if w.partner_asked_at is distinct from now() - interval '2 hours' then raise exception 'TEST FAILED 4: the window moved'; end if;
  if w.note <> 'edited' then raise exception 'TEST FAILED 4: the edit itself was lost'; end if;
end $$;

-- 5. A legacy tag kept on an edit stays as it was (no status = counted).
update public.workout_logs set partner_status = 'declined', note = 'edited'
  where id = current_setting('t.legacy')::uuid;
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.legacy')::uuid;
  if w.partner_status is not null then raise exception 'TEST FAILED 5: legacy became %', w.partner_status; end if;
end $$;

-- 6. B added to a session logged three days ago is asked NOW, not with a
--    window that shut two days ago.
update public.workout_logs set partner = 'B', partner_id = current_setting('t.b')::uuid
  where id = current_setting('t.old')::uuid;
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.old')::uuid;
  if w.partner_status is distinct from 'pending' then raise exception 'TEST FAILED 6: status %', w.partner_status; end if;
  if w.partner_asked_at is distinct from now() then raise exception 'TEST FAILED 6: asked at %', w.partner_asked_at; end if;
end $$;

-- ── As B ────────────────────────────────────────────────────────────────────
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.b'), 'role', 'authenticated')::text, true);

-- 7. B is asked about r1 and the three-day-old session, not about the one
--    sent 25 hours ago — answering that one is too late — and the sweep
--    leaves the fresh ones alone.
do $$ declare res text; begin
  if not exists (select 1 from public.partner_requests_for_me(24) r where r.log_id = current_setting('t.r1')::uuid)
    then raise exception 'TEST FAILED 7: B was not asked about r1'; end if;
  if not exists (select 1 from public.partner_requests_for_me(24) r where r.log_id = current_setting('t.old')::uuid)
    then raise exception 'TEST FAILED 7: B was not asked about the three-day-old session'; end if;
  if exists (select 1 from public.partner_requests_for_me(24) r where r.log_id = current_setting('t.late')::uuid)
    then raise exception 'TEST FAILED 7: B was still asked 25 hours on'; end if;
  res := public.partner_request_respond(current_setting('t.late')::uuid, true, 24);
  if res <> 'expired' then raise exception 'TEST FAILED 7: 25 hours on, the answer was %', res; end if;
  perform public.partner_tags_expire(24);
  if not exists (select 1 from public.partner_requests_for_me(24) r where r.log_id = current_setting('t.old')::uuid)
    then raise exception 'TEST FAILED 7: the sweep expired a fresh request'; end if;
end $$;

-- 8. B accepts both: the answering function still writes what it must (it
--    runs as the database, which the guard lets through) — B gets a
--    confirmed copy of r1. The three-day-old session is answerable because
--    B was asked about it just now.
do $$ declare res text; m public.workout_logs; begin
  res := public.partner_request_respond(current_setting('t.old')::uuid, true, 24);
  if res <> 'confirmed' then raise exception 'TEST FAILED 8: the three-day-old session answered %', res; end if;
  res := public.partner_request_respond(current_setting('t.r1')::uuid, true, 24);
  if res <> 'confirmed' then raise exception 'TEST FAILED 8: answered %', res; end if;
  select * into m from public.workout_logs where mirror_of = current_setting('t.r1')::uuid;
  if m.id is null then raise exception 'TEST FAILED 8: no copy for B'; end if;
  if m.partner_status is distinct from 'confirmed' or m.partner_id <> current_setting('t.a')::uuid then
    raise exception 'TEST FAILED 8: B''s copy reads % with %', m.partner_status, m.partner_id; end if;
  perform set_config('t.mirror', m.id::text, true);
end $$;

-- 9. B edits that copy: it stays a confirmed copy of r1.
update public.workout_logs set mirror_of = null, partner_status = 'declined', note = 'mine'
  where id = current_setting('t.mirror')::uuid;
do $$ declare m public.workout_logs; begin
  select * into m from public.workout_logs where id = current_setting('t.mirror')::uuid;
  if m.mirror_of is distinct from current_setting('t.r1')::uuid then raise exception 'TEST FAILED 9: the copy came loose'; end if;
  if m.partner_status is distinct from 'confirmed' then raise exception 'TEST FAILED 9: status %', m.partner_status; end if;
end $$;

-- ── As A again ──────────────────────────────────────────────────────────────
select set_config('request.jwt.claims',
  json_build_object('sub', current_setting('t.a'), 'role', 'authenticated')::text, true);

-- 10. A stale edit screen (opened while B hadn't answered) saves 'pending':
--     B's yes stands.
update public.workout_logs set partner_status = 'pending'
  where id = current_setting('t.r1')::uuid;
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.r1')::uuid;
  if w.partner_status is distinct from 'confirmed' then raise exception 'TEST FAILED 10: B''s yes became %', w.partner_status; end if;
end $$;

-- 11. Changing the partner to C asks C, from now.
update public.workout_logs set partner = 'C', partner_id = current_setting('t.c')::uuid
  where id = current_setting('t.r1')::uuid;
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.r1')::uuid;
  if w.partner_status is distinct from 'pending' or w.partner_asked_at is distinct from now() then
    raise exception 'TEST FAILED 11: % asked at %', w.partner_status, w.partner_asked_at; end if;
end $$;

-- 12. Taking the partner off leaves no tag behind.
update public.workout_logs set partner = null, partner_id = null
  where id = current_setting('t.r1')::uuid;
do $$ declare w public.workout_logs; begin
  select * into w from public.workout_logs where id = current_setting('t.r1')::uuid;
  if w.partner_status is not null or w.partner_asked_at is not null then
    raise exception 'TEST FAILED 12: % / %', w.partner_status, w.partner_asked_at; end if;
end $$;

-- 13. A cannot accept a tag of A on A's own session.
do $$ begin
  begin
    perform public.partner_request_respond(current_setting('t.self')::uuid, true, 24);
    raise exception 'TEST FAILED 13: A confirmed A';
  exception when others then
    if sqlerrm like 'TEST FAILED%' then raise; end if;
  end;
end $$;

rollback;
