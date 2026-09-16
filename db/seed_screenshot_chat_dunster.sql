-- ============================================================================
-- UNIsport — Messages chat + Dunster House for the demo account (screenshots)
-- ----------------------------------------------------------------------------
-- Owner, 2026-09-16:
--   * "the conversation looks like this: send some messages, and then somebody
--     has the plan" — a fresh chat between the demo account (martinhouska701,
--     "John Brown") and Martin Houska (de11a015, db/seed_martin_match.sql): a
--     few messages, then Martin's "Plan a session" card, still waiting for an
--     answer. It is the newest conversation, so it sits at the top of Messages.
--   * the demo account lives in DUNSTER HOUSE, so the leaderboards rank him
--     among the twelve Houses. A freshman can't live in a House, so his class
--     year goes '30 → '29 and the one bio line that named Pennypacker follows.
--
-- SAFE TO RE-RUN: deletes the John ↔ Martin conversation first (its messages
-- and plan go with it) and writes it again with times relative to now.
-- Needs db/seed_martin_match.sql to have run.
-- ============================================================================

do $$
declare
  demo_email constant text := 'martinhouska701@gmail.com';
  mh         constant uuid := 'de11a015-0000-4000-8000-000000000015';
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
    raise exception 'Martin Houska (de11a015) is missing — run db/seed_martin_match.sql first.';
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

  -- 2. The chat ----------------------------------------------------------------
  delete from public.dm_conversations
  where user_lo = least(me, mh) and user_hi = greatest(me, mh);

  insert into public.dm_conversations (id, user_lo, user_hi, created_at)
  values (conv, least(me, mh), greatest(me, mh), now() - interval '2 hours');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at) values
    (conv, mh, 'Martin Houska', 'Hey John! Saw we matched. You lift at the MAC in the mornings too?', now() - interval '95 minutes'),
    (conv, me, my->>'name',     'Yeah, most days around 8. Just started push-pull-legs.',            now() - interval '80 minutes'),
    (conv, mh, 'Martin Houska', 'Nice. I''m there before practice. Legs tomorrow?',                    now() - interval '62 minutes'),
    (conv, me, my->>'name',     'I''m in. Could use someone to check my squat form.',                  now() - interval '50 minutes'),
    (conv, mh, 'Martin Houska', 'Easy. Sending you a plan 👇',                                          now() - interval '41 minutes');

  insert into public.session_plans (id, conv_id, proposer_id, activity, place, scheduled_at, status, created_at)
  values (plan, conv, mh, 'gym', 'Malkin Athletic Center', at, 'proposed', now() - interval '40 minutes');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, plan_id, created_at)
  values (conv, mh, 'Martin Houska', '📅 Session plan: gym · Malkin Athletic Center', 'plan', plan, now() - interval '40 minutes');

  -- Both have read everything, so the thread shows "Read" and no unread badge.
  insert into public.dm_reads (conv_id, user_id, last_read_at) values
    (conv, me, now()), (conv, mh, now() - interval '45 minutes')
  on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  raise notice 'Chat with Martin written (plan for %), demo account now in Dunster.', at;
end $$;
