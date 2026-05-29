# UNIsport — Project Rules (permanent, non-negotiable)

A white-label university fitness PWA. These rules apply to EVERYTHING in this repo.

## 1. Colors come from CSS variables ONLY
- Never hardcode a hex color inside a component (no `#A51C30`, no `bg-[#...]`, no
  Tailwind palette colors like `bg-red-500` for brand surfaces).
- All color comes from design tokens exposed as CSS variables and Tailwind utilities
  (`bg-background`, `bg-surface`, `border-border`, `text-text`, `bg-primary`,
  `text-primary-contrast`, `bg-accent`, `text-success`, `text-warn`, `text-danger`).
- This is the core of the white-label system. It is non-negotiable.

## 2. Two zones
- **Zone 1 (pre-login):** neutral brand only. NO university colors here.
- **Zone 2 (post-login):** a single university's theme, loaded at RUNTIME from data.
- Themes live as DATA (see `lib/themes.ts`). Adding a new school later = adding a data
  entry, NOT writing new code or new components.

## 3. Commit after every working step
- After each working step, make a git commit with a clear message so any step can be
  rolled back. Tell the product owner each time a commit is made.
- GitHub remote: NOT connected yet (by owner's choice). Commits are LOCAL for now;
  we will connect GitHub later. Rollback safety still fully works locally.

## 4. Build in small slices
- After each slice: STOP, explain in plain English what was built and how to look at
  it in the browser, and WAIT for the owner's review before continuing.

## 5. Do not add features that weren't asked for
- The product owner does not read code and reviews by using the running app.
- Explain things in plain English. Keep each step small enough to review.

## 6. Stack (for reference)
- Next.js (App Router, v16) + React 19
- Tailwind CSS v4, driven by CSS variables via `@theme inline` in `app/globals.css`
- PWA via Next.js built-in manifest + a service worker (the classic `next-pwa` plugin
  is not compatible with Next 16 / Turbopack, so we use the supported built-in path;
  the user-facing result — an installable app — is the same).
- Database (Supabase) and real login come LATER. Not wired up yet.

<!-- The note below is from the Next.js scaffolder and is worth keeping. -->
@AGENTS.md
