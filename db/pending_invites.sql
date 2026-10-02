-- ===========================================================================
-- SESSIONS SOMEONE PLANNED WITH YOU, STILL WAITING FOR YOUR ANSWER
-- (owner, 2026-10-02: the tour should open "the chat where somebody scheduled
-- with you", accept it, and show it on the Profile).
--
-- The chat list (dm_list) only knows each chat's LAST message, so it cannot
-- tell which chat holds an invite: a plan followed by a "see you there" reads
-- like any other chat. Opening threads to look is not an option either —
-- dm_thread marks the chat read.
--
-- This lists the caller's invites: plans the OTHER person proposed, still
-- 'proposed', for a time that hasn't come yet. Soonest first. Read-only.
-- ===========================================================================

create or replace function public.my_pending_invites()
returns table (
  plan_id         uuid,
  conversation_id uuid,
  scheduled_at    timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select sp.id, sp.conv_id, sp.scheduled_at
  from public.session_plans sp
  join public.dm_conversations c on c.id = sp.conv_id
  where (c.user_lo = auth.uid() or c.user_hi = auth.uid())
    and sp.proposer_id <> auth.uid()
    and sp.status = 'proposed'
    and sp.scheduled_at > now()
  order by sp.scheduled_at asc;
$$;

grant execute on function public.my_pending_invites() to authenticated;

notify pgrst, 'reload schema';
