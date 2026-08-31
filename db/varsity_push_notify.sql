-- ============================================================================
-- UNIsport — Web Push: the coach telling the squad
-- ----------------------------------------------------------------------------
-- db/push_notify.sql did this for a DM: let a verified conversation member reach
-- their counterpart's devices without exposing push_subscriptions (which RLS
-- hides from everyone but their owner). These are the same idea for a TEAM.
--
-- Three things a coach does that an athlete needs to hear about the moment it
-- happens, rather than by opening the app and looking:
--   the week is published   -> the whole squad
--   the boats are published -> the whole squad
--   a technical note        -> that one athlete
--
-- Only a COACH can call these. A captain runs invites, not training, and the
-- same split is enforced in db/varsity_teams.sql — this keeps it true here too,
-- rather than trusting the screen that called.
--
-- As in push_notify.sql: the subscription keys these return are useless without
-- the server-only VAPID private key, and they are only ever read server-side by
-- app/api/push/notify. They never travel to a browser.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- The caller's team, but only if they are an approved COACH of it. NULL for
-- everyone else — an athlete, a captain, a pending member, a signed-out caller.
-- One place for the rule, so the two functions below cannot drift apart.
create or replace function public.varsity_my_coach_team()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.team_id
  from public.varsity_members m
  where m.user_id = auth.uid()
    and m.status = 'approved'
    and m.role = 'coach'
  order by m.created_at
  limit 1;
$$;

-- Every approved team-mate's devices, EXCEPT the caller's own — a coach who
-- publishes does not need telling. Anyone who has switched team notifications
-- off is left out here rather than in the browser, so the preference holds even
-- if a future screen forgets to ask.
create or replace function public.team_push_targets()
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  my_team uuid := public.varsity_my_coach_team();
begin
  if me is null then raise exception 'not authenticated'; end if;
  if my_team is null then raise exception 'not a coach'; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.varsity_members m
    join public.push_subscriptions s on s.user_id = m.user_id
    left join public.profiles p on p.id = m.user_id
    where m.team_id = my_team
      and m.status = 'approved'
      and m.user_id <> me
      -- missing key = on, exactly as the DM preferences behave
      and coalesce((p.data->>'notifyTeam')::boolean, true);
end;
$$;

-- One athlete's devices — for the technical note, which is written to a person,
-- not to a squad. They must be an approved member of the caller's own team.
create or replace function public.athlete_push_targets(p_athlete uuid)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  my_team uuid := public.varsity_my_coach_team();
  on_team boolean;
begin
  if me is null then raise exception 'not authenticated'; end if;
  if my_team is null then raise exception 'not a coach'; end if;
  if p_athlete = me then return; end if; -- a note to yourself pings nobody

  select exists (
    select 1 from public.varsity_members m
    where m.team_id = my_team and m.user_id = p_athlete and m.status = 'approved'
  ) into on_team;
  if not on_team then raise exception 'not on your team'; end if;

  return query
    select s.endpoint, s.p256dh, s.auth
    from public.push_subscriptions s
    left join public.profiles p on p.id = s.user_id
    where s.user_id = p_athlete
      and coalesce((p.data->>'notifyTeam')::boolean, true);
end;
$$;

grant execute on function public.varsity_my_coach_team()        to authenticated;
grant execute on function public.team_push_targets()            to authenticated;
grant execute on function public.athlete_push_targets(uuid)     to authenticated;
