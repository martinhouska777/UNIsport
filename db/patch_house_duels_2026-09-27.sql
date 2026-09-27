-- UNIsport — house vs house that holds still (launch audit 2026-09-27, item 20)
-- ---------------------------------------------------------------------------
-- THREE THINGS MOVED UNDER THE STUDENTS.
--
-- 1. THE OPPONENT. The draw was re-dealt on every phone from whichever houses
--    were in at that moment, so each time another house got in, every pairing
--    could change. Now the database remembers WHEN each house got in this month
--    (house_duel_entries.entered_at) and the app pairs houses in that order —
--    the first two in fight each other, the next two, and so on. A pairing, once
--    made, never changes; a house that gets in later takes on whoever is
--    waiting. Houses that are not in are still not drawn (the owner's rule).
--
-- 2. THE RESULT. "First to the line wins" was judged on today's numbers, so a
--    duel shown as won on the 20th could flip on the 25th when the other house
--    overtook it. Now the moment a house is seen over the line is written down
--    (crossed_at), and the earlier crossing wins for good.
--
-- 3. THE MONTH. Every board counted the month in UTC, so at 8 pm on the last
--    evening of the month (Boston time) the whole Events tab and the monthly
--    boards jumped to the next month. leaderboard_since now counts in campus
--    time; the app does the same (lib/events.ts).
--
-- Who writes: house_duel_settle(), called by the Events tab each time it opens.
-- It works the numbers out HERE, with the same functions the tab reads —
-- nothing a phone sends can put a house over the line. Mirrors lib/duels.ts
-- (the four disciplines, their order and targets) and lib/events.ts
-- INTERHOUSE (30 points, 10 people, top 10 counted): change one, change both.
--
-- Every school on the app is on US Eastern time (lib/themes.ts
-- DEFAULT_TIMEZONE); a campus elsewhere would need this to take its zone.
--
-- Idempotent. UNDO:
--   drop function if exists public.house_duel_settle(text[]);
--   drop table if exists public.house_duel_entries;
--   and re-run the leaderboard_since block of db/leaderboards.sql.

-- ── The month, in campus time ───────────────────────────────────────────────
create or replace function public.campus_today()
returns date
language sql
stable
as $$
  select (now() at time zone 'America/New_York')::date;
$$;

create or replace function public.leaderboard_since(period text)
returns date
language sql
stable
as $$
  select case lower(coalesce(period, 'month'))
           when 'all' then '1900-01-01'::date
           when 'semester' then
             case
               -- On or after 2 Sep: the fall term that started this year.
               when public.campus_today() >= make_date(extract(year from public.campus_today())::int, 9, 2)
                 then make_date(extract(year from public.campus_today())::int, 9, 2)
               -- On or before 17 Jan: still the fall term, which began last year.
               when public.campus_today() <= make_date(extract(year from public.campus_today())::int, 1, 17)
                 then make_date(extract(year from public.campus_today())::int - 1, 9, 2)
               -- Everything between: the spring term.
               else make_date(extract(year from public.campus_today())::int, 1, 18)
             end
           else (date_trunc('month', public.campus_today()))::date
         end;
$$;

-- ── What the month's duels have seen ────────────────────────────────────────
create table if not exists public.house_duel_entries (
  month_start date        not null,
  house       text        not null,
  entered_at  timestamptz not null default now(),
  crossed_at  timestamptz,
  primary key (month_start, house)
);

alter table public.house_duel_entries enable row level security;

drop policy if exists "Duel entries readable" on public.house_duel_entries;
create policy "Duel entries readable" on public.house_duel_entries
  for select to authenticated using (true);
-- No write policies: only house_duel_settle() writes.

create or replace function public.house_duel_settle(p_keys text[])
returns table (house text, entered_at timestamptz, crossed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  today   date := public.campus_today();
  m_start date := date_trunc('month', today)::date;
  n       int  := extract(year from today)::int * 12 + extract(month from today)::int - 1;
  metric  text;
  target  numeric;
  in_keys text[];
  in_vals numeric[];
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  -- lib/duels.ts DUEL_DISCIPLINES, in its order.
  metric := (array['points', 'distance', 'newPeople', 'sessions'])[(n % 4) + 1];
  target := (array[600, 200, 25, 150])[(n % 4) + 1];

  with ppl as (
    select lp.residence, lp.score
      from public.leaderboard_people('campus', 'month', 100000) lp
     where lp.residence = any (p_keys) and lp.score >= 30
  ),
  ranked as (
    select ppl.residence, ppl.score,
           row_number() over (partition by ppl.residence order by ppl.score desc) as rn
      from ppl
  ),
  standing as (
    select r.residence as key,
           count(*) as qualified,
           coalesce(sum(r.score) filter (where r.rn <= 10), 0) as points
      from ranked r
     group by r.residence
  ),
  counts as (
    select c.key,
           round(coalesce(c.distance_km, 0) * 10) / 10 as distance,
           coalesce(c.new_partners, 0) as new_people,
           coalesce(c.gym_sessions, 0) + coalesce(c.cardio_sessions, 0) as sessions
      from public.event_house_counters(m_start, p_keys) c
  ),
  racing as (
    select s.key,
           case metric
             when 'points'    then s.points
             when 'distance'  then coalesce(k.distance, 0)
             when 'newPeople' then coalesce(k.new_people, 0)
             else coalesce(k.sessions, 0)
           end as value
      from standing s
      left join counts k on k.key = s.key
     where s.qualified >= 10
  )
  select coalesce(array_agg(r.key), '{}'), coalesce(array_agg(r.value::numeric), '{}')
    into in_keys, in_vals
    from racing r;

  -- In: the first time a house is seen in the race this month.
  insert into public.house_duel_entries (month_start, house)
  select m_start, k from unnest(in_keys) k
  on conflict on constraint house_duel_entries_pkey do nothing;

  -- Across: the first time it is seen over the line. Never moved again.
  update public.house_duel_entries e
     set crossed_at = now()
    from unnest(in_keys, in_vals) as r(key, value)
   where e.month_start = m_start
     and e.house = r.key
     and e.crossed_at is null
     and r.value >= target;

  return query
    select e.house, e.entered_at, e.crossed_at
      from public.house_duel_entries e
     where e.month_start = m_start
     order by e.entered_at, e.house;
end;
$$;

revoke execute on function public.house_duel_settle(text[]) from public, anon;
grant  execute on function public.house_duel_settle(text[]) to authenticated;
revoke execute on function public.campus_today() from public, anon;
grant  execute on function public.campus_today() to authenticated;
