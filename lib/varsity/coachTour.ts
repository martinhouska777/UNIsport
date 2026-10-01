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

  IT MUST SURVIVE AN EMPTY CONSOLE — no block, no lineups, maybe no athletes.
    Today      the Today section, which is there with or without a plan
    Plan       the block's card (Publish lives on it) and the first day — or,
               with no block yet, the "No training blocks yet" card, which
               wears the same anchor
    Lineup     the first day of the week, always there; its AM opens a builder
               that always has an Add Boat and a pool
    Workouts   the Erg | Water | Ranking switch, plus the first row if any
    Team       the first rower
    Settings   the gear

  IT CHANGES NOTHING. It opens a practice's builder but seats nobody, adds no
  boat and publishes nothing; walk out while it is open and `closeOnExit`
  presses its "Days" back.

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
    body: "Every practice of the week, and whether its lineup is out.",
  },
  {
    press: "coach-lineup-first-practice",
    route: LINEUP,
    anchor: "coach-lineup-add-boat",
    alsoAnchor: "coach-lineup-count",
    title: "Seat the boats",
    body: "Add a boat and tap rowers from the pool into the seats. Publish, and everyone sees their seat on Home.",
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
    body: "The squad in order: erg, water, and who sticks to the plan.",
  },

  /* ── Team ─────────────────────────────────────────────────────────────── */
  {
    press: tab(TEAM),
    route: TEAM,
    anchor: "coach-team-first-rower",
    title: "Team",
    body: "Tap anyone to see their training. The pencil writes them a note.",
  },

  /* ── The gear ─────────────────────────────────────────────────────────── */
  {
    anchor: "coach-settings",
    title: "Settings",
    body: "Invite the squad with one link, and let them in.",
  },

  {
    anchor: null,
    title: "That’s it",
    body: "See it again anytime: Settings → Take the console tour.",
  },
];

/*
  The id stays "coach" — it is what the seen flag is keyed on, so changing it
  would re-offer the walk to every coach who has already had it. Walk out while
  a practice's builder is open and this presses its "Days" back.
*/
export const coachTour: Tour = {
  id: "coach",
  steps,
  closeOnExit: ["coach-lineup-back"],
};
