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

-- THE SQUAD READS, THE COACH WRITES (2026-09-20). This used to be "any signed
-- in user can read and write", which meant an athlete could rewrite tomorrow's
-- session straight against the database, and every ordinary student with an
-- account could read the squad's training. Helpers in db/varsity_teams.sql.
-- Live databases: db/patch_varsity_coach_only_2026-09-20.sql.
create policy "Plan blocks readable by the squad"
  on public.varsity_plan_blocks for select using (public.varsity_is_member());
create policy "Plan blocks written by the coach"
  on public.varsity_plan_blocks for insert with check (public.varsity_is_coach());
create policy "Plan blocks updated by the coach"
  on public.varsity_plan_blocks for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Plan blocks deleted by the coach"
  on public.varsity_plan_blocks for delete using (public.varsity_is_coach());

create policy "Plan sessions readable by the squad"
  on public.varsity_plan_sessions for select using (public.varsity_is_member());
create policy "Plan sessions written by the coach"
  on public.varsity_plan_sessions for insert with check (public.varsity_is_coach());
create policy "Plan sessions updated by the coach"
  on public.varsity_plan_sessions for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Plan sessions deleted by the coach"
  on public.varsity_plan_sessions for delete using (public.varsity_is_coach());

-- WHERE TO BE (added later): an optional place on a session — "Weld", "Newell
-- erg room", "meet at the vans". Free text; the session's time says when.
-- Run this on an existing database; a session is only saved with a location
-- once the column exists.
alter table public.varsity_plan_sessions add column if not exists location text;
