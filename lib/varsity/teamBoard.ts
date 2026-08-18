/*
  TEAM BOARD — turning shared results into a board.
  ---------------------------------------------------------------------------
  Two jobs, both pure:

    1. Which sessions in the coach's plan are team workouts, newest first.
    2. Given the results for one of them, rank / average them by the metric
       the viewer picked.

  WHY A METRIC PICKER AT ALL
    Splits favour big rowers: a 95 kg athlete moves the flywheel faster than a
    72 kg one at the same effort. So the board can be read four ways, and none
    of them is "the" truth:

      Split   — /500m. The fair comparison on any piece.
      Time or
      Distance— whichever one actually VARIED (see below).
      Watts   — raw power. Same ordering as split, in the units a physiologist
                uses.
      W / kg  — power per kilo of body weight. The lightweight's board.

  TIME OR DISTANCE, NEVER BOTH
    A piece fixes one of them and measures the other. On a 2K everyone rows
    2,000 m and the TIME is the result; on a 30' piece everyone rows thirty
    minutes and the DISTANCE is. Offering the fixed one as a metric produces a
    column of identical numbers and a ranking that means nothing, so the board
    works out which one the piece held constant and offers the other.

    It works that out from the results themselves rather than asking the coach:
    whichever of the two varies LESS across the squad is the one the piece
    fixed. No thresholds, nothing to configure, and it is right for any piece
    anyone invents.

    Watts come from the monitor when the scan read them, otherwise from the
    split via Concept2's own formula (ergMath.ts) — so a hand-typed result and
    a scanned one sit on the same board honestly.

  The metric list is DATA (rule 7): the screen loops over it and never hardcodes
  a label or a sort direction.
*/
import { deriveSplitSec, deriveWatts, wattsPerKg, secToSplit, secToClock } from "./ergMath";
import {
  parseSessionKey,
  dayKeyLabel,
  canBeTeamWorkout,
  type Session,
  type SessionMap,
  type BoardKind,
} from "./coachPlan";
import type { TeamResult } from "./resultsStore";

/* ── Which sessions have a board ─────────────────────────────────────────── */

export type TeamWorkout = {
  dayKey: string;
  date: Date;
  dateLabel: string; // "Tue 22 Jun"
  period: string; // AM | PM
  session: Session;
  board: BoardKind;
};

/*
  Every team workout in the plan, newest first. Two things are left out:
  sessions in the FUTURE (a board nobody could have rowed yet is just an empty
  screen), and anything canBeTeamWorkout() says can't carry one — so a flag left
  behind on a non-erg session by an older build can never raise a board.
*/
export function teamWorkouts(sessions: SessionMap, today = new Date()): TeamWorkout[] {
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  const out: TeamWorkout[] = [];
  for (const [dayKey, session] of Object.entries(sessions)) {
    if (!session.teamWorkout || !canBeTeamWorkout(session.category)) continue;
    const parsed = parseSessionKey(dayKey);
    if (!parsed || parsed.date > endOfToday) continue;
    out.push({
      dayKey,
      date: parsed.date,
      dateLabel: dayKeyLabel(dayKey),
      period: parsed.period,
      session,
      board: session.board === "ranked" ? "ranked" : "average",
    });
  }
  return out.sort((a, b) => b.date.getTime() - a.date.getTime() || a.period.localeCompare(b.period));
}

/* ── What kind of piece is this ──────────────────────────────────────────── */

export type PieceKind = "distance" | "time";

const mean = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

const median = (nums: number[]): number | null => {
  if (nums.length === 0) return null;
  const x = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(x.length / 2);
  return x.length % 2 ? x[mid] : (x[mid - 1] + x[mid]) / 2;
};

// Spread relative to size, so metres and minutes can be compared like for like.
function variation(nums: number[]): number {
  const m = mean(nums);
  if (m == null || m === 0) return Infinity;
  return Math.sqrt(mean(nums.map((n) => (n - m) ** 2))!) / m;
}

/*
  Did this piece fix the distance or the time? Whichever varied less is the one
  it fixed. A tie (one lone result, or a piece where both were prescribed) falls
  to "distance", which is what almost every erg test is.
*/
export function pieceKindOf(results: TeamResult[]): PieceKind {
  const metres = results.map((r) => r.metres).filter((v): v is number => v != null && v > 0);
  const minutes = results.map((r) => r.minutes).filter((v): v is number => v != null && v > 0);
  if (metres.length < 2 || minutes.length < 2) return "distance";
  return variation(minutes) < variation(metres) ? "time" : "distance";
}

/*
  A fingerprint for "the same piece", so a 2K can be compared with every other
  2K and never with a 6×500m. Built from what the piece FIXED plus how many reps
  it was rowed in — '8×500m' and 'a straight 4k' are both 4,000 m and are not
  the same workout.

  Distances round to the nearest 50 m and times to the nearest minute, so a
  monitor that recorded 1,998 m still matches the 2,000 m tests.
*/
export function pieceSignature(results: TeamResult[]): string | null {
  if (results.length === 0) return null;
  const kind = pieceKindOf(results);
  const reps = median(results.map((r) => r.intervals?.length ?? 0)) ?? 0;
  if (kind === "distance") {
    const m = median(results.map((r) => r.metres).filter((v): v is number => v != null && v > 0));
    return m ? `d${Math.round(m / 50) * 50}x${Math.round(reps)}` : null;
  }
  const t = median(results.map((r) => r.minutes).filter((v): v is number => v != null && v > 0));
  return t ? `t${Math.round(t)}x${Math.round(reps)}` : null;
}

/* ── The metrics ─────────────────────────────────────────────────────────── */

export type MetricKey = "split" | "time" | "distance" | "watts" | "wkg";

type MetricMeta = { key: MetricKey; label: string; sub: string; lowerIsBetter: boolean };

const METRICS: Record<MetricKey, MetricMeta> = {
  split: { key: "split", label: "Split", sub: "per 500 m", lowerIsBetter: true },
  time: { key: "time", label: "Time", sub: "total", lowerIsBetter: true },
  distance: { key: "distance", label: "Metres", sub: "total", lowerIsBetter: false },
  watts: { key: "watts", label: "Watts", sub: "average power", lowerIsBetter: false },
  wkg: { key: "wkg", label: "W / kg", sub: "power per kilo", lowerIsBetter: false },
};

/*
  The four ways to read a board. The second one is whichever of time/distance
  the piece did NOT fix — the fixed one is the same number for everybody and
  would rank the squad by rounding error.
*/
export function metricsFor(kind: PieceKind): MetricMeta[] {
  return [METRICS.split, kind === "time" ? METRICS.distance : METRICS.time, METRICS.watts, METRICS.wkg];
}

export const metricMeta = (key: MetricKey): MetricMeta => METRICS[key] ?? METRICS.split;

// The comparable number for one result under one metric (null = can't be read
// on this metric, e.g. W/kg for someone who hasn't set a weight).
export function metricValue(r: TeamResult, key: MetricKey): number | null {
  const splitSec = r.splitSec ?? deriveSplitSec(r.split, r.minutes, r.metres);
  switch (key) {
    case "split":
      return splitSec;
    case "time":
      return r.minutes != null && r.minutes > 0 ? r.minutes * 60 : null;
    case "distance":
      return r.metres != null && r.metres > 0 ? r.metres : null;
    case "watts":
      return deriveWatts(r.watts, splitSec);
    case "wkg":
      return wattsPerKg(deriveWatts(r.watts, splitSec), r.weightKg);
  }
}

// How that number reads on screen.
export function metricDisplay(value: number | null, key: MetricKey): string {
  if (value == null) return "—";
  switch (key) {
    case "split":
      return secToSplit(value, true);
    case "time":
      return secToClock(value);
    case "distance":
      return `${Math.round(value).toLocaleString("en-US")} m`;
    case "watts":
      return `${Math.round(value)} W`;
    case "wkg":
      return value.toFixed(2);
  }
}

/* ── The same piece, earlier ─────────────────────────────────────────────── */

/*
  Every time this squad has done a piece with the same fingerprint, newest
  first, paired with its results. This is what makes "am I getting faster"
  answerable: a 2K only means something next to your last three 2Ks.
*/
export type PastPiece = { workout: TeamWorkout; results: TeamResult[] };

export function samePieceHistory(
  workouts: TeamWorkout[],
  allResults: TeamResult[],
  signature: string | null,
  before?: Date,
): PastPiece[] {
  if (!signature) return [];
  const byDay = new Map<string, TeamResult[]>();
  for (const r of allResults) {
    const list = byDay.get(r.dayKey);
    if (list) list.push(r);
    else byDay.set(r.dayKey, [r]);
  }
  return workouts
    .filter((w) => !before || w.date < before)
    .map((w) => ({ workout: w, results: byDay.get(w.dayKey) ?? [] }))
    .filter((p) => p.results.length > 0 && pieceSignature(p.results) === signature)
    .sort((a, b) => b.workout.date.getTime() - a.workout.date.getTime());
}

/* One athlete's own run of a piece, over time. */
export type HistoryPoint = {
  dayKey: string;
  dateLabel: string;
  value: number | null;
  display: string;
  /* Improvement on the point BEFORE it, already signed so positive is always
     better whichever way the metric runs. Null for the earliest one. */
  improvement: number | null;
  best: boolean;
};

export function athleteHistory(
  past: PastPiece[],
  athleteId: string,
  metric: MetricKey,
): HistoryPoint[] {
  const lowerIsBetter = metricMeta(metric).lowerIsBetter;
  // Oldest first while we walk it, so each point can look one step back.
  const points = [...past]
    .reverse()
    .map((p) => {
      const mine = p.results.find((r) => r.athleteId === athleteId);
      return mine
        ? { dayKey: p.workout.dayKey, dateLabel: p.workout.dateLabel, value: metricValue(mine, metric) }
        : null;
    })
    .filter((p): p is { dayKey: string; dateLabel: string; value: number | null } => p != null);

  const values = points.map((p) => p.value).filter((v): v is number => v != null);
  const bestValue = values.length
    ? lowerIsBetter
      ? Math.min(...values)
      : Math.max(...values)
    : null;

  const out: HistoryPoint[] = points.map((p, i) => {
    const prev = points[i - 1]?.value ?? null;
    return {
      ...p,
      display: metricDisplay(p.value, metric),
      improvement:
        p.value != null && prev != null ? (lowerIsBetter ? prev - p.value : p.value - prev) : null,
      best: p.value != null && p.value === bestValue,
    };
  });
  return out.reverse(); // newest first for display
}

/*
  "−2.3s" / "+140 m" — an improvement, in the units of its metric.

  The SIGN is written the way a rower says it, not the way the subtraction ran:
  a better split is "−2.3s" (the clock went down) but a better distance is
  "+140 m" (the metres went up). Both are improvements; both are green.
*/
export function improvementLabel(improvement: number, metric: MetricKey): string {
  const better = improvement > 0;
  const size = Math.abs(improvement);
  const goesDownWhenBetter = metric === "split" || metric === "time";
  const body = goesDownWhenBetter
    ? `${size.toFixed(1)}s`
    : metric === "distance"
      ? `${Math.round(size).toLocaleString("en-US")} m`
      : metric === "watts"
        ? `${Math.round(size)} W`
        : size.toFixed(2);
  // A change that rounds away at the precision shown gets no sign — "+0.0s"
  // claims a direction the number doesn't have.
  if (/^0(\.0+)? ?\D*$/.test(body)) return body;
  return (goesDownWhenBetter === better ? "−" : "+") + body;
}

/* ── Building a board ────────────────────────────────────────────────────── */

export type BoardRow = {
  result: TeamResult;
  initials: string;
  value: number | null;
  display: string;
  rank: number | null; // ranked boards only; null when the metric can't read them
  mine: boolean;
  detail: string; // "22:30 · 6,240 m · r24"
  /* Against their own last go at this same piece. Positive = better. Null when
     they have never done it before (or the metric can't read one of the two). */
  improvement: number | null;
};

export type Board = {
  rows: BoardRow[];
  /* Rowed on something that isn't an erg — an RP3 reads a different split for
     the same effort, so these are listed apart instead of ranked against the
     ergs, exactly as the squad's spreadsheet has always done it. */
  otherMachineRows: BoardRow[];
  logged: number;
  average: number | null; // mean of the chosen metric across everyone who has one
  averageDisplay: string;
  avgMetres: number | null;
  avgMinutes: number | null;
  /* Squad depth: the mean of the fastest 8, 16 and 24. A crew is picked out of
     the top eight, so how deep the speed goes is its own number — this is the
     summary the squad's spreadsheet keeps year on year. */
  topAverages: { n: number; value: number; display: string }[];
};

// "Martin Houska" → "MH". Falls back to a dash so a nameless row still renders.
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

// The small line under a name: whatever of time / distance / rate exists.
function detailLine(r: TeamResult): string {
  const bits: string[] = [];
  if (r.minutes != null && r.minutes > 0) bits.push(secToClock(r.minutes * 60));
  if (r.metres != null && r.metres > 0) bits.push(`${Math.round(r.metres).toLocaleString("en-US")} m`);
  if (r.strokeRate != null) bits.push(`r${r.strokeRate}`);
  return bits.join(" · ");
}

/*
  Sort and number the results. On a RANKED board the rows are ordered by the
  metric (rows the metric can't read fall to the bottom, unranked, rather than
  being dropped — someone who logged the piece still did it). On an AVERAGE
  board nobody is ranked and the order is alphabetical, so the screen can never
  be read as a league table.
*/
export function buildBoard(
  results: TeamResult[],
  kind: BoardKind,
  metric: MetricKey,
  myId: string | null,
  /* The last time this squad rowed the same piece, so each row can show what
     that person has done since. Omit it and the improvement column is simply
     absent — never wrong, just missing. */
  previous?: TeamResult[],
): Board {
  const lowerIsBetter = metricMeta(metric).lowerIsBetter;
  const before = new Map((previous ?? []).map((r) => [r.athleteId, r]));

  const scored: BoardRow[] = results.map((result) => {
    const value = metricValue(result, metric);
    const prev = before.get(result.athleteId);
    const prevValue = prev ? metricValue(prev, metric) : null;
    return {
      result,
      initials: initialsOf(result.athleteName),
      value,
      display: metricDisplay(value, metric),
      rank: null,
      mine: !!myId && result.athleteId === myId,
      detail: detailLine(result),
      improvement:
        value != null && prevValue != null
          ? lowerIsBetter
            ? prevValue - value
            : value - prevValue
          : null,
    };
  });

  // An RP3 is a different machine reading a different split; ranking one
  // against the ergs would put a rower somewhere they did not earn.
  const isOtherMachine = (r: BoardRow) => !!r.result.monitor && r.result.monitor !== "C2";
  const main = scored.filter((r) => !isOtherMachine(r));
  const other = scored.filter(isOtherMachine);

  const byMetric = (a: BoardRow, b: BoardRow) => {
    if (a.value == null && b.value == null)
      return a.result.athleteName.localeCompare(b.result.athleteName);
    if (a.value == null) return 1;
    if (b.value == null) return -1;
    return lowerIsBetter ? a.value - b.value : b.value - a.value;
  };
  const byName = (a: BoardRow, b: BoardRow) =>
    a.result.athleteName.localeCompare(b.result.athleteName);

  if (kind === "ranked") {
    main.sort(byMetric);
    other.sort(byMetric);
    let n = 0;
    for (const row of main) if (row.value != null) row.rank = ++n;
  } else {
    main.sort(byName);
    other.sort(byName);
  }

  // Averages describe the SQUAD on the ergs; a different machine doesn't
  // belong in a number people compare year to year.
  const values = main.map((r) => r.value).filter((v): v is number => v != null);
  const average = mean(values);

  // Depth. Only quoted where the board is deep enough to fill the bracket —
  // a "top 24 average" over nineteen results is a different number pretending
  // to be the same one.
  const ranked = kind === "ranked" ? values : [...values].sort((a, b) => (lowerIsBetter ? a - b : b - a));
  const topAverages = [8, 16, 24]
    .filter((n) => ranked.length >= n)
    .map((n) => {
      const value = mean(ranked.slice(0, n))!;
      return { n, value, display: metricDisplay(value, metric) };
    });

  const mainResults = main.map((r) => r.result);
  return {
    rows: main,
    otherMachineRows: other,
    logged: results.length,
    average,
    averageDisplay: metricDisplay(average, metric),
    avgMetres: mean(
      mainResults.map((r) => r.metres).filter((v): v is number => v != null && v > 0),
    ),
    avgMinutes: mean(
      mainResults.map((r) => r.minutes).filter((v): v is number => v != null && v > 0),
    ),
    topAverages,
  };
}
