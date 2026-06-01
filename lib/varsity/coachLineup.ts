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

// Side colors mirror real oars: port = red, starboard = green; rows-both = blue.
// Coxes are separate (yellow) and never take a rowing side.
export const sideMeta: Record<Side, { label: string; color: string }> = {
  P: { label: "Port", color: "#ef4444" }, // red
  S: { label: "Starboard", color: "#22c55e" }, // green
  B: { label: "Both", color: "#3b82f6" }, // blue
};

export const COX_COLOR = "#eab308"; // yellow — cox identity

/* ── The roster (every assignable athlete, keyed by id) ── */
export type Athlete = {
  id: string;
  initials: string;
  name: string;
  side: Side;
  cox?: boolean; // a coxswain — can ONLY take the cox seat, never a rowing seat
  out?: "INJ" | "SICK"; // unavailable today → shown dimmed, can't be seated
};

// The real squad. The source list groups athletes by erg/fitness training group
// (Columns A–D, Bike, UT2, OYO, Rx), NOT by rowing side — so we don't yet know
// who rows port vs starboard. Everyone defaults to "B" (Both) until the coach
// sets a real bowside/strokeside split. Columns A + D are the coxswains.
export const roster: Athlete[] = [
  // ── Coxswains (Columns A + D) ──
  { id: "cate-frerichs", initials: "CF", name: "Cate Frerichs", side: "B", cox: true },
  { id: "micah-john", initials: "MJ", name: "Micah John", side: "B", cox: true },
  { id: "iris-hennin", initials: "IH", name: "Iris Hennin", side: "B", cox: true },
  { id: "nick-yoo", initials: "NY", name: "Nick Yoo", side: "B", cox: true },
  { id: "nat-toms", initials: "NT", name: "Nat Toms", side: "B", cox: true },
  { id: "abbi-park", initials: "AP", name: "Abbi Park", side: "B", cox: true },
  { id: "helena-inzerillo", initials: "HI", name: "Helena Inzerillo", side: "B", cox: true },

  // ── Group B ──
  { id: "asante-kiio", initials: "AK", name: "Asante Kiio", side: "B" },
  { id: "luca-vicino", initials: "LV", name: "Luca Vicino", side: "B" },
  { id: "marcus-chung", initials: "MC", name: "Marcus Chung", side: "B" },
  { id: "mason-cruz-abrams", initials: "MCr", name: "Mason Cruz-Abrams", side: "B" },
  { id: "jack-dorney", initials: "JD", name: "Jack Dorney", side: "B" },
  { id: "alexander-grundy", initials: "AG", name: "Alexander Grundy", side: "B" },
  { id: "george-farkas", initials: "GF", name: "George Farkas", side: "B" },
  { id: "sam-gallaudet", initials: "SG", name: "Sam Gallaudet", side: "B" },
  { id: "martin-houska", initials: "MH", name: "Martin Houska", side: "B" },
  { id: "marco-gandola", initials: "MG", name: "Marco Gandola", side: "B" },
  { id: "apostolos-lykomitros", initials: "AL", name: "Apostolos Lykomitros", side: "B" },
  { id: "tyler-horler", initials: "TH", name: "Tyler Horler", side: "B" },
  { id: "teddy-plimpton", initials: "TP", name: "Teddy Plimpton", side: "B" },
  { id: "sam-davidson", initials: "SD", name: "Sam Davidson", side: "B" },
  { id: "jordan-dykema", initials: "JDy", name: "Jordan Dykema", side: "B" },

  // ── Group C ──
  { id: "jack-hansen-knarhoi", initials: "JH", name: "Jack Hansen-Knarhoi", side: "B" },
  { id: "owen-finnerty", initials: "OF", name: "Owen Finnerty", side: "B" },
  { id: "marco-vicino", initials: "MV", name: "Marco Vicino", side: "B" },
  { id: "pierce-lapham", initials: "PL", name: "Pierce Lapham", side: "B" },
  { id: "julian-paul", initials: "JP", name: "Julian Paul", side: "B" },
  { id: "ben-scott", initials: "BS", name: "Ben Scott", side: "B" },
  { id: "sam-woodgate", initials: "SW", name: "Sam Woodgate", side: "B" },
  { id: "mike-thomas", initials: "MT", name: "Mike Thomas", side: "B" },
  { id: "joseph-baker", initials: "JB", name: "Joseph Baker", side: "B" },
  { id: "adam-cech", initials: "AC", name: "Adam Cech", side: "B" },
  { id: "alex-sanchez-fretz", initials: "AS", name: "Alex Sanchez Fretz", side: "B" },
  { id: "leo-bessler", initials: "LB", name: "Leo Bessler", side: "B" },
  { id: "joshua-brangan", initials: "JBr", name: "Joshua Brangan", side: "B" },
  { id: "bob-rawlinson", initials: "BR", name: "Bob Rawlinson", side: "B" },
  { id: "ben-schnalke", initials: "BSc", name: "Ben Schnalke", side: "B" },
  { id: "jack-sulger", initials: "JS", name: "Jack Sulger", side: "B" },
  { id: "elam-hughes", initials: "EH", name: "Elam Hughes", side: "B" },
  { id: "owen-marcovitz", initials: "OM", name: "Owen Marcovitz", side: "B" },

  // ── Bike ──
  { id: "will-fowler", initials: "WF", name: "Will Fowler", side: "B" },
  { id: "kevin-weldon", initials: "KW", name: "Kevin Weldon", side: "B" },

  // ── UT2 ──
  { id: "leyth-sousou", initials: "LS", name: "Leyth Sousou", side: "B" },

  // ── OYO ──
  { id: "cameron-beyki", initials: "CB", name: "Cameron Beyki", side: "B" },
  { id: "max-morehead", initials: "MM", name: "Max Morehead", side: "B" },

  // ── Rx ──
  { id: "george-burney", initials: "GB", name: "George Burney", side: "B" },
  { id: "alp-karadogan", initials: "AK2", name: "Alp Karadogan", side: "B" },
  { id: "kynan-tallec-botos", initials: "KT", name: "Kynan Tallec-Botos", side: "B" },
  { id: "ryan-cornelius", initials: "RC", name: "Ryan Cornelius", side: "B" },
  { id: "charles-richards", initials: "CR", name: "Charles Richards", side: "B" },
];

export const rosterById: Record<string, Athlete> = Object.fromEntries(
  roster.map((a) => [a.id, a]),
);

// How the pool is grouped (by each athlete's last lineup). Seated athletes drop
// out of their group automatically; removing one returns it here.
export const rosterGroups: { label: string; danger?: boolean; ids: string[] }[] = [
  { label: "Coxswains", ids: ["cate-frerichs", "micah-john", "iris-hennin", "nick-yoo", "nat-toms", "abbi-park", "helena-inzerillo"] },
  { label: "Group B", ids: ["asante-kiio", "luca-vicino", "marcus-chung", "mason-cruz-abrams", "jack-dorney", "alexander-grundy", "george-farkas", "sam-gallaudet", "martin-houska", "marco-gandola", "apostolos-lykomitros", "tyler-horler", "teddy-plimpton", "sam-davidson", "jordan-dykema"] },
  { label: "Group C", ids: ["jack-hansen-knarhoi", "owen-finnerty", "marco-vicino", "pierce-lapham", "julian-paul", "ben-scott", "sam-woodgate", "mike-thomas", "joseph-baker", "adam-cech", "alex-sanchez-fretz", "leo-bessler", "joshua-brangan", "bob-rawlinson", "ben-schnalke", "jack-sulger", "elam-hughes", "owen-marcovitz"] },
  { label: "Bike", ids: ["will-fowler", "kevin-weldon"] },
  { label: "UT2", ids: ["leyth-sousou"] },
  { label: "OYO", ids: ["cameron-beyki", "max-morehead"] },
  { label: "Rx", ids: ["george-burney", "alp-karadogan", "kynan-tallec-botos", "ryan-cornelius", "charles-richards"] },
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
