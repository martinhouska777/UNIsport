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

  THE TWO DIVES. The owner's call: the PLAN and the WORKOUT EDITOR are the
  main event, so the walk does not describe them from the outside — it opens a
  block, opens a week, opens the editor and builds a session field by field.
  The draft is the spine of it: nothing a coach writes is visible to anybody
  until they publish, and that is what makes planning in the app safe to do
  badly at first.

  IT MUST SURVIVE AN EMPTY CONSOLE. A coach opening this for the first time has
  no training blocks, may have no signed-up athletes, and certainly has no
  lineups. The lineup half is fine — the day picker always has seven days and a
  builder always has a pool. The PLAN half is not: with no block there is
  nothing to open. So every step of that dive carries `group: "plan"`, and the
  overlay drops the whole group the moment its first move fails (see `giveUp`
  in TourOverlay). One four-second gap, not eleven.

  IT NEVER SAVES ANYTHING. It fills the workout form in — it has to, because
  every field below "Type" only exists once a type is chosen — but it never
  presses Confirm, and it presses Back on the way out. Nothing reaches the
  database, and `closeOnExit` presses that same Back if the walk is abandoned
  while the editor is open, so nobody is stranded in a form they never opened.
  It touches nothing at all on the lineup side: no boat is added.

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

/* Every step of the plan dive wears this, so they stand or fall together. */
const PLAN_DIVE = "plan";

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
    title: "Everything starts with a block",
    body: "A block is a stretch of training, usually up to a race. Give it a start, an end and the race at the end of it, and it cuts itself into weeks — you never lay out a calendar by hand.",
  },

  /* ── The plan dive. Needs a block to exist; see `group` at the top. ── */
  {
    group: PLAN_DIVE,
    press: "coach-plan-first-block",
    route: PLAN,
    anchor: "coach-plan-status",
    title: "Draft is the whole point",
    body: "A block is a DRAFT until you say otherwise, and not one word of a draft is visible to the squad. So you can rough six weeks in, sleep on it, tear half of it up on Tuesday — and nobody watched you do it. Publish flips the whole block onto every athlete's Home at once; Unpublish takes it straight back.",
  },
  {
    group: PLAN_DIVE,
    anchor: "coach-plan-first-week",
    title: "The weeks are already there",
    body: "One row per week, each saying how many sessions are set. Empty weeks say so, which is how you spot the hole in week four without opening week four.",
  },
  {
    group: PLAN_DIVE,
    press: "coach-plan-first-week",
    route: PLAN,
    anchor: "coach-plan-first-day",
    title: "A day is an AM and a PM",
    body: "Two slots per day, and that is the whole grid. An empty one says “add session”; a filled one shows the workout, its type, the time and whether it carries a note. Let's build one.",
  },

  /* ── Building the workout, field by field. ── */
  {
    group: PLAN_DIVE,
    press: "coach-plan-first-slot",
    route: PLAN,
    anchor: "coach-plan-type",
    title: "Start with what kind of session it is",
    body: "Water, Erg, Weights, Off or Flex. It is the first question because the rest of the form changes with the answer — an erg asks things a day off does not. It is also the colour the session is drawn in everywhere it appears afterwards.",
  },
  {
    group: PLAN_DIVE,
    press: "coach-plan-cat-erg",
    route: PLAN,
    anchor: "coach-plan-intensity",
    title: "Then how hard",
    body: "UT2, UT1 or Hard, for water and erg. This is not decoration: it colours the session on your grid and on their calendar, so a week reads as a shape — three green, one red — instead of as a list you have to parse.",
  },
  {
    group: PLAN_DIVE,
    press: "coach-plan-int-UT2",
    route: PLAN,
    anchor: "coach-plan-options",
    title: "Most days are one tap",
    body: "The five sessions written most often at this intensity, ready to drop in — water in kilometres, erg in minutes. Tap one and the description fills itself. This is the difference between planning a week in two minutes and typing “60' UT2 erg” for the ninetieth time.",
  },
  {
    group: PLAN_DIVE,
    press: "coach-plan-opt-first",
    route: PLAN,
    anchor: "coach-plan-desc",
    title: "…and the rest you write",
    body: "That is one of the suggestions, dropped in. Type over it, or write something else entirely — this exact line is what appears on their Home and in their calendar, so it is worth writing the way you would say it on the dock.",
  },
  {
    group: PLAN_DIVE,
    anchor: "coach-plan-time",
    title: "The time is already filled in",
    body: "AM sessions open at the usual morning time, PM at the usual afternoon one, and you only touch it on the days that are different. Under it there is a note field for the one sentence a session sometimes needs.",
  },
  {
    group: PLAN_DIVE,
    anchor: "coach-plan-team",
    title: "Turn a session into a board",
    body: "Flip this and everyone who logs the session lands on one shared board — ranked for a test, or an average for steady work. It is where the erg boards on the Team tab come from, and it means you never collect times by message again.",
  },
  {
    group: PLAN_DIVE,
    anchor: "coach-plan-repeat",
    title: "This one saves the most",
    body: "“Every week” drops this session onto the SAME slot in every week of the block — this weekday, this AM or PM, all the way to the race. A normal training week is therefore typed once: you build the pattern, then go back and change only the days that break it.",
  },
  {
    group: PLAN_DIVE,
    anchor: "coach-plan-confirm",
    title: "Confirm puts it in the week",
    body: "And it is still a draft. It sits on your grid, coloured by its type, and the squad still has no idea it exists until you publish the block.",
  },
  {
    group: PLAN_DIVE,
    press: "coach-plan-editor-back",
    route: PLAN,
    anchor: "coach-plan-first-day",
    title: "Back changes nothing",
    body: "Leave without confirming — as we just did — and the week is exactly as it was. Nothing in this editor is written until you press Confirm, so there is no way to break a plan by opening a day to look at it.",
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
  Abandon the walk inside the workout editor and this presses its Back for you —
  the same job `log-cancel` does in the app's tour. Nothing else needs shutting:
  the lineup half opens no editor at all.
*/
export const coachTour: Tour = {
  id: "coach",
  steps,
  closeOnExit: ["coach-plan-editor-back"],
};
