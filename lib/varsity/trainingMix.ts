/*
  WHAT THE TRAINING ACTUALLY WAS — the breakdown behind the Statistics block.
  ---------------------------------------------------------------------------
  The graph answers "how much". This answers "of what": how much of the range
  was UT2, how much UT1, how much weights.

  It reads each logged session through the COACH'S PLAN, exactly the way the
  calendar colours it (components/varsity/calendar → blockStyle), so a session
  is the same kind and the same colour wherever you meet it. A log carries the
  plan slot it came from (`dayKey`); when it has one, its intensity is the
  coach's. When it doesn't — a lift you added yourself, a run on a rest day —
  the category alone decides, and anything the category can't answer for lands
  in "Other" rather than being guessed into a colour it didn't earn.
*/
import type { LogEntry } from "@/lib/varsity/logStore";
import type { SessionMap } from "@/lib/varsity/coachPlan";
import { kindOf } from "@/lib/varsity/athleteHome";
import { kindColor, kindLegend, type SessionKind } from "@/lib/varsity/home";

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

const OTHER = { key: "other", label: "Other", color: "var(--muted)" };

/** Which kind a single logged session belongs to. */
function kindOfLog(l: LogEntry, plan: SessionMap): SessionKind | null {
  const planned = l.dayKey ? plan[l.dayKey] : undefined;
  if (planned) return kindOf(planned);
  switch (l.category) {
    case "weights":
      return "weights";
    case "flex":
      return "extra";
    case "off":
      return "off";
    default:
      // Rowed, but nobody said how hard — that is not a UT2.
      return null;
  }
}

/*
  Rest days are not training. An "off" log is a note that nothing happened, so
  counting it as a slice of the mix would make a light week look varied.
*/
const COUNTED = kindLegend.map((l) => l.kind);

export function trainingMix(logs: LogEntry[], plan: SessionMap): MixRow[] {
  const acc = new Map<string, { label: string; color: string; logs: LogEntry[] }>();

  for (const l of logs) {
    const kind = kindOfLog(l, plan);
    if (kind === "off") continue;
    const entry =
      kind && COUNTED.includes(kind)
        ? { key: kind, label: kindLegend.find((x) => x.kind === kind)!.label, color: kindColor[kind] }
        : OTHER;
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

  // Biggest first — the point of the screen is what you do most of. "Other" is
  // held at the bottom whatever its size; it is a leftover, not a kind.
  return rows.sort((a, b) => {
    if (a.key === OTHER.key) return 1;
    if (b.key === OTHER.key) return -1;
    return b.share - a.share || b.sessions - a.sessions;
  });
}

/** Whether the mix is worth opening at all. */
export const mixIsEmpty = (rows: MixRow[]) => rows.length === 0;
