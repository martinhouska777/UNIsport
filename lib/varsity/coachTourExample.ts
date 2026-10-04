/*
  THE EXAMPLE WEEK — the training plan the console walk shows a coach who has
  not made one yet.
  ---------------------------------------------------------------------------
  The walk's Plan part opens a session and goes through how one is written:
  the type, how hard, the usual workouts, sharing the results, repeating it
  every week (lib/varsity/coachTour.ts — owner, 2026-10-03: "think what a
  60-year-old coach who sees the app for the first time would need"). All of
  that lives inside a training block, and a new coach's console has none — so
  without this, the one person the walk is for would see nothing of it.

  It is on screen only while the walk is, and only on a console with no block
  of its own: TrainingPlanScreen draws it in place of the empty "No training
  blocks yet" card, wearing an Example tag, and writes none of it. When the
  walk ends the screen is empty again. A coach WITH a plan is walked through
  their own week instead.

  A believable rowing week in the rowing preset's own words
  (lib/varsity/coachPlan.ts), starting this Monday and running six weeks to a
  race, with gaps left where a real week has them — the walk opens the first
  empty one (Monday afternoon) to write a session into.
*/
import {
  addDays,
  presetTime,
  sessionKey,
  toISO,
  parseDate,
  type Block,
  type Period,
  type Session,
  type SessionMap,
} from "@/lib/varsity/coachPlan";

export const TOUR_EXAMPLE_BLOCK_ID = "tour-example-block";

/* Each day of the week, Monday first, as [morning, afternoon]. null = nothing
   planned. */
const WEEK: [Omit<Session, "time"> | null, Omit<Session, "time"> | null][] = [
  [{ category: "water", intensity: "UT2", description: "16k UT2" }, null],
  [
    { category: "erg", intensity: "UT1", description: "4×12' UT1" },
    { category: "weights", description: "Full body" },
  ],
  [{ category: "water", intensity: "UT2", description: "18k UT2" }, null],
  [
    { category: "water", intensity: "hard", description: "3×2k", teamWorkout: true, board: "ranked" },
    null,
  ],
  [
    { category: "erg", intensity: "UT2", description: "70' steady state" },
    { category: "weights", description: "Full body" },
  ],
  [{ category: "water", intensity: "UT1", description: "3×12' @ 28" }, null],
  [{ category: "off", description: "" }, null],
];

export type CoachTourExample = { blocks: Block[]; sessions: SessionMap };

/** The example plan, built around today. */
export function coachTourExample(today = new Date()): CoachTourExample {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const start = toISO(monday);
  const end = addDays(start, 6 * 7 - 1);

  const sessions: SessionMap = {};
  WEEK.forEach((day, di) => {
    const date = parseDate(addDays(start, di));
    (["AM", "PM"] as Period[]).forEach((p, pi) => {
      const s = day[pi];
      if (s) sessions[sessionKey(date, p)] = { ...s, time: presetTime[p] };
    });
  });

  return {
    blocks: [
      {
        id: TOUR_EXAMPLE_BLOCK_ID,
        name: "Example block",
        start,
        end,
        status: "draft",
        raceName: "Head race",
        raceDate: addDays(start, 6 * 7 - 2),
      },
    ],
    sessions,
  };
}
