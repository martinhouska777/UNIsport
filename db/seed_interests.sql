-- ============================================================================
-- UNIsport — fill out the demo campus's interests
-- ----------------------------------------------------------------------------
-- WHY THIS EXISTS
--   The seeded students were given one or two interests each, and twelve of
--   them had the SAME one stored twice ("Coffee", "Coffee"). Two things came
--   out of that: result cards had almost nothing true to say about anybody, and
--   the matching engine scored a duplicate as a second overlap — two people who
--   each listed Coffee twice collected the full 18 interest points off one
--   shared interest. The engine's own fix is in db/matching.sql (count
--   distinct); this file fixes the DATA, so every demo student has five or six.
--
-- WHY PERSONAS AND NOT RANDOM PICKS
--   Random interests would fill the cards and ruin the feature. Matching lives
--   on OVERLAP, and thirty-two interests spread randomly over a hundred people
--   gives almost none — everybody would score the same near-zero and the
--   ranking would be noise wearing a percentage.
--
--   So the interests come in six clusters, the way they actually clump in a
--   student body: the outdoorsy ones, the creatives, the business crowd, the
--   academics, the social ones, the tech ones. Each person is assigned one
--   cluster and drawn from it. People in a cluster then genuinely share three
--   or four interests, people across clusters share one or none, and the
--   Match tab has something real to rank.
--
--   Every value below is from `interestOptions` in lib/onboarding.ts — nothing
--   here can produce an interest the app's own picker doesn't offer. Clusters
--   deliberately overlap (Podcasts appears in three, Coffee in two), so the
--   groups blur at the edges rather than forming six sealed cliques.
--
-- DEMO ACCOUNTS ONLY
--   Scoped to `%@demo.unisport.test`, which is what db/seed_campus.sql creates.
--   A real signed-up student's answers are never touched by this file.
--
-- DETERMINISTIC AND ADDITIVE
--   Who gets which cluster, and which of its interests, is derived from the
--   person's own id — so re-running this changes nothing, and the campus does
--   not reshuffle every time. Interests somebody already had are KEPT and the
--   list is topped up around them.
--
-- IDEMPOTENT: safe to paste into the Supabase SQL editor and re-run.
-- ============================================================================

with clusters(grp, val) as (values
  -- 0 · the outdoorsy ones
  (0, 'Running'), (0, 'Cycling'), (0, 'Climbing'), (0, 'Hiking'), (0, 'Outdoors'),
  (0, 'Yoga'), (0, 'Martial Arts'), (0, 'Sustainability'), (0, 'Foodie'),
  -- 1 · the creatives
  (1, 'Music'), (1, 'Art'), (1, 'Film'), (1, 'Photography'), (1, 'Writing'),
  (1, 'Fashion'), (1, 'Dance'), (1, 'Reading'), (1, 'Podcasts'),
  -- 2 · the business crowd
  (2, 'Business'), (2, 'Startups'), (2, 'Finance'), (2, 'Investing'), (2, 'Tech'),
  (2, 'Politics'), (2, 'Podcasts'), (2, 'Coffee'), (2, 'Travel'),
  -- 3 · the academics
  (3, 'Science'), (3, 'Reading'), (3, 'Writing'), (3, 'Languages'), (3, 'Chess'),
  (3, 'Politics'), (3, 'Volunteering'), (3, 'Podcasts'), (3, 'Sustainability'),
  -- 4 · the social ones
  (4, 'Cooking'), (4, 'Foodie'), (4, 'Coffee'), (4, 'Travel'), (4, 'Music'),
  (4, 'Gaming'), (4, 'Dance'), (4, 'Volunteering'), (4, 'Fashion'),
  -- 5 · the tech ones
  (5, 'Tech'), (5, 'Gaming'), (5, 'Startups'), (5, 'Science'), (5, 'Chess'),
  (5, 'Podcasts'), (5, 'Investing'), (5, 'Music'), (5, 'Film')
),
target as (
  select
    p.id,
    -- Five or six, not a flat number: a campus where everybody listed exactly
    -- six would read as generated, which it is, but it should not look it.
    5 + (abs(hashtext(p.id::text)) % 2) as want,
    abs(hashtext(p.id::text || 'cluster')) % 6 as grp,
    -- What they already have, duplicates collapsed.
    coalesce((
      select array_agg(distinct e.val)
      from jsonb_array_elements_text(coalesce(p.data->'interests', '[]'::jsonb)) as e(val)
      where e.val <> ''
    ), '{}'::text[]) as have
  from public.profiles p
  join auth.users u on u.id = p.id
  where u.email like '%@demo.unisport.test'
),
filled as (
  select
    t.id,
    -- Their own first, then their cluster's, in an order that is stable per
    -- person but different for each of them. Capped at six.
    (t.have || array(
      select c.val
      from clusters c
      where c.grp = t.grp
        and not (c.val = any (t.have))
      order by md5(t.id::text || c.val)
      limit greatest(t.want - coalesce(cardinality(t.have), 0), 0)
    ))[1:6] as list
  from target t
)
update public.profiles p
set data = jsonb_set(p.data, '{interests}', to_jsonb(f.list))
from filled f
where p.id = f.id;
