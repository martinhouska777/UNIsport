/*
  RACE PIECES ON THE WATER — the coach's timing sheet, as a leaderboard.
  ---------------------------------------------------------------------------
  The squad's timing sheet (owner, 2026-09-21) is a session split into PIECES
  (Piece 1, Piece 2…), and under each piece the crews with a START and a
  FINISH read off one running watch, and the OVERALL time that falls out of
  the two. The coxed fours are listed by their cox ("Cate", "Sofia"), the
  pairs by their two surnames ("Gallaudet/Gandola"), and a crew that went
  round the wrong side of something gets a note ("**Bridge").

  This file is that sheet's arithmetic, and nothing else:
    • a crew's time — finish minus start, or the overall time typed straight in
    • the board for ONE piece — crews ranked WITHIN THEIR CLASS (the fours
      against the fours, the pairs against the pairs — owner: "rank them as
      separate class"), each with its margin to the winner and to the boat
      just ahead
    • the COMBINED board — over every piece, the SUM OF A CREW'S MARGINS to
      the winner of its class (owner: "let's start on sum of margins"), so the
      crew that was nearest the front most often is on top even if it never
      won a piece outright
  A margin is never coloured and never judged: it is the gap, written down.
  On the board the combined margins are COLUMNS — Piece 1, Piece 2, Total —
  not small print under the name (owner, 2026-09-21).

  Storage is one JSON blob per session (lib/varsity/raceStore.ts), the way a
  lineup is; the crews are the boats of that session's lineup, so a result is
  a crew's, and every seat in it can find it. Times are kept in SECONDS; the
  watch's "8:02:11.5" is only how they are typed and shown (since 2026-09-28
  typed as digits, or spun on a wheel — watchSlots, TimeSheet.tsx).
*/
import { boatTypes, roster, rosterById, type Boat } from "./coachLineup";

/* ── The data ───────────────────────────────────────────────────────────── */

export type RaceCrew = {
  /** The lineup boat this crew is, so the result stays with the seats. */
  boatId: string;
  /** How the sheet names it — the cox, or the surnames. Kept, so a boat
      re-drawn later does not rename a result already written down. */
  label: string;
  /** The boat's class key ("4+", "2-"), which is what it is ranked against. */
  badge: string;
  /** The rowers' surnames, stroke first — so the board can draw the BOAT under
      the crew's name (owner, 2026-09-21: "I want to see the boat there, like
      the four names"). Kept with the result, like the label. Older rows have
      none; see crewMembers(). */
  rowers?: string[];
  /** The same rowers as ROSTER IDS, in the same order — who they are, where a
      surname is only what the sheet calls them (the squad has two
      Cruz-Abrams). Written for every crew made from a lineup since
      2026-09-27; older rows have none, and crewPeople() works them out. */
  rowerIds?: string[];
  /** Off the running watch, in seconds. Null: not written yet. */
  start: number | null;
  finish: number | null;
  /** An overall time with no watch reading. Only older sheets have one — the
      editor no longer types it (owner, 2026-09-29: "just start and finish and
      the time will come from it"); crewTime() still shows it when there is no
      start and finish. */
  total: number | null;
  /** "Bridge", "crab at 500" — the sheet's asterisked remarks. */
  note: string;
};

export type RacePiece = {
  id: string;
  /** "Piece 1". */
  name: string;
  crews: RaceCrew[];
};

export type RaceDay = {
  dayKey: string;
  pieces: RacePiece[];
  updatedAt?: string;
};

/* ── Times ──────────────────────────────────────────────────────────────── */

/**
 * What the watch said, as seconds. Accepts "25:14.48", "25:14", "1:02:10.3",
 * "7:15,7" (a comma on a Czech keyboard) and a bare "46.2". Anything that is
 * not a time comes back null — a stray key is never saved as a result.
 */
export function parseClock(text: string): number | null {
  const t = text.trim().replace(",", ".");
  if (!t) return null;
  if (!/^\d{1,3}(:\d{1,2}){0,2}(\.\d{1,3})?$/.test(t)) return null;
  const parts = t.split(":").map(Number);
  if (parts.some((n) => Number.isNaN(n))) return null;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return Math.round(sec * 100) / 100;
}

/** 1514.48 → "25:14.48"; an hour or more → "1:02:10.30". Always hundredths. */
export function formatClock(sec: number | null): string {
  if (sec == null) return "—";
  const whole = Math.floor(sec);
  const hh = Math.round((sec - whole) * 100)
    .toString()
    .padStart(2, "0");
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  const ms = `${h ? String(m).padStart(2, "0") : m}:${String(s).padStart(2, "0")}.${hh}`;
  return h ? `${h}:${ms}` : ms;
}

/** A gap: "+13.58", or "+1:02.30" from a minute up. Zero is the winner's. */
export function formatMargin(sec: number): string {
  if (sec < 0.005) return "0.00";
  if (sec < 60) return `+${sec.toFixed(2)}`;
  return `+${formatClock(sec)}`;
}

/*
  A TIME AS IT IS TYPED OFF THE WATCH — LEFT TO RIGHT (owner, 2026-09-28: "I
  type 802115 and I want to add the : automatically so it becomes 8:02:11.5",
  then: "write it from left to right, like first hour, then minutes, then
  seconds, and then last"). In TENTHS, the way the squad's sheets are written.

  The digits OVERWRITE the time already on the wheels, one place at a time —
  the hour, the minutes, the seconds, the tenth — so "802115" typed over
  8:00:00.0 is 8:02:11.5, and the colon and the dot are never typed (a
  phone's number pad has neither). The hour takes as many places as the time
  being overwritten has — one for 8, two for 10 — and a place not typed yet
  keeps what is showing in it.
*/

/** A time's places, hour first: 8:02:11.5 → { digits: "802115", hour: 1 }. */
export function watchSlots(sec: number): { digits: string; hour: number } {
  const tenths = Math.max(0, Math.round(sec * 10));
  const h = String(Math.floor(tenths / 36000));
  const mm = String(Math.floor(tenths / 600) % 60).padStart(2, "0");
  const ss = String(Math.floor(tenths / 10) % 60).padStart(2, "0");
  return { digits: `${h}${mm}${ss}${tenths % 10}`, hour: h.length };
}

/** The places back into seconds: ("802115", 1) → 28931.5. A "75" in the
    minutes simply carries into the hour, as a microwave's does. */
export function watchFromSlots(digits: string, hour: number): number {
  const n = (from: number, to: number) => Number(digits.slice(from, to) || 0);
  return n(0, hour) * 3600 + n(hour, hour + 2) * 60 + n(hour + 2, hour + 4) + n(hour + 4, hour + 5) / 10;
}

/** 28931.5 → "8:02:11.5"; under an hour, "44:16.3". Tenths, as the sheets are written. */
export function formatWatch(sec: number | null): string {
  if (sec == null) return "—";
  const tenths = Math.max(0, Math.round(sec * 10));
  const h = Math.floor(tenths / 36000);
  const m = Math.floor(tenths / 600) % 60;
  const s = String(Math.floor(tenths / 10) % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}.${tenths % 10}` : `${m}:${s}.${tenths % 10}`;
}

/** Which of a crew's watch readings is being written. */
export type WatchField = "start" | "finish";

/*
  WHERE THE WHEEL STARTS on a time nobody has written yet (owner, 2026-09-28:
  "you know when the session started, so warm up is 45 mins, so around 8
  pieces start, so like 1 hour after start — preset it like that").

    • The first boat of the first piece: the session's own time plus an hour,
      on a twelve-hour clock — a 7:00 AM outing puts the wheel at 8:00:00.0.
    • Every boat after it: where the boat above it started — crews go off
      together, or seconds apart — and a finish where the boat above finished.
    • A boat's finish with nobody above it: its own start.
    • The first boat of a later piece: where the piece before it ended.

  Only where the wheel STARTS. Nothing is written until the coach presses
  Next or Done on the time (feedback: a guess must never look like a decision).
*/
const WARM_UP = 3600;

/** The session's time ("7:00 AM") plus the warm-up, on the watch's twelve-hour clock: 8:00:00.0. */
export function piecesStartAround(sessionTime: string | undefined): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})/.exec(sessionTime ?? "");
  if (!m) return null;
  let sec = (Number(m[1]) % 12 || 12) * 3600 + Number(m[2]) * 60 + WARM_UP;
  if (sec >= 13 * 3600) sec -= 12 * 3600;
  return sec;
}

/**
 * The wheel's first position for crew `i`'s `field`, given the crews in the
 * order the sheet lists them, the piece before this one, and piecesStartAround.
 */
export function wheelStart(
  crews: RaceCrew[],
  i: number,
  field: WatchField,
  earlier: RacePiece | null,
  around: number | null,
): number {
  const above = crews.slice(0, i).reverse();
  if (field === "finish") {
    const finish = above.find((c) => c.finish != null)?.finish;
    if (finish != null) return finish;
    if (crews[i]?.start != null) return crews[i].start!;
  }
  const start = above.find((c) => c.start != null)?.start;
  if (start != null) return start;
  const ended = Math.max(-1, ...(earlier?.crews ?? []).map((c) => c.finish ?? -1));
  if (ended >= 0) return ended;
  return around ?? 0;
}

/** The crew's time for the piece, however it was written down. */
export function crewTime(c: RaceCrew): number | null {
  if (c.start != null && c.finish != null && c.finish > c.start) {
    return Math.round((c.finish - c.start) * 100) / 100;
  }
  return c.total;
}

/* ── Crews from a lineup ────────────────────────────────────────────────── */

const surname = (id: string | null) => {
  if (!id) return null;
  const name = rosterById[id]?.name ?? id;
  const words = name.trim().split(/\s+/);
  return words[words.length - 1];
};

/**
 * The sheet's own way of naming a crew: a coxed boat by its cox, a boat with
 * no cox by its rowers' surnames, stroke first, joined with a slash.
 */
export function crewLabel(boat: Boat): string {
  if (boat.hasCox && boat.coxId) return rosterById[boat.coxId]?.name ?? boat.coxId;
  const names = [...boat.seats]
    .reverse() // seats run bow → stroke; the sheet says the stroke first
    .map((s) => surname(s.athleteId))
    .filter((n): n is string => !!n);
  if (names.length) return names.join("/");
  return boat.name || boat.badge;
}

/** The seated rowers' roster ids, stroke first, as the sheet lists a crew. */
const strokeFirst = (boat: Boat): string[] =>
  [...boat.seats]
    .reverse()
    .map((s) => s.athleteId)
    .filter((id): id is string => !!id);

/** The rowers' surnames, stroke first, as the sheet lists a crew. */
export function crewRowers(boat: Boat): string[] {
  return strokeFirst(boat).map((id) => surname(id)!);
}

export function crewFromBoat(boat: Boat): RaceCrew {
  return {
    boatId: boat.id,
    label: crewLabel(boat),
    badge: boat.badge,
    rowers: crewRowers(boat),
    rowerIds: strokeFirst(boat),
    start: null,
    finish: null,
    total: null,
    note: "",
  };
}

/*
  HOW MANY PIECES THE PLAN ASKS FOR (owner, 2026-09-22).

  "Pieces will be in the plan, so I wanted to take data from the plan. When
  it's 4 x 5 minutes, then it will be 4 pieces, or 2 x 2 miles."

  So the coach's own wording decides it, exactly the way the erg boards already
  read it to tell 8x500m from a straight 4k (rowedAsReps in teamBoard.ts): a
  count in front of a number. "4 x 5 min" is four, "2 x 2 miles" is two,
  "3x25'" is three. A session with no such wording is ONE piece rowed straight
  through, which is the safe way round — a coach who wanted four gets a plus
  to add them, while four tabs on a single head race would be three empty
  boards to delete.

  Clamped to 20. The regex already stops at two digits, and nothing a crew
  times piece by piece runs past twenty; a typo should not put fifty tabs on
  the screen.
*/
const PIECE_COUNT_RE = /(^|[\s(“"'\-–])(\d{1,2})\s*[x×]\s*\d/i;

export function pieceCountFromText(description: string | undefined): number {
  const m = PIECE_COUNT_RE.exec(description ?? "");
  if (!m) return 1;
  const n = Number(m[2]);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(20, Math.round(n));
}

/**
 * The pieces a session starts with: as many as the plan's wording asks for,
 * each holding the session's lineup crews, so the times can be typed straight
 * away. Where a crew differs on a later piece the coach swaps the names on it.
 */
export function piecesFromSession(description: string | undefined, boats: Boat[]): RacePiece[] {
  const n = pieceCountFromText(description);
  return Array.from({ length: n }, (_, i) => newPiece(i + 1, boats));
}

/** Every seated boat of the lineup, as blank crews for a new piece. */
export function crewsFromBoats(boats: Boat[]): RaceCrew[] {
  return boats
    .filter((b) => b.seats.some((s) => s.athleteId) || b.coxId)
    .map(crewFromBoat);
}

export function newPiece(n: number, boats: Boat[]): RacePiece {
  return {
    id: `piece-${Date.now().toString(36)}-${n}`,
    name: `Piece ${n}`,
    crews: crewsFromBoats(boats),
  };
}

/*
  THE NEXT PIECE STARTS WITH THE CREWS THAT ROWED THE LAST ONE — after a
  switch, a new piece made from the lineup again would quietly put every
  rower back where they began. Times and notes are the piece's own and start
  empty; the people are carried over.
*/
export function pieceAfter(prev: RacePiece, n: number): RacePiece {
  return {
    id: `piece-${Date.now().toString(36)}-${n}`,
    name: `Piece ${n}`,
    crews: prev.crews.map(freshCrew),
  };
}

/** The same crew, same people, for another piece: no times, no note. */
export function freshCrew(c: RaceCrew): RaceCrew {
  return {
    ...c,
    rowers: c.rowers ? [...c.rowers] : undefined,
    rowerIds: c.rowerIds ? [...c.rowerIds] : undefined,
    start: null,
    finish: null,
    total: null,
    note: "",
  };
}

/* ── Who is in the boat ─────────────────────────────────────────────────── */

/** Does a boat of this class carry a cox? A badge no rigging knows: no. */
export function classHasCox(badge: string): boolean {
  return boatTypes.find((k) => k.key === badge)?.cox ?? false;
}

/**
 * The people in a crew, for drawing it as a boat: the cox (the label of a
 * coxed boat, the sheet's way) and the rowers, stroke first. A crew written
 * before rowers were kept, with no cox, is named by its rowers' surnames —
 * "Gallaudet/Gandola" — so they are read back out of the label.
 */
export function crewMembers(c: RaceCrew): { cox: string | null; rowers: string[] } {
  const cox = classHasCox(c.badge) ? c.label : null;
  const rowers = c.rowers ?? (cox ? [] : c.label.split("/").map((n) => n.trim()).filter(Boolean));
  return { cox, rowers };
}

/* ── Who a rower on the sheet IS ────────────────────────────────────────── */

/** A rower of a crew: their roster id when it can be told, and the name the
    sheet wrote for them. */
export type RacePerson = { id: string | null; name: string };

const lastWordOf = (name: string) => {
  const words = name.trim().toLowerCase().split(/\s+/);
  return words[words.length - 1] ?? "";
};

/*
  THE SHEET WRITES SURNAMES, AND TWO ROWERS CAN SHARE ONE — the squad has two
  Cruz-Abrams, and every board that read a person by surname put the two of
  them on one line (owner, 2026-09-27: "surely you'll figure out the name
  issue"). So a name off the sheet is placed, in order, by:
    1. the seat in that session's lineup boat with that surname — the boat the
       crew was made from knows exactly who sat in it;
    2. the roster's full name ("Mason Cruz-Abrams");
    3. a first initial and the surname ("M Cruz-Abrams", "M. Cruz-Abrams");
    4. the roster's only rower with that surname.
  Only a name none of those can place stays a name — and a crew saved with its
  rowers' ids (every crew made from a lineup since this change) needs none of
  it.
*/
export function sheetPersonId(name: string, boat?: Boat): string | null {
  const whole = name.trim().toLowerCase();
  if (!whole) return null;
  const last = lastWordOf(whole);
  if (boat) {
    const inBoat = strokeFirst(boat).filter((id) => lastWordOf(rosterById[id]?.name ?? id) === last);
    if (inBoat.length === 1) return inBoat[0];
  }
  const rowers = roster.filter((a) => !a.cox);
  const one = (hits: typeof rowers) => (hits.length === 1 ? hits[0].id : null);
  const full = one(rowers.filter((a) => a.name.trim().toLowerCase() === whole));
  if (full) return full;
  const words = whole.split(/\s+/);
  if (words.length > 1) {
    const initial = words[0][0];
    const byInitial = one(
      rowers.filter((a) => lastWordOf(a.name) === last && a.name.trim().toLowerCase()[0] === initial),
    );
    if (byInitial) return byInitial;
  }
  return one(rowers.filter((a) => lastWordOf(a.name) === last));
}

/** The crew's rowers as people, stroke first (no cox — see crewMembers). */
export function crewPeople(crew: RaceCrew, boat?: Boat): RacePerson[] {
  const { rowers } = crewMembers(crew);
  const saved = crew.rowerIds && crew.rowers && crew.rowerIds.length === crew.rowers.length ? crew.rowerIds : null;
  return rowers.map((raw, i) => {
    const name = raw.trim();
    return { id: saved?.[i] ?? sheetPersonId(name, boat), name };
  });
}

/** One key per person: their roster id, or the name when nobody could be told. */
export const personKey = (p: RacePerson) => p.id ?? `name:${p.name}`;

/*
  A CREW AS IT WAS ROWED: its boat and the people in it. Two crews that share
  a boat but not their people are two crews (owner, 2026-09-22: "we count as a
  new boat the people that swapped") — which is what the Combined board adds
  up, so a boat that had somebody switched out of it is not summed with the
  boat it used to be. Without any rower on record it is just the boat.
*/
export function crewKey(crew: RaceCrew, boat?: Boat): string {
  const keys = crewPeople(crew, boat).map(personKey).sort();
  return keys.length ? `${crew.boatId}|${keys.join("+")}` : crew.boatId;
}

/*
  A SWITCH, READ OUT OF THE CREW'S NOTE. The timing sheet writes the seat
  switches beside a crew as "Switch Richards/Weldon and Cruz Abrams/Farkas";
  the board draws each pair on its own, in full, so a name is never cut off
  (owner, 2026-09-27: "make the switches red … write the whole switch … with
  the arrows"). Pairs are split on "and", commas, semicolons and "&"; each
  pair on its "/". Null for a note that is not a switch ("Bridge").
*/
export function switchPairs(note: string | null | undefined): [string, string][] | null {
  const m = (note ?? "").trim().match(/^switch(?:es|ed)?\b[\s:]*(.*)$/i);
  if (!m) return null;
  const pairs = m[1]
    .split(/\s*(?:,|;|&|\band\b)\s*/i)
    .map((part) => part.split("/").map((n) => n.trim()).filter(Boolean))
    .filter((p): p is [string, string] => p.length === 2);
  return pairs.length ? pairs : null;
}

/* ── The class a crew is ranked in ──────────────────────────────────────── */

/** "4+" → "4+", "2-" → "2−": the rigging's own symbol, the way a coach says
    it (owner, 2026-09-21: "instead of Coxed Fours we want 4+"). A badge no
    rigging knows is shown as itself. */
export function classTitle(badge: string): string {
  return boatTypes.find((k) => k.key === badge)?.symbol ?? badge;
}

/* The order classes are shown in: biggest boat first, as on a regatta card. */
const classOrder = (badge: string) => {
  const i = boatTypes.findIndex((k) => k.key === badge);
  return i === -1 ? boatTypes.length : i;
};

/** The crews in the order the board lists them — class by class, biggest boat
    first, each class in the sheet's own order — which is also the order the
    coach types them in. */
export function crewsInClassOrder(crews: RaceCrew[]): RaceCrew[] {
  return crews
    .map((crew, i) => ({ crew, i }))
    .sort((a, b) => classOrder(a.crew.badge) - classOrder(b.crew.badge) || a.i - b.i)
    .map((x) => x.crew);
}

/* ── One piece's board ──────────────────────────────────────────────────── */

export type PieceRow = {
  crew: RaceCrew;
  time: number;
  rank: number;
  /** Seconds behind the class winner; 0 for the winner. */
  toWinner: number;
  /** Seconds behind the crew one place up; null for the winner. */
  toAhead: number | null;
};

export type ClassBoard = {
  badge: string;
  title: string;
  rows: PieceRow[];
  /** Crews of this class with no time written yet. */
  pending: RaceCrew[];
};

export function pieceBoards(piece: RacePiece): ClassBoard[] {
  const by = new Map<string, RaceCrew[]>();
  for (const c of piece.crews) {
    if (!by.has(c.badge)) by.set(c.badge, []);
    by.get(c.badge)!.push(c);
  }
  return [...by.entries()]
    .sort(([a], [b]) => classOrder(a) - classOrder(b))
    .map(([badge, crews]) => {
      const timed = crews
        .map((crew) => ({ crew, time: crewTime(crew) }))
        .filter((x): x is { crew: RaceCrew; time: number } => x.time != null)
        .sort((a, b) => a.time - b.time);
      const rows: PieceRow[] = timed.map((x, i) => ({
        crew: x.crew,
        time: x.time,
        rank: i + 1,
        toWinner: Math.round((x.time - timed[0].time) * 100) / 100,
        toAhead: i === 0 ? null : Math.round((x.time - timed[i - 1].time) * 100) / 100,
      }));
      return {
        badge,
        title: classTitle(badge),
        rows,
        pending: crews.filter((c) => crewTime(c) == null),
      };
    });
}

/* ── The combined board ─────────────────────────────────────────────────── */

export type CombinedRow = {
  /** The crew as rowed (crewKey): the boat AND the people in it. */
  key: string;
  boatId: string;
  /** The crew, as it was written in the first piece it appears in. */
  crew: RaceCrew;
  label: string;
  /** Sum of the crew's margins to its class winner, over the pieces it has a time for. */
  margins: number;
  /** Per piece, in the day's order: the margin, or null where the crew has no time. */
  perPiece: (number | null)[];
  /** How many of the pieces the crew has a time for. */
  raced: number;
  rank: number;
};

export type CombinedBoard = { badge: string; title: string; rows: CombinedRow[] };

/*
  A crew's day is its margins added up. The order is by the SUM over crews
  that have a time for EVERY piece; a crew that missed a piece cannot be
  placed against those that did not, so it is listed after them, still with
  what it has, rather than being dropped or handed a zero for the miss.

  A CREW IS ITS BOAT AND ITS PEOPLE (crewKey): once somebody has been switched
  into a boat, that is a new crew, so it starts a row of its own instead of
  adding its margin to the crew it replaced.
*/
export function combinedBoards(pieces: RacePiece[]): CombinedBoard[] {
  const boards = pieces.map(pieceBoards);
  const classes = new Map<string, Map<string, CombinedRow>>();
  const blank = (key: string, crew: RaceCrew): CombinedRow => ({
    key,
    boatId: crew.boatId,
    crew: { ...crew, note: "" },
    label: crew.label,
    margins: 0,
    perPiece: Array(pieces.length).fill(null),
    raced: 0,
    rank: 0,
  });

  boards.forEach((classList, pi) => {
    for (const cb of classList) {
      if (!classes.has(cb.badge)) classes.set(cb.badge, new Map());
      const rows = classes.get(cb.badge)!;
      for (const r of cb.rows) {
        const key = crewKey(r.crew);
        let row = rows.get(key);
        if (!row) {
          row = blank(key, r.crew);
          rows.set(key, row);
        }
        row.perPiece[pi] = r.toWinner;
        row.margins = Math.round((row.margins + r.toWinner) * 100) / 100;
        row.raced++;
      }
      for (const c of cb.pending) {
        const key = crewKey(c);
        if (!rows.has(key)) rows.set(key, blank(key, c));
      }
    }
  });

  return [...classes.entries()]
    .sort(([a], [b]) => classOrder(a) - classOrder(b))
    .map(([badge, rows]) => {
      const list = [...rows.values()].sort(
        (a, b) => b.raced - a.raced || a.margins - b.margins || a.label.localeCompare(b.label),
      );
      list.forEach((r, i) => (r.rank = i + 1));
      return { badge, title: classTitle(badge), rows: list };
    });
}

/** How many crews across the day have a time, and how many crews there are. */
export function raceSummary(day: RaceDay): { pieces: number; crews: number } {
  const crews = new Set<string>();
  for (const p of day.pieces) for (const c of p.crews) crews.add(c.boatId);
  return { pieces: day.pieces.length, crews: crews.size };
}

