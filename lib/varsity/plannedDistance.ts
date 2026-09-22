/*
  HOW FAR THE COACH ASKED FOR — read out of the words already on the session.
  ---------------------------------------------------------------------------
  The owner, 2026-09-22:

    "Let's say you prescribed 100 km and some person actually rode 110… you're
     at 14 km today, right? Somebody actually is at 13, so he's −1 km. The crew
     could have done 15.5."

  A session on the plan carries NO number of its own: it is a category, an
  intensity and a line of free text ("14k UT2", "3×5' @ 28", "70' steady
  state"). Rather than making a coach type a distance on top of the wording
  they already write, this reads the distance OUT of that wording. A coach
  changes nothing about how they plan.

  THE RULES, deliberately few and deliberately shy — a number that is wrong is
  worse than no number, because the whole point of it is a comparison:

    1. A session written in MINUTES is not a distance, whatever else is in it.
       "3×25' UT2", "70' steady state", "50 mins" are time, and "3×5' (1:50 at
       72, 2k+2)" mentions a 2k only as the split to hold. All → nothing.
    2. Otherwise the FIRST distance in the line is the one, and anything after
       it is ignored. "4 mile or 2 mile trial" is read as 4 miles; "2 miles @
       32, 1 mile @ 34" is read as 2 miles. Under-reading beats inventing.
    3. Reps IMMEDIATELY in front of it multiply it: "2×2k" is 4 km, "8×500m" is
       4 km, "6×750m race pace" is 4.5 km.
    4. A range takes the number the unit is attached to: "14–16k" is 16k.
    5. Nothing over 100 km is believed — that is a typo, not an outing.

  A rest slot is never asked for at all. Everything else is fair game: the
  parse simply finds nothing in "Weights" or "60 mins".

  NO IMPORTS ON PURPOSE (bar a type), so this file can be run and checked on
  its own with `node --experimental-strip-types`.
*/

const METRES_PER_MILE = 1609.344;

/** More than this in one session is a typo, not a plan. */
const MOST_METRES = 100_000;

/*
  A piece written in minutes: 5', 25', "50 mins", "70 minutes". The apostrophe
  form is what a rowing plan actually uses, and it can be a curly one because
  a coach types on a phone.
*/
const TIME_RE = /\d\s*['’′]|\b\d+\s*min(ute)?s?\b/i;

/*
  A distance: a number, then a unit. `m` must not swallow the m of "mins" —
  rule 1 has already thrown those lines out, and \b keeps "500m," honest.
  The reps in front, when there are any, are the first group.
*/
const DIST_RE =
  /(?:(\d{1,2})\s*[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(km|k|m|miles|mile|mi)\b/i;

const FACTOR: Record<string, number> = {
  k: 1000,
  km: 1000,
  m: 1,
  mi: METRES_PER_MILE,
  mile: METRES_PER_MILE,
  miles: METRES_PER_MILE,
};

/**
 * The distance a line of plan wording asks for, in metres, or null when it
 * asks for no distance at all (a time piece, weights, an empty line).
 */
export function parseDistanceMetres(text: string | null | undefined): number | null {
  if (!text) return null;
  if (TIME_RE.test(text)) return null;
  const m = DIST_RE.exec(text);
  if (!m) return null;
  const reps = m[1] ? Number(m[1]) : 1;
  const value = Number(m[2].replace(",", "."));
  const factor = FACTOR[m[3].toLowerCase()];
  if (!Number.isFinite(reps) || !Number.isFinite(value) || !factor) return null;
  const metres = reps * value * factor;
  if (metres <= 0 || metres > MOST_METRES) return null;
  return metres;
}

/**
 * How far this session on the plan asks for, in metres. A rest slot asks for
 * nothing, and neither does a session whose wording carries no distance.
 */
export function plannedMetres(session: {
  category: string;
  description?: string | null;
}): number | null {
  if (session.category === "off") return null;
  return parseDistanceMetres(session.description);
}
