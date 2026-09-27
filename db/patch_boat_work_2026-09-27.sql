-- UNIsport — a boat's figures: who may write them, and taking them back
-- (launch audit 2026-09-27, items 1, 2 and 29)
-- ---------------------------------------------------------------------------
-- THREE FAULTS IN ONE PLACE.
--
-- 1. THE COX COULD NOT SAVE. The cox's Save wrote the whole lineup row, and
--    since patch_varsity_coach_only_2026-09-20.sql only a coach may write
--    varsity_lineups — so the cox got a raw database error. Now the Save goes
--    through varsity_save_boat_work(): it changes ONE boat's distance and time
--    and nothing else, and only for a coach or somebody seated in that boat.
--
-- 2. ANYBODY COULD WRITE ANYBODY'S LOG. varsity_log_boats is SECURITY DEFINER
--    and was still executable by every signed-in account, so any of them could
--    call it with made-up boats and write into other rowers' logs. The trigger
--    is the only thing that needs it; the new version is revoked from every
--    client role, and the old two-argument one is dropped.
--
-- 3. NOTHING WAS EVER TAKEN BACK. The trigger only inserted and updated: a
--    rower moved out of a boat kept its km, clearing a boat's figures left
--    them on everyone, and every autosave of the lineup wrote the figures again
--    over a rower's own correction. Now the trigger compares the boats BEFORE
--    and AFTER the save:
--      • it writes a rower's log only when THEIR boat's figures changed (or
--        they were just seated in a boat that has figures);
--      • it takes the figures back from a rower no longer carried by a boat
--        with figures — but only while the row still says exactly what the
--        boat wrote. A rower who changed it since has made it their own, and
--        it is left alone;
--      • taking back restores what the rower had before the boat wrote over it
--        (boat_prev), or deletes the row if the boat created it and the rower
--        added nothing to it (no note, effort or split);
--      • deleting a whole lineup takes back everything it wrote.
--
-- Two new columns on varsity_logs remember what the boat did:
--   boat_id   — the boat whose figures this row carries (null: the rower's own)
--   boat_prev — what the row said before the boat wrote over it; null when the
--               boat created the row
--
-- Idempotent. UNDO: re-run db/varsity_lineups_log_boats.sql (restores the old
-- two-argument function and the insert/update trigger), then
--   drop function if exists public.varsity_log_boats(text, jsonb, jsonb);
--   drop function if exists public.varsity_save_boat_work(text, text, int, int);
--   drop function if exists public.varsity_boat_crews(jsonb);
--   alter table public.varsity_logs drop column if exists boat_id, drop column if exists boat_prev;

alter table public.varsity_logs add column if not exists boat_id   text;
alter table public.varsity_logs add column if not exists boat_prev jsonb;

-- ── Who a set of boats carries, and with which figures ──────────────────────
-- One row per ACCOUNT seated in a boat that has a distance or a time, cox
-- included. Roster seats are matched to accounts by the seat each athlete
-- claimed (profiles.data->'varsity'->>'rosterId'). Somebody seated twice by
-- mistake counts for the first boat only.
create or replace function public.varsity_boat_crews(p_boats jsonb)
returns table (athlete uuid, boat_id text, metres int, minutes int)
language sql
stable
set search_path = public
as $$
  with work as (
    select e.value as boat,
           e.ordinality as ord,
           nullif(e.value->>'metres', '')::numeric::int as metres,
           nullif(e.value->>'minutes', '')::numeric::int as minutes
      from jsonb_array_elements(coalesce(p_boats, '[]'::jsonb)) with ordinality e
  ),
  seated as (
    select w.ord, w.boat->>'id' as boat_id, w.metres, w.minutes, s.value->>'athleteId' as rid
      from work w, jsonb_array_elements(coalesce(w.boat->'seats', '[]'::jsonb)) s
     where w.metres is not null or w.minutes is not null
    union all
    select w.ord, w.boat->>'id', w.metres, w.minutes, w.boat->>'coxId'
      from work w
     where (w.metres is not null or w.minutes is not null)
       and (w.boat->>'hasCox')::boolean is true
  )
  select distinct on (p.id) p.id, s.boat_id, s.metres, s.minutes
    from seated s
    join public.profiles p on p.data->'varsity'->>'rosterId' = s.rid
   where nullif(s.rid, '') is not null
   order by p.id, s.ord;
$$;

-- ── Write, and take back, a practice's boat figures ─────────────────────────
create or replace function public.varsity_log_boats(p_day_key text, p_boats jsonb, p_old jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m         text[];
  d         date;
  per       text;
  the_title text;
  n         record;
  o         record;
  cur       public.varsity_logs%rowtype;
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

  -- 1. TAKE BACK: everyone the old boats carried and the new ones do not.
  for o in
    select oc.*
      from public.varsity_boat_crews(p_old) oc
      left join public.varsity_boat_crews(p_boats) nc on nc.athlete = oc.athlete
     where nc.athlete is null
  loop
    select * into cur from public.varsity_logs l
     where l.athlete_id = o.athlete and l.day_key = p_day_key;
    if not found then continue; end if;
    -- Not this boat's row (the rower's own, or another boat's): not ours to touch.
    if cur.boat_id is distinct from o.boat_id then continue; end if;
    -- The rower changed it since the boat wrote it: it is theirs now.
    if cur.minutes is distinct from o.minutes
       or cur.metres is distinct from o.metres
       or cur.category is distinct from 'water' then
      update public.varsity_logs set boat_id = null, boat_prev = null where id = cur.id;
      continue;
    end if;
    if cur.boat_prev is not null then
      update public.varsity_logs
         set minutes   = (cur.boat_prev->>'minutes')::int,
             metres    = (cur.boat_prev->>'metres')::int,
             category  = cur.boat_prev->>'category',
             title     = coalesce(cur.boat_prev->>'title', cur.title),
             boat_id   = null,
             boat_prev = null
       where id = cur.id;
    elsif coalesce(cur.note, '') = '' and cur.effort is null and nullif(cur.split, '') is null then
      delete from public.varsity_logs where id = cur.id;
    else
      update public.varsity_logs
         set minutes = null, metres = null, boat_id = null
       where id = cur.id;
    end if;
  end loop;

  -- 2. WRITE: everyone whose boat figures are new or different.
  for n in
    select nc.*
      from public.varsity_boat_crews(p_boats) nc
      left join public.varsity_boat_crews(p_old) oc on oc.athlete = nc.athlete
     where oc.athlete is null
        or oc.boat_id is distinct from nc.boat_id
        or oc.metres  is distinct from nc.metres
        or oc.minutes is distinct from nc.minutes
  loop
    select * into cur from public.varsity_logs l
     where l.athlete_id = n.athlete and l.day_key = p_day_key;
    if not found then
      insert into public.varsity_logs
        (athlete_id, log_date, period, day_key, source, title, category, minutes, metres, note, boat_id)
      values
        (n.athlete, d, per, p_day_key, 'plan', the_title, 'water', n.minutes, n.metres, '', n.boat_id)
      on conflict (athlete_id, day_key) do update
        set minutes  = excluded.minutes,
            metres   = excluded.metres,
            category = 'water',
            title    = excluded.title,
            boat_id  = excluded.boat_id;
    else
      update public.varsity_logs
         set minutes   = n.minutes,
             metres    = n.metres,
             category  = 'water',
             title     = the_title,
             log_date  = d,
             period    = per,
             boat_id   = n.boat_id,
             -- Remember the rower's own figures the first time a boat writes over them.
             boat_prev = case
                           when cur.boat_id is null then jsonb_build_object(
                             'minutes', cur.minutes, 'metres', cur.metres,
                             'category', cur.category, 'title', cur.title)
                           else cur.boat_prev
                         end
       where id = cur.id;
    end if;
  end loop;
end;
$$;

create or replace function public.varsity_lineups_log_boats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.varsity_log_boats(old.day_key, '[]'::jsonb, old.boats);
    return old;
  elsif tg_op = 'UPDATE' then
    perform public.varsity_log_boats(new.day_key, new.boats, old.boats);
  else
    perform public.varsity_log_boats(new.day_key, new.boats, null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_varsity_lineups_log_boats on public.varsity_lineups;
create trigger trg_varsity_lineups_log_boats
  after insert or update of boats or delete on public.varsity_lineups
  for each row execute function public.varsity_lineups_log_boats();

-- The old two-argument version (item 2) goes; nothing calls it any more.
drop function if exists public.varsity_log_boats(text, jsonb);

-- ── The cox's Save (item 1) ─────────────────────────────────────────────────
-- One boat's distance and time, and nothing else, for a coach or for somebody
-- seated in that boat. Re-reads the row under a lock, so seats edited since the
-- cox's screen loaded are kept. The status and the announced snapshot are
-- untouched: filling in a distance is not publishing. The update fires the
-- trigger above, which logs the figures for the whole crew.
create or replace function public.varsity_save_boat_work(
  p_day_key text,
  p_boat_id text,
  p_metres  int,
  p_minutes int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  the_boats jsonb;
  the_boat  jsonb;
  my_seat   text;
  allowed   boolean;
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;

  select l.boats into the_boats
    from public.varsity_lineups l
   where l.day_key = p_day_key
   for update;
  if not found then
    raise exception 'no such practice' using errcode = 'P0002';
  end if;

  select b.value into the_boat
    from jsonb_array_elements(coalesce(the_boats, '[]'::jsonb)) b
   where b.value->>'id' = p_boat_id;
  if the_boat is null then
    raise exception 'no such boat' using errcode = 'P0002';
  end if;

  allowed := public.varsity_is_coach();
  if not allowed and public.varsity_is_member() then
    select p.data->'varsity'->>'rosterId' into my_seat
      from public.profiles p
     where p.id = auth.uid();
    allowed := nullif(my_seat, '') is not null and (
      exists (
        select 1 from jsonb_array_elements(coalesce(the_boat->'seats', '[]'::jsonb)) s
         where s.value->>'athleteId' = my_seat
      )
      or ((the_boat->>'hasCox')::boolean is true and the_boat->>'coxId' = my_seat)
    );
  end if;
  if not allowed then
    raise exception 'not in this boat' using errcode = '42501';
  end if;

  update public.varsity_lineups l
     set boats = (
           select jsonb_agg(
                    case when b.value->>'id' = p_boat_id
                         then b.value || jsonb_build_object('metres', p_metres, 'minutes', p_minutes)
                         else b.value
                    end
                    order by b.ordinality)
             from jsonb_array_elements(the_boats) with ordinality b
         ),
         updated_at = now()
   where l.day_key = p_day_key;
end;
$$;

-- ── Who may run what ────────────────────────────────────────────────────────
revoke execute on function public.varsity_boat_crews(jsonb)                   from public, anon, authenticated;
revoke execute on function public.varsity_log_boats(text, jsonb, jsonb)       from public, anon, authenticated;
revoke execute on function public.varsity_lineups_log_boats()                 from public, anon, authenticated;
revoke execute on function public.varsity_save_boat_work(text, text, int, int) from public, anon;
grant  execute on function public.varsity_save_boat_work(text, text, int, int) to authenticated;

-- ── ONCE: mark the rows today's boats already wrote ─────────────────────────
-- So they can be taken back later. A row counts as the boat's when it is a
-- water row carrying exactly that boat's figures for a rower seated in it.
update public.varsity_logs l
   set boat_id = c.boat_id
  from public.varsity_lineups v
 cross join lateral public.varsity_boat_crews(v.boats) c
 where l.day_key = v.day_key
   and l.athlete_id = c.athlete
   and l.boat_id is null
   and l.category = 'water'
   and l.minutes is not distinct from c.minutes
   and l.metres  is not distinct from c.metres;
