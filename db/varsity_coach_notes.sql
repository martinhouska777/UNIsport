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

-- YOUR OWN NOTE, OR THE COACH'S VIEW OF EVERYONE (2026-09-20). This was
-- readable and writable by anybody with an account: every athlete could read
-- what the coach had written about every teammate, and could write a note that
-- looked like it came from the coach.
create policy "Your own note, or the coach's view of everyone"
  on public.varsity_coach_notes for select
  using (athlete_id = auth.uid() or public.varsity_is_coach());
create policy "Notes written by the coach"
  on public.varsity_coach_notes for insert with check (public.varsity_is_coach());
create policy "Notes updated by the coach"
  on public.varsity_coach_notes for update using (public.varsity_is_coach())
  with check (public.varsity_is_coach());
create policy "Notes deleted by the coach"
  on public.varsity_coach_notes for delete using (public.varsity_is_coach());

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
