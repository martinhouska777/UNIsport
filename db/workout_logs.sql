-- ============================================================================
-- UNIsport — Workout logs (normal mode: log a session + month calendar)
-- ----------------------------------------------------------------------------
-- One row per logged workout for ONE user. These power the Profile tab's
-- session calendar and the "Log Session" flow. Each log carries an activity,
-- optional gym + training partner, a structured list of exercises (name / sets
-- / reps / weight, stored as jsonb), and a free-text note.
--
-- PRIVATE per-user: Row-Level Security restricts every row to its owner
-- (auth.uid() = user_id) — same pattern as db/varsity_logs.sql. Photos are NOT
-- here yet (a later slice will add them).
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.workout_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  log_date   date not null,                       -- the day the workout was done
  activity   text not null default 'gym',         -- 'gym' | 'running' | 'cardio' | 'other'
  gym        text,                                 -- optional gym name
  partner    text,                                 -- optional training-partner name
  exercises  jsonb not null default '[]'::jsonb,   -- [{ name, sets, reps, weight }]
  note       text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists workout_logs_user_date_idx
  on public.workout_logs (user_id, log_date);

-- Lock to the owner only.
alter table public.workout_logs enable row level security;

-- Policies are created with guards so re-running the script doesn't error.
do $$
begin
  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workout_logs'
      and policyname = 'Own workout logs readable') then
    create policy "Own workout logs readable"
      on public.workout_logs for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workout_logs'
      and policyname = 'Own workout logs insertable') then
    create policy "Own workout logs insertable"
      on public.workout_logs for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workout_logs'
      and policyname = 'Own workout logs updatable') then
    create policy "Own workout logs updatable"
      on public.workout_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'workout_logs'
      and policyname = 'Own workout logs deletable') then
    create policy "Own workout logs deletable"
      on public.workout_logs for delete using (auth.uid() = user_id);
  end if;
end $$;
