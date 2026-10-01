# Settings, round 3 — the Coach Console's Settings

The owner's handoff file, written so another Claude session (or another account)
can pick this up mid-way. **The Checklist at the bottom is the live state — read it
first.** Plain English; the owner does not read code.

Rounds 1 (student Settings) and 2 (Varsity Mode Settings) are done. Round 3 is the
Coach Console's Settings: `/varsity/coach/settings` and the pages under it.

---

## 1. What the review found (2026-10-01)

Done signed in as the owner's coach account, at phone and laptop width, plus the
captain's version on a throwaway page.

**a) Broken or stale**
1. A coach has no notifications of their own. Varsity Settings → Notifications shows
   them "From your coach" (Training plan / Lineups / Notes to you) — what the squad
   gets. (A SECOND coach on the same squad does get the first coach's plan and
   lineup notifications, so the switches are not useless for every coach.)
   **`db/varsity_push_kinds.sql` is still NOT applied** (checked in the database on
   2026-10-01) — until it is, a rower who turns off Lineups or Training plan still
   gets them. The owner runs it:
   `node C:/Unisport/scripts/db/run-sql.mjs C:/Unisport/db/varsity_push_kinds.sql`
2. The console's light/dark switch is labelled with the state ("Light mode" with
   the switch off reads as "light mode is off").
3. Colour picker: the grey swatch draws BLACK (grey text became black on 30 Sep);
   two near-identical dark greens.
4. Intensity zones stuck in the order UT2 · Hard · UT1, no way to reorder (the plan
   editor's zone buttons follow it).
5. Boats listed 4+, 4−, 8+, 2− (the race board goes 8+, 4+, 4−, 2−), no way to reorder.
6. Settings → Squad = 5 app accounts; the Team tab's roster = 64 rowers.
7. Squad rows: the arrow sits in the middle of the row.
8. Explaining sentences (Waiting room, the two invite cards, "Saved for the squad.").
9. Old invite links pile up forever and say "Expired … · expired".
10. Session times are a typed box ("7am" quietly breaks the Enter-times preset).
11. The Workout library has a list for "Off".
12. Varsity Settings → "Open Coach Console" lands on Plan, not Today.

**b) Missing — proposals only, NOTHING here gets built unless the owner picks it**
coach notifications (someone waiting to join…) · semester dates (Ranking's
"Semester" is the last 91 days) · Enter-times warm-up (fixed 1 h) · rowers see
seat-race results · default for "Share results with the squad" · Units in the
console · remove someone from the squad · card/Privacy/Terms/Log out in the console
· Ranking's opening window (not recommended).

**c) Look** — round 2's grouped look: a title bar, the person card on top, rows in
white grouped cards with hairlines, the save line in the title bar.

---

## 2. What the owner said, and what was chosen

The owner, after the review: **"start doing the changes"** — no option was picked
one by one. So each choice below is the option that matches round 2 or changes
least, and every one can be reversed. Nothing from (b) is built.

| Item | Chosen | Why |
|---|---|---|
| c menu | **B** — stays inside the console (top bar + tabs), restyled | A captain's whole console IS Settings; a full-screen page would take away their Team tab |
| c card | **A** — opens the varsity profile | Same as Varsity Settings' card |
| a2 light/dark | **A** — a Design row opening the same Design page (Light / Dark pictures) | Same as student and Varsity Settings |
| a8 explaining text | **A** — cut, titles kept | The standing no-explainer rule |
| a7 squad arrow | at the end of the row | no choice |
| a9 old links | **B** — folded under "Old links (N)", "expired" said once | Nothing lost, nothing new to build in the database |
| c squad | **A** — Make captain stays a pill on the row | least change |
| c training | Add rows inside the cards, the tick box becomes a switch, "Saved ✓" in the title bar | round 2's look |
| a3 colours | grey swatch = real grey (the theme's faint grey); **the two greens are left alone** — owner picks a replacement | the replacement colour is taste |
| a4 / a5 order | **A** — press and drag to reorder | the owner removed the arrows on 18 Sep |
| a1, a6, a10, a11, a12 | **left as they are** — owner to pick | each one changes behaviour |
| c laptop gear, captain's one-tab bar | **left** | owner to pick |

---

## 3. How to continue (for the next session)

1. Read `CLAUDE.md`, then this file's Checklist.
2. `git fetch` and `git log -15` — another Claude session works in this repo at the
   same time. Stage files BY NAME, never `git add -A`.
3. Take the first unticked slice. After it: `npx eslint <changed files>` (watch for
   `rules-of-hooks`), `npx tsc --noEmit`, commit, push, tick it here, commit this
   file, and send the owner a screenshot.
4. Seeing the console needs the owner signed in (the Browser pane on
   `localhost:3000` holds their session). A captain's view: a throwaway page that
   renders `TeamAdminScreen` with `{ ...membership, role: "captain" }` inside
   `CoachTopBar` / `CoachNav role="captain"` — delete it before committing.
5. Rules: colours from theme tokens only, no explaining text under rows, inputs at
   16px, no medals in coach views, no Exit button in Varsity Mode, sick days stay
   counted in Consistency. Don't add anything the owner didn't pick.

Files: `components/varsity/coach/team/TeamAdminScreen.tsx` (menu + Waiting +
Invites + Squad), `components/varsity/coach/settings/TrainingSettingsScreen.tsx`,
`components/varsity/coach/settings/SettingsHeader.tsx`, routes under
`app/varsity/coach/settings/`. The round-2 pieces to reuse:
`components/settings/SettingsShell.tsx` (Group, Row, ToggleRow, ProfileCard).

---

## Checklist

- [x] **Slice 1 — the menu.** (done 2026-10-01, see git log "settings round 3, slice 1") Title bar, your card, grouped rows (Administration ·
      Training · Design · Help). The light/dark switch becomes a Design row.
- [x] **Slice 2 — Waiting / Invite links / Squad.** One card with hairlines, the
      sentences cut, old links folded, the squad arrow at the end. (done 2026-10-01;
      also: a photo circle per person, and the role moved into the grey line under
      the name — as a pill it left a 375px phone ~70px for the name)
- [x] **Slice 3 — Training settings look.** (done 2026-10-01, see git log "settings
      round 3, slice 3") Each list is one white card with hairlines, ending in a
      "+ Add a type / zone / boat" row in the school colour; boats show their
      symbol in bold on the left; session times are AM / PM rows with the typed
      box on the right; "Saving… / Saved ✓" sits in the title bar (which stays put
      while the page scrolls); the floating "Saved for the squad." card is gone —
      a card with Retry appears only when a save fails; "Asks for an intensity"
      and "Has a cox" are the app's switch instead of a tick box; the grey swatch
      is a real grey (var(--faint)). Checked at phone and laptop width on a
      throwaway page (deleted) with no login, so it saved to the browser only.
- [x] **Separate, not part of round 3 — the grey marks that turned black.**
      (owner, after seeing a before/after of a teammate's calendar: "fix it if
      its a problem"; done 2026-10-01, see git log "grey marks") Every MARK that
      used var(--muted) / bg-muted / bg-text-3 is var(--faint) now: the
      calendar's neutral blocks (training outside the plan — on a teammate's
      calendar that was nearly every block) and its Off / Other dots, Other in
      the Log tab and the statistics, the result and telemetry bars, the status
      dots (lineup "Not started" / "Rest day", "No lineup yet", the profile
      tone dots), the lineup card's cox divider line, the race board's dashed
      empty boxes, the profile's dashed edit underline, the gym crowd chart's
      current-hour bar, and the fallbacks. Words stay black (the owner's
      2026-09-30 call), chart labels included. A colour a coach saved as the old
      grey is read as the new grey (`regrey` in lib/varsity/configStore.ts), so
      the colour picker no longer needs its own check for it.
- [ ] **Slice 4 — reorder zones and boats** by press-and-drag.
- [ ] **Owner:** run `db/varsity_push_kinds.sql` (command in 1.a1).
- [ ] **Owner to pick:** a1, a6, a10, a11, a12, the second green (a3), anything from
      (b), the laptop gear highlight, the captain's one-tab bar.
