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
  athlete setup form and every saved lineup already speak them — and now they
  are also the words written ON screen, everywhere. The owner's call: a side has
  ONE name across the profile, the roster and the boat builder. (A British crew
  says strokeside/bowside for the same two sides; that dialect is deliberately
  not shown any more, so nobody has to translate between them.)
*/
export type Side = "P" | "S" | "B"; // port · starboard · both (bisweptual)

/*
  Painted blades. Port is red, starboard is GREEN, and someone who rows either
  way is blue — the owner's scheme, and the one the squad's oars use.
  `ink` is what stays readable ON that blade: the app has a light theme as well
  as a dark one, so no blade colour may assume the background behind it.
*/
/*
  `label` is the word — used wherever there is room to read one (the athlete's
  profile, the Team roster, the pool filter, the boat footer). `tag` is the
  single letter painted on the blade markers in the Coach Console, where the
  marker sits beside a name in a seat and a whole word would crowd it out.
  The owner's call: P, S, B in the console.
*/
export const sideMeta: Record<Side, { label: string; tag: string; color: string; ink: string }> = {
  P: { label: "Port", tag: "P", color: "#d93025", ink: "#ffffff" },
  S: { label: "Starboard", tag: "S", color: "#1e8e3e", ink: "#ffffff" },
  B: { label: "Both", tag: "B", color: "#2563eb", ink: "#ffffff" },
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
  The real squad, in ONE flat list. The paper list it came from was arranged by
  erg/fitness training group (Columns A–D, Bike, UT2, OYO, Rx) — those groups
  are gone from here on the owner's call: they are an erg-test artefact, they go
  stale the week after they are drawn up, and they say nothing about who can sit
  in which boat. The only thing that sorts an athlete now is their SIDE.

  The sides below are a WORKING SPLIT while the roster is still demo data:
  roughly half port, half starboard, a few who row either way. A coach's own
  answer (the side question in /varsity/setup) replaces them the moment these
  are real accounts. Same for `out`: five people are carrying something, so
  "who can I actually put in a boat today" has an answer to show. The coxswains
  take no side at all.
*/
export const roster: Athlete[] = [
  // ── Coxswains ──
  { id: "cate-frerichs", initials: "CF", name: "Cate Frerichs", side: "B", cox: true },
  { id: "micah-john", initials: "MJ", name: "Micah John", side: "B", cox: true },
  { id: "iris-hennin", initials: "IH", name: "Iris Hennin", side: "B", cox: true },
  { id: "nick-yoo", initials: "NY", name: "Nick Yoo", side: "B", cox: true },
  { id: "nat-toms", initials: "NT", name: "Nat Toms", side: "B", cox: true },
  { id: "abbi-park", initials: "AP", name: "Abbi Park", side: "B", cox: true },
  { id: "helena-inzerillo", initials: "HI", name: "Helena Inzerillo", side: "B", cox: true },

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

  { id: "will-fowler", initials: "WF", name: "Will Fowler", side: "S", out: "INJ" },
  { id: "kevin-weldon", initials: "KW", name: "Kevin Weldon", side: "B" },

  { id: "leyth-sousou", initials: "LS", name: "Leyth Sousou", side: "P" },

  { id: "cameron-beyki", initials: "CB", name: "Cameron Beyki", side: "S", out: "SICK" },
  { id: "max-morehead", initials: "MM", name: "Max Morehead", side: "P" },

  { id: "george-burney", initials: "GB", name: "George Burney", side: "S" },
  { id: "alp-karadogan", initials: "AK2", name: "Alp Karadogan", side: "B" },
  { id: "kynan-tallec-botos", initials: "KT", name: "Kynan Tallec-Botos", side: "P" },
  { id: "ryan-cornelius", initials: "RC", name: "Ryan Cornelius", side: "S" },
  { id: "charles-richards", initials: "CR", name: "Charles Richards", side: "P" },
];

export const rosterById: Record<string, Athlete> = Object.fromEntries(
  roster.map((a) => [a.id, a]),
);

/*
  HOW THE POOL IS FILTERED. Three buttons, and nothing else: All, Port,
  Starboard. All is everyone. Port and Starboard are the rowers who can pull
  that side — which includes everyone marked BOTH, so a bisweptual rower shows
  up under every filter and never has to be hunted for. Coxswains have no side,
  so they live under All.

  This replaced a pool grouped by erg-training column (Group B, OYO, Rx…). The
  owner's call: those groups are not true for long and are not what a coach is
  asking when they are filling a boat.
*/
export type PoolFilter = "all" | "P" | "S";
export const poolFilters: { key: PoolFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "P", label: sideMeta.P.label },
  { key: "S", label: sideMeta.S.label },
];

/** Does this athlete belong under that filter? "Both" belongs under all three. */
export function inPool(a: Athlete, f: PoolFilter): boolean {
  if (f === "all") return true;
  return !a.cox && (a.side === f || a.side === "B");
}

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

export type SeatSlot = { label: string; athleteId: string | null }; // "1" (bow) … "8" (stroke)
export type Boat = {
  id: string;
  badge: BoatType;
  name: string;
  dock: string;
  /** Which set of oars this crew takes out. Free text until the sets are named. */
  oars?: string;
  note: string;
  seats: SeatSlot[];
  hasCox: boolean;
  coxId: string | null;
};

/*
  SEAT NUMBERS, THE WAY A CREW SAYS THEM. Bow is 1 and the stroke seat is the
  highest number — 8 in an eight, 4 in a four — so a boat reads 8 down to 1
  from the stern, and the cox sits above the 8. Nothing else is written on a
  seat: it is a NUMBER, not a side.

  It used to be that each seat was pinned to port or starboard (rigged
  alternately) and painted in that side's colour. That is gone on the owner's
  call — a rig is the coach's business, not the app's, and a boat that colours
  its own seats argues with every crew that rigs tandem.

  `i` is the seat's index in the array, which runs bow → stroke.
*/
export function seatLabel(i: number): string {
  return String(i + 1);
}

/** The cox's mark in the boat. One letter, because the seat badge is tiny. */
export const COX_TAG = "C";
/** The cox's word, for anywhere with room to read it (pool chips, dropdowns). */
export const COX_LABEL = "COX";

// Build the empty seat list for a rigging — bow (1) first, stroke last.
export function makeSeats(type: BoatType): SeatSlot[] {
  const { rowers } = boatShape[type];
  return Array.from({ length: rowers }, (_, i) => ({ label: seatLabel(i), athleteId: null }));
}

/*
  WHEN THE BOAT PUSHES OFF. A plain dropdown of every five minutes from early
  morning to late evening — the classic scroll-through, which on a phone is the
  native wheel. A new boat opens on 7:15am, the squad's usual first push-off,
  and the coach changes it from there.
*/
export const DEFAULT_DOCK = "7:15am";
export const dockTimes: string[] = (() => {
  const out: string[] = [];
  for (let m = 4 * 60 + 30; m <= 21 * 60; m += 5) {
    const h24 = Math.floor(m / 60);
    const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
    out.push(`${h12}:${String(m % 60).padStart(2, "0")}${h24 < 12 ? "am" : "pm"}`);
  }
  return out;
})();
