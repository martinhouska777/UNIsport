/*
  THE SQUAD'S TRAINING OVER A WINDOW — the team's version of the athlete's
  statistics (lib/varsity/athleteStats.ts), for the coach.
  ---------------------------------------------------------------------------
  An athlete's statistics are their own logs added up over a window, read day
  by day for a short window and week by week for a long one, with a column
  you can tap to have that day read out. A squad's are the BOATS added up
  (lib/varsity/boatMileage.ts) the same way, and then read PER PERSON: the
  coach's question is not "how far did fifty people row" but "what did one
  rower's week look like, and how does it compare with the weeks before"
  (owner, 2026-09-21: "just copy what we have in the statistics for the
  person… but customize it for the team statistics, the average").

  So every measure here is an average over the people who were in a boat in
  that bucket — the same arithmetic the card on top of the Team tab uses for
  this week (averageMetres / averageMinutes), so the card and the full screen
  can never disagree about a week.

  THE WINDOWS are the owner's three: a week (day by day), a month (week by
  week) and the semester — three months (week by week). Both lists below are
  DATA (rule 7): a new measure or a new window is a new entry, not new code.
*/
import {
  averageMetres,
  averageMinutes,
  mileageFrom,
  weekRangeLabel,
  weekStart,
  type Mileage,
} from "./boatMileage";
import type { Boat } from "./coachLineup";
import { sessionKey, type Period } from "./coachPlan";
import { fetchLineupsFor } from "./lineupStore";
import { formatDistance, formatDuration, type Units } from "./units";

const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ── The window ─────────────────────────────────────────────────────────── */

export type TeamRange = {
  key: string;
  label: string;
  /** How far back it reaches, today included. */
  days: number;
  bucket: "day" | "week";
};

export const teamRanges: TeamRange[] = [
  { key: "week", label: "Week", days: 7, bucket: "day" },
  { key: "month", label: "Month", days: 28, bucket: "week" },
  { key: "semester", label: "Semester", days: 91, bucket: "week" },
];
export const defaultTeamRange = teamRanges[1].key;
export const teamRangeByKey = (key: string): TeamRange =>
  teamRanges.find((r) => r.key === key) ?? teamRanges[1];

/* ── A bucket of the graph ──────────────────────────────────────────────── */

export type TeamBucket = {
  /** First day of the bucket (the day itself, or the Monday). */
  start: Date;
  /** Last day, inclusive. */
  end: Date;
  /** What is read out when the column is tapped: "Tue 15 Sep" or "15–21 Sep". */
  label: string;
  /** What stands under the column: "15" for a day, "9/15" for a week. */
  short: string;
  /** Every practice key inside — the boats are found by these. */
  dayKeys: string[];
  mileage: Mileage;
  /** The bucket that holds today. */
  latest: boolean;
  /** The boats themselves, so a tapped day can list its crews. */
  boats: Boat[];
};

const day0 = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const shift = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function keysBetween(start: Date, end: Date): string[] {
  const out: string[] = [];
  for (let d = new Date(start); d <= end; d = shift(d, 1)) {
    for (const p of ["AM", "PM"] as Period[]) out.push(sessionKey(d, p));
  }
  return out;
}

type BareBucket = Omit<TeamBucket, "mileage" | "boats">;

/** The empty buckets of a window, oldest first, ending with today's. */
export function teamBuckets(range: TeamRange, now: Date): BareBucket[] {
  const today = day0(now);
  const out: BareBucket[] = [];
  if (range.bucket === "day") {
    for (let i = range.days - 1; i >= 0; i--) {
      const d = shift(today, -i);
      out.push({
        start: d,
        end: d,
        label: `${DOW[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`,
        short: `${d.getDate()}`,
        dayKeys: keysBetween(d, d),
        latest: i === 0,
      });
    }
  } else {
    const lastMonday = weekStart(today);
    const weeks = Math.ceil(range.days / 7);
    for (let i = weeks - 1; i >= 0; i--) {
      const start = shift(lastMonday, -7 * i);
      const end = shift(start, 6);
      out.push({
        start,
        end,
        label: weekRangeLabel(start),
        short: `${start.getMonth() + 1}/${start.getDate()}`,
        dayKeys: keysBetween(start, end),
        latest: i === 0,
      });
    }
  }
  return out;
}

/** Every practice key the LONGEST window can need, so one read serves them all. */
export function allKeys(now: Date): string[] {
  const most = Math.max(...teamRanges.map((r) => r.days));
  const today = day0(now);
  // A week-bucketed window starts on the Monday of its first week, which can
  // lie before "days back" — reach back to that Monday. And THIS week runs to
  // its Sunday: the card on the Team tab adds up the whole week, boats the
  // coach has already drawn up for Thursday included, and the screen must
  // say the same number the card does.
  const first = weekStart(shift(today, -(most - 1)));
  return keysBetween(first, shift(weekStart(today), 6));
}

/** The boats of the window, in one read: practice key → its boats. */
export async function fetchTeamLineups(now: Date): Promise<Record<string, Boat[]>> {
  return fetchLineupsFor(allKeys(now));
}

/** The window's buckets filled from the boats already read. */
export function fillBuckets(
  range: TeamRange,
  now: Date,
  lineups: Record<string, Boat[]>,
): TeamBucket[] {
  return teamBuckets(range, now).map((b) => {
    const mine: Record<string, Boat[]> = {};
    const boats: Boat[] = [];
    for (const k of b.dayKeys) {
      if (lineups[k]) {
        mine[k] = lineups[k];
        boats.push(...lineups[k]);
      }
    }
    return { ...b, mileage: mileageFrom(mine), boats };
  });
}

/* ── The measure ────────────────────────────────────────────────────────── */

export type TeamMetric = {
  key: string;
  /** The graph's title. */
  label: (units: Units) => string;
  /** One bucket's figure. */
  of: (m: Mileage) => number;
  format: (value: number, units: Units) => string;
  /** What is said when no bucket in the window has a boat with figures. */
  empty: string;
};

export const teamMetrics: TeamMetric[] = [
  {
    key: "distance",
    label: (u) => (u.distance === "mi" ? "Average miles rowed" : "Average km rowed"),
    of: averageMetres,
    format: (v, u) => formatDistance(v, u.distance),
    empty: "When a crew writes its distance on a boat, the squad's average will chart here.",
  },
  {
    key: "time",
    label: () => "Average hours trained",
    of: averageMinutes,
    format: (v) => formatDuration(Math.round(v)),
    empty: "When a crew writes how long it was out on a boat, the squad's hours will chart here.",
  },
  {
    key: "people",
    label: () => "People on the water",
    of: (m) => m.people.length,
    format: (v) => `${Math.round(v)}`,
    empty: "When a lineup is published with its figures, how many were out will chart here.",
  },
];
export const teamMetricByKey = (key: string): TeamMetric =>
  teamMetrics.find((m) => m.key === key) ?? teamMetrics[0];

/* ── Reading the window ─────────────────────────────────────────────────── */

/** "29 Jun – 27 Sep": the window's first day to its last. */
export function windowLabel(buckets: TeamBucket[]): string {
  if (!buckets.length) return "";
  const a = buckets[0].start;
  const z = buckets[buckets.length - 1].end;
  return `${a.getDate()} ${MO[a.getMonth()]} – ${z.getDate()} ${MO[z.getMonth()]}`;
}

/** Buckets that had at least one boat with figures on it. */
export const trainedBuckets = (buckets: TeamBucket[]) => buckets.filter((b) => b.mileage.boats > 0);

/** The measure's mean over the buckets that had training — the dashed line. */
export function windowAverage(buckets: TeamBucket[], metric: TeamMetric): number | null {
  const had = trainedBuckets(buckets);
  if (!had.length) return null;
  return had.reduce((a, b) => a + metric.of(b.mileage), 0) / had.length;
}

export type TeamCell = { key: string; label: string; value: string };
export type TeamGroup = { key: string; title: string; cells: TeamCell[] };

/*
  What the window came to, in the same order the athlete's own report reads:
  how far, how long, then who. Every figure names itself; no captions. "Per
  person per day/week" follows the window's own bucket.
*/
export function teamReport(buckets: TeamBucket[], range: TeamRange, units: Units): TeamGroup[] {
  const had = trainedBuckets(buckets);
  if (!had.length) return [];
  const n = had.length;
  const each = range.bucket === "day" ? "day" : "week";
  const per = (f: (m: Mileage) => number) => had.reduce((a, b) => a + f(b.mileage), 0) / n;

  const biggest = [...had].sort((a, b) => averageMetres(b.mileage) - averageMetres(a.mileage))[0];
  const people = new Set<string>();
  let boats = 0;
  let metres = 0; // person-metres: a boat's distance counted once per seat
  let minutes = 0;
  let seatOutings = 0; // one per person per boat they were in
  for (const b of had) {
    for (const p of b.mileage.people) {
      people.add(p.id);
      seatOutings += p.outings;
    }
    boats += b.mileage.boats;
    metres += b.mileage.metres;
    minutes += b.mileage.minutes;
  }

  /* "An outing" is what one person did when they went out — person-metres
     over person-outings, so an eight and a pair each count as one outing for
     each of the people in them. No squad total anywhere: a figure that grows
     with the size of the squad says nothing about the training (the owner
     cut the totals from the card on 2026-09-19). */
  const dist = (m: number) => formatDistance(m, units.distance);
  return [
    {
      key: "distance",
      title: "Distance",
      cells: [
        { key: "avg", label: `Per person per ${each}`, value: dist(per(averageMetres)) },
        { key: "best", label: `Biggest ${each} · ${biggest.label}`, value: dist(averageMetres(biggest.mileage)) },
        { key: "perOuting", label: "Average outing", value: dist(seatOutings ? metres / seatOutings : 0) },
        {
          key: "outings",
          label: `Outings per person per ${each}`,
          value: per((m) => (m.people.length ? m.people.reduce((a, p) => a + p.outings, 0) / m.people.length : 0)).toFixed(1),
        },
      ],
    },
    {
      key: "time",
      title: "Time",
      cells: [
        { key: "avg", label: `Per person per ${each}`, value: formatDuration(Math.round(per(averageMinutes))) },
        { key: "perOuting", label: "Average outing", value: formatDuration(seatOutings ? Math.round(minutes / seatOutings) : 0) },
      ],
    },
    {
      key: "who",
      title: "Who",
      cells: [
        { key: "people", label: "People who went out", value: `${people.size}` },
        { key: "perBucket", label: `Out per ${each}`, value: `${Math.round(per((m) => m.people.length))}` },
        { key: "boats", label: "Boats", value: `${boats}` },
        { key: "trained", label: `${each === "day" ? "Days" : "Weeks"} with training`, value: `${n} of ${buckets.length}` },
      ],
    },
  ];
}
