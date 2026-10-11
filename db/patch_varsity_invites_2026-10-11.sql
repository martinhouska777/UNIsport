-- ============================================================================
-- UNIsport — team invites: where you stand, seats back, and two notifications
-- ----------------------------------------------------------------------------
-- Owner, 2026-10-11: "fix the problems, fix all of them" — after a rower asked to
-- join, was let in, and the app had no way of saying so.
--
--   1. varsity_invite_preview — someone ALREADY on the team (waiting or in) is
--      told where they stand, whatever state the link is in. A personal link is
--      single-use, so the person it was for re-opening it to check on their
--      request used to be told "already used — ask for a new one".
--   2. varsity_redeem_invite — the same "already on this team?" question is
--      asked FIRST, before expired / used up / cancelled, for the same reason.
--   3. varsity_set_member_status — turning down a request gives its seat back
--      on the link it came through. A personal link rejected by mistake used to
--      be dead, and every rejected stranger cost a group link a place.
--   4. join_request_push_targets — the coaches and captains of the team the
--      caller just asked to join: "Sam asked to join".
--   5. join_approved_push_targets — the rower a coach or captain just let in:
--      "You're in".
--
-- Who receives a notification is decided here, never by the browser — the same
-- rule as db/push_notify.sql and db/varsity_push_notify.sql. Both honour the
-- recipient's team-notifications switch (profiles.data.notifyTeam, missing = on).
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- 1 ── Preview: say where a member stands before anything else ──────────────
create or replace function public.varsity_invite_preview(p_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare i record; t record; v_status text;
begin
  select * into i from public.varsity_invites where code = upper(trim(p_code));
  if not found then return jsonb_build_object('valid', false, 'reason', 'unknown'); end if;

  select * into t from public.varsity_teams where id = i.team_id;

  -- Already on this team (signed in, waiting or let in)? That is the answer,
  -- whatever has happened to the link since.
  if auth.uid() is not null then
    select m.status into v_status from public.varsity_members m
    where m.team_id = i.team_id and m.user_id = auth.uid();
  end if;
  if v_status is not null then
    return jsonb_build_object('valid', true, 'team_name', t.name,
                              'personal', i.email_lock is not null,
                              'member_status', v_status);
  end if;

  -- The failure cases carry `personal` too, so the screen can tell someone
  -- re-opening their own one-person invite ("already used") apart from someone
  -- arriving at a squad link that filled up.
  if i.revoked_at is not null then
    return jsonb_build_object('valid', false, 'reason', 'revoked', 'team_name', t.name,
                              'personal', i.email_lock is not null);
  elsif i.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired', 'team_name', t.name,
                              'personal', i.email_lock is not null);
  elsif i.uses >= i.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'used_up', 'team_name', t.name,
                              'personal', i.email_lock is not null);
  end if;

  return jsonb_build_object(
    'valid', true,
    'team_name', t.name,
    'email_domain', t.email_domain,
    'personal', i.email_lock is not null,
    'auto_approve', i.auto_approve,
    'expires_at', i.expires_at
  );
end $$;

-- 2 ── Redeem: "already on this team?" first ───────────────────────────────
create or replace function public.varsity_redeem_invite(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  i record; t record; v_email text; v_existing record; v_status text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  -- Read the address off the account rather than auth.email(): this function
  -- runs as DEFINER so it can see auth.users, and that works on every project
  -- regardless of which auth helpers are installed.
  select lower(u.email) into v_email from auth.users u where u.id = auth.uid();

  -- Lock the row so two people redeeming the last seat at once can't both win.
  select * into i from public.varsity_invites where code = upper(trim(p_code)) for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'unknown'); end if;

  select * into t from public.varsity_teams where id = i.team_id;

  -- Already on this team? Say where they stand; don't burn a use — and don't
  -- turn them away because the link has since expired or filled up.
  select * into v_existing from public.varsity_members
  where team_id = i.team_id and user_id = auth.uid();
  if found then
    return jsonb_build_object('ok', true, 'status', v_existing.status,
                              'role', v_existing.role, 'team_name', t.name, 'already', true);
  end if;

  if i.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  elsif i.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  elsif i.uses >= i.max_uses then
    return jsonb_build_object('ok', false, 'reason', 'used_up');
  end if;

  -- A personal link works for exactly one address.
  if i.email_lock is not null and i.email_lock <> v_email then
    return jsonb_build_object('ok', false, 'reason', 'wrong_email');
  end if;

  -- The university email rule: 'harvard.edu' also accepts 'college.harvard.edu'.
  if t.email_domain is not null
     and v_email not like ('%@' || t.email_domain)
     and v_email not like ('%.' || t.email_domain) then
    return jsonb_build_object('ok', false, 'reason', 'wrong_domain', 'email_domain', t.email_domain);
  end if;

  v_status := case when i.auto_approve then 'approved' else 'pending' end;

  insert into public.varsity_members (team_id, user_id, role, status, invite_id)
  values (i.team_id, auth.uid(), 'athlete', v_status, i.id);

  update public.varsity_invites set uses = uses + 1 where id = i.id;

  return jsonb_build_object('ok', true, 'status', v_status, 'role', 'athlete',
                            'team_name', t.name, 'already', false);
end $$;

-- 3 ── Turning a request down gives its seat back ───────────────────────────
create or replace function public.varsity_set_member_status(p_team uuid, p_user uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_member record;
begin
  if not public.varsity_can_admin(p_team) then
    raise exception 'Only a coach or captain can approve members';
  end if;
  if p_status = 'removed' then
    select * into v_member from public.varsity_members
    where team_id = p_team and user_id = p_user;
    -- Never let an admin delete the last coach out from under the team.
    if v_member.role = 'coach'
       and (select count(*) from public.varsity_members
            where team_id = p_team and role = 'coach' and status = 'approved') <= 1 then
      raise exception 'A team must keep at least one coach';
    end if;
    delete from public.varsity_members where team_id = p_team and user_id = p_user;
    -- A REQUEST turned down (still waiting, not someone who was let in) hands
    -- its place back to the link it came through.
    if v_member.status = 'pending' and v_member.invite_id is not null then
      update public.varsity_invites set uses = greatest(uses - 1, 0)
      where id = v_member.invite_id;
    end if;
  elsif p_status in ('approved', 'pending') then
    update public.varsity_members set status = p_status
    where team_id = p_team and user_id = p_user;
  else
    raise exception 'Unknown status %', p_status;
  end if;
end $$;

-- 4 ── "Sam asked to join" → the team's coaches and captains ────────────────
-- Only for a request made in the last 10 minutes, so a waiting member can't use
-- it to buzz the coaches whenever they like.
create or replace function public.join_request_push_targets()
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me     uuid := auth.uid();
  v_team uuid;
begin
  if me is null then raise exception 'not authenticated'; end if;

  select m.team_id into v_team
  from public.varsity_members m
  where m.user_id = me
    and m.status = 'pending'
    and m.created_at > now() - interval '10 minutes'
  order by m.created_at desc
  limit 1;
  if v_team is null then raise exception 'no new request'; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.varsity_members m
    join public.push_subscriptions s on s.user_id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.team_id = v_team
      and m.status = 'approved'
      and m.role in ('coach', 'captain')
      and m.user_id <> me
      and coalesce((p.data->>'notifyTeam')::boolean, true);
end;
$$;

-- 5 ── "You're in" → the rower who was just let in ──────────────────────────
-- The caller must be able to let people into a team the rower is now approved on.
create or replace function public.join_approved_push_targets(p_athlete uuid)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  is_mine boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if p_athlete = me then return; end if;

  select exists (
    select 1 from public.varsity_members a
    where a.user_id = p_athlete
      and a.status = 'approved'
      and public.varsity_can_admin(a.team_id)
  ) into is_mine;
  if not is_mine then raise exception 'not on your team'; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    left join public.profiles p on p.id = s.user_id
    where s.user_id = p_athlete
      and coalesce((p.data->>'notifyTeam')::boolean, true);
end;
$$;

grant execute on function public.join_request_push_targets()        to authenticated;
grant execute on function public.join_approved_push_targets(uuid)   to authenticated;
