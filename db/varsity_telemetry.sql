-- UNIsport — Varsity BOAT TELEMETRY (Peach PowerLine / NK SpeedCoach outings)
-- ---------------------------------------------------------------------------
-- WHAT A ROW IS
--   One outing's telemetry, attached to one plan session: which crew, which
--   source, and its pieces — the piece list PowerLine shows on the left, each
--   with the boat's numbers and (when the source knows seats) every seat's
--   averages. Held as ONE JSON document per outing (lib/varsity/telemetry.ts,
--   TelemetryOuting), because it is written once by the coach's import and
--   read whole by the app; nothing queries inside it. Raw traces are NOT in
--   here — the import keeps the exported file in storage (file_path) and this
--   row holds only what PowerLine's "Average" panel already computed.
-- WHO WRITES IT
--   The coach, from the Coach Console, by attaching an export. Athletes read.
--   The plan is squad-wide today (varsity_plan_sessions has no team_id), so
--   these rows are readable by any signed-in user, like the results board;
--   the policy tightens with the plan when the plan becomes per-team.
-- Run in the Supabase SQL editor. Idempotent — safe to re-run.

create table if not exists public.varsity_telemetry (
  id           uuid primary key default gen_random_uuid(),
  -- Which session. Matches sessionKey() in lib/varsity/coachPlan.ts, e.g.
  -- '2026-4-15-AM'. The outing goes with the session if that is deleted.
  day_key      text not null references public.varsity_plan_sessions (day_key) on delete cascade,
  source       text not null,               -- 'peach' | 'speedcoach'
  crew         text not null default '',    -- '1V', '2V', 'the eight'
  box          text,                        -- the source's own ids, to find the file again
  session_no   text,
  file_path    text,                        -- the export kept in storage
  data         jsonb not null,              -- TelemetryOuting.pieces (see lib/varsity/telemetry.ts)
  imported_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists varsity_telemetry_day_key_idx on public.varsity_telemetry (day_key);

alter table public.varsity_telemetry enable row level security;

drop policy if exists "Telemetry readable by signed-in users" on public.varsity_telemetry;
create policy "Telemetry readable by signed-in users"
  on public.varsity_telemetry for select
  to authenticated
  using (true);

-- Writing is the importer's own row: whoever attached it can update or remove
-- it. (A coach role check comes with the per-team plan.)
drop policy if exists "Own telemetry insertable" on public.varsity_telemetry;
create policy "Own telemetry insertable"
  on public.varsity_telemetry for insert
  to authenticated
  with check (imported_by = auth.uid());

drop policy if exists "Own telemetry updatable" on public.varsity_telemetry;
create policy "Own telemetry updatable"
  on public.varsity_telemetry for update
  to authenticated
  using (imported_by = auth.uid());

drop policy if exists "Own telemetry deletable" on public.varsity_telemetry;
create policy "Own telemetry deletable"
  on public.varsity_telemetry for delete
  to authenticated
  using (imported_by = auth.uid());
