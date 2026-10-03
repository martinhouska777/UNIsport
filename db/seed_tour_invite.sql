-- ============================================================================
-- UNIsport — a fresh invite for the demo account, so the tour can show it
-- ----------------------------------------------------------------------------
-- Owner, 2026-10-03: "Can you show the messages? … then he scheduled a
-- session, and then you click it and accept it."
--
-- The app tour opens the chat where someone planned a session with you and
-- accepts it FOR REAL (lib/tour.ts) — so after one run the demo account
-- (martinhouska701, "John Brown") has nothing left to accept, and every later
-- run passes over the Messages part. Run this before a run to put one back:
-- Arjun Mehta (db/seed_match_showcase.sql) sends "Legs tomorrow at 8?" and a
-- plan card for tomorrow, 8:00 AM, Malkin Athletic Center, in the chat the two
-- already have (db/seed_screenshot_chat_dunster.sql; started if it is gone).
--
-- SAFE TO RE-RUN: if an invite is already waiting for the demo account it adds
-- nothing. It never deletes anything; accepted sessions from earlier runs stay
-- where they are. Touches only the demo account's chat with Arjun.
-- ============================================================================

do $$
declare
  demo_email constant text := 'martinhouska701@gmail.com';
  arjun      constant uuid := 'de11a022-0000-4000-8000-000000000022'; -- Arjun Mehta
  me   uuid;
  conv uuid;
  plan uuid := gen_random_uuid();
  -- Tomorrow, 8:00 in Cambridge.
  at   timestamptz := (date_trunc('day', now() at time zone 'America/New_York') + interval '1 day 8 hours')
                      at time zone 'America/New_York';
begin
  select u.id into me from auth.users u where lower(u.email) = lower(demo_email);
  if me is null then
    raise exception 'No account for %.', demo_email;
  end if;
  if not exists (select 1 from auth.users where id = arjun) then
    raise exception 'Arjun Mehta (de11a022) is missing — run db/seed_match_showcase.sql first.';
  end if;

  -- Already one waiting (the same test my_pending_invites() makes)? Leave it.
  if exists (
    select 1
    from public.session_plans sp
    join public.dm_conversations c on c.id = sp.conv_id
    where (c.user_lo = me or c.user_hi = me)
      and sp.proposer_id <> me
      and sp.status = 'proposed'
      and sp.scheduled_at > now()
  ) then
    raise notice 'An invite is already waiting for %; nothing added.', demo_email;
    return;
  end if;

  select c.id into conv
  from public.dm_conversations c
  where c.user_lo = least(me, arjun) and c.user_hi = greatest(me, arjun);
  if conv is null then
    conv := gen_random_uuid();
    insert into public.dm_conversations (id, user_lo, user_hi, created_at)
    values (conv, least(me, arjun), greatest(me, arjun), now() - interval '5 minutes');
  end if;

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, created_at)
  values (conv, arjun, 'Arjun Mehta', 'Legs tomorrow at 8? Sending you a plan 👇', now() - interval '2 minutes');

  insert into public.session_plans (id, conv_id, proposer_id, activity, place, scheduled_at, status, created_at)
  values (plan, conv, arjun, 'gym', 'Malkin Athletic Center', at, 'proposed', now() - interval '1 minute');

  -- The card's line in the Messages list, written the way plan_create writes it.
  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, plan_id, created_at)
  values (conv, arjun, 'Arjun Mehta',
          '📅 Gym · ' || to_char(at at time zone 'America/New_York', 'Dy, Mon FMDD · FMHH12:MI AM') || ' · Malkin Athletic Center',
          'plan', plan, now() - interval '1 minute');

  -- Arjun has read his own messages; the demo account hasn't, so the chat
  -- shows as new in Messages.
  insert into public.dm_reads (conv_id, user_id, last_read_at)
  values (conv, arjun, now())
  on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  raise notice 'Invite from Arjun added for % (plan %, for %).', demo_email, plan, at;
end $$;
