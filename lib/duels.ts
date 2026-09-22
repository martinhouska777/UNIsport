/*
  HOUSE DUELS — house against house, one on one, as DATA.
  ---------------------------------------------------------------------------
  The interhouse competition used to be a table of twelve. A table is a
  standing; a DUEL is a fight you can lose by Friday. So each round every house
  that is IN gets drawn against exactly one other house, both chase the SAME
  finish line, and the first one over it wins. There is no second place in a
  duel, which is the entire point: "we're seventh" is a shrug, "we're 40 km
  behind Kirkland and there are nine days left" is a group chat.

  THREE RULES, and all three are data in this file.

  1. WHO IS IN. The same gate the competition already used (INTERHOUSE in
     lib/events.ts): a house is in once `minMembers` of its people have
     `qualifyPoints`+ this month. A house that is not in is not drawn — it sits
     on the list underneath with how many more people it needs, because a door
     with a number on it is a reason to drag a friend in.

  2. WHO FIGHTS WHOM — a RANDOM draw among the houses that are in (owner,
     2026-09-22). Random, but not arbitrary: the shuffle is seeded by the MONTH
     NUMBER, so every phone on campus draws exactly the same fixtures, the draw
     changes on its own when the month turns, and nobody has to set anything.
     No admin, ever — the same principle the challenges run on. An odd number
     of houses means one sits the round out; it is told so rather than being
     quietly dropped.

  3. WHAT THEY RACE OVER — one discipline per round, rotating, so the month a
     house full of runners cannot win is followed by the month it can. Adding
     one is an entry in the list below; pinning one forever is deleting the
     others. The targets are the tuning knob — every one of them is a number
     typed here and nowhere else.

  FIRST TO THE TARGET WINS (owner, 2026-09-22). The instant a house crosses,
  the duel is over and it says so. If the month ends with neither across —
  which means the target was set too high and should be lowered here — whoever
  is ahead takes it, because a duel with no result is worse than a close one.

  Nothing here reads the database. The numbers come from db/events.sql (km,
  sessions, new people) and the month's campus board (points); this file only
  decides who is fighting, over what, and who has won.
*/
import { monthNumber } from "@/lib/events";

/* ─────────────────────────────  the disciplines  ───────────────────────────── */

export type DuelMetric = "points" | "distance" | "newPeople" | "sessions";

export type DuelDiscipline = {
  key: DuelMetric;
  /** The rule, whole, in one line: "First to 200 km". */
  title: string;
  /** The finish line. THE knob — lower it if duels keep ending undecided. */
  target: number;
  /** What sits after a number on a row: "128 km". */
  unit: string;
};

export const DUEL_DISCIPLINES: DuelDiscipline[] = [
  { key: "points", title: "First to 600 points", target: 600, unit: "pts" },
  { key: "distance", title: "First to 200 km", target: 200, unit: "km" },
  {
    key: "newPeople",
    title: "First to 25 new people",
    target: 25,
    unit: "new",
  },
  {
    key: "sessions",
    title: "First to 150 sessions",
    target: 150,
    unit: "sessions",
  },
];

/** Which one is running. The month decides, so the whole campus agrees. */
export function duelNow(now = new Date()): DuelDiscipline {
  const i =
    ((monthNumber(now) % DUEL_DISCIPLINES.length) + DUEL_DISCIPLINES.length) %
    DUEL_DISCIPLINES.length;
  return DUEL_DISCIPLINES[i];
}

/* ─────────────────────────────  the draw  ───────────────────────────── */

/*
  A shuffle that is random to look at and identical on every phone: the same
  seed always deals the same fixtures. (A plain linear congruential generator —
  nothing here needs cryptography, it needs everyone to agree.)
*/
function dealer(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export type Duel = { a: string; b: string };

/**
 * Draw the houses that are in into pairs. `keys` is sorted first so the draw
 * depends on the seed and on WHO is in — never on the order they arrived in.
 */
export function drawDuels(
  keys: string[],
  seed: number,
): { duels: Duel[]; bye: string | null } {
  const pool = [...keys].sort((a, b) => a.localeCompare(b));
  const next = dealer(seed);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const duels: Duel[] = [];
  for (let i = 0; i + 1 < pool.length; i += 2)
    duels.push({ a: pool[i], b: pool[i + 1] });
  return { duels, bye: pool.length % 2 === 1 ? pool[pool.length - 1] : null };
}

/* ─────────────────────────────  the result  ───────────────────────────── */

export type DuelSide = { key: string; value: number };

export type DuelResult = {
  /** The house that has crossed the line, or null while both are short. */
  winner: string | null;
  /** Whoever is ahead right now. Null on a dead heat. */
  leader: string | null;
  /** What the one behind needs to draw level. 0 when level or ahead. */
  gap: number;
};

/** Who has won, or who is ahead. */
export function duelResult(
  a: DuelSide,
  b: DuelSide,
  target: number,
): DuelResult {
  const aOver = a.value >= target;
  const bOver = b.value >= target;
  // Both across between two reads of the board is possible and rare; the
  // bigger number got there first.
  const winner =
    aOver || bOver
      ? a.value === b.value
        ? null
        : a.value > b.value
          ? a.key
          : b.key
      : null;
  const leader = a.value === b.value ? null : a.value > b.value ? a.key : b.key;
  return { winner, leader, gap: Math.abs(a.value - b.value) };
}
