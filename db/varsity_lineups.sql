-- UNIsport — Varsity boat lineups (coach builder → athletes)
-- ---------------------------------------------------------------------------
-- One row per PRACTICE (a day's AM or PM), keyed by the same day_key the plan
-- uses (sessionKey() in lib/varsity/coachPlan.ts, e.g. '2026-5-22-AM'). The
-- boats — seats, cox, note, rigging — are stored as one JSON blob, mirroring
-- the in-app Boat[] model (lib/varsity/coachLineup.ts).
--
-- Like the plan, this is ONE shared team for now: any signed-in user can read
-- and write. Athletes only ever look at PUBLISHED practices (filtered in query).
-- Run in the Supabase SQL editor (matches db/varsity_plan.sql conventions).

create table if not exists public.varsity_lineups (
  day_key     text primary key,            -- '<year>-<monthIndex>-<day>-<AM|PM>'
  boats       jsonb not null default '[]'::jsonb,
  status      text not null default 'draft',   -- 'draft' | 'published'
  updated_at  timestamptz not null default now()
);

alter table public.varsity_lineups enable row level security;

-- The squad reads, the coach writes (2026-09-20) — see db/varsity_plan.sql.
create policy "Lineups readable by the squad"
  on public.varsity_lineups for select using (public.varsity_is_member());
create policy "Lineups written by the coach"
  on public.varsity_lineups for insert with check (public.varsity_is_coach());
create policy "Lineups updated by the coach"
  on public.varsity_lineups for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Lineups deleted by the coach"
  on public.varsity_lineups for delete using (public.varsity_is_coach());
