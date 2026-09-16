-- ============================================================================
-- UNIsport — Messages chat + Dunster House for the demo account (screenshots)
-- ----------------------------------------------------------------------------
-- Owner, 2026-09-16:
--   * "the conversation looks like this: send some messages, and then somebody
--     has the plan" — a fresh chat between the demo account (martinhouska701,
--     "John Brown") and Arjun Mehta (de11a022, db/seed_match_showcase.sql; it
--     was Martin Houska until the owner asked for a made-up name, 2026-09-16):
--     a few messages, then Arjun's "Plan a session" card, still waiting for an
--     answer. It is the newest conversation, so it sits at the top of Messages.
--   * the demo account lives in DUNSTER HOUSE, so the leaderboards rank him
--     among the twelve Houses. A freshman can't live in a House, so his class
--     year goes '30 → '29 and the one bio line that named Pennypacker follows.
--
-- SAFE TO RE-RUN: deletes the John ↔ Arjun (and the old John ↔ Martin) conversation first (its messages
-- and plan go with it) and writes it again with times relative to now.
-- Needs db/seed_match_showcase.sql to have run.
-- ============================================================================

do $$
declare
  demo_email constant text := 'martinhouska701@gmail.com';
  mh         constant uuid := 'de11a022-0000-4000-8000-000000000022'; -- Arjun Mehta
  old_mh     constant uuid := 'de11a015-0000-4000-8000-000000000015'; -- Martin Houska, the chat's partner before
  me   uuid;
  my   jsonb;
  conv uuid := gen_random_uuid();
  plan uuid := gen_random_uuid();
  -- Tomorrow, 8:00 in Cambridge.
  at   timestamptz := (date_trunc('day', now() at time zone 'America/New_York') + interval '1 day 8 hours')
                      at time zone 'America/New_York';
begin
  select u.id into me from auth.users u where lower(u.email) = lower(demo_email);
  if me is null then
    raise exception 'No account for %.', demo_email;
  end if;
  if not exists (select 1 from auth.users where id = mh) then
    raise exception 'Arjun Mehta (de11a022) is missing — run db/seed_match_showcase.sql first.';
  end if;

  -- 1. Dunster House ----------------------------------------------------------
  update public.profiles
  set data = data
    || jsonb_build_object(
         'residence', 'Dunster',
         'classYear', '''29',
         'bio', replace(coalesce(data->>'bio', ''), 'Freshman in Pennypacker', 'Sophomore in Dunster')
       )
  where id = me
  returning data into my;

  -- Arjun's profile has to agree with the chat ("same split"), 2026-09-16.
  update public.profiles
  set data = data || jsonb_build_object('gymSplit', 'Push-Pull-Legs')
  where id = mh;

  -- 2. The chat ----------------------------------------------------------------
  -- The chat used to be with Martin Houska; the owner wants a made-up name in
  -- the picture (2026-09-16), so that thread goes and Arjun's is written.
  delete from public.dm_conversations
  where user_lo = least(me, old_mh) and user_hi = greatest(me, old_mh);

  delete from public.dm_conversations
  where user_lo = least(me, mh) and user_hi = greatest(me, mh);

  insert into public.dm_conversations (id, user_lo, user_hi, created_at)
  values (conv, least(me, mh), greatest(me, mh), now() - interval '2 hours');

  -- Owner, 2026-09-16: "add more messages … so it's all over the screen" —
  -- long enough to fill a phone screen above the plan card.
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv, mh, 'Arjun Mehta', 'Hey John! Saw we matched 👋',                                          now() - interval '118 minutes'),
    (conv, mh, 'Arjun Mehta', 'You lift at the MAC in the mornings too?',                             now() - interval '117 minutes'),
    (conv, me, my->>'name',   'Yeah, most days around 8. Just started push-pull-legs.',               now() - interval '104 minutes'),
    (conv, mh, 'Arjun Mehta', 'Nice, same split. How long have you been running it?',                 now() - interval '98 minutes'),
    (conv, me, my->>'name',   'Two weeks. Push Monday, pull Tuesday, legs today at Malkin.',          now() - interval '91 minutes'),
    (conv, me, my->>'name',   'Hit 140 on squat, pretty happy with that',                             now() - interval '90 minutes'),
    (conv, mh, 'Arjun Mehta', 'That''s solid 💪 I''m stuck around 120',                               now() - interval '84 minutes'),
    (conv, mh, 'Arjun Mehta', 'Think my depth is off, knees cave on the way up',                       now() - interval '83 minutes'),
    (conv, me, my->>'name',   'Happens to everyone. Slow the eccentric and push your knees out.',     now() - interval '72 minutes'),
    (conv, mh, 'Arjun Mehta', 'Could you watch a set sometime?',                                      now() - interval '64 minutes'),
    (conv, me, my->>'name',   'Sure. I''m in Dunster, the MAC is 5 min away.',                         now() - interval '58 minutes'),
    (conv, mh, 'Arjun Mehta', 'Perfect, I''m in Mather. Legs again tomorrow morning?',                now() - interval '52 minutes'),
    (conv, me, my->>'name',   'Works for me. 8am before class?',                                      now() - interval '47 minutes'),
    (conv, mh, 'Arjun Mehta', 'Easy. Sending you a plan 👇',                                          now() - interval '41 minutes');

  insert into public.session_plans (id, conv_id, proposer_id, activity, place, scheduled_at, status, created_at)
  values (plan, conv, mh, 'gym', 'Malkin Athletic Center', at, 'proposed', now() - interval '40 minutes');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, plan_id, created_at)
  values (conv, mh, 'Arjun Mehta', '📅 Gym · ' || to_char(at at time zone 'America/New_York', 'Dy, Mon FMDD · FMHH12:MI AM') || ' · Malkin Athletic Center', 'plan', plan, now() - interval '40 minutes');

  -- Both have read everything, so the thread shows "Read" and no unread badge.
  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now()), (conv, mh, now() - interval '45 minutes')
  on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  raise notice 'Chat with Arjun written (plan for %), demo account now in Dunster.', at;
end $$;
