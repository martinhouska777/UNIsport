-- UNIsport — Varsity race pieces on the water (the coach's timing sheet)
-- ---------------------------------------------------------------------------
-- One row per SESSION (a day's AM or PM), keyed by the same day_key the plan
-- and the lineups use (sessionKey() in lib/varsity/coachPlan.ts, e.g.
-- '2026-8-15-AM'). The pieces — each with its crews, their start and finish
-- off the running watch, and a note — are one JSON blob mirroring the in-app
-- RacePiece[] model (lib/varsity/racePieces.ts), the way a lineup's boats are.
--
-- The squad reads, the coach writes — the same two helpers the lineups use
-- (db/patch_varsity_coach_only_2026-09-20.sql). Applied 2026-09-21.

create table if not exists public.varsity_race_results (
  day_key     text primary key,                 -- '<year>-<monthIndex>-<day>-<AM|PM>'
  pieces      jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.varsity_race_results enable row level security;

drop policy if exists "Race results readable by the squad" on public.varsity_race_results;
create policy "Race results readable by the squad"
  on public.varsity_race_results for select using (public.varsity_is_member());

drop policy if exists "Race results written by the coach" on public.varsity_race_results;
create policy "Race results written by the coach"
  on public.varsity_race_results for insert with check (public.varsity_is_coach());

drop policy if exists "Race results updated by the coach" on public.varsity_race_results;
create policy "Race results updated by the coach"
  on public.varsity_race_results for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());

drop policy if exists "Race results deleted by the coach" on public.varsity_race_results;
create policy "Race results deleted by the coach"
  on public.varsity_race_results for delete using (public.varsity_is_coach());
