/*
  HOW EACH BEAT MOVES — the mechanics of the two scroll stories, keyed by the
  beat ids in lib/landingCopy.ts (S1…S7, V1…V6).

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
  /* ── the student story ── */
  S1: {},
  S2: { enter: "tab", tap: [37.5, 95.5] },
  S3: { enter: "zoom", tap: [26, 54] },
  S4: { enter: "push", tap: [68, 86.5], pointer: true },
  // hold 0.25: the sheet is at its very top the moment the beat appears, then
  // the whole scroll happens on screen instead of starting mid-page.
  S5: { pan: [0, 0.75], hold: 0.25, side: "left", enter: "push" },
  S6: { pan: [0.75, 1], side: "left", enter: "none" },
  // The profile scrolls from the name down to the leaderboard ranks and comes
  // to rest on the session calendar — the month is the closing image.
  S7: { pan: [0, 1.3], hold: 0.2, side: "left", enter: "dismiss", tap: [50, 95] },

  /* ── the varsity story ── */
  // V1 carries the scroll all the way down to the lineup, so V2's headline
  // arrives with the boat almost centred rather than announcing it early.
  V1: { pan: [0, 0.5], hold: 0.45 },
  V2: { pan: [0.5, 0.8], enter: "none" },
  // The race and the note share one window on a home screen this short.
  // `to` past 1: the pan hits the very bottom mid-beat and rests there.
  V3: { pan: [0.74, 1.2], enter: "none" },
  V4: { side: "left", enter: "sheet", tap: [50, 92.7] },
  // Logged a workout → over to the Calendar tab, where it just landed.
  V5: { side: "left", enter: "tab", tap: [30.8, 94] },
  V6: { pan: [0.06, 0.42], side: "left", enter: "tab", tap: [88.4, 93.3] },
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
  "tall-logsheet.webp": { w: 900, h: 4372 },
  "tall-profile.webp": { w: 900, h: 2140 },
  "tall-vhome.webp": { w: 900, h: 3016 },
  "tall-vprofile.webp": { w: 900, h: 2473 },
};
