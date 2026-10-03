/*
  THE COACH CONSOLE TOUR — one walk, the first time a coach is in.
  ---------------------------------------------------------------------------
  Same machine and the same shape as the app's walk (lib/tour.ts) and Varsity
  Mode's (lib/varsity/varsityTour.ts). All the copy lives here (rule 7).

  THE THIRD VERSION (owner, 2026-10-03): "make it more explanatory about how to
  do the workouts, like repeat, then the lineups — that you can repeat and how
  to change them — and how to find your way round the workouts … think what a
  60-year-old coach who sees the app for the first time would need. He knows
  how to type a date or a name, but not 'repeat every week', how to choose an
  intensity, or how to make a lineup."

  (The first version was twenty-five steps that built a session field by field;
  on 2026-09-30 it was cut to one line per tab, to match the student walk. That
  told a coach WHERE things are but not HOW the parts that are not obvious
  work, which is what this one adds back — and only those parts.)

  So the walk SKIPS what explains itself — names, dates, the boat's name and
  oars, a note — and SHOWS, by doing it in front of the coach:

    Plan      the block and its Publish; weeks and the AM / PM slots; then INTO
              the workout editor: type and intensity (and what the colours
              mean), the most-used workouts, the time, Share results with its
              two kinds of board, Repeat every week, and Done.
    Lineup    the seven days and what their tags mean; then INTO a practice:
              Repeat the last crew, what happens to someone out sick, swap two
              rowers, fill an empty seat, the pool, Add boat, Publish.
    Workouts  the list; one board opened and how it is read; Water and its +
              for timing race pieces; Ranking.
    Team      the squad's week, and a tap on anyone for their profile.

  IT SAVES NOTHING. The workout editor is filled in and left with Back (the
  Done step says so). The lineup it opens is always an EXAMPLE crew — pressing
  Repeat on a real practice would write a draft — and a coach with no block yet
  is shown an example week (lib/varsity/coachTourExample.ts). Both are drawn
  only while the walk is on screen and never written anywhere.

  IT SURVIVES AN EMPTY CONSOLE: no block (the example week), no lineups ever
  published (the example crew), no results (the Workouts list shows its worked
  example). A dive that cannot open — the plan failed to load, say — drops the
  rest of its `group` at once instead of waiting four seconds a step.

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

/** The two seats the lineup part swaps (0 is the bow seat). */
const SWAP = ["coach-lineup-seat-1", "coach-lineup-seat-5"];

const steps: TourStep[] = [
  {
    route: TODAY,
    anchor: null,
    title: "Take a quick tour?",
    body: "How to plan the training, seat the boats and read the results. About two minutes.",
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
    title: "Your training block",
    body: "The weeks leading up to a race. Tap Edit to change its name, dates or race.",
  },
  {
    anchor: "coach-plan-weeks",
    alsoAnchor: "coach-plan-first-day",
    title: "Weeks and days",
    body: "Pick a week along the top. Every day has a morning (AM) and an afternoon (PM) session. Tap one to plan it.",
  },
  /*
    INTO THE WORKOUT EDITOR. The finger opens Monday morning, picks a type and
    the first intensity, and the light comes on over both — so the colours are
    explained while they are on screen. The editor screen decides WHICH type
    it presses (the one with an intensity and a results board), so this works
    whatever a squad calls its sessions.
  */
  {
    press: ["coach-plan-first-slot", "coach-plan-cat-first", "coach-plan-int-first"],
    anchor: "coach-plan-type",
    alsoAnchor: "coach-plan-intensity",
    group: "editor",
    title: "Type and intensity",
    body: "First the kind of session, then how hard: green is easy, yellow is steady, red is hard. Your squad sees that colour on their calendar.",
  },
  {
    press: "coach-plan-opt-first",
    anchor: "coach-plan-desc",
    alsoAnchor: "coach-plan-options",
    group: "editor",
    title: "The workout",
    body: "Tap one of your most-used workouts and it’s written in for you, or type your own.",
  },
  {
    anchor: "coach-plan-time",
    group: "editor",
    title: "Time",
    body: "It starts at your usual time. Tap it to change it.",
  },
  {
    // Pressed only while it is off — the screen drops the name once it is on.
    press: "coach-plan-team",
    anchor: "coach-plan-share",
    group: "editor",
    // Not every type can share results (Weights, for one).
    optional: true,
    title: "Share results",
    body: "Turn on for a test or a piece you want compared: everyone’s result goes on one board in Workouts. Ranked lists the fastest first; Everyone just shows who did it.",
  },
  {
    press: "coach-plan-repeat-weekly",
    anchor: "coach-plan-repeat",
    group: "editor",
    title: "Repeat every week",
    body: "Puts this session on the same day and time every week until the block ends. Weeks already done are left alone.",
  },
  {
    anchor: "coach-plan-confirm",
    group: "editor",
    title: "Done",
    body: "Press Done and it’s saved. Nothing in the console needs a Save button. (The tour goes back without saving.)",
  },
  {
    // Out of the editor with its own Back — nothing written.
    press: "coach-plan-editor-back",
    anchor: "coach-plan-publish",
    title: "Publish",
    body: "Your squad sees the plan only after you press Publish: it goes on their Home and calendar, and their phones buzz. Unpublish takes it back.",
  },

  /* ── Lineup ───────────────────────────────────────────────────────────── */
  {
    press: tab(LINEUP),
    route: LINEUP,
    anchor: "coach-lineup-first-day",
    title: "Lineups",
    body: "The next seven days: morning on the left, afternoon on the right. Each practice shows whether its lineup is Not started, a Draft or Published. Tap one to seat it.",
  },
  /*
    INTO A PRACTICE — always the example crew (see the note at the top). The
    finger taps today's morning; the practice offers to repeat yesterday's
    eight, one of whom is off sick today.
  */
  {
    press: "coach-lineup-first-practice",
    anchor: "coach-lineup-repeat",
    group: "lineup",
    title: "Repeat a lineup",
    body: "Copies the last lineup you published into this practice. Most days it’s the same crew with a change or two. (This one is an example.)",
  },
  {
    press: "coach-lineup-repeat",
    anchor: "coach-lineup-first-hull",
    group: "lineup",
    title: "The crew is in",
    body: "Anyone who’s out today, sick or injured, comes across as an empty seat, so you can see the gap.",
  },
  {
    press: SWAP,
    anchor: "coach-lineup-first-hull",
    group: "lineup",
    title: "Swap two rowers",
    body: "Tap one rower, then another. They change seats.",
  },
  {
    press: ["coach-lineup-pool-first", "coach-lineup-open-seat"],
    anchor: "coach-lineup-first-hull",
    group: "lineup",
    title: "Fill a seat",
    body: "Tap a name in the pool, then the empty seat. You can also hold a name and drag it there.",
  },
  {
    anchor: "coach-lineup-count",
    alsoAnchor: "coach-lineup-filters",
    group: "lineup",
    title: "Athlete pool",
    body: "Everyone who isn’t in a boat. Filter by Port, Starboard or Cox. Anyone who’s out is listed at the bottom, under Unavailable.",
  },
  {
    anchor: "coach-lineup-add-boat",
    group: "lineup",
    title: "Add a boat",
    body: "Pick the boat, then write which shell and oars it takes at the top of it.",
  },
  {
    anchor: "coach-lineup-publish",
    alsoAnchor: "coach-lineup-day",
    group: "lineup",
    title: "Publish",
    body: "Rowers see their seats once you press Publish. The arrows go to the next water practice, so a whole week is seated in one go.",
  },

  /* ── Workouts ─────────────────────────────────────────────────────────── */
  {
    // Out of the example practice with its own ‹ Days, then the tab.
    press: ["coach-lineup-back", tab(WORKOUTS)],
    route: WORKOUTS,
    anchor: "varsity-workouts-switch",
    alsoAnchor: "varsity-workouts-first",
    title: "Workouts",
    body: "Every session you set to Share results, with the squad’s results. Erg pieces here, the crews’ pieces under Water. Tap one to open it.",
  },
  {
    press: "varsity-workouts-first",
    anchor: "coach-board-metrics",
    alsoAnchor: "coach-board-view",
    group: "board",
    title: "Reading a board",
    body: "Everyone’s result on that piece. Choose what to compare (split, time, watts), and tap a name to see their whole workout.",
  },
  {
    press: ["coach-board-back", "varsity-workouts-water"],
    anchor: "varsity-workouts-switch",
    alsoAnchor: "coach-workouts-time",
    title: "Water",
    body: "The crews’ pieces on the water. Press + to time the race pieces of a practice whose lineup is published.",
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
  would re-offer the walk to every coach who has already had it.

  What it shuts if it is left part-way: the workout editor, the example
  practice and an open board — each with its own Back, so an example crew
  never outlives the walk on screen.
*/
export const coachTour: Tour = {
  id: "coach",
  steps,
  closeOnExit: ["coach-plan-editor-back", "coach-lineup-back", "coach-board-back"],
};
