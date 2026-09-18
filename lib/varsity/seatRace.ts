/*
  SEAT RACES — modelled on how a coach keeps them in a spreadsheet, but for
  any school and any squad: one practice's LINEUP races a piece, the coach switches a rower
  between two boats, they race again, switch again … for as many pieces as
  the session has.

  A race is stored as: that practice's boats as they pushed off (taken from
  the lineup, never made up here), then one entry per piece — every boat's
  time, and the switches made AFTER that piece. Who sits where in piece N is
  worked out by replaying the switches, so fixing a switch fixes every piece
  after it. Results are never stored either: a switch between boats X and Y
  is won by whoever made their new boat gain on the other one.

  COACH ONLY (owner, 2026-09-18). Kept in this browser's localStorage for now.
*/
import { rosterById } from "./coachLineup";

export type RaceBoat = {
  name: string; // what the sheet calls the boat: coach's name, else the cox / stroke
  badge: string; // the rigging's key, "4+"
  seats: (string | null)[]; // bow → stroke
  coxId: string | null;
};

/* A switch: the two rowers trade boats (and seats) before the next piece. */
export type SwapPair = [string, string];

export type Piece = {
  times: (number | null)[]; // seconds, per boat
  swaps: SwapPair[]; // made after this piece
};

export type SeatRace = {
  id: string;
  date: string; // "2026-09-18"
  period: "AM" | "PM";
  piece: string; // "1500 m"
  boats: RaceBoat[];
  pieces: Piece[];
};

/* ── Times ── */

/** "4:23.6" → 263.6, "72.5" → 72.5, "0:04:23.6" → 263.6. Anything else is null. */
export function parseTime(s: string): number | null {
  const parts = s.trim().replace(",", ".").split(":");
  if (!parts[0] || parts.length > 3) return null;
  let total = 0;
  for (let i = 0; i < parts.length; i++) {
    if (!/^\d+(\.\d+)?$/.test(parts[i])) return null;
    const n = Number(parts[i]);
    if (i > 0 && n >= 60) return null;
    if (i < parts.length - 1 && parts[i].includes(".")) return null;
    total = total * 60 + n;
  }
  return total;
}

/** 263.6 → "4:23.6" */
export function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  const ss = s.toFixed(1).padStart(4, "0");
  return m ? `${m}:${ss}` : ss;
}

export const nameOf = (id: string | null) => (id && rosterById[id]?.name) || "—";
/** The sheet writes surnames: "Dykema", "Tallec-Botos", "Van Dijk" — everything after the first name. */
export const surname = (id: string | null) => {
  const parts = nameOf(id).split(" ");
  return parts.length > 1 ? parts.slice(1).join(" ") : parts[0];
};

/* ── Crews, piece by piece ── */

/** Every boat's seats in piece `k`: the lineup with the switches of pieces 0…k-1 played in. */
export function crewsAt(r: SeatRace, k: number): (string | null)[][] {
  const crews = r.boats.map((b) => [...b.seats]);
  for (let p = 0; p < k && p < r.pieces.length; p++)
    for (const [a, b] of r.pieces[p].swaps) {
      const ia = crews.findIndex((c) => c.includes(a));
      const ib = crews.findIndex((c) => c.includes(b));
      if (ia < 0 || ib < 0) continue;
      const sa = crews[ia].indexOf(a);
      const sb = crews[ib].indexOf(b);
      crews[ia][sa] = b;
      crews[ib][sb] = a;
    }
  return crews;
}

/** Which boat `id` rows in during piece `k`, or -1. */
export const boatAt = (r: SeatRace, k: number, id: string) => crewsAt(r, k).findIndex((c) => c.includes(id));

/** The rowers who switched boats just before piece `k` — the red ones. */
export const swappedInto = (r: SeatRace, k: number): Set<string> =>
  new Set(k > 0 ? (r.pieces[k - 1]?.swaps ?? []).flat() : []);

/** Boat i's lead over boat j in piece k, seconds (negative = j was ahead). */
export function lead(r: SeatRace, k: number, i: number, j: number): number | null {
  const ti = r.pieces[k]?.times[i];
  const tj = r.pieces[k]?.times[j];
  return ti != null && tj != null ? Math.round((tj - ti) * 10) / 10 : null;
}

/*
  WHO WON THE PIECE, on time. Boats only race boats of their own rigging (the
  fours against the fours, the eights against the eights), so each rigging is
  ranked on its own. Per boat: its place (1 = won) and seconds behind the
  winner; null for a boat with no time yet.
*/
export function placesAt(r: SeatRace, k: number): ({ place: number; behind: number } | null)[] {
  const times = r.pieces[k]?.times ?? [];
  return r.boats.map((b, i) => {
    const t = times[i];
    if (t == null) return null;
    const field = r.boats
      .map((o, j) => (o.badge === b.badge ? times[j] : null))
      .filter((x): x is number => x != null);
    if (field.length < 2) return null;
    const best = Math.min(...field);
    return { place: field.filter((x) => x < t).length + 1, behind: Math.round((t - best) * 10) / 10 };
  });
}

/* ── Results ── */

export type SwapResult = {
  piece: number; // the switch was made after this piece (0-based)
  pair: SwapPair;
  winner: string | null; // null = dead heat, or not raced yet
  loser: string | null;
  by: number | null; // seconds; null until both pieces have times
};

/*
  pair[0] rows piece k in boat i and piece k+1 in boat j; pair[1] the other
  way round. If boat i's lead over j SHRANK once pair[0] left it, pair[0] was
  the faster of the two — by exactly how much it shrank.
*/
export function swapResults(r: SeatRace): SwapResult[] {
  const out: SwapResult[] = [];
  r.pieces.forEach((pc, k) =>
    pc.swaps.forEach((pair) => {
      const i = boatAt(r, k, pair[0]);
      const j = boatAt(r, k, pair[1]);
      const before = lead(r, k, i, j);
      const after = k + 1 < r.pieces.length ? lead(r, k + 1, i, j) : null;
      if (before == null || after == null) return out.push({ piece: k, pair, winner: null, loser: null, by: null });
      const swing = Math.round((before - after) * 10) / 10;
      if (swing === 0) return out.push({ piece: k, pair, winner: null, loser: null, by: 0 });
      out.push(
        swing > 0
          ? { piece: k, pair, winner: pair[0], loser: pair[1], by: swing }
          : { piece: k, pair, winner: pair[1], loser: pair[0], by: -swing },
      );
    }),
  );
  return out;
}

/* Won / lost per rower, most wins first. */
export function standings(races: SeatRace[]): { id: string; won: number; lost: number }[] {
  const t: Record<string, { won: number; lost: number }> = {};
  for (const r of races)
    for (const res of swapResults(r)) {
      if (!res.winner || !res.loser) continue;
      (t[res.winner] ??= { won: 0, lost: 0 }).won++;
      (t[res.loser] ??= { won: 0, lost: 0 }).lost++;
    }
  return Object.entries(t)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.won - a.won || a.lost - b.lost || nameOf(a.id).localeCompare(nameOf(b.id)));
}

/* ── Store (localStorage) ── */
const KEY = "varsitySeatRaces";

/* Races saved by the first two versions (two fixed pieces, made-up boats) have
   no `pieces`; they are dropped rather than guessed at. */
export function loadSeatRaces(): SeatRace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SeatRace[]).filter((r) => Array.isArray(r.pieces)) : [];
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
