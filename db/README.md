# The database, and the order it goes in

There are 33 `.sql` files here and nothing recorded which of them had actually
been run against which Supabase project. On 2026-08-26 that cost us: the
`unisport-feed` deployment pointed at a brand-new, empty project, the varsity
setup screen kept handing itself back, and the reason (`Could not find the
table 'public.profiles'`) was being swallowed. This file is so that never
happens silently again.

## Which project is which

| Deployment | Supabase project |
| --- | --- |
| `un-isport.vercel.app` (production, branch `main`) | `wavxyrgtaotrhnyepyor` |
| `unisportdev.vercel.app` (branch `feed`) | `wavxyrgtaotrhnyepyor` — **the same one as production** |
| `unisport-feed.vercel.app` | `ywjhgjsgcjxmjlxszlrj` |

`unisportdev` writing into production's database is a hazard, not a decision —
anything tested there touches real accounts. Point it at its own project.

## Setting up an empty project, in order

Run these in the Supabase SQL editor **top to bottom**. This is the order the
files were created, which is the order they were originally run, so every
dependency is already satisfied. All of them are idempotent — safe to re-run.

1. `profiles.sql`
2. `matching.sql`
3. `public_profile.sql`
4. `varsity_plan.sql`
5. `varsity_lineups.sql`
6. `varsity_coach_notes.sql`
7. `varsity_logs.sql`
8. `messages.sql`
9. `follows.sql`
10. `workout_logs.sql`
11. `auth_autoconfirm.sql`
12. `session_plans.sql`
13. `push_subscriptions.sql`
14. `push_notify.sql`
15. `buddy_board.sql`
16. `varsity_teams.sql`
17. `varsity_setup.sql`
18. `leaderboards.sql`
19. `varsity_results.sql`
20. `varsity_telemetry.sql`
21. `varsity_coach_reads.sql`
22. `posts.sql`
23. `posts_workout.sql`
24. `varsity_posts.sql`

## What is deliberately NOT in that list

- **`schema.sql`** — the original design sketch, never connected to anything
  (it says so at the top). It creates its own `profiles`, so running it against
  a live project would fight `profiles.sql`. Left as a planning artifact.
- **`matching_test.sql`** — hand-run `select`s for checking the matching
  functions. Reads only; run it when you want to look, not when you set up.
- **`seed_*.sql`** — demo people, demo campus, demo varsity week, and the two
  feed fillers (`seed_feed.sql` = invented students at the other seven schools
  posting to the normal feed; `seed_varsity_feed.sql` = invented squads posting
  to the varsity feed, plus three teammates on your own squad). Optional
  content, not structure. Each has a matching `*_undo.sql` that removes it
  again, so a demo can be put on and taken off a project without residue.

## Adding a file

New table or function → new file here, and **add it to the numbered list
above**. A file nobody can prove was run is a file that will be run twice or
never.
