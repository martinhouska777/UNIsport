-- UNIsport — Varsity teams, roles and invite links
-- ---------------------------------------------------------------------------
-- This is the piece that decides WHO is on a squad and WHAT they may do.
--
-- THE CORE IDEA: a link can always be forwarded (WhatsApp, screenshots), so the
-- link is never what grants access. Redeeming a link only puts you in a WAITING
-- ROOM; a captain or coach tapping "approve" is what makes you a member. To make
-- that true, clients can NEVER write to varsity_members or varsity_invites
-- directly — there is no insert/update policy for them. Every change goes
-- through the SECURITY DEFINER functions at the bottom, which check the caller's
-- role first. The browser is never trusted about who is on the team.
--
-- ROLES
--   coach   — everything: builds the plan + lineups, writes notes, invites.
--   captain — invites and approves people. Explicitly CANNOT build plans.
--   athlete — sees the plan, lineups and their own note.
-- A link can only ever make you an ATHLETE. Coach/captain are granted by an
-- existing coach, so no forwarded link can end with a stranger editing training.
--
-- Run this in the Supabase SQL editor. IDEMPOTENT — safe to re-run.

-- pgcrypto gives us gen_random_bytes() for the invite codes. On Supabase it is
-- already installed in the `extensions` schema, so this is usually a no-op.
create extension if not exists pgcrypto with schema extensions;

-- ── A squad ────────────────────────────────────────────────────────────────
create table if not exists public.varsity_teams (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,                      -- 'Harvard Rowing'
  university_key text not null default 'harvard',   -- matches lib/themes.ts
  -- Only accounts on this email domain may redeem an invite (e.g.
  -- 'harvard.edu', which also allows 'college.harvard.edu'). NULL = any email,
  -- which is what a test team wants so a personal Gmail can join.
  email_domain  text,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);

-- ── Who is on it, and as what ──────────────────────────────────────────────
create table if not exists public.varsity_members (
  team_id    uuid not null references public.varsity_teams (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'athlete',   -- 'coach' | 'captain' | 'athlete'
  status     text not null default 'pending',   -- 'pending' | 'approved'
  invite_id  uuid,                              -- which link they came through
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

-- ── The invite links ───────────────────────────────────────────────────────
create table if not exists public.varsity_invites (
  id           uuid primary key default gen_random_uuid(),
  team_id      uuid not null references public.varsity_teams (id) on delete cascade,
  code         text not null unique,             -- the random bit of the URL
  label        text not null default '',         -- 'Squad WhatsApp', 'Walk-on'
  max_uses     int  not null default 1,          -- how many people it can let in
  uses         int  not null default 0,
  expires_at   timestamptz not null,
  -- When set, ONLY this email address can redeem it. Forwarding is pointless.
  email_lock   text,
  -- When true, redeeming approves immediately instead of joining the queue.
  auto_approve boolean not null default false,
  revoked_at   timestamptz,                      -- set = dead, instantly
  created_by   uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists varsity_members_user_idx  on public.varsity_members (user_id);
create index if not exists varsity_invites_team_idx  on public.varsity_invites (team_id);

alter table public.varsity_teams   enable row level security;
alter table public.varsity_members enable row level security;
alter table public.varsity_invites enable row level security;

-- ---------------------------------------------------------------------------
-- Role lookup helpers.
-- SECURITY DEFINER so they can read varsity_members from INSIDE a policy on
-- varsity_members without the policy calling itself forever (Postgres would
-- otherwise error with infinite recursion).
-- ---------------------------------------------------------------------------
create or replace function public.varsity_my_role(p_team uuid)
returns text language sql stable security definer set search_path = public as $$
  select m.role from public.varsity_members m
  where m.team_id = p_team and m.user_id = auth.uid() and m.status = 'approved';
$$;

-- May this caller invite people / approve joiners? Coach and captain both may.
--
-- The coalesce() is load-bearing. varsity_my_role() returns NULL for anyone who
-- isn't an APPROVED member, and `NULL in ('coach','captain')` is NULL — not
-- false. Without it every `if not varsity_can_admin(...)` guard below evaluates
-- to NULL, the IF never fires, and someone merely sitting in the waiting room
-- can mint their own invite links. Never let this return NULL.
create or replace function public.varsity_can_admin(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.varsity_my_role(p_team) in ('coach', 'captain'), false);
$$;

grant execute on function public.varsity_my_role(uuid)  to authenticated;
grant execute on function public.varsity_can_admin(uuid) to authenticated;

-- ── Policies: READ ONLY. All writes go through the functions below. ─────────
drop policy if exists "Varsity teams readable by their members" on public.varsity_teams;
create policy "Varsity teams readable by their members"
  on public.varsity_teams for select
  using (public.varsity_my_role(id) is not null);

-- You can always see your OWN membership row (that is how the app knows you are
-- pending). Approved members can see the rest of the squad.
drop policy if exists "Varsity members readable by the squad" on public.varsity_members;
create policy "Varsity members readable by the squad"
  on public.varsity_members for select
  using (user_id = auth.uid() or public.varsity_my_role(team_id) is not null);

-- Only a coach or captain can even LIST the links.
drop policy if exists "Varsity invites readable by admins" on public.varsity_invites;
create policy "Varsity invites readable by admins"
  on public.varsity_invites for select
  using (public.varsity_can_admin(team_id));

-- ---------------------------------------------------------------------------
-- Start a team. Whoever calls this becomes its coach. This is the only way a
-- first coach ever exists — everything else is invited.
-- ---------------------------------------------------------------------------
create or replace function public.varsity_create_team(p_name text, p_email_domain text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  insert into public.varsity_teams (name, email_domain, created_by)
  values (trim(p_name), nullif(trim(coalesce(p_email_domain, '')), ''), auth.uid())
  returning id into v_team;

  insert into public.varsity_members (team_id, user_id, role, status)
  values (v_team, auth.uid(), 'coach', 'approved');

  return v_team;
end $$;

-- ---------------------------------------------------------------------------
-- What am I? Powers the mode switcher (show Varsity or not) and the nav
-- (Coach Console or not). Returns nothing at all if you are on no team.
-- ---------------------------------------------------------------------------
create or replace function public.varsity_my_membership()
returns table (team_id uuid, team_name text, role text, status text)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, m.role, m.status
  from public.varsity_members m
  join public.varsity_teams t on t.id = m.team_id
  where m.user_id = auth.uid()
  order by m.created_at
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- A random, unguessable code: 16 characters from a 31-character alphabet with
-- the ambiguous ones (0/O, 1/I/L) removed, so it survives being read aloud or
-- retyped. About 79 bits — not something anyone guesses or enumerates.
-- ---------------------------------------------------------------------------
-- search_path includes `extensions` because that is where Supabase installs
-- pgcrypto — with search_path pinned to public alone, gen_random_bytes() is
-- invisible and every attempt to make a link fails.
create or replace function public.varsity_gen_code()
returns text language plpgsql volatile set search_path = public, extensions as $$
declare
  alphabet constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  result text := '';
  b bytea := gen_random_bytes(16);
  i int;
begin
  for i in 0..15 loop
    result := result || substr(alphabet, (get_byte(b, i) % length(alphabet)) + 1, 1);
  end loop;
  return result;
end $$;

-- ---------------------------------------------------------------------------
-- Make a link. Coach or captain only.
--   p_max_uses     — how many people it can admit (1 = a personal, single-use link)
--   p_days         — how long it lives
--   p_email_lock   — lock it to ONE email address (optional)
--   p_auto_approve — skip the waiting room (still domain + expiry + cap limited)
-- ---------------------------------------------------------------------------
create or replace function public.varsity_create_invite(
  p_team uuid,
  p_label text default '',
  p_max_uses int default 1,
  p_days int default 7,
  p_email_lock text default null,
  p_auto_approve boolean default false
)
returns table (id uuid, code text, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_code text;
begin
  if not public.varsity_can_admin(p_team) then
    raise exception 'Only a coach or captain can create invites';
  end if;

  loop
    v_code := public.varsity_gen_code();
    exit when not exists (select 1 from public.varsity_invites i where i.code = v_code);
  end loop;

  return query
  insert into public.varsity_invites
    (team_id, code, label, max_uses, expires_at, email_lock, auto_approve, created_by)
  values (
    p_team,
    v_code,
    coalesce(trim(p_label), ''),
    greatest(1, least(p_max_uses, 200)),
    now() + (greatest(1, least(p_days, 90)) || ' days')::interval,
    lower(nullif(trim(coalesce(p_email_lock, '')), '')),
    coalesce(p_auto_approve, false),
    auth.uid()
  )
  returning varsity_invites.id, varsity_invites.code, varsity_invites.expires_at;
end $$;

-- Kill a link instantly. Anyone already approved is unaffected.
create or replace function public.varsity_revoke_invite(p_invite uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_team uuid;
begin
  select team_id into v_team from public.varsity_invites where id = p_invite;
  if v_team is null then raise exception 'No such invite'; end if;
  if not public.varsity_can_admin(v_team) then
    raise exception 'Only a coach or captain can revoke invites';
  end if;
  update public.varsity_invites set revoked_at = now() where id = p_invite;
end $$;

-- ---------------------------------------------------------------------------
-- Look at a code WITHOUT redeeming it, so the join screen can say "Harvard
-- Rowing" (or why the link is dead) before anyone taps anything. Deliberately
-- returns no member data and no team id.
-- ---------------------------------------------------------------------------
create or replace function public.varsity_invite_preview(p_code text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare i record; t record;
begin
  select * into i from public.varsity_invites where code = upper(trim(p_code));
  if not found then return jsonb_build_object('valid', false, 'reason', 'unknown'); end if;

  select * into t from public.varsity_teams where id = i.team_id;

  if i.revoked_at is not null then
    return jsonb_build_object('valid', false, 'reason', 'revoked', 'team_name', t.name);
  elsif i.expires_at < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired', 'team_name', t.name);
  elsif i.uses >= i.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'used_up', 'team_name', t.name);
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

-- ---------------------------------------------------------------------------
-- Redeem a code. This is the ONLY route into a squad, and it can only ever
-- hand out the 'athlete' role. Every rule from the design lives here:
-- revoked / expired / used up / wrong email / wrong domain.
-- ---------------------------------------------------------------------------
create or replace function public.varsity_redeem_invite(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
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

  -- Already on this team? Say where they stand; don't burn a use.
  select * into v_existing from public.varsity_members
  where team_id = i.team_id and user_id = auth.uid();
  if found then
    return jsonb_build_object('ok', true, 'status', v_existing.status,
                              'role', v_existing.role, 'team_name', t.name, 'already', true);
  end if;

  v_status := case when i.auto_approve then 'approved' else 'pending' end;

  insert into public.varsity_members (team_id, user_id, role, status, invite_id)
  values (i.team_id, auth.uid(), 'athlete', v_status, i.id);

  update public.varsity_invites set uses = uses + 1 where id = i.id;

  return jsonb_build_object('ok', true, 'status', v_status, 'role', 'athlete',
                            'team_name', t.name, 'already', false);
end $$;

-- ---------------------------------------------------------------------------
-- The squad list for the admin screen: everyone with their name and email, so a
-- captain can tell two people apart before approving. profiles has RLS (you see
-- only your own row), so like get_public_profile this reads across it as
-- DEFINER — but only after checking the caller really is a coach or captain.
-- ---------------------------------------------------------------------------
create or replace function public.varsity_squad(p_team uuid)
returns table (user_id uuid, name text, email text, role text, status text,
               invite_label text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.varsity_can_admin(p_team) then
    raise exception 'Only a coach or captain can see the squad list';
  end if;
  return query
    select m.user_id,
           coalesce(p.data->>'name', 'Unnamed'),
           u.email::text,
           m.role,
           m.status,
           coalesce(i.label, ''),
           m.created_at
    from public.varsity_members m
    left join public.profiles p on p.id = m.user_id
    left join auth.users u      on u.id = m.user_id
    left join public.varsity_invites i on i.id = m.invite_id
    where m.team_id = p_team
    order by (m.status = 'pending') desc, m.created_at;
end $$;

-- Approve someone out of the waiting room, or remove them. Coach/captain only.
-- Note a captain can never promote anyone: role is not a parameter here.
create or replace function public.varsity_set_member_status(
  p_team uuid, p_user uuid, p_status text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.varsity_can_admin(p_team) then
    raise exception 'Only a coach or captain can approve members';
  end if;
  if p_status = 'removed' then
    -- Never let an admin delete the last coach out from under the team.
    if (select role from public.varsity_members
        where team_id = p_team and user_id = p_user) = 'coach'
       and (select count(*) from public.varsity_members
            where team_id = p_team and role = 'coach' and status = 'approved') <= 1 then
      raise exception 'A team must keep at least one coach';
    end if;
    delete from public.varsity_members where team_id = p_team and user_id = p_user;
  elsif p_status in ('approved', 'pending') then
    update public.varsity_members set status = p_status
    where team_id = p_team and user_id = p_user;
  else
    raise exception 'Unknown status %', p_status;
  end if;
end $$;

-- Change someone's role. COACH ONLY — this is what stops a leaked link, or a
-- captain, from ever producing another plan-builder.
create or replace function public.varsity_set_member_role(
  p_team uuid, p_user uuid, p_role text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- IS DISTINCT FROM, not <>: for a non-member varsity_my_role() is NULL, and
  -- `NULL <> 'coach'` is NULL, so a plain <> would let a stranger straight past
  -- this guard and hand themselves a coach role.
  if public.varsity_my_role(p_team) is distinct from 'coach' then
    raise exception 'Only a coach can change roles';
  end if;
  if p_role not in ('coach', 'captain', 'athlete') then
    raise exception 'Unknown role %', p_role;
  end if;
  update public.varsity_members set role = p_role
  where team_id = p_team and user_id = p_user;
end $$;

-- The links a coach/captain has made, with how many joined through each.
create or replace function public.varsity_invite_list(p_team uuid)
returns table (id uuid, code text, label text, max_uses int, uses int,
               expires_at timestamptz, email_lock text, auto_approve boolean,
               revoked_at timestamptz, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.varsity_can_admin(p_team) then
    raise exception 'Only a coach or captain can list invites';
  end if;
  return query
    select i.id, i.code, i.label, i.max_uses, i.uses, i.expires_at,
           i.email_lock, i.auto_approve, i.revoked_at, i.created_at
    from public.varsity_invites i
    where i.team_id = p_team
    order by i.created_at desc;
end $$;

grant execute on function public.varsity_create_team(text, text)                     to authenticated;
grant execute on function public.varsity_my_membership()                             to authenticated;
grant execute on function public.varsity_create_invite(uuid, text, int, int, text, boolean) to authenticated;
grant execute on function public.varsity_revoke_invite(uuid)                         to authenticated;
grant execute on function public.varsity_invite_preview(text)                        to authenticated;
grant execute on function public.varsity_redeem_invite(text)                         to authenticated;
grant execute on function public.varsity_squad(uuid)                                 to authenticated;
grant execute on function public.varsity_set_member_status(uuid, uuid, text)         to authenticated;
grant execute on function public.varsity_set_member_role(uuid, uuid, text)           to authenticated;
grant execute on function public.varsity_invite_list(uuid)                           to authenticated;

-- The preview runs before sign-in on the join screen, so anonymous callers need
-- it too. It returns only a team NAME and whether the code is alive.
grant execute on function public.varsity_invite_preview(text) to anon;

-- ---------------------------------------------------------------------------
-- FIRST RUN — make yourself the first coach.
--
-- Everyone else joins by invite, but the first coach has to come from somewhere.
-- varsity_create_team() can't do it from here: the SQL editor has no signed-in
-- user, so auth.uid() is null. So do it directly, once.
--
-- Sign up in the app FIRST (so the account exists), then edit the email below
-- and run this block. Re-running it is safe — it won't make a second team.
--
--   email_domain: NULL lets any address join, which is what a test team wants
--   so a personal Gmail can be a squad member. Set it to 'harvard.edu' for a
--   real team and only university addresses can ever redeem a link.
-- ---------------------------------------------------------------------------
-- do $$
-- declare
--   v_email text := 'you@example.com';   -- <<< the account you signed up with
--   v_user  uuid;
--   v_team  uuid;
-- begin
--   select id into v_user from auth.users where lower(email) = lower(v_email);
--   if v_user is null then
--     raise exception 'No account for % — sign up in the app first', v_email;
--   end if;
--
--   select id into v_team from public.varsity_teams where name = 'Harvard Rowing';
--   if v_team is null then
--     insert into public.varsity_teams (name, email_domain, created_by)
--     values ('Harvard Rowing', null, v_user)
--     returning id into v_team;
--   end if;
--
--   insert into public.varsity_members (team_id, user_id, role, status)
--   values (v_team, v_user, 'coach', 'approved')
--   on conflict (team_id, user_id)
--   do update set role = 'coach', status = 'approved';
-- end $$;
