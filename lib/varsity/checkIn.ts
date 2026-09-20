/*
  THE DAILY CHECK-IN — how the athlete arrived at training today.
  ---------------------------------------------------------------------------
  The log says what the body DID. This says what the body was LIKE: the two
  numbers a rower already knows on the way to the boathouse and nobody ever
  writes down. Owner, 2026-09-19: "daily sleep, how tired he is, and the
  classic things", answered as "sleep, tired and sore".

  THREE QUESTIONS, ALL TAPS, NOTHING TYPED:
    • how many hours you slept
    • how you feel  (Fresh … Wrecked)
    • where you are sore  (body parts, or Nothing sore)

  TODAY ONLY (owner, 2026-09-19). You cannot fill in Tuesday on Friday: how a
  Tuesday felt is not something anyone remembers accurately three days later,
  and a check-in you can back-fill is a check-in you invent. A missed day stays
  missed, and the Recovery numbers say how many days you actually answered so
  a thin week can't pretend to be a full one.

  IT IS YOURS. The coach does not see it (owner, 2026-09-19: "it would be
  individual"). It reads back to one place only — the Recovery group in your
  own Statistics — where it is averaged over whatever window the graph is on.

  Stored on the athlete's own varsity record, keyed by ISO date
  (profiles.data.varsity.checkIns), exactly like the days out next door — no
  new table and no SQL to apply. See lib/varsity/athleteProfile.ts.

  Every option below is DATA (rule 7): adding a body part or renaming a feeling
  is an entry in this file, never a change to a screen. No colours are decided
  here — the card is drawn in theme tokens (rule 1).
*/

/** One day's answers. Any of them may be unanswered — three taps, in any order. */
export type CheckIn = {
  /** Hours slept, as one of sleepOptions. Null = not answered. */
  sleep: number | null;
  /** How you feel, as a feelOptions value (5 fresh … 1 wrecked). Null = not answered. */
  feel: number | null;
  /** Where you are sore: soreOptions labels, or [SORE_NONE] for nothing. */
  sore: string[];
};

/** ISO date (yyyy-mm-dd) → that day's answers. */
export type CheckIns = Record<string, CheckIn>;

/*
  HOURS SLEPT, as five taps rather than a number pad. The ends are open —
  "5 or less" and "9 or more" — because the difference between four hours and
  five is not a difference anyone acts on, and a rower who slept eleven hours
  does not want to hunt for 11 on a scale.
*/
export const sleepOptions = [5, 6, 7, 8, 9] as const;
export const sleepLabel = (h: number) => (h <= 5 ? "≤5" : h >= 9 ? "9+" : String(h));
/** The figure with its unit, for a summary line: "7h", "9h+". */
export const sleepText = (h: number) => `${sleepLabel(h)}h`;

/*
  HOW YOU FEEL — the same five steps the log's effort scale uses, and for the
  same reason: a rower with wet hands will not place a finger on a ten-point
  scale, and these are words a boathouse already says out loud. Read left to
  right, best first, so the good end is where the eye starts.
*/
export const feelOptions: { value: number; label: string }[] = [
  { value: 5, label: "Fresh" },
  { value: 4, label: "Good" },
  { value: 3, label: "OK" },
  { value: 2, label: "Tired" },
  { value: 1, label: "Wrecked" },
];

export const feelLabel = (v: number | null | undefined): string | null =>
  feelOptions.find((o) => o.value === v)?.label ?? null;

/** The nearest word to an average of several days ("3.4" reads as OK). */
export const feelNearest = (avg: number): string =>
  feelOptions.reduce((best, o) =>
    Math.abs(o.value - avg) < Math.abs(best.value - avg) ? o : best,
  ).label;

/*
  WHERE IT HURTS — tapped, not scored (the 15 Sep shape: "sore WHERE, tap a
  body part, not a number"). A number for soreness says nothing a coach or a
  rower can act on; "lower back, four days this week" does.

  Rowing's own list, roughly top to bottom, plus the hands — which is not a
  joke in a rowing squad. "Nothing sore" is one of the answers, not the absence
  of one, so a day you felt fine is a day you answered.
*/
export const SORE_NONE = "Nothing sore";
export const soreOptions = [
  SORE_NONE,
  "Lower back",
  "Legs",
  "Shoulders",
  "Arms",
  "Knees",
  "Neck",
  "Ribs",
  "Hands",
] as const;

/** An empty day's record — what the card starts from. */
export const emptyCheckIn = (): CheckIn => ({ sleep: null, feel: null, sore: [] });

/** Nothing answered at all — the card is untouched, the day doesn't count. */
export const checkInIsEmpty = (c: CheckIn | undefined): boolean =>
  !c || (c.sleep === null && c.feel === null && c.sore.length === 0);

/** All three answered — what the card's tick means. */
export const checkInIsDone = (c: CheckIn | undefined): boolean =>
  !!c && c.sleep !== null && c.feel !== null && c.sore.length > 0;

/**
 * TAPPING A BODY PART. "Nothing sore" and an actual part cannot both be true,
 * so each one clears the other; tapping a part you already picked takes it off.
 */
export function toggleSore(sore: string[], part: string): string[] {
  if (part === SORE_NONE) return sore.includes(SORE_NONE) ? [] : [SORE_NONE];
  const without = sore.filter((s) => s !== SORE_NONE);
  return without.includes(part) ? without.filter((s) => s !== part) : [...without, part];
}

/** "7h · Tired · Lower back" — the day in one line, skipping what's unanswered. */
export function checkInSummary(c: CheckIn | undefined): string {
  if (!c) return "";
  const bits: string[] = [];
  if (c.sleep !== null) bits.push(sleepText(c.sleep));
  const f = feelLabel(c.feel);
  if (f) bits.push(f);
  if (c.sore.length) bits.push(c.sore.includes(SORE_NONE) ? "No soreness" : c.sore.join(", "));
  return bits.join(" · ");
}

/*
  Older accounts have nothing here, and a hand-edited record could hold
  anything at all — the same lesson the days out learned the hard way (a null
  where a map was expected crashed half the app). Everything is checked on the
  way in, and anything that isn't an answer is simply dropped.
*/
export function cleanCheckIns(v: unknown): CheckIns {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: CheckIns = {};
  for (const [iso, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Partial<CheckIn>;
    const sleep = (sleepOptions as readonly number[]).includes(r.sleep as number)
      ? (r.sleep as number)
      : null;
    const feel = feelOptions.some((o) => o.value === r.feel) ? (r.feel as number) : null;
    const sore = Array.isArray(r.sore)
      ? r.sore.filter((s): s is string => (soreOptions as readonly string[]).includes(s))
      : [];
    const c = { sleep, feel, sore };
    if (!checkInIsEmpty(c)) out[iso] = c;
  }
  return out;
}

/* ── What Statistics reads back ─────────────────────────────────────────── */

export type RecoverySummary = {
  /** Days in the window with something answered. */
  days: number;
  /** Average hours slept, over the days that answered it. Null = none did. */
  avgSleep: number | null;
  /** Nights under seven hours — the count that actually changes behaviour. */
  shortNights: number;
  /** Average of the feel answers, 1–5. Null = none answered. */
  avgFeel: number | null;
  /** The body part ticked most often, and how many days. Null = nothing sore. */
  sorest: { part: string; days: number } | null;
};

/**
 * THE WINDOW, READ BACK. Deliberately plain counting: an average, a count of
 * short nights, an average feeling and the part that came up most. No single
 * "readiness score" — adding four answers together and calling it 76% is
 * invented precision (agreed with the owner, 15 Sep).
 */
export function recoverySummary(
  checkIns: CheckIns,
  fromIso: string,
  toIso: string,
): RecoverySummary {
  const days = Object.entries(checkIns).filter(([iso]) => iso >= fromIso && iso <= toIso);
  const sleeps = days.map(([, c]) => c.sleep).filter((v): v is number => v !== null);
  const feels = days.map(([, c]) => c.feel).filter((v): v is number => v !== null);
  const counts: Record<string, number> = {};
  for (const [, c] of days) {
    for (const part of c.sore) if (part !== SORE_NONE) counts[part] = (counts[part] ?? 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null);
  return {
    days: days.length,
    avgSleep: avg(sleeps),
    shortNights: sleeps.filter((h) => h < 7).length,
    avgFeel: avg(feels),
    sorest: top ? { part: top[0], days: top[1] } : null,
  };
}
