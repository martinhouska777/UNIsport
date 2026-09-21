/*
  THE SQUAD'S TRAINING, WEEK BY WEEK — the team's version of the athlete's
  statistics (lib/varsity/athleteStats.ts), for the coach.
  ---------------------------------------------------------------------------
  An athlete's statistics are their own logs added up over a window. A squad's
  are the BOATS added up (lib/varsity/boatMileage.ts), one week at a time, and
  then read PER PERSON: the coach's question is not "how far did fifty people
  row" but "what did one rower's week look like, and how does it compare with
  the weeks before" (owner, 2026-09-21: "it will show the team statistics,
  like the average team, how they are training, and you can compare it to
  previous weeks").

  So every measure here is an average over the people who were in a boat that
  week — the same arithmetic the card on top of the Team tab uses for THIS
  week (averageMetres / averageMinutes), so the card and the full screen can
  never disagree about a week.

  Both lists below are DATA (rule 7): a new measure or a new window is a new
  entry, not new screen code.
*/
import {
  averageMetres,
  averageMinutes,
  mileageFrom,
  weekDayKeys,
  weekRangeLabel,
  weekStart,
  type Mileage,
} from "./boatMileage";
import { fetchLineupsFor } from "./lineupStore";
import { formatDistance, formatDuration, type Units } from "./units";

/* ── One week of the squad ──────────────────────────────────────────────── */

export type TeamWeekStat = {
  /** The Monday. */
  start: Date;
  /** "15–21 Sep". */
  label: string;
  /** "9/15" — short enough for a column's foot. */
  short: string;
  mileage: Mileage;
  /** The week that is still going. */
  latest: boolean;
};

/** The Mondays of the last `weeks` weeks, oldest first, ending with this one. */
export function weekStarts(now: Date, weeks: number): Date[] {
  const thisMonday = weekStart(now);
  return Array.from({ length: weeks }, (_, i) => {
    const d = new Date(thisMonday);
    d.setDate(thisMonday.getDate() - (weeks - 1 - i) * 7);
    return d;
  });
}

/*
  Every boat in the window in ONE read, then dealt out to its week. A screen
  that fetched a week at a time would draw its columns one by one, and twelve
  reads for one graph is eleven too many.
*/
export async function fetchTeamWeeks(starts: Date[]): Promise<TeamWeekStat[]> {
  const keysByWeek = starts.map((s) => weekDayKeys(s));
  const lineups = await fetchLineupsFor(keysByWeek.flat());
  return starts.map((start, i) => {
    const mine: typeof lineups = {};
    for (const k of keysByWeek[i]) if (lineups[k]) mine[k] = lineups[k];
    return {
      start,
      label: weekRangeLabel(start),
      short: `${start.getMonth() + 1}/${start.getDate()}`,
      mileage: mileageFrom(mine),
      latest: i === starts.length - 1,
    };
  });
}

/* ── The window ─────────────────────────────────────────────────────────── */

export type TeamRange = { key: string; label: string; weeks: number };

export const teamRanges: TeamRange[] = [
  { key: "month", label: "Month", weeks: 4 },
  { key: "3months", label: "3 months", weeks: 13 },
  { key: "6months", label: "6 months", weeks: 26 },
];
export const defaultTeamRange = teamRanges[1].key;
export const teamRangeByKey = (key: string): TeamRange =>
  teamRanges.find((r) => r.key === key) ?? teamRanges[1];

/* ── The measure ────────────────────────────────────────────────────────── */

export type TeamMetric = {
  key: string;
  /** The graph's title. */
  label: (units: Units) => string;
  /** One week's figure. */
  of: (m: Mileage) => number;
  format: (value: number, units: Units) => string;
  /** What is said when no week in the window has a boat with figures. */
  empty: string;
};

export const teamMetrics: TeamMetric[] = [
  {
    key: "distance",
    label: (u) => (u.distance === "mi" ? "Average miles rowed" : "Average km rowed"),
    of: averageMetres,
    format: (v, u) => formatDistance(v, u.distance),
    empty: "When a crew writes its distance on a boat, the squad's average week will chart here.",
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

const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "29 Jun – 27 Sep": the first week's Monday to the last week's Sunday. */
export function windowLabel(weeks: TeamWeekStat[]): string {
  if (!weeks.length) return "";
  const a = weeks[0].start;
  const z = new Date(weeks[weeks.length - 1].start);
  z.setDate(z.getDate() + 6);
  return `${a.getDate()} ${MO[a.getMonth()]} – ${z.getDate()} ${MO[z.getMonth()]}`;
}

/** Weeks that had at least one boat with figures on it. */
export const trainedWeeks = (weeks: TeamWeekStat[]) => weeks.filter((w) => w.mileage.boats > 0);

/** The measure's mean over the weeks that had training — the dashed line. */
export function windowAverage(weeks: TeamWeekStat[], metric: TeamMetric): number | null {
  const had = trainedWeeks(weeks);
  if (!had.length) return null;
  return had.reduce((a, w) => a + metric.of(w.mileage), 0) / had.length;
}

export type TeamCell = { key: string; label: string; value: string };
export type TeamGroup = { key: string; title: string; cells: TeamCell[] };

/*
  What the window came to, in the same order the athlete's own report reads:
  how far, how long, then who. Every figure names itself; no captions.
*/
export function teamReport(weeks: TeamWeekStat[], units: Units): TeamGroup[] {
  const had = trainedWeeks(weeks);
  if (!had.length) return [];
  const n = had.length;
  const per = (f: (m: Mileage) => number) => had.reduce((a, w) => a + f(w.mileage), 0) / n;

  const biggest = [...had].sort((a, b) => averageMetres(b.mileage) - averageMetres(a.mileage))[0];
  const people = new Set<string>();
  let boats = 0;
  let metres = 0; // person-metres: a boat's distance counted once per seat
  let minutes = 0;
  let seatOutings = 0; // one per person per boat they were in
  for (const w of had) {
    for (const p of w.mileage.people) {
      people.add(p.id);
      seatOutings += p.outings;
    }
    boats += w.mileage.boats;
    metres += w.mileage.metres;
    minutes += w.mileage.minutes;
  }

  /* "An outing" is what one person did when they went out — person-metres
     over person-outings, so an eight and a pair each count as one outing for
     each of the people in them. Dividing by BOATS would say an outing was
     nine people's kilometres long. No squad total anywhere: a figure that
     grows with the size of the squad says nothing about the week (the owner
     cut the totals from the card on 2026-09-19). */
  const dist = (m: number) => formatDistance(m, units.distance);
  return [
    {
      key: "distance",
      title: "Distance",
      cells: [
        { key: "avg", label: "Per person per week", value: dist(per(averageMetres)) },
        { key: "best", label: `Biggest week · ${biggest.label}`, value: dist(averageMetres(biggest.mileage)) },
        { key: "perOuting", label: "Average outing", value: dist(seatOutings ? metres / seatOutings : 0) },
        { key: "outings", label: "Outings per week", value: (per((m) => m.people.length ? m.people.reduce((a, p) => a + p.outings, 0) / m.people.length : 0)).toFixed(1) },
      ],
    },
    {
      key: "time",
      title: "Time",
      cells: [
        { key: "avg", label: "Per person per week", value: formatDuration(Math.round(per(averageMinutes))) },
        { key: "perOuting", label: "Average outing", value: formatDuration(seatOutings ? Math.round(minutes / seatOutings) : 0) },
      ],
    },
    {
      key: "who",
      title: "Who",
      cells: [
        { key: "people", label: "People who went out", value: `${people.size}` },
        { key: "perWeek", label: "Average out per week", value: `${Math.round(per((m) => m.people.length))}` },
        { key: "boats", label: "Boats", value: `${boats}` },
        { key: "weeks", label: "Weeks with training", value: `${n} of ${weeks.length}` },
      ],
    },
  ];
}
