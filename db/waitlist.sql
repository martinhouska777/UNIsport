-- ============================================================================
-- UNIsport — the waitlist
-- ----------------------------------------------------------------------------
-- One row per person who asked to be let in before the app opens at their
-- school. Filled by /waitlist (app/api/waitlist), which is where the Instagram
-- bio link points.
--
-- WHY IT EXISTS: the app works today, but opening it to one person at a time
-- means each of them arrives to an empty campus. Holding people on a list and
-- letting them all in at once is the whole point — the first person in should
-- find other people already there.
--
-- WHO MAY WRITE: anyone, signed in or not. That is deliberate and unusual for
-- this database — every other table is locked to its owner. The risk is junk
-- rows, not leaked data, and `email` is unique so the same address cannot pile
-- up. Bad addresses get filtered when the invitations go out.
--
-- WHO MAY READ: NOBODY through the API. There is no select policy, so neither
-- the browser key nor a signed-in user can list other people's email addresses.
-- Read it in the Supabase table editor (which uses the service role), or with
-- psql and DATABASE_URL.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,   -- trimmed and lower-cased before it gets here
  first_name text,                   -- what the "you're in" email will say hello to
  school     text,                   -- read off the email domain; null = not a school we know
  source     text,                   -- 'ig', 'ig-story', … — which link they came through
  created_at timestamptz not null default now()
);

-- The list is worked through oldest first, so that is the index.
create index if not exists waitlist_created_idx
  on public.waitlist (created_at);

alter table public.waitlist enable row level security;

-- Policies are created with guards so re-running the script doesn't error.
do $$
begin
  -- INSERT only, and only ever a row for yourself-as-a-stranger. No select,
  -- update or delete policy exists, so the list can only be added to.
  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'waitlist'
      and policyname = 'Anyone may join the waitlist') then
    create policy "Anyone may join the waitlist"
      on public.waitlist for insert to anon, authenticated with check (true);
  end if;
end $$;
