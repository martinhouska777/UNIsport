-- ============================================================================
-- UNIsport — "Train today? Log it" — one reminder a day, at your usual time
-- ----------------------------------------------------------------------------
-- The log reminder (app/api/push/remind, run hourly by a cron) pushes each
-- person ONCE, at the hour their own training schedule says they train, and
-- only if they haven't logged that day. This table is the "once": a row per
-- person per day, written when a reminder goes out, so two usual slots on one
-- day (or a cron that runs twice) never mean two pings.
--
-- Written only by the server's service-role client — RLS is on with NO
-- policies, so nothing in the browser can read or write it.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create table if not exists public.log_reminders (
  user_id  uuid not null references public.profiles (id) on delete cascade,
  sent_on  date not null,                        -- the campus-local date it was for
  sent_at  timestamptz not null default now(),
  primary key (user_id, sent_on)
);

alter table public.log_reminders enable row level security;
