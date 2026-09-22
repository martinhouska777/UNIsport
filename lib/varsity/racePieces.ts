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
  a crew's, and every seat in it can find it. Times are kept in SECONDS with
  hundredths; the watch's "25:14.48" is only how they are typed and shown.
*/
import { boatTypes, rosterById, type Boat } from "./coachLineup";

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
  /** Off the running watch, in seconds. Null: not written yet. */
  start: number | null;
  finish: number | null;
  /** The overall time typed straight in, when there is no watch reading. */
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

/** The rowers' surnames, stroke first, as the sheet lists a crew. */
export function crewRowers(boat: Boat): string[] {
  return [...boat.seats]
    .reverse()
    .map((s) => surname(s.athleteId))
    .filter((n): n is string => !!n);
}

export function crewFromBoat(boat: Boat): RaceCrew {
  return {
    boatId: boat.id,
    label: crewLabel(boat),
    badge: boat.badge,
    rowers: crewRowers(boat),
    start: null,
    finish: null,
    total: null,
    note: "",
  };
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
  boatId: string;
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
*/
export function combinedBoards(pieces: RacePiece[]): CombinedBoard[] {
  const boards = pieces.map(pieceBoards);
  const classes = new Map<string, Map<string, CombinedRow>>();

  boards.forEach((classList, pi) => {
    for (const cb of classList) {
      if (!classes.has(cb.badge)) classes.set(cb.badge, new Map());
      const rows = classes.get(cb.badge)!;
      const seen = new Set<string>();
      for (const r of cb.rows) {
        let row = rows.get(r.crew.boatId);
        if (!row) {
          row = { boatId: r.crew.boatId, label: r.crew.label, margins: 0, perPiece: Array(pieces.length).fill(null), raced: 0, rank: 0 };
          rows.set(r.crew.boatId, row);
        }
        row.perPiece[pi] = r.toWinner;
        row.margins = Math.round((row.margins + r.toWinner) * 100) / 100;
        row.raced++;
        seen.add(r.crew.boatId);
      }
      for (const c of cb.pending) {
        if (!rows.has(c.boatId)) {
          rows.set(c.boatId, { boatId: c.boatId, label: c.label, margins: 0, perPiece: Array(pieces.length).fill(null), raced: 0, rank: 0 });
        }
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

/* ── The athletes' board ────────────────────────────────────────────────── */

export type AthleteRow = {
  name: string;
  /** Sat as the cox, not a rower. */
  cox: boolean;
  /** Per piece, in the day's order: the margin of the boat this person sat
      in to its class winner; null where they did not row (or it has no time). */
  perPiece: (number | null)[];
  /** Per piece: who they sat with — the cox of a coxed boat (the stroke, on
      the cox's own row), the other rower(s) of a coxless one. Null: no boat. */
  with: (string | null)[];
  /** The average of the margins over the pieces they have one for. */
  average: number;
  raced: number;
  rank: number;
};

/*
  THE SAME DAY, READ BY PERSON — and, like every other board here, SPLIT BY
  CLASS (owner, 2026-09-21: "you want to sort them out, which athletes were
  in a pair and which athletes were in a four"). Crews are reshuffled between
  pieces — the pairs on the sheet most of all — so a crew's board cannot say
  how a ROWER did. This one can: for every person who sat in a boat of a
  class, the margin that boat carried to its class winner in each piece, who
  they sat with, and the AVERAGE of those margins (owner's choice,
  2026-09-21: "how each person finished"). A margin in a pair and a margin in
  a four are gaps to different winners, so they are never averaged together:
  someone who rowed both appears on BOTH boards, with a dash on the pieces
  they spent in the other boat. Smallest average on top; a person who missed
  a piece of their class is listed after those who rowed them all, with what
  they have. Nothing is excluded and nothing is judged — a "Bridge" still
  counts; the coach knows what it means. Selection proper (seat racing) is a
  different screen.
  People are matched by the surname the sheet wrote; two rowers who share
  one would merge here.
*/
export type AthleteBoard = { badge: string; title: string; rows: AthleteRow[] };

export function athleteBoards(pieces: RacePiece[]): AthleteBoard[] {
  const boards = pieces.map(pieceBoards);
  const classes = new Map<string, Map<string, AthleteRow>>();
  const rowFor = (badge: string, name: string, cox: boolean) => {
    if (!classes.has(badge)) classes.set(badge, new Map());
    const people = classes.get(badge)!;
    let r = people.get(name);
    if (!r) {
      r = { name, cox, perPiece: Array(pieces.length).fill(null), with: Array(pieces.length).fill(null), average: 0, raced: 0, rank: 0 };
      people.set(name, r);
    }
    return r;
  };

  boards.forEach((classList, pi) => {
    for (const cb of classList) {
      for (const { crew, toWinner } of cb.rows) {
        const { cox, rowers } = crewMembers(crew);
        for (const n of rowers) {
          const r = rowFor(cb.badge, n, false);
          r.perPiece[pi] = toWinner;
          r.with[pi] = cox ?? rowers.filter((x) => x !== n).join("/") ?? null;
        }
        if (cox) {
          const r = rowFor(cb.badge, cox, true);
          r.perPiece[pi] = toWinner;
          r.with[pi] = rowers[0] ?? null;
        }
      }
    }
  });

  return [...classes.entries()]
    .sort(([a], [b]) => classOrder(a) - classOrder(b))
    .map(([badge, people]) => {
      const list = [...people.values()];
      for (const r of list) {
        const have = r.perPiece.filter((m): m is number => m != null);
        r.raced = have.length;
        r.average = have.length ? Math.round((have.reduce((a, b) => a + b, 0) / have.length) * 100) / 100 : 0;
      }
      list.sort((a, b) => b.raced - a.raced || a.average - b.average || a.name.localeCompare(b.name));
      list.forEach((r, i) => (r.rank = i + 1));
      return { badge, title: classTitle(badge), rows: list };
    });
}
