-- ===========================================================================
-- DELIVERED — the middle of WhatsApp's three ticks (owner, 2026-09-27: "copy
-- what WhatsApp has", full three steps).
--
--   ✓   grey   sent       — the message is on the server
--   ✓✓  grey   delivered  — the other person's app has checked in since
--   ✓✓  school read       — they have opened the chat since (dm_reads)
--
-- WhatsApp's "delivered" means the phone received it. A web app has no such
-- moment, so the honest equivalent is: the other person's app has been open
-- since you sent it. Every open copy of the app already asks the server for
-- the unread badge every ten seconds (useUnreadCount → unread_total), in
-- student mode, Varsity and on a laptop alike, so THAT call records the time.
-- No new request from any client, and it works for copies of the app that
-- were cached before this file existed.
--
-- Run AFTER db/messages.sql — it replaces unread_total() from there. Then:
--   notify pgrst, 'reload schema';
-- (PostgREST caches a function's volatility; unread_total becomes VOLATILE
-- here because it now writes, and a STABLE function runs read-only.)
-- ===========================================================================

-- When each user's app last checked in. One row per person, overwritten.
-- RLS on with NO policies: nobody reads or writes it directly — only the two
-- SECURITY DEFINER functions below touch it.
create table if not exists public.user_seen (
  user_id uuid primary key references auth.users (id) on delete cascade,
  seen_at timestamptz not null default now()
);
alter table public.user_seen enable row level security;

-- The Messages badge, exactly as in db/messages.sql — plus the check-in.
create or replace function public.unread_total()
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  n  integer;
begin
  if me is null then return 0; end if;

  insert into public.user_seen (user_id, seen_at)
    values (me, now())
    on conflict (user_id) do update set seen_at = excluded.seen_at;

  select (
    coalesce((
      select count(*)
      from public.dm_messages m
      join public.dm_conversations c on c.id = m.conv_id
      where (c.user_lo = me or c.user_hi = me)
        and m.sender_id <> me
        and m.created_at > coalesce(
          (select last_read_at from public.dm_reads r
           where r.conv_id = c.id and r.user_id = me), 'epoch')
    ), 0)
    +
    coalesce((
      select count(*)
      from public.channel_messages m
      join public.channel_members mem
        on mem.channel_id = m.channel_id and mem.user_id = me
      where m.sender_id <> me
        and m.created_at > coalesce(
          (select last_read_at from public.channel_reads r
           where r.channel_id = m.channel_id and r.user_id = me), 'epoch')
    ), 0)
  )::int into n;

  return n;
end;
$$;

-- The other participant's two times for one conversation: when they last
-- OPENED it (read) and when their app last checked in at all (delivered).
-- Participant-gated like dm_peer_read, which stays for older copies of the app.
create or replace function public.dm_peer_state(conversation_id uuid)
returns table (read_at timestamptz, seen_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  peer uuid;
begin
  select case when c.user_lo = me then c.user_hi else c.user_lo end
    into peer
    from public.dm_conversations c
    where c.id = conversation_id and (c.user_lo = me or c.user_hi = me);
  if peer is null then raise exception 'not a participant'; end if;
  return query
    select
      (select r.last_read_at from public.dm_reads r
        where r.conv_id = conversation_id and r.user_id = peer),
      (select s.seen_at from public.user_seen s where s.user_id = peer);
end;
$$;

grant execute on function public.unread_total()        to authenticated;
grant execute on function public.dm_peer_state(uuid)   to authenticated;

notify pgrst, 'reload schema';
