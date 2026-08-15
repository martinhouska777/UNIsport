/*
  WHICH NUMBERS SIT ON THE VARSITY PROFILE.
  ---------------------------------------------------------------------------
  Three tiles, and every tile can be swapped with the arrows on it. A sculler
  chasing metres, a lightweight watching the hours, and someone rebuilding a
  habit all want a different top line — and none of them should have to go into
  Settings to say so. The choice is stored on the athlete's own record, so it
  survives and follows the account.

  The list below is DATA (rule 7): adding an entry here adds it to the arrows,
  with no change to the screen. Distances honour the athlete's km/mi setting,
  because the numbers are all stored metric and only formatted on the way out.
*/
import type { LogEntry } from "@/lib/varsity/logStore";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import { rowingCategories } from "@/lib/varsity/athleteProfile";

// Everything a stat is allowed to look at. The screen already holds eight weeks
// of logs for the graph, so no metric needs its own trip to the database.
export type StatInput = {
  logs: LogEntry[]; // the last 8 weeks, oldest → newest
  weekStartIso: string; // Monday of the current week
  fourWeeksAgoIso: string; // 27 days before today (a 28-day window incl. today)
  units: Units;
};

export type StatMetric = {
  key: string;
  label: string;
  sub: string; // the period, spelled out under the label
  value: (i: StatInput) => string;
};

const thisWeek = (i: StatInput) => i.logs.filter((l) => l.logDate >= i.weekStartIso);
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

export const statMetrics: StatMetric[] = [
  {
    key: "sessions",
    label: "Sessions",
    sub: "this week",
    value: (i) => String(thisWeek(i).length),
  },
  {
    key: "distance",
    label: "Distance",
    sub: "this week",
    // Only what was actually rowed — a lift or a run isn't metres on the water.
    value: (i) =>
      formatDistance(
        sum(
          thisWeek(i).map((l) =>
            rowingCategories.has(l.category ?? "") ? l.metres ?? 0 : 0,
          ),
        ),
        i.units.distance,
      ),
  },
  {
    key: "time",
    label: "Time",
    sub: "this week",
    value: (i) => formatDuration(sum(thisWeek(i).map((l) => l.minutes ?? 0))),
  },
  {
    key: "days",
    label: "Days",
    sub: "this week",
    value: (i) => String(new Set(thisWeek(i).map((l) => l.logDate)).size),
  },
  {
    key: "consistency",
    label: "Consistency",
    sub: "last 4 weeks",
    // Days you did SOMETHING, out of the last 28. Counting days rather than
    // sessions means a double day doesn't flatter the number.
    value: (i) => {
      const days = new Set(
        i.logs.filter((l) => l.logDate >= i.fourWeeksAgoIso).map((l) => l.logDate),
      ).size;
      return `${Math.round((days / 28) * 100)}%`;
    },
  },
];

export const metricByKey = (key: string): StatMetric =>
  statMetrics.find((m) => m.key === key) ?? statMetrics[0];

/*
  Make a saved choice safe to render: three tiles, all real metrics, none of them
  repeated (a duplicate would leave one metric unreachable by the arrows).
*/
export function sanitizeStatTiles(saved: string[] | undefined, fallback: string[]): string[] {
  const out: string[] = [];
  for (const key of saved ?? []) {
    if (statMetrics.some((m) => m.key === key) && !out.includes(key)) out.push(key);
  }
  for (const key of [...fallback, ...statMetrics.map((m) => m.key)]) {
    if (out.length >= 3) break;
    if (!out.includes(key)) out.push(key);
  }
  return out.slice(0, 3);
}

/*
  One press of an arrow: the next metric that isn't already on another tile, so
  the three tiles never show the same number twice.
*/
export function cycleStat(current: string[], slot: number, dir: 1 | -1): string[] {
  const taken = new Set(current.filter((_, i) => i !== slot));
  const n = statMetrics.length;
  const from = Math.max(0, statMetrics.findIndex((m) => m.key === current[slot]));
  for (let step = 1; step <= n; step++) {
    const candidate = statMetrics[(((from + dir * step) % n) + n) % n];
    if (!taken.has(candidate.key)) {
      const next = [...current];
      next[slot] = candidate.key;
      return next;
    }
  }
  return current;
}
