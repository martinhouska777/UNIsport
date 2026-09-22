# The intro video — plan, state, decisions

Written so a fresh session can pick this up. Companion to `LANDING.md`.

---

## The decision that shapes everything

**The reel is drawn in code, not generated and not edited in an app.**
`scripts/video/reel.mjs` builds the whole thing — run `node scripts/video/reel.mjs`
and an MP4 lands in `mockups/video/`. Rendered files are gitignored; the script
is the artefact.

**Generative video is the wrong tool for a product video.** AI models do not
preserve a UI: hand one a screenshot of the app and the text melts and the
buttons morph. So the app screens are real captures and every bit of motion is
drawn on top of them.

### Higgsfield — checked again 2026-09-22, and not used

The owner asked for Higgsfield specifically. Two facts closed it:

1. **The free plan cannot produce postable footage** — no credit allowance, and
   the pricing coverage is unanimous that free output is watermarked with no
   commercial rights. The 10 credits `VIDEO.md` recorded on 2026-09-05 would not
   cover one 5-second clip at 32.5 credits anyway.
2. **Their own pricing page says the unlimited models are "accessible only via
   higgsfield.ai and are not accessible on MCP/CLI"** — so even on a paid plan,
   an assistant driving it through MCP burns credits while the website does not.
   And no Higgsfield MCP is connected to this project.

Plans, for the record: Starter $19/mo (300 cr), Plus $59/mo or $47 annual
(5,000 cr), plus a $3 one-time for 40 credits. **None of it was bought.**

The owner then chose a faceless opener, which removed the only part a
generative model was wanted for. If atmosphere b-roll is ever wanted — a gym, a
boathouse, a campus at dawn — that is the one job worth paying Higgsfield for,
and it is generated on their website and dropped into `mockups/video/`.

---

## The footage already exists

`public/landing/` holds **99 captures** of the real app — light and dark, plus
tall full-screen shots made for panning:

- Student story: `01-gyms`, `02-match`, `03-why-you-match`,
  `04-plan-a-session`, `tall-logsheet`, `tall-profile`
- Varsity: `08-varsity-home` … `15-varsity-board`
- Coach: `coach-1-create` … `coach-5-notes`
- Per-school recolours: `closers/{gyms,match,vhome}-<school>.webp` (8 schools)

They were produced by the capture scripts in `scripts/landing/`, so any missing
shot can be re-taken the same way rather than screen-recorded by hand.

---

## Cut 1 — the launch reel, 23 s vertical (9:16), for Reels and TikTok

**Built and rendering.** `scripts/video/reel.mjs`, 1080x1920, 30 fps, ~5.8 MB.

The look was set by three reference reels the owner sent on 2026-09-22
(@motionbyjawad, @yorixedits, @yasin.vfx): near-black ground, one coloured glow
as the only light, the UI floating in 3D and flying past camera, kinetic italic
type with the key word underlined in the accent, a typed line, heavy bloom and
motion blur. How each is made is documented at the top of the script.

| Time | Shot | On screen |
|---|---|---|
| 0.0–2.7 | a point of light, then type on black | *Never train **alone** again.* |
| 2.5–6.7 | `dark/02-match.webp` | *Sorted by how well you **fit**.* + a typed line |
| 6.4–10.3 | `dark/04-plan-a-session.webp` | *Plan it in the **chat**.* |
| 10.0–14.3 | `dark/tall-profile.webp`, panned | *See where you **rank**.* |
| 14.0–18.4 | `dark/closers/match-<school>` ×8 | ***Eight** campuses. Each its own.* |
| 18.1–23.0 | end card | the mark draws itself · UNIsport · getunisport.com |

Three things that are deliberate, and will look like bugs if changed back:

- **The screens are the DARK captures.** The light ones vanish into this style.
- **The schools beat exists partly for safety.** Cycling all eight Ivy themes is
  the white-label story, and it stops the reel reading as one university's app —
  see `SOCIAL.md` §7B, never imply Harvard uses UNIsport.
- **The typed line is revealed by a clip, never by re-setting `textContent`.**
  Retyping re-centres the line every frame, and the motion-blur pass then
  averages two centrings into an unreadable double image. It shipped that way
  once.

**No sound.** The owner is adding music and sound effects himself.

**The on-screen lines are trimmed, and are NOT yet the owner's approved copy.**
`lib/landingCopy.ts` holds the approved wording; these were cut to caption
length by Claude and need his eye.

## Cut 2 — 45-60 s landscape, later

Same shots, held longer, for the top of the landing page and for emails to
coaches and athletic directors. Not started.

---

## Open, blocking on the owner

1. ~~**Domain**~~ — done. `getunisport.com`, bought 2026-09-19, and it is on the
   end card.
2. **Handles** — Instagram and TikTok accounts have to be created by the owner
   (an assistant cannot open accounts). `@unisportapp` was free on both when
   checked 2026-09-22 and is still not taken. Once they exist, the handles go
   into `contact.socials` in `lib/landingCopy.ts`, whose rows already render as
   "coming soon" until an `href` is filled in. **The reel has nowhere to be
   posted until this is done.**
3. **The on-screen lines** need the owner's eye — see Cut 1.
4. **Sound.** The owner is doing music and effects himself, so the export is
   silent on purpose.

---

## Cut 2 — the intro, 12 s vertical, WITH sound (2026-09-22)

**Built.** `scripts/video/intro.mjs` → `mockups/video/unisport-intro.mp4` (silent), then
`scripts/video/intro-sound.mjs` → `mockups/video/unisport-intro-sound.mp4`. Both .mp4 are
gitignored; re-run the two scripts to get them back (≈4 min).

The owner cut the reel down to its first half: no feature screens. What is in it:

| Time | Beat |
|---|---|
| 0.0–0.75 | a streak of light collapses into a cursor |
| 0.75–2.9 | "Never train alone again." types in. No word burns (owner). |
| 2.95–5.0 | the cursor walks back over "alone again." and types "with the right people." |
| 5.15 | the line burns off |
| 5.55–7.95 | "Choose your activity." — Gym · Running · Cardio; a hand taps Gym, then Cardio |
| 8.35–9.95 | two i-figures slide in, stop a hand apart, connect on the straight seam → the mark |
| 10.35 | the wordmark, then getunisport.com; fade at 11.75 |

Sound: the bed is a ChatCut-generated instrumental (mureka-9, project "UNIsport logo
explorations", asset "Intro bed"; music generation did NOT need Pro, image generation did).
It came back as sparse swells, so it is spliced: bed 0–9.95 s, then bed 14.3 s onward, so a
swell sits under the seam flash. Clicks, whooshes, taps and the impact are synthesised PCM in
`intro-sound.mjs`, timed off the same T table as the picture. Getting the mp3 out of ChatCut:
the asset download URL is session-authenticated (401 from curl); placing the asset on the
timeline and exporting `format: audio` gives a plain S3 URL that curl can fetch.

Keep: every headline character exists from frame one and is only hidden; the second line is
left-aligned under the first. Nothing re-lays out, so tmix never ghosts it.

---

## Cut 3 — the intro, LIGHT, for Instagram Reels (2026-09-22, evening)

**Built.** Supersedes cut 2. `scripts/video/intro.mjs` (picture, ~4 min) then
`scripts/video/intro-sound.mjs` (sound, seconds). Outputs (gitignored):
`mockups/video/unisport-intro-reel.mp4` — SFX only, THE FILE FOR INSTAGRAM (add the
trending track there); `unisport-intro-bed.mp4` — SFX + the generated bed, for anywhere else.

The owner's revised brief is at the top of intro.mjs. What changed from cut 2: white ground,
brand blue ink (mark keeps its navy); headline in Instrument Serif italic with a typewriter
rhythm (seeded jitter, written to `intro-times.json` so sound and picture share it); the
activities are plain labels with a BORDERED ICON TILE under each (Gym · Running · Cardio),
tapped tiles fill blue; "Find training partners." → the two i's stop a hand apart → the label
types "Match." as they close the gap → the mark → the real wordmark (UN in ink, barbell I,
sport in blue). Camera: slow push while typing, pull back on each change, punch on the connect.

Sound: real ChatCut LIBRARY sound-effects (free, unlike image generation). They cannot be
downloaded singly, so they were parked one per 10 s slot on the ChatCut timeline and exported
as one audio file: `mockups/video/sfx-bank.mp3` (slots listed in intro-sound.mjs). Every typed
character plays a random 70 ms slice of the keyboard loop. No music is baked into the reel
file on purpose — Instagram's own licensed audio goes on top. The "Montagem" track the owner
mentioned is not in the repo and was not ripped from the reference reels: add it in Instagram.

Gotcha: element ids. The headline's characters own ids a0…, b0…, p0…, m0…; anything else
must not use those prefixes (the activity tiles did, and silently hid three letters).

---

## Cut 4 — the intro, light v2 (2026-09-22, night). CURRENT.

Owner changes over cut 3: headline CENTRED and typed exactly like the landing page (38 ms a
letter, steady, thin caret — `StudentIntro.tsx` TYPE_MS / `.l-caret`); the reference reel's
own tap and typing sounds; more time at the end — the two i's wait a hand apart, "Match."
types, then a SLOW 1.4 s fill until they connect; "Match." goes, "UNIsport" types itself ABOVE
the mark in the real wordmark; NO domain — "Live now at Harvard" under the mark. 14.2 s.

The reference's sounds sit under its music, so they were lifted with a high-pass filter:
`mockups/video/ref-keys.wav` (5.35–6.05 s of the reel, >1.4 kHz) and `ref-tap.wav` (7.995 s,
>500 Hz). Both gitignored with the other media; the cut points are in intro-sound.mjs. Every
typed character plays a random 55 ms slice of ref-keys. Whooshes/riser/hit from the ChatCut
bank as before, plus a slowed-down deep whoosh as a "drone" under the fill.

Zone-1 note: "Live now at Harvard" is the owner's line (SOCIAL.md §7B said never imply Harvard
uses UNIsport; the owner chose it anyway on 2026-09-22, same as the waitlist copy).

---

## Cut 5 — light v2, no edit, library keys (2026-09-22, later that night). CURRENT.

Owner on cut 4: the reference-reel typing sound "is horrible" (it can only be lifted from under
the reel's music with a high-pass, which thins it to a hiss) and "cut the with the right people
part, go straight to choose your activity". So: the headline types, holds a beat, lifts, and the
activities follow. The keys are the ChatCut library's real keyboard recording again; the
reference lift stays in the repo as an opt-in (`USE_REF_KEYS=1`). 12.65 s.
