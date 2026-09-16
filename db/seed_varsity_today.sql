-- SCREENSHOT PREP (owner, 2026-09-16): today's plan on Varsity Home reads
-- Water UT1 in the morning and Water UT2 "14k" in the afternoon (it was a
-- weights session). The morning was already Water UT1. Day keys use the month
-- INDEX (September = 8).
update public.varsity_plan_sessions
   set category = 'water', intensity = 'UT2', description = '14k', updated_at = now()
 where day_key = '2026-8-16-PM';

update public.varsity_plan_sessions
   set category = 'water', intensity = 'UT1', updated_at = now()
 where day_key = '2026-8-16-AM';

-- (later the same day) the afternoon reads "14k UT2", and it gets the same
-- boats as the morning — docking at 4:45 — so its card has YOUR BOAT too.
update public.varsity_plan_sessions
   set description = '14k UT2', updated_at = now()
 where day_key = '2026-8-16-PM';

insert into public.varsity_lineups (day_key, boats, status, updated_at)
select '2026-8-16-PM',
       (select jsonb_agg(
                 jsonb_set(jsonb_set(b, '{dock}', '"4:45pm"'), '{note}', '"Steady state — long, relaxed strokes, hold r20."')
                 || jsonb_build_object('id', (b->>'id') || '-pm'))
          from jsonb_array_elements(boats) b),
       status, now()
  from public.varsity_lineups where day_key = '2026-8-16-AM'
on conflict (day_key) do update set boats = excluded.boats, status = excluded.status, updated_at = now();
