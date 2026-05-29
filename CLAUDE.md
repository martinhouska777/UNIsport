# UNIsport — Project Rules (permanent, non-negotiable)

A white-label university fitness PWA. These rules apply to EVERYTHING in this repo.

## 1. Colors come from CSS variables ONLY
- Never hardcode a hex color inside a component (no `#A51C30`, no `bg-[#...]`, no
  Tailwind palette colors like `bg-red-500` for brand surfaces).
- All color comes from design tokens exposed as CSS variables and Tailwind utilities
  (`bg-background`, `bg-surface`, `bg-surface-2`, `border-border`, `text-text`,
  `text-muted`, `bg-primary`, `text-primary-contrast`, `bg-accent`, `text-success`,
  `text-warn`, `text-danger`).
- Exception: per-entity *content* colors (e.g. a house's identity colors) may live in
  DATA files and be applied via inline style — never hardcoded inside a component.
- This is the core of the white-label system. It is non-negotiable.

## 2. Two zones
- **Zone 1 (pre-login):** neutral brand only. NO university colors here.
- **Zone 2 (post-login):** a single university's theme, loaded at RUNTIME from data.
- Themes live as DATA (see `lib/themes.ts`). Adding a new school later = adding a data
  entry, NOT writing new code or new components.

## 3. Commit after every working step
- After each working step, make a git commit with a clear message so any step can be
  rolled back. Tell the product owner each time a commit is made.
- GitHub remote IS connected: https://github.com/martinhouska777/UNIsport (branch `main`).
  Push after each step so Vercel auto-deploys.

## 4. Build in small slices
- After each slice: STOP, explain in plain English what was built and how to look at
  it in the browser, and WAIT for the owner's review before continuing.

## 5. Do not add features that weren't asked for
- The product owner does not read code and reviews by using the running app.
- Explain things in plain English. Keep each step small enough to review.

## 6. Stack (for reference)
- Next.js (App Router, v16) + React 19. Run locally with `npm run dev` (port 3000).
- Tailwind CSS v4, driven by CSS variables via `@theme inline` in `app/globals.css`.
- PWA via Next.js built-in manifest + a service worker (the classic `next-pwa` plugin
  is not compatible with Next 16 / Turbopack, so we use the supported built-in path;
  the user-facing result — an installable app — is the same).
- Database (Supabase) and real login come LATER. Not wired up yet.

## 7. Project map (current state)
- **Data is the source of truth.** All option lists / content live in `lib/*.ts`, never
  hardcoded in components:
  - `lib/themes.ts` — university themes (Harvard = dark, crimson `--primary`, gold `--accent`).
  - `lib/gyms.ts` — gyms (3 main + 12 houses) with equipment, ratings, per-house colors.
  - `lib/onboarding.ts` — every onboarding option list + the `OnboardingProfile` type, plus
    `freshmanClassYear` (the SINGLE value that decides Yard dorms vs the 12 houses).
- **Routes** (`app/`):
  - `/` — Zone 1 landing + temporary demo login.
  - `/onboarding` — 9-step flow (after login, before tabs). Logic in
    `components/onboarding/OnboardingFlow.tsx`; shared chrome in `OnboardingShell.tsx`;
    reusable `SearchableDropdown.tsx` + `controls.tsx`.
  - `app/(app)/` — Zone 2 tab shell with bottom nav: `gyms` (list), `gyms/[slug]`
    (profile), `match`, `messages`, `profile` (all but gyms are placeholders).
- **Temporary fakes** (until Supabase): login + onboarding state in
  `components/AppState.tsx` (localStorage). Replay onboarding from the Profile tab.
- **`db/schema.sql`** — planned tables, NOT connected.
- After a UI change, verify in a browser (the owner reviews visually), and keep the
  `text-base`/16px rule on inputs so phones don't auto-zoom.

## 8. How the owner hands over new work
- **New design** → drop the mockup file(s) anywhere under `/mockups`, then say so in chat.
  Mockups are for layout/spacing/hierarchy ONLY; their hardcoded colors are never copied —
  everything maps to theme variables (rule 1).
- **New permanent rule** → add it to THIS file (`CLAUDE.md`).
- **A one-off task** → just describe it in chat.

<!-- The note below is from the Next.js scaffolder and is worth keeping. -->
@AGENTS.md
