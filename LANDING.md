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
| **The live landing** | `app/page.tsx` → `components/landing/LandingPage.tsx` | **The new page** — stories, closers, coach, FAQ, about, contact |
| **The intro** | `components/landing/LandingHero.tsx`; `HeroFade` (the hand-over), `HeroPhones` (the backdrop), `Wordmark` | Rebuilt 2026-08-23 — see "The intro" below |
| The varsity tab bar the vhome captures stop above | `components/landing/VarsityTabBar.tsx` | Drawn, not captured; Blade Lock's, lifted out so it is written once |
| The Match screen per school | `public/landing/closers/match-*.webp` (+ `dark/`) | Recoloured 2026-08-23 for the intro's right phone |
| **The tabs / views** | `views` in `lib/landingCopy.ts` → `LandingNav.tsx`; `LandingPage view=…`; routes `app/for/[audience]`, `app/about`, `app/contact`; shared head in `components/landing/routeMeta.ts` | Built (2026-08-18) — see "One page, six views" below |
| Contact + socials | `components/landing/Contact.tsx`, `contact.socials` in `lib/landingCopy.ts` | Built — Instagram / TikTok / X are "coming soon" until the owner fills in `href` + `handle` |
| Light / dark phone screens | `components/landing/PhoneMode.tsx`, `public/landing/dark/**` | Built — the switch bottom-right, shown only over the sections with phones (`data-phone-screens`); dark frames are real captures (see below) |
| The link card | `app/page.tsx` metadata, `public/og.png` ← `scripts/landing/make-og.mjs` | Built |
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

**The intro opens on the mark, and hands over** (2026-08-23). It carries the
wordmark at full size with the brand line under it — the bar's small copy is
not drawn while that one is on screen — the blocks arrive on a short stagger,
and the whole thing fades and lags as you scroll so the first stage of the
story rises over it. The kicker was dropped where the three doors are drawn:
it repeated their two subtitles word for word.

**The intro carries two app screens, and they cycle the schools' colours**
(2026-08-23, the owner's call). They stand beside the words on wide screens
(xl+), anchored to the text rather than to the window, and show `gyms-*` on
the left and `match-*` on the right — the last two lines of the headline,
"your gym, your people" — changing together on `SCHOOL_CYCLE_MS`, each with
its school's colour glowing behind it. Varsity Home stood on the right for one
cut and the owner took it off: the front door is the student app. Match had
never been recoloured, so `recolor-shots.mjs` now carries it (`--only=match`,
then `dark-placeholders.mjs`); `--only` exists because a blanket re-run would
quietly undo `patch-gyms.mjs`. `glow()` in `lib/landingSchools.ts` raises the near-black navies
(Yale, Penn, Brown) to a common lightness floor so all eight land with the same
weight; hue and saturation are untouched, and the schools' own `color`/`ink`
are unchanged.

**And the intro takes the school's colour with them** (2026-08-23). Everything
blue up there cycles with the phones — the wordmark's second half, "Your
people", the button — published by the intro as `--sc` / `--sc-ink`. Two things
deliberately do not follow: the "Live now at Harvard" pill, which states a fact
about Harvard and is the one place a colour could mislead, and everything
outside the intro. `accent()` in `lib/landingSchools.ts` guarantees the
button's label clears 4.5:1 against all eight (Yale and Brown need the walk it
does); `lift()` desaturates as it lightens, or Dartmouth's forest green comes
back neon mint and Brown's brown comes back tan.

**The school's crest is on the BUTTON** (`.l-cta-mark`) — "you see your own
university right there". It stood as a row of eight letters under each phone
for one cut; moving it here said the same thing once instead of twice and gave
the phones the height they needed to be readable, which is the whole point of
a backdrop made of screens. It was a disc, then a CSS shield; since 2026-08-24
it is the real drawing — `SchoolCrest.tsx` rendering the compact cut of the
"Campus Crests" design piece from data in `lib/landingSchools.ts` (shield,
inset border, Playfair-900 letter, and a motif for the four schools whose
letter alone is ambiguous), coloured only by `--crest-field`/`--crest-mark`,
which the button sets to its own pair inverted.
**The intro ARRIVES** (2026-08-23) — six beats on one clock, in
`app/globals.css`: the mark, the headline, the two phones rising into their
lean, the button, the doors, then the school's colour blooming behind the
phones and the scroll cue last. Before this the words faded up but the phones
and the colour were simply there at the first frame, which is what made the
whole thing read as a pop. Photograph it with
`scripts/landing/frames.mjs` — it pauses the page's animations and rewinds
them, which is the only way to get a still of something that is over in a
second.

**The intro is ONE SCREEN** (2026-08-23). Every vertical size in it — padding,
gaps, the headline, the mark, the phones beside it, even the scroll cue's
hairline — is a `clamp()` with a `vh` term, so it shrinks to fit the window
rather than running past the fold on a short laptop; the cue is pinned to the
foot of the section instead of queued at the end of the column. "One screen"
means `100svh - var(--l-bar)`: `StickyBar` publishes its own height, because
the bar is 77px on a laptop and two rows on a phone. Verified at 1280x800,
1900x860 (the owner's window) and 1920x1080.

The intro also runs SLOWER than the closer (`HERO_CYCLE_MS` 4.7s against
`SCHOOL_CYCLE_MS` 2.6s): at the closer's pace on the front door the verdict was
"a disco ball". And the glow is a blurred capsule the phone's own size rather
than a radial gradient in a box — the box cut it square and it ran off the side
of the screen; it has to visibly end, with page left over beyond it.

Two things this deliberately does NOT do. It does not claim eight campuses:
the pill still reads "Live now at Harvard", the cycle starts on Harvard, and no
school is named in the intro — the same care Campus Colours takes. And it does
not summon the light/dark pill over the front door; instead the intro's phones
OPEN WHITE whatever the visitor's colour scheme is (a white phone reads as an
app on the dark page, a dark one reads as a smudge) and follow the switch from
the moment it is actually pressed. The rest of the page still opens in the
visitor's own scheme. This supersedes the older "no drawn phone in the intro"
note, which was about a DRAWN phone standing in for screenshots.

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

## One page, six views (2026-08-18)

The owner asked for "tabs on top like regular webpages" so a coach can see
just the coach part. Agreed shape: **`/` still shows the whole page in
order** (the interlude and the coach bridge line only work in sequence, and a
student who rows should discover Varsity Mode by scrolling); the tabs
**narrow** it, and each has its own address so it can be sent as a link:

```
/               all          the page as before
/for/students   students     intro · Story A → Campus Colours · FAQ · close
/for/varsity    varsity      "Varsity Mode." AS the opener (+ invite button) · Story B → Blade Lock · FAQ · close
/for/coaches    coaches      the Console's opener AS the page opener (+ its mail button) · FAQ · close
/about          about        About only
/contact        contact      Contact only — email + the socials row
```

The student intro (headline, "Get started with .edu") is written for
students, so it opens `/` and Students only; Varsity and Coaches open on
their own statement (`Interlude solo`, `CoachSection solo` — the latter also
swaps `coach.bridge` for `bridgeSolo`). Every tabbed view ends with "This is
one part of the page. See the whole page →" (`seeAll`). The FAQ filters by
view (`faq[].on`).

- One component, one prop: `<LandingPage view=…>`. A story stays welded to its
  closer; only whole sections are dropped. The hero's three doors open the
  same three views as the tabs (one mechanism); on a view they are hidden.
- `/varsity` is the app's own varsity area, hence `/for/…`. Unknown
  audiences 404 (`dynamicParams = false`).
- Two lines lean on the section before them and have `…Solo` variants in
  `lib/landingCopy.ts` (marked DRAFT): `interlude.leadInSolo` (no "And"),
  `coach.leadInSolo` + `coach.subSolo` ("the notes your athletes open on
  their phones" instead of "the varsity story above depends on").
- The tab bar is **sticky** since 2026-08-18 (`StickyBar.tsx`): pinned like a
  regular site's, but it slides up while a story or closer (`.ls-story`,
  `.lc-closer`) is under it — the reason it used to be static — and on a
  phone also hides on scroll-down / returns on scroll-up. In flow, so no
  scroll offset moved; suites green. On phones the tabs take a second row
  that scrolls sideways with a fade while there is more (`TabRow.tsx`).
- The suites take a URL and skip the story that is not on the page:
  `node verify-site.mjs http://localhost:3000/for/students`, same for
  `verify-site-flight.mjs`. Run them on `/`, `/for/students`, `/for/varsity`.
- Socials: `contact.socials` rows render as links once `href` is set; until
  then a muted "coming soon" chip. Owner to supply handles.

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
**The dark frames are real** as of `ea5d904` (2026-08-18): shot from the app's
own dark theme — `node save-cookie.mjs` (owner logs in) → `node
capture-light.mjs --mode dark` — with the closers rebuilt on the new base and
the light frames re-shot the same day. The inverted stand-ins from
`dark-placeholders.mjs` are gone. Every shot the live page asks for now has a
dark twin; `shotSrc()` rewrites the path with NO fallback, so a beat added
without one is a broken image. (The unused files left in `public/landing/` —
the old `05`–`12` story frames and the archived `coach-*` captures — have no
dark twin and need none.)

**Palette B — DECIDED 2026-08-19: keep the blue.** `/landing-mono` showed the
page with the student accent turned to the text white, so that the school
colours would be the only saturated colour on it. The owner compared the two
side by side and kept the blue; the scratch route is deleted. Two arguments
against it, recorded so this is not re-argued: an accent the same colour as the
body text is no longer an accent (the page loses a level of hierarchy), and with
the blue gone the only colour left is gold — which belongs to Varsity Mode,
making the gated rowing feature the loudest thing on a page whose main audience
is ordinary students. The complaint BEHIND Palette B still stands, but it is
local: the feature list beside Campus Colours is blue while the phone next to it
cycles through school colours, so on Yale / Columbia / Penn it reads as blue
beside a different blue. Nowhere else on the page does the accent sit next to a
school colour. If it is ever worth fixing, fix it there — either that one list
goes neutral, or it takes the colour of the school currently on screen.

**Still the owner's to decide**: V6 ending on a stats screen; V7's dark
capture; "how much does it cost?" for the FAQ; any real number for social
proof. (The `.edu` question is settled — see "Open, and blocked" below.)

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

1. ~~The intro's Match cards still name Harvard's houses.~~ **CLOSED
   2026-08-30 — `scripts/landing/patch-match.mjs`**, in the shape of
   `patch-gyms.mjs`: it wipes the four "<house> · <level>" sub-lines and the
   three "Hemenway Gymnasium" chips off each recoloured capture and composites
   that school's own names in their place, LIGHT AND DARK (16 files), with
   every colour — card ground, sub-line grey, chip fill / border / ink —
   SAMPLED per file rather than written down. Names live in
   `school-residences.mjs`, copied from `lib/gyms.ts`, so the shot and the app
   name the same buildings. `--calib` rebuilds Harvard's own words over
   Harvard's own capture and reports the drift; it currently lands within 2px
   on every line. **Re-run it after any re-shoot** — the geometry is measured,
   not derived.

   **`02-match.webp` is a stale screen** — three tabs (Browse · Session ·
   Buddy Board), the heading "SORTED BY COMPATIBILITY", and the old grey person
   glyph, where the app has had two tabs (People · Sessions), "SORTED BY FIT"
   and initials avatars since `1ebdd68` and `d91eb6c`.

   **The re-shoot was DONE on 2026-09-01 and then THROWN AWAY — deliberately,
   on the owner's call ("nechame starou pak zmenime").** The new frame is
   accurate and a much weaker picture: 2 cards and half an empty screen against
   the old 4 dense ones, "Worth a try" instead of "Strong fit", no house on the
   sub-line, 2–3 chips instead of 5. The front door keeps advertising a screen
   that no longer exists until the ones below are dealt with. **The
   tooling for the re-shoot now works** — that part is done and pushed:

   - `capture-light.mjs --only=match` shoots exactly that frame (`a8aa259`).
     `--only` is an EXACT name; it used to match by substring and quietly
     re-shot `03-why-you-match` as well.
   - A capture browser is a fresh profile, so every run is somebody's FIRST
     visit and `TourGate` opened the 17-step walk over the loading page, dimmed
     it and held it on Gyms. The first re-shoot came back as a photograph of
     the tour. `capture-light.mjs` presses the walk's own Skip before it
     shoots anything now.

   **Four things found doing it, all still open:**

   a. **The app names one ordering twice, on one screen.** The tab header says
      `SORTED BY FIT` (`app/(app)/match/page.tsx:61`) and the count line four
      lines below says `SORTED BY COMPATIBILITY` (`:307`). Every user sees
      both. Fix the app, then re-shoot — not the other way round.

   b. **The count lies.** The line reads `{browse.length} PEOPLE` and the
      grid under it drops everything below the weakest tier (`isWorthShowing`
      in `Grid`) — so the live app says "4 PEOPLE" over two cards.

   c. **`patch-match.mjs` has nothing left to attach to.** Its whole job is
      rewriting the "`<house> · <level>`" sub-lines and the "Hemenway
      Gymnasium" chips per school. Today's Match card carries neither: the
      sub-line is the level alone. Its measured geometry is written against
      the OLD capture, so the moment 02-match is replaced that script must be
      re-measured (`--calib`) or retired.

   d. **The demo account sees 4 candidates, not 61.** Not investigated —
      the owner parked it ("kasli na to"). It is why the new frame is thin,
      and it is what a visitor to the real app would see too.
2. **The varsity story ends on a statistics graph (V6).** The brief argues
   against this by name — a stats screen is the one screen every fitness app
   has; a seat in a named boat, published by a coach, is the one none of them
   can show. That screen is V2, currently mid-story. Undecided.
3. **V7, the squad beat, is PARKED — and the blocker is not the screenshot.**
   The screen it advertises (Varsity → Team → Roster → a rower → their training
   month) is drawn from **invented data**: `lib/varsity/teamTraining.ts` and
   `teamProfiles.ts` derive the calendar, the consistency percentage, the hours
   and the personal bests from the athlete's id, because accounts are not linked
   to the squad yet. Shooting it would put fabricated training on the marketing
   page, against this page's own rule that every claim states what the app does
   today. **Unblocked by app work, not by a capture**: a teammate's month has to
   come from their real logged sessions. Only then re-shoot.

   The rig is ready for that day: `scripts/landing/capture-teammate.mjs` shoots
   this one frame in light AND dark (both are required — `shotSrc()` has no
   fallback), opens the same rower the original used, and prints the numbers off
   the screen so the beat's sub-line can be written from the frame instead of
   guessed. It needs a session cookie (owner logs in; expires in an hour — see
   `scripts/landing/README.md`). The copy is recorded above `varsityStory` in
   `lib/landingCopy.ts`; `11-varsity-teammate.webp` is still the old dark-mode
   capture sitting in the light folder, and no beat references it.
3. ~~The hero says "Get started with .edu" and login does not enforce `.edu`.~~
   **CLOSED 2026-08-19 (`5947dae`) — enforced.** `lib/universityEmail.ts` holds
   the rule as data (any `.edu` domain, plus `EXTRA_DOMAINS` for universities
   that don't end in it — empty today). Checked on the sign-up form AND in the
   Google callback, since either one alone is a way round. Only NEW accounts
   are checked; anyone already set up keeps their access. **Side effect worth
   knowing: a new test account can no longer be made with a gmail address** —
   adding one to `EXTRA_DOMAINS` is a one-line data edit if that gets in the
   way.
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
