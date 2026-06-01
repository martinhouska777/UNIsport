-- UNIsport — Varsity training plan (coach builder → athletes)
-- ---------------------------------------------------------------------------
-- The coach builds a PLAN as a set of BLOCKS (date ranges, usually up to a
-- race). Each day in a block has an AM and a PM slot; a slot holds one SESSION.
-- For now there is ONE shared team plan: every signed-in varsity user reads the
-- same blocks/sessions. Per-team scoping + coach/athlete roles come later, so
-- the policies below simply let any AUTHENTICATED user read and write.
--
-- Athletes only ever look at PUBLISHED blocks (status = 'published') — that
-- filtering happens in the query, not in the policy.
--
-- Run this in the Supabase SQL editor (matches db/profiles.sql conventions).

-- A training block: a named date range, optionally pointing at a goal race.
create table if not exists public.varsity_plan_blocks (
  id          text primary key,            -- client-generated id, e.g. 'blk-1717…'
  name        text not null,
  start_date  date not null,
  end_date    date not null,
  status      text not null default 'draft',   -- 'draft' | 'published'
  race_name   text,
  race_date   date,
  updated_at  timestamptz not null default now()
);

-- A session in one AM/PM slot. Keyed by day+period (matches sessionKey() in
-- lib/varsity/coachPlan.ts, e.g. '2026-5-22-AM'). Sessions are global to the
-- shared plan (not nested under a block) — same as the in-app model.
create table if not exists public.varsity_plan_sessions (
  day_key     text primary key,            -- '<year>-<monthIndex>-<day>-<AM|PM>'
  category    text not null,               -- 'water' | 'erg' | 'weights' | 'off' | 'flex'
  intensity   text,                        -- 'UT2' | 'UT1' | 'hard' (water/erg only)
  description text not null default '',
  time        text not null default '',
  note        text,
  updated_at  timestamptz not null default now()
);

alter table public.varsity_plan_blocks   enable row level security;
alter table public.varsity_plan_sessions enable row level security;

-- Single shared team for now: any signed-in user can read + write the plan.
-- (Tighten to a coach role + team scoping in a later slice.)
create policy "Varsity blocks readable by signed-in users"
  on public.varsity_plan_blocks for select
  using (auth.role() = 'authenticated');

create policy "Varsity blocks writable by signed-in users"
  on public.varsity_plan_blocks for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

create policy "Varsity sessions readable by signed-in users"
  on public.varsity_plan_sessions for select
  using (auth.role() = 'authenticated');

create policy "Varsity sessions writable by signed-in users"
  on public.varsity_plan_sessions for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
