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
  | "weeks3" // weeks containing 3 or more sessions
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
    blurb: "Have two separate weeks with 3 or more sessions in them.",
    metric: "weeks3",
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
    blurb: "Have six separate weeks with 3 or more sessions in them.",
    metric: "weeks3",
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
  weeks3: number;
  km: number;
};

export const emptyCounters: Counters = {
  sessions: 0,
  partners: 0,
  newPartners: 0,
  gyms: 0,
  weeks3: 0,
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
