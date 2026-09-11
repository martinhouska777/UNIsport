/*
  POINTS — what a session is worth, as DATA.
  ---------------------------------------------------------------------------
  Every number that decides a score lives HERE, in one file, as a plain
  constant (rule 7). The database only ever COUNTS sessions; it does not know
  what one is worth. That split is deliberate: changing the new-partner
  multiplier from 2.5 to 3 is one line in this file and takes effect
  everywhere — on your own row and on everybody else's — with no migration and
  no SQL edit.

  WHY POINTS AND NOT A SESSION COUNT
    Not because "310 points" is more fun than "23 sessions" — it plainly is
    not, and that is why every board still shows the session count underneath.
    Points exist because they can PRICE BEHAVIOUR. A session with somebody new
    is worth two and a half times a session alone, which aims the whole
    leaderboard at the thing this app is actually for. A session count cannot
    say that.

    Nobody has to be told the social route is faster. They work it out in a
    week and start looking for partners.

  WHAT KEEPS IT HONEST
    Two guards, because every figure here is typed in by a person (see
    lib/honorCode.ts for the third, which is the campus itself):
      • at most TWO sessions a day count toward anything, and when a day holds
        more than two, the most valuable two are the ones that count.
      • the partner multipliers need a partner PICKED FROM THE APP — a real
        account, not a name typed into a box. You cannot invent people.

  NO LEVELS. A points total is the score, and that is the whole of it. A level
  would be a second currency layered over the first, telling you nothing the
  points do not already say.
*/

/* ─────────────────────────────  the rates  ───────────────────────────── */

/** A logged session, trained alone. */
export const POINTS_PER_SESSION = 10;

/** Trained with someone from the app you have trained with before. */
export const PARTNER_MULTIPLIER = 1.5;

/** Trained with someone from the app for the FIRST time. The big one. */
export const NEW_PARTNER_MULTIPLIER = 2.5;

/** How many sessions in one day can count. */
export const DAILY_SESSION_CAP = 2;

/*
  A PARTNER HAS TO SAY YES. Naming someone in Log Session sends them a
  request; only when they accept do both sides get the partner multiplier, and
  the session lands on their calendar too. Unanswered for this long, it scores
  as solo for the logger (db/partner_requests.sql reads this number).
*/
export const PARTNER_CONFIRM_HOURS = 24;

/** What a partner tag is in, right now. Null = from before tags had to be accepted. */
export type PartnerStatus = "pending" | "confirmed" | "declined" | "expired";

/** What one session is worth in each of the three cases. */
export const sessionPoints = {
  solo: POINTS_PER_SESSION,
  partner: Math.round(POINTS_PER_SESSION * PARTNER_MULTIPLIER),
  newPartner: Math.round(POINTS_PER_SESSION * NEW_PARTNER_MULTIPLIER),
} as const;

/* ─────────────────────────────  scoring  ───────────────────────────── */

/**
 * The three kinds of session, counted by db/leaderboards.sql. Kept apart all
 * the way to the screen so a row can say WHERE a score came from, rather than
 * handing over one number nobody can check.
 */
export type SessionKinds = {
  solo: number;
  partner: number;
  newPartner: number;
};

/** How many sessions those points came from. */
export function sessionsOf(k: SessionKinds): number {
  return k.solo + k.partner + k.newPartner;
}

/* ─────────────────────────────  labels  ───────────────────────────── */

/** "310 pts". Short on purpose — it sits at the end of a narrow row. */
export function pointsLabel(points: number): string {
  return `${points.toLocaleString("en-US")} pts`;
}

/**
 * The three rates, in the shape db/leaderboards.sql takes them. The SQL needs
 * them only to ORDER a board before cutting it to a limit — the number shown
 * on screen is always worked out here, so there is still one source of truth.
 */
export const rateArgs = {
  pts_solo: sessionPoints.solo,
  pts_partner: sessionPoints.partner,
  pts_new: sessionPoints.newPartner,
} as const;
