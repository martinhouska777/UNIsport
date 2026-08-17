-- ============================================================================
-- UNIsport — Memories (the photo side of your logged sessions)
-- ----------------------------------------------------------------------------
-- The gallery itself needs NO new table: every photo already lives on a
-- workout_logs row (db/workout_logs.sql) next to the gym, the note and the
-- exercises. This file adds the two things the gallery can't derive:
--
--   1. my_memory_stats()  — how many photos you have + the newest one, so the
--      Profile tab can show the Memories row (with a thumbnail) without having
--      to download every photo in your history just to decide.
--
--   2. shared_memories + memory_share() — sending a memory into someone's chat.
--      A share takes a COPY of the photo, the gym and the "what I trained" line
--      at the moment you send it. Two reasons: workout_logs is private to its
--      owner (RLS), so the recipient could never read the original row; and a
--      shared memory shouldn't change or vanish later because you edited or
--      deleted the session behind it.
--
--      Your session NOTE is deliberately NOT copied. The note is the private
--      half of a memory — if you want to say something about the photo, you type
--      it as a message alongside the share.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. Memories summary for the signed-in user.
-- ---------------------------------------------------------------------------
create or replace function public.my_memory_stats()
returns table (
  photo_count  int,
  latest_photo text,
  latest_date  date
)
language sql
stable
security definer
set search_path = public
as $$
  with p as (
    select w.log_date, w.photos, jsonb_array_length(w.photos) as n
    from public.workout_logs w
    where w.user_id = auth.uid()
      and jsonb_typeof(w.photos) = 'array'
      and jsonb_array_length(w.photos) > 0
  )
  select
    coalesce((select sum(n) from p), 0)::int,
    (select photos->>0 from p order by log_date desc limit 1),
    (select log_date  from p order by log_date desc limit 1);
$$;

-- ---------------------------------------------------------------------------
-- 2. A memory shared into a direct conversation.
--    One row per share. `photo` is the same downscaled data URL the log stores.
-- ---------------------------------------------------------------------------
create table if not exists public.shared_memories (
  id         uuid primary key default gen_random_uuid(),
  conv_id    uuid not null references public.dm_conversations (id) on delete cascade,
  sender_id  uuid not null references public.profiles (id) on delete cascade,
  photo      text not null,  -- copy of the session photo, taken at share time
  gym        text,           -- where it was from
  trained    text,           -- "Chest · Triceps" or "Rowing · 2 km · 8:12"
  taken_on   date not null,  -- the day the session was logged, not the share date
  created_at timestamptz not null default now()
);

create index if not exists shared_memories_conv_idx
  on public.shared_memories (conv_id, created_at);

-- The thread is read through the SECURITY DEFINER dm_thread() below, so nothing
-- reads this table directly. RLS is still on, and still says "participants
-- only", so it stays true even if something queries it another way later.
alter table public.shared_memories enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'shared_memories'
      and policyname = 'Shared memories readable by participants') then
    create policy "Shared memories readable by participants"
      on public.shared_memories for select using (
        exists (
          select 1 from public.dm_conversations c
          where c.id = conv_id and (c.user_lo = auth.uid() or c.user_hi = auth.uid())
        )
      );
  end if;
end $$;

-- A 'memory' message in a thread points at one of those rows.
alter table public.dm_messages
  add column if not exists memory_id uuid references public.shared_memories (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- dm_thread gains the memory columns, so a thread can render memory cards the
-- same way it renders plan cards. Changing a function's OUT columns needs a
-- drop first (create-or-replace can't do it).
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
  plan_recipient_answer text,
  memory_id             uuid,
  memory_photo          text,
  memory_gym            text,
  memory_trained        text,
  memory_taken_on       date
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
           sp.proposer_answer, sp.recipient_answer,
           m.memory_id, sm.photo, sm.gym, sm.trained, sm.taken_on
    from public.dm_messages m
    left join public.session_plans   sp on sp.id = m.plan_id
    left join public.shared_memories sm on sm.id = m.memory_id
    where m.conv_id = conversation_id
    order by m.created_at asc;
end;
$$;

-- ---------------------------------------------------------------------------
-- Share a memory into a conversation. Inserts the copy + a 'memory' message
-- (whose body is the readable fallback the conversation list previews), and
-- optionally a normal text message after it for whatever you wanted to say.
-- Participant-gated. Returns the new message id.
-- ---------------------------------------------------------------------------
create or replace function public.memory_share(
  conversation_id uuid,
  p_photo         text,
  p_gym           text,
  p_trained       text,
  p_taken_on      date,
  p_caption       text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  nm      text;
  new_mem uuid;
  new_msg uuid;
  gym_t   text := nullif(btrim(coalesce(p_gym, '')), '');
  trn_t   text := nullif(btrim(coalesce(p_trained, '')), '');
  cap_t   text := nullif(btrim(coalesce(p_caption, '')), '');
  preview text;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_photo is null or length(p_photo) = 0 then raise exception 'photo required'; end if;
  if p_taken_on is null then raise exception 'date required'; end if;
  -- A data URL for a downscaled JPEG lands well under this; the cap is here so a
  -- full-resolution image can't be pushed into a chat row.
  if length(p_photo) > 3000000 then raise exception 'photo too large'; end if;
  if not exists (
    select 1 from public.dm_conversations c
    where c.id = conversation_id and (c.user_lo = me or c.user_hi = me)
  ) then
    raise exception 'not a participant';
  end if;

  insert into public.shared_memories (conv_id, sender_id, photo, gym, trained, taken_on)
    values (conversation_id, me, p_photo, gym_t, trn_t, p_taken_on)
    returning id into new_mem;

  select coalesce(p.data->>'name', 'Member') into nm
    from public.profiles p where p.id = me;

  preview := '📸 Memory'
             || coalesce(' · ' || trn_t, '')
             || coalesce(' · ' || gym_t, '');

  insert into public.dm_messages (conv_id, sender_id, sender_name, body, kind, memory_id)
    values (conversation_id, me, nm, preview, 'memory', new_mem)
    returning id into new_msg;

  if cap_t is not null then
    insert into public.dm_messages (conv_id, sender_id, sender_name, body)
      values (conversation_id, me, nm, cap_t);
  end if;

  -- Sending is also reading: don't make your own share show up as unread to you.
  insert into public.dm_reads (conv_id, user_id, last_read_at)
    values (conversation_id, me, now())
    on conflict (conv_id, user_id) do update set last_read_at = excluded.last_read_at;

  return new_msg;
end;
$$;

-- ---------------------------------------------------------------------------
grant execute on function public.my_memory_stats()                to authenticated;
grant execute on function public.dm_thread(uuid)                  to authenticated;
grant execute on function public.memory_share(uuid, text, text, text, date, text) to authenticated;
