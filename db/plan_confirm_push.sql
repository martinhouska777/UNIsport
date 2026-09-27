-- ===========================================================================
-- "DID YOU TRAIN WITH ARJUN?" — the phone asks, after the session (owner,
-- 2026-09-27: Profile + a notification).
--
-- app/api/push/confirm sends it: for every accepted session that started
-- 90 minutes to 24 hours ago and has not been asked about yet, one push to
-- each person who has not answered, opening the Profile where the Yes /
-- No-show buttons wait (db/plans_to_confirm.sql). Each session is asked about
-- ONCE — confirm_reminded_at below — however often the job runs.
--
-- WHY THE DATABASE RUNS THE CLOCK. Vercel's free plan allows a cron once a
-- day (see app/api/push/remind), and "after your session" needs one every
-- few minutes. Supabase's pg_cron can, and pg_net lets it call the route.
--
-- The route is guarded by a token that lives ONLY in this database
-- (cron_tokens, RLS on, no policies): the job reads it when it fires and the
-- route checks it with the service-role key. Nothing secret is in the repo
-- or in Vercel.
--
-- PART 1 is plain bookkeeping. PART 2 switches the extensions on and
-- schedules the job — a standing change to the live database, applied only
-- with the owner's go-ahead.
-- ===========================================================================

-- ---------------------------------------------------------------- PART 1 --

alter table public.session_plans
  add column if not exists confirm_reminded_at timestamptz;

create table if not exists public.cron_tokens (
  name  text primary key,
  token text not null
);
alter table public.cron_tokens enable row level security;

insert into public.cron_tokens (name, token)
  values ('plan_confirm',
          replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', ''))
  on conflict (name) do nothing;

-- ---------------------------------------------------------------- PART 2 --
-- (owner's go-ahead first)
--
-- create extension if not exists pg_net;
-- create extension if not exists pg_cron;
--
-- select cron.schedule(
--   'plan-confirm-reminders',
--   '*/15 * * * *',
--   $job$
--     select net.http_get(
--       url     := 'https://getunisport.com/api/push/confirm',
--       headers := jsonb_build_object(
--         'authorization',
--         'Bearer ' || (select token from public.cron_tokens where name = 'plan_confirm')
--       )
--     );
--   $job$
-- );
--
-- To stop it:   select cron.unschedule('plan-confirm-reminders');
-- ===========================================================================
