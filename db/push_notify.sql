-- ============================================================================
-- UNIsport — Web Push: notifying the OTHER person in a conversation
-- ----------------------------------------------------------------------------
-- Slice 1 added push_subscriptions (db/push_subscriptions.sql), locked to each
-- owner by RLS. To send a real event notification we must read the RECIPIENT's
-- subscriptions — which RLS hides from everyone but them. These SECURITY DEFINER
-- functions (same pattern as db/messages.sql) let a verified conversation member
-- reach their counterpart's devices, WITHOUT exposing subscriptions broadly.
--
-- The push subscription keys returned here are useless to a sender on their own:
-- delivering a notification also requires the server-only VAPID private key.
-- These functions are CALLED SERVER-SIDE from app/api/push/notify; the keys
-- never travel to the browser.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- The push subscriptions of the OTHER participant in a DM conversation — only if
-- the caller is one of the two members AND the recipient hasn't switched off this
-- kind of notification ('message' or 'plan'; preference stored on their profile,
-- default ON when unset). Works for both new messages and session plans (plans
-- live inside a conversation too). Empty result = nothing to send.
-- Param list changed (added `kind`); drop the old single-arg version first so a
-- re-run doesn't leave a stale overload behind.
drop function if exists public.dm_push_targets(uuid);
create or replace function public.dm_push_targets(conversation_id uuid, kind text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me       uuid := auth.uid();
  peer     uuid;
  pref_key text := case when kind = 'plan' then 'notifyPlans' else 'notifyMessages' end;
  wants    boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select case when c.user_lo = me then c.user_hi else c.user_lo end
    into peer
    from public.dm_conversations c
    where c.id = conversation_id and (c.user_lo = me or c.user_hi = me);

  if peer is null then raise exception 'not a participant'; end if;

  -- Recipient's preference for this kind; missing key = on.
  select coalesce((p.data->>pref_key)::boolean, true) into wants
    from public.profiles p where p.id = peer;
  if not coalesce(wants, true) then return; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    where s.user_id = peer;
end;
$$;

-- The caller's own display name — used to title the notification ("Alex: …")
-- without trusting a name sent from the browser.
create or replace function public.my_display_name()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.data->>'name', 'Member')
  from public.profiles p
  where p.id = auth.uid();
$$;

-- Forget dead subscriptions (the push service answered 404/410). `endpoint` is
-- globally unique, so deleting by endpoint only ever removes the one real owner's
-- stale row — safe to call after a failed send.
create or replace function public.push_forget(endpoints text[])
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = any(endpoints);
$$;

grant execute on function public.dm_push_targets(uuid, text) to authenticated;
grant execute on function public.my_display_name()       to authenticated;
grant execute on function public.push_forget(text[])     to authenticated;
