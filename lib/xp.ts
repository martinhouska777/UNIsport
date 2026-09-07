/*
  XP AND LEVELS — the rules of the League, as DATA.
  ---------------------------------------------------------------------------
  Every number that decides how fast anyone levels up lives HERE, in one file,
  as a plain constant (rule 7). The database only ever COUNTS things; it does
  not know what a session is worth. That split is deliberate: changing the
  new-partner multiplier from 2.5 to 3 is one line in this file and takes
  effect everywhere — on your own screen and on everybody else's row on the
  board — with no migration and no SQL edit.

  WHY MULTIPLIERS RATHER THAN BONUSES
    A session alone is 10. With a partner it is worth half as much again, and
    with someone you have never trained with before it is worth two and a half
    times as much. Level 2 is therefore ten solo sessions OR four sessions with
    new people. Nobody has to be told that the social route is faster; they
    work it out in a week and start looking for partners, which is the entire
    point of the app.

  THE CURVE
    Each level costs 50 XP more than the last: 100, 250, 450, 700, 1000…
    Early levels arrive fast (the hook), later ones are a grind — but because
    high-tier challenges pay far more than low-tier ones (lib/challenges.ts),
    both sides of the equation grow together and progress never stalls.
*/

/* ─────────────────────────────  the rates  ───────────────────────────── */

/** A logged session, trained alone. */
export const XP_PER_SESSION = 10;

/** Trained with someone from the app. */
export const PARTNER_MULTIPLIER = 1.5;

/**
 * Trained with someone you have never trained with before.
 * The big one, and the reason it is safe: the app only counts a partner you
 * actually picked from the people list, and a chat-planned session has to be
 * confirmed by the other person. You cannot tag half the campus from a sofa.
 */
export const NEW_PARTNER_MULTIPLIER = 2.5;

/** What one session is worth in each of the three cases. */
export const sessionXp = {
  solo: XP_PER_SESSION,
  partner: Math.round(XP_PER_SESSION * PARTNER_MULTIPLIER),
  newPartner: Math.round(XP_PER_SESSION * NEW_PARTNER_MULTIPLIER),
} as const;

/**
 * The first level costs this much, and every level after costs STEP more than
 * the one before it.
 */
export const FIRST_LEVEL_COST = 100;
export const LEVEL_STEP = 50;

/* ─────────────────────────────  the curve  ───────────────────────────── */

/**
 * Total XP needed to REACH `level`. Level 1 is where everyone starts, so it
 * costs nothing.
 *   2 → 100      3 → 250      4 → 450      5 → 700      6 → 1000
 */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.floor(level));
  // Sum of the growing costs, closed form: 25(n-1)(n+2) with the values above.
  return ((n - 1) * (2 * FIRST_LEVEL_COST + (n - 2) * LEVEL_STEP)) / 2;
}

export type LevelProgress = {
  level: number;
  /** XP earned since reaching this level. */
  into: number;
  /** XP the whole of this level costs (into + toGo). */
  span: number;
  /** XP still needed for the next level. */
  toGo: number;
  /** 0–1, how far across this level you are. */
  fraction: number;
  /** Total XP needed to reach the next level. */
  nextAt: number;
};

/** Where a given XP total sits on the curve. */
export function levelProgress(xp: number): LevelProgress {
  const total = Math.max(0, Math.round(xp));
  let level = 1;
  // The curve is unbounded but grows fast; this settles in a few dozen steps
  // even for a number nobody will ever reach.
  while (xpForLevel(level + 1) <= total) level += 1;
  const base = xpForLevel(level);
  const nextAt = xpForLevel(level + 1);
  const span = nextAt - base;
  const into = total - base;
  return {
    level,
    into,
    span,
    toGo: Math.max(0, nextAt - total),
    fraction: span > 0 ? Math.min(1, into / span) : 0,
    nextAt,
  };
}

export function levelFromXp(xp: number): number {
  return levelProgress(xp).level;
}

/* ─────────────────────────  a house's level  ───────────────────────── */

/**
 * A house needs this many times the XP of one person to reach the same level.
 *
 * A HOUSE IS RANKED ON ITS TOTAL, NOT ITS AVERAGE — deliberately. A five-person
 * house on ten sessions sitting next to a house already at fifty is exactly the
 * pressure that makes people recruit their friends and nag the ones who haven't
 * been. Fairness to small houses is not what this number is for; the weekly
 * house-vs-house duel (which matches houses of similar size) is where that
 * belongs.
 */
export const HOUSE_LEVEL_FACTOR = 5;

export function xpForHouseLevel(level: number): number {
  return xpForLevel(level) * HOUSE_LEVEL_FACTOR;
}

/** The same curve, stretched. Reported against the house's REAL XP total. */
export function houseLevelProgress(xp: number): LevelProgress {
  const scaled = levelProgress(Math.max(0, Math.round(xp)) / HOUSE_LEVEL_FACTOR);
  return {
    level: scaled.level,
    into: scaled.into * HOUSE_LEVEL_FACTOR,
    span: scaled.span * HOUSE_LEVEL_FACTOR,
    toGo: scaled.toGo * HOUSE_LEVEL_FACTOR,
    fraction: scaled.fraction,
    nextAt: scaled.nextAt * HOUSE_LEVEL_FACTOR,
  };
}

/* ─────────────────────────────  the ring  ───────────────────────────── */

/*
  The level border worn around a person's avatar everywhere they appear. It is
  the part OTHER people see, which is what makes it worth having — a number on
  a board is private, a border on your face in Match is status.

  Only the TIER is decided here. The colours are not: they come from the school
  theme and from the person's own house colour, both of which are data, so the
  ring re-skins with the university like everything else (rule 1).
*/
export type RingTier = 0 | 1 | 2 | 3 | 4;

export function ringTier(level: number): RingTier {
  if (level >= 9) return 4;
  if (level >= 7) return 3;
  if (level >= 5) return 2;
  if (level >= 3) return 1;
  return 0;
}

/* ─────────────────────────  counting the XP  ───────────────────────── */

/**
 * The three session counts the database hands back, already capped at two a
 * day. Kept as one shape so the same maths runs for you and for every row on
 * the board.
 */
export type SessionCounts = {
  solo: number;
  partner: number;
  newPartner: number;
};

/** XP earned purely by turning up (before any challenge rewards). */
export function activityXp(c: SessionCounts): number {
  return (
    c.solo * sessionXp.solo +
    c.partner * sessionXp.partner +
    c.newPartner * sessionXp.newPartner
  );
}

/** "×2.5" — for explaining a multiplier on screen without trailing zeros. */
export function multiplierLabel(m: number): string {
  return `×${Number(m.toFixed(2))}`;
}
