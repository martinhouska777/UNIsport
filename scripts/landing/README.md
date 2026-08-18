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
| Scroll animations, self-contained | `webpage/Scroll Animations.html` (full, 2.5MB) and `(slim).html` (~1MB, for uploading) |
| Varsity static closer (from Claude Design) | `webpage/Blade Lock Light.html` |
| Student static closer (from Claude Design) | `webpage/UNIsport Campus Colours.html` |
| The build script for the animations | `scripts/landing/build-story.mjs` |
| The closers' real screens, per school | `scripts/landing/recolored/*.webp` (+ `patches/` headers) |

The published prototype is the owner's artifact:
**https://claude.ai/code/artifact/7c4ae5b7-8fdf-4310-94ee-55cff6fe4641**
Re-publish `story.html` to that same URL (pass it as `url`) — a fresh publish
would strand the owner on the old link.

Build, check, publish:

```
node build-story.mjs      # writes story.html
node verify-reverse.mjs   # the student closer, 11 checks
node verify-blades.mjs    # the varsity closer, 13 checks
node make-slim.mjs        # syncs both webpage/ copies (slim = recompressed)
```

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

> **Ported.** Both closers now exist as native React components —
> `components/landing/CampusColours.tsx` and `BladeLock.tsx`, on the scratch
> route `/closers-preview` — with the school data in `lib/landingSchools.ts`
> and the copy in `lib/landingCopy.ts`. Everything below is how the
> **prototype artifact** still does it (it is built from these files, and it
> stays that way until the stories are ported and the page assembled). To read
> a design bundle's real source, decode the base64 (gzip) entries of its
> `<script type="__bundler/manifest">` and its `__bundler/template` — the
> template is an ~20–40KB HTML file with the layout and logic in the clear.

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
so structure is the only stable handle.

**The app's bottom tab bar is drawn by us**, not by the design files — they
render a phone without one. If a re-export ever includes one, delete
`buildTabs()` and the `.__tabs` rules rather than ending up with two. (The
student closer needs no bar: its real screen carries the app's own.)

Two gotchas that cost time, both from the page being built inside a template
literal: a regex literal in an emitted script loses its backslashes (use string
splitting), and any backtick in an emitted comment ends the literal early.

### Reaching inside a piece

Both pieces are React apps. Their component instance is reached through the
fiber tree (`__reactContainer$…` on a host node → walk to a `stateNode.logic`),
which is how the page:

- **stops the wheel** on Harvard as the reader arrives, and **releases it**
  (`setState({pinned:false})`) the moment the oars spread, so the rotation is
  the piece's own continuous one. Pacing it with clicks is what used to make
  it jump.
- **reads which school is showing** (`state.active` on the wheel, `state.idx`
  on the letter piece) to keep the phone's real screen in step, mapped through
  the piece's own `schools` array.

A prop write does NOT survive their re-renders — that is why the blades' glow
is killed with a stylesheet rule (`button[aria-label$=" Rowing"]{filter:none
!important}`) rather than by setting `oarGlow`.

### The closers' phones show the REAL app

`recolor-shots.mjs` builds `recolored/{gyms,vhome}-{school}.webp` from the same
captures the stories fly with: every crimson-family pixel is shifted into the
school's palette (taken from the design pieces' own data, second colour
included — Penn's blue-red-blue), leaving whites, greys, golds and photos
alone. Harvard is the untouched original, so the flight lands on the exact
pixels it left with. `patch-vhead.mjs` renders the per-school varsity header
("<School> Rowing", chevron, shield initial) that is baked into the capture.

In the page those images sit over the piece's drawn phone as the same
statusbar/capture/gesture-bar sandwich the flying phone is built from, and
crossfade as the piece cycles.

### The transition (both closers, desktop ≥1024px)

An **in-place cut**, not a camera move: the page is held still while the story
fades to black around the phone, the scroll is cut to the pinned closer while
only the phone is visible, and the phone then glides into its place. The words
arrive from the right; the letter swings out, or the oars rise from behind the
phone as a miniature of the whole wheel (`oarPose`, measured in an unpainted
pass — the pieces compose their own depth transform with ours), hold, and
spread onto the already-turning wheel.

One nudge up plays it backwards: `retractCloser()` puts everything back the way
it came, then `runFlightBack()` flies home.

**Three traps, all of which cost real time:**

1. The closer is a full-screen iframe, so **wheel events never reach the
   window** — every wheel listener (the reverse trigger, both flights'
   release, the retract hold) must ALSO be bound on `f.contentDocument`.
2. The reverse must trigger from **anywhere on the landed closer**, not just
   the pin's start — smooth scrolling delivers the events deep in the cushion.
3. `prime()` is **once per document**, and an arrival that finds a closer
   unprimed must prime first and arrive after: two `whenReady` chains used to
   race, the loser re-hiding a phone the winner had revealed.

The flight only runs when the story's phone is actually near the screen; a
reload with the scroll restored at a closer reveals it in place instead.

## The transition is signed off (2026-08-17)

The owner reviewed it to "otherwise perfect". Both closers now: real screens
throughout, in-place cut both ways, reversible from anywhere, continuous
wheel, no blade glow, real log button, tab-switch slides. Small tweaks may
still come, but the mechanism is settled — **change it only when asked.**

Mobile (<1024px) deliberately does NOT fly: the closers reveal in place. That
path is the least-reviewed part of the page.

## Agreed but not yet done

1. **Shoot the confirmation card** ("did this happen?" → verified workout) and
   make it a student beat. It is the app's most distinctive mechanic and is
   currently absent from both animations.
2. **Beat 1 copy** → "First, every gym on campus." — bridges the hero's promise
   about people into a screen full of buildings.
3. **Unresolved:** the demo students have no profile photos, so the match screen
   is a row of placeholder glyphs under a headline about finding people. Needs
   either generated portraits or a crop that avoids the avatar row.

## Next: turning this into the webpage

Agreed plan, in this order — do NOT jump to the port:

1. **Content pass.** All copy lives in the two beat arrays at the top of
   `build-story.mjs`; the owner sends text and button labels, we rebuild and
   re-publish to the artifact URL for review.
2. **Structure pass.** Section order, plus any new sections (pricing, FAQ,
   contact). **A story and its closer are a welded pair** — the phone flies
   between them, so nothing may sit in between. Everything else is free to
   move: hero, interlude, CTA, and new sections between blocks.
3. **Port into `app/page.tsx`** with the `l-*` design tokens (rule 1 — no hex
   literals in components), signup wired to the real login, and the embedded
   screenshots served as real image files instead of data URIs (the page is
   2.5MB self-contained). Do this ONCE, after content and structure freeze.
