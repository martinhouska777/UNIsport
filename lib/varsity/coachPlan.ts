/*
  COACH — TRAINING PLAN DATA (source of truth for the coach plan builder)
  ------------------------------------------------------------------
  Ported from the coach training-plan mockup. A "block" (e.g. Spring 2026) is a
  date range broken into weeks; each day has an AM and PM slot; each slot has a
  workout type, description, time, etc. Built here from a default weekly pattern
  plus per-week overrides — the same model the real plan PDFs follow.

  Workout-type colors are CONTENT colors (rule-1 exception): ut2/hard/flex map
  to theme tokens; the rest keep their own hex and are applied via inline style.
*/

export type WorkoutType = "ut2" | "ut1" | "thresh" | "hard" | "weights" | "water" | "flex" | "off";

export const workoutMeta: Record<WorkoutType, { short: string; name: string; color: string }> = {
  ut2: { short: "UT2", name: "UT2", color: "var(--success)" },
  ut1: { short: "UT1", name: "UT1", color: "#eab308" },
  thresh: { short: "AT", name: "Threshold", color: "#f97316" },
  hard: { short: "HARD", name: "Hard", color: "var(--danger)" },
  weights: { short: "WTS", name: "Weights", color: "#c084fc" },
  water: { short: "H2O", name: "On-water", color: "#4a90a4" },
  flex: { short: "FLEX", name: "Flex", color: "var(--muted)" },
  off: { short: "OFF", name: "Off", color: "#166534" },
};

export const workoutLegend: WorkoutType[] = [
  "ut2", "ut1", "thresh", "hard", "weights", "water", "flex", "off",
];

export type Slot = {
  type: WorkoutType;
  desc?: string;
  time?: string;
  dur?: string;
  loc?: string;
} | null;

export type PlanDay = { name: string; num: number; am: Slot; pm: Slot; today?: boolean };
export type WeekChip = { type: WorkoutType; count: number };
export type PlanWeek = { index: number; range: string; chips: WeekChip[]; days: PlanDay[] };

export const blocks = [
  { id: "spring2026", name: "Spring 2026", dates: "Jan 26 — Mar 15 · 7 weeks", status: "Draft" as const, active: true },
  { id: "winter2025", name: "Winter 2025", dates: "Dec 1 — Jan 18 · 7 weeks", status: "Published" as const },
  { id: "fall2025", name: "Fall 2025 — Through HOCR", dates: "Sep 8 — Nov 30 · 12 weeks", status: "Published" as const },
];

export const planBlock = {
  name: "Spring 2026",
  range: "Jan 26 – Mar 15, 2026",
  meta: "7 weeks · 49 days",
  status: "Draft" as const,
};

// ── Build the calendar from a default pattern + per-week overrides ──
const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const blockStart = new Date(2026, 0, 26); // Jan 26 2026
const mockToday = new Date(2026, 1, 4); // Feb 4 2026

const seed: Record<string, { am: Slot; pm: Slot }> = {
  Mon: {
    am: { type: "flex", desc: "Captain's practice", time: "9:15 AM", dur: "90m" },
    pm: { type: "weights", desc: "Lift @ Palmer Dixon OR Flex training", time: "4:30 PM", dur: "1h 30m", loc: "Palmer Dixon" },
  },
  Tue: {
    am: { type: "flex", desc: "Captain's practice", time: "9:15 AM", dur: "90m" },
    pm: { type: "hard", desc: "3×5' (1:30 at 32, 2k+2; 3:30 at 26, 5k pace)", time: "4:30 PM", dur: "1h 45m", loc: "Newell" },
  },
  Wed: {
    am: null,
    pm: { type: "weights", desc: "Lift @ Palmer Dixon OR Flex training", time: "4:30 PM", dur: "1h 30m", loc: "Palmer Dixon" },
  },
  Thu: {
    am: { type: "flex", desc: "Captain's practice", time: "9:15 AM", dur: "90m" },
    pm: { type: "thresh", desc: "3×15' UT1, RP3s", time: "4:30 PM", dur: "1h 45m", loc: "Newell" },
  },
  Fri: {
    am: { type: "flex", desc: "Captain's practice", time: "9:15 AM", dur: "90m" },
    pm: { type: "weights", desc: "Lift @ Palmer Dixon OR Flex training", time: "4:30 PM", dur: "1h 30m", loc: "Palmer Dixon" },
  },
  Sat: {
    am: { type: "hard", desc: "3×11' (3/1/3/1/3; 3' at 24, 5k+8; 1' at 2k pace)", time: "7:00 AM", dur: "2h", loc: "Newell" },
    pm: { type: "flex", desc: "Recovery / 45' volume OR roll out + core", time: "2:00 PM", dur: "1h" },
  },
  Sun: { am: { type: "off" }, pm: { type: "off" } },
};

// key = `${day}-${am|pm}`; value undefined → use seed, null → empty
const overrides: Record<string, Slot | undefined>[] = [
  {}, // Week 1
  {
    "Wed-am": { type: "ut2", desc: "3×25' UT2 erg", time: "7:00 AM", dur: "2h", loc: "Newell" },
    "Sat-am": { type: "ut2", desc: "3×25' UT2 erg", time: "7:00 AM", dur: "2h", loc: "Newell" },
    "Tue-pm": { type: "hard", desc: "4×5' (1:30 at 32, 2k+2; 3:30 at 26, 5k pace)", time: "4:30 PM", dur: "1h 45m", loc: "Newell" },
    "Sat-pm": { type: "hard", desc: "20' UT2 + 9×1' on/off + 20' UT2", time: "2:00 PM", dur: "1h 30m" },
  },
  {
    "Wed-am": { type: "ut2", desc: "3×27' UT2 erg", time: "7:00 AM", dur: "2h 15m" },
    "Sat-am": { type: "ut2", desc: "3×27' UT2 erg", time: "7:00 AM", dur: "2h 15m" },
    "Tue-pm": { type: "hard", desc: "4 or 5×5' (1:30 at 32, 2k+2; 3:30 at 26)", time: "4:30 PM", dur: "1h 45m" },
    "Thu-pm": { type: "thresh", desc: "3×17' UT1, RP3s", time: "4:30 PM", dur: "1h 45m" },
  },
  {
    "Wed-am": { type: "ut2", desc: "3×30' UT2 erg", time: "7:00 AM", dur: "2h 30m" },
    "Sat-am": { type: "ut2", desc: "3×20' UT2 erg", time: "7:00 AM", dur: "1h 30m" },
    "Sat-pm": { type: "hard", desc: "8×500m, 1:30 rest. 2k pace first 4.", time: "2:00 PM", dur: "1h 30m" },
  },
  {
    "Wed-am": { type: "ut2", desc: "3×30' UT2 erg", time: "7:00 AM", dur: "2h 30m" },
    "Sat-am": { type: "hard", desc: "8×500m, 1:30 rest. 2k pace first 4.", time: "7:00 AM", dur: "1h 30m" },
    "Tue-pm": { type: "water", desc: "C2 — 3×1k on 9' centers, 2k profile", time: "4:30 PM", dur: "2h", loc: "CRI" },
    "Sat-pm": { type: "water", desc: "C2 — 3×15' UT1", time: "2:00 PM", dur: "2h", loc: "CRI" },
  },
  {
    "Wed-am": { type: "ut2", desc: "3×30' UT2 erg", time: "7:00 AM", dur: "2h 30m" },
    "Sat-am": { type: "ut2", desc: "2×25' UT2 erg", time: "7:00 AM", dur: "1h 45m" },
    "Tue-pm": { type: "water", desc: "C2 — 2×1250 on 10' centers", time: "4:30 PM", dur: "2h", loc: "CRI" },
    "Sat-pm": { type: "hard", desc: "6×500m, 1:30 rest. 2k profile", time: "2:00 PM", dur: "1h 30m" },
  },
  {
    "Mon-am": { type: "ut2", desc: "2×20' UT2", time: "7:00 AM", dur: "1h" },
    "Tue-pm": { type: "hard", desc: "2k TEST", time: "4:30 PM", dur: "1h 30m", loc: "Newell" },
    "Wed-pm": null,
    "Thu-am": { type: "water", desc: "FL2 training", time: "TBD", loc: "Florida" },
    "Thu-pm": { type: "water", desc: "FL2 training", time: "TBD", loc: "Florida" },
    "Fri-am": { type: "water", desc: "FL2 training", time: "TBD", loc: "Florida" },
    "Sat-am": { type: "water", desc: "FL2 training", time: "TBD", loc: "Florida" },
    "Sun-am": { type: "water", desc: "FL2 training", time: "TBD", loc: "Florida" },
  },
];

function pick(over: Record<string, Slot | undefined>, key: string, fallback: Slot): Slot {
  return key in over ? (over[key] ?? null) : fallback;
}

export const weeks: PlanWeek[] = Array.from({ length: 7 }, (_, w) => {
  const first = new Date(blockStart);
  first.setDate(blockStart.getDate() + w * 7);
  const last = new Date(first);
  last.setDate(first.getDate() + 6);

  const over = overrides[w] ?? {};
  const counts: Partial<Record<WorkoutType, number>> = {};

  const days: PlanDay[] = dayNames.map((name, d) => {
    const date = new Date(first);
    date.setDate(first.getDate() + d);
    const am = pick(over, `${name}-am`, seed[name].am);
    const pm = pick(over, `${name}-pm`, seed[name].pm);
    for (const s of [am, pm]) {
      if (s && s.type !== "off") counts[s.type] = (counts[s.type] ?? 0) + 1;
    }
    return {
      name,
      num: date.getDate(),
      am,
      pm,
      today: date.toDateString() === mockToday.toDateString(),
    };
  });

  const chips: WeekChip[] = (Object.keys(counts) as WorkoutType[]).map((type) => ({
    type,
    count: counts[type]!,
  }));

  return {
    index: w + 1,
    range: `${months[first.getMonth()]} ${first.getDate()} – ${months[last.getMonth()]} ${last.getDate()}`,
    chips,
    days,
  };
});
