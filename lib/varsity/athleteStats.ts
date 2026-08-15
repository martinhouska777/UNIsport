/*
  WHAT THE VARSITY PROFILE GRAPH IS SHOWING.
  ---------------------------------------------------------------------------
  One choice drives the whole Statistics block. The arrows sit on the graph, and
  the three numbers above it are that same measure read three ways: this week,
  the weekly average, and the best week in the window. Switch the graph to Time
  and all three become hours — nothing to set up in Settings, and no two numbers
  that disagree about what they're counting.

  The list below is DATA (rule 7): adding an entry here adds it to the arrows,
  with no change to the screen. Distances honour the athlete's km/mi setting,
  because everything is stored metric and only formatted on the way out.
*/
import type { LogEntry } from "@/lib/varsity/logStore";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import { rowingCategories } from "@/lib/varsity/athleteProfile";

export type StatMetric = {
  key: string;
  label: string; // the graph's title, e.g. "Metres rowed"
  empty: string; // what to say when there's nothing logged yet
  // One week's worth of logs → the number this metric plots.
  weekly: (logs: LogEntry[]) => number;
  format: (value: number, units: Units) => string;
};

// Counts read better without a trailing ".0", but an average of 4.5 sessions a
// week is worth seeing.
const count = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

export const statMetrics: StatMetric[] = [
  {
    key: "distance",
    label: "Metres rowed",
    empty: "Log some erg or water sessions and your weekly metres will chart here.",
    // Only what was actually rowed — a lift or a run isn't metres on the water.
    weekly: (logs) =>
      sum(logs.map((l) => (rowingCategories.has(l.category ?? "") ? l.metres ?? 0 : 0))),
    format: (v, units) => formatDistance(v, units.distance),
  },
  {
    key: "time",
    label: "Time trained",
    empty: "Log a session with its length and your weekly hours will chart here.",
    weekly: (logs) => sum(logs.map((l) => l.minutes ?? 0)),
    format: (v) => formatDuration(Math.round(v)),
  },
  {
    key: "sessions",
    label: "Sessions",
    empty: "Log a session and your weekly count will chart here.",
    weekly: (logs) => logs.length,
    format: count,
  },
  {
    key: "days",
    label: "Days trained",
    empty: "Log a session and the days you train will chart here.",
    // Days, not sessions, so a double day doesn't flatter the number.
    weekly: (logs) => new Set(logs.map((l) => l.logDate)).size,
    format: count,
  },
];

export const defaultStatMetric = statMetrics[0].key;

export const metricByKey = (key: string): StatMetric =>
  statMetrics.find((m) => m.key === key) ?? statMetrics[0];

// One press of an arrow, wrapping around at either end.
export function nextMetric(key: string, dir: 1 | -1): string {
  const n = statMetrics.length;
  const from = Math.max(0, statMetrics.findIndex((m) => m.key === key));
  return statMetrics[(((from + dir) % n) + n) % n].key;
}

/*
  The three numbers above the graph, all from the same weekly buckets the graph
  plots. The average deliberately starts at the first week with anything logged:
  padding it with the empty weeks before someone joined would just tell them
  they train half as much as they do.
*/
export function summarise(
  weekValues: number[],
  metric: StatMetric,
  units: Units,
): { label: string; sub: string; value: string }[] {
  const firstActive = weekValues.findIndex((v) => v > 0);
  const counted = firstActive < 0 ? [] : weekValues.slice(firstActive);
  const average = counted.length ? sum(counted) / counted.length : 0;
  return [
    {
      label: "This week",
      sub: "so far",
      value: metric.format(weekValues[weekValues.length - 1] ?? 0, units),
    },
    {
      label: "Weekly avg",
      sub: counted.length ? `over ${counted.length} wk` : "no data yet",
      value: metric.format(average, units),
    },
    {
      label: "Best week",
      sub: "last 8 wks",
      value: metric.format(Math.max(0, ...weekValues), units),
    },
  ];
}
