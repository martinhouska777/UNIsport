-- SCREENSHOT PREP (2026-09-16): the demo account (martinhouska701, "John Brown")
-- gets a Push / Pull / Legs week on the Profile calendar — Monday Push, Tuesday
-- Pull, Wednesday Legs — and three personal records: Bench Press 100 kg,
-- Squat 140 kg, Deadlift 180 kg.
--
-- The calendar tile shows metrics.muscles ("Push" / "Pull" / "Legs"); the
-- exercises carry no muscle tag on purpose, so the tile says the day's name
-- rather than "Chest · Delts +1". Re-runnable: it replaces whatever the demo
-- account has logged on those three days.
do $$
declare
  demo uuid := (select id from auth.users where email = 'martinhouska701@gmail.com');
begin
  if demo is null then raise exception 'demo account not found'; end if;

  delete from public.workout_logs
   where user_id = demo and log_date in ('2026-09-14', '2026-09-15', '2026-09-16');

  insert into public.workout_logs (user_id, log_date, activity, gym, exercises, metrics, note)
  values
  (demo, '2026-09-14', 'gym', 'Malkin Athletic Center', '[
    {"name":"Bench Press","sets":[
      {"weight":"60","reps":"10","type":"W","done":true},
      {"weight":"90","reps":"5","type":"N","done":true},
      {"weight":"95","reps":"4","type":"N","done":true},
      {"weight":"100","reps":"3","type":"N","done":true}]},
    {"name":"Overhead Press","sets":[
      {"weight":"50","reps":"8","type":"N","done":true},
      {"weight":"55","reps":"6","type":"N","done":true},
      {"weight":"55","reps":"6","type":"N","done":true}]},
    {"name":"Incline Dumbbell Press","sets":[
      {"weight":"32","reps":"10","type":"N","done":true},
      {"weight":"32","reps":"9","type":"N","done":true},
      {"weight":"32","reps":"8","type":"N","done":true}]},
    {"name":"Lateral Raise","sets":[
      {"weight":"12","reps":"15","type":"N","done":true},
      {"weight":"12","reps":"14","type":"N","done":true},
      {"weight":"12","reps":"12","type":"N","done":true}]},
    {"name":"Tricep Pushdown","sets":[
      {"weight":"35","reps":"12","type":"N","done":true},
      {"weight":"35","reps":"12","type":"N","done":true},
      {"weight":"40","reps":"10","type":"N","done":true}]}
  ]'::jsonb, '{"weightUnit":"kg","muscles":["Push"]}'::jsonb, 'Push day'),

  (demo, '2026-09-15', 'gym', 'Malkin Athletic Center', '[
    {"name":"Deadlift","sets":[
      {"weight":"100","reps":"5","type":"W","done":true},
      {"weight":"150","reps":"5","type":"N","done":true},
      {"weight":"165","reps":"3","type":"N","done":true},
      {"weight":"170","reps":"3","type":"N","done":true}]},
    {"name":"Pull-Up","sets":[
      {"weight":"0","reps":"12","type":"N","done":true},
      {"weight":"0","reps":"10","type":"N","done":true},
      {"weight":"0","reps":"9","type":"N","done":true}]},
    {"name":"Barbell Row","sets":[
      {"weight":"80","reps":"8","type":"N","done":true},
      {"weight":"80","reps":"8","type":"N","done":true},
      {"weight":"85","reps":"6","type":"N","done":true}]},
    {"name":"Lat Pulldown","sets":[
      {"weight":"70","reps":"10","type":"N","done":true},
      {"weight":"70","reps":"10","type":"N","done":true},
      {"weight":"75","reps":"8","type":"N","done":true}]},
    {"name":"Hammer Curl","sets":[
      {"weight":"18","reps":"12","type":"N","done":true},
      {"weight":"18","reps":"10","type":"N","done":true},
      {"weight":"18","reps":"10","type":"N","done":true}]}
  ]'::jsonb, '{"weightUnit":"kg","muscles":["Pull"]}'::jsonb, 'Pull day'),

  (demo, '2026-09-16', 'gym', 'Malkin Athletic Center', '[
    {"name":"Back Squat","sets":[
      {"weight":"60","reps":"8","type":"W","done":true},
      {"weight":"120","reps":"5","type":"N","done":true},
      {"weight":"125","reps":"5","type":"N","done":true},
      {"weight":"130","reps":"5","type":"N","done":true}]},
    {"name":"Romanian Deadlift","sets":[
      {"weight":"100","reps":"8","type":"N","done":true},
      {"weight":"100","reps":"8","type":"N","done":true},
      {"weight":"110","reps":"6","type":"N","done":true}]},
    {"name":"Leg Press","sets":[
      {"weight":"200","reps":"12","type":"N","done":true},
      {"weight":"220","reps":"10","type":"N","done":true},
      {"weight":"220","reps":"10","type":"N","done":true}]},
    {"name":"Standing Calf Raise","sets":[
      {"weight":"60","reps":"15","type":"N","done":true},
      {"weight":"60","reps":"15","type":"N","done":true},
      {"weight":"60","reps":"12","type":"N","done":true}]}
  ]'::jsonb, '{"weightUnit":"kg","muscles":["Legs"]}'::jsonb, 'Leg day');

  update public.profiles
     set data = jsonb_set(
                  jsonb_set(data, '{personalRecords}', '[
                    {"lift":"Bench Press","value":"100 kg"},
                    {"lift":"Squat","value":"140 kg"},
                    {"lift":"Deadlift","value":"180 kg"}
                  ]'::jsonb),
                  '{showPersonalRecords}', 'true'::jsonb)
   where id = demo;
end $$;
