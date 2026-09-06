/*
  THE FULL READING OF A TRAINING WINDOW — everything the big statistics screen
  puts under the graph.
  ---------------------------------------------------------------------------
  The graph answers ONE question at a time (metres, or hours, or consistency).
  This answers the rest of them, over the very same window, from the very same
  logs — so nothing on the screen can disagree with anything else on it.

  Four groups, because that is how a rower actually asks:

    Training        — how many sessions, how many days, how steady, how long a run
    Against the plan— what the coach put up, what got done, what got missed,
                      and what was done on top of it
    Distance        — the metres, split between the water and the erg
    Time & pace     — the hours, and the split those hours were rowed at

  Everything comes back as DATA (a title and rows of label/value/caption), so
  the screen renders whatever this file decides to say and adding a number here
  adds it to the screen (rule 7). Distances and times are formatted on the way
  out, honouring the athlete's km/mi setting.
*/
import type { LogEntry } from "@/lib/varsity/logStore";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import { parseSessionKey } from "@/lib/varsity/coachPlan";
import { formatDistance, formatDuration, type Units } from "@/lib/varsity/units";
import { rowingCategories } from "@/lib/varsity/athleteProfile";
import { expectedDays, trainedDays, type Span } from "@/lib/varsity/athleteStats";

/* A number on the screen. `tone` is the only styling this file decides, and it
   decides it as a word — the screen maps it to a theme token (rule 1). */
export type StatTone = "text" | "success" | "warn" | "muted";
export type StatCell = { key: string; label: string; value: string; sub?: string; tone?: StatTone };
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

/** "1:52" / "1:52.4" as seconds. Anything else is not a split. */
function splitSeconds(text: string | null): number | null {
  if (!text) return null;
  const m = /^(\d{1,2}):(\d{2}(?:\.\d+)?)$/.exec(text.trim());
  if (!m) return null;
  const s = Number(m[1]) * 60 + Number(m[2]);
  return s > 0 ? s : null;
}

/** Seconds back as "1:52" — how a rower says a split. */
function asSplit(seconds: number): string {
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/**
 * THE LONGEST RUN OF TRAINING DAYS in the window, and the one still going.
 * Sunday neither counts nor breaks it: the squad doesn't train on Sundays, so
 * a rest day the plan itself gave you should not end a streak.
 */
function streaks(logs: LogEntry[], span: Span): { longest: number; current: number } {
  const trained = new Set(logs.filter(isTraining).map((l) => l.logDate));
  let run = 0;
  let longest = 0;
  const end = asDate(span.endIso);
  for (const d = asDate(span.startIso); d <= end; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 0) continue; // Sunday: skipped, not counted, not broken
    run = trained.has(toIso(d)) ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  // `run` finished on the window's last day, so it IS the streak still going.
  return { longest, current: run };
}

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

  return { planned: planned.length, done, missed: Math.max(0, planned.length - done), extra };
}

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
): StatGroup[] {
  const training = logs.filter(isTraining);
  const rowed = training.filter(isRowed);

  const metres = sum(rowed.map((l) => l.metres ?? 0));
  const water = sum(rowed.filter((l) => l.category === "water").map((l) => l.metres ?? 0));
  const erg = sum(rowed.filter((l) => l.category === "erg").map((l) => l.metres ?? 0));
  const longest = Math.max(0, ...rowed.map((l) => l.metres ?? 0));
  const withMetres = rowed.filter((l) => (l.metres ?? 0) > 0);

  const minutes = sum(training.map((l) => l.minutes ?? 0));
  const timed = training.filter((l) => (l.minutes ?? 0) > 0);

  /*
    THE AVERAGE SPLIT is only honest over sessions that logged BOTH a time and
    a distance — an hour of weights in the numerator would make every rower on
    the squad look slow.
  */
  const paced = rowed.filter((l) => (l.metres ?? 0) > 0 && (l.minutes ?? 0) > 0);
  const pacedMetres = sum(paced.map((l) => l.metres ?? 0));
  const pacedSeconds = sum(paced.map((l) => (l.minutes ?? 0) * 60));
  const avgSplit = pacedMetres > 0 ? (pacedSeconds / pacedMetres) * 500 : null;

  const bestSplitSeconds = Math.min(
    Infinity,
    ...rowed.map((l) => splitSeconds(l.split) ?? Infinity),
  );
  const bestSplit = Number.isFinite(bestSplitSeconds) ? bestSplitSeconds : null;

  const expected = expectedDays(span);
  const days = Math.min(trainedDays(training), expected);
  const consistency = expected ? Math.min(100, Math.round((days / expected) * 100)) : 0;
  const { longest: longestStreak, current: currentStreak } = streaks(training, span);

  const counts = planCounts(logs, plan, span);

  const groups: StatGroup[] = [
    {
      key: "training",
      title: "Training",
      cells: [
        {
          key: "sessions",
          label: "Sessions",
          value: `${training.length}`,
          sub: training.length ? `${(training.length / Math.max(1, days)).toFixed(1)} a day` : "none yet",
        },
        {
          key: "days",
          label: "Days trained",
          value: `${days}`,
          sub: expected ? `of ${expected} days` : dash,
        },
        {
          key: "consistency",
          label: "Consistency",
          value: `${consistency}%`,
          sub: "days you turned up",
          tone: consistency >= 80 ? "success" : consistency >= 50 ? "text" : "warn",
        },
        {
          key: "streak",
          label: "Longest streak",
          value: longestStreak ? `${longestStreak} d` : dash,
          sub: currentStreak ? `${currentStreak} d running now` : "nothing running",
        },
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
          sub: `${withMetres.length} session${withMetres.length === 1 ? "" : "s"}`,
        },
        {
          key: "water",
          label: "On the water",
          value: water ? formatDistance(water, units.distance) : dash,
          sub: metres ? `${Math.round((water / metres) * 100)}% of it` : dash,
        },
        {
          key: "erg",
          label: "On the erg",
          value: erg ? formatDistance(erg, units.distance) : dash,
          sub: metres ? `${Math.round((erg / metres) * 100)}% of it` : dash,
        },
        {
          key: "avg",
          label: "Longest piece",
          value: longest ? formatDistance(longest, units.distance) : dash,
          sub: withMetres.length
            ? `avg ${formatDistance(metres / withMetres.length, units.distance)}`
            : dash,
        },
      ],
    },
    {
      key: "time",
      title: "Time & pace",
      cells: [
        {
          key: "total",
          label: "Time trained",
          value: minutes ? formatDuration(Math.round(minutes)) : dash,
          sub: days ? `${formatDuration(Math.round(minutes / days))} a day` : dash,
        },
        {
          key: "avg",
          label: "Avg session",
          value: timed.length ? formatDuration(Math.round(minutes / timed.length)) : dash,
          sub: timed.length ? `over ${timed.length} timed` : "nothing timed",
        },
        {
          key: "split",
          label: "Avg split",
          value: avgSplit ? `${asSplit(avgSplit)}` : dash,
          sub: avgSplit ? "per 500 m" : "needs time + metres",
        },
        {
          key: "best",
          label: "Best split",
          value: bestSplit ? `${asSplit(bestSplit)}` : dash,
          sub: bestSplit ? "per 500 m" : "none logged",
        },
      ],
    },
  ];

  /*
    THE PLAN GROUP ONLY APPEARS WHEN THERE IS A PLAN in this window. With none
    up, "0 planned · 0 missed" is not a fact about the athlete, and "missed"
    is far too heavy a word to print by accident.
  */
  if (counts.planned > 0 || counts.extra > 0) {
    groups.splice(1, 0, {
      key: "plan",
      title: "Against the plan",
      cells: [
        { key: "planned", label: "Planned", value: `${counts.planned}`, sub: "by your coach" },
        {
          key: "done",
          label: "Done",
          value: `${counts.done}`,
          sub: counts.planned
            ? `${Math.round((counts.done / counts.planned) * 100)}% of them`
            : dash,
          tone: counts.planned && counts.done === counts.planned ? "success" : "text",
        },
        {
          key: "missed",
          label: "Missed",
          value: `${counts.missed}`,
          sub: counts.missed ? "not logged" : "none missed",
          tone: counts.missed ? "warn" : "muted",
        },
        {
          key: "extra",
          label: "Extra",
          value: `${counts.extra}`,
          sub: counts.extra ? "on top of the plan" : "none added",
          tone: counts.extra ? "success" : "muted",
        },
      ],
    });
  }

  return groups;
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
  return {
    sessions: training.length,
    metres: sum(training.filter(isRowed).map((l) => l.metres ?? 0)),
    minutes: sum(training.map((l) => l.minutes ?? 0)),
    rows,
  };
}
