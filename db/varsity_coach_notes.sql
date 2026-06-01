-- UNIsport — Varsity coach notes (one technical note per athlete)
-- ---------------------------------------------------------------------------
-- The coach writes a short technical note for an individual athlete; that
-- athlete sees it on their Home every time they open the app. One row per
-- athlete (keyed by their profiles.id). An athlete with NO row = "all clear"
-- (the app shows a green "Good job"); a row with text = something to work on
-- (the app shows a red "!").
--
-- Like the plan + lineups, this is ONE shared team for now: any signed-in user
-- can read and write. Run in the Supabase SQL editor.

create table if not exists public.varsity_coach_notes (
  athlete_id  uuid primary key references public.profiles (id) on delete cascade,
  note        text not null default '',
  updated_at  timestamptz not null default now()
);

alter table public.varsity_coach_notes enable row level security;

create policy "Coach notes readable by signed-in users"
  on public.varsity_coach_notes for select
  using (auth.role() = 'authenticated');

create policy "Coach notes writable by signed-in users"
  on public.varsity_coach_notes for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ---------------------------------------------------------------------------
-- get_team_roster(): the coach's Notes screen needs to LIST athletes by name,
-- but profiles has RLS (a user only sees their OWN row). So, like
-- get_public_profile(), this is a SECURITY DEFINER function returning only the
-- public id + display name of every onboarded account. IDEMPOTENT.
create or replace function public.get_team_roster()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, coalesce(p.data->>'name', 'Unnamed') as name
  from public.profiles p
  where p.onboarding_completed = true
  order by p.data->>'name';
$$;

grant execute on function public.get_team_roster() to authenticated;
