-- UNIsport — Varsity training config (the squad's own training vocabulary)
-- ---------------------------------------------------------------------------
-- One row per team, holding the whole config as JSON: the session types, the
-- intensity zones, the coach's workout library ("most used") and the usual
-- session times. Matches TrainingConfig in lib/varsity/trainingConfig.ts.
--
-- WHY JSON AND NOT TABLES. This is a document the coach edits as a whole and
-- the app reads as a whole — nothing ever queries "all teams whose zone 2 is
-- called Tempo". Tables would buy us joins we will never write and cost a
-- migration every time a type gains a field.
--
-- NO ROW IS THE NORMAL STATE. A team that never opens Settings has none, and
-- the app reads that as "the rowing default" (defaultConfig()). Nothing has to
-- be back-filled for existing squads.
--
-- WHO MAY WRITE: coaches only. Deliberately NOT varsity_can_admin(), which also
-- allows captains — a captain runs invites and explicitly cannot build training
-- (db/varsity_teams.sql, lib/varsity/membership.ts). Renaming the session types
-- rewrites how the whole squad's plan reads, so it belongs with the plan.
--
-- Run this in the Supabase SQL editor. IDEMPOTENT — safe to re-run.

create table if not exists public.varsity_team_config (
  team_id    uuid primary key references public.varsity_teams (id) on delete cascade,
  config     jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.varsity_team_config enable row level security;

-- ── Read: anyone approved on the squad ─────────────────────────────────────
-- Athletes need this too: their plan, calendar and log all render the coach's
-- words and colours, so the config is not a coach secret.
drop policy if exists "Team config readable by the squad" on public.varsity_team_config;
create policy "Team config readable by the squad"
  on public.varsity_team_config for select
  using (public.varsity_my_role(team_id) is not null);

-- ── Write: through the function below only ─────────────────────────────────
-- No insert/update/delete policy on purpose, so the browser can never write a
-- config for a team it does not coach.

create or replace function public.varsity_save_team_config(p_team uuid, p_config jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- coalesce: varsity_my_role() is NULL for anyone who is not an APPROVED
  -- member, and `NULL <> 'coach'` is NULL, not true — without it the guard
  -- never fires. Same trap as varsity_can_admin() documents.
  if not coalesce(public.varsity_my_role(p_team) = 'coach', false) then
    raise exception 'Only a coach may change the training settings';
  end if;

  insert into public.varsity_team_config (team_id, config, updated_by, updated_at)
  values (p_team, p_config, auth.uid(), now())
  on conflict (team_id) do update
    set config = excluded.config,
        updated_by = excluded.updated_by,
        updated_at = now();
end;
$$;

grant execute on function public.varsity_save_team_config(uuid, jsonb) to authenticated;
