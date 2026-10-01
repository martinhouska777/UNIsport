/*
  THE VARSITY MODE TOUR — one walk, the first time a rower is in.
  ---------------------------------------------------------------------------
  The same machine as the app's walk (lib/tour.ts) and the Coach Console's
  (lib/varsity/coachTour.ts), and the same shape as the app's: it asks first,
  then crosses the tabs in the order the bottom bar has them, says in one line
  what each is for, and ends on the (+) — because the calendar, the statistics
  and the boards it has just shown are all filled by what gets logged there.
  All the copy lives here (rule 7).

  IT MUST SURVIVE AN EMPTY SQUAD. A rower can join before the coach has
  published anything, so every lit thing is something every athlete has:
    Home       the week strip — or, with no plan yet, the "No plan published
               yet" card in its place (both carry the same anchor) — and the
               coach-note card, which is always there
    Calendar   today's square
    Workouts   the Erg | Water switch; the first row is lit WITH it when there
               is one (`alsoAnchor` simply isn't drawn when it's missing)
    Profile    the graph and the Team row
    Log        the scan button and today's list, whatever is in it

  IT CHANGES NOTHING. It opens the log sheet but never touches what is inside
  it — the scan button opens the camera, and a check-in answer saves the moment
  it is tapped — and `closeOnExit` shuts the sheet if the walk is left early.

  COACHES GET IT TOO (owner, 2026-09-30) — this is the side Varsity Mode opens
  on for them as well. The console's own walk is lib/varsity/coachTour.ts.
*/
import type { Tour, TourStep } from "@/lib/tour";

const HOME = "/varsity/home";
const CALENDAR = "/varsity/calendar";
const WORKOUTS = "/varsity/team";
const PROFILE = "/varsity/profile";

/** The tabs carry the same anchor name the app's do: `tab-<route>`. */
const tab = (href: string) => `tab-${href}`;

const steps: TourStep[] = [
  {
    route: HOME,
    anchor: null,
    title: "Take a quick tour?",
    body: "Varsity Mode in thirty seconds.",
    next: "Show me",
  },

  /* ── Home ─────────────────────────────────────────────────────────────── */
  {
    anchor: "varsity-home-plan",
    alsoAnchor: "varsity-home-day",
    title: "Home",
    body: "This week’s plan from your coach. When the lineup is out, your boat is in the session.",
  },
  {
    anchor: "varsity-home-note",
    title: "Notes from your coach",
    body: "When your coach writes you a note, it shows up here.",
  },

  /* ── Calendar ─────────────────────────────────────────────────────────── */
  {
    press: tab(CALENDAR),
    route: CALENDAR,
    anchor: "varsity-cal-today",
    title: "Calendar",
    body: "Every session you log lands on its day. Tap a day to see it.",
  },

  /* ── Workouts ─────────────────────────────────────────────────────────── */
  {
    press: tab(WORKOUTS),
    route: WORKOUTS,
    anchor: "varsity-workouts-switch",
    alsoAnchor: "varsity-workouts-first",
    title: "Workouts",
    body: "Every team erg piece, with the whole squad’s results on one board.",
  },
  {
    press: "varsity-workouts-water",
    anchor: "varsity-workouts-switch",
    alsoAnchor: "varsity-workouts-first",
    title: "On the water",
    body: "Race pieces, crew by crew.",
  },

  /* ── Profile ──────────────────────────────────────────────────────────── */
  {
    press: tab(PROFILE),
    route: PROFILE,
    anchor: "varsity-profile-stats",
    title: "Your statistics",
    body: "Everything you log, week by week.",
  },
  /* No personal-bests step: the tiles say what they are, and on a phone they
     sit half under the tab bar, where a ring can't be read. */
  {
    anchor: "varsity-profile-team",
    title: "Team",
    body: "The whole squad. Tap anyone for their PBs and their training calendar.",
  },

  /* ── The (+) ──────────────────────────────────────────────────────────── */
  /*
    No `route`: on a phone the (+) opens a sheet over the page you are on, so
    the address never changes. On a laptop the same anchor is the sidebar's
    "Log session", which goes to /varsity/log — and the same screen is there.
  */
  {
    press: "varsity-log",
    anchor: "varsity-log-scan",
    alsoAnchor: "varsity-log-today",
    title: "Log a session",
    body: "Log today’s session, or scan the erg monitor and the numbers fill themselves in.",
  },

  {
    anchor: null,
    title: "That’s it",
    body: "See it again anytime: Settings → Take the tour.",
  },
];

/** Varsity Mode's walk. Its id is "varsity" — do not change it once shipped. */
export const varsityTour: Tour = {
  id: "varsity",
  steps,
  // The log sheet the last steps leave open, if the walk ends there or is skipped.
  closeOnExit: ["varsity-log-close"],
};
