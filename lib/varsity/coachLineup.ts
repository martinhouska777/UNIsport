/*
  COACH — LINEUP BUILDER DATA (source of truth for the boat lineup builder)
  ------------------------------------------------------------------
  Ported from the coach_lineup_builder_v2 mockup. The flow is: pick a practice
  (a day's AM or PM), then build one or more BOATS for it by filling seats from
  the ATHLETE POOL, and publish. Later this comes from the DB; for now it's mock.

  There is ONE roster keyed by id. Boats reference athletes by id and the pool
  shows whoever isn't currently seated — so a name can move between the pool and a
  seat (by typing or dragging) and only ever appear in one place.

  Rowing "side" is a per-athlete CONTENT property, so its colors live HERE as
  data and are applied via inline style — the same rule-1 exception the
  plan/profile screens use (a blade colour has no theme token, and never
  should: it does not change when the university does).
*/

/*
  The two sides of a boat, named the way a crew names them. `P` and `S` are the
  underlying port/starboard, kept as the stored keys because the database, the
  athlete setup form and every saved lineup already speak them — but nobody in
  a boathouse says "port", they say STROKE SIDE and BOW SIDE, so that is what
  is written on screen.
*/
export type Side = "P" | "S" | "B"; // stroke side · bow side · both (bisweptual)

/*
  Painted blades. Stroke side is red, bow side is white, and someone who rows
  either way is blue — the owner's scheme, and the one the squad's oars use.
  `ink` is what stays readable ON that blade, because a white blade needs dark
  lettering and a red one needs light: the app has a light theme as well as a
  dark one, so neither colour can be assumed to sit on a dark background.
*/
export const sideMeta: Record<Side, { label: string; tag: string; color: string; ink: string }> = {
  P: { label: "Stroke", tag: "STR", color: "#d93025", ink: "#ffffff" },
  S: { label: "Bow", tag: "BOW", color: "#f4f4f5", ink: "#18181b" },
  B: { label: "Both", tag: "BOTH", color: "#2563eb", ink: "#ffffff" },
};

export const COX_COLOR = "#eab308"; // yellow — cox identity
export const COX_INK = "#18181b";

/*
  Why somebody is out. Two reasons, because they are the two a coach acts on
  differently: an injury changes selection for weeks, a bug changes it for days.
*/
export type OutReason = "INJ" | "SICK";
export const outMeta: Record<OutReason, string> = { INJ: "Injured", SICK: "Sick" };

/* ── The roster (every assignable athlete, keyed by id) ── */
export type Athlete = {
  id: string;
  initials: string;
  name: string;
  side: Side;
  cox?: boolean; // a coxswain — can ONLY take the cox seat, never a rowing seat
  out?: OutReason; // unavailable today → listed apart, can't be seated
};

/*
  The real squad. The source list groups athletes by erg/fitness training group
  (Columns A–D, Bike, UT2, OYO, Rx), NOT by rowing side, so the sides below are
  a WORKING SPLIT, not the truth: roughly half stroke, half bow, a few who row
  either way. They exist so the boat maths is real while the roster is still
  demo data — a coach's own answer (the side question in /varsity/setup) will
  replace them the moment these are real accounts. Same for `out`: five people
  are carrying something, so "who can I actually put in a boat today" has an
  answer to show. Columns A + D are the coxswains, who take no side at all.
*/
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
  { id: "asante-kiio", initials: "AK", name: "Asante Kiio", side: "P" },
  { id: "luca-vicino", initials: "LV", name: "Luca Vicino", side: "S" },
  { id: "marcus-chung", initials: "MC", name: "Marcus Chung", side: "P" },
  { id: "mason-cruz-abrams", initials: "MCr", name: "Mason Cruz-Abrams", side: "S" },
  { id: "jack-dorney", initials: "JD", name: "Jack Dorney", side: "B" },
  { id: "alexander-grundy", initials: "AG", name: "Alexander Grundy", side: "P" },
  { id: "george-farkas", initials: "GF", name: "George Farkas", side: "S" },
  { id: "sam-gallaudet", initials: "SG", name: "Sam Gallaudet", side: "P" },
  // The demo account itself, so a seat can light up as "You" on Home.
  { id: "john-brown", initials: "JBn", name: "John Brown", side: "S" },
  { id: "marco-gandola", initials: "MG", name: "Marco Gandola", side: "B" },
  { id: "apostolos-lykomitros", initials: "AL", name: "Apostolos Lykomitros", side: "P" },
  { id: "tyler-horler", initials: "TH", name: "Tyler Horler", side: "S", out: "INJ" },
  { id: "teddy-plimpton", initials: "TP", name: "Teddy Plimpton", side: "P" },
  { id: "sam-davidson", initials: "SD", name: "Sam Davidson", side: "S" },
  { id: "jordan-dykema", initials: "JDy", name: "Jordan Dykema", side: "B" },

  // ── Group C ──
  { id: "jack-hansen-knarhoi", initials: "JH", name: "Jack Hansen-Knarhoi", side: "P" },
  { id: "owen-finnerty", initials: "OF", name: "Owen Finnerty", side: "S" },
  { id: "marco-vicino", initials: "MV", name: "Marco Vicino", side: "P" },
  { id: "pierce-lapham", initials: "PL", name: "Pierce Lapham", side: "S" },
  { id: "julian-paul", initials: "JP", name: "Julian Paul", side: "B", out: "SICK" },
  { id: "ben-scott", initials: "BS", name: "Ben Scott", side: "P", out: "INJ" },
  { id: "sam-woodgate", initials: "SW", name: "Sam Woodgate", side: "S" },
  { id: "mike-thomas", initials: "MT", name: "Mike Thomas", side: "P" },
  { id: "joseph-baker", initials: "JB", name: "Joseph Baker", side: "S" },
  { id: "adam-cech", initials: "AC", name: "Adam Cech", side: "B" },
  { id: "alex-sanchez-fretz", initials: "AS", name: "Alex Sanchez Fretz", side: "P" },
  { id: "leo-bessler", initials: "LB", name: "Leo Bessler", side: "S" },
  { id: "joshua-brangan", initials: "JBr", name: "Joshua Brangan", side: "P" },
  { id: "bob-rawlinson", initials: "BR", name: "Bob Rawlinson", side: "S" },
  { id: "ben-schnalke", initials: "BSc", name: "Ben Schnalke", side: "B" },
  { id: "jack-sulger", initials: "JS", name: "Jack Sulger", side: "P" },
  { id: "elam-hughes", initials: "EH", name: "Elam Hughes", side: "S" },
  { id: "owen-marcovitz", initials: "OM", name: "Owen Marcovitz", side: "P" },

  // ── Bike ──
  { id: "will-fowler", initials: "WF", name: "Will Fowler", side: "S", out: "INJ" },
  { id: "kevin-weldon", initials: "KW", name: "Kevin Weldon", side: "B" },

  // ── UT2 ──
  { id: "leyth-sousou", initials: "LS", name: "Leyth Sousou", side: "P" },

  // ── OYO ──
  { id: "cameron-beyki", initials: "CB", name: "Cameron Beyki", side: "S", out: "SICK" },
  { id: "max-morehead", initials: "MM", name: "Max Morehead", side: "P" },

  // ── Rx ──
  { id: "george-burney", initials: "GB", name: "George Burney", side: "S" },
  { id: "alp-karadogan", initials: "AK2", name: "Alp Karadogan", side: "B" },
  { id: "kynan-tallec-botos", initials: "KT", name: "Kynan Tallec-Botos", side: "P" },
  { id: "ryan-cornelius", initials: "RC", name: "Ryan Cornelius", side: "S" },
  { id: "charles-richards", initials: "CR", name: "Charles Richards", side: "P" },
];

export const rosterById: Record<string, Athlete> = Object.fromEntries(
  roster.map((a) => [a.id, a]),
);

// How the pool is grouped (by each athlete's last lineup). Seated athletes drop
// out of their group automatically; removing one returns it here.
export const rosterGroups: { label: string; danger?: boolean; ids: string[] }[] = [
  { label: "Coxswains", ids: ["cate-frerichs", "micah-john", "iris-hennin", "nick-yoo", "nat-toms", "abbi-park", "helena-inzerillo"] },
  { label: "Group B", ids: ["asante-kiio", "luca-vicino", "marcus-chung", "mason-cruz-abrams", "jack-dorney", "alexander-grundy", "george-farkas", "sam-gallaudet", "john-brown", "marco-gandola", "apostolos-lykomitros", "tyler-horler", "teddy-plimpton", "sam-davidson", "jordan-dykema"] },
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

/*
  WHICH SIDE A SEAT ROWS. A boat is rigged alternately: the stroke seat takes
  stroke side, the seat in front of them bow side, and so on down to the bow.
  An eight is therefore always four of each, a four is two of each, and that is
  a fact about the boat rather than about who the coach puts in it — which is
  why it is computed here rather than stored, and why it cannot come out wrong.

  `i` is the seat's index in the array; the LAST index is the stroke seat.
*/
export function seatSide(i: number, rowers: number): Exclude<Side, "B"> {
  return (rowers - 1 - i) % 2 === 0 ? "P" : "S";
}

/** Can this athlete take that seat? Someone who rows both sides always can. */
export function fitsSeat(a: Athlete, side: Side): boolean {
  return !a.cox && (a.side === "B" || a.side === side);
}

/** How many of each side a rigging asks for — "4 stroke · 4 bow" on an eight. */
export function sideDemand(rowers: number): { P: number; S: number } {
  return {
    P: Array.from({ length: rowers }, (_, i) => seatSide(i, rowers)).filter((s) => s === "P").length,
    S: Array.from({ length: rowers }, (_, i) => seatSide(i, rowers)).filter((s) => s === "S").length,
  };
}
