-- UNIsport — Varsity TEAM WORKOUT results (the shared board)
-- ---------------------------------------------------------------------------
-- WHY THIS EXISTS
--   db/varsity_logs.sql holds every athlete's own training log, and it is
--   PRIVATE: its RLS lets you read your own rows and nobody else's. That is
--   correct for a training diary — and it makes a team board impossible.
--
--   So a team board is a SEPARATE, DELIBERATE act of sharing. The coach flags
--   one prescribed session as a TEAM WORKOUT; from then on, logging that
--   session also writes a row here, where the whole squad can read it. Your
--   diary stays private; the piece the coach called a team piece does not.
--
-- WHAT A ROW IS
--   One athlete's result for one team workout. At most one per athlete per
--   workout (re-logging updates the row rather than adding a second time).
--
-- WEIGHT IS A SNAPSHOT, NOT A LOOKUP
--   watts-per-kilo needs a body weight. We copy the athlete's weight ONTO the
--   row at the moment they log, instead of reading their profile from the
--   board. Two reasons: it is the weight they actually pulled that piece at
--   (which is the number that means something six weeks later), and it means
--   the board never needs read access to anybody's profile.
--
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.

-- ── 1. The coach's switch, on the existing plan session ────────────────────
-- team_workout: does this session have a shared board at all?
-- board: 'ranked'  — a test or race piece, fastest first
--        'average' — steady training: who did it, and the squad average
alter table public.varsity_plan_sessions
  add column if not exists team_workout boolean not null default false;
alter table public.varsity_plan_sessions
  add column if not exists board        text    not null default 'average';

-- ── 2. The results ─────────────────────────────────────────────────────────
create table if not exists public.varsity_results (
  id           uuid primary key default gen_random_uuid(),
  -- Which workout. Matches sessionKey() in lib/varsity/coachPlan.ts, e.g.
  -- '2026-5-22-AM'. Cascades: unflagging is the coach's job, but if the
  -- session is deleted outright its board goes with it.
  day_key      text not null references public.varsity_plan_sessions (day_key) on delete cascade,
  athlete_id   uuid not null references auth.users (id) on delete cascade,
  -- Name copied at log time so the board never has to read `profiles` (which
  -- is owner-read-only). Refreshed on every re-log, so a rename catches up.
  athlete_name text not null default '',
  minutes      numeric,   -- total time, in minutes (decimal: 6:08.4 -> 6.14)
  metres       int,       -- total distance
  split        text,      -- as shown on the monitor, e.g. '1:52.3'
  split_sec    numeric,   -- the same split in seconds — what ranking sorts on
  stroke_rate  int,
  watts        int,       -- average watts (from the monitor, else derived)
  weight_kg    numeric,   -- snapshot, for watts-per-kilo (null = they haven't set one)
  photo_path   text,      -- the monitor photo (next slice)
  note         text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (day_key, athlete_id)
);

create index if not exists varsity_results_day_idx     on public.varsity_results (day_key);
create index if not exists varsity_results_athlete_idx on public.varsity_results (athlete_id);

alter table public.varsity_results enable row level security;

-- ── 3. Policies ────────────────────────────────────────────────────────────
-- READ: the whole squad, exactly as the owner asked ("everybody sees
-- everything"). Scoped to signed-in users, matching db/varsity_plan.sql — when
-- the plan itself becomes per-team, this policy tightens with it.
drop policy if exists "Varsity results readable by signed-in users" on public.varsity_results;
create policy "Varsity results readable by signed-in users"
  on public.varsity_results for select
  using (auth.role() = 'authenticated');

-- WRITE: only ever your own result. Nobody can post, edit or delete a time
-- under someone else's name — not a teammate, not a captain.
drop policy if exists "Own result insertable" on public.varsity_results;
create policy "Own result insertable"
  on public.varsity_results for insert with check (auth.uid() = athlete_id);

drop policy if exists "Own result updatable" on public.varsity_results;
create policy "Own result updatable"
  on public.varsity_results for update
  using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);

drop policy if exists "Own result deletable" on public.varsity_results;
create policy "Own result deletable"
  on public.varsity_results for delete using (auth.uid() = athlete_id);
