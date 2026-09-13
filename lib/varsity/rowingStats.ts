/*
  THE FULL READING OF A TRAINING WINDOW — everything the big statistics screen
  puts under the graph.
  ---------------------------------------------------------------------------
  The graph answers ONE question at a time (metres, or hours, or consistency).
  This answers the rest of them, over the very same window, from the very same
  logs — so nothing on the screen can disagree with anything else on it.

  Three groups — what a rower asks of a stretch of training is "was I there,
  how far, how long" (owner, 2026-09-13):

    Consistency — how steady, how many days, and, when a plan is up, what the
                  coach put up, what got done, what got missed and what was
                  done on top. It used to be called "Against the plan", which
                  made thirty sessions with two missed read like a charge sheet.
    Distance    — the metres, on the water and on the erg, and the average row
    Time        — how long you trained, per day, per session, and how long went
                  on each thing: the water, the erg, weights, a run, a bike

  CUT the same day as useless to a rower: the longest streak, the average split
  and the best split. These are statistics about how MUCH was done, not how fast.

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
import { dayOutReasons, type DaysOut, type DayOutReason } from "@/lib/varsity/daysOut";

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
function planCounts(logs: LogEntry[], plan: SessionMap, span: Span, daysOut: DaysOut) {
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

  /* WHY THEY WERE MISSED — a missed slot on a day marked out (sick, injured,
     away, other) is counted under that reason; the rest have none given. */
  const missedWhy: Record<DayOutReason, number> = { sick: 0, injured: 0, away: 0, other: 0 };
  let missedNoReason = 0;
  for (const k of planned) {
    if (loggedKeys.has(k)) continue;
    const parsed = parseSessionKey(k);
    const out = parsed ? daysOut[toIso(parsed.date)] : undefined;
    if (out) missedWhy[out.reason]++;
    else missedNoReason++;
  }

  return {
    planned: planned.length,
    done,
    missed: Math.max(0, planned.length - done),
    extra,
    missedWhy,
    missedNoReason,
  };
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
  const timed = training.filter((l) => (l.minutes ?? 0) > 0);

  const expected = expectedDays(span);
  const trained = trainedDays(training);
  const days = Math.min(trained, expected);
  const consistency = expected ? Math.min(100, Math.round((days / expected) * 100)) : 0;

  const counts = planCounts(logs, plan, span, daysOut);
  const hasPlan = counts.planned > 0 || counts.extra > 0;

  /*
    TIME ON EACH THING — one cell per kind of training that actually has time
    logged in the window, in a fixed order (the boat first), so a squad that
    never bikes never sees an empty "Bike" cell.
  */
  const timeOn = TIME_CATEGORIES.map((cat) => ({
    cat,
    minutes: sum(training.filter((l) => (l.category ?? "other") === cat).map((l) => l.minutes ?? 0)),
  })).filter((c) => c.minutes > 0);

  /* MISSED, BY WHY — one cell per reason that actually happened, and "no
     reason" for the rest, only when at least one had a reason. */
  const missedWhy: StatCell[] =
    counts.missed > counts.missedNoReason
      ? [
          ...dayOutReasons
            .filter((r) => counts.missedWhy[r.key] > 0)
            .map((r) => ({
              key: `missed-${r.key}`,
              label: `Missed · ${r.label.toLowerCase()}`,
              value: `${counts.missedWhy[r.key]}`,
              tone: "muted" as StatTone,
            })),
          ...(counts.missedNoReason > 0
            ? [{ key: "missed-none", label: "Missed · no reason", value: `${counts.missedNoReason}`, tone: "muted" as StatTone }]
            : []),
        ]
      : [];

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
        ...missedWhy,
      ]
    : [];

  return [
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
      ],
    },
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
          key: "avg",
          label: "Avg row",
          value: measured.length ? formatDistance(metres / measured.length, units.distance) : dash,
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
        {
          // Per day actually trained, so a sick week does not shrink it.
          key: "perDay",
          label: "Avg per day",
          value: minutes && trained ? formatDuration(Math.round(minutes / trained)) : dash,
        },
        { key: "sessions", label: "Sessions", value: `${training.length}` },
        {
          key: "perSession",
          label: "Avg session",
          value: timed.length ? formatDuration(Math.round(minutes / timed.length)) : dash,
        },
        ...timeOn.map((c) => ({
          key: `on-${c.cat}`,
          label: TIME_LABEL[c.cat],
          value: formatDuration(Math.round(c.minutes)),
        })),
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
