-- ============================================================================
-- UNIsport — Web Push: the coach's three kinds, each with its own switch
-- ----------------------------------------------------------------------------
-- db/varsity_push_notify.sql gave the squad ONE preference for everything the
-- coach sends (profiles.data.notifyTeam). The owner split it (2026-09-30):
-- Varsity Mode → Settings → Notifications → From your coach now has
--   Training plan   notifyTeamPlan     the week is published   (team_plan)
--   Lineups         notifyTeamLineup   the boats are published (team_lineup)
--   Notes to you    notifyTeamNotes    a technical note        (note)
--
-- Each new key falls back to the old notifyTeam, then to ON — so anyone who
-- had switched the single switch off stays off for all three until they choose
-- otherwise, and the screen reads them the same way (lib/currentUser.ts).
--
-- team_push_targets gains a KIND argument (a second, overloaded function —
-- the zero-argument one stays, so a server that hasn't been redeployed keeps
-- working). app/api/push/notify passes the kind and falls back to the old
-- function if this file hasn't been run yet. athlete_push_targets keeps its
-- signature and only reads the notes switch now.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create or replace function public.team_push_targets(p_kind text)
returns table (endpoint text, p256dh text, auth text)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me      uuid := auth.uid();
  my_team uuid := public.varsity_my_coach_team();
  pref    text := case p_kind when 'team_lineup' then 'notifyTeamLineup' else 'notifyTeamPlan' end;
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
      -- this kind's own switch, else the old single one, else on
      and coalesce((p.data->>pref)::boolean, (p.data->>'notifyTeam')::boolean, true);
end;
$$;

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
      and coalesce((p.data->>'notifyTeamNotes')::boolean, (p.data->>'notifyTeam')::boolean, true);
end;
$$;

grant execute on function public.team_push_targets(text)        to authenticated;
grant execute on function public.athlete_push_targets(uuid)     to authenticated;
