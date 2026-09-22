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
  /*
    A CUSTOM window says exactly where it starts and ends — two dates the
    coach picked, or a stretch dragged across the graph — and need not touch
    today. The three built-in windows leave these empty and are measured back
    from today.
  */
  start?: string; // ISO yyyy-mm-dd
  end?: string;
};

export const teamRanges: TeamRange[] = [
  { key: "week", label: "Week", days: 7, bucket: "day" },
  { key: "month", label: "Month", days: 28, bucket: "week" },
  { key: "semester", label: "Semester", days: 91, bucket: "week" },
];
export const defaultTeamRange = teamRanges[1].key;
export const teamRangeByKey = (key: string): TeamRange =>
  teamRanges.find((r) => r.key === key) ?? teamRanges[1];

/** The key the window dropdown uses for "dates I chose". */
export const TEAM_CUSTOM_RANGE = "custom";

export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/**
 * Two dates, as a window the rest of the screen uses like a built-in one —
 * the athlete's customRange, for the team. Past a month, columns per day stop
 * being readable, so a long stretch is read week by week.
 */
export function customTeamRange(startIso: string, endIso: string): TeamRange {
  const [a, b] = startIso <= endIso ? [startIso, endIso] : [endIso, startIso];
  const A = fromIso(a);
  const B = fromIso(b);
  const days = Math.round((B.getTime() - A.getTime()) / 86_400_000) + 1;
  const short = (d: Date) => `${d.getDate()} ${MO[d.getMonth()]}`;
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  return {
    key: TEAM_CUSTOM_RANGE,
    label: sameMonth ? `${A.getDate()}–${short(B)}` : `${short(A)} – ${short(B)}`,
    days,
    bucket: days <= 31 ? "day" : "week",
    start: a,
    end: b,
  };
}

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

/*
  The empty buckets of a window, oldest first. A built-in window ends with
  today's bucket; a custom one runs between its own two dates (a day in the
  future has no boats, so the end is capped at today). `latest` marks the
  bucket that holds today, wherever it falls.
*/
export function teamBuckets(range: TeamRange, now: Date): BareBucket[] {
  const today = day0(now);
  const out: BareBucket[] = [];
  const last = range.end ? new Date(Math.min(fromIso(range.end).getTime(), today.getTime())) : today;
  const first = range.start ? fromIso(range.start) : null;
  if (range.bucket === "day") {
    const from = first ?? shift(last, -(range.days - 1));
    for (let d = new Date(from); d <= last; d = shift(d, 1)) {
      out.push({
        start: d,
        end: d,
        label: `${DOW[d.getDay()]} ${d.getDate()} ${MO[d.getMonth()]}`,
        short: `${d.getDate()}`,
        dayKeys: keysBetween(d, d),
        latest: d.getTime() === today.getTime(),
      });
    }
  } else {
    const lastMonday = weekStart(last);
    const firstMonday = first ? weekStart(first) : shift(lastMonday, -(Math.ceil(range.days / 7) - 1) * 7);
    for (let start = new Date(firstMonday); start <= lastMonday; start = shift(start, 7)) {
      const end = shift(start, 6);
      out.push({
        start,
        end,
        label: weekRangeLabel(start),
        short: `${start.getMonth() + 1}/${start.getDate()}`,
        dayKeys: keysBetween(start, end),
        latest: start.getTime() === weekStart(today).getTime(),
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

/** One person's outings in a bucket, on average — how often the average person went out. */
export const outingsPerPerson = (m: Mileage): number =>
  m.people.length ? m.people.reduce((a, p) => a + p.outings, 0) / m.people.length : 0;

/*
  WHAT THE WINDOW COMES TO — the averages, and only the averages (owner,
  2026-09-21): what an outing was, how long it was, and how often the average
  person went out. "Per person per week" and "biggest week" are gone, and so
  is the whole "who" group — a coach reading their own squad knows how many
  people and boats it has, and the table under this is where a week is
  compared with another.

  "An outing" is what one person did when they went out — person-metres over
  person-outings, so an eight and a pair each count as one outing for each of
  the people in them.
*/
export function teamReport(buckets: TeamBucket[], range: TeamRange, units: Units): TeamGroup[] {
  const had = trainedBuckets(buckets);
  if (!had.length) return [];
  const each = range.bucket === "day" ? "day" : "week";
  const people = new Set<string>();
  let metres = 0;
  let minutes = 0;
  let seatOutings = 0;
  for (const b of had) {
    for (const p of b.mileage.people) {
      people.add(p.id);
      seatOutings += p.outings;
    }
    metres += b.mileage.metres;
    minutes += b.mileage.minutes;
  }
  const perBucket = had.reduce((a, b) => a + outingsPerPerson(b.mileage), 0) / had.length;

  return [
    {
      key: "averages",
      title: "Averages",
      cells: [
        { key: "outingKm", label: "Average outing", value: formatDistance(seatOutings ? metres / seatOutings : 0, units.distance) },
        { key: "outingTime", label: "Average outing time", value: formatDuration(seatOutings ? Math.round(minutes / seatOutings) : 0) },
        { key: "perPerson", label: `Outings per person per ${each}`, value: perBucket.toFixed(1) },
        { key: "perPersonWindow", label: "Outings per person, whole window", value: people.size ? (seatOutings / people.size).toFixed(1) : "0" },
      ],
    },
  ];
}
