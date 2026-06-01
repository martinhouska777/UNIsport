/*
  COACH — LINEUP BUILDER DATA (source of truth for the boat lineup builder)
  ------------------------------------------------------------------
  Ported from the coach_lineup_builder_v2 mockup. The flow is: pick a practice
  (a day's AM or PM), then build one or more BOATS for it by filling seats from
  the ATHLETE POOL, and publish. Later this comes from the DB; for now it's mock.

  There is ONE roster keyed by id. Boats reference athletes by id and the pool
  shows whoever isn't currently seated — so a name can move between the pool and a
  seat (by typing or dragging) and only ever appear in one place.

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

/* ── The roster (every assignable athlete, keyed by id) ── */
export type Athlete = {
  id: string;
  initials: string;
  name: string;
  side: Side;
  out?: "INJ" | "SICK"; // unavailable today → shown dimmed, can't be seated
};

export const roster: Athlete[] = [
  // 1V — currently seated
  { id: "MK", initials: "MK", name: "M. Klein", side: "S" },
  { id: "JR", initials: "JR", name: "J. Reyes", side: "P" },
  { id: "TW", initials: "TW", name: "T. Walsh", side: "S" },
  { id: "NC", initials: "NC", name: "N. Chen", side: "P" },
  { id: "DH", initials: "DH", name: "D. Hunt", side: "S" },
  { id: "LB", initials: "LB", name: "L. Berg", side: "P" },
  { id: "SL", initials: "SL", name: "S. Liu", side: "B" },
  // 2V
  { id: "OM", initials: "OM", name: "O. Mahon", side: "P" },
  { id: "PS", initials: "PS", name: "P. Singh", side: "S" },
  { id: "BF", initials: "BF", name: "B. Foster", side: "S" },
  { id: "RN", initials: "RN", name: "R. Nash", side: "P" },
  { id: "KT", initials: "KT", name: "K. Tan", side: "B" },
  // 3V
  { id: "CV", initials: "CV", name: "C. Vo", side: "S" },
  { id: "FM", initials: "FM", name: "F. Moss", side: "P" },
  { id: "ML", initials: "ML", name: "M. Lowe", side: "S" },
  { id: "JG", initials: "JG", name: "J. Goss", side: "P" },
  // 4V
  { id: "HE", initials: "HE", name: "H. Espo", side: "S" },
  { id: "DM", initials: "DM", name: "D. Marsh", side: "P" },
  // out today
  { id: "BW", initials: "BW", name: "B. Walsh", side: "S", out: "INJ" },
  { id: "AV", initials: "AV", name: "A. Vicino", side: "P", out: "SICK" },
];

export const rosterById: Record<string, Athlete> = Object.fromEntries(
  roster.map((a) => [a.id, a]),
);

// How the pool is grouped (by each athlete's last lineup). Seated athletes drop
// out of their group automatically; removing one returns it here.
export const rosterGroups: { label: string; danger?: boolean; ids: string[] }[] = [
  { label: "1V — Current lineup", ids: ["MK", "JR", "TW", "NC", "DH", "LB"] },
  { label: "Coxswains", ids: ["SL"] },
  { label: "2V — Last lineup", ids: ["OM", "PS", "BF", "RN", "KT"] },
  { label: "3V — Last lineup", ids: ["CV", "FM", "ML", "JG"] },
  { label: "4V — Last lineup", ids: ["HE", "DM"] },
  { label: "Unavailable today", danger: true, ids: ["BW", "AV"] },
];

/* ── The practice picker (entry screen) ── */
export type PracticeStatus = "draft" | "published" | "none" | "rest";

export const practiceStatusMeta: Record<PracticeStatus, { label: string; dot: string }> = {
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

export type SeatSlot = { label: string; athleteId: string | null }; // label "1"…"S" (stroke)
export type Boat = {
  id: string;
  badge: BoatType;
  name: string;
  dock: string;
  note: string;
  seats: SeatSlot[];
  hasCox: boolean;
  coxId: string | null;
};

// Build the empty seat list for a rigging ("1".."7","S", last = stroke).
export function makeSeats(type: BoatType): SeatSlot[] {
  const { rowers } = boatShape[type];
  return Array.from({ length: rowers }, (_, i) => ({
    label: i === rowers - 1 ? "S" : String(i + 1),
    athleteId: null,
  }));
}

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
    hasCox: true,
    coxId: "SL",
    seats: [
      { label: "1", athleteId: "MK" },
      { label: "2", athleteId: "JR" },
      { label: "3", athleteId: "TW" },
      { label: "4", athleteId: null },
      { label: "5", athleteId: "NC" },
      { label: "6", athleteId: "DH" },
      { label: "7", athleteId: null },
      { label: "S", athleteId: "LB" },
    ],
  },
];
