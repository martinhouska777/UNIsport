/*
  WHAT THE VARSITY PROFILE'S STATISTICS BLOCK IS SHOWING.
  ---------------------------------------------------------------------------
  TWO choices drive the whole block, and everything in it follows both:

    the MEASURE — metres, hours, or consistency (the graph's own title)
    the RANGE   — a week, two weeks, a month, three months, or two dates the
                  athlete chose (the button on the graph's top right)

  There used to be THREE NUMBERS above the graph — the range's total, its
  average bucket and its best one — on the card and again on the full screen.
  Both were cut on 2026-09-13: the expand icon opens a full reading of the
  window (lib/varsity/rowingStats), and three tiles saying the graph's own
  measure a second time were in the way of getting there.

  Both lists below are DATA (rule 7): adding an entry adds it to the screen with
  no change to the screen's code. Distances honour the athlete's km/mi setting,
  because everything is stored metric and only formatted on the way out.

  A NOTE ON "A BUCKET". A short range is read day by day and a long one week by
  week — eight dots is a shape, sixty is a smear, and one is not a graph at all.
  Which one a range uses is part of the range's own data.
*/
import type { LogEntry } from "@/lib/varsity/logStore";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import { rowingCategories } from "@/lib/varsity/athleteProfile";

/* ── The window being looked at ─────────────────────────────────────────── */

/** An inclusive stretch of days, as ISO yyyy-mm-dd — a bucket, or the range. */
export type Span = { startIso: string; endIso: string };

export type StatRange = {
  key: string;
  label: string; // what the chip says
  days: number; // how far back it reaches, today included
  bucket: "day" | "week";
  /*
    A CUSTOM window says exactly where it starts and ends, because it need not
    end today — "how did March go" is a question about a stretch that finished.
    The four built-in windows leave these empty and are measured back from today
    the way they always were.
  */
  start?: string;
  end?: string;
};

export const statRanges: StatRange[] = [
  { key: "week", label: "Week", days: 7, bucket: "day" },
  { key: "2weeks", label: "2 weeks", days: 14, bucket: "day" },
  { key: "month", label: "Month", days: 28, bucket: "week" },
  { key: "3months", label: "3 months", days: 84, bucket: "week" },
];

export const defaultStatRange = statRanges[1].key;

export const rangeByKey = (key: string): StatRange =>
  statRanges.find((r) => r.key === key) ?? statRanges[1];

/* ── A window the athlete picked themselves ─────────────────────────────── */

/** The key the range dropdown uses for "a window I chose". */
export const CUSTOM_RANGE = "custom";

const MONTH3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 Sep" — short enough to put two of them on a button. */
export const shortDate = (iso: string) => {
  const d = asDate(iso);
  return `${d.getDate()} ${MONTH3[d.getMonth()]}`;
};

/**
 * Two dates the athlete chose, as a range the rest of the block can use exactly
 * like a built-in one. The bucket size is not a choice: past about a month,
 * columns per day stop being readable, so a long window is read week by week
 * like "3 months" already is.
 */
export function customRange(startIso: string, endIso: string): StatRange {
  const [a, b] = startIso <= endIso ? [startIso, endIso] : [endIso, startIso];
  const days = Math.round((asDate(b).getTime() - asDate(a).getTime()) / 86_400_000) + 1;
  // Two dates in one month say the month once — the button they sit on shares a
  // row with the measure's name, and "10 Aug – 30 Aug" crowds it out.
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  return {
    key: CUSTOM_RANGE,
    label: sameMonth ? `${asDate(a).getDate()}–${shortDate(b)}` : `${shortDate(a)} – ${shortDate(b)}`,
    days,
    bucket: days <= 31 ? "day" : "week",
    start: a,
    end: b,
  };
}

/*
  THE WINDOW STATISTICS OPENS ON, for the app-store photos (owner, 2026-09-16):
  Mon 7 – Sat 12 September 2026. TEMPORARY — set it back to null once the
  photos are shot, and the screen opens on `defaultStatRange` again.
*/
export const photoStatWindow: { start: string; end: string } | null = {
  start: "2026-09-07",
  end: "2026-09-12",
};

/** How a range names itself under a number. Dates keep their capitals. */
export const rangeCaption = (r: StatRange) => (r.start ? r.label : r.label.toLowerCase());

/* ── How the graph is drawn ─────────────────────────────────────────────── */

/*
  Columns or a line, and nothing else. A column is "how much did I do that day",
  which is the honest reading of a bucket; a line is the same numbers read as a
  trend, which is what people look for over three months. Anything fancier would
  be decoration.
*/
export type ChartType = "bars" | "line";
export const chartTypes: { key: ChartType; label: string }[] = [
  { key: "bars", label: "Columns" },
  { key: "line", label: "Line" },
];
export const defaultChartType: ChartType = "bars";
export const chartTypeOf = (key: string | undefined): ChartType =>
  key === "line" ? "line" : defaultChartType;

/* ── Day arithmetic on ISO strings ──────────────────────────────────────── */

const asDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Days in a span that a squad is expected to train — every day except Sunday,
 * the same rule the Team screen's consistency uses (lib/varsity/teamTraining).
 * Spans are already clamped to today, so an unfinished week is judged on the
 * days that have actually happened rather than the ones still to come.
 */
export function expectedDays(span: Span): number {
  let n = 0;
  const end = asDate(span.endIso);
  for (const d = asDate(span.startIso); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) n++;
  }
  return n;
}

/** Sunday doesn't count as a training day, so it can't count as one trained. */
export const trainedDays = (logs: LogEntry[]) =>
  new Set(logs.filter((l) => asDate(l.logDate).getDay() !== 0).map((l) => l.logDate)).size;

/* ── The measures ───────────────────────────────────────────────────────── */

export type StatMetric = {
  key: string;
  label: string; // the graph's title, e.g. "Metres rowed"
  empty: string; // what to say when there's nothing logged yet
  /*
    The measure over ONE span — used for a single bucket AND for the whole
    range. One function for both is what keeps the total honest: a percentage
    is recomputed over the range rather than summed, and a distance adds up the
    same way whichever window you ask about.
  */
  value: (logs: LogEntry[], span: Span) => number;
  format: (value: number, units: Units) => string;
  /*
    A fixed top for the graph's Y axis. Only a percentage has one: scaled to its
    own best bucket, a steady 40% week would fill the card and read like a good
    week. Everything else is scaled to what was actually done.
  */
  axisMax?: number;
};

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);

export const statMetrics: StatMetric[] = [
  {
    key: "distance",
    label: "Metres rowed",
    empty: "Log some erg or water sessions and your metres will chart here.",
    // Only what was actually rowed — a lift or a run isn't metres on the water.
    value: (logs) =>
      sum(logs.map((l) => (rowingCategories.has(l.category ?? "") ? (l.metres ?? 0) : 0))),
    format: (v, units) => formatDistance(v, units.distance),
  },
  {
    key: "time",
    label: "Time trained",
    empty: "Log a session with its length and your hours will chart here.",
    value: (logs) => sum(logs.map((l) => l.minutes ?? 0)),
    format: (v) => formatDuration(Math.round(v)),
  },
  {
    /*
      CONSISTENCY, not "days trained". The raw count of days rewards a long
      window and punishes a short one, so it could never be compared across the
      ranges above; a share of the days you were meant to train can. It is also
      the number the Team screen already grades a squad on, so an athlete reads
      the same word about themselves that their coach reads about everyone.
    */
    key: "consistency",
    label: "Consistency",
    empty: "Log a session and your consistency will chart here.",
    value: (logs, span) => {
      const expected = expectedDays(span);
      if (!expected) return 0;
      return Math.min(100, Math.round((trainedDays(logs) / expected) * 100));
    },
    format: (v) => `${Math.round(v)}%`,
    axisMax: 100,
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

/* ── A bucket of the graph ──────────────────────────────────────────────── */

export type Bucket = { label: string; span: Span; logs: LogEntry[]; latest: boolean };

