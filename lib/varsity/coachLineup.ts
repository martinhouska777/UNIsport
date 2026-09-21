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
/*
  PORT / STARBOARD / BOTH. This wording has now been round the houses twice —
  Port/Starboard, then Stroke/Bow, and back again on the owner's instruction.
  It stays here because it is the SIDE OF THE BOAT, which is what the blade
  colour, the seat marker and the athlete's own answer all mean; stroke side
  and bow side are the British dialect for the same two things.

  The colours are the painted blades and are used everywhere the side is
  shown, the Team roster included — red port, green starboard, blue for a
  rower who takes either. (The roster briefly drew all three blue; one colour
  for "on a side" threw away the only thing the dot was there to say.)
*/
export const sideMeta: Record<Side, { label: string; tag: string; color: string; ink: string }> = {
  P: { label: "Port", tag: "P", color: "#d93025", ink: "#ffffff" },
  S: { label: "Starboard", tag: "S", color: "#1e8e3e", ink: "#ffffff" },
  B: { label: "Both", tag: "B", color: "#2563eb", ink: "#ffffff" },
};

export const COX_COLOR = "#eab308"; // yellow — cox identity
export const COX_INK = "#18181b";

/*
  WHY SOMEBODY IS NOT IN A BOAT. Not all of these are an injury: on any given
  morning a squad's lineup sheet has boats down one side and, down the other,
  the people who are training somewhere else — on the ergs, on their own, in
  the launch, or working through a rehab programme. The coach needs to see all
  of them in one place, which is what this list is, so every reason the sheet
  carries gets a word here.

  `span` is how long it lasts, and it is the real difference between them: a
  bug, a morning on the erg, a turn in the launch are all TODAY, while an
  injury or a rehab block runs until the coach brings the athlete back in.

  Who is out on which day lives in lib/varsity/availabilityStore.ts — it is a
  fact about a DAY, so it is never written on the athlete below.
*/
export type OutReason = "INJ" | "SICK" | "RX" | "ERG" | "OYO" | "LAUNCH";
export const outMeta: Record<OutReason, string> = {
  INJ: "Injured",
  SICK: "Sick",
  RX: "Rx",
  ERG: "Erg",
  OYO: "OYO",
  LAUNCH: "Launch",
};

export type OutSpan = "day" | "open";
export const outOptions: { reason: OutReason; label: string; sub: string; span: OutSpan }[] = [
  { reason: "SICK", label: "Sick", sub: "Out today. Back in the pool tomorrow.", span: "day" },
  { reason: "INJ", label: "Injured", sub: "Out until you bring them back in.", span: "open" },
  { reason: "RX", label: "Rx", sub: "On a rehab programme until you bring them back in.", span: "open" },
  { reason: "ERG", label: "Erg", sub: "On the ergs today instead of in a boat.", span: "day" },
  { reason: "OYO", label: "OYO", sub: "Training on their own today.", span: "day" },
  { reason: "LAUNCH", label: "Launch", sub: "In the launch today.", span: "day" },
];

/* ── The roster (every assignable athlete, keyed by id) ── */
export type Athlete = {
  id: string;
  initials: string;
  name: string;
  side: Side;
  cox?: boolean; // a coxswain — can ONLY take the cox seat, never a rowing seat
};

/*
  THE SQUAD, in ONE flat list — the real one, as it is written on the coach's
  own lineup sheet (owner, 2026-09-21: the app is being shown to the coaches,
  and a crew they do not recognise tells them nothing). It had been replaced by
  invented names for the public landing-page screenshots; those shots are
  already taken, and the ids never changed with them, so this is the same
  roster it always was with its names back.

  The IDS ARE STABLE KEYS: every saved boat lineup and every seeded row in db/
  refers to a seat by one of these, so a name may be corrected but an id may
  not be re-keyed. `martin-houska` is the owner's own seat, which the demo
  account claims through `data.varsity.rosterId` (lib/varsity/athleteProfile).

  The list was once arranged by erg/fitness training group (Columns A–D, Bike,
  UT2, OYO, Rx) — those groups are gone on the owner's call: they are an
  erg-test artefact, they go stale the week after they are drawn up, and they
  say nothing about who can sit in which boat. The only thing that sorts an
  athlete now is their SIDE.

  The sides are a WORKING SPLIT: the squad's sheet does not record who rows
  which side, so they are set to read half port, half starboard down each boat.
  A rower's own answer (the side question in /varsity/setup) replaces them the
  moment these are real accounts. Nobody here is marked out: who is out is a
  fact about a day, written by the coach from the Lineup pool and kept in
  lib/varsity/availabilityStore.ts, never on the roster. The coxswains take no
  side at all.
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
  { id: "miller", initials: "Mi", name: "Miller", side: "B", cox: true },
  { id: "branco", initials: "Br", name: "Branco", side: "B", cox: true },
  { id: "grieser", initials: "Gr", name: "Grieser", side: "B", cox: true },

  { id: "asante-kiio", initials: "AK", name: "Asante Kiio", side: "P" },
  { id: "luca-vicino", initials: "LV", name: "Luca Vicino", side: "S" },
  { id: "marcus-chung", initials: "MC", name: "Marcus Chung", side: "P" },
  { id: "mason-cruz-abrams", initials: "MCr", name: "Mason Cruz-Abrams", side: "S" },
  { id: "o-cruz-abrams", initials: "OC", name: "O Cruz-Abrams", side: "P" },
  { id: "jack-dorney", initials: "JD", name: "Jack Dorney", side: "B" },
  { id: "alexander-grundy", initials: "AG", name: "Alexander Grundy", side: "P" },
  { id: "george-farkas", initials: "GF", name: "George Farkas", side: "S" },
  { id: "sam-gallaudet", initials: "SG", name: "Sam Gallaudet", side: "P" },
  { id: "martin-houska", initials: "MH", name: "Martin Houska", side: "S" },
  { id: "marco-gandola", initials: "MG", name: "Marco Gandola", side: "B" },
  { id: "apostolos-lykomitros", initials: "AL", name: "Apostolos Lykomitros", side: "P" },
  { id: "tyler-horler", initials: "TH", name: "Tyler Horler", side: "S" },
  { id: "teddy-plimpton", initials: "TP", name: "Teddy Plimpton", side: "P" },
  { id: "sam-davidson", initials: "SD", name: "Sam Davidson", side: "S" },
  { id: "jordan-dykema", initials: "JDy", name: "Jordan Dykema", side: "B" },

  { id: "jack-hansen-knarhoi", initials: "JH", name: "Jack Hansen-Knarhoi", side: "P" },
  { id: "owen-finnerty", initials: "OF", name: "Owen Finnerty", side: "S" },
  { id: "marco-vicino", initials: "MV", name: "Marco Vicino", side: "P" },
  { id: "pierce-lapham", initials: "PL", name: "Pierce Lapham", side: "S" },
  { id: "julian-paul", initials: "JP", name: "Julian Paul", side: "B" },
  { id: "ben-scott", initials: "BS", name: "Ben Scott", side: "P" },
  { id: "sam-woodgate", initials: "SW", name: "Sam Woodgate", side: "S" },
  { id: "mike-thomas", initials: "MT", name: "Mike Thomas", side: "P" },
  { id: "joseph-baker", initials: "JB", name: "Joseph Baker", side: "S" },
  { id: "adam-cech", initials: "AC", name: "Adam Cech", side: "B" },
  { id: "alex-sanchez-fretz", initials: "AS", name: "Alex Sanchez-Fretz", side: "P" },
  { id: "leo-bessler", initials: "LB", name: "Leo Bessler", side: "S" },
  { id: "joshua-brangan", initials: "JBr", name: "Joshua Brangan", side: "P" },
  { id: "bob-rawlinson", initials: "BR", name: "Bob Rawlinson", side: "S" },
  { id: "ben-schnalke", initials: "BSc", name: "Ben Schnalke", side: "B" },
  { id: "jack-sulger", initials: "JS", name: "Jack Sulger", side: "P" },
  { id: "elam-hughes", initials: "EH", name: "Elam Hughes", side: "S" },
  { id: "owen-marcovitz", initials: "OM", name: "Owen Marcovitz", side: "P" },

  { id: "will-fowler", initials: "WF", name: "Will Fowler", side: "S" },
  { id: "kevin-weldon", initials: "KW", name: "Kevin Weldon", side: "B" },
  { id: "leyth-sousou", initials: "LS", name: "Leyth Sousou", side: "P" },
  { id: "cameron-beyki", initials: "CB", name: "Cameron Beyki", side: "S" },
  { id: "max-morehead", initials: "MM", name: "Max Morehead", side: "P" },
  { id: "george-burney", initials: "GB", name: "George Burney", side: "S" },
  { id: "alp-karadogan", initials: "AK2", name: "Alp Karadogan", side: "B" },
  { id: "kynan-tallec-botos", initials: "KT", name: "Kynan Tallec-Botos", side: "P" },
  { id: "ryan-cornelius", initials: "RC", name: "Ryan Cornelius", side: "S" },
  { id: "charles-richards", initials: "CR", name: "Charles Richards", side: "P" },

  /* The rowers and coxswains who appear on the squad's own lineup sheet but had
     never been entered here. Their sheet gives a SURNAME only, so a surname is
     what they are called — inventing a first name would put a wrong one in front
     of the people who know them. */
  { id: "cleugh", initials: "Cl", name: "Cleugh", side: "P" },
  { id: "elias", initials: "El", name: "Elias", side: "S" },
  { id: "obyrne", initials: "OB", name: "O'Byrne", side: "P" },
  { id: "wu", initials: "Wu", name: "Wu", side: "P" },
  { id: "rabinovitz", initials: "Rb", name: "Rabinovitz", side: "P" },
  { id: "wolskel", initials: "Wo", name: "Wolskel", side: "P" },
  { id: "hazen", initials: "Hz", name: "Hazen", side: "S" },
  { id: "saeed", initials: "Sa", name: "Saeed", side: "B" },
  { id: "schinnerl", initials: "Sc", name: "Schinnerl", side: "B" },
  { id: "yu", initials: "Yu", name: "Yu", side: "B" },
];

export const rosterById: Record<string, Athlete> = Object.fromEntries(
  roster.map((a) => [a.id, a]),
);

/*
  HOW THE POOL IS FILTERED. Four buttons: All, Port, Starboard, Cox. All is
  everyone. Port and Starboard are the rowers who can pull that side — which
  includes everyone marked BOTH, so a bisweptual rower shows up under both and
  never has to be hunted for. Cox is its own button because "who can steer" is
  a question a coach asks on its own, and coxswains have no side to be found
  under — before this they could only be picked out of All by eye.

  This replaced a pool grouped by erg-training column (Group B, OYO, Rx…). The
  owner's call: those groups are not true for long and are not what a coach is
  asking when they are filling a boat.

  Each button carries its own swatch colour, so the row is drawn from this list
  and the component never names a colour itself.
*/
export type PoolFilter = "all" | "P" | "S" | "cox";
export const poolFilters: { key: PoolFilter; label: string; color?: string; ink?: string }[] = [
  { key: "all", label: "All" },
  { key: "P", label: sideMeta.P.label, color: sideMeta.P.color, ink: sideMeta.P.ink },
  { key: "S", label: sideMeta.S.label, color: sideMeta.S.color, ink: sideMeta.S.ink },
  { key: "cox", label: "Cox", color: COX_COLOR, ink: COX_INK },
];

/** Does this athlete belong under that filter? "Both" belongs under P and S. */
export function inPool(a: Athlete, f: PoolFilter): boolean {
  if (f === "all") return true;
  if (f === "cox") return !!a.cox;
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

/* ── Boat rigging types ─────────────────────────────────────────────────────
   THE FOUR BELOW ARE A PRESET, NOT THE LAW (owner, 2026-09-17). They are what
   a sweep squad rows and what the app has always shipped, so they remain the
   default — but the list a coach sees when adding a boat comes from their own
   team config (lib/varsity/trainingConfig → `boats`), where a squad can add a
   single, a quad, a coxed pair, or whatever else sits on their racks.

   `key` is what gets written into every saved boat as its badge, so it must
   never be re-keyed in place — an existing lineup's "8+" has to keep meaning
   the eight. That is why a boat's badge is plain text: the set of riggings is
   now data, and the code cannot know them all in advance. */
export type BoatKind = {
  key: string;
  /** What is written on the button and on the boat: "8+", "4−", "1x". */
  symbol: string;
  /** The word for it, which the athlete's own lineup card reads: "Eight". */
  name: string;
  rowers: number;
  cox: boolean;
};

export const defaultBoatTypes: BoatKind[] = [
  { key: "8+", symbol: "8+", name: "Eight", rowers: 8, cox: true },
  { key: "4+", symbol: "4+", name: "Coxed Four", rowers: 4, cox: true },
  { key: "4-", symbol: "4−", name: "Straight Four", rowers: 4, cox: false },
  { key: "2-", symbol: "2−", name: "Pair", rowers: 2, cox: false },
];

/* The old name, kept for the screens that only ever wanted the default four —
   the athlete's lineup card turning a badge back into a word, for one. */
export const boatTypes = defaultBoatTypes;

export type SeatSlot = { label: string; athleteId: string | null }; // "1" (bow) … "8" (stroke)
export type Boat = {
  id: string;
  /** The rigging's key, e.g. "8+". Plain text: the riggings are team data. */
  badge: string;
  name: string;
  dock: string;
  /** Which set of oars this crew takes out. Free text until the sets are named. */
  oars?: string;
  note: string;
  seats: SeatSlot[];
  hasCox: boolean;
  coxId: string | null;
  /*
    WHAT THIS CREW ACTUALLY DID, written after the outing rather than before it.
    The plan says 16k for the morning; this eight turned round early and did 14
    while the four went on and did 17 — so the number belongs to the BOAT, not
    to the practice, and it counts for every person sitting in it. A season's
    mileage is the sum of these, which is why one rower ends the term on 100k
    and their team-mate on 110.

    Metres and minutes: the same two units a workout log is kept in
    (lib/varsity/logStore), so a log can be filled from a boat later with
    nothing to convert. `minutes` is the WORKING time, not dock to dock
    (owner, 2026-09-19: "pure workout").

    Both are optional and are absent on every boat built before they existed —
    never read one without checking it is there.
  */
  metres?: number | null;
  minutes?: number | null;
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

/*
  WHAT A BOAT IS CALLED BEFORE THE COACH NAMES IT. A placeholder, not a name —
  which is why it lives here rather than being typed into the builder: the
  athlete's card has to be able to TELL that a boat is still unnamed, so it can
  call the crew after its cox or its stroke instead of showing three "New 8+"s
  in a row (lib/varsity/home → crewName).
*/
export const defaultBoatName = (badge: string) => `New ${badge}`;

/*
  Is this name still the one a new boat is born with? Compared loosely on the
  minus: the builder names a boat from the kind's SYMBOL ("New 4−", a real minus
  sign) but everything else asks with its KEY ("4-", a hyphen), so a coxless
  four or a pair that was never renamed used to count as named — and the seat
  race sheet printed "New 4−" where the stroke's surname belonged.
*/
export const isDefaultBoatName = (name: string | null | undefined, badge: string) =>
  !name || name.replace(/−/g, "-") === defaultBoatName(badge.replace(/−/g, "-"));

// Build the empty seat list for a rigging — bow (1) first, stroke last.
export function makeSeats(rowers: number): SeatSlot[] {
  return Array.from({ length: rowers }, (_, i) => ({ label: seatLabel(i), athleteId: null }));
}

/*
  CARRYING A CREW FORWARD. A squad's Tuesday eight is Monday's eight minus one
  person, so a practice with no lineup yet starts from the last one the squad
  was given (lineupStore → fetchCarriedLineup) rather than from nothing.

  What comes across is everything that is true of the boat rather than of the
  outing: the rigging, which shell, which oars, when it pushes off, and who
  sits where. The crew NOTE does not — "watch the bridge crew" is about one
  morning, and a note carried into a day it was never written for would be
  read as if it had been. Neither do the KILOMETRES and the working time: they
  are the record of one outing, and carried forward they would count a second
  time in everyone's mileage without anybody having rowed a stroke.
  Every boat gets a new id, because this is a new record for a new day, not the
  old one edited.
*/
export function carryBoats(boats: Boat[]): Boat[] {
  const stamp = Date.now();
  return boats.map((b, i) => ({
    ...b,
    id: `boat-${stamp}-${i}`,
    note: "",
    metres: null,
    minutes: null,
    seats: b.seats.map((s) => ({ ...s })),
  }));
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
