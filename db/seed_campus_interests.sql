-- SCREENSHOT PREP (owner, 2026-09-16): the 60 bulk campus accounts
-- (de11b000-…, db/seed_campus.sql) mostly had "Coffee, Coffee" as interests, so
-- their Match cards showed two or three chips and a lot of empty room. Each now
-- gets 5 or 6 DIFFERENT interests, picked deterministically from its id, and at
-- most one of them is Business / Startups / Finance — so a card is mostly the
-- person's own grey chips, not a wall of "you share this". Re-runnable.
with pool(i, name) as (
  select row_number() over (), n from unnest(array[
    'Music','Art','Film','Photography','Travel','Reading','Writing','Gaming','Cooking','Coffee',
    'Outdoors','Hiking','Climbing','Cycling','Running','Yoga','Martial Arts','Dance','Fashion',
    'Volunteering','Politics','Science','Sustainability','Languages','Chess','Investing','Tech',
    'Podcasts','Foodie']) n
), shared(name) as (select unnest(array['Business','Startups','Finance'])),
picked as (
  select p.id,
    (select jsonb_agg(x.name order by x.ord) from (
       select name, row_number() over (order by md5(p.id::text || name)) ord
       from pool
       order by md5(p.id::text || name)
       limit 5 + (get_byte(decode(md5(p.id::text), 'hex'), 0) % 2)
     ) x) own,
    (select name from shared order by md5(p.id::text || name) limit 1) one_shared,
    get_byte(decode(md5(p.id::text), 'hex'), 1) % 2 = 0 as with_shared
  from public.profiles p
  where p.id::text like 'de11b000%'
)
update public.profiles p
   set data = jsonb_set(p.data, '{interests}',
         case when k.with_shared then (k.own - (k.own->>0)) || jsonb_build_array(k.one_shared) else k.own end)
  from picked k
 where p.id = k.id;
