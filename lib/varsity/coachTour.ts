/*
  THE COACH CONSOLE TOUR — one walk, the first time a coach is in.
  ---------------------------------------------------------------------------
  Same machine and the same shape as the app's walk (lib/tour.ts) and Varsity
  Mode's (lib/varsity/varsityTour.ts), and rebuilt to match them (owner,
  2026-09-30: "same as in student mode … for coaches as well"): it asks first,
  crosses the five tabs in the order the bar has them, and says what each is
  for in one line. All the copy lives here (rule 7).

  (It used to be twenty-five steps that dived into the workout editor and
  built a session field by field. The student walk was cut to the bone the
  same day, and this one followed it.)

  THE SECOND CUT (owner, 2026-09-30): Today, Plan and Lineup are easy — one
  plain line each, and the lineup builder is no longer opened. Workouts then
  explains the ranking, Team shows the squad's averages and says a tap opens a
  person's profile, and the Settings step is gone ("it's useless" — the gear
  is still named in the closing card, which is where the replay lives).

  AND THEN THE OTHER WAY (owner, 2026-10-03): "think what a 60-year-old coach
  who sees the app for the first time would need — he knows how to enter a
  date or a name, but not repeat every week, or how to choose the intensity,
  or how to make lineups". So the walk SHOWS HOW again, where the how is not
  obvious. Plan opens a session and the finger writes one: the type, how
  hard, a usual workout, the time, sharing the results, Every week — then
  says what Done and Publish do. The editor is left with Back; Done is never
  pressed. Lineup followed (2026-10-04), then was cut back to three steps the
  same day: the day list, Repeat, and the pool, which says how to fill a seat.

  IT MUST SURVIVE AN EMPTY CONSOLE — no block, no lineups, maybe no athletes.
    Today      the Today section, which is there with or without a plan
    Plan       the block's card and its week tabs. With no block of its own
               the screen draws an EXAMPLE week while the walk is on
               (lib/varsity/coachTourExample.ts), so the session editor can be
               shown to the coach who needs it most
    Lineup     a practice of the next seven days, always there (the first
               that still needs its boats, or today's morning), and the
               builder's athlete pool, there with or without a plan or a crew
    Workouts   the Erg | Water | Ranking switch, plus the first row if any
    Ranking    the same switch, plus the list switch under it
    Team       the squad's week card (a dash when nobody logged), then the
               first rower

  IT CHANGES NOTHING. It opens the session editor and fills in its form, but
  leaves with Back, which keeps nothing; it never presses Done or Publish.
  The lineup builder saves by itself, so while a walk is on screen it writes
  nothing at all.
  Abandoned inside either, the walk presses its Back on the way out
  (closeOnExit).

  CAPTAINS DO NOT GET THIS. A captain's console is the squad screen and
  settings — most of these steps point at tabs they do not have. The gate in
  app/varsity/coach/layout.tsx only mounts it for a coach.
*/
import type { Tour, TourStep } from "@/lib/tour";

const TODAY = "/varsity/coach";
const PLAN = "/varsity/coach/plan";
const LINEUP = "/varsity/coach/lineup";
const WORKOUTS = "/varsity/coach/workouts";
const TEAM = "/varsity/coach/team";

/** The console's nav anchors are named after their route, as the app's are. */
const tab = (href: string) => `coach-tab-${href}`;

const steps: TourStep[] = [
  {
    route: TODAY,
    anchor: null,
    title: "Take a quick tour?",
    body: "How to plan the training, seat the boats and read the results.",
    next: "Show me",
  },

  /* ── Today ────────────────────────────────────────────────────────────── */
  {
    anchor: "coach-today",
    title: "Today",
    body: "Today’s and tomorrow’s sessions, and whether their boats are out.",
  },

  /* ── Plan ─────────────────────────────────────────────────────────────── */
  {
    press: tab(PLAN),
    route: PLAN,
    anchor: "coach-plan-status",
    alsoAnchor: "coach-plan-weeks",
    title: "Plan",
    body: "A training block is the weeks up to a race. Each week has its own tab.",
  },
  {
    // The day holding the gap the next step opens — from today on, so the
    // walk never writes into last Monday.
    anchor: "coach-plan-open-day",
    title: "Morning and afternoon",
    body: "Every day has two sessions. Tap one to write it.",
  },
  /*
    WRITING A SESSION, by the finger. It opens the first gap in the week from
    today on (coach-plan-open-slot), and each step presses the choice the last one
    pointed at — the first type that has an intensity, the first intensity,
    the first usual workout — so the form fills in front of the coach. The
    choices are the squad's own, from Training settings, so the steps name
    none of them.
  */
  {
    press: "coach-plan-open-slot",
    anchor: "coach-plan-type",
    group: "editor",
    title: "Type",
    body: "First, what kind of session it is.",
  },
  {
    press: "coach-plan-cat-first",
    anchor: "coach-plan-intensity",
    group: "editor",
    title: "Intensity",
    body: "Then how hard. Its colour marks the session on everyone’s calendar.",
  },
  {
    press: "coach-plan-int-first",
    // The box is always there; the usual workouts only once a squad has some.
    anchor: "coach-plan-desc",
    alsoAnchor: "coach-plan-options",
    group: "editor",
    title: "The workout",
    body: "Tap one of your usual workouts, or write your own in the box.",
  },
  {
    press: "coach-plan-opt-first",
    anchor: "coach-plan-time",
    group: "editor",
    title: "Time",
    body: "Filled in for you. Tap it to change it.",
  },
  {
    // The switch, tapped only while it is off (a session that already
    // shares its results is left as it is).
    press: "coach-plan-team-on",
    anchor: "coach-plan-team",
    alsoAnchor: "coach-plan-boards",
    group: "editor",
    title: "Share results",
    body: "Everyone logs their result, and it goes on one board under Workouts.",
  },
  {
    press: "coach-plan-repeat-weekly",
    anchor: "coach-plan-repeat",
    group: "editor",
    title: "Every week",
    body: "Write your regular week once. Every week fills in the rest of the block.",
  },
  {
    anchor: "coach-plan-confirm",
    group: "editor",
    title: "Done",
    body: "Puts it on the plan. Tap a session again to change it or remove it.",
  },
  {
    // Out with Back — nothing written in the walk is kept.
    press: "coach-plan-editor-back",
    anchor: "coach-plan-publish",
    title: "Publish",
    body: "The squad sees nothing until you publish. After that, every change reaches them as you make it, and Publish sends them a notification.",
    // A plan that is already out wears Unpublish here, or Publish again once
    // it has changed since the squad was told (PublishBar's data-tour-state).
    bodyWhen: {
      live: "It’s published, so every change reaches the squad as you make it. Change something and Publish comes back, to send them a notification. Unpublish hides the plan again.",
      edited: "It’s published, so your changes are already on the squad’s phones. Publish sends them a notification.",
    },
  },

  /* ── Lineup ───────────────────────────────────────────────────────────── */
  /*
    THREE STEPS (owner, 2026-10-04: "chci jen aby tam bylo 1, 3 a 7 u lineups
    a že tap a seat to fill it or drag it … jinak je to zbytečné"). The eight-
    step version opened a practice, added a boat, seated a rower and moved
    them; what is left is the day list, Repeat and the pool, which says how a
    seat is filled instead of acting it out. The finger still opens a practice
    for Repeat — on the squad's real one, which is safe because the builder
    writes nothing while a walk is on screen (LineupBuilderScreen). Repeat is
    pointed at, never pressed, and only where there is an earlier crew.
  */
  {
    press: tab(LINEUP),
    route: LINEUP,
    anchor: "coach-lineup-open-day",
    title: "Lineup",
    body: "Every practice of the next seven days. Each one says how far its lineup has got: not started, draft or published.",
  },
  {
    // Only where there is an earlier published crew; the builder says so
    // when there is not (data-tour-absent) and the step is passed at once.
    press: "coach-lineup-open-practice",
    anchor: "coach-lineup-repeat",
    title: "Repeat",
    body: "Starts from the last lineup you published. Then change only what’s different.",
  },
  {
    anchor: "coach-lineup-count",
    alsoAnchor: "coach-lineup-filters",
    title: "Athlete pool",
    body: "Everyone not in a boat. Tap a seat to fill it, or drag a name onto it. Anyone sick or injured is listed under Unavailable.",
  },

  /* ── Workouts ─────────────────────────────────────────────────────────── */
  {
    press: tab(WORKOUTS),
    route: WORKOUTS,
    anchor: "varsity-workouts-switch",
    alsoAnchor: "varsity-workouts-first",
    title: "Workouts",
    body: "Every team piece with everyone’s result, on the erg and on the water.",
  },
  {
    press: "varsity-workouts-ranking",
    anchor: "varsity-workouts-switch",
    alsoAnchor: "coach-ranking-lists",
    title: "Ranking",
    body: "Ranks every athlete by their erg tests, the race pieces they win on the water, and how much of the plan they did. Seat races list who beat whom.",
  },

  /* ── Team ─────────────────────────────────────────────────────────────── */
  {
    press: tab(TEAM),
    route: TEAM,
    anchor: "coach-team-week",
    title: "Team",
    body: "The squad’s average week: how far each rower went and how long they trained.",
  },
  {
    anchor: "coach-team-first-rower",
    title: "Profiles",
    body: "Tap anyone to see their profile. The pencil writes them a note.",
  },

  {
    anchor: null,
    title: "That’s it",
    body: "See it again anytime: Settings → Take the console tour.",
  },
];

/*
  The id stays "coach" — it is what the seen flag is keyed on, so changing it
  would re-offer the walk to every coach who has already had it. Walked out of
  inside the session editor or the lineup builder, it leaves with their Back.
*/
export const coachTour: Tour = {
  id: "coach",
  steps,
  closeOnExit: ["coach-plan-editor-back", "coach-lineup-back"],
};
