/*
  WHAT THE VARSITY PROFILE'S STATISTICS BLOCK IS SHOWING.
  ---------------------------------------------------------------------------
  TWO choices drive the whole block, and everything in it follows both:

    the MEASURE — metres, hours, or consistency (the arrows on the graph)
    the RANGE   — a week, two weeks, a month, three months (the button on its
                  top right)

  The three numbers above the graph are that same measure read three ways over
  that same range: the whole range, the average bucket, and the best bucket. So
  no two numbers on the screen can disagree about what they are counting.

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

/** "day" / "week", for tile captions like "Best week". */
export const bucketWord = (r: StatRange) => (r.bucket === "day" ? "day" : "week");

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
function expectedDays(span: Span): number {
  let n = 0;
  const end = asDate(span.endIso);
  for (const d = asDate(span.startIso); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) n++;
  }
  return n;
}

/** Sunday doesn't count as a training day, so it can't count as one trained. */
const trainedDays = (logs: LogEntry[]) =>
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
  /** Caption on the first tile. "Total" doesn't fit a percentage. */
  totalLabel?: string;
  /*
    A fixed top for the graph's Y axis. Only a percentage has one: scaled to its
    own best bucket, a steady 40% week would fill the card and read like a good
    week. Everything else is scaled to what was actually done.
  */
  axisMax?: number;
  /*
    A measure that the default three numbers don't suit may write its own. Only
    consistency does: averaging it over daily buckets is nonsense, because a
    single day is either 0% or 100% and "best day: 100%" says nothing at all.
  */
  tiles?: (buckets: Bucket[], range: StatRange) => Tile[];
};

export type Tile = { label: string; sub: string; value: string };

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
    totalLabel: "Overall",
    axisMax: 100,
    /*
      The share, then the two counts it is made of — so the percentage always
      has its working shown, and a bad week reads as "3 missed" rather than an
      abstract 74%.
    */
    tiles: (buckets, range) => {
      const whole = wholeSpan(buckets);
      const all = buckets.flatMap((b) => b.logs);
      const expected = expectedDays(whole);
      const trained = Math.min(trainedDays(all), expected);
      const pct = expected ? Math.min(100, Math.round((trained / expected) * 100)) : 0;
      const sub = range.label.toLowerCase();
      return [
        { label: "Overall", sub, value: `${pct}%` },
        { label: "Trained", sub: expected ? `of ${expected} days` : "no days yet", value: `${trained}` },
        { label: "Missed", sub, value: `${Math.max(0, expected - trained)}` },
      ];
    },
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

/* ── The three numbers above the graph ──────────────────────────────────── */

export type Bucket = { label: string; span: Span; logs: LogEntry[]; latest: boolean };

/** The whole range as one span — first bucket's start to the last one's end. */
const wholeSpan = (buckets: Bucket[]): Span => ({
  startIso: buckets[0]?.span.startIso ?? "",
  endIso: buckets[buckets.length - 1]?.span.endIso ?? "",
});

/*
  All three come from the same buckets the graph plots, over the same range.

  The average deliberately starts at the first bucket with anything in it:
  padding it with the empty weeks before someone joined the squad would just
  tell them they train half as much as they do.
*/
export function summarise(
  buckets: Bucket[],
  metric: StatMetric,
  units: Units,
  range: StatRange,
): Tile[] {
  if (metric.tiles) return metric.tiles(buckets, range);

  const values = buckets.map((b) => metric.value(b.logs, b.span));
  const word = bucketWord(range);

  const firstActive = values.findIndex((v) => v > 0);
  const counted = firstActive < 0 ? [] : values.slice(firstActive);
  const average = counted.length ? sum(counted) / counted.length : 0;

  // The range read as ONE span, so a percentage is recomputed rather than
  // averaged and a distance is the honest total.
  const total = buckets.length
    ? metric.value(buckets.flatMap((b) => b.logs), wholeSpan(buckets))
    : 0;

  return [
    {
      label: metric.totalLabel ?? "Total",
      sub: range.label.toLowerCase(),
      value: metric.format(total, units),
    },
    {
      label: `Avg ${word}`,
      sub: counted.length ? `over ${counted.length} ${word === "day" ? "d" : "wk"}` : "no data yet",
      value: metric.format(average, units),
    },
    {
      label: `Best ${word}`,
      sub: range.label.toLowerCase(),
      value: metric.format(Math.max(0, ...values), units),
    },
  ];
}
