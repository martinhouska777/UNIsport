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
