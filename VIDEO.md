# The intro video — plan, state, decisions

Written so a fresh session can pick this up. Companion to `LANDING.md`.

---

## The decision that shapes everything

The Higgsfield account is on the **free plan with 10 credits**, and holds **no
unlim allowance** (`models_explore` → `unlim.available: false`, checked
2026-09-05). One 5-second generative clip costs **32.5 credits**
(`generate_video` `get_cost` on `seedance_2_5`, 5s, 9:16). A seven-shot cut of
generated footage would therefore cost ~230 credits — none of which we have.

**That is fine, because generative video is the wrong tool for this video.**
AI video models do not preserve UI: hand one a screenshot of the app and the
text melts and the buttons morph. The spine of a product video is real
footage plus designed graphics.

So:

| Layer | Tool | Costs generative credits? |
|---|---|---|
| **The whole video** — screens, motion, titles, captions, end card | `video-editing` (higgsedit) via Higgsfield MCP | No |
| *Optional* atmosphere b-roll — gym, water, campus | `generate_video` | Yes, ~32.5 cr / 5s |

The video works with the first row alone. The second row is garnish, and only
if the owner tops the account up.

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

## Cut 1 — 30 s vertical (9:16), for Reels and TikTok

The beats are `studentStory` S1–S7 in `lib/landingCopy.ts`. **The on-screen
lines are the owner's own approved copy**, trimmed to caption length — not new
writing. Change them there, not here.

| Time | Shot | Caption |
|---|---|---|
| 0:00–0:03 | phone flies in | **Never train alone again.** |
| 0:03–0:07 | `01-gyms.webp` | Every gym on your campus. |
| 0:07–0:12 | `02-match.webp`, scrolling | Find training partners. Make friends. |
| 0:12–0:16 | `03-why-you-match.webp`, push in on "Why you match" | Same gym. Same hours. Same interests. |
| 0:16–0:20 | `04-plan-a-session.webp` | Plan it in the chat. |
| 0:20–0:25 | `tall-logsheet.webp`, pan down to the photo | Log it. Keep the photo. |
| 0:25–0:29 | `tall-profile.webp`, leaderboard | See how you rank on campus. |
| 0:29–0:32 | end card | UNIsport · handle + domain |

No voiceover — music and captions only, because the feed is watched muted.

## Cut 2 — 45-60 s landscape, later

Same shots, held longer, for the top of the landing page and for emails to
coaches and athletic directors. Not started.

---

## Open, blocking on the owner

1. **Domain** — the end card and the bio link need one; the site is still on
   `un-isport.vercel.app`.
2. **Handles** — Instagram and TikTok accounts have to be created by the owner
   (an assistant cannot open accounts). Once they exist, the handles go into
   `contact.socials` in `lib/landingCopy.ts`, whose rows already render as
   "coming soon" until an `href` is filled in.
3. **Top up Higgsfield?** Only needed for the optional b-roll.
