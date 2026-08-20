/*
  THE COACH CONSOLE TOUR — one walk, the first time a coach is in.
  ---------------------------------------------------------------------------
  Same machine as the app's tour (lib/tour.ts): an ordered list of steps that
  drives itself between the console's tabs, opens a practice, and lights the
  REAL controls rather than pictures of them. All the copy lives here so it can
  be read and changed without touching component code (rule 7).

  WHAT IT IS ABOUT. Not "here is a button". Every step answers the same
  question — what does this save me? A coach already has a way of doing all of
  this: a spreadsheet, a whiteboard, a photo of the whiteboard in the team
  chat, and twenty messages asking what time we're pushing off. The console is
  only worth learning if each screen replaces one of those, so each step names
  the thing it replaces.

  IT MUST SURVIVE AN EMPTY CONSOLE. A coach opening this for the first time has
  no training blocks, may have no signed-up athletes, and certainly has no
  lineups. So the walk only ever drives to places that exist on day one: the
  four tabs, the lineup day-picker (always seven days) and a practice's builder
  (always a pool, always a Publish bar). Anything that needs content the coach
  has not made yet is DESCRIBED, never driven to — a step whose anchor never
  turns up costs the walk four seconds of nothing.

  IT NEVER CHANGES ANYTHING. The app's tour opens the Log Session editor and
  shuts it again on the way out. This one presses nothing that edits: no boat
  is added, no session is written, so there is nothing to undo and
  `closeOnExit` is empty. Worst case it leaves the coach looking at a practice
  they can walk straight out of.

  CAPTAINS DO NOT GET THIS. A captain's console is the squad screen and
  settings — three quarters of these steps point at tabs they do not have. The
  gate in app/varsity/coach/layout.tsx only mounts it for a coach.
*/
import type { Tour, TourStep } from "@/lib/tour";

const PLAN = "/varsity/coach/plan";
const LINEUP = "/varsity/coach/lineup";
const NOTES = "/varsity/coach/notes";
const TEAM = "/varsity/coach/team";

/** The console's nav anchors are named after their route, as the app's are. */
const tab = (href: string) => `coach-tab-${href}`;

const steps: TourStep[] = [
  {
    route: PLAN,
    anchor: null,
    title: "The Coach Console",
    body: "Four screens, and one idea behind all of them: write it down once here, and the whole squad already has it. No group chat, no spreadsheet, no photograph of a whiteboard. A minute — Skip, bottom left, stops it any time.",
  },

  /* ── Plan ─────────────────────────────────────────────────────────────── */
  {
    press: tab(PLAN),
    route: PLAN,
    anchor: tab(PLAN),
    title: "Plan — the training itself",
    body: "Weeks of it, an AM and a PM for every day. It is the screen the others feed off: the athletes' Home, their calendar, and the note the Lineup screen shows you about what is prescribed for each practice.",
  },
  {
    anchor: "coach-plan-new-block",
    title: "You write a normal week once",
    body: "A block is a stretch of training up to a race. Inside it, set a session to repeat “Every week” and it lands on every Tuesday in the block by itself — so the six weeks that look the same cost you one week of typing.",
  },
  {
    anchor: "coach-plan-header",
    title: "Draft until you say so",
    body: "Nothing you write is visible to anyone while a block is a draft. Press Publish and the whole block appears on every athlete's Home at once — and changing your mind later is one more press, not forty messages.",
  },

  /* ── Lineup ───────────────────────────────────────────────────────────── */
  {
    press: tab(LINEUP),
    route: LINEUP,
    anchor: tab(LINEUP),
    title: "Lineup — who is in which boat",
    body: "The job that eats a morning if it is done on paper, and gets done twice if the paper goes home in someone's pocket.",
  },
  {
    anchor: "coach-lineup-first-day",
    title: "You never open a day to find out",
    body: "Each day gives you its AM and its PM already saying what the plan prescribes and whether that lineup is not started, a draft, or published. Seven of these, so the week ahead answers itself.",
  },
  {
    press: "coach-lineup-first-practice",
    route: LINEUP,
    anchor: "coach-lineup-count",
    title: "The pool already knows who is out",
    body: "It counts itself: available, and out. Anyone injured or ill is listed apart at the bottom and cannot be seated by accident. A name exists in one place only — seat someone and they leave the pool, clear the seat and they are back in it.",
  },
  {
    anchor: "coach-lineup-filters",
    title: "Three buttons instead of a search",
    body: "All, Port, Starboard. Anyone who rows both sides appears under every one of them, because they really can take either seat — so you are never one filter away from the person you were about to pick.",
  },
  {
    anchor: "coach-lineup-add-boat",
    title: "Fill seats by typing or dragging",
    body: "A boat lays itself out 8 down to 1 with the cox on top. Type the first few letters of a name, or drag one up from the pool. Nothing is locked to a side — you rig the boat, the app just holds the sheet.",
  },
  {
    anchor: "coach-lineup-publish",
    title: "This is the part that saves the morning",
    body: "Save a draft while you are still deciding. Publish, and every rower opens their own Home to their own seat lit up, with the push-off time and which oars to take. Nobody has to be told, and nobody can say they were not.",
  },

  /* ── Notes ────────────────────────────────────────────────────────────── */
  {
    press: tab(NOTES),
    route: NOTES,
    anchor: tab(NOTES),
    title: "Notes — the thing you said on the dock",
    body: "One technical note per rower, and it goes straight onto their Home where they will read it again on Thursday. It replaces telling somebody something once, at the end of a session, and hoping.",
  },

  /* ── Team ─────────────────────────────────────────────────────────────── */
  {
    press: tab(TEAM),
    route: TEAM,
    anchor: tab(TEAM),
    title: "Team — the same numbers they see",
    body: "Deliberately the athletes' own Team screen rather than a private coach's version. The roster, the erg boards, the water telemetry: one set of numbers, so nobody is arguing about whose are right.",
  },
  {
    anchor: "coach-team-first-rower",
    title: "Stop asking people what they did",
    body: "Open any rower and their training month is already there — what they logged, how much of it, and their erg PRs. You stop running a register, and the conversation starts somewhere further along.",
  },

  /* ── The gear ─────────────────────────────────────────────────────────── */
  {
    anchor: "coach-settings",
    title: "The squad signs itself up",
    body: "One invite link, pasted into the team chat. People join, land in a waiting room, and you let them in — you never type anyone in by hand. Captains are made here too, and a leaked link is revoked in one press.",
  },

  {
    anchor: null,
    title: "That is the console",
    body: "Plan, Lineup, Notes, Team — and the gear for anything to do with people. Walk through it again any time from Squad settings.",
  },
];

/*
  Nothing to shut: this walk presses only navigation and a practice, never an
  editor. See the note at the top.
*/
export const coachTour: Tour = { id: "coach", steps, closeOnExit: [] };
