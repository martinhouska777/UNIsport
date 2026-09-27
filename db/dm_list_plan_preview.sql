-- ===========================================================================
-- THE CHAT LIST'S LINE FOR A PLANNED SESSION (owner, 2026-09-27).
--
-- A plan message stores the whole plan as its body — "📅 Gym · Mon, Sep 28 ·
-- 5:00 PM · Malkin Athletic Center" (db/session_plans.sql, 2026-09-16) — and
-- the Messages list printed it, so the one line under a person's name was all
-- plan. The owner: "I don't want the gym to be there, I just want 'schedule a
-- gym with you'". The details stay where they belong, on the card inside the
-- chat; the list only says that a session was scheduled, from each side:
--
--   their plan   📅 Scheduled a gym session with you
--   your plan    📅 You scheduled a gym session
--
-- Worded HERE rather than in the app because the line depends on who is
-- reading it, which only dm_list knows (last_from_me), and because the stored
-- body is also what the list's search runs over. Same signature as the
-- original in db/messages.sql, so `create or replace` is enough, and copies
-- of the app cached before this change get the new line too.
--
-- Run AFTER db/messages.sql (it replaces dm_list from there).
-- ===========================================================================

create or replace function public.dm_list()
returns table (
  conversation_id uuid,
  other_id        uuid,
  other_name      text,
  last_body       text,
  last_at         timestamptz,
  last_from_me    boolean,
  unread          integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    case when c.user_lo = auth.uid() then c.user_hi else c.user_lo end,
    coalesce((
      select p.data->>'name' from public.profiles p
      where p.id = case when c.user_lo = auth.uid() then c.user_hi else c.user_lo end
    ), 'Member'),
    case
      when lm.kind = 'plan' then
        '📅 ' ||
        case when lm.sender_id = auth.uid() then 'You scheduled ' else 'Scheduled ' end ||
        case lower(coalesce(sp.activity, ''))
          when 'gym'     then 'a gym session'
          when 'running' then 'a run'
          when 'cardio'  then 'a cardio session'
          else 'a session'
        end ||
        case when lm.sender_id = auth.uid() then '' else ' with you' end
      else lm.body
    end,
    lm.created_at,
    (lm.sender_id = auth.uid()),
    coalesce((
      select count(*) from public.dm_messages m
      where m.conv_id = c.id
        and m.sender_id <> auth.uid()
        and m.created_at > coalesce(
          (select last_read_at from public.dm_reads r
           where r.conv_id = c.id and r.user_id = auth.uid()), 'epoch')
    ), 0)::int
  from public.dm_conversations c
  left join lateral (
    select body, created_at, sender_id, kind, plan_id
    from public.dm_messages m
    where m.conv_id = c.id
    order by created_at desc
    limit 1
  ) lm on true
  left join public.session_plans sp on sp.id = lm.plan_id
  where c.user_lo = auth.uid() or c.user_hi = auth.uid()
  order by coalesce(lm.created_at, c.created_at) desc;
$$;

grant execute on function public.dm_list() to authenticated;

notify pgrst, 'reload schema';
