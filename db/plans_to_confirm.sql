-- ===========================================================================
-- "DID THIS HAPPEN?" OUTSIDE THE CHAT (owner, 2026-09-27).
--
-- A planned session is only logged — for BOTH people, marked Verified — once
-- both answer "yes, we trained" (plan_confirm in db/session_plans.sql). That
-- question lived only on the plan card inside the chat, and the Profile's
-- Upcoming sessions let go of a session 12 hours after it started, so nothing
-- ever asked again: on the day this was written, 5 accepted sessions were
-- more than 12 hours past with nobody's answer.
--
-- This lists the caller's sessions that are WAITING ON THEM: accepted, already
-- started, and the caller's own answer still empty. The Profile tab shows them
-- above Upcoming sessions with the same two buttons the chat card has.
--
-- A WEEK to answer. After that the question drops off the Profile (the chat
-- card still offers it): a session nobody confirmed in seven days is not one
-- either of them remembers well enough to vouch for.
-- ===========================================================================

create or replace function public.my_plans_to_confirm()
returns table (
  plan_id         uuid,
  conversation_id uuid,
  other_id        uuid,
  other_name      text,
  activity        text,
  place           text,
  scheduled_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id,
    sp.conv_id,
    case when c.user_lo = auth.uid() then c.user_hi else c.user_lo end as other_id,
    coalesce((
      select p.data->>'name' from public.profiles p
      where p.id = case when c.user_lo = auth.uid() then c.user_hi else c.user_lo end
    ), 'Member'),
    sp.activity,
    sp.place,
    sp.scheduled_at
  from public.session_plans sp
  join public.dm_conversations c on c.id = sp.conv_id
  where (c.user_lo = auth.uid() or c.user_hi = auth.uid())
    and sp.status = 'accepted'
    and sp.scheduled_at <= now()
    and sp.scheduled_at >= now() - interval '7 days'
    and (case when sp.proposer_id = auth.uid() then sp.proposer_answer
              else sp.recipient_answer end) is null
  order by sp.scheduled_at desc;
$$;

grant execute on function public.my_plans_to_confirm() to authenticated;

notify pgrst, 'reload schema';
