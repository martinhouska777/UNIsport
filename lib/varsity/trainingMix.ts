/*
  WHAT THE TRAINING ACTUALLY WAS — the breakdown behind the Statistics block.
  ---------------------------------------------------------------------------
  The graph answers "how much". This answers "of what": how much of the window
  was UT2, how much UT1, how much weights.

  It reads each logged session through the COACH'S PLAN, exactly the way the
  calendar colours it (components/varsity/calendar → blockStyle), so a session
  is the same kind and the same colour wherever you meet it. A log carries the
  plan slot it came from (`dayKey`); when it has one, its intensity is the
  coach's — which is why a bike or a run done on a UT2 day counts as UT2. When
  it doesn't — a lift you added yourself, a run on a rest day, a bike on a flex
  day — what you logged decides (Run, Bike, Erg…).

  THERE IS NO "OTHER" ROW (owner, 2026-09-21: "I don't know what the other
  is"). A row nobody can name is not a reading. The only sessions that used to
  land in it were ones logged as "Other" or "Flex" with no plan slot to say
  what they were, and the calendar's own legend already leaves both out
  (lib/varsity/athleteProfile → legendCategories). They are left out of the
  shares as well, so the bars still add up to the whole.
*/
import type { LogEntry } from "@/lib/varsity/logStore";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import { logCategoryColor, logCategoryLabel } from "@/lib/varsity/athleteProfile";
import { kindOf } from "@/lib/varsity/athleteHome";
import { kindColor, kindLegend } from "@/lib/varsity/home";

/** A row of the breakdown: one kind of training, and what it added up to. */
export type MixRow = {
  key: string;
  label: string;
  color: string;
  sessions: number;
  days: number;
  minutes: number;
  metres: number;
  /** 0–100, by TIME where sessions are timed, else by count. See below. */
  share: number;
};

type Entry = { key: string; label: string; color: string };

/*
  WHICH ROW A SESSION BELONGS TO.

  A rowing slot on the plan (water / erg) is its INTENSITY — UT2, UT1, Hard —
  and a weights slot is Weights. Everything else is named by WHAT WAS LOGGED:
  a Run, a Bike, an Erg or Water row done on your own. There is no "Flex" row
  (owner, 2026-09-13): flex is the coach's permission to train how you like,
  not a kind of training, so a bike on a flex day is counted as Bike.

  null = not part of the mix at all: a rest day, and anything with no name.
*/
function entryOf(l: LogEntry, plan: SessionMap): Entry | null {
  if (l.category === "off") return null;
  const planned = l.dayKey ? plan[l.dayKey] : undefined;
  if (planned && planned.category !== "flex" && planned.category !== "off") {
    const kind = kindOf(planned);
    const legend = kindLegend.find((x) => x.kind === kind);
    if (legend) return { key: kind, label: legend.label, color: kindColor[kind] };
  }
  if (l.category === "weights") return { key: "weights", label: "Weights", color: kindColor.weights };
  // The calendar legend's own colours, so a run is the same colour in both.
  const cat = l.category ?? "other";
  if (logCategoryLabel[cat] && cat !== "flex" && cat !== "other") {
    return { key: `log-${cat}`, label: logCategoryLabel[cat], color: logCategoryColor[cat] };
  }
  return null;
}

/*
  Rest days are not training. An "off" log is a note that nothing happened, so
  counting it as a slice of the mix would make a light week look varied.
*/

export function trainingMix(logs: LogEntry[], plan: SessionMap): MixRow[] {
  const acc = new Map<string, { label: string; color: string; logs: LogEntry[] }>();

  for (const l of logs) {
    const entry = entryOf(l, plan);
    if (!entry) continue;
    const bucket = acc.get(entry.key) ?? { label: entry.label, color: entry.color, logs: [] };
    bucket.logs.push(l);
    acc.set(entry.key, bucket);
  }

  const rows: MixRow[] = [...acc.entries()].map(([key, b]) => ({
    key,
    label: b.label,
    color: b.color,
    sessions: b.logs.length,
    days: new Set(b.logs.map((l) => l.logDate)).size,
    minutes: b.logs.reduce((s, l) => s + (l.minutes ?? 0), 0),
    metres: b.logs.reduce((s, l) => s + (l.metres ?? 0), 0),
    share: 0,
  }));

  /*
    SHARE IS BY TIME when the sessions were timed, and by count when they were
    not. An hour of steady state and a twenty-minute lift are not the same slice
    of a week, so time is the truer answer — but half-filled logs would make
    every untimed session vanish from the mix entirely, which is worse than a
    rougher number.
  */
  const totalMinutes = rows.reduce((s, r) => s + r.minutes, 0);
  const totalSessions = rows.reduce((s, r) => s + r.sessions, 0);
  const denom = totalMinutes > 0 ? totalMinutes : totalSessions;
  for (const r of rows) {
    const mine = totalMinutes > 0 ? r.minutes : r.sessions;
    r.share = denom ? Math.round((mine / denom) * 100) : 0;
  }

  // Biggest first — the point of the screen is what you do most of.
  return rows.sort((a, b) => b.share - a.share || b.sessions - a.sessions);
}

/** Whether the mix is worth opening at all. */
export const mixIsEmpty = (rows: MixRow[]) => rows.length === 0;
