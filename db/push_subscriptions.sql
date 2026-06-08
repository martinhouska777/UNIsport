-- ============================================================================
-- UNIsport — Web Push subscriptions
-- ----------------------------------------------------------------------------
-- One row per browser/device a user has enabled notifications on. The browser's
-- PushManager gives us an endpoint URL + two keys (p256dh, auth); the server
-- uses these to deliver a Web Push notification even when the app is closed.
--
-- A single user can have many rows (phone, laptop, …). `endpoint` is unique so
-- re-subscribing the same browser updates rather than duplicates.
--
-- PRIVATE per-user: Row-Level Security restricts every row to its owner
-- (auth.uid() = user_id) — same pattern as db/workout_logs.sql.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

create extension if not exists "pgcrypto";

create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  endpoint   text not null unique,                 -- the push service URL for this browser
  p256dh     text not null,                        -- client public key (payload encryption)
  auth       text not null,                        -- client auth secret (payload encryption)
  user_agent text,                                 -- which device/browser, for display later
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- Lock to the owner only.
alter table public.push_subscriptions enable row level security;

-- Policies are created with guards so re-running the script doesn't error.
do $$
begin
  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions'
      and policyname = 'Own push subscriptions readable') then
    create policy "Own push subscriptions readable"
      on public.push_subscriptions for select using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions'
      and policyname = 'Own push subscriptions insertable') then
    create policy "Own push subscriptions insertable"
      on public.push_subscriptions for insert with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions'
      and policyname = 'Own push subscriptions updatable') then
    create policy "Own push subscriptions updatable"
      on public.push_subscriptions for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies
    where schemaname = 'public' and tablename = 'push_subscriptions'
      and policyname = 'Own push subscriptions deletable') then
    create policy "Own push subscriptions deletable"
      on public.push_subscriptions for delete using (auth.uid() = user_id);
  end if;
end $$;
