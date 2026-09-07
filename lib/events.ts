/*
  WEEKLY EVENTS — the short race that runs alongside the long climb.
  ---------------------------------------------------------------------------
  Challenges are permanent and personal: they only ever go forwards, and they
  are what levels you up. An EVENT is the opposite of that on purpose — it
  starts on Monday, it is gone on Sunday night, and it has a winner. That is
  the reason to open the app on a Monday.

  TWO RUN EVERY WEEK, one of each:
    • a personal one, which works even if you are the only person here
    • a house one, which is a race between houses

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

/* ───────────────────────────  personal  ─────────────────────────── */

export const personalEvents: WeeklyEvent[] = [
  {
    key: "wk-four-sessions",
    title: "Four this week",
    blurb: "Log 4 sessions before Sunday night.",
    metric: "sessions",
    target: 4,
    xp: 120,
  },
  {
    key: "wk-two-partners",
    title: "Two different people",
    blurb: "Train with 2 different people this week.",
    metric: "partners",
    target: 2,
    xp: 150,
  },
  {
    key: "wk-ten-km",
    title: "Ten kilometres",
    blurb: "Cover 10 km running, rowing or riding this week.",
    metric: "km",
    target: 10,
    xp: 150,
  },
  {
    key: "wk-two-gyms",
    title: "Two gyms",
    blurb: "Train at 2 different gyms this week.",
    metric: "gyms",
    target: 2,
    xp: 120,
  },
  {
    key: "wk-five-sessions",
    title: "Five this week",
    blurb: "Log 5 sessions before Sunday night.",
    metric: "sessions",
    target: 5,
    xp: 180,
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
export function weekStartISO(now: Date = new Date()): string {
  const d = weekStart(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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

/**
 * How many whole weeks have passed since a fixed Monday. Used only to rotate
 * the two lists, so the campus always agrees on which event is running and
 * nobody has to schedule anything.
 */
function weekNumber(now: Date = new Date()): number {
  const epoch = new Date(2026, 0, 5); // a Monday
  return Math.floor((weekStart(now).getTime() - epoch.getTime()) / (7 * 86_400_000));
}

export function eventsThisWeek(now: Date = new Date()): {
  personal: WeeklyEvent;
  house: WeeklyEvent;
} {
  const w = weekNumber(now);
  // Two different list lengths, so the pairing keeps changing rather than
  // repeating the same combination every few weeks.
  const pick = <T,>(list: T[], offset = 0) =>
    list[((((w + offset) % list.length) + list.length) % list.length)];
  return { personal: pick(personalEvents), house: pick(houseEvents) };
}

/* ─────────────────────────────  progress  ───────────────────────────── */

export type EventCounters = {
  sessions: number;
  partners: number;
  km: number;
  gyms: number;
  actives: number;
  members: number;
};

export const emptyEventCounters: EventCounters = {
  sessions: 0,
  partners: 0,
  km: 0,
  gyms: 0,
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
