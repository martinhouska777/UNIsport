/*
  THE SQUAD'S TRAINING OVER A WINDOW — the team's version of the athlete's
  statistics (lib/varsity/athleteStats.ts), for the coach.
  ---------------------------------------------------------------------------
  An athlete's statistics are their own logs added up over a window, read day
  by day for a short window and week by week for a long one, with a column you
  can tap to have that day read out. A squad's are THE SAME LOGS, everybody's
  together, and then read PER PERSON: the coach's question is not "how far did
  fifty people row" but "what did one rower's week look like, and how does it
  compare with the weeks before".

  IT USED TO BE THE BOATS (owner, 2026-09-22). Every figure came out of the
  lineups the coach drew and the kilometres a crew wrote on them, which is why
  the screen could only ever say four things and all four said "outing" —
  boats know nothing about the erg, the weights, or whether anybody actually
  did what was prescribed. Now it is the athletes' own logs, so the squad's
  statistics are made of exactly what each rower sees about themselves
  (lib/varsity/squadStats.ts).

  Every measure is an average over THE PEOPLE WHO TRAINED in that bucket —
  never over the roster. Somebody who logged nothing is an unknown, not a zero.

  The BOATS are still read, and still what a tapped day lists: the crews that
  went out are a fact about the day, and no average replaces them.

  THE WINDOWS are the owner's three: a week (day by day), a month (week by
  week) and the semester — three months (week by week). Both lists below are
  DATA (rule 7): a new measure or a new window is a new entry, not new code.
*/
import {
  mileageFrom,
  weekRangeLabel,
  weekStart,
  type Mileage,
} from "./boatMileage";
import type { Boat } from "./coachLineup";
import { sessionKey, type SessionMap, type Period } from "./coachPlan";
import { fetchLineupsFor } from "./lineupStore";
import type { LogEntry } from "./logStore";
import { squadPeople, squadReport, type SquadPerson } from "./squadStats";
import { formatDistance, formatDuration, type Units } from "./units";
import type { StatGroup } from "./rowingStats";

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
  /** Everything anybody LOGGED inside it — what every figure is made of. */
  logs: LogEntry[];
  /** Who trained in it: the ids the averages are divided by. */
  trained: string[];
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

type BareBucket = Omit<TeamBucket, "mileage" | "boats" | "logs" | "trained">;

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

/**
 * The window's buckets filled from what has already been read: the boats for
 * the crews a tapped day lists, and the squad's logs for every figure on the
 * screen.
 */
export function fillBuckets(
  range: TeamRange,
  now: Date,
  lineups: Record<string, Boat[]>,
  logsByAthlete: Record<string, LogEntry[]> = {},
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
    const from = toIso(b.start);
    const to = toIso(b.end);
    const logs: LogEntry[] = [];
    const who = new Set<string>();
    for (const [id, all] of Object.entries(logsByAthlete)) {
      for (const l of all) {
        if (l.logDate < from || l.logDate > to) continue;
        logs.push(l);
        // A rest day is a note that nothing happened, so it never counts
        // somebody as having trained.
        if (l.category !== "off") who.add(id);
      }
    }
    return { ...b, mileage: mileageFrom(mine), boats, logs, trained: [...who] };
  });
}

/* ── One bucket, in numbers ──────────────────────────────────── */

const trainingIn = (b: TeamBucket) => b.logs.filter((l) => l.category !== "off");
const sumOf = (b: TeamBucket, of: (l: LogEntry) => number) =>
  trainingIn(b).reduce((a, l) => a + of(l), 0);

/** The squad's rowed metres in a bucket, divided by the people who trained. */
export const bucketMetres = (b: TeamBucket): number =>
  b.trained.length ? sumOf(b, (l) => l.metres ?? 0) / b.trained.length : 0;

/** The squad's minutes in a bucket, divided by the people who trained. */
export const bucketMinutes = (b: TeamBucket): number =>
  b.trained.length ? sumOf(b, (l) => l.minutes ?? 0) / b.trained.length : 0;

/* ── The measure ────────────────────────────────────────────────────────── */

export type TeamMetric = {
  key: string;
  /** The graph's title. */
  label: (units: Units) => string;
  /** One bucket's figure. */
  of: (b: TeamBucket) => number;
  format: (value: number, units: Units) => string;
  /** What is said when no bucket in the window has a boat with figures. */
  empty: string;
};

export const teamMetrics: TeamMetric[] = [
  {
    key: "distance",
    label: (u) => (u.distance === "mi" ? "Average miles rowed" : "Average km rowed"),
    of: bucketMetres,
    format: (v, u) => formatDistance(v, u.distance),
    empty: "When the squad logs its training, the average distance will chart here.",
  },
  {
    key: "time",
    label: () => "Average hours trained",
    of: bucketMinutes,
    format: (v) => formatDuration(Math.round(v)),
    empty: "When the squad logs its training, the average hours will chart here.",
  },
  {
    key: "people",
    label: () => "People training",
    of: (b) => b.trained.length,
    format: (v) => `${Math.round(v)}`,
    empty: "When the squad logs its training, how many trained will chart here.",
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

/** Buckets somebody trained in. An empty one is not a zero week, it is a gap. */
export const trainedBuckets = (buckets: TeamBucket[]) =>
  buckets.filter((b) => b.trained.length > 0);

/** The measure's mean over the buckets that had training — the dashed line. */
export function windowAverage(buckets: TeamBucket[], metric: TeamMetric): number | null {
  const had = trainedBuckets(buckets);
  if (!had.length) return null;
  return had.reduce((a, b) => a + metric.of(b), 0) / had.length;
}

/*
  THE PEOPLE OF THE WHOLE WINDOW, one entry each, computed once — the groups
  under the graph and the table of names at the foot are the same numbers read
  two ways, so they can never disagree.
*/
export function windowPeople(
  buckets: TeamBucket[],
  logsByAthlete: Record<string, LogEntry[]>,
  names: Record<string, string>,
  plan: SessionMap,
): SquadPerson[] {
  if (!buckets.length) return [];
  return squadPeople(logsByAthlete, names, plan, {
    startIso: toIso(buckets[0].start),
    endIso: toIso(buckets[buckets.length - 1].end),
  });
}

/*
  WHAT THE WINDOW COMES TO — handed straight to lib/varsity/squadStats, which
  is the athlete's own reading applied to everybody at once. This file's job is
  the window and the graph; what the numbers MEAN is one file, used here and by
  the table of names at the foot of the screen.

  The four "outing" cells that used to be the whole of it are gone (owner,
  2026-09-22): "I don't know why you're saying outing — I don't want that."
*/
export function teamReport(
  people: SquadPerson[],
  buckets: TeamBucket[],
  units: Units,
  squadSize: number,
): StatGroup[] {
  if (!buckets.length) return [];
  return squadReport(
    people,
    { startIso: toIso(buckets[0].start), endIso: toIso(buckets[buckets.length - 1].end) },
    units,
    squadSize,
  );
}
