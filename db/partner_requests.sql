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
--
-- RUN db/leaderboards.sql AFTER this file (it reads the new column).
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

alter table public.workout_logs add column if not exists partner_status text;
  -- null (legacy = confirmed) | 'pending' | 'confirmed' | 'declined' | 'expired'
alter table public.workout_logs add column if not exists mirror_of uuid
  references public.workout_logs (id) on delete set null;
  -- the logger's row this one was created FROM, when a partner accepted

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
    w.log_date, w.activity, w.gym, w.created_at
  from public.workout_logs w
  left join public.profiles p on p.id = w.user_id
  where w.partner_id = auth.uid()
    and w.partner_status = 'pending'
    and w.created_at > now() - make_interval(hours => greatest(1, p_hours))
  order by w.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Answer one. Only the named partner may, only while it is pending and inside
-- the window; past the window it is marked expired and refused.
-- Accepting confirms the logger's row AND writes the session onto the
-- partner's own calendar (once — idempotent on mirror_of), with the logger as
-- THEIR partner, so both people score and both see it.
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

  select * into w from public.workout_logs where id = p_log_id;
  if w.id is null then raise exception 'unknown session'; end if;
  if w.partner_id is distinct from me then raise exception 'not your request'; end if;
  if w.partner_status is distinct from 'pending' then raise exception 'already answered'; end if;

  if w.created_at <= now() - make_interval(hours => greatest(1, p_hours)) then
    update public.workout_logs set partner_status = 'expired' where id = p_log_id;
    raise exception 'expired';
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

  select coalesce((p.data->>'notifyPartnerTags')::boolean, true) into wants
    from public.profiles p where p.id = w.partner_id;
  if not coalesce(wants, true) then return; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    where s.user_id = w.partner_id;
end;
$$;

grant execute on function public.partner_requests_for_me(integer)                to authenticated;
grant execute on function public.partner_request_respond(uuid, boolean, integer) to authenticated;
grant execute on function public.partner_push_targets(uuid)                      to authenticated;
