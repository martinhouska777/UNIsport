/*
  THE DAILY CHECK-IN — how the athlete arrived at training today.
  ---------------------------------------------------------------------------
  The log says what the body DID. This says what the body was LIKE: the things
  a rower already knows on the way to the boathouse and nobody ever writes
  down. Owner, 2026-09-19: "daily sleep, how tired he is, and the classic
  things".

  NUMBERS, NOT WORDS (owner, 2026-09-19). The first build asked "how do you
  feel?" and offered Fresh / Good / OK / Tired / Wrecked. His objection, and he
  is right: "you can't really collect data from asking how did you feel, tired
  or something". Five words is a mood; a 1–10 is a series. So tiredness and
  soreness are scored out of ten, and they can be averaged, compared week to
  week, and read against the training that caused them.

  Sleep stays in HOURS. It is the one answer that is already a measurement —
  scoring a night's sleep out of ten would throw away the only hard number in
  the card.

  THREE TAPS: hours slept, tiredness 1–10, soreness 1–10.

  TODAY ONLY (owner, 2026-09-19). You cannot fill in Tuesday on Friday: how a
  Tuesday felt is not something anyone remembers accurately three days later,
  and a check-in you can back-fill is a check-in you invent. A missed day stays
  missed, and the Recovery numbers say how many days were actually answered so
  a thin week can't pretend to be a full one.

  IT IS YOURS. The coach does not see it (owner, 2026-09-19: "it would be
  individual"). It reads back to one place only — the Recovery group in your
  own Statistics — where it is averaged over whatever window the graph is on.

  Stored on the athlete's own varsity record, keyed by ISO date
  (profiles.data.varsity.checkIns), exactly like the days out next door — no
  new table and no SQL to apply. See lib/varsity/athleteProfile.ts.

  Every option below is DATA (rule 7): the scales, their ends and their words
  are entries in this file, never something a screen decides. No colours are
  chosen here — the card is drawn in theme tokens (rule 1).
*/

/** One day's answers. Any of them may be unanswered — three taps, in any order. */
export type CheckIn = {
  /** Hours slept, one of sleepOptions. Null = not answered. */
  sleep: number | null;
  /** How tired, 1 (fresh) … 10 (wrecked). Null = not answered. */
  tired: number | null;
  /** How sore, 1 (nothing) … 10 (bad). Null = not answered. */
  sore: number | null;
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

/** The 1–10 every score in this file is on. */
export const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

/*
  THE TWO SCORES, and the WORDS AT THEIR ENDS. A bare 1–10 doesn't say which
  end is bad, and a scale nobody reads the same way twice is not data either —
  so each one carries the word for 1 and the word for 10. That is the whole
  legend: no instructions, no explanation (owner, 2026-09-19: the small text
  shouldn't explain how to do it).

  Adding a third score — stress, motivation, appetite — is an entry here.
*/
export const scoreQuestions: {
  key: "tired" | "sore";
  label: string;
  low: string;
  high: string;
  /** How it reads in a one-line summary: "Tired 6". */
  short: string;
}[] = [
  { key: "tired", label: "Tiredness", low: "Fresh", high: "Wrecked", short: "Tired" },
  { key: "sore", label: "Soreness", low: "None", high: "Bad", short: "Sore" },
];

/** An empty day's record — what the card starts from. */
export const emptyCheckIn = (): CheckIn => ({ sleep: null, tired: null, sore: null });

/** Nothing answered at all — the day doesn't count towards anything. */
export const checkInIsEmpty = (c: CheckIn | undefined): boolean =>
  !c || (c.sleep === null && c.tired === null && c.sore === null);

/** All three answered — what the tick on the button means. */
export const checkInIsDone = (c: CheckIn | undefined): boolean =>
  !!c && c.sleep !== null && c.tired !== null && c.sore !== null;

/** "7h · Tired 6 · Sore 3" — the day in one line, skipping what's unanswered. */
export function checkInSummary(c: CheckIn | undefined): string {
  if (!c) return "";
  const bits: string[] = [];
  if (c.sleep !== null) bits.push(sleepText(c.sleep));
  for (const q of scoreQuestions) {
    const v = c[q.key];
    if (v !== null) bits.push(`${q.short} ${v}`);
  }
  return bits.join(" · ");
}

/*
  Older accounts have nothing here, and a record written by an earlier build
  holds the old word-scale answers — the same lesson the days out learned the
  hard way (a null where a map was expected crashed half the app). Everything
  is checked on the way in, and anything that isn't an answer on today's scales
  is simply dropped rather than drawn as a number it never was.
*/
const onScale = (v: unknown): number | null =>
  typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 10 ? v : null;

export function cleanCheckIns(v: unknown): CheckIns {
  if (!v || typeof v !== "object" || Array.isArray(v)) return {};
  const out: CheckIns = {};
  for (const [iso, raw] of Object.entries(v as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) continue;
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const c: CheckIn = {
      sleep: (sleepOptions as readonly number[]).includes(r.sleep as number)
        ? (r.sleep as number)
        : null,
      tired: onScale(r.tired),
      sore: onScale(r.sore),
    };
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
  /** Average tiredness, 1–10. Null = none answered. */
  avgTired: number | null;
  /** Average soreness, 1–10. Null = none answered. */
  avgSore: number | null;
};

/**
 * THE WINDOW, READ BACK. Deliberately plain arithmetic: averages, and a count
 * of the nights short of seven hours. No single "readiness score" — adding the
 * three answers together and calling it 76% is invented precision (agreed with
 * the owner, 15 Sep).
 */
export function recoverySummary(
  checkIns: CheckIns,
  fromIso: string,
  toIso: string,
): RecoverySummary {
  const days = Object.entries(checkIns).filter(([iso]) => iso >= fromIso && iso <= toIso);
  const pick = (f: (c: CheckIn) => number | null) =>
    days.map(([, c]) => f(c)).filter((v): v is number => v !== null);
  const sleeps = pick((c) => c.sleep);
  const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : null);
  return {
    days: days.length,
    avgSleep: avg(sleeps),
    shortNights: sleeps.filter((h) => h < 7).length,
    avgTired: avg(pick((c) => c.tired)),
    avgSore: avg(pick((c) => c.sore)),
  };
}
