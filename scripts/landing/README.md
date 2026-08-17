# Landing-page tooling — state and how to pick it up

Everything here builds the landing page's scroll animations and the review
sheets that got us to the current design. Written so a fresh session can carry
on without the previous conversation.

The design decisions live in [`mockups/landing-scroll-brief.md`](../../mockups/landing-scroll-brief.md).
This file is the mechanics.

---

## Where things are

| What | Where |
|---|---|
| Screenshot frames (900×1479 + tall pan strips) | `public/landing/*.webp` |
| Scroll animations, self-contained | `webpage/Scroll Animations.html` (full) and `(slim).html` (497KB, for uploading) |
| Varsity static closer (from Claude Design) | `webpage/Blade Lock Light.html` |
| Student static closer (from Claude Design) | `webpage/UNIsport Campus Colours.html` |
| The build script for the animations | `scripts/landing/build-story.mjs` |

The published prototype is a Claude artifact; ask the owner for the URL, or
re-publish the built `story.html`.

---

## Building the animations

```
cd scripts/landing
node build-story.mjs          # reads shots.json, writes story.html
```

`build-story.mjs` needs a `shots.json` next to it: `{ "<frame-name>": "<data
URI>" }`. Regenerate it from the committed frames:

```js
const fs = require("fs");
const dir = "../../public/landing/";
const out = {};
for (const f of fs.readdirSync(dir))
  out[f.replace(".webp", "")] = "data:image/webp;base64," + fs.readFileSync(dir + f).toString("base64");
fs.writeFileSync("shots.json", JSON.stringify(out));
```

The beats — headline, sub-line, image key, annotations, and `pan: [from, to]`
for the tall strips — are the two arrays at the top of `build-story.mjs`. That
is the only place to edit copy.

`story-script.js` is the page's runtime (beat switching, phone crossing, pans,
click-to-navigate). `build-story.mjs` splices it into the output; edit it there
and re-splice, or edit the copy inside `build-story.mjs` directly.

---

## Verifying (important)

**The Browser pane in the desktop app does not composite frames when it is not
displayed on screen** — `requestAnimationFrame` never fires, so every scroll
measurement comes back frozen at its load-time value. Verify in real headless
Chrome instead:

```
node serve.mjs        # serves story.html on :8124 WITH a doctype
node verify.mjs       # drives it, prints beat/flip/pan state, saves screenshots
```

`serve.mjs` wraps the file in `<!doctype html>` deliberately: without it the
page renders in quirks mode, `body` becomes the scroll container, and none of
the scroll handlers fire. The artifact host adds a doctype, so this matches
production.

---

## Capturing new frames from the live app

The capture scripts drive `https://un-isport.vercel.app` in headless Chrome at
402×661 @3x (= 1206×1983, the same canvas as the existing frames).

They authenticate by transplanting a session cookie into
`scripts/landing/session-cookie.txt` (gitignored, expires in an hour):

1. The owner logs in to un-isport.vercel.app in the app's Browser pane.
2. Read the cookie:
   `document.cookie.split("; ").find(c => c.startsWith("sb-wavxyrgtaotrhnyepyor-auth-token="))`
3. Save the value (everything after the `=`) to `session-cookie.txt`.

Then:

| Script | Captures |
|---|---|
| `capture-light.mjs` | **the whole story set, in the app's light mode** — run this one to refresh everything (shot-day seed first, in the owner's timezone) |
| `capture-ryan.mjs` | just the three frames carrying the partner's name |
| `capture-profile-tall.mjs` | just the student profile strip |
| `capture-shotday.mjs` | varsity home strip + the log sheet (dark-era script) |
| `capture.mjs` | the varsity stills — home, race, log sheet, team, lineup |
| `capture-varsity-tall.mjs` | tall strips for the pans (home, profile, calendar) |
| `capture-tall3.mjs` | the student tall strips (a logged session, the profile) |

The app is put into light mode by planting `localStorage.uniThemeMode = "light"`
before the first load (`capture-light.mjs` does this) — every frame must be
shot that way now, or a dark screen appears inside the light-chrome phone.

**Never type the owner's password.** They log in themselves; the scripts reuse
that session.

### Turning a capture into a frame

Stills: resize to 900×1479. Tall strips: resize to 900 wide, then cut at the
longest run of blank rows — a tall viewport pins the app's footer bar to the
bottom and leaves a long gap above it, which the pan would otherwise scroll
through as an empty black phone.

Padding must be applied in a **separate sharp pass** from the resize: sharp runs
`extend` after `resize` regardless of call order, so a single chained pipeline
adds unscaled padding and every frame comes out a different height.

---

## Review sheets

Standalone renderers for design review; each writes a PNG next to itself.

| Script | Renders |
|---|---|
| `preview-ivy2.mjs` | the eight Ivy oars (light, black handles) + both app previews in all eight schools |
| `preview-gyms8.mjs` | the Gyms screen for all eight schools with their real facilities |
| `preview-marks.mjs` | four options for the school identity marks |

The school data — colours, real gym names, addresses, hours, sizes — lives in
those files and is the source for anything school-specific.

---

## Database

`runsql.mjs` runs SQL through the Supabase management API:

```
SBP=<personal access token> node runsql.mjs "select 1;"
SBP=<token> node runsql.mjs ../../db/seed_demo.sql
```

The owner generates the token at supabase.com/dashboard/account/tokens and
revokes it afterwards — ask for a fresh one, never assume one is lying around.

---

## Decisions already carried out (2026-08-17)

- Student beats 5–6 ride the **Log Session sheet** (`tall-logsheet`), not the
  saved-session crops — the photo option and note are actually on screen.
- Varsity race + coach's note are **one beat** (V3); home is shot on a
  **shot day** (`db/seed_varsity_shotday.sql`: a four AM, a pair PM), and the
  screenshot account is **John Brown**, whose seat lights up as "You".
- Both stories **hold their opening frame** (long first marker + `hold:` on the
  first pan beat), the phone **no longer tilts** (drift is vertical only), and
  the crossing flip is **off below 1024px** — it pushed the phone off screen.
- Student beat 7 pans the profile (`tall-profile`, capture-profile-tall.mjs)
  down past the leaderboard ranks and rests on the session calendar.
- The **Blade Lock hero was cut** from the scroll page at the owner's request
  (the standalone `webpage/Blade Lock Light.html` still exists).

## The closers (webpage/*.html)

`Blade Lock Light.html` and `UNIsport Campus Colours.html` are **bundled apps**
from Claude Design — ~130KB of JavaScript each that mount into `document.body`
and style `body` and `*`. They cannot be pasted into the page (they would
flatten the sticky stages), so `closer()` in build-story.mjs gives each one its
own document inside a full-screen `srcdoc` frame. Re-exporting is a drop-in:
replace the file, rebuild.

Because the frames are same-origin, the page choreographs them on arrival:

| What | How it's found |
|---|---|
| the phone | the only element with a >20px corner radius above the "9:41" clock |
| the letter | the largest type in the document (Blade Lock has none — optional) |
| the accent | the biggest piece of *coloured* type (greys are chrome) |

Nothing is matched by class name — their bundles emit obfuscated ones (`scp0`),
so structure is the only stable handle. On arrival the frame is blanked,
**reloaded** (both pieces cycle on their own timer, so without this the reader
arrives mid-sequence instead of on Harvard), primed while hidden, then played:
the phone slides in from where the story's phone was, and the letter swings out
from behind it.

**The app's bottom tab bar is drawn by us**, not by the design files — they
render a phone without one. If a re-export ever includes one, delete
`buildTabs()` and the `.__tabs` rules rather than ending up with two.

Two gotchas that cost time, both from the page being built inside a template
literal: a regex literal in an emitted script loses its backslashes (use string
splitting), and any backtick in an emitted comment ends the literal early.

## Agreed but not yet done

1. **Shoot the confirmation card** ("did this happen?" → verified workout) and
   make it a student beat. It is the app's most distinctive mechanic and is
   currently absent from both animations.
2. **Beat 1 copy** → "First, every gym on campus." — bridges the hero's promise
   about people into a screen full of buildings.
3. **Unresolved:** the demo students have no profile photos, so the match screen
   is a row of placeholder glyphs under a headline about finding people. Needs
   either generated portraits or a crop that avoids the avatar row.
4. **Then:** stitch the sections into one page and port into `app/page.tsx`
   using the `l-*` design tokens (rule 1 — no hex literals in components).

---

## Chapter three — the Coach's Console (DECISION: static section, no animation)

The owner decided the coach part of the landing page is a STATIC section, not a
third scroll animation: coaches are few and motivated — they read. The section
is `webpage/Coach Console Section.html` — five real screens (Create block /
session builder / Plan week / 1V lineup / Athlete Notes) with plain explanatory
text and no animation, in the page's visual language, ready to slot in after
Blade Lock.

The capture roster's sides follow the standard rig — **stroke is strokeside
(port, red), 7 is bowside (starboard, green)**, alternating to bow. Keep it that
way when re-capturing: a rower reading the page will spot a mis-rigged eight
immediately. `webpage/Coach Console Story.html` (the animated
prototype) stays in the repo for reference only — do not wire it in.

### Original notes — frames + capture

The third scroll story (the buyer's side of Varsity Mode) is proposed in a
Claude artifact ("The Coach's Console" — ask the owner for the URL). Its eight
frames are already captured and committed as `public/landing/coach-*.webp`
(same 900×1479 canvas), with the beat copy, enter transitions and markers all
written in the artifact.

To re-capture (e.g. after the console's UI changes): the local dev server has
no Supabase env, so `fetchMyMembership` returns null and the console gate
bounces. Temporarily bypass the gate in `app/varsity/coach/layout.tsx`
(hardcode role "coach"), give `fetchTeamRoster` in `lib/varsity/notesStore.ts`
a demo-roster fallback, and swap the real roster in `lib/varsity/coachLineup.ts`
for FAKE names with port/starboard sides (the committed frames use fake names on
purpose — never ship the real squad list in marketing) — do NOT commit any of
these changes — then:

```
npm run dev
node scripts/landing/capture-coach.mjs   # seeds localStorage, walks the console
```

Frames are captured in the app's LIGHT theme (`uniThemeMode: "light"`), so the
screens read as lit screens on the story's dark page — same as the student
chapter. `coach-week-tall.webp` / `coach-boats-tall.webp` are full-scroll pan
strips. The interactive chapter prototype itself is committed as
`webpage/Coach Console Story.html` (a Claude artifact mirrors it — ask the
owner for the URL).

The seed inside `capture-coach.mjs` mirrors the athlete story exactly:
Fall 2026 block (Jul 13 – Oct 18), week 6 current, Head of the Charles 62 days
out, John Brown in the 1V's 3 seat, and his coach note ("fix it before the
Charles") — so the coach chapter and the athlete chapter read as one product.
