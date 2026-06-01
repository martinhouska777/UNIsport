/*
  COACH — LINEUP BUILDER DATA (source of truth for the boat lineup builder)
  ------------------------------------------------------------------
  Ported from the coach_lineup_builder_v2 mockup. The flow is: pick a practice
  (a day's AM or PM), then build one or more BOATS for it by filling seats from
  the ATHLETE POOL, and publish. Later this comes from the DB; for now it's mock.

  Rowing "side" (Port / Starboard / Both) is a per-athlete CONTENT property, so
  its colors live HERE as data and are applied via inline style — the same
  rule-1 exception the plan/profile screens use (port has no theme token).
*/

export type Side = "P" | "S" | "B"; // Port · Starboard · Both (bisweptual)

export const sideMeta: Record<Side, { label: string; color: string }> = {
  P: { label: "Port", color: "#3b82f6" },
  S: { label: "Starboard", color: "#ef4444" },
  B: { label: "Both", color: "#d4a843" },
};

/* ── The practice picker (entry screen) ── */
export type PracticeStatus = "draft" | "published" | "none" | "rest";

export const practiceStatusMeta: Record<PracticeStatus, { label: string; dot: string }> = {
  // dot color → theme token class
  draft: { label: "Draft", dot: "bg-warn" },
  published: { label: "Published", dot: "bg-success" },
  none: { label: "Not started", dot: "bg-muted/50" },
  rest: { label: "Rest day", dot: "bg-muted/50" },
};

export type Practice = { period: "AM" | "PM"; status: PracticeStatus };
export type PracticeDay = {
  id: string;
  num: number;
  weekday: string;
  month: string;
  today?: boolean;
  note?: string;
  am: Practice;
  pm: Practice;
};

export const practiceDays: PracticeDay[] = [
  {
    id: "thu-9",
    num: 9,
    weekday: "Thursday",
    month: "January",
    today: true,
    am: { period: "AM", status: "draft" },
    pm: { period: "PM", status: "none" },
  },
  {
    id: "fri-10",
    num: 10,
    weekday: "Friday",
    month: "January",
    note: "Captain's practice",
    am: { period: "AM", status: "none" },
    pm: { period: "PM", status: "none" },
  },
  {
    id: "sat-11",
    num: 11,
    weekday: "Saturday",
    month: "January",
    note: "3×11' race prep",
    am: { period: "AM", status: "published" },
    pm: { period: "PM", status: "rest" },
  },
];

/* ── Boat rigging types ── */
export type BoatType = "8+" | "4+" | "4-" | "2-";
export const boatTypes: { type: BoatType; symbol: string; name: string; desc: string }[] = [
  { type: "8+", symbol: "8+", name: "Eight", desc: "8 rowers + cox" },
  { type: "4+", symbol: "4+", name: "Coxed Four", desc: "4 rowers + cox" },
  { type: "4-", symbol: "4−", name: "Straight Four", desc: "4 rowers, no cox" },
  { type: "2-", symbol: "2−", name: "Pair", desc: "2 rowers, no cox" },
];

// How many rowing seats + whether there's a cox, per rigging.
export const boatShape: Record<BoatType, { rowers: number; cox: boolean }> = {
  "8+": { rowers: 8, cox: true },
  "4+": { rowers: 4, cox: true },
  "4-": { rowers: 4, cox: false },
  "2-": { rowers: 2, cox: false },
};

export type Athlete = { initials: string; name: string; side: Side };
export type Seat = { label: string; athlete?: Athlete }; // label = "1"…"S" (stroke)

export type Boat = {
  id: string;
  badge: BoatType;
  name: string;
  dock: string;
  seats: Seat[];
  cox?: Athlete;
  note?: string;
};

// The session this practice prescribes (pulled from the training plan).
export const sessionContext = {
  title: "RP3 · 3×5' (1:50 at 72, 2k+2)",
  sub: "7:00am dock · Newell",
};

// One worked-up boat (the 1V eight, 6/8 filled) to show the builder in use.
export const initialBoats: Boat[] = [
  {
    id: "1v",
    badge: "8+",
    name: "1V Eight",
    dock: "7:00am",
    note: "Drive sequence — slow the slide on the recovery.",
    cox: { initials: "SL", name: "S. Liu", side: "B" },
    seats: [
      { label: "1", athlete: { initials: "MK", name: "M. Klein", side: "S" } },
      { label: "2", athlete: { initials: "JR", name: "J. Reyes", side: "P" } },
      { label: "3", athlete: { initials: "TW", name: "T. Walsh", side: "S" } },
      { label: "4" },
      { label: "5", athlete: { initials: "NC", name: "N. Chen", side: "P" } },
      { label: "6", athlete: { initials: "DH", name: "D. Hunt", side: "S" } },
      { label: "7" },
      { label: "S", athlete: { initials: "LB", name: "L. Berg", side: "P" } },
    ],
  },
];

/* ── The athlete pool, grouped by their last lineup ── */
export type PoolAthlete = Athlete & { out?: "INJ" | "SICK" };
export type PoolGroup = { label: string; danger?: boolean; athletes: PoolAthlete[] };

export const pool: PoolGroup[] = [
  {
    label: "2V — Last lineup",
    athletes: [
      { initials: "OM", name: "O. Mahon", side: "P" },
      { initials: "PS", name: "P. Singh", side: "S" },
      { initials: "BF", name: "B. Foster", side: "S" },
      { initials: "RN", name: "R. Nash", side: "P" },
      { initials: "KT", name: "K. Tan", side: "B" },
    ],
  },
  {
    label: "3V — Last lineup",
    athletes: [
      { initials: "CV", name: "C. Vo", side: "S" },
      { initials: "FM", name: "F. Moss", side: "P" },
      { initials: "ML", name: "M. Lowe", side: "S" },
      { initials: "JG", name: "J. Goss", side: "P" },
    ],
  },
  {
    label: "4V — Last lineup",
    athletes: [
      { initials: "HE", name: "H. Espo", side: "S" },
      { initials: "DM", name: "D. Marsh", side: "P" },
    ],
  },
  {
    label: "Unavailable today",
    danger: true,
    athletes: [
      { initials: "BW", name: "B. Walsh", side: "S", out: "INJ" },
      { initials: "AV", name: "A. Vicino", side: "P", out: "SICK" },
    ],
  },
];

export const poolCount = { available: 14, out: 2 };
