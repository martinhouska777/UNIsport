-- ============================================================================
-- UNIsport — Planned sessions (Slice A: propose & accept, inside a DM thread)
-- ----------------------------------------------------------------------------
-- WHAT THIS IS
--   A "Plan a session" card inside a 1:1 conversation. One person proposes an
--   activity + place + date/time; the other accepts or declines. The card lives
--   in the chat thread (it's backed by a normal dm_message of kind='plan' that
--   points at a session_plans row), so it appears in order and bumps the
--   conversation like any message.
--
--   Later slices add: both-tap "did this happen?" confirmation → auto-logged
--   workout for each person (status 'confirmed'), calendar + reminders, streaks.
--
-- SECURITY MODEL (same as db/messages.sql)
--   session_plans has RLS ENABLED with NO policies → no direct API access. All
--   access is via the SECURITY DEFINER functions below, which check auth.uid()
--   and conversation membership.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- One proposed/accepted session between the two people in a conversation.
create table if not exists public.session_plans (
  id           uuid primary key default gen_random_uuid(),
  conv_id      uuid not null references public.dm_conversations (id) on delete cascade,
  proposer_id  uuid not null,
  activity     text not null,                       -- 'gym' | 'running' | 'cardio' | 'other'
  place        text,                                -- optional gym / where
  scheduled_at timestamptz not null,                -- when the session is planned for
  status       text not null default 'proposed',    -- 'proposed' | 'accepted' | 'declined'
  created_at   timestamptz not null default now()
);
create index if not exists session_plans_conv_idx on public.session_plans (conv_id);

alter table public.session_plans enable row level security;

-- DM messages can now be a plain text message (default) or a 'plan' card that
-- references a session_plans row. Added to existing databases idempotently.
alter table public.dm_messages add column if not exists kind    text not null default 'text';
alter table public.dm_messages add column if not exists plan_id uuid references public.session_plans (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- dm_thread gains the plan columns, so a thread renders plan cards with their
-- CURRENT state (status updates show up on the thread's gentle poll). Changing a
-- function's OUT columns needs a drop first (create-or-replace can't do it).
-- ---------------------------------------------------------------------------
drop function if exists public.dm_thread(uuid);
create or replace function public.dm_thread(conversation_id uuid)
returns table (
  id                    uuid,
  sender_id             uuid,
  sender_name           text,
  body                  text,
  created_at            timestamptz,
  kind                  text,
  plan_id               uuid,
  plan_activity         text,
  plan_place            text,
  plan_scheduled_at     timestamptz,
  plan_status           text,
  plan_proposer_answer  text,
  plan_recipient_answer text
)
language plpgsql
volatile
security definer
set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if not exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id and (c.user_lo = me or c.user_hi = me)
  ) then
    raise exception 'not a participant';
  end if;

  insert into public.dm_reads (conv_id, user_id, last_read_at)
    values (conversation_id, me, now())
    on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  return query
    select m.id, m.sender_id, m.sender_name, m.body, m.created_at,
           m.kind, m.plan_id, sp.activity, sp.place, sp.scheduled_at, sp.status,
           sp.proposer_answer, sp.recipient_answer
    from public.dm_messages m
    left join public.session_plans sp on sp.id = m.plan_id
    where m.conv_id = conversation_id
    order by m.created_at asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Propose a session. Inserts the plan + a 'plan' message in the thread (the
-- message body is a readable fallback for the conversation-list preview).
-- Participant-gated. Returns the new plan id.
-- ---------------------------------------------------------------------------
create or replace function public.plan_create(
  conversation_id uuid,
  p_activity      text,
  p_place         text,
  p_scheduled_at  timestamptz
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me       uuid := auth.uid();
  nm       text;
  new_plan uuid;
  preview  text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_activity is null or length(btrim(p_activity)) = 0 then
    raise exception 'activity required';
  end if;
  if p_scheduled_at is null then raise exception 'time required'; end if;
  if not exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id and (c.user_lo = me or c.user_hi = me)
  ) then
    raise exception 'not a participant';
  end if;

  insert into public.session_plans (conv_id, proposer_id, activity, place, scheduled_at)
    values (conversation_id, me, btrim(p_activity), nullif(btrim(coalesce(p_place, '')), ''), p_scheduled_at)
    returning id into new_plan;

  select coalesce(p.data->>'name', 'Member') into nm
    from public.profiles p where p.id = me;

  preview := '📅 Session plan: ' || btrim(p_activity)
             || coalesce(' · ' || nullif(btrim(coalesce(p_place, '')), ''), '');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, plan_id)
    values (conversation_id, me, nm, preview, 'plan', new_plan);

  insert into public.dm_reads (conv_id, user_id, last_read_at)
    values (conversation_id, me, now())
    on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  return new_plan;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accept or decline a proposed session. Only the OTHER participant (not the
-- proposer) can respond, and only while it's still 'proposed'.
-- ---------------------------------------------------------------------------
create or replace function public.plan_respond(p_plan_id uuid, p_accept boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me   uuid := auth.uid();
  pl   public.session_plans;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select * into pl from public.session_plans where id = p_plan_id;
  if pl.id is null then raise exception 'unknown plan'; end if;

  if not exists (
    select 1 from public.dm_conversations c
    where c.id = pl.conv_id and (c.user_lo = me or c.user_hi = me)
  ) then
    raise exception 'not a participant';
  end if;
  if pl.proposer_id = me then raise exception 'the proposer cannot respond'; end if;
  if pl.status <> 'proposed' then raise exception 'already answered'; end if;

  update public.session_plans
    set status = case when p_accept then 'accepted' else 'declined' end
    where id = p_plan_id;
end;
$$;

-- ===========================================================================
-- SLICE B — confirmation ("did this happen?") + auto-logged workout
-- ===========================================================================

-- Each side's after-the-fact answer: null = not answered, 'yes' = attended,
-- 'no' = no-show. When both answer, the plan resolves to 'confirmed' (both yes)
-- or 'missed' (anyone no).
alter table public.session_plans add column if not exists proposer_answer  text;
alter table public.session_plans add column if not exists recipient_answer text;

-- A confirmed plan auto-creates one workout_log per person. These columns mark
-- those rows so they show a "verified" badge and the insert stays idempotent.
alter table public.workout_logs add column if not exists plan_id  uuid references public.session_plans (id) on delete set null;
alter table public.workout_logs add column if not exists verified boolean not null default false;

-- Record this caller's "did it happen?" answer. When both participants have
-- answered yes, the plan is confirmed and a verified workout_log is written for
-- BOTH people (each with the other as the partner). Returns the new status.
create or replace function public.plan_confirm(p_plan_id uuid, p_attended boolean)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me        uuid := auth.uid();
  pl        public.session_plans;
  recipient uuid;
  prop_ans  text;
  rec_ans   text;
  prop_name text;
  rec_name  text;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select * into pl from public.session_plans where id = p_plan_id;
  if pl.id is null then raise exception 'unknown plan'; end if;

  select case when c.user_lo = pl.proposer_id then c.user_hi else c.user_lo end
    into recipient
    from public.dm_conversations c where c.id = pl.conv_id;

  if me <> pl.proposer_id and me <> recipient then raise exception 'not a participant'; end if;
  if pl.status <> 'accepted' then raise exception 'not awaiting confirmation'; end if;

  if me = pl.proposer_id then
    update public.session_plans
      set proposer_answer = case when p_attended then 'yes' else 'no' end
      where id = p_plan_id;
  else
    update public.session_plans
      set recipient_answer = case when p_attended then 'yes' else 'no' end
      where id = p_plan_id;
  end if;

  select proposer_answer, recipient_answer into prop_ans, rec_ans
    from public.session_plans where id = p_plan_id;

  if prop_ans is not null and rec_ans is not null then
    if prop_ans = 'yes' and rec_ans = 'yes' then
      update public.session_plans set status = 'confirmed' where id = p_plan_id;

      select coalesce(p.data->>'name', 'Member') into prop_name
        from public.profiles p where p.id = pl.proposer_id;
      select coalesce(p.data->>'name', 'Member') into rec_name
        from public.profiles p where p.id = recipient;

      insert into public.workout_logs
        (user_id, log_date, activity, gym, partner, partner_id, plan_id, verified)
        select pl.proposer_id, (pl.scheduled_at)::date, pl.activity, pl.place,
               rec_name, recipient, pl.id, true
        where not exists (
          select 1 from public.workout_logs w
          where w.plan_id = pl.id and w.user_id = pl.proposer_id
        );

      insert into public.workout_logs
        (user_id, log_date, activity, gym, partner, partner_id, plan_id, verified)
        select recipient, (pl.scheduled_at)::date, pl.activity, pl.place,
               prop_name, pl.proposer_id, pl.id, true
        where not exists (
          select 1 from public.workout_logs w
          where w.plan_id = pl.id and w.user_id = recipient
        );
    else
      update public.session_plans set status = 'missed' where id = p_plan_id;
    end if;
  end if;

  return (select status from public.session_plans where id = p_plan_id);
end;
$$;

-- ===========================================================================
-- SLICE C — upcoming accepted sessions (for the Profile calendar + reminder)
-- ===========================================================================

-- The caller's accepted, still-upcoming sessions, soonest first, with the other
-- person's name. Powers the "Upcoming sessions" list on the Profile tab.
create or replace function public.my_upcoming_plans()
returns table (
  plan_id      uuid,
  other_id     uuid,
  other_name   text,
  activity     text,
  place        text,
  scheduled_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    sp.id,
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
    and sp.scheduled_at >= now() - interval '12 hours'
  order by sp.scheduled_at asc;
$$;

-- ---------------------------------------------------------------------------
grant execute on function public.dm_thread(uuid)                       to authenticated;
grant execute on function public.plan_create(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.plan_respond(uuid, boolean)           to authenticated;
grant execute on function public.plan_confirm(uuid, boolean)           to authenticated;
grant execute on function public.my_upcoming_plans()                   to authenticated;
