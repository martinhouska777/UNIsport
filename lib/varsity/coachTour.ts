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
  hard, a usual workout, the time, sharing the results, Every week. The
  editor is left with Back; Done is never pressed. Lineup followed
  (2026-10-04), then was cut back to three steps the same day: the day list,
  Repeat, and the pool, which says how to fill a seat. Then Workouts: the
  boards, and the + that times race pieces.

  ONLY THE HOW (owner, 2026-10-04: "nepotřebujeme vysvětlovat každý button,
  například publish nebo jaký je dnes workout, bylo jasné"). So no Today step,
  and no Done or Publish steps on the plan.

  AND THE WATER, TIMED FOR REAL (owner, 2026-10-04: "jak logovat ty workouts
  na water, to je důležité"). The + is pressed, a session picked, Enter times
  opened and a Start tapped, so the wheels are on screen; then the second
  piece's Switch. It is a practice run: the race day it makes lives in
  TeamWorkouts' memory and its board writes nothing (RaceBoard `practice`).

  THE SAME DAY, LATER (owner: "koukni se na nějaký reálný piece, co jsme
  měli, třeba 2x2 miles, a ukaž to v reálu … u lineups add boat jen rychle
  … dej jen person by person, jak daleko byli od plánu, jinak je to bonus
  info … a u toho člověka ukaž, jak udělat tu note"). So: a race the squad
  has timed is opened from the list, real times and all, before a new one is
  ever made; the lineup adds a boat in passing; of Team statistics only
  Person by person is shown; and the lit rower's pencil opens a note, which
  is never sent.

  IT MUST SURVIVE AN EMPTY CONSOLE — no block, no lineups, maybe no athletes.
    Plan       the block's card and its week tabs. With no block of its own
               the screen draws an EXAMPLE week while the walk is on
               (lib/varsity/coachTourExample.ts), so the session editor can be
               shown to the coach who needs it most
    Lineup     a practice of the next seven days, always there (the first
               that still needs its boats, or today's morning), and the
               builder's athlete pool, there with or without a plan or a crew
    Workouts   the Erg | Water | Ranking switch, plus the first erg row if
               any, and the Water side's +, there with or without a race.
               Behind the +, the newest water session with a published
               lineup — or, with none, an EXAMPLE race of two fours
               (coachTourExample.ts)
    Ranking    the same switch, plus the list switch under it
    Team       the squad's week card (a dash when nobody logged), Person by
               person (passed when nobody trained in the window), then the
               first rower who has joined, and their pencil — passed when
               nobody has

  IT CHANGES NOTHING. It opens the session editor and fills in its form, but
  leaves with Back, which keeps nothing; it never presses Done or Publish.
  The lineup builder saves by itself, so while a walk is on screen it writes
  nothing at all, and neither does a race board the walk opened (see the
  water above); it never presses Save times. The note it opens is never
  sent (NoteEditor). Abandoned inside the editor, the builder, the timing
  sheet or the note, the walk presses its Back on the way out (closeOnExit).

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

/*
  What the finger picks in the session editor, matched against the squad's own
  choices (Training settings) by name: Erg, UT2, and a 3×25' or 3×30' — the
  owner's own example. TrainingPlanScreen falls back to the first of each.
*/
export const tourSessionPick = {
  type: /^erg$/i,
  zone: /^ut\s*2$/i,
  workout: /\b3\s*[x×]\s*(25|30)\b/i,
};

const steps: TourStep[] = [
  {
    route: TODAY,
    anchor: null,
    title: "Take a quick tour?",
    body: "How to plan the training, seat the boats and read the results.",
    next: "Show me",
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
    today on (coach-plan-open-slot) and fills the form in ONE step (owner,
    2026-10-04: "jeden klik … choose type, intensity and workout a ukážeš erg
    ut2 a 3x25 nebo 3x30 … a nedávej tam ten čas"): the type, the intensity
    and a usual workout, pressed one after the other — tourSessionPick below,
    or the first of each where a squad has none of those. No Time step.
  */
  {
    press: ["coach-plan-open-slot", "coach-plan-cat-pick", "coach-plan-int-pick", "coach-plan-opt-pick"],
    // The type down to the description box, which the workout fills.
    anchor: "coach-plan-type",
    alsoAnchor: "coach-plan-desc",
    group: "editor",
    title: "Write a session",
    body: "Choose the type, the intensity and the workout. Or write your own in the box.",
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
    // Out of the session editor with Back first — nothing written in the
    // walk is kept (passed over when the editor never opened).
    press: ["coach-plan-editor-back", tab(LINEUP)],
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
    // ADD A BOAT, QUICKLY (owner, 2026-10-04: "add boat jen rychle"): the
    // types are shown, and the next step's finger taps the first, so the
    // pool is read with an empty boat on the screen. (The practice is opened
    // here too when Repeat was passed before it could open it.)
    press: ["coach-lineup-open-practice", "coach-lineup-add-boat"],
    anchor: "coach-lineup-kinds",
    title: "Add a boat",
    body: "Pick the type of boat. It comes in empty, ready to fill.",
  },
  {
    press: "coach-lineup-kind-first",
    anchor: "coach-lineup-count",
    alsoAnchor: "coach-lineup-filters",
    title: "Athlete pool",
    body: "Everyone not in a boat. Tap a seat to fill it, or drag a name onto it. Anyone sick or injured is listed under Unavailable.",
  },

  /* ── Workouts ─────────────────────────────────────────────────────────── */
  /*
    READING THE RESULTS, and TIMING A RACE (owner, 2026-10-04: "udělej teď
    workouts how-to … nepotřebujeme vysvětlovat každý button"). The newest erg
    board is pointed at, not opened ("ta 14 to nemusíš ukazovat uvnitř").
  */
  {
    press: tab(WORKOUTS),
    route: WORKOUTS,
    anchor: "varsity-workouts-switch",
    alsoAnchor: "coach-workouts-first",
    title: "Workouts",
    body: "Every session you share the results of. Each rower logs their own result, and the board fills itself. Tap one to see everyone’s.",
  },
  /*
    LOGGING THE WATER, by the finger (owner, 2026-10-04: "jak logovat ty
    workouts na water, to je důležité"): the +, a session, Enter times, a
    Start — the wheels — and the second piece's Switch. The session is the
    newest with a published lineup, one of several pieces where there is one
    (TeamWorkouts, tourPick). A practice run: the race day lives only in
    TeamWorkouts while the walk is on, its board writes nothing, and Save
    times is never pressed. With no session it could time, the picker offers
    the example race. A day of one piece has no Switch; the board says so and
    that step is passed.

    A RACE ALREADY TIMED IS SHOWN FIRST ("ukaž to v reálu"): where the squad
    has one — every crew of two pieces or more timed, the fewest crews of
    those, so it fits the phone (TeamWorkouts, tourShow) — the finger opens it
    from the list (`coach-race-open`), and Enter times and the wheels show
    its real readings. Only without one does `coach-race-open` sit on the +,
    and the walk makes a new one as above. For HUBC that is "2x2 miles at
    race pace": four eights, Dykema and Horler switched between the pieces.
  */
  {
    press: "varsity-workouts-water",
    anchor: "coach-workouts-add-race",
    title: "Race pieces",
    body: "Every session you timed is here. To time a new one, tap + and pick the session.",
  },
  {
    press: ["coach-race-open", "coach-race-pick-first"],
    anchor: "coach-race-tabs",
    alsoAnchor: "coach-race-first-row",
    group: "race",
    title: "Pieces",
    body: "A tab for every piece of the workout, with the crews from the lineup.",
    bodyWhen: {
      timed: "A tab for every piece: each crew’s time and how far behind the winner. Combined adds the pieces up.",
    },
  },
  {
    press: "coach-race-enter-times",
    anchor: "coach-race-first-crew",
    group: "race",
    title: "Enter times",
    body: "Each crew gets a Start and a Finish off your watch. The time works itself out.",
  },
  {
    press: "coach-race-start-first",
    anchor: "coach-race-watch",
    group: "race",
    title: "Your watch",
    body: "Spin the wheels, or type the digits left to right: 802115 is 8:02:11.5. Next goes on to the finish, then the next crew. Save times when the piece is in.",
  },
  {
    press: ["coach-race-watch-close", "coach-race-editor-back", "coach-race-tab-2"],
    anchor: "coach-race-switch",
    alsoAnchor: "coach-race-first-row",
    group: "race",
    title: "Seat racing",
    body: "From the second piece on, Switch swaps two rowers between boats. Whoever moved is in red, and the board works out who was faster.",
  },
  {
    // Out of the timing sheet first — whatever of it is still open.
    press: ["coach-race-watch-close", "coach-race-editor-back", "coach-race-back", "varsity-workouts-ranking"],
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
  /*
    TEAM STATISTICS: PERSON BY PERSON ONLY (owner, 2026-10-04: "dej jen person
    by person, jak daleko byli od plánu, jinak je to bonus info"). It was
    shown part by part earlier the same day; the graph, Week by week and the
    Training mix are still there, just not walked. Still adding up, the screen
    says so (data-tour-pending); nobody trained in the window, it says the
    table is not coming, and the step is passed.
  */
  {
    press: "coach-team-full-stats",
    anchor: "coach-stats-people",
    title: "Person by person",
    body: "How far each rower is from the plan: sessions done out of planned, and their kilometres and hours against the team average. Tap a heading to sort.",
  },
  {
    // The first rower who has joined (TeamScreen) — the one whose pencil the
    // next step presses.
    press: "coach-stats-close",
    anchor: "coach-team-first-rower",
    title: "Profiles",
    body: "Tap anyone to see their profile.",
  },
  {
    // HOW A NOTE IS WRITTEN ("u toho člověka ukaž, jak udělat tu note"): the
    // finger presses that rower's pencil; Send is never pressed (NoteEditor
    // sends nothing while a walk is on). Nobody has joined: passed.
    press: "coach-team-note",
    anchor: "coach-note-text",
    title: "A note",
    body: "The pencil writes them a note: what to work on. Send puts it on their Home, and it comes to their phone.",
  },

  {
    press: "coach-note-back",
    anchor: null,
    title: "That’s it",
    body: "See it again anytime: Settings → Take the console tour.",
  },
];

/*
  The id stays "coach" — it is what the seen flag is keyed on, so changing it
  would re-offer the walk to every coach who has already had it. Walked out of
  inside the session editor, the lineup builder, a race board, Team
  statistics or a note, it leaves with their Back (the innermost first).
*/
export const coachTour: Tour = {
  id: "coach",
  steps,
  closeOnExit: [
    "coach-plan-editor-back",
    "coach-lineup-back",
    "coach-race-watch-close",
    "coach-race-editor-back",
    "coach-race-back",
    "coach-race-picker-close",
    "coach-stats-close",
    "coach-note-back",
  ],
};
