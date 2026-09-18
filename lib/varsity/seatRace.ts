/*
  SEAT RACES — two boats, one rower from each swaps between two pieces, and
  the change in the margin is who won.

  A race is stored whole: the rigging, the two crews as they started, the two
  swapped rowers, and the four times the coach typed. The result is never
  stored — it is worked out from the times every time it is shown, so a
  corrected time corrects the result.

  COACH ONLY (owner, 2026-09-18): athletes do not see seat races yet.
  Kept in this browser's localStorage for now — no database table yet.
*/
import { rosterById } from "./coachLineup";

export type RaceBoat = { seats: (string | null)[]; coxId: string | null };

export type SeatRace = {
  id: string;
  date: string; // "2026-09-18"
  badge: string; // the rigging's key, "4+"
  piece: string; // what was raced, "1500 m" — free text
  boats: [RaceBoat, RaceBoat]; // A, B as they pushed off
  /* The two who swap: `swap[0]` starts in boat A, `swap[1]` in boat B. */
  swap: [string, string];
  /* Seconds per boat, piece 1 then piece 2 (after the swap). */
  times: [[number | null, number | null], [number | null, number | null]];
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

/* ── The result ── */

/** Boat A's lead over boat B in one piece (negative = B was ahead). */
export function margin(p: [number | null, number | null]): number | null {
  return p[0] != null && p[1] != null ? p[1] - p[0] : null;
}

export type RaceResult = {
  winner: string | null; // null = dead heat
  loser: string | null;
  by: number; // seconds, ≥ 0
};

/*
  The swing. In piece 1 swap[0] sits in A; in piece 2 in B. Whatever A lost
  of its lead between the two pieces went with swap[0] — so a positive swing
  means swap[0] beat swap[1] by that much.
*/
export function raceResult(r: SeatRace): RaceResult | null {
  const m1 = margin(r.times[0]);
  const m2 = margin(r.times[1]);
  if (m1 == null || m2 == null) return null;
  const swing = Math.round((m1 - m2) * 10) / 10;
  if (swing === 0) return { winner: null, loser: null, by: 0 };
  return swing > 0
    ? { winner: r.swap[0], loser: r.swap[1], by: swing }
    : { winner: r.swap[1], loser: r.swap[0], by: -swing };
}

export const nameOf = (id: string | null) => (id && rosterById[id]?.name) || "—";

/* Won / lost per rower, most wins first. */
export function standings(races: SeatRace[]): { id: string; won: number; lost: number }[] {
  const t: Record<string, { won: number; lost: number }> = {};
  for (const r of races) {
    const res = raceResult(r);
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

export function loadSeatRaces(): SeatRace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SeatRace[]) : [];
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
