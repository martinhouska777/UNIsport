/*
  EVENTS — the short races that run alongside the boards, as DATA.
  ---------------------------------------------------------------------------
  A board is a standing. An EVENT is the opposite of that on purpose: it opens
  on a Monday or the 1st, it is gone when the window closes, and finishing it
  pays BONUS POINTS on top of whatever the sessions were already worth. That is
  the reason to open the app on a Monday rather than at the end of term.

  TWO KINDS, and they are not the same thing:

    PERSONAL — yours. One weekly and two monthly running at once. They ask for
               something you would not otherwise have done: go somewhere new,
               turn up more days than usual, meet people. Never "log more
               sessions", which is just the boards again in a smaller font.

    THE INTERHOUSE RACE — one a month, which every eligible house runs at the
               same time, ranked against each other. It pays into the HOUSE's
               points, not yours.

  THE RACE IS GATED, AND THE GATE IS THE POINT. A house has to have earned
  `HOUSE_ENTRY_PER_MEMBER` points per member, all time, before it can enter.
  That turns "we need more people using this" from a wish into a door with a
  number on it — and because it is per member, a big house cannot open it on
  size and three keen people cannot carry a house of forty. Below the gate a
  house still scores, still appears on the board, and can see exactly how far
  off it is.

  NO ADMIN, EVER. Which event runs is decided by the WEEK or MONTH NUMBER, so
  the whole campus sees the same one, it changes on its own, and nobody has to
  remember to set anything. Adding an event later is an entry in one of the
  lists below — data, not code (rule 7).

  EVERY TARGET HERE IS COUNTABLE FROM SESSIONS THAT ALREADY EXIST. That rules
  a lot of tempting events out. There is deliberately no distance event in the
  WEEKLY pool: the app has no watch and no Strava import, so kilometres only
  exist if somebody typed them in, and a weekly event nobody can be bothered to
  feed sits at 12% all week and teaches people the events are decoration. The
  monthly pool has exactly one distance event, where a month is long enough for
  the people who do log their runs to finish it.
*/
import { gymsFor } from "@/lib/gyms";

/* ─────────────────────────────  the gate  ───────────────────────────── */

/**
 * Points per member, all time, that a house needs before it can enter the
 * interhouse race.
 *
 * Sixty is roughly four to six sessions from every single person who lives
 * there — reachable in a first term by a house that is actually using the app,
 * and out of reach for one where three people are. It is a guess until there
 * is real data to tune it against, which is exactly why it is one number in
 * one file.
 */
export const HOUSE_ENTRY_PER_MEMBER = 60;

/* ─────────────────────────────  types  ───────────────────────────── */

/**
 * Everything an event can be measured on. Each one is countable from the
 * workout_logs a person already has — nothing here needs a new question asked
 * at logging time.
 */
export type EventMetric =
  | "sessions" // sessions logged
  | "socialSessions" // sessions with another app member
  | "partners" // different people trained with
  | "newPartners" // people trained with for the first time ever
  | "gyms" // different gyms trained at
  | "days" // separate days trained on
  | "distance" // kilometres run, rowed or ridden, as logged
  | "actives"; // house only: how many members trained at all

export type EventWindow = "week" | "month";

export type SportEvent = {
  key: string;
  title: string;
  /** One line, plain English, saying what finishing it takes. */
  blurb: string;
  metric: EventMetric;
  /** `"allMainGyms"` is resolved per school at runtime. */
  target: number | "allMainGyms";
  /** Bonus points on finishing. A house event pays the house. */
  points: number;
  window: EventWindow;
  /**
   * House events only: the target is per member, so a house of forty is asked
   * for forty times as much as a house of one. Without this the biggest house
   * wins every race by existing.
   */
  perMember?: boolean;
};

/* ═════════════════════════  personal · weekly  ═════════════════════════ */

/*
  One of these runs each week, chosen by the week number. Small enough to
  finish inside seven days from a standing start, and every one of them asks
  for something a normal week would not contain.
*/
export const weeklyEvents: SportEvent[] = [
  {
    key: "w-two-gyms",
    title: "Two gyms, one week",
    blurb: "Train at two different gyms before Sunday night.",
    metric: "gyms",
    target: 2,
    points: 60,
    window: "week",
  },
  {
    key: "w-five-days",
    title: "Five days out of seven",
    blurb: "Turn up on five separate days this week.",
    metric: "days",
    target: 5,
    points: 90,
    window: "week",
  },
  {
    key: "w-two-new",
    title: "Two new faces",
    blurb: "Train with two people you have never trained with before.",
    metric: "newPartners",
    target: 2,
    points: 110,
    window: "week",
  },
  {
    key: "w-three-company",
    title: "Three with company",
    blurb: "Three of this week's sessions with somebody else.",
    metric: "socialSessions",
    target: 3,
    points: 80,
    window: "week",
  },
  {
    key: "w-three-people",
    title: "Three different people",
    blurb: "Train with three different partners this week.",
    metric: "partners",
    target: 3,
    points: 100,
    window: "week",
  },
  {
    key: "w-six-sessions",
    title: "Six sessions",
    blurb: "Six logged sessions in seven days.",
    metric: "sessions",
    target: 6,
    points: 70,
    window: "week",
  },
];

/* ═════════════════════════  personal · monthly  ═════════════════════════ */

/*
  TWO of these run at once, chosen by the month number, so a month always has
  a long target and a second one to fall back on. They pay properly, because a
  month is a long time to hold on to something.
*/
export const monthlyEvents: SportEvent[] = [
  {
    key: "m-hundred",
    title: "The Hundred",
    blurb: "A hundred kilometres this month, run, rowed or ridden.",
    metric: "distance",
    target: 100,
    points: 300,
    window: "month",
  },
  {
    key: "m-every-gym",
    title: "Every gym on campus",
    blurb: "Train at all of the main gyms before the month is out.",
    metric: "gyms",
    target: "allMainGyms",
    points: 250,
    window: "month",
  },
  {
    key: "m-five-new",
    title: "Five new people",
    blurb: "Five people you had never trained with before.",
    metric: "newPartners",
    target: 5,
    points: 350,
    window: "month",
  },
  {
    key: "m-sixteen-days",
    title: "Sixteen days",
    blurb: "Train on sixteen separate days this month.",
    metric: "days",
    target: 16,
    points: 300,
    window: "month",
  },
  {
    key: "m-twelve-company",
    title: "Twelve with company",
    blurb: "Twelve of this month's sessions with somebody else.",
    metric: "socialSessions",
    target: 12,
    points: 280,
    window: "month",
  },
  {
    key: "m-twenty",
    title: "Twenty sessions",
    blurb: "Twenty logged sessions in one month.",
    metric: "sessions",
    target: 20,
    points: 260,
    window: "month",
  },
];

/* ═══════════════════════  the interhouse race  ═══════════════════════ */

/*
  One a month. Every house past the gate runs the same one at the same time and
  they are ranked while the bars fill. Targets are PER MEMBER, so the race is
  about how much of a house is taking part rather than how big it is.

  These are deliberately about turnout rather than heroics: a house wins by
  getting more of its people to do an ordinary amount, which is the only thing
  a house can actually organise.
*/
export const houseEvents: SportEvent[] = [
  {
    key: "h-everyone-in",
    title: "Everyone in",
    blurb: "Get every single member to log at least one session this month.",
    metric: "actives",
    target: 1,
    perMember: true,
    points: 1200,
    window: "month",
  },
  {
    key: "h-house-hundred",
    title: "The house hundred",
    blurb: "A hundred sessions between you — more of you, not more from you.",
    metric: "sessions",
    target: 8,
    perMember: true,
    points: 1000,
    window: "month",
  },
  {
    key: "h-together",
    title: "Nobody trains alone",
    blurb: "Four sessions each with a partner, added up across the house.",
    metric: "socialSessions",
    target: 4,
    perMember: true,
    points: 1400,
    window: "month",
  },
  {
    key: "h-introductions",
    title: "Introductions",
    blurb: "Two people each of you had never trained with before.",
    metric: "newPartners",
    target: 2,
    perMember: true,
    points: 1600,
    window: "month",
  },
];

/* ─────────────────  which ones are running right now  ───────────────── */

/**
 * ISO week number. Used only to pick an event, so it needs to agree with
 * itself week to week rather than match anybody's calendar exactly.
 */
export function weekNumber(now = new Date()): number {
  const start = Date.UTC(now.getUTCFullYear(), 0, 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - start) / (7 * 24 * 60 * 60 * 1000));
}

/** Months since the epoch, so the choice keeps moving across a year boundary. */
export function monthNumber(now = new Date()): number {
  return now.getUTCFullYear() * 12 + now.getUTCMonth();
}

/** The one personal weekly event everybody on campus is running. */
export function weeklyEventNow(now = new Date()): SportEvent {
  return weeklyEvents[weekNumber(now) % weeklyEvents.length];
}

/**
 * The two personal monthly events. Stepping the second one by a different
 * amount stops the same pair coming up together every time.
 */
export function monthlyEventsNow(now = new Date()): SportEvent[] {
  const n = monthNumber(now);
  const first = monthlyEvents[n % monthlyEvents.length];
  const second = monthlyEvents[(n * 2 + 1) % monthlyEvents.length];
  // With six in the pool the two can still land on the same entry; take the
  // next one along rather than showing the same event twice.
  if (second.key !== first.key) return [first, second];
  return [first, monthlyEvents[(n + 1) % monthlyEvents.length]];
}

/** The interhouse race for this month. */
export function houseEventNow(now = new Date()): SportEvent {
  return houseEvents[monthNumber(now) % houseEvents.length];
}

/* ─────────────────────────────  targets  ───────────────────────────── */

/**
 * What an event actually asks of you, as a number.
 *
 * `allMainGyms` is resolved per school — a campus with four main gyms should
 * not be asked for Harvard's three. A house target is multiplied by how many
 * people live there.
 */
export function eventTarget(
  event: SportEvent,
  universityKey: string,
  members = 1,
): number {
  const base =
    event.target === "allMainGyms"
      ? gymsFor(universityKey).filter((g) => g.kind === "main").length
      : event.target;
  return event.perMember ? base * Math.max(members, 1) : base;
}

/** Whether a house has earned its way into the race. */
export function houseCanEnter(points: number, members: number): boolean {
  if (members <= 0) return false;
  return points / members >= HOUSE_ENTRY_PER_MEMBER;
}

/** How many more points a house needs before the race opens to it. */
export function pointsToEntry(points: number, members: number): number {
  const needed = HOUSE_ENTRY_PER_MEMBER * Math.max(members, 0);
  return Math.max(needed - points, 0);
}
