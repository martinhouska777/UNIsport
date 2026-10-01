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

  IT MUST SURVIVE AN EMPTY CONSOLE — no block, no lineups, maybe no athletes.
    Today      the Today section, which is there with or without a plan
    Plan       the block's card (Publish lives on it) and the first day — or,
               with no block yet, the "No training blocks yet" card, which
               wears the same anchor
    Lineup     the first day of the week, always there
    Workouts   the Erg | Water | Ranking switch, plus the first row if any
    Ranking    the same switch, plus the list switch under it
    Team       the squad's week card (a dash when nobody logged), then the
               first rower

  IT CHANGES NOTHING AND OPENS NOTHING — it only moves between the tabs and
  presses the Ranking switch, so there is nothing to close on the way out.

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
    body: "The Coach Console in thirty seconds.",
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
    alsoAnchor: "coach-plan-first-day",
    title: "Plan",
    body: "Write the training once and it’s on every athlete’s Home and calendar. Nobody sees it until you publish.",
  },

  /* ── Lineup ───────────────────────────────────────────────────────────── */
  {
    press: tab(LINEUP),
    route: LINEUP,
    anchor: "coach-lineup-first-day",
    title: "Lineup",
    body: "Seat the boats for every practice. Publish, and everyone sees their seat on Home.",
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
  would re-offer the walk to every coach who has already had it. The walk
  opens nothing it would have to shut, so `closeOnExit` is empty.
*/
export const coachTour: Tour = {
  id: "coach",
  steps,
  closeOnExit: [],
};
