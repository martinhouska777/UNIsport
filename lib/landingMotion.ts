/*
  HOW EACH BEAT MOVES — the mechanics of the two scroll stories, keyed by the
  beat ids in lib/landingCopy.ts (S1…S4, V1…V5).

  This is deliberately NOT in landingCopy.ts, which stays readable by someone
  who does not read code. It mirrors, exactly, the per-beat motion fields in
  scripts/landing/build-story.mjs — the prototype artifact — so the site plays
  the same film. Change a value here and in the build script together, or the
  two disagree (the same sync obligation the copy has until the artifact is
  retired).

  Fields:
    pan      [from, to] — fractions of a TALL capture's travel this beat
             scrolls through inside the phone. Consecutive beats sharing a
             strip continue the same scroll. `to` past 1: reach the bottom
             early and rest there.
    hold     0…1 — share of the beat during which the strip sits still before
             the pan starts (the opening frame needs a moment to be read).
    enter    how the screen ARRIVES, so a cut reads as something the user did:
               push     drilled in — new screen slides in from the right, the
                        old one drifts left behind it (iOS navigation)
               tab      switched tab — the same slide, no parallax
               sheet    a sheet rises from the bottom over the screen behind
               dismiss  the sheet drops back down, revealing what was under it
               zoom     the old screen magnifies into the tapped button and
                        dissolves; the new one settles in from slightly small
               none     the same screen continuing (consecutive pans)
               (omitted) plain crossfade
    tap      [x%, y%] — where on the OUTGOING screen the tap that caused this
             arrival lands; a ring pulses there first, then the move follows.
             Measured off the live app, not guessed.
    pointer  an arrow walks in and presses the tap (S4's "one tap to accept").
    side     which side of the page the phone sits on for this beat; "left"
             flips it across (once per story, at the narrative pivot).
*/

export type Enter = "push" | "tab" | "sheet" | "dismiss" | "zoom" | "none" | "fade";

export type BeatMotion = {
  pan?: [number, number];
  hold?: number;
  enter?: Enter;
  tap?: [number, number];
  pointer?: boolean;
  side?: "left" | "right";
};

export const motion: Record<string, BeatMotion> = {
  /* ── the student story (4 chapters, one screen each — 2026-09-15) ── */
  S1: {},
  // The chat is reached from a person's profile in the app, and that screen is
  // not in the walk any more, so the arrival is a plain drill-in with no ring.
  S2: { enter: "push" },
  // Over to the Profile tab (4th of 4 in the capsule), then the whole sheet
  // scrolls: name and counts, the leaderboard strip, the session calendar,
  // Memories. hold 0.2: the top is read before the pan starts.
  S3: { pan: [0, 1], hold: 0.2, side: "left", enter: "tab", tap: [87.5, 95.5] },
  // ...and back to the Gyms tab (1st of 4), which the Campus Colours closer
  // then carries on in eight schools' colours.
  S4: { side: "left", enter: "tab", tap: [12.5, 95.5] },

  /* ── the varsity story (5 chapters, one screen each — 2026-09-15) ── */
  // ONE chapter pans the whole Home screen: plan, lineup, race bar, coach's
  // note. `to` past 1: it reaches the bottom before the chapter ends and rests.
  V1: { pan: [0, 1.2], hold: 0.3 },
  V2: { side: "left", enter: "sheet", tap: [50, 92.7] },
  // Logged a workout, so over to the Calendar tab, where it just landed.
  V3: { side: "left", enter: "tab", tap: [30.8, 94] },
  // The Workouts board really is a sheet you pull up (Team → Workouts → tap a
  // row): the ring presses "Team" on the calendar's tab bar, then it rises.
  V4: { side: "left", enter: "sheet", tap: [69.1, 93.2] },
  // ...and the statistics arrive the way a sheet leaves: the ring presses the
  // board's own close X (top right of that capture) and the sheet drops away.
  V5: { side: "left", enter: "dismiss", tap: [92.4, 20.3] },
};

/* The natural size of every capture the stories ride, so <Image> can reserve
   the box before the file arrives (nothing shifts) and the pans know how far
   a tall strip travels. Stills are 900×1480; the strips are taller. */
export const shotSize: Record<string, { w: number; h: number }> = {
  "01-gyms.webp": { w: 900, h: 1480 },
  "02-match.webp": { w: 900, h: 1480 },
  "03-why-you-match.webp": { w: 900, h: 1480 },
  "04-plan-a-session.webp": { w: 900, h: 1480 },
  "13-varsity-log-list.webp": { w: 900, h: 1480 },
  "14-varsity-calendar.webp": { w: 900, h: 1480 },
  "15-varsity-board.webp": { w: 900, h: 1480 },
  "16-varsity-stats.webp": { w: 900, h: 1480 },
  "tall-logsheet.webp": { w: 900, h: 4417 },
  "tall-profile.webp": { w: 900, h: 2176 },
  "tall-vhome.webp": { w: 900, h: 3098 },
  "tall-vprofile.webp": { w: 900, h: 2502 },
};
