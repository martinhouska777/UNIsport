-- ============================================================================
-- UNIsport — The League: XP, levels and challenge counters
-- ----------------------------------------------------------------------------
-- WHAT THIS IS FOR
--   db/leaderboards.sql already ranks people by SESSIONS, and resets every
--   month. This file is the other half: the permanent ladder. It returns the
--   raw COUNTERS a person's challenges are measured against, all-time, for
--   themselves and for everyone on the board.
--
-- THE SPLIT THAT MATTERS
--   This file COUNTS. It does not know what anything is WORTH. What a session
--   earns, what a partner multiplies it by, what each challenge pays and where
--   the level boundaries fall all live in lib/xp.ts and lib/challenges.ts, as
--   data. Changing the new-partner multiplier is then one line in a TypeScript
--   file and needs no migration — which is the whole reason the rules are not
--   in here.
--
--   The one exception is the three rates passed IN as arguments, used purely to
--   ORDER the board before it is cut to a limit. The caller supplies them from
--   lib/xp.ts, so there is still exactly one source of truth.
--
-- PRIVACY — the same contract as db/leaderboards.sql
--   workout_logs is private (RLS: you read only your own rows). This is
--   SECURITY DEFINER so it can count everybody, and it hands back a name,
--   initials, house, class year and a handful of TOTALS. Never a workout, an
--   exercise, a note, a photo or a date. Nobody can read a board backwards into
--   what somebody actually did.
--
-- ALL TIME, ALWAYS. Levels never reset — that is the point of them. There is no
--   period argument here on purpose.
--
-- DEPENDS ON db/leaderboards.sql for initials_of(). Run that one first.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Every counter a challenge can be measured against, for one person or for all.
--
-- HOW A SESSION IS TAGGED
--   kind 0 = trained alone
--   kind 1 = trained with someone already trained with before
--   kind 2 = trained with someone for the FIRST time  (the 2.5x one)
--
-- THE CAP
--   A single day counts at most TWICE, and when a day holds more than two
--   sessions the most valuable two are kept. Without it the board is won by
--   whoever taps "Log Session" the most times in an evening, and a board that
--   can be farmed stops meaning anything the week people notice.
--
-- Session counts use the capped set. The variety counters (different partners,
-- different gyms, kilometres) deliberately use every log: the cap is there to
-- stop XP being farmed, and "trained at every gym on campus" is not something a
-- busy Tuesday should be able to hide.
-- ---------------------------------------------------------------------------
create or replace function public.league_counters(
  limit_n    int default 200,
  xp_solo    int default 10,   -- from lib/xp.ts, used for ORDERING only
  xp_partner int default 15,
  xp_new     int default 25,
  only_me    boolean default false
)
returns table (
  user_id      uuid,
  name         text,
  initials     text,
  residence    text,
  class_year   text,
  solo         int,
  partner      int,
  new_partner  int,
  partners     int,
  new_partners int,
  gyms         int,
  weeks3       int,
  km           numeric,
  is_me        boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with
  -- Each log, tagged with its kind. The window function has to happen here so
  -- the day cap below can rank on its result.
  tagged as (
    select
      w.user_id,
      w.log_date,
      w.id,
      case
        when w.partner_id is null then 0
        when row_number() over (
               partition by w.user_id, w.partner_id
               order by w.log_date, w.id
             ) = 1 then 2
        else 1
      end as kind
    from public.workout_logs w
  ),
  capped as (
    select t.user_id, t.log_date, t.kind
    from (
      select
        t2.*,
        row_number() over (
          partition by t2.user_id, t2.log_date
          order by t2.kind desc, t2.id
        ) as rn_day
      from tagged t2
    ) t
    where t.rn_day <= 2
  ),
  sess as (
    select
      c.user_id,
      count(*) filter (where c.kind = 0)::int as solo,
      count(*) filter (where c.kind = 1)::int as partner,
      count(*) filter (where c.kind = 2)::int as new_partner
    from capped c
    group by 1
  ),
  -- Weeks holding three or more sessions — the consistency challenges.
  wk as (
    select g.user_id, count(*)::int as n
    from (
      select cs.user_id, date_trunc('week', cs.log_date) as week, count(*) as in_week
      from capped cs
      group by 1, 2
    ) g
    where g.in_week >= 3
    group by 1
  ),
  -- Different real people trained with. A typed-in name is not a person.
  ppl as (
    select l.user_id, count(distinct l.partner_id)::int as partners
    from public.workout_logs l
    where l.partner_id is not null
    group by 1
  ),
  gy as (
    select l.user_id, count(distinct btrim(l.gym))::int as gyms
    from public.workout_logs l
    where coalesce(btrim(l.gym), '') <> ''
    group by 1
  ),
  -- Distance, normalised to kilometres. Anything that is not a plain number is
  -- read as zero rather than throwing — the field is free text on a phone.
  dist as (
    select
      l.user_id,
      round(coalesce(sum(
        case lower(coalesce(l.metrics->>'unit', 'km'))
          when 'mi' then d.v * 1.609344
          when 'm'  then d.v / 1000.0
          else d.v
        end
      ), 0), 1) as km
    from public.workout_logs l
    cross join lateral (
      select case
               when l.metrics->>'distance' ~ '^[0-9]+(\.[0-9]+)?$'
                 then (l.metrics->>'distance')::numeric
               else 0
             end as v
    ) d
    group by 1
  )
  select
    p.id,
    coalesce(nullif(p.data->>'name', ''), 'Member'),
    public.initials_of(coalesce(nullif(p.data->>'name', ''), 'Member')),
    p.data->>'residence',
    p.data->>'classYear',
    coalesce(s.solo, 0),
    coalesce(s.partner, 0),
    coalesce(s.new_partner, 0),
    coalesce(pp.partners, 0),
    -- Over all time, everyone you have trained with was new once, so "people
    -- met" is the same set as "different partners". It is a separate column
    -- because a future month-scoped view of this will need the two apart.
    coalesce(pp.partners, 0),
    coalesce(g.gyms, 0),
    coalesce(wk.n, 0),
    coalesce(d.km, 0),
    p.id = auth.uid()
  from public.profiles p
  left join sess s on s.user_id = p.id
  left join wk     on wk.user_id = p.id
  left join ppl pp on pp.user_id = p.id
  left join gy g   on g.user_id = p.id
  left join dist d on d.user_id = p.id
  where p.onboarding_completed
    and (not only_me or p.id = auth.uid())
    -- A board is the people who turned up. Your own row comes back either way,
    -- so the screen can say "you are not on it yet" rather than saying nothing.
    and (
      only_me
      or p.id = auth.uid()
      or coalesce(s.solo, 0) + coalesce(s.partner, 0) + coalesce(s.new_partner, 0) > 0
    )
  order by
    coalesce(s.solo, 0) * greatest(xp_solo, 0)
    + coalesce(s.partner, 0) * greatest(xp_partner, 0)
    + coalesce(s.new_partner, 0) * greatest(xp_new, 0) desc,
    coalesce(nullif(p.data->>'name', ''), 'Member')
  limit greatest(coalesce(limit_n, 200), 1);
$$;

grant execute on function public.league_counters(int, int, int, int, boolean) to authenticated;
