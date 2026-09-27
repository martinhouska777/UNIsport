-- ============================================================================
-- UNIsport — A training partner has to ACCEPT the tag
-- ----------------------------------------------------------------------------
-- WHAT THIS FIXES
--   Log Session let anyone name any real account as their partner and collect
--   the 2.5× new-partner multiplier at once. The named person was never told
--   and got nothing. Now a partner tag is a REQUEST:
--
--     logger saves a session with a partner  → partner_status = 'pending'
--     the partner is asked ("Did you train with Sam today?")
--     they accept                             → 'confirmed'  (both sides score,
--                                                and the session is logged for
--                                                the partner too — a mirror row)
--     they decline                            → 'declined'   (logger scores solo)
--     nobody answers within the window        → 'expired'    (logger scores solo)
--                                                written by the partner's late
--                                                answer, or by the sweep either
--                                                person's Profile runs on load
--
--   Scoring (db/leaderboards.sql) counts a partner ONLY when the status is
--   'confirmed'. Rows written before this existed have a NULL status and read
--   as confirmed, so nobody's history changes under them; rows auto-logged by
--   a confirmed chat plan (plan_confirm) are the same — that plan WAS the
--   confirmation. The window length is DATA (lib/points.ts) and is passed in.
--
-- SECURITY: workout_logs stays private (RLS = own rows). The functions below
--   are SECURITY DEFINER, act for auth.uid(), and only ever let the NAMED
--   partner see or answer a request about them. Same pattern as
--   db/session_plans.sql, which this reuses the shape of.
--   The status is the SERVER's, not the app's: RLS lets you write your own
--   rows, so until 2026-09-27 the app could save its own tag as 'confirmed'
--   and take the partner points with nobody asked. A trigger (the last
--   section) now decides the status of every row the app writes.
--
-- RUN db/leaderboards.sql AFTER this file (it reads the new column).
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

alter table public.workout_logs add column if not exists partner_status text;
  -- null (legacy = confirmed) | 'pending' | 'confirmed' | 'declined' | 'expired'
alter table public.workout_logs add column if not exists mirror_of uuid
  references public.workout_logs (id) on delete set null;
  -- the logger's row this one was created FROM, when a partner accepted
alter table public.workout_logs add column if not exists partner_asked_at timestamptz;
  -- when THIS partner was asked; the window runs from here. Null on rows from
  -- before 2026-09-27, which fall back to created_at. Not the same thing: a
  -- partner added on an edit two days later used to be asked with a window
  -- that had already shut — the push went out and no card ever showed.

create index if not exists workout_logs_partner_pending_idx
  on public.workout_logs (partner_id, created_at)
  where partner_status = 'pending';

-- ---------------------------------------------------------------------------
-- The requests waiting for ME: sessions where somebody named me as their
-- partner and I have not answered, still inside the window. Newest first.
-- ---------------------------------------------------------------------------
drop function if exists public.partner_requests_for_me(integer);

create or replace function public.partner_requests_for_me(p_hours integer default 24)
returns table (
  log_id      uuid,
  logger_id   uuid,
  logger_name text,
  logger_photo text,
  log_date    date,
  activity    text,
  gym         text,
  created_at  timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select
    w.id, w.user_id,
    coalesce(p.data->>'name', 'Member'),
    p.data->>'photo',
    w.log_date, w.activity, w.gym,
    coalesce(w.partner_asked_at, w.created_at)
  from public.workout_logs w
  left join public.profiles p on p.id = w.user_id
  where w.partner_id = auth.uid()
    and w.partner_status = 'pending'
    -- a session logged off a chat plan is answered on the plan (plan_confirm),
    -- never here — or the partner would be asked twice (2026-09-27)
    and w.plan_id is null
    and coalesce(w.partner_asked_at, w.created_at)
        > now() - make_interval(hours => greatest(1, p_hours))
  order by coalesce(w.partner_asked_at, w.created_at) desc;
$$;

-- ---------------------------------------------------------------------------
-- Answer one. Only the named partner may, only while it is pending and inside
-- the window; past the window it is marked expired and nothing else happens.
-- Accepting confirms the logger's row AND writes the session onto the
-- partner's own calendar (once — idempotent on mirror_of), with the logger as
-- THEIR partner, so both people score and both see it.
--
-- Too late RETURNS 'expired' — it does not raise. Until 2026-09-27 it marked
-- the row expired and then raised, and the raise rolled the mark back, so an
-- unanswered tag stayed 'pending' for ever and the logger's session said
-- "waiting to confirm" long after the window had shut.
-- ---------------------------------------------------------------------------
create or replace function public.partner_request_respond(
  p_log_id uuid, p_accept boolean, p_hours integer default 24)
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  w      public.workout_logs;
  nm     text;
begin
  if me is null then raise exception 'not authenticated'; end if;

  -- Locked, so a double tap (or the sweep below landing at the same moment)
  -- waits for this answer instead of racing it into a second mirror row.
  select * into w from public.workout_logs where id = p_log_id for update;
  if w.id is null then raise exception 'unknown session'; end if;
  if w.partner_id is distinct from me then raise exception 'not your request'; end if;
  -- your own tag on yourself: nobody else was there to say yes
  if w.user_id = me then raise exception 'not your request'; end if;
  if w.partner_status is distinct from 'pending' then raise exception 'already answered'; end if;
  if w.plan_id is not null then raise exception 'answered on the session plan'; end if;

  if coalesce(w.partner_asked_at, w.created_at)
     <= now() - make_interval(hours => greatest(1, p_hours)) then
    update public.workout_logs set partner_status = 'expired' where id = p_log_id;
    return 'expired';
  end if;

  if not p_accept then
    update public.workout_logs set partner_status = 'declined' where id = p_log_id;
    return 'declined';
  end if;

  update public.workout_logs set partner_status = 'confirmed' where id = p_log_id;

  select coalesce(p.data->>'name', 'Member') into nm from public.profiles p where p.id = w.user_id;

  insert into public.workout_logs
    (user_id, log_date, activity, gym, partner, partner_id, partner_status, mirror_of)
  select me, w.log_date, w.activity, w.gym, nm, w.user_id, 'confirmed', w.id
  where not exists (
    select 1 from public.workout_logs x where x.mirror_of = w.id and x.user_id = me
  );

  return 'confirmed';
end;
$$;

-- ---------------------------------------------------------------------------
-- The sweep: every tag of MINE that nobody answered in time becomes 'expired'
-- — the ones I made (so my session stops saying "waiting") and the ones made
-- about me (so the row is honest even if I never open the request). Run by
-- the Profile tab when it loads, with the same window it lists requests with.
-- Returns how many it changed, so the Profile knows whether to re-read its
-- calendar. A tag on a chat plan is never touched: the plan answers it.
-- ---------------------------------------------------------------------------
create or replace function public.partner_tags_expire(p_hours integer default 24)
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

  update public.workout_logs
    set partner_status = 'expired'
    where partner_status = 'pending'
      and plan_id is null
      and (user_id = me or partner_id = me)
      and coalesce(partner_asked_at, created_at)
          <= now() - make_interval(hours => greatest(1, p_hours));
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Push targets for the ask. Only the LOGGER of a pending request may call it,
-- and it returns the named partner's devices — if they haven't switched this
-- kind off (profile key notifyPartnerTags, default on). Called server-side
-- from app/api/push/notify; keys never reach the browser.
-- ---------------------------------------------------------------------------
create or replace function public.partner_push_targets(p_log_id uuid)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me    uuid := auth.uid();
  w     public.workout_logs;
  wants boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  select * into w from public.workout_logs where id = p_log_id;
  if w.id is null or w.user_id <> me or w.partner_id is null then return; end if;
  if w.partner_status is distinct from 'pending' then return; end if;
  if w.plan_id is not null then return; end if; -- the plan asks, not the tag

  select coalesce((p.data->>'notifyPartnerTags')::boolean, true) into wants
    from public.profiles p where p.id = w.partner_id;
  if not coalesce(wants, true) then return; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    where s.user_id = w.partner_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- THE GUARD: a tag's status is the server's, never the app's.      2026-09-27
-- RLS lets you write your own rows, and the app used to write partner_status
-- itself — so a doctored request could save 'confirmed' and take the partner
-- points with nobody asked, tag itself, or pose as a partner's copy
-- (mirror_of). It also meant a stale edit screen could undo an answer: open
-- the editor while the tag is pending, the partner accepts, you press Save,
-- and the row went back to 'pending'. On every row the app writes:
--
--   no partner                         → no status
--   yourself as the partner            → refused
--   the same partner kept on an edit   → the status it already has (a
--                                         confirmed session is not re-asked;
--                                         a legacy null stays null = counted)
--   a new or changed partner           → 'pending', asked now (the window
--                                         starts again, whatever the row's age)
--   mirror_of                          → never the app's to set or change
--
-- Only the app's own roles are corrected. The functions above and
-- plan_confirm are SECURITY DEFINER, so inside them current_user is their
-- owner and they pass straight through — they set a status on purpose. For
-- the same reason this function must NOT be security definer itself: it
-- reads the caller's role.
--
-- NOT covered (a chat plan's business, left for its own change): the app can
-- still write `verified` and `plan_id` on its own rows. Neither moves a score
-- — the boards read partner_status only — but the "Verified" badge on your
-- own calendar is not proof of anything.
-- ---------------------------------------------------------------------------
create or replace function public.workout_logs_partner_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  kept boolean := false; -- an edit that leaves the partner as it was
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- OLD is read only on an UPDATE; an INSERT has none.
  if tg_op = 'UPDATE' then
    new.mirror_of := old.mirror_of;
    kept := new.partner_id is not distinct from old.partner_id;
  else
    new.mirror_of := null;
  end if;

  if new.partner_id is null then
    new.partner_status   := null;
    new.partner_asked_at := null;
  elsif new.partner_id = new.user_id then
    raise exception 'you cannot be your own training partner';
  elsif kept then
    new.partner_status   := old.partner_status;
    new.partner_asked_at := old.partner_asked_at;
  else
    new.partner_status   := 'pending';
    new.partner_asked_at := now();
  end if;

  return new;
end;
$$;

-- A trigger function is never called directly (EXECUTE is not checked when a
-- trigger fires), so nobody needs it.
revoke execute on function public.workout_logs_partner_guard() from public, anon, authenticated;

drop trigger if exists workout_logs_partner_guard on public.workout_logs;
create trigger workout_logs_partner_guard
  before insert or update on public.workout_logs
  for each row execute function public.workout_logs_partner_guard();

grant execute on function public.partner_requests_for_me(integer)                to authenticated;
grant execute on function public.partner_request_respond(uuid, boolean, integer) to authenticated;
grant execute on function public.partner_tags_expire(integer)                    to authenticated;
grant execute on function public.partner_push_targets(uuid)                      to authenticated;
