-- UNIsport: WINTER POINTS (owner, 2026-11-08: "Can you put it in the app now? I like it.")
--
-- The team's winter training competition, built from the HUBC 2025-26 rules.
-- The captain (or the coach) sets it up in the Coach Console under Settings,
-- athletes open the standings from their Profile, and the points come from the
-- sessions they already log.
--
--   1. varsity_winter_points: one row per team. `draft` is what the captain is
--      setting up, `config` is what athletes see (copied from the draft on
--      Publish, null until the first one).
--   2. Two fields on a logged session: which winter points activity it counts as
--      (`wp_activity`, the activity's id in the config) and whether it has
--      heart rate data (`heart_rate`). Both stay null outside winter points.
--   3. varsity_winter_points_logs(): every teammate's sessions between two dates,
--      only the fields the rules read (no titles, notes or photos), one row per
--      athlete so a team of fifty over five weeks is never cut by the row limit.
--
-- Safe to run twice.

-- 1. The event ---------------------------------------------------------------
create table if not exists public.varsity_winter_points (
  team_id      uuid primary key references public.varsity_teams (id) on delete cascade,
  draft        jsonb not null,
  config       jsonb,
  published_at timestamptz,
  updated_by   uuid references auth.users (id) on delete set null,
  updated_at   timestamptz not null default now()
);

alter table public.varsity_winter_points enable row level security;

drop policy if exists "Winter points readable by the team" on public.varsity_winter_points;
create policy "Winter points readable by the team"
  on public.varsity_winter_points for select
  using (public.varsity_my_role(team_id) is not null);

-- Writing goes through here only: a coach or a captain of that team.
create or replace function public.varsity_save_winter_points(
  p_team uuid,
  p_draft jsonb,
  p_publish boolean default false
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.varsity_can_admin(p_team) then
    raise exception 'Only a coach or captain may set up winter points';
  end if;
  insert into public.varsity_winter_points (team_id, draft, config, published_at, updated_by, updated_at)
  values (
    p_team,
    p_draft,
    case when p_publish then p_draft end,
    case when p_publish then now() end,
    auth.uid(),
    now()
  )
  on conflict (team_id) do update
    set draft        = excluded.draft,
        config       = case when p_publish then excluded.draft else public.varsity_winter_points.config end,
        published_at = case when p_publish then now() else public.varsity_winter_points.published_at end,
        updated_by   = auth.uid(),
        updated_at   = now();
end;
$$;

grant execute on function public.varsity_save_winter_points(uuid, jsonb, boolean) to authenticated;

-- 2. What a session counts as --------------------------------------------------
alter table public.varsity_logs add column if not exists wp_activity text;
alter table public.varsity_logs add column if not exists heart_rate  boolean;

-- 3. The standings' read ----------------------------------------------------------
-- Any approved member of the team may call it; it answers for that team's
-- approved members only. The window is capped at 120 days.
create or replace function public.varsity_winter_points_logs(p_team uuid, p_from date, p_to date)
returns table (athlete_id uuid, logs jsonb)
language sql stable security definer set search_path = public as $$
  select l.athlete_id,
         jsonb_agg(jsonb_build_object(
           'id',          l.id,
           'log_date',    l.log_date,
           'category',    l.category,
           'minutes',     l.minutes,
           'metres',      l.metres,
           'wp_activity', l.wp_activity,
           'heart_rate',  l.heart_rate,
           'created_at',  l.created_at
         ) order by l.log_date, l.created_at, l.id)
  from public.varsity_logs l
  join public.varsity_members m
    on m.user_id = l.athlete_id
   and m.team_id = p_team
   and m.status  = 'approved'
  where public.varsity_my_role(p_team) is not null
    and l.log_date between p_from and least(p_to, p_from + 120)
  group by l.athlete_id;
$$;

grant execute on function public.varsity_winter_points_logs(uuid, date, date) to authenticated;
