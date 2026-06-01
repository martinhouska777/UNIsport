-- UNIsport — Varsity workout logs (athlete logs a session)
-- ---------------------------------------------------------------------------
-- One row per logged session for ONE athlete. Two sources:
--   • 'plan'  — the athlete logged a session the coach prescribed; day_key ties
--               it to that plan slot (sessionKey from coachPlan, e.g.
--               '2026-5-22-AM'), so there's at most one plan-log per slot.
--   • 'extra' — extra training the athlete added themselves (day_key null).
--
-- Unlike the shared team plan/lineups, logs are PRIVATE: RLS restricts every
-- row to its owner (auth.uid() = athlete_id). The C2/RP3 photo auto-read fills
-- `result` later; for now the athlete types it (or leaves it blank).
-- Run in the Supabase SQL editor.

create table if not exists public.varsity_logs (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  uuid not null references public.profiles (id) on delete cascade,
  log_date    date not null,                 -- the day the session was done
  period      text,                          -- 'AM' | 'PM' | null
  day_key     text,                          -- plan slot key, or null for extra
  source      text not null default 'extra', -- 'plan' | 'extra'
  title       text not null,                 -- e.g. "Water · UT2" or "Easy run"
  category    text,                           -- water/erg/weights/flex/off/run/bike/other
  result      text not null default '',       -- distance / splits / time (free text)
  feeling     int,                            -- 1..5, how it felt (optional)
  note        text not null default '',
  created_at  timestamptz not null default now()
);

-- At most one plan-log per athlete per plan slot (extras have null day_key, and
-- Postgres treats nulls as distinct, so many extras per day are allowed).
create unique index if not exists varsity_logs_athlete_daykey
  on public.varsity_logs (athlete_id, day_key);

alter table public.varsity_logs enable row level security;

create policy "Own logs readable"  on public.varsity_logs for select using (auth.uid() = athlete_id);
create policy "Own logs insertable" on public.varsity_logs for insert with check (auth.uid() = athlete_id);
create policy "Own logs updatable" on public.varsity_logs for update using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);
create policy "Own logs deletable" on public.varsity_logs for delete using (auth.uid() = athlete_id);
