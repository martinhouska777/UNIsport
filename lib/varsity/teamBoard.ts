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

      Split   — /500m. The fair comparison when everyone did the same piece,
                including a fixed-TIME piece where the distances differ.
      Time    — total time. What people actually say about a 2K ("6:12"), but
                it only means something when everyone rowed the same distance.
      Watts   — raw power. Same ordering as split, in the units a physiologist
                uses.
      W / kg  — power per kilo of body weight. The lightweight's board.

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

/* ── The metrics ─────────────────────────────────────────────────────────── */

export type MetricKey = "split" | "time" | "watts" | "wkg";

export const boardMetrics: {
  key: MetricKey;
  label: string;
  sub: string;
  lowerIsBetter: boolean;
}[] = [
  { key: "split", label: "Split", sub: "per 500 m", lowerIsBetter: true },
  { key: "time", label: "Time", sub: "total", lowerIsBetter: true },
  { key: "watts", label: "Watts", sub: "average power", lowerIsBetter: false },
  { key: "wkg", label: "W / kg", sub: "power per kilo", lowerIsBetter: false },
];

export const metricMeta = (key: MetricKey) =>
  boardMetrics.find((m) => m.key === key) ?? boardMetrics[0];

// The comparable number for one result under one metric (null = can't be read
// on this metric, e.g. W/kg for someone who hasn't set a weight).
export function metricValue(r: TeamResult, key: MetricKey): number | null {
  const splitSec = r.splitSec ?? deriveSplitSec(r.split, r.minutes, r.metres);
  switch (key) {
    case "split":
      return splitSec;
    case "time":
      return r.minutes != null && r.minutes > 0 ? r.minutes * 60 : null;
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
    case "watts":
      return `${Math.round(value)} W`;
    case "wkg":
      return value.toFixed(2);
  }
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
};

export type Board = {
  rows: BoardRow[];
  logged: number;
  average: number | null; // mean of the chosen metric across everyone who has one
  averageDisplay: string;
  avgMetres: number | null;
  avgMinutes: number | null;
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

const mean = (nums: number[]) =>
  nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;

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
): Board {
  const scored = results.map((result) => {
    const value = metricValue(result, metric);
    return {
      result,
      initials: initialsOf(result.athleteName),
      value,
      display: metricDisplay(value, metric),
      rank: null as number | null,
      mine: !!myId && result.athleteId === myId,
      detail: detailLine(result),
    };
  });

  const lowerIsBetter = metricMeta(metric).lowerIsBetter;
  if (kind === "ranked") {
    scored.sort((a, b) => {
      if (a.value == null && b.value == null) return a.result.athleteName.localeCompare(b.result.athleteName);
      if (a.value == null) return 1;
      if (b.value == null) return -1;
      return lowerIsBetter ? a.value - b.value : b.value - a.value;
    });
    let n = 0;
    for (const row of scored) if (row.value != null) row.rank = ++n;
  } else {
    scored.sort((a, b) => a.result.athleteName.localeCompare(b.result.athleteName));
  }

  const values = scored.map((r) => r.value).filter((v): v is number => v != null);
  const average = mean(values);

  return {
    rows: scored,
    logged: results.length,
    average,
    averageDisplay: metricDisplay(average, metric),
    avgMetres: mean(
      results.map((r) => r.metres).filter((v): v is number => v != null && v > 0),
    ),
    avgMinutes: mean(
      results.map((r) => r.minutes).filter((v): v is number => v != null && v > 0),
    ),
  };
}
