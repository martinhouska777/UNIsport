# Prompt for the new session: the app walk, ready to shoot

Paste this into the new session.

---

For the tutorial make sure that everything works and it's smooth. For example, when you're supposed to click on leaderboards it clicks differently, so fix that and make sure it's smooth. And also do a fake name and not Martin Houska, then we will shoot it.

---

## What the last session found before it stopped (2026-10-18)

- The walk is `lib/tour.ts` (steps) and `components/tour/TourOverlay.tsx` (the engine). Read the last block of the memory note `project_first_run_tour.md` first (commit `2175cfd`, 12 steps).
- Leaderboards step: the finger taps the Profile strip (`profile-leaderboards`, `components/leaderboards/LeaderboardStrip.tsx`), then lights the Competition and Period arrows (`lb-controls`) with the podium (`lb-podium`). A tap on the arrows is passed through to the real button (`live: "lb-controls"`, `tapLight` in TourOverlay). Not reproduced yet. Suspects: after a switch the board goes to "Counting…", so the light shrinks to the arrows and then grows back; Dorms and Everyone can be empty (the example houses only fill Houses); a tap anywhere else in the light is Next and jumps to the closing card.
- Name: the account signed in to the Browser pane is the demo account martinhouska701 (id 67fd65e5…). Its Profile shows "Martin Houska" in the top bar and under the photo. It needs a made-up name for the shoot. Also check the Everyone board and Match for the second account (777), which is also called "Martin Houska".
- The walk accepts a REAL invite if one is waiting on the account; with none it shows the example chat (Nina Alvarez).
- Seen in passing, not checked: the trophy picture in the Profile's Leaderboards strip looked broken.
- Another session has uncommitted work in `app/(app)/gyms/page.tsx`, `components/gyms/GoingLine.tsx`, `lib/buddyBoard.ts`, `components/onboarding/OnboardingFlow.tsx` and `app/varsity/(athlete)/layout.tsx`. Stage only your own files.
