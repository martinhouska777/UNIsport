/*
  SEAT RACES — boats race a piece, pairs of rowers swap boats, they race it
  again, and the change in the margin between each pair's two boats is who won.

  A race is stored whole: its boats as they pushed off (any number, often
  imported from that day's lineup), the swap pairs, and every boat's time in
  both pieces. Results are never stored — they are worked out from the times
  every time they are shown, so a corrected time corrects the result.

  COACH ONLY (owner, 2026-09-18): athletes do not see seat races yet.
  Kept in this browser's localStorage for now — no database table yet.
*/
import { rosterById } from "./coachLineup";

export type RaceBoat = {
  name: string; // "Resolute", or "" for an unnamed boat
  badge: string; // the rigging's key, "4+"
  seats: (string | null)[]; // bow → stroke
  coxId: string | null;
  hasCox: boolean;
};

/* One swap: `[0]` starts in one boat, `[1]` in another; they trade for piece 2. */
export type SwapPair = [string, string];

export type SeatRace = {
  id: string;
  date: string; // "2026-09-18"
  piece: string; // what was raced, "1500 m" — free text
  boats: RaceBoat[];
  swaps: SwapPair[];
  /* Seconds: times[piece][boat]. Piece 0 as they started, piece 1 after the swaps. */
  times: (number | null)[][];
};

/* ── Times ── */

/** "5:12.4" → 312.4, "72.5" → 72.5. Anything else is null. */
export function parseTime(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const m = /^(?:(\d+):)?(\d+(?:[.,]\d+)?)$/.exec(t);
  if (!m) return null;
  const sec = Number(m[2].replace(",", "."));
  if (m[1] && sec >= 60) return null;
  return (m[1] ? Number(m[1]) * 60 : 0) + sec;
}

/** 312.4 → "5:12.4" */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  const ss = s.toFixed(1).padStart(4, "0");
  return m ? `${m}:${ss}` : ss;
}

/** The boat's letter: A, B, C … */
export const boatLetter = (i: number) => String.fromCharCode(65 + i);

/** Which boat someone started in, or -1. */
export function boatOf(r: SeatRace, id: string): number {
  return r.boats.findIndex((b) => b.seats.includes(id) || b.coxId === id);
}

/* ── The result ── */

export type PairResult = {
  pair: SwapPair;
  winner: string | null; // null = dead heat
  loser: string | null;
  by: number; // seconds, ≥ 0
};

/*
  The swing. In piece 1 pair[0] sits in boat i and pair[1] in boat j; in
  piece 2 they have traded. Whatever boat i lost of its lead over boat j
  between the pieces went with pair[0] — so a positive swing means pair[0]
  beat pair[1] by that much. Null until all four times are in.
*/
export function pairResult(r: SeatRace, pair: SwapPair): PairResult | null {
  const i = boatOf(r, pair[0]);
  const j = boatOf(r, pair[1]);
  if (i < 0 || j < 0) return null;
  const t = (p: number, b: number) => r.times[p]?.[b] ?? null;
  const [a1, b1, a2, b2] = [t(0, i), t(0, j), t(1, i), t(1, j)];
  if (a1 == null || b1 == null || a2 == null || b2 == null) return null;
  const swing = Math.round((b1 - a1 - (b2 - a2)) * 10) / 10;
  if (swing === 0) return { pair, winner: null, loser: null, by: 0 };
  return swing > 0
    ? { pair, winner: pair[0], loser: pair[1], by: swing }
    : { pair, winner: pair[1], loser: pair[0], by: -swing };
}

export const nameOf = (id: string | null) => (id && rosterById[id]?.name) || "—";

/* Won / lost per rower, most wins first. */
export function standings(races: SeatRace[]): { id: string; won: number; lost: number }[] {
  const t: Record<string, { won: number; lost: number }> = {};
  for (const r of races)
    for (const p of r.swaps) {
      const res = pairResult(r, p);
      if (!res?.winner || !res.loser) continue;
      (t[res.winner] ??= { won: 0, lost: 0 }).won++;
      (t[res.loser] ??= { won: 0, lost: 0 }).lost++;
    }
  return Object.entries(t)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.won - a.won || a.lost - b.lost || nameOf(a.id).localeCompare(nameOf(b.id)));
}

/* ── Store (localStorage) ── */
const KEY = "varsitySeatRaces";

/* The first version held exactly two boats (`badge` + `swap`); read it as the new shape. */
type OldRace = {
  id: string;
  date: string;
  badge: string;
  piece: string;
  boats: { seats: (string | null)[]; coxId: string | null }[];
  swap: SwapPair;
  times: (number | null)[][];
};
function normalise(x: SeatRace | OldRace): SeatRace {
  if (!("swap" in x)) return x;
  return {
    id: x.id,
    date: x.date,
    piece: x.piece,
    boats: x.boats.map((b) => ({ name: "", badge: x.badge, seats: b.seats, coxId: b.coxId, hasCox: b.coxId != null })),
    swaps: x.swap[0] && x.swap[1] ? [x.swap] : [],
    times: x.times,
  };
}

export function loadSeatRaces(): SeatRace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as (SeatRace | OldRace)[]).map(normalise) : [];
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  } catch {
    return [];
  }
}

function saveAll(list: SeatRace[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* full or blocked storage must not break the screen */
  }
}

export function saveSeatRace(r: SeatRace): SeatRace[] {
  const list = loadSeatRaces().filter((x) => x.id !== r.id);
  list.push(r);
  saveAll(list);
  return loadSeatRaces();
}

export function deleteSeatRace(id: string): SeatRace[] {
  saveAll(loadSeatRaces().filter((x) => x.id !== id));
  return loadSeatRaces();
}
