-- UNIsport — Varsity availability (who is OUT, and for how long)
-- ---------------------------------------------------------------------------
-- The coach marks a rower out from the Lineup pool. Availability is a fact
-- about DAYS, not about a person: one row is one spell out, from a date until
-- a date (or open-ended, until the coach brings them back in). The pool for a
-- practice reads every spell that covers that practice's day.
--
--   SICK  — usually a day or two; the pool offers "out today".
--   INJ   — usually weeks; the pool offers "out until you bring them back",
--           which is an open-ended row (until_date null).
--
-- Bringing someone back in closes the spell the day before, so the history of
-- who missed what stays true. athlete_id is the roster id used by the lineups'
-- boats JSON (lib/varsity/coachLineup.ts), so the two always agree on who a
-- person is.
--
-- Like the lineups, this is ONE shared team for now: any signed-in user can
-- read and write. Run in the Supabase SQL editor.

create table if not exists public.varsity_availability (
  id          uuid primary key default gen_random_uuid(),
  athlete_id  text not null,
  reason      text not null check (reason in ('INJ', 'SICK')),
  from_date   date not null,
  until_date  date,                        -- null = until brought back in
  updated_at  timestamptz not null default now()
);

create index if not exists varsity_availability_athlete_idx
  on public.varsity_availability (athlete_id, from_date);

alter table public.varsity_availability enable row level security;

create policy "Varsity availability readable by signed-in users"
  on public.varsity_availability for select
  using (auth.role() = 'authenticated');

create policy "Varsity availability writable by signed-in users"
  on public.varsity_availability for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
