-- UNIsport — a boat's figures become every seat's log (owner, 2026-09-21)
-- ---------------------------------------------------------------------------
-- "One person can write it there and log it to the lineup, and it logs it to
-- their workouts automatically." When a boat on a lineup carries a distance
-- or a time (Boat.metres / Boat.minutes, written by the cox — the stroke if
-- there is no cox — or by the coach in the builder), this writes a log row
-- for EVERY person seated in that boat, cox included, into varsity_logs: the
-- same table their own Log Session writes, so it lands in their calendar and
-- their statistics with nothing to type.
--
-- The rules the owner set:
--   • it REPLACES the rower's own entry for that session (same athlete, same
--     day_key): the boat's distance and time win; their note, effort and split
--     are left as they were
--   • a later correction by the coach updates everyone again (the trigger runs
--     on every save of the lineup)
--
-- WHO IS "EVERYONE": the roster seats (lib/varsity/coachLineup.ts ids like
-- 'cate-frerichs') are matched to accounts by the seat each athlete CLAIMED on
-- their profile (profiles.data->'varsity'->>'rosterId', claimRosterSeat in
-- lib/varsity/athleteProfile.ts). An athlete who has not claimed a seat gets
-- no row — there is nothing to attach it to — and gets one the moment they do
-- and a lineup is saved again.
--
-- SECURITY DEFINER because varsity_logs is private to its owner (RLS: auth.uid()
-- = athlete_id); the cox saving the boat must be able to write their crew's
-- rows, which their own session never could. Applied 2026-09-21 by Claude.

create or replace function public.varsity_log_boats(p_day_key text, p_boats jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m         text[];
  d         date;
  per       text;
  boat      jsonb;
  seat_id   text;
  seat_ids  text[];
  who       uuid;
  metres    int;
  minutes   int;
  the_title text;
begin
  -- '2026-8-21-PM' → 2026-09-21, 'PM' (the key's month is zero-based)
  m := regexp_match(p_day_key, '^(\d{4})-(\d{1,2})-(\d{1,2})-(AM|PM)$');
  if m is null then return; end if;
  d := make_date(m[1]::int, m[2]::int + 1, m[3]::int);
  per := m[4];

  -- The plan's words for the session, or plain "Water".
  select coalesce(nullif(trim(s.description), ''), 'Water')
    into the_title
    from public.varsity_plan_sessions s
   where s.day_key = p_day_key;
  if the_title is null then the_title := 'Water'; end if;

  for boat in select * from jsonb_array_elements(coalesce(p_boats, '[]'::jsonb)) loop
    metres  := nullif(boat->>'metres', '')::numeric::int;
    minutes := nullif(boat->>'minutes', '')::numeric::int;
    -- A boat with nothing written on it is "nobody has said yet", not a zero.
    if metres is null and minutes is null then continue; end if;

    -- Every seat, and the cox when the boat carries one.
    select coalesce(array_agg(s->>'athleteId') filter (where nullif(s->>'athleteId', '') is not null), '{}')
      into seat_ids
      from jsonb_array_elements(coalesce(boat->'seats', '[]'::jsonb)) s;
    if (boat->>'hasCox')::boolean is true and nullif(boat->>'coxId', '') is not null then
      seat_ids := seat_ids || (boat->>'coxId');
    end if;

    foreach seat_id in array seat_ids loop
      for who in
        select p.id from public.profiles p
         where p.data->'varsity'->>'rosterId' = seat_id
      loop
        insert into public.varsity_logs
          (athlete_id, log_date, period, day_key, source, title, category, minutes, metres, note)
        values
          (who, d, per, p_day_key, 'plan', the_title, 'water', minutes, metres, '')
        on conflict (athlete_id, day_key) do update
          set minutes  = excluded.minutes,
              metres   = excluded.metres,
              category = 'water',
              title    = excluded.title,
              log_date = excluded.log_date,
              period   = excluded.period;
      end loop;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.varsity_log_boats(text, jsonb) from public, anon;

create or replace function public.varsity_lineups_log_boats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.varsity_log_boats(new.day_key, new.boats);
  return new;
end;
$$;

drop trigger if exists trg_varsity_lineups_log_boats on public.varsity_lineups;
create trigger trg_varsity_lineups_log_boats
  after insert or update of boats on public.varsity_lineups
  for each row execute function public.varsity_lineups_log_boats();

-- ONCE, for the boats already written down: every lineup that exists today.
select public.varsity_log_boats(l.day_key, l.boats) from public.varsity_lineups l;
