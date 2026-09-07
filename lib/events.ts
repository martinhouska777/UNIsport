/*
  WEEKLY EVENTS — the short race that runs alongside the long climb.
  ---------------------------------------------------------------------------
  Challenges are permanent and personal: they only ever go forwards, and they
  are what levels you up. An EVENT is the opposite of that on purpose — it
  starts on Monday, it is gone on Sunday night, and it has a winner. That is
  the reason to open the app on a Monday.

  WHAT RUNS AT ONCE:
    • three SPECIAL events for you — one ending Sunday, two ending with the
      month. Bonus XP for something you would not otherwise have done.
    • one HOUSE RACE, which every house able to enter is running at the same
      time, ranked against each other while the bars fill.

  THE HOUSE RACE IS GATED BY YOUR HOUSE'S LEVEL. A house has to have built
  something before it can enter — which turns "we need more people logging" from
  a vague wish into a door with a number on it. Below the gate the house still
  levels, still has its own challenges, and can see exactly how far off it is.

  NO ADMIN, EVER. Which event runs is decided by the WEEK NUMBER, so the whole
  campus sees the same one, it changes on its own every Monday, and nobody has
  to remember to set anything. Adding a new event later is an entry in one of
  the two lists below — data, not code (rule 7).
*/
import { houseLevelProgress } from "@/lib/xp";

/* ─────────────────────────────  the gate  ───────────────────────────── */

/**
 * The house level that opens the weekly race.
 *
 * Level 3 is roughly a house that has properly started — its members between
 * them have put in real weeks, not one keen person's fortnight. Low enough to
 * be reachable in a first term, high enough that entering means something.
 */
export const HOUSE_EVENT_MIN_LEVEL = 3;

/* ─────────────────────────────  types  ───────────────────────────── */

/** Everything an event can be measured on. Counted by db/league.sql. */
export type EventMetric =
  | "sessions"
  | "partners"
  | "km"
  | "gyms"
  | "days" // separate days trained on inside the window
  | "actives"; // house only: how many members trained at all this week

export type WeeklyEvent = {
  key: string;
  title: string;
  /** One line, plain English, saying what winning it takes. */
  blurb: string;
  metric: EventMetric;
  /** `"allMembers"` (house events only) is the house's own size. */
  target: number | "allMembers";
  /** Paid on finishing. The house one pays into the house's XP. */
  xp: number;
};

/* ───────────────────────────  special events  ─────────────────────────── */

/*
  The Strava-style ones: a handful of interesting targets running at once, worth
  a chunk of bonus XP, gone when their window closes.

  They are NOT the daily/weekly/monthly habit challenges — those are the steady
  drumbeat and they never change. These are the opposite: they ask for
  something you would not otherwise have done. Go somewhere new. Run further
  than usual. Meet people. Turn up five days out of seven.

  Three run at a time: one week-long and two month-long, so there is always
  something ending soon and something worth pacing.
*/
export type EventWindow = "week" | "month";

export type SpecialEvent = WeeklyEvent & { window: EventWindow };

/** One of these runs each week, and it changes every Monday. */
export const weeklySpecials: SpecialEvent[] = [
  {
    key: "sp-wk-five-days",
    window: "week",
    title: "Five days out of seven",
    blurb: "Train on 5 separate days this week.",
    metric: "days",
    target: 5,
    xp: 250,
  },
  {
    key: "sp-wk-two-partners",
    window: "week",
    title: "Two different people",
    blurb: "Train with 2 different people this week.",
    metric: "partners",
    target: 2,
    xp: 200,
  },
  {
    key: "sp-wk-fifteen-km",
    window: "week",
    title: "Fifteen kilometres",
    blurb: "Cover 15 km running, rowing or riding this week.",
    metric: "km",
    target: 15,
    xp: 220,
  },
  {
    key: "sp-wk-two-gyms",
    window: "week",
    title: "Somewhere else",
    blurb: "Train at 2 different gyms this week.",
    metric: "gyms",
    target: 2,
    xp: 180,
  },
];

/** Two of these run each month, and they change on the 1st. */
export const monthlySpecials: SpecialEvent[] = [
  {
    key: "sp-mo-fifty-km",
    window: "month",
    title: "The fifty",
    blurb: "Cover 50 km this month, however you like.",
    metric: "km",
    target: 50,
    xp: 500,
  },
  {
    key: "sp-mo-fifteen-days",
    window: "month",
    title: "Fifteen days",
    blurb: "Train on 15 separate days this month — one day in two.",
    metric: "days",
    target: 15,
    xp: 600,
  },
  {
    key: "sp-mo-five-partners",
    window: "month",
    title: "Five new faces",
    blurb: "Train with 5 different people this month.",
    metric: "partners",
    target: 5,
    xp: 550,
  },
  {
    key: "sp-mo-three-gyms",
    window: "month",
    title: "Around the campus",
    blurb: "Train at 3 different gyms this month.",
    metric: "gyms",
    target: 3,
    xp: 450,
  },
  {
    key: "sp-mo-twenty-five",
    window: "month",
    title: "Twenty-five",
    blurb: "Log 25 sessions this month.",
    metric: "sessions",
    target: 25,
    xp: 700,
  },
];

/* ─────────────────────────────  house  ───────────────────────────── */

/*
  Races. The whole house pushes one bar and the houses are ranked against each
  other while it fills — the point is not the target, it is being able to see
  that Eliot is forty ahead of you with two days left.
*/
export const houseEvents: WeeklyEvent[] = [
  {
    key: "wk-house-hundred-km",
    title: "The hundred-kilometre race",
    blurb: "First house to cover 100 km between everybody.",
    metric: "km",
    target: 100,
    xp: 800,
  },
  {
    key: "wk-house-fifty-sessions",
    title: "Fifty sessions",
    blurb: "First house to log 50 sessions this week.",
    metric: "sessions",
    target: 50,
    xp: 800,
  },
  {
    key: "wk-house-turnout",
    title: "Turnout",
    blurb: "Get every member of the house to log at least once this week.",
    metric: "actives",
    target: "allMembers",
    xp: 1200,
  },
  {
    key: "wk-house-partnerships",
    title: "Thirty partnerships",
    blurb: "First house to build 30 training partnerships this week.",
    metric: "partners",
    target: 30,
    xp: 900,
  },
];

/* ─────────────────────────────  the week  ───────────────────────────── */

/** The Monday of the week a date falls in, at local midnight. */
export function weekStart(now: Date = new Date()): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // getDay() is 0 for Sunday, so Sunday belongs to the week that began six days
  // earlier rather than starting a new one.
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return d;
}

/** "2026-09-07" — what db/league.sql wants for `since_date`. */
export function isoDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function weekStartISO(now: Date = new Date()): string {
  return isoDate(weekStart(now));
}

/* The other two windows the recurring challenges run in. Both are local dates,
   because "today" has to mean the student's today, not the server's. */
export function todayISO(now: Date = new Date()): string {
  return isoDate(now);
}

export function monthStartISO(now: Date = new Date()): string {
  return isoDate(new Date(now.getFullYear(), now.getMonth(), 1));
}

/** "September" — for saying which month the monthly challenge is running in. */
export function monthName(now: Date = new Date()): string {
  return now.toLocaleDateString(undefined, { month: "long" });
}

/** Whole days left, counting today. Sunday reads "last day". */
export function daysLeft(now: Date = new Date()): number {
  const start = weekStart(now);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const gone = Math.round((today.getTime() - start.getTime()) / 86_400_000);
  return Math.max(1, 7 - gone);
}

export function daysLeftLabel(now: Date = new Date()): string {
  const n = daysLeft(now);
  if (n === 1) return "Last day";
  return `${n} days left`;
}

/** Whole days left in the month, counting today. */
export function daysLeftInMonth(now: Date = new Date()): number {
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, last - now.getDate() + 1);
}

export function windowLeftLabel(w: EventWindow, now: Date = new Date()): string {
  const n = w === "week" ? daysLeft(now) : daysLeftInMonth(now);
  if (n === 1) return "Last day";
  return `${n} days left`;
}

/**
 * How many whole weeks have passed since a fixed Monday. Used only to rotate
 * the two lists, so the campus always agrees on which event is running and
 * nobody has to schedule anything.
 */
function weekNumber(now: Date = new Date()): number {
  const epoch = new Date(2026, 0, 5); // a Monday
  return Math.floor((weekStart(now).getTime() - epoch.getTime()) / (7 * 86_400_000));
}

const at = <T,>(list: T[], i: number): T =>
  list[(((i % list.length) + list.length) % list.length)];

/** How many months have passed since a fixed point — rotates the monthly ones. */
function monthNumber(now: Date = new Date()): number {
  return now.getFullYear() * 12 + now.getMonth();
}

/** The house race running right now. Changes every Monday. */
export function houseEventThisWeek(now: Date = new Date()): WeeklyEvent {
  return at(houseEvents, weekNumber(now));
}

/**
 * The three special events open right now: one that ends on Sunday, two that
 * end with the month. The two monthly ones are picked a step apart so they are
 * never the same challenge twice.
 */
export function specialEventsNow(now: Date = new Date()): SpecialEvent[] {
  const m = monthNumber(now);
  return [
    at(weeklySpecials, weekNumber(now)),
    at(monthlySpecials, m * 2),
    at(monthlySpecials, m * 2 + 1),
  ];
}

/* ─────────────────────────────  progress  ───────────────────────────── */

export type EventCounters = {
  sessions: number;
  partners: number;
  km: number;
  gyms: number;
  days: number;
  actives: number;
  members: number;
};

export const emptyEventCounters: EventCounters = {
  sessions: 0,
  partners: 0,
  km: 0,
  gyms: 0,
  days: 0,
  actives: 0,
  members: 0,
};

export type EventProgress = {
  event: WeeklyEvent;
  target: number;
  have: number;
  done: boolean;
  fraction: number;
};

export function eventProgress(e: WeeklyEvent, c: EventCounters): EventProgress {
  const target = e.target === "allMembers" ? Math.max(1, c.members) : e.target;
  const raw = c[e.metric] ?? 0;
  return {
    event: e,
    target,
    have: Math.min(raw, target),
    done: raw >= target,
    fraction: target > 0 ? Math.min(1, raw / target) : 0,
  };
}

/** Whether a house has built enough to enter the weekly race. */
export function houseCanEnter(houseXp: number): boolean {
  return houseLevelProgress(houseXp).level >= HOUSE_EVENT_MIN_LEVEL;
}
