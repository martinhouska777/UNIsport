# UNIsport — pre-launch audit brief

A prompt for an AI reviewer (Claude, a sub-agent, or any other model with
access to this repo). Written 2026-09-27, the week UNIsport is being made
ready to launch. Re-run it before any launch; update the "already known" list
at the bottom when things get fixed or decided.

---

## The job

You are auditing **UNIsport** before its launch. Go through **the website**
(the public, pre-login pages) and **the app** (everything after login:
student side, Varsity Mode for athletes, and the Coach's Console) and find:

1. **Bugs** — anything broken, wrong, crashing, stuck, misleading, or that a
   first-time student would trip over. Includes empty states that dead-end,
   buttons that do nothing, text that overflows or clips, layouts that break
   on a phone (375–430px) or a laptop (1280–1536px), console errors, 404s,
   wrong dates/times, numbers that don't add up.
2. **Colour inconsistencies** — the same thing coloured two different ways on
   two screens; greys that don't match the system; a hardcoded colour that
   ignores the school's theme; text too faint to read; a colour that works in
   light mode and fails in dark (or for one school but not another).
3. **Colour design that could be better** — not bugs, but places where the
   palette is used weakly: too many accents on one screen, a status colour
   (success / warn / danger) used for decoration, the school colour where a
   neutral would be calmer, hierarchy that colour could fix. Be specific and
   say what to change it TO, in terms of the existing tokens.

The product owner does not read code. They review by using the app. So every
finding must say **what a person sees**, on **which screen**, and **what to
do** about it — in plain English first, file:line second.

**This is read-only.** Do not fix anything, do not commit, do not push. The
owner decides what gets fixed, in small slices, after reading the report.

---

## What UNIsport is (enough to judge it)

A white-label university fitness PWA: find every gym on campus, match with
training partners verified by their .edu email, plan the session in the chat,
log it together, climb the college leaderboards. Varsity Mode is a gated mode
for rowing teams (the coach's plan, lineups, logging, team workouts,
statistics); the Coach's Console is where the coach builds all of it.

Stack: Next.js 16 (App Router, Turbopack) + React 19, Tailwind v4 driven by
CSS variables (`@theme inline` in `app/globals.css`), Supabase. Read
`CLAUDE.md` and `AGENTS.md` first — this Next.js has breaking changes.

### The colour system — the rules you are auditing against

- **Zone 1 (pre-login: landing, /for/*, /about, /contact, /login, /waitlist,
  /join, /privacy, /terms, 404)** uses the neutral brand only: the `l-*`
  tokens in `app/globals.css` (`bg-l-bg`, `text-l-text`, `text-l-text-2`,
  `border-l-line`, `bg-l-accent`, `l-varsity…`). The landing deliberately
  cycles eight schools' identity colours in a few set pieces (the hero's
  "Your people.", the closers, the crest button) via `--sc` — that is a
  decided exception, not a bug.
- **Zone 2 (post-login)** takes ONE school's theme at runtime from
  `lib/themes.ts` (eight schools; each has a dark set and a `themeLight` set)
  through `<ThemeProvider>`. Varsity has its own chassis in
  `lib/varsity/theme.ts` on the same neutrals.
- **Rule 1: colours come from tokens only.** No hex / rgb / hsl literals in
  components, no Tailwind palette colours (`bg-red-500`, `text-gray-400`) for
  UI. Allowed: token utilities (`bg-background`, `bg-surface`, `bg-surface-2`,
  `border-border`, `text-text`, `text-muted`, `text-text-3`, `bg-primary`,
  `text-primary-contrast`, `bg-accent`, `text-success`, `text-warn`,
  `text-danger`, `*-primary-live`, `*-primary-tint`, …) and per-entity
  CONTENT colours that live in DATA files (`lib/gyms.ts` house colours,
  `lib/landingSchools.ts`, the varsity coach's calendar colours) applied by
  inline style. A literal inside a component is a finding; say whether it
  breaks white-labelling (visible for every school) or is harmless.
- **The owner's standing design decisions** (do NOT report these as bugs):
  - Light mode is the default; dark is remembered if chosen.
  - "Everything that is not the page background is WHITE" — a card
    (`border border-border bg-surface`). The grey `bg-surface-2` is only for
    things INSIDE a card or sheet (close buttons, unit toggles, tracks, zebra
    rows). A grey block sitting directly on the page IS a finding.
  - Plus Jakarta Sans inside the app; the landing has its own faces.
  - No explainer micro-copy: never caption a control with what it does.
  - Your own chat bubble is a pale wash of the school colour; theirs is white.

### Where things are

- Routes: `app/` — student tabs in `app/(app)/` (gyms, gyms/[slug], match,
  messages, profile, leaderboards, memories, people/[id]), `app/settings`,
  `app/onboarding`, `app/varsity/(athlete)/*`, `app/varsity/coach/*`,
  `app/varsity/setup`, `app/varsity/waiting`, plus the Zone 1 pages above.
- Landing copy is data: `lib/landingCopy.ts`. Components: `components/landing/`.
- App components: `components/` by area (messages, profile, match, gyms,
  varsity, onboarding, ui).

---

## How to look at it (you cannot sign in)

- A dev server is ALREADY running on **http://localhost:3000**, owned by
  another session. It serves this same working tree. **Never start a second
  `next dev`, never restart it, never delete `.next`.**
- The in-app Browser pane is usually hidden and will not screenshot. Drive
  **headless Chrome** instead: `puppeteer-core` (in `node_modules`) with
  `executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"`,
  `headless: "new"`. `setViewport` per size, `evaluate` to measure,
  `screenshot` to a PNG, then open the PNG to look at it. Scripts that
  `require` puppeteer from outside the repo must use the absolute path
  `C:/Unisport/node_modules/puppeteer-core`.
- **Zone 2 needs a login you do not have.** The way in is a THROWAWAY page:
  `app/dev-audit-<you>-<screen>/page.tsx` (`"use client"`) that renders the
  REAL page or component inside
  `<ThemeProvider tokens={uni.theme} light={uni.themeLight} paintRoot>` with
  `const uni = getUniversity("harvard")` (and a second school, e.g. "yale",
  to test white-labelling). With no user id the screens show their brand-new /
  empty state — which is exactly what a first-time student sees, so judge that
  state hard. Where a screen needs data to be judged (a list, a chat), render
  the inner component with realistic sample props instead. **Delete every
  throwaway page before you finish** and confirm with `git status`.
- Light vs dark in the app is the app's own switch, not the OS setting: it is
  `localStorage["uniThemeMode"]` = `"light"` | `"dark"`
  (`components/ThemeMode.tsx`, mounted in the root layout). Set it with
  `page.evaluateOnNewDocument` before loading to see dark.
- Measure instead of guessing: `document.documentElement.scrollWidth` for
  horizontal overflow; `getBoundingClientRect()` for clipping and tap sizes
  (44px minimum); WCAG contrast from computed colours (text vs the nearest
  opaque background) — 4.5:1 for body text, 3:1 for large text and icons.
- Contrast of the THEMES themselves can be computed straight from
  `lib/themes.ts` without a browser: every school × light/dark × the pairs that
  matter (text/background, text/surface, muted/surface, text-3/surface,
  primary-contrast/primary, primary on surface, success/warn/danger on
  surface).

### Safety

- Do not edit product code. Only create (and then delete) your throwaway
  `app/dev-audit-*` pages and files in the scratchpad.
- Never `git add`, `git commit`, `git push`, `git checkout --` on files you did
  not create — another session is working in the same folder right now.
- Never send requests to production with a saved session cookie, never write
  to the database, never touch Vercel or Supabase settings.
- Never run `next build` in C:\Unisport while the dev server is up — it writes
  into the same `.next` folder. `npx tsc --noEmit` and `npx eslint` are safe.

---

## What to report

Return a list of findings, most severe first. For each:

- **Severity:** `blocker` (a student would hit it and give up, or it looks
  broken) · `should-fix` (visible and wrong, but you can carry on) · `polish`
  (a better choice exists).
- **Kind:** bug · colour-inconsistency · colour-design.
- **Where:** the screen as a person would name it ("Messages → Direct", "the
  gym page", "Varsity → Calendar", "home page, the colour-changing phone") +
  viewport + light/dark + school, then `file:line`.
- **What a person sees** — one or two plain sentences.
- **Evidence** — the measurement, the screenshot path, or the code.
- **Fix** — what to change, in tokens and components, one or two lines.
- **Confidence** — confirmed (you saw or measured it) or suspected (read in
  code, not seen).

Group near-identical findings into one ("the same hardcoded grey in 6 files:
…") rather than listing each. Skip anything on the already-known list below
unless you find it has got WORSE or spread.

Finish with **the three colour changes that would most improve the look**,
each as a concrete token-level proposal.

---

## Already known — do not re-report

- Every school's identity colour as large TYPE on the landing's ground fails
  the 3:1 bar (Harvard #a51c30 ≈ 2.65:1 on near-black). An open design
  decision (a lighter per-school "ink" for type only), not a bug.
- The five varsity tables have no `team_id`: every squad reads one shared plan.
- The hero's "Get started with .edu" still shows to a signed-in visitor (the
  top bar was fixed; the hero is the owner's call).
- Storage buckets (erg photos, crew videos) are readable by any signed-in
  account.
- Seeded students look like real ones and can never reply; iPhone Safari
  notifications need "Add to Home Screen"; there is no install prompt.
  (Re-check these three only to say whether they are still true.)
- The Feed is on the `feed` branch, not on `main` — "Upcoming" on the landing.
- The gym row on the landing still says "equipment" (cut from the app
  2026-09-22) — known, awaiting the owner.
