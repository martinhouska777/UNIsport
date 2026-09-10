# Prompt — outside-eyes review of the UNIsport website

Paste the block below into a fresh chat with **Fable 5.1** (or say "run the website
review"). It asks for *suggestions only* — nothing gets changed unless you ask for it
afterwards.

Sibling prompt: [`visual-design-audit.md`](visual-design-audit.md) judges the craft of
the **in-app screens** (tokens, tap feedback, buttons, type). This one judges the
**public website** — the page a stranger lands on. Run whichever matches what you want
looked at; there is a short section at the end of this one for the app screens so the
two don't overlap.

---

You are a senior web designer and front-end developer being brought in for an
outside-eyes review of a live product website. You are not shipping anything today.
Your job is to look hard, find what is weak, and hand back a ranked list of
improvements the owner can approve one at a time.

**Do not change any code, and do not open a pull request.** Suggestions only. If you
think something is a one-line fix, still just write it down.

## The product

UNIsport is a white-label university fitness app — a PWA, phone-first — currently live
at Harvard and rolling out one campus at a time. It has three audiences: **students**
(find a gym, see how busy it is, find someone to train with, log sessions, house
leaderboards), **varsity athletes** (training plans, erg results, lineups), and
**coaches** (the console that plans all of it).

The site's whole job is: a student, athlete or coach arrives, understands in about
eight seconds what this is, and signs up with their `.edu` address.

## What to review

The public site — Zone 1, everything a logged-out visitor can reach:

| Route | What it is |
|---|---|
| `/` | the whole landing page in order: hero + three doors → student story → its closer → "Varsity Mode." → varsity story → its closer → The Coach's Console → FAQ → about → contact → footer |
| `/for/students`, `/for/varsity`, `/for/coaches` | the same page, filtered to one audience, each opening on its own statement |
| `/about`, `/contact` | tabbed views of the same page |
| `/login` | the `.edu` sign-in |
| `/join`, `/join/[code]` | invite links |
| `/privacy`, `/terms` | legal |

Live: **https://un-isport.vercel.app** — or run it locally with `npm run dev` on
port 3000. Next.js 16 App Router, React 19, Tailwind v4.

Where the code is:

- `components/landing/*` — every section of the page (`LandingPage.tsx` assembles it)
- `lib/landingCopy.ts` — **every word on the site**. Copy changes land here, never in a
  component.
- `app/globals.css` — the design tokens. The site has its own `--color-l-*` set (dark
  ground, blue student accent, gold varsity accent), separate from the app's tokens.
- `app/layout.tsx`, `components/landing/routeMeta.ts` — titles, descriptions, OG cards
- `LANDING.md` — what is built, what is deliberately unfinished, and which decisions
  are already settled. **Read this before proposing anything structural** — several
  things that look like mistakes are signed-off decisions.

**Look at the real thing, don't reason from the code alone.** Load the page and scroll
it end to end at **390px wide** (an iPhone) and again at **1440px**. Most visitors are
on a phone. Note that below 1024px the scroll animations deliberately do not "fly" —
the sections reveal in place — and that mobile path is the least-reviewed part of the
whole site.

## What to judge, in this order

1. **The first eight seconds.** Screenshot the top of `/` at 390px. Without scrolling:
   is it clear what this is, who it's for, and what to do next? Is the primary action
   the most obvious thing on screen? Say what a confused visitor would think it is.
2. **The path to signing up.** Follow it as a student, then as a coach. Count the taps.
   Where does it stall, ask for something too early, or leave someone on a page with
   nowhere to go? Dead ends and orphan pages count here.
3. **The words.** Copy is the biggest lever on a page like this. Go section by section
   in `lib/landingCopy.ts`: cut what's vague, name what's concrete, and rewrite the
   weakest five headlines/CTAs — give the exact replacement text, not a note saying
   "make it punchier". Watch for jargon that only a rower understands.
4. **Structure and rhythm.** Is the section order right? Is anything too long, repeated,
   or missing (proof, screenshots, a "what does it cost", a reason to trust it)? Is
   there enough of the actual product on screen early?
5. **Mobile, honestly.** Tap targets under 44px, text under 12px, anything that
   overflows sideways, sticky bars covering content, the safe area at the bottom of a
   phone, the long scroll animations on a small screen.
6. **Speed.** `public/landing` is ~5.7MB of imagery and there are heavy scroll effects.
   Check what actually loads on a first visit to `/` on a phone connection: image
   formats and sizes, what's eager vs lazy, layout shift, how soon the headline paints.
   Give real numbers.
7. **Accessibility.** Real contrast ratios against the site's dark ground (4.5:1 body
   text, 3:1 for a control's own shape), keyboard-only navigation, focus rings, alt
   text, heading order, and whether everything animated respects
   `prefers-reduced-motion`.
8. **Found on the internet.** Page titles and meta descriptions per route, the OG/share
   card, `robots`/`sitemap`, structured data, and the PWA install prompt.
9. **Trust and craft.** Legal pages, the "officially unaffiliated" line, broken links,
   placeholder content, anything that reads as unfinished to a stranger.

## The rules your suggestions have to live inside

These are permanent project rules — a suggestion that breaks one is not usable:

- **No hardcoded colours.** Everything is a design token (`--color-l-*` on the site).
  A school's own colours may appear as *content* — pictures of a themed app — never as
  page chrome.
- **Two zones.** The public site is neutral product brand only; university colours
  belong to the logged-in app.
- **Copy lives in `lib/landingCopy.ts`**, layout in the components.
- **A story and its closer are welded** — the phone flies between them, nothing may be
  inserted in between. Everything else in the order is free to move.
- Inputs stay at 16px or phones auto-zoom on focus.
- Don't invent features. If a fix requires building something new, say so and price it.

## How to argue

- Every claim needs evidence: a file and line, a measured number, or a screenshot.
  "Feels cluttered" is worth nothing; "the hero has 7 competing elements above the fold
  at 390px, screenshot attached" is worth something.
- Every problem needs a specific fix — the exact copy, the exact value, the exact
  section to move — not a direction.
- Say when something is already good. The owner needs to know what not to touch.

## What to hand back

1. **The five things to fix first**, plainly, at the top — each with the problem in one
   sentence, the fix in one sentence, and rough effort (minutes / an hour / a day).
2. **The full ranked list**, grouped by the nine areas above, ordered by how much the
   site improves per hour spent.
3. **A short "leave this alone" list.**

The owner does not read code and reviews by looking at the running site, so write
everything in plain English — if a suggestion can't be explained without a code
snippet, explain what the visitor would see differently instead. Where a picture makes
the point faster than a paragraph, include the screenshot.

**Optional, only if asked:** the same treatment for the logged-in app screens
(`app/(app)/`, `app/onboarding`, `app/varsity/`) — but the deeper pass on those is
`.claude/prompts/visual-design-audit.md`; run that instead of duplicating it here.
