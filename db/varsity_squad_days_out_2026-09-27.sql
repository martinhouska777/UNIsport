-- ---------------------------------------------------------------------------
-- A ROWER'S OWN "SICK / INJURED / AWAY" REACHES THEIR COACH        2026-09-27
-- ---------------------------------------------------------------------------
-- NOT APPLIED YET. Idempotent — safe to run more than once.
--
-- WHY. An athlete marks themselves out on their own profile: the status switch
-- (Sick / Injured / Away) and the calendar's Missed button both write
-- profiles.data.varsity.daysOut, and the status itself sits beside it
-- (data.varsity.status + statusSince). The coach's Lineup builder only ever
-- read varsity_availability — the coach's own list — and profiles are behind
-- row-level security, so a rower who said they were sick could still be seated,
-- and "Repeat Tue AM" copied them straight back into the boat (audit item 30).
--
-- WHAT IT ADDS. One read-only function for the Lineup builder:
--
--   varsity_squad_days_out(p_from date, p_to date)
--     → user_id, roster_id, name, day, reason, ongoing
--
--   • a row per day an athlete marked out between p_from and p_to
--     (ongoing = false, day = that ISO date, reason = sick|injured|away|other);
--   • a row per athlete whose status is still Sick / Injured / Away
--     (ongoing = true, day = the day it was picked, or null if unknown;
--     reason = sick|injured|away) — out from that day until they switch back.
--
-- WHO MAY CALL IT. Only an APPROVED COACH, and only about the approved members
-- of their own team(s). Anyone else gets no rows — not an error, nothing. It is
-- SECURITY DEFINER because profiles are row-level-locked to their owner; it
-- hands back the reason and the day and NOTHING ELSE from the profile — never
-- the note the athlete typed, their check-ins, PRs or any student-side field.
-- `roster_id` is the seat the athlete claimed (data.varsity.rosterId) and
-- `name` is what the builder falls back to matching when they never claimed
-- one — the same pair lib/varsity/lineupStore.ts uses to find "your seat".
--
-- The app works without it: until this is applied the builder's Unavailable
-- list shows the coach's own list only, exactly as before.
--
-- UNDO:
--   drop function if exists public.varsity_squad_days_out(date, date);
-- ---------------------------------------------------------------------------

create or replace function public.varsity_squad_days_out(p_from date, p_to date)
returns table (
  user_id   uuid,
  roster_id text,
  name      text,
  day       text,     -- ISO yyyy-mm-dd, or null for a status with no start day
  reason    text,     -- sick | injured | away | other
  ongoing   boolean   -- true: the athlete's current status, out from `day` on
)
language sql stable security definer set search_path = public as $$
  -- Every approved member of the coach's team, whatever their role: a coach
  -- who also rows (and has claimed a seat) is in the pool like anyone else.
  with squad as (
    select distinct p.id, p.data
    from public.varsity_members coach
    join public.varsity_members athlete
      on athlete.team_id = coach.team_id
     and athlete.status  = 'approved'
    join public.profiles p on p.id = athlete.user_id
    where coach.user_id = auth.uid()
      and coach.role    = 'coach'
      and coach.status  = 'approved'
  )
  -- The days they marked. Compared as TEXT on purpose: ISO dates sort as text,
  -- and a key that is not a real date must never be cast (one bad key in one
  -- profile would otherwise fail the whole squad's read).
  select s.id,
         nullif(s.data -> 'varsity' ->> 'rosterId', ''),
         coalesce(s.data ->> 'name', ''),
         d.key,
         d.value ->> 'reason',
         false
  from squad s
  cross join lateral jsonb_each(
    case when jsonb_typeof(s.data -> 'varsity' -> 'daysOut') = 'object'
         then s.data -> 'varsity' -> 'daysOut'
         else '{}'::jsonb end
  ) d
  where d.key ~ '^\d{4}-\d{2}-\d{2}$'
    and d.key between to_char(p_from, 'YYYY-MM-DD') and to_char(p_to, 'YYYY-MM-DD')
    and jsonb_typeof(d.value) = 'object'
    and d.value ->> 'reason' in ('sick', 'injured', 'away', 'other')

  union all

  -- The status they are in right now, if it is an "out" one.
  select s.id,
         nullif(s.data -> 'varsity' ->> 'rosterId', ''),
         coalesce(s.data ->> 'name', ''),
         case when (s.data -> 'varsity' ->> 'statusSince') ~ '^\d{4}-\d{2}-\d{2}$'
              then s.data -> 'varsity' ->> 'statusSince' end,
         lower(s.data -> 'varsity' ->> 'status'),
         true
  from squad s
  where s.data -> 'varsity' ->> 'status' in ('Sick', 'Injured', 'Away');
$$;

revoke execute on function public.varsity_squad_days_out(date, date) from public, anon;
grant  execute on function public.varsity_squad_days_out(date, date) to authenticated;

-- ---------------------------------------------------------------------------
-- CHECK AFTERWARDS
--   Signed in as the coach, Coach → Lineup → any practice: a rower who marked
--   themselves Sick that day is under Unavailable ("Sick"), is not offered for
--   a seat, and "Repeat …" leaves their seat empty.
--   As an athlete (or signed out) the call returns no rows / 401.
-- ---------------------------------------------------------------------------
