-- UNIsport — profiles table (Slice C)
-- One row per user, created when they finish onboarding. The whole onboarding
-- answer object is stored as JSON for now (we can normalise into columns later
-- for matching). Row-Level Security ensures users only touch their own row.

create table if not exists public.profiles (
  id                   uuid primary key references auth.users (id) on delete cascade,
  data                 jsonb not null default '{}'::jsonb,
  onboarding_completed boolean not null default false,
  updated_at           timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by their owner"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
