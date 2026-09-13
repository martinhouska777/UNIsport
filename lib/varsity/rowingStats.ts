/*
  THE FULL READING OF A TRAINING WINDOW — everything the big statistics screen
  puts under the graph.
  ---------------------------------------------------------------------------
  The graph answers ONE question at a time (metres, or hours, or consistency).
  This answers the rest of them, over the very same window, from the very same
  logs — so nothing on the screen can disagree with anything else on it.

  Three groups, IN THIS ORDER — how far, how long, and only then how steady:

    Distance    — the total, then the water and the erg it is made of, then
                  the average row
    Time        — how long you trained in total, in an average week, and per
                  day, then how long went on each thing: the water, the erg,
                  weights, a run, a bike
    Consistency — how steady, how many days, and, when a plan is up, what the
                  coach put up, what got done, what got missed and what was
                  done on top. It used to be called "Against the plan", which
                  made thirty sessions with two missed read like a charge sheet.
                  The days OUT (sick, injured, away) end this group: they are
                  the reason a thin window was thin, so they belong beside it.

  CUT as useless to a rower, and not to be brought back: the longest streak,
  the average split, the best split (statistics about how FAST, when the
  question is how much), the session COUNT and the average session ("it doesn't
  tell us anything much"), and the best week.

  Everything comes back as DATA (a title and rows of label/value/caption), so
  the screen renders whatever this file decides to say and adding a number here
  adds it to the screen (rule 7). Distances and times are formatted on the way
  out, honouring the athlete's km/mi setting.
*/
import type { LogEntry } from "@/lib/varsity/logStore";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import { parseSessionKey } from "@/lib/varsity/coachPlan";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import { rowingCategories, logCategoryColor, logCategoryLabel } from "@/lib/varsity/athleteProfile";
import { expectedDays, trainedDays, type Span } from "@/lib/varsity/athleteStats";
import { dayOutReasons, dayOutName, countDaysOut, type DaysOut } from "@/lib/varsity/daysOut";

/* A number on the screen. `tone` is the only styling this file decides, and it
   decides it as a word — the screen maps it to a theme token (rule 1). */
export type StatTone = "text" | "success" | "warn" | "muted";
export type StatCell = { key: string; label: string; value: string; tone?: StatTone };
export type StatGroup = { key: string; title: string; cells: StatCell[] };

const asDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const dash = "—";

/* A rest day is a note that nothing happened, so it is never a session. */
const isTraining = (l: LogEntry) => l.category !== "off";
const isRowed = (l: LogEntry) => rowingCategories.has(l.category ?? "");

/**
 * WHAT THE COACH PUT UP INSIDE THE WINDOW, and what became of it.
 *
 * A planned session is one slot on the coach's plan (day + AM/PM). It counts as
 * done when the athlete logged against that slot — which is exactly what the
 * calendar's tick means, so the two screens can never disagree. Rest slots are
 * not sessions and are left out of all four numbers.
 */
function planCounts(logs: LogEntry[], plan: SessionMap, span: Span) {
  const start = asDate(span.startIso);
  const end = asDate(span.endIso);

  const planned: string[] = [];
  for (const [key, session] of Object.entries(plan)) {
    if (session.category === "off") continue;
    const parsed = parseSessionKey(key);
    if (!parsed) continue;
    if (parsed.date < start || parsed.date > end) continue;
    planned.push(key);
  }

  const loggedKeys = new Set(logs.filter((l) => l.dayKey && isTraining(l)).map((l) => l.dayKey!));
  const done = planned.filter((k) => loggedKeys.has(k)).length;
  const extra = logs.filter((l) => isTraining(l) && !l.dayKey).length;

  return {
    planned: planned.length,
    done,
    missed: Math.max(0, planned.length - done),
    extra,
  };
}

/**
 * THE WINDOW CUT INTO WEEKS, from its first day, as minutes trained in each.
 *
 * Every built-in window is a whole number of weeks (7, 14, 28, 84 days), so
 * these are real weeks; only a hand-picked window can end on a short one.
 */
function weekMinutes(logs: LogEntry[], span: Span): number[] {
  const end = asDate(span.endIso);
  const totals: number[] = [];
  for (const d = asDate(span.startIso); d <= end; d.setDate(d.getDate() + 7)) {
    const from = toIso(d);
    const stop = new Date(d);
    stop.setDate(stop.getDate() + 6);
    const to = toIso(stop > end ? end : stop);
    totals.push(
      sum(logs.filter((l) => l.logDate >= from && l.logDate <= to).map((l) => l.minutes ?? 0)),
    );
  }
  return totals;
}

/* The kinds of training that get their own "time on" cell, boat first. */
const TIME_CATEGORIES = ["water", "erg", "weights", "run", "bike", "other"] as const;
const TIME_LABEL: Record<(typeof TIME_CATEGORIES)[number], string> = {
  water: "Time on water",
  erg: "Time on erg",
  weights: "Weights",
  run: "Run",
  bike: "Bike",
  other: "Other",
};

/**
 * Everything the big screen shows under the graph, for one window.
 * `plan` may be empty — a squad with no plan up simply loses that one group
 * rather than showing four zeroes and calling them missed sessions.
 */
export function rowingReport(
  logs: LogEntry[],
  plan: SessionMap,
  span: Span,
  units: Units,
  /** The days marked out, so a missed session can say why. */
  daysOut: DaysOut = {},
): StatGroup[] {
  const training = logs.filter(isTraining);
  const rowed = training.filter(isRowed);

  const metres = sum(rowed.map((l) => l.metres ?? 0));
  const water = sum(rowed.filter((l) => l.category === "water").map((l) => l.metres ?? 0));
  const erg = sum(rowed.filter((l) => l.category === "erg").map((l) => l.metres ?? 0));
  // The average row: over the rowing sessions that logged a distance.
  const measured = rowed.filter((l) => (l.metres ?? 0) > 0);

  const minutes = sum(training.map((l) => l.minutes ?? 0));

  const expected = expectedDays(span);
  const trained = trainedDays(training);
  const days = Math.min(trained, expected);
  const consistency = expected ? Math.min(100, Math.round((days / expected) * 100)) : 0;

  const counts = planCounts(logs, plan, span);
  const hasPlan = counts.planned > 0 || counts.extra > 0;

  /*
    HOW MUCH IN A WEEK. The total says how much the window held; this says what
    a week of it actually looks like. It starts at the first week with anything
    in it — the empty weeks before someone joined the squad would only halve a
    number they earned. A window that IS one week has nothing to average, so it
    doesn't say it.

    "Best week" was here too and was cut the same day: the biggest number you
    ever put up is a trophy, not a reading, and it doesn't change with the
    window you are looking at the way everything beside it does.
  */
  const spanDays =
    Math.round((asDate(span.endIso).getTime() - asDate(span.startIso).getTime()) / 86_400_000) + 1;
  const weeks = spanDays > 7 ? weekMinutes(training, span) : [];
  const firstWeek = weeks.findIndex((v) => v > 0);
  const countedWeeks = firstWeek < 0 ? [] : weeks.slice(firstWeek);
  const weekCells: StatCell[] = countedWeeks.length
    ? [
        {
          key: "avgWeek",
          label: "Avg week",
          value: formatDuration(Math.round(sum(countedWeeks) / countedWeeks.length)),
        },
      ]
    : [];

  /*
    THE DAYS THAT WEREN'T TRAINING AT ALL — sick, injured, away, or missed for
    a reason not given — sit with the consistency they explain (owner,
    2026-09-13), next to the missed and extra sessions, rather than at the
    bottom of the training mix. They are counted in DAYS, and say so, because
    everything else in that group is counted in sessions.
  */
  const outCounts = countDaysOut(daysOut, span.startIso, span.endIso);
  const outCells: StatCell[] = dayOutReasons
    .filter((r) => outCounts[r.key] > 0)
    .map((r) => ({
      key: `out-${r.key}`,
      label: dayOutName(r.key),
      value: `${outCounts[r.key]} day${outCounts[r.key] === 1 ? "" : "s"}`,
      tone: "muted" as StatTone,
    }));

  /*
    TIME ON EACH THING — one cell per kind of training that actually has time
    logged in the window, in a fixed order (the boat first), so a squad that
    never bikes never sees an empty "Bike" cell.
  */
  const timeOn = TIME_CATEGORIES.map((cat) => ({
    cat,
    minutes: sum(training.filter((l) => (l.category ?? "other") === cat).map((l) => l.minutes ?? 0)),
  })).filter((c) => c.minutes > 0);

  /*
    THE PLAN'S NUMBERS ONLY WHEN THERE IS A PLAN in this window. With none up,
    "0 planned · 0 missed" is not a fact about the athlete, and "missed" is far
    too heavy a word to print by accident.
  */
  const planCells: StatCell[] = hasPlan
    ? [
        { key: "planned", label: "Planned", value: `${counts.planned}` },
        {
          key: "done",
          label: "Done",
          value: `${counts.done}`,
          tone: counts.planned && counts.done === counts.planned ? "success" : "text",
        },
        { key: "missed", label: "Missed", value: `${counts.missed}`, tone: counts.missed ? "warn" : "muted" },
        { key: "extra", label: "Extra", value: `${counts.extra}`, tone: counts.extra ? "success" : "muted" },
      ]
    : [];

  /*
    DISTANCE FIRST, then TIME, then CONSISTENCY (owner, 2026-09-13). The big
    three tiles that used to sit above these are gone, so the first group is
    now the top of the screen's reading and it should be the one a rower looks
    for: how far. Consistency is the judgement, and a judgement goes last.

    The cells are ordered to be READ IN A TWO-WIDE GRID: distance is
    "total rowed | on the water" over "on the erg | avg row", so the two that
    add up to the total sit next to each other.
  */
  return [
    {
      key: "distance",
      title: "Distance",
      cells: [
        {
          key: "total",
          label: "Total rowed",
          value: metres ? formatDistance(metres, units.distance) : dash,
        },
        {
          key: "water",
          label: "On the water",
          value: water ? formatDistance(water, units.distance) : dash,
        },
        {
          key: "erg",
          label: "On the erg",
          value: erg ? formatDistance(erg, units.distance) : dash,
        },
        {
          key: "avg",
          label: "Avg row",
          value: measured.length ? formatDistance(metres / measured.length, units.distance) : dash,
        },
      ],
    },
    {
      key: "time",
      title: "Time",
      cells: [
        {
          key: "total",
          label: "Time trained",
          value: minutes ? formatDuration(Math.round(minutes)) : dash,
        },
        ...weekCells,
        {
          // Per day actually trained, so a sick week does not shrink it.
          key: "perDay",
          label: "Avg per day",
          value: minutes && trained ? formatDuration(Math.round(minutes / trained)) : dash,
        },
        ...timeOn.map((c) => ({
          key: `on-${c.cat}`,
          label: TIME_LABEL[c.cat],
          value: formatDuration(Math.round(c.minutes)),
        })),
      ],
    },
    {
      key: "consistency",
      title: "Consistency",
      cells: [
        {
          key: "consistency",
          label: "Consistency",
          value: `${consistency}%`,
          tone: consistency >= 80 ? "success" : consistency >= 50 ? "text" : "warn",
        },
        { key: "days", label: "Days trained", value: `${days}` },
        ...planCells,
        ...outCells,
      ],
    },
  ];
}

/** Whether a window has anything in it at all — the screen's empty state. */
export const reportIsEmpty = (logs: LogEntry[]) => logs.filter(isTraining).length === 0;

/* ── One bucket, read out loud ──────────────────────────────────────────────
   What the big screen prints under the graph when a column is tapped: what
   that day (or that week) actually was. */

export type BucketDetail = {
  sessions: number;
  metres: number;
  minutes: number;
  /** One line per logged session, in the order they were done. */
  rows: { key: string; title: string; sub: string }[];
  /*
    THE SAME SESSIONS ADDED UP BY WHAT THEY WERE — water, erg, weights, run…
    For a stretch longer than a day (a week column, a dragged selection) a list
    of every session is noise (owner, 2026-09-13: "it doesn't make sense to put
    all the sessions under it"); what you want is how much you rowed and how
    long you were in the gym. One line per category, biggest first.
  */
  byCategory: { key: string; label: string; color: string; sessions: number; metres: number; minutes: number }[];
};

export function bucketDetail(logs: LogEntry[], units: Units): BucketDetail {
  const training = logs.filter(isTraining);
  const rows = training.map((l) => {
    const bits: string[] = [];
    if (l.period) bits.push(l.period);
    if ((l.metres ?? 0) > 0) bits.push(formatDistance(l.metres!, units.distance));
    if ((l.minutes ?? 0) > 0) bits.push(formatDuration(Math.round(l.minutes!)));
    if (l.split) bits.push(`${l.split}/500`);
    if (!l.dayKey) bits.push("extra");
    return { key: l.id, title: l.title || (l.category ?? "Session"), sub: bits.join(" · ") };
  });
  const cats = new Map<string, LogEntry[]>();
  for (const l of training) {
    const key = l.category && logCategoryLabel[l.category] ? l.category : "other";
    cats.set(key, [...(cats.get(key) ?? []), l]);
  }
  const byCategory = [...cats.entries()]
    .map(([key, ls]) => ({
      key,
      label: logCategoryLabel[key],
      color: logCategoryColor[key],
      sessions: ls.length,
      metres: sum(ls.map((l) => l.metres ?? 0)),
      minutes: sum(ls.map((l) => l.minutes ?? 0)),
    }))
    // Most time first (count when nothing was timed); Other always last.
    .sort((a, b) =>
      a.key === "other" ? 1 : b.key === "other" ? -1 : b.minutes - a.minutes || b.sessions - a.sessions,
    );
  return {
    sessions: training.length,
    metres: sum(training.filter(isRowed).map((l) => l.metres ?? 0)),
    minutes: sum(training.map((l) => l.minutes ?? 0)),
    rows,
    byCategory,
  };
}
