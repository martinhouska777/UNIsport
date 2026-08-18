# The landing page — state, decisions, and what's left

Written so a fresh session can pick this up without the conversation that
produced it. The design decisions live in
[`mockups/landing-scroll-brief.md`](mockups/landing-scroll-brief.md); the
animation mechanics live in
[`scripts/landing/README.md`](scripts/landing/README.md). This file is the
**page**: what it is meant to become, what exists, and what has already been
decided so it does not get re-argued.

---

## The target page

```
 1  Intro          wordmark · Log in · headline · Get started with .edu
                   three doors → Student · Varsity athlete · Coach
 2  Availability   one line: live at Harvard, new campuses one at a time
 3  Story A        the student scroll animation, S1–S7
 4  Feature block  features left (each with a + to expand) · Campus Colours piece right
                   + "what's coming for students"
 5  Interlude      the full stop, then "Varsity Mode."
 6  Story B        the varsity scroll animation, V1–V6
 7  Feature block  features left (+ to expand) · Blade Lock piece right
                   + "what's coming for varsity"
 8  Coach section  The Coach's Console — five screens          ← BUILT (twice)
                   + "what's coming for coaches"
 9  FAQ
10  About · Contact
11  Footer         privacy · terms · officially unaffiliated
```

The three doors jump down to their own section. A visitor who just scrolls
still meets everything in order.

---

## Where things are

| What | Where | State |
|---|---|---|
| **All landing copy** | `lib/landingCopy.ts` | **Source of truth** |
| The eight schools (colours, letters, blade art) | `lib/landingSchools.ts` | Data — content colours, rule 1's exception |
| The shared phone frame | `components/landing/Phone.tsx` | One phone for every section; chrome = `l-phone-*` tokens |
| Coach section (site) | `components/landing/CoachSection.tsx` | Built, native, tokenised |
| Coach section (prototype) | `renderCoach()` in `build-story.mjs` | Built, in the artifact |
| Coach design piece | `mockups/coaches/` | The original hand-over |
| **Campus Colours (site)** | `components/landing/CampusColours.tsx` | **Built, native** — the student closer |
| **Blade Lock (site)** | `components/landing/BladeLock.tsx` | **Built, native** — the varsity closer |
| Per-school screens for the closers' phones | `public/landing/closers/{gyms,vhome}-*.webp` | 16 files, 900×1480, from `recolor-shots.mjs` |
| **The live landing** | `app/page.tsx` → `components/landing/LandingPage.tsx` | **The new page** — stories, closers, coach, FAQ, about |
| Light / dark phone screens | `components/landing/PhoneMode.tsx`, `public/landing/dark/**` | Built — the switch bottom-right, shown only over the sections with phones (`data-phone-screens`); **dark frames are provisional** (see below) |
| The link card | `app/page.tsx` metadata, `public/og.png` ← `scripts/landing/make-og.mjs` | Built |
| Palette B scratch | `app/landing-mono/page.tsx` | **Scratch** — owner to decide, then delete |
| Scroll animations | `scripts/landing/build-story.mjs` → `story.html` | Built, published as an artifact |
| Animation runtime | `scripts/landing/story-script.js` | Vanilla DOM; not yet React |
| The two closers (prototype) | `webpage/*.html` | Bundled Design apps, iframed — still what the artifact shows |
| Screenshots | `public/landing/*.webp` | All 900×1479 |

### The one duplication

`build-story.mjs` carries its **own copy** of the beat text, because it is plain
Node and cannot import a `.ts`. Until `ScrollStory` reads its beats from
`lib/landingCopy.ts`, **a copy change must be made in both places** or the
prototype and the site disagree.

---

## Decisions already made — do not re-open without reason

**Copy is the owner's wording.** Changes are limited to broken English, and each
one is commented next to the line it touches. Three Czech false friends were
fixed: *always actual → always current*, *on your eyes → in front of you*,
*logging in workouts → logging workouts*.

**Two lines at two altitudes.** *"Your campus. Your gym. Your people."* is the
hero headline, this page only. *"Never train alone."* is the brand line — for a
logo, a splash, a store listing. S7 closes the student story on the owner's
longer *"Never train alone again."*

**Three claims are cut** because the app cannot do them: *life goals* (no such
profile field), *track your partner's calendar* (`/people/[id]` has no
calendar), and *AI logging on a student beat* (`erg-scan` is under
`/api/varsity/` and reads Concept2/RP3 monitors only — it cannot read a bench
press).

**The coach section is gold, not crimson.** The design piece used `#a51c30`,
which is Harvard's colour, in the zone that is neutral-brand only (rule 2), and
a third accent against the blue/gold system. Gold fits: the console lives at
`/varsity/coach` and everything it publishes lands in the varsity story.

**Beats where the owner gave a headline only (V1, S5) keep their existing
sub-lines.** Deleting a line nobody asked to delete is the larger edit.

**Claude Design is a look generator, not a build target.** Its exports are
bundled apps that own their document. Treat them as mockups (rule 8): drop in
`/mockups`, rebuild natively with `l-*` tokens. The coach port is the worked
example.

**Prefer native ports over iframes.** A page built of iframes has no shared
scroll, no selectable text for search engines, and one document per frame. The
closers were iframed only because they are bundled apps; that is a reason to
port them, not a pattern to copy — and they are now ported (see below).

**The closers show the REAL app, recoloured per school** (commit `56006d1`),
not the design pieces' drawn phone screens. The native ports do the same:
`public/landing/closers/gyms-*.webp` in Campus Colours, `vhome-*.webp` in
Blade Lock, with the varsity tab bar drawn over the capture (which stops
above the app's own bar). And, since 2026-08-18, the Gyms screen shows **each
school's own gyms**: `scripts/landing/patch-gyms.mjs` wipes Malkin / Murr /
Hemenway off the recoloured capture and writes Payne Whitney, Dillon,
Pottruck… in their place (data: `scripts/landing/school-gyms.mjs`).
Regenerate: `recolor-shots.mjs`, then `patch-gyms.mjs` (it writes both
`recolored/` and `public/landing/closers/`).

**One phone frame everywhere.** `components/landing/Phone.tsx` draws the shell,
status bar, island and gesture bar at the story phone's proportions, in
container units, so a 270px closer phone and a 300px coach phone are the same
object and the flight can land on one to the pixel. Restyle the phone there,
once, and every section follows — but keep the stories' phone the same object
when they are ported. Its chrome colours are `l-phone-*` tokens.

**Blade Lock's phone sits 94px below the wheel's centre** — halfway between the
piece's 117 (too much shaft showing, the owner said) and the first port's 74
(too little): the whole blade and a little shaft stand clear above the phone.
**Campus Colours keeps the piece's 2.6s pace, but the first step is sooner:**
Harvard → Yale 1.5s after the cycle starts (~2.1s after landing) — the owner
found the first wait, on top of the arrival, felt twice as long as the rest.

**Blade Lock's glow is off.** The design piece drop-shadowed the front blade
in its colour; the artifact removed it (`cb4a72c`), and the native port does
not draw it. The headline's and label's soft text-shadow glows stay.

**One closer line was changed.** Campus Colours' sub read *"Same app. Eight
campuses. Yours next."* — the app is live at one university, so the claim is
gone: *"Same app. Yours next."* Marked in `lib/landingCopy.ts`; one-line
revert.

**Closers reset to Harvard.** In the artifact each closer's frame is reloaded on
arrival so the sequence opens on Harvard, the colour the story's phone was
wearing. Natively, `useCloserGate` does the same: a closer only moves while
on screen and returns to Harvard (un-pinned) once it has scrolled fully out.

---

## The 2026-08-18 review pass — what changed and why

A measured review (headless Chrome at four widths, WCAG contrast computed,
head tags dumped) found two real bugs and a list of changes; all are in.

**Two bugs that had been invisible in the code:**

1. **`border-l-border` was two rules.** Every landing token starts with `l-`,
   so Tailwind read `border-l-border` both as "border colour `l-border`" and
   as "LEFT border colour `border`" — and the app theme defines
   `--color-border` (#e4e4e7), so the left edge of every card, icon box and
   coach tile was light grey. Fixed by renaming the token to **`l-line`**
   (there is no `--color-line`). Rule, now in `globals.css`: never write
   `border-l-accent` / `border-l-text` bare either — use
   `border-(--color-l-accent)`.
2. **The varsity accent did not exist.** The tokens were `@theme inline`, so
   `--color-l-varsity` was only ever baked into utilities and never emitted as
   a variable; `--sa: var(--color-l-varsity)` (the varsity story's and Blade
   Lock's accent) resolved to nothing — white kicker, white icons, invisible
   rail dot. Now **`@theme static`**; `font-display` is a plain `@utility`
   because next/font's variable lives on the landing root, not `:root`.

**Changes:** primary button dark-on-blue everywhere (was light-on-blue at
2.5:1 in the hero); nothing readable in `text-3`; the hero pill says the fact
("Live now at Harvard"), one-line body, availability under the button; doors
blue / gold / gold-outline; a button under each feature list and under the
coach facts, `mailto:` buttons with subject + first line; V6 label no longer
clips at 1280; story screens have alt text; title / description / OG / X
card + `og.png`; `theme-color #0a0a0a` and no zoom lock on `/` only.

**Light / dark phone screens.** `PhoneMode.tsx` — a context, `shotSrc()`,
the pill bottom-right. Every capture at `/landing/<x>.webp` has a twin at
`/landing/dark/<x>.webp` (closers: `/landing/dark/closers/`); the phone
chrome flips via the `l-phone-*` tokens under `[data-phone-mode="dark"]`.
Default = the visitor's `prefers-color-scheme`, then their last choice.
**The dark frames are stand-ins** made by `dark-placeholders.mjs` (light
captures inverted, hue restored — crimson comes out salmon). Real ones:
`node save-cookie.mjs` (owner logs in) → `node capture-light.mjs --mode
dark` (writes the dark folder for the story frames). Still to do after that:
dark base captures for the closers (`recolor-shots.mjs` / `patch-gyms.mjs`
on a dark base — the wipe colour is white today) and for the five coach
screens.

**Palette B, undecided.** `/landing-mono` shows the page with the student
accent turned to the text white — the school colours become the only
saturated colour on the page (the argument: on Campus Colours the blue
chrome sits beside Yale-blue content). Three token values, one wrapper.
Decide, then either move the values into `globals.css` or delete the route.

**Still the owner's to decide** (unchanged): enforce `.edu` or rename the
button; V6 ending on a stats screen; V7's dark capture; "how much does it
cost?" for the FAQ; any real number for social proof.

## Measured facts worth not re-discovering

- **The colour systems already agree.** The animation's `#0a0a0a` is identical
  to `--color-l-bg`, and its blue/gold split by story matches
  `l-accent`/`l-varsity`. Porting is renaming, not redesigning.
- **The closers work at ~700 × 1250.** Below ~1024px wide they reflow from
  `phone | letter` into a single stacked column. At 900px tall the phone
  **clips**; at 1250 it fits. That height sets how many feature rows fit
  beside them — about five to seven.
- **Screenshot weight is not a problem.** Student story ≈ 416 KB, varsity ≈ 320 KB.
  The 2.5 MB prototype is only big because it inlines everything as base64.
- **Next 16 deprecated `priority` on `next/image`** in favour of `preload`.

---

## Open, and blocked

1. **The varsity story ends on a statistics graph (V6).** The brief argues
   against this by name — a stats screen is the one screen every fitness app
   has; a seat in a named boat, published by a coach, is the one none of them
   can show. That screen is V2, currently mid-story. Undecided.
2. **V7, the squad beat, is written but cannot ship.** Copy is recorded above
   `varsityStory` in `lib/landingCopy.ts`. `11-varsity-teammate.webp` carries
   exactly the right numbers and is a **dark-mode capture** from the old shot
   day; every other frame is light. Needs a re-shoot through
   `capture-light.mjs`, which needs the owner to log in and hand over a session
   cookie (expires in an hour — see `scripts/landing/README.md`).
3. **The hero says "Get started with .edu" and login does not enforce `.edu`.**
   Any address works today. Either enforce it or change the button.
4. **"Free for students" and "Updated weekly"** are claims on the live page that
   nobody has checked.

---

## Do not break the animations

The scroll choreography is the most expensive and most fragile thing in this
repo. It took many passes to get the phone to fly between sections and land on
the closer's own phone to the pixel. **Any change that alters page height,
section order, or the DOM around a story moves every scroll position after
it** — which is most changes.

So: **run all three suites after any change to the landing page, not just ones
that look animation-related.** Adding the coach section between the last closer
and the CTA looked inert and still moved every scroll offset below it; it
passed, but only because it was checked.

What green looks like:

- `verify` — beats switch, pans travel, the flip fires, phone-click and
  dot-rail navigate, `horiz: false` on mobile, and `compatMode: CSS1Compat`
  (quirks mode means the doctype is missing and no handler fires)
- `verify-flight` — both closers `flew: true`, `offscreenFrames: 0`, and
  **`landing error: dx=0 dy=0 dw=0`** — the flying phone must land exactly on
  the closer's own phone
- `verify-reverse` — **11 of 11 PASS**

If any of those regress, fix it before moving on. Do not republish the artifact
on a red suite.

One known flicker, measured on an unchanged build: `verify-flight`'s Blade Lock
landing reads `dy=1` on some runs and `dy=0` on others (a sub-pixel rounding at
the instant of measurement — Campus Colours is `0 0 0` every time). It was
there before the closer ports; a `dy=1` on Blade Lock alone is not a regression.
Anything else non-zero is.

**`story.html` is gitignored and goes stale.** It is rebuilt only by hand
(`node build-story.mjs`); after checking out commits that touched
`build-story.mjs`, rebuild before trusting a suite. `serve.mjs` reads the file
per request, so a server left running from an earlier session serves the fresh
build.

## Verifying

There is no `npm test`. The checks are:

```
npx tsc --noEmit          # must be clean
npm run lint              # 14 errors are PRE-EXISTING, in untouched files
npm run build

cd scripts/landing
node serve.mjs            # serves story.html WITH a doctype, on :8124
node verify.mjs           # beats, pans, flip, click/dot nav, mobile overflow
node verify-flight.mjs    # both closers: must fly, land dx=0 dy=0 dw=0
node verify-reverse.mjs   # 11 assertions, scrolling back up
```

The verify scripts hardcode a Windows Chrome path and a Windows screenshot
directory. On Linux, copy them and point `executablePath` at a local Chromium,
adding `--no-sandbox` if running as root.

**The desktop app's Browser pane does not composite when it is off screen** —
`requestAnimationFrame` never fires and every scroll measurement comes back
frozen at its load-time value. Verify in real headless Chrome.

---

## Build order

1. ~~Coach section, ported native~~ — **done**, on `/coach-preview`
2. ~~The two closers, ported native.~~ — **done**, on `/closers-preview`
   (`CampusColours.tsx`, `BladeLock.tsx`). Both phones carry
   `data-closer-phone` for the flight to land on.
3. ~~The scroll stories.~~ — **done.** `components/landing/ScrollStory.tsx`
   (one component, two data sets; copy from `lib/landingCopy.ts`, mechanics
   from `lib/landingMotion.ts`, choreography CSS as `.ls-*` in globals.css)
   and `StoryCloser.tsx` (a story + its closer + the page's flying phone: the
   in-place cut, forward and back — the artifact's script, asked of component
   handles instead of searched through iframes). Suites:
   `scripts/landing/verify-site.mjs`, `verify-site-flight.mjs`.
4. **Assemble `/`.** — **built, on `/landing-preview`** as
   `components/landing/LandingPage.tsx`: intro with the three doors and the
   availability line, Story A → Campus Colours with the student feature rows
   beside it, the interlude, Story B → Blade Lock with the varsity rows,
   the coach section, FAQ, About · Contact, the close, the footer. The nav
   is static (a bar pinned over full-screen sticky stages sat on every one).
   **Not yet swapped into `/`** — pending the owner's review. To swap:
   `app/page.tsx` renders `<LandingPage />`, delete `app/landing-preview`,
   then delete the old `Hero`, `HeroPhone`, `VarsityPhone`, `Features`,
   `OverviewStrip`, `HowItWorks`, `Exclusivity`, `VarsitySection`.
   **Copy written for it, marked DRAFT in `lib/landingCopy.ts` for the owner:**
   the availability line, the two feature lists (each row checked against
   the code — the route or file is in the comment), the FAQ, About. "What's
   coming" for students / varsity / coaches is deliberately absent: it is a
   roadmap only the owner knows.

Build each on a scratch route first so `/` never breaks.
