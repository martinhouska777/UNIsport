/*
  THE CHALLENGE LADDER — the permanent one, as DATA.
  ---------------------------------------------------------------------------
  A level is not a hidden counter ticking up: it is a challenge you can READ.
  "Log 10 sessions" tells you what to do tonight in a way that "you have 87 XP"
  never will. Completing one pays XP (lib/xp.ts), and XP is what decides your
  level and your place on the League board.

  ALWAYS EXACTLY ONE NEXT THING. The ladder is ordered and the screen shows the
  first one you have not finished, part-filled. Never a menu of twelve.

  WHY THESE ONES. Four flavours on purpose — volume, social, consistency,
  variety. If every challenge were "log more sessions" then the person who
  already trains six days a week wins and everyone else stops reading. Mixing
  them means Level 6 says something more interesting than "trains a lot".

  ALL TIME, NEVER RESET. The boards reset every month and every semester —
  that is what keeps them winnable. The ladder is the opposite: it is the thing
  that only ever goes forwards, so there is always something being built even
  in a month you are losing every board.

  EVERY METRIC HERE IS SOMETHING THE DATABASE CAN COUNT ON ITS OWN
  (db/league.sql). Nothing needs the exercise catalogue, which is why there is
  no "hit all ten muscle groups" challenge yet — that needs the muscle worked
  to be stored on the session, which it is not. It is the obvious next one to
  add when it is.
*/
import { gymsFor } from "@/lib/gyms";

/* ─────────────────────────────  types  ───────────────────────────── */

/** The counters db/league.sql returns. A challenge points at exactly one. */
export type ChallengeMetric =
  | "sessions" // sessions logged (a day counts twice at most)
  | "partners" // different people trained with
  | "newPartners" // people trained with for the first time
  | "gyms" // different gyms trained at
  | "days" // separate days trained on
  | "weeksHit" // weeks that reached the weekly target
  | "monthsHit" // months that reached the monthly target
  | "km"; // kilometres run, rowed or ridden

export type Challenge = {
  key: string;
  title: string;
  /** One line, in plain English, saying what finishing it takes. */
  blurb: string;
  metric: ChallengeMetric;
  /**
   * How many. `"allMainGyms"` is resolved per school at runtime — a campus
   * with four main gyms should not ask for Harvard's three.
   */
  target: number | "allMainGyms";
  /** Paid once, on completion. */
  xp: number;
};

/* ═══════════════════  the recurring ones (the habit)  ═══════════════════ */

/*
  THREE CHALLENGES THAT COME BACK. One resets tonight, one on Monday, one on the
  1st. This is the part that makes the app a habit rather than a scoreboard: a
  daily tick you do not want to break, a weekly target that survives one bad
  day, and a monthly one that survives a bad week.

  HOW THEY ARE PAID, and why nothing is stored. A completion is not written
  down anywhere — it is COUNTED. How many separate days you trained on, how
  many weeks reached three, how many months reached twelve: the logs already
  know all three, so db/league.sql just counts them and the XP follows. Nothing
  to migrate, nothing to keep in step, and every session you have ever logged
  counted from the day this shipped.

  The two targets below are the single source of truth for the whole system:
  they are passed INTO the SQL, so "a good week" means the same thing on your
  challenge card, in your XP, and on the milestone ladder further down.
*/
export const WEEK_TARGET = 3;
export const MONTH_TARGET = 12;

export type Recurrence = "daily" | "weekly" | "monthly";

export type RecurringChallenge = {
  key: string;
  recurrence: Recurrence;
  title: string;
  blurb: string;
  /** Sessions needed within the period. */
  target: number;
  /** Paid EVERY time it is completed, not once. */
  xp: number;
  /** The counter holding how many times it has been completed, all time. */
  completions: "days" | "weeksHit" | "monthsHit";
};

export const recurringChallenges: RecurringChallenge[] = [
  {
    key: "daily-train",
    recurrence: "daily",
    title: "Train today",
    blurb: "One session, any kind — gym, a run, anything you log.",
    target: 1,
    xp: 20,
    completions: "days",
  },
  {
    key: "weekly-three",
    recurrence: "weekly",
    title: `${WEEK_TARGET} this week`,
    blurb: `Log ${WEEK_TARGET} sessions between Monday and Sunday.`,
    target: WEEK_TARGET,
    xp: 100,
    completions: "weeksHit",
  },
  {
    key: "monthly-twelve",
    recurrence: "monthly",
    title: `${MONTH_TARGET} this month`,
    blurb: `Log ${MONTH_TARGET} sessions before the month is out.`,
    target: MONTH_TARGET,
    xp: 300,
    completions: "monthsHit",
  },
];

export const recurrenceLabel: Record<Recurrence, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** Sessions logged in each of the three windows that are open right now. */
export type PeriodSessions = { today: number; week: number; month: number };

export const emptyPeriodSessions: PeriodSessions = { today: 0, week: 0, month: 0 };

export type RecurringProgress = {
  challenge: RecurringChallenge;
  /** Sessions so far in the window that is open now. */
  have: number;
  target: number;
  done: boolean;
  fraction: number;
  /** How many times it has ever been completed. */
  completed: number;
};

export function recurringProgress(
  now: PeriodSessions,
  counters: Counters,
): RecurringProgress[] {
  return recurringChallenges.map((c) => {
    const have =
      c.recurrence === "daily" ? now.today : c.recurrence === "weekly" ? now.week : now.month;
    return {
      challenge: c,
      have: Math.min(have, c.target),
      target: c.target,
      done: have >= c.target,
      fraction: c.target > 0 ? Math.min(1, have / c.target) : 0,
      completed: counters[c.completions] ?? 0,
    };
  });
}

/** Everything the recurring challenges have ever paid out. */
export function recurringXp(c: Counters): number {
  return recurringChallenges.reduce((sum, ch) => sum + (c[ch.completions] ?? 0) * ch.xp, 0);
}

/* ───────────────────────────  the ladder  ─────────────────────────── */

/*
  Ordered easiest first. The XP grows with the tier so a Level 9 still moves at
  a decent clip even though Level 10 costs far more than Level 2 did.
*/
export const challengeLadder: Challenge[] = [
  {
    key: "first-session",
    title: "On the board",
    blurb: "Log your first session.",
    metric: "sessions",
    target: 1,
    xp: 50,
  },
  {
    key: "ten-sessions",
    title: "Ten in the bank",
    blurb: "Log 10 sessions.",
    metric: "sessions",
    target: 10,
    xp: 100,
  },
  {
    key: "three-partners",
    title: "Not on your own",
    blurb: "Train with 3 different people.",
    metric: "partners",
    target: 3,
    xp: 120,
  },
  {
    key: "two-good-weeks",
    title: "Twice a habit",
    blurb: `Have two separate weeks that hit ${WEEK_TARGET} sessions.`,
    metric: "weeksHit",
    target: 2,
    xp: 150,
  },
  {
    key: "thirty-sessions",
    title: "Thirty",
    blurb: "Log 30 sessions.",
    metric: "sessions",
    target: 30,
    xp: 200,
  },
  {
    key: "every-gym",
    title: "Grand tour",
    blurb: "Train at every main gym on campus.",
    metric: "gyms",
    target: "allMainGyms",
    xp: 250,
  },
  {
    key: "fifty-km",
    title: "Fifty kilometres",
    blurb: "Cover 50 km running, rowing or riding.",
    metric: "km",
    target: 50,
    xp: 250,
  },
  {
    key: "ten-partners",
    title: "Ten partners",
    blurb: "Train with 10 different people.",
    metric: "partners",
    target: 10,
    xp: 300,
  },
  {
    key: "sixty-sessions",
    title: "Sixty",
    blurb: "Log 60 sessions.",
    metric: "sessions",
    target: 60,
    xp: 350,
  },
  {
    key: "six-good-weeks",
    title: "Half a semester",
    blurb: `Have six separate weeks that hit ${WEEK_TARGET} sessions.`,
    metric: "weeksHit",
    target: 6,
    xp: 400,
  },
  {
    key: "twenty-partners",
    title: "Twenty partners",
    blurb: "Train with 20 different people.",
    metric: "partners",
    target: 20,
    xp: 450,
  },
  {
    key: "hundred-sessions",
    title: "The hundred",
    blurb: "Log 100 sessions.",
    metric: "sessions",
    target: 100,
    xp: 500,
  },
];

/* ─────────────────────────  reading the ladder  ───────────────────────── */

/** Everything a challenge needs measuring against. Straight from db/league.sql. */
export type Counters = {
  sessions: number;
  partners: number;
  newPartners: number;
  gyms: number;
  days: number;
  weeksHit: number;
  monthsHit: number;
  km: number;
};

export const emptyCounters: Counters = {
  sessions: 0,
  partners: 0,
  newPartners: 0,
  gyms: 0,
  days: 0,
  weeksHit: 0,
  monthsHit: 0,
  km: 0,
};

/** How many main gyms this school has — the target for the grand tour. */
export function mainGymCount(universityKey: string): number {
  return gymsFor(universityKey).filter((g) => g.kind === "main").length;
}

/** The concrete number for a challenge at a given school. */
export function challengeTarget(c: Challenge, universityKey: string): number {
  return c.target === "allMainGyms" ? Math.max(1, mainGymCount(universityKey)) : c.target;
}

export type ChallengeProgress = {
  challenge: Challenge;
  target: number;
  have: number;
  done: boolean;
  /** 0–1. */
  fraction: number;
};

/** Where you stand on every challenge, in ladder order. */
export function ladderProgress(c: Counters, universityKey: string): ChallengeProgress[] {
  return challengeLadder.map((ch) => {
    const target = challengeTarget(ch, universityKey);
    const have = Math.floor(c[ch.metric] ?? 0);
    return {
      challenge: ch,
      target,
      have: Math.min(have, target),
      done: have >= target,
      fraction: target > 0 ? Math.min(1, have / target) : 0,
    };
  });
}

/** XP earned from every challenge finished. */
export function challengeXp(c: Counters, universityKey: string): number {
  return ladderProgress(c, universityKey)
    .filter((p) => p.done)
    .reduce((sum, p) => sum + p.challenge.xp, 0);
}

/** The one to show: the first unfinished challenge, or null when all are done. */
export function nextChallenge(
  c: Counters,
  universityKey: string,
): ChallengeProgress | null {
  return ladderProgress(c, universityKey).find((p) => !p.done) ?? null;
}

/* ═══════════════════════  the house ladder  ═══════════════════════ */

/*
  Community-scale, on purpose: numbers no single person could reach on their
  own. Your own sessions already lift the house just by existing — these are
  the extra on top, the thing you can only finish together.

  "Everyone in" is the best one here and the reason the shape works. The last
  three people who haven't logged anything are the whole game, and getting them
  in is something only their friends can do. A leaderboard cannot make that
  happen; a bar that stops one short can.
*/
export type HouseMetric = "sessions" | "partners" | "km" | "actives";

export type HouseChallenge = {
  key: string;
  title: string;
  blurb: string;
  metric: HouseMetric;
  /** `"allMembers"` is the house's own size, whatever that turns out to be. */
  target: number | "allMembers";
  xp: number;
};

export const houseChallengeLadder: HouseChallenge[] = [
  {
    key: "house-first-ten",
    title: "Off the mark",
    blurb: "Log 10 sessions between you.",
    metric: "sessions",
    target: 10,
    xp: 200,
  },
  {
    key: "house-everyone-in",
    title: "Everyone in",
    blurb: "Every single member logs at least one session.",
    metric: "actives",
    target: "allMembers",
    xp: 600,
  },
  {
    key: "house-hundred",
    title: "The first hundred",
    blurb: "Log 100 sessions between you.",
    metric: "sessions",
    target: 100,
    xp: 500,
  },
  {
    key: "house-fifty-partnerships",
    title: "Fifty partnerships",
    blurb: "Build 50 training partnerships between you.",
    metric: "partners",
    target: 50,
    xp: 600,
  },
  {
    key: "house-250-km",
    title: "Two hundred and fifty",
    blurb: "Cover 250 km between you.",
    metric: "km",
    target: 250,
    xp: 700,
  },
  {
    key: "house-five-hundred",
    title: "Five hundred",
    blurb: "Log 500 sessions between you.",
    metric: "sessions",
    target: 500,
    xp: 1000,
  },
  {
    key: "house-thousand",
    title: "The thousand",
    blurb: "Log 1,000 sessions between you.",
    metric: "sessions",
    target: 1000,
    xp: 1500,
  },
];

export type HouseCounters = {
  sessions: number;
  partners: number;
  km: number;
  /** Members who have logged at least one session. */
  actives: number;
  /** Everybody who lives there, training or not. */
  members: number;
};

export const emptyHouseCounters: HouseCounters = {
  sessions: 0,
  partners: 0,
  km: 0,
  actives: 0,
  members: 0,
};

export type HouseChallengeProgress = {
  challenge: HouseChallenge;
  target: number;
  have: number;
  done: boolean;
  fraction: number;
};

export function houseLadderProgress(c: HouseCounters): HouseChallengeProgress[] {
  return houseChallengeLadder.map((ch) => {
    const target = ch.target === "allMembers" ? Math.max(1, c.members) : ch.target;
    const have = Math.floor(c[ch.metric] ?? 0);
    return {
      challenge: ch,
      target,
      have: Math.min(have, target),
      // A house with nobody in it has not finished "everyone in".
      done: c.members > 0 && have >= target,
      fraction: target > 0 ? Math.min(1, have / target) : 0,
    };
  });
}

export function houseChallengeXp(c: HouseCounters): number {
  return houseLadderProgress(c)
    .filter((p) => p.done)
    .reduce((sum, p) => sum + p.challenge.xp, 0);
}
