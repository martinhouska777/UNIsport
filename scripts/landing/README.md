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
| `capture.mjs` | the varsity stills — home, race, log sheet, team, lineup |
| `capture-varsity-tall.mjs` | tall strips for the pans (home, profile, calendar) |
| `capture-tall3.mjs` | the student tall strips (a logged session, the profile) |

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

## Agreed but not yet done

1. **Shoot the confirmation card** ("did this happen?" → verified workout) and
   make it a student beat. It is the app's most distinctive mechanic and is
   currently absent from both animations.
2. **Cut student beat 6** ("A record you'll actually keep") — its headline
   promises photos while the frame shows an empty photo slot.
3. **Merge Varsity V3 + V4** — the coach's note is too small to hold a beat of
   its own.
4. **Add a closing Varsity still** returning to the published lineup, so the
   section ends on the boat rather than a statistics graph.
5. **Beat 1 copy** → "First, every gym on campus." — bridges the hero's promise
   about people into a screen full of buildings.
6. **Unresolved:** the demo students have no profile photos, so the match screen
   is a row of placeholder glyphs under a headline about finding people. Needs
   either generated portraits or a crop that avoids the avatar row.
7. **Then:** stitch the four sections into one page and port into `app/page.tsx`
   using the `l-*` design tokens (rule 1 — no hex literals in components).
