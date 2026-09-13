/*
  DAYS OUT — the days an athlete didn't train, and why.
  ---------------------------------------------------------------------------
  Being sick, injured or away used to leave no trace: the profile had a status
  with no dates, so a week in bed looked, on the calendar and in the numbers,
  exactly like a week of not bothering. Now a day can carry a reason.

  ONE RECORD, THREE WAYS IN (owner, 2026-09-13):
    • the STATUS on the Varsity profile — switch to Sick, and when you switch
      back the app offers to log the days since into the calendar (only the
      days with no training on them);
    • MISSED, in the CALENDAR — a past day with nothing logged gets a Missed
      button that asks why (Sick, Injured, Away, Other) with a short note. A
      day with training gets no button: it wasn't a day out.
  (The calendar's one-tap Sick / Away buttons were cut the same evening.)
  All three write the same map (saved through saveDaysOut in
  lib/varsity/athleteProfile.ts), so the calendar's dot, the statistics and the
  status can never disagree.

  Stored on the athlete's own varsity record (profiles.data.varsity.daysOut,
  keyed by ISO date) — no new table. The coach doesn't see it yet; that is an
  open question for the owner and the coaches.

  Reasons are DATA below: the label and a COLOUR. The colours are per-entity
  content colours living in a data file — rule 1's documented exception, the
  same one the session kinds use (lib/varsity/home.ts kindColor) — and they are
  picked to be none of the training colours (owner, 2026-09-13: a sick day
  should be its own colour, painting the whole day in the calendar):
    Sick    pink    — no session kind is pink
    Injured orange  — warmer than UT1's yellow, lighter than Hard's red
    Away    cyan    — cooler and brighter than the water's teal
    Missed  slate   — a day that simply didn't happen, not a grey rest day
  Adding a reason is an entry here, not a component change.
*/
export type DayOutReason = "sick" | "injured" | "away" | "other";
export type DayOut = { reason: DayOutReason; note?: string };
/** ISO date (yyyy-mm-dd) → why that day was out. */
export type DaysOut = Record<string, DayOut>;

export const dayOutReasons: { key: DayOutReason; label: string; color: string }[] = [
  { key: "sick", label: "Sick", color: "#f472b6" },
  { key: "injured", label: "Injured", color: "#fb923c" },
  { key: "away", label: "Away", color: "#22d3ee" },
  { key: "other", label: "Other", color: "#94a3b8" },
];

export const reasonMeta = (r: DayOutReason) =>
  dayOutReasons.find((x) => x.key === r) ?? dayOutReasons[dayOutReasons.length - 1];

/** What a marked day is CALLED on screen: "other" reads as "Missed". */
export const dayOutName = (r: DayOutReason) => (r === "other" ? "Missed" : reasonMeta(r).label);

/** The whole-day fill in the calendar — the same 28% tint a session block uses. */
export const dayOutFill = (r: DayOutReason) =>
  `color-mix(in oklab, ${reasonMeta(r).color} 28%, transparent)`;

/** The profile status that means "out", as a reason. Active (or anything else) is null. */
export function statusReason(status: string): DayOutReason | null {
  switch (status) {
    case "Sick":
      return "sick";
    case "Injured":
      return "injured";
    case "Away":
      return "away";
    default:
      return null;
  }
}

const asDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Every ISO date from `from` to `to`, both included. */
export function isoDays(from: string, to: string): string[] {
  const out: string[] = [];
  const end = asDate(to);
  for (const d = asDate(from); d <= end; d.setDate(d.getDate() + 1)) out.push(toIso(d));
  return out;
}

/** "10–14 Sep" / "28 Aug – 3 Sep" / "12 Sep". */
const MONTH3 = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function spanLabel(from: string, to: string): string {
  const a = asDate(from);
  const b = asDate(to);
  if (from === to) return `${a.getDate()} ${MONTH3[a.getMonth()]}`;
  if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
    return `${a.getDate()}–${b.getDate()} ${MONTH3[b.getMonth()]}`;
  return `${a.getDate()} ${MONTH3[a.getMonth()]} – ${b.getDate()} ${MONTH3[b.getMonth()]}`;
}

/**
 * WHAT A STATUS SPELL COVERS when you switch back. From the day you switched
 * to Sick up to YESTERDAY — switching back to Active today means you are back
 * today — except a spell that started today, which is just today.
 */
export function spellDays(since: string, today: string): { from: string; to: string } {
  if (since >= today) return { from: today, to: today };
  const y = asDate(today);
  y.setDate(y.getDate() - 1);
  return { from: since, to: toIso(y) };
}

/** Days out inside a window, counted by reason. */
export function countDaysOut(
  daysOut: DaysOut,
  startIso: string,
  endIso: string,
): Record<DayOutReason, number> {
  const counts: Record<DayOutReason, number> = { sick: 0, injured: 0, away: 0, other: 0 };
  for (const [iso, d] of Object.entries(daysOut)) {
    if (iso >= startIso && iso <= endIso && counts[d.reason] !== undefined) counts[d.reason]++;
  }
  return counts;
}

/** A saved value from an older build or hand-edited JSON, made safe. */
export function cleanDaysOut(raw: unknown): DaysOut {
  if (!raw || typeof raw !== "object") return {};
  const out: DaysOut = {};
  for (const [iso, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || !v || typeof v !== "object") continue;
    const reason = (v as { reason?: unknown }).reason;
    if (!dayOutReasons.some((r) => r.key === reason)) continue;
    const note = (v as { note?: unknown }).note;
    out[iso] = { reason: reason as DayOutReason, ...(typeof note === "string" && note.trim() ? { note: note.trim() } : {}) };
  }
  return out;
}
