# LANDING_BRIEF — read this first

You are working in a **git worktree** of the UNIsport app, on branch **`landing`**.
The folder `C:\UNIsport` is the *same repo* on `main`, where the app itself is being
developed in a separate Claude session **at the same time**. Don't fight over files.

Read `CLAUDE.md` and `AGENTS.md` in this folder first — all the permanent project
rules apply here too (CSS-variable theming only, two zones, small reviewable slices,
commit after each step, Next 16 — check `node_modules/next/dist/docs/` before writing
Next code).

## Your job
Build the **public landing page** (the web front door) with **two login paths**:
1. **Normal / student** → the regular campus-fitness app.
2. **Varsity athlete** → Varsity Mode (Canvas-style login: enter university + team/invite).

Auth is REAL (Supabase) and lives in `components/AppState.tsx` — it is SHARED with the
app. Both paths sign in through the same Supabase project; they differ only in **where
the user lands after login**, not in the sign-in itself. So this is one app — the
landing page is its entry, NOT a separate site.

## File ownership (so the two sessions don't collide on merge)
- **You own:** `app/page.tsx` (the `/` landing), new `app/login/`, `app/join/`,
  and `components/landing/*`.
- **The app session owns:** `app/(app)/*`, `app/varsity/*`, `app/onboarding/*`,
  `lib/varsity/*`, and the gyms/match/messages routes.
- **Shared — coordinate before editing, keep edits tiny:** `app/layout.tsx`,
  `app/globals.css`, `components/AppState.tsx`, `lib/themes.ts`.

## Suggested route contract (confirm with the owner)
- `/` — landing, **neutral brand only** (Zone 1 — NO university colors here, per rule 2).
- "I'm a student" → `/login?mode=normal` → existing `/onboarding` → normal app.
- "Varsity athlete" → `/join` (university + team/invite code) → `/varsity`.
- After auth, redirect by `mode`; a `varsity` flag on the profile sets the default
  landing for returning users.

## How to run
- Dev server on a **different port** so it doesn't clash with the app's :3000:
  `npm run dev -- -p 3001`  → http://localhost:3001
- `.env.local` (Supabase keys) is already copied in — do not commit it.

## Git
- Commit on the `landing` branch as you go (owner reviews in the browser).
- Push: `git push -u origin landing`. Merge to `main` via PR (or `git merge landing`
  from the app side) when a slice is approved and the owner has reviewed.
- Pull the app session's latest before merging to catch shared-file changes early:
  `git fetch && git merge origin/main` (or rebase) periodically.

## Notes
- The current `app/page.tsx` already has a temporary demo landing + login — evolve it,
  don't start from zero.
- This file is a scratch brief; it's untracked — delete it or keep it, your call.
