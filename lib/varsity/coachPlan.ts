/*
  COACH — TRAINING PLAN MODEL (source of truth for the plan builder)
  ------------------------------------------------------------------
  The coach builds a PLAN as a series of BLOCKS (e.g. "Spring 2026", usually
  leading up to a race). A block is a date range; it breaks into weeks; each day
  has an AM and a PM slot; a slot can hold one SESSION.

  A session is a CATEGORY (Water / Erg / Weights / Off / Flex). Water and Erg
  sessions also carry an INTENSITY (UT2 / UT1 / Hard). The coach types a free
  description (or taps one of the 5 most-used suggestions to fill it) and can add
  a note. There is no duration and no location; the time is a preset per period.

  Only WATER sessions need a boat lineup — the Lineup Builder reads `isOnWater`.

  Workout colors are CONTENT colors (rule-1 exception): mapped to theme tokens
  where one exists (UT2→success, Hard→danger, Flex→muted), otherwise a hex value,
  always applied via inline style — never a hardcoded class.
*/

export type Period = "AM" | "PM";
export const periods: Period[] = ["AM", "PM"];

// Usual start time per period (no duration, no location — those are implied).
export const presetTime: Record<Period, string> = { AM: "7:00 AM", PM: "4:30 PM" };

/* ── Categories ── */
export type Category = "water" | "erg" | "weights" | "off" | "flex";
export const categories: Category[] = ["water", "erg", "weights", "off", "flex"];

export const categoryMeta: Record<
  Category,
  { label: string; color: string; hasIntensity: boolean }
> = {
  water: { label: "Water", color: "#4a90a4", hasIntensity: true },
  erg: { label: "Erg", color: "var(--muted)", hasIntensity: true },
  weights: { label: "Weights", color: "#c084fc", hasIntensity: false },
  off: { label: "Off", color: "#166534", hasIntensity: false },
  flex: { label: "Flex", color: "var(--muted)", hasIntensity: false },
};

/* ── Intensities (Water + Erg only) ── */
export type Intensity = "UT2" | "UT1" | "hard";
export const intensities: Intensity[] = ["UT2", "UT1", "hard"];
export const intensityMeta: Record<Intensity, { label: string; color: string }> = {
  UT2: { label: "UT2", color: "var(--success)" },
  UT1: { label: "UT1", color: "#eab308" },
  hard: { label: "Hard", color: "var(--danger)" },
};

/* ── The 5 most-used workouts to suggest (tap to fill the description) ── */
const intensitySuggestions: Record<Intensity, string[]> = {
  UT2: ["3×25' UT2", "70' steady state", "4×20' UT2", "2×30' UT2", "90' UT2 row"],
  UT1: ["3×15' UT1, RP3s", "4×12' UT1", "2×20' UT1", "3×17' UT1", "6×8' UT1"],
  hard: [
    "3×5' (1:50 at 72, 2k+2)",
    "8×500m, 1:30 rest",
    "2k test",
    "4×5' rate ladder",
    "6×750m race pace",
  ],
};
// Flex is just a length choice; weights & off have no quick options.
const flexLengths = ["50 mins", "60 mins", "75 mins"];

export function suggestionsFor(category: Category, intensity?: Intensity): string[] {
  if (category === "water" || category === "erg") return intensity ? intensitySuggestions[intensity] : [];
  if (category === "flex") return flexLengths;
  return []; // weights + off → none
}
// Header shown above the quick options (different wording for flex's lengths).
export const optionsLabel = (category: Category) =>
  category === "flex" ? "Length" : "Most used · tap to fill";

/* ── A session and how sessions are stored ── */
export type Session = {
  category: Category;
  intensity?: Intensity;
  description: string;
  time: string; // preset per period, but editable
  note?: string;
};

// Sessions live in one map keyed by day+period, so the whole plan is one object.
export type SessionMap = Record<string, Session>;
export function sessionKey(date: Date, period: Period): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${period}`;
}

export const isOnWater = (s: Session | undefined) => s?.category === "water";

// The color + label to show for a session (intensity wins for water/erg).
export function sessionColor(s: Session): string {
  return s.intensity ? intensityMeta[s.intensity].color : categoryMeta[s.category].color;
}
export function sessionLabel(s: Session): string {
  const cat = categoryMeta[s.category].label;
  return s.intensity ? `${cat} · ${intensityMeta[s.intensity].label}` : cat;
}

/* ── Blocks + week math ── */
export type BlockStatus = "draft" | "published";
export type Block = {
  id: string;
  name: string;
  start: string; // ISO yyyy-mm-dd
  end: string;
  status: BlockStatus; // new blocks start as a draft
  raceName?: string;
  raceDate?: string; // ISO
};

const WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
export function toISO(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}
export function addDays(iso: string, days: number): string {
  const d = parseDate(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}
function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export type DayCell = { date: Date; weekday: string; dayNum: number; month: string; today: boolean };
export type WeekRow = { index: number; rangeLabel: string; days: DayCell[] };

// The Monday on or before a date (rowing weeks run Mon–Sun).
function mondayOnOrBefore(d: Date): Date {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // getDay(): Sun=0 → Monday=offset 0
  return x;
}

// Break a block into whole Monday–Sunday weeks covering its range.
export function buildWeeks(block: Block, today = new Date()): WeekRow[] {
  const end = parseDate(block.end);
  const cursor = mondayOnOrBefore(parseDate(block.start));
  const weeks: WeekRow[] = [];
  let idx = 1;
  while (cursor <= end) {
    const days: DayCell[] = [];
    const wkStart = new Date(cursor);
    for (let i = 0; i < 7; i++) {
      days.push({
        date: new Date(cursor),
        weekday: WD[cursor.getDay()],
        dayNum: cursor.getDate(),
        month: MO[cursor.getMonth()],
        today: sameDay(cursor, today),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    const wkEnd = days[days.length - 1].date;
    weeks.push({
      index: idx++,
      rangeLabel: `${MO[wkStart.getMonth()]} ${wkStart.getDate()} – ${MO[wkEnd.getMonth()]} ${wkEnd.getDate()}`,
      days,
    });
  }
  return weeks;
}

export function blockRangeLabel(block: Block): string {
  const s = parseDate(block.start);
  const e = parseDate(block.end);
  const weeks = Math.ceil((e.getTime() - s.getTime()) / (7 * 864e5)) || 1;
  return `${MO[s.getMonth()]} ${s.getDate()} – ${MO[e.getMonth()]} ${e.getDate()}, ${e.getFullYear()} · ${weeks} weeks`;
}

// Days until the race (or null) — for the block's countdown.
export function daysToRace(block: Block, today = new Date()): number | null {
  if (!block.raceDate) return null;
  const ms = parseDate(block.raceDate).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.max(0, Math.round(ms / 864e5));
}
