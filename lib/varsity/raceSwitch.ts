/*
  SWITCHES — SEAT RACING, BUILT INTO THE RACE PIECES.
  ---------------------------------------------------------------------------
  A seat race is a race piece where, between two pieces, a rower in one boat
  changes places with a rower in another, and the coach reads from the times
  who made their boat faster (owner, 2026-10-01: "build the swap into workouts
  and remove seat races and make it smart"). It used to be a screen of its own
  that wanted the same times typed a second time; now it is the race day.

  HOW IT IS KEPT. Nothing new is stored. Every piece already holds its crews
  AS ROWED (racePieces.ts: RaceCrew.rowers / rowerIds), so a switch is simply
  two names exchanged in a piece — and in every piece after it, because a
  rower stays where they were put until somebody moves them. WHO SWITCHED is
  never typed in: it is read back out by laying a piece beside the one before
  it. That is also how the squad's own timing sheets were already written —
  the crews listed under each piece, "Switch Dykema/HK" noted beside one.

  HOW IT IS SCORED. Boats are only compared with boats of their own class.
  For boats X and Y that traded rowers between piece k and k+1:

      gap(k)   = how far X was ahead of Y in piece k          (Y's time − X's)
      gap(k+1) = the same, once the rowers had changed places
      swing    = gap(k+1) − gap(k)

  If X got MORE ahead after the change, the rower(s) who came into X are
  faster than the ones who left it — by the swing. The conditions of the
  water cancel out, because both boats met them in both pieces. That is
  the owner's own way of reading it (the sheet's "X > Y 2.6 s").

  WHEN IT REFUSES TO SCORE, and says so rather than inventing a number:
    • a time is missing in either piece          → pending
    • X or Y changed in any other way as well (a third boat took a rower,
      somebody new came in, somebody left)       → mixed
  Two or more rowers traded between the same two boats at once ARE scored,
  as one result for the two groups — the times cannot tell them apart.
*/
import {
  classHasCox,
  crewPeople,
  crewTime,
  personKey,
  type RaceCrew,
  type RaceDay,
  type RacePiece,
} from "./racePieces";
import type { Boat } from "./coachLineup";

/** The lineup boat behind a crew, where there is one — it tells two rowers
    who share a surname apart (crewPeople). */
export type BoatOf = (crew: RaceCrew) => Boat | undefined;

/** One rower of a crew: who they are, and what the sheet calls them. */
export type Folk = { key: string; id: string | null; name: string };

/** A crew's rowers, stroke first, each with their key. */
export function folkOf(crew: RaceCrew, boat?: Boat): Folk[] {
  return crewPeople(crew, boat).map((p) => ({ key: personKey(p), id: p.id, name: p.name }));
}

/* ── Changing places ────────────────────────────────────────────────────── */

/** A place in a piece: which crew, and which rower of it (stroke first, 0-based). */
export type Seat = { boatId: string; index: number };

/* A crew with its rowers replaced. A coxless crew the sheet names by its
   rowers ("Dykema/HK") is renamed with them; one with a name of its own
   ("Scott") or a cox keeps it. The ids are kept only while every rower has one. */
function reseat(crew: RaceCrew, people: Folk[]): RaceCrew {
  const was = folkOf(crew).map((f) => f.name);
  const names = people.map((p) => p.name);
  const named = !classHasCox(crew.badge) && crew.label === was.join("/");
  return {
    ...crew,
    rowers: names,
    rowerIds: people.every((p) => p.id) ? people.map((p) => p.id as string) : undefined,
    label: named ? names.join("/") : crew.label,
  };
}

/**
 * Two rowers change places in piece `k` — and in every later piece in which
 * they are still where they were, the same way a coach carries it on the
 * water. Moving them again undoes it (they are in each other's old crews).
 *
 * Null when it cannot be done: no such crews, the same crew, boats of
 * different classes (their times cannot be compared), or the same rower twice.
 */
export function switchRowers(day: RaceDay, k: number, a: Seat, b: Seat): RaceDay | null {
  const piece = day.pieces[k];
  if (!piece) return null;
  const ca = piece.crews.find((c) => c.boatId === a.boatId);
  const cb = piece.crews.find((c) => c.boatId === b.boatId);
  if (!ca || !cb || ca.boatId === cb.boatId || ca.badge !== cb.badge) return null;
  const pa = folkOf(ca)[a.index];
  const pb = folkOf(cb)[b.index];
  if (!pa || !pb || pa.key === pb.key) return null;

  let carrying = true;
  const pieces = day.pieces.map((p, j) => {
    if (j < k || (j > k && !carrying)) return p;
    const xa = p.crews.find((c) => c.boatId === a.boatId);
    const xb = p.crews.find((c) => c.boatId === b.boatId);
    const fa = xa ? folkOf(xa) : [];
    const fb = xb ? folkOf(xb) : [];
    // In the piece being edited the seats were tapped; later on they are found.
    const ia = j === k ? a.index : fa.findIndex((f) => f.key === pa.key);
    const ib = j === k ? b.index : fb.findIndex((f) => f.key === pb.key);
    if (!xa || !xb || ia < 0 || ib < 0) {
      // Somebody was already moved (or the crew is gone): the carrying stops here.
      carrying = false;
      return p;
    }
    const na = [...fa];
    const nb = [...fb];
    na[ia] = fb[ib];
    nb[ib] = fa[ia];
    return { ...p, crews: p.crews.map((c) => (c === xa ? reseat(c, na) : c === xb ? reseat(c, nb) : c)) };
  });
  return { ...day, pieces };
}

/* ── Reading the switches back out of the crews ─────────────────────────── */

export type SwitchResult =
  /** `winners` came into the boat that gained; `by` is the swing, in seconds. */
  | { kind: "won"; winners: Folk[]; losers: Folk[]; by: number }
  | { kind: "level" }
  /** A time is missing in one of the two pieces. */
  | { kind: "pending" }
  /** Those boats changed in some other way too, so the times cannot say. */
  | { kind: "mixed" };

export type Switch = {
  /** The piece they rowed BEFORE the switch (0-based); it went into piece + 1. */
  piece: number;
  badge: string;
  /** The two boats, and what the sheet calls their crews in `piece`. */
  boats: [string, string];
  crews: [string, string];
  /** Who left the first boat for the second, and who left the second for the first. */
  moved: [Folk[], Folk[]];
  /** The first boat's lead over the second, in seconds (negative: behind),
      before the switch and after it; null where a time is missing. */
  lead: { before: number | null; after: number | null };
  result: SwitchResult;
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const same = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((x) => b.has(x));

/** Where every rower of a piece sits: key → their boat and who they are. */
function placed(piece: RacePiece, boatOf?: BoatOf) {
  const m = new Map<string, { boatId: string; who: Folk }>();
  for (const c of piece.crews) for (const who of folkOf(c, boatOf?.(c))) m.set(who.key, { boatId: c.boatId, who });
  return m;
}

/**
 * Every switch of the day, in the order it happened: rowers who changed boats
 * between one piece and the next, matched up two boats at a time (somebody who
 * left A for B, and somebody who left B for A), each with its result.
 * A rower who simply is not in the next piece, or is new in it, is a change of
 * crew and not a switch; so is a rotation through three boats — they show as
 * switched-in (switchedIn) but have no result to give.
 */
export function switchesOf(day: RaceDay, boatOf?: BoatOf): Switch[] {
  const out: Switch[] = [];
  for (let k = 0; k + 1 < day.pieces.length; k++) {
    const before = day.pieces[k];
    const after = day.pieces[k + 1];
    const was = placed(before, boatOf);
    const now = placed(after, boatOf);

    // flows: from boat → to boat → the rowers who made that move.
    const flows = new Map<string, Map<string, Folk[]>>();
    for (const [key, w] of was) {
      const to = now.get(key)?.boatId;
      if (!to || to === w.boatId) continue;
      const row = flows.get(w.boatId) ?? new Map<string, Folk[]>();
      row.set(to, [...(row.get(to) ?? []), w.who]);
      flows.set(w.boatId, row);
    }
    // Which other boats each boat exchanged with — a clean switch has exactly one.
    const partners = new Map<string, Set<string>>();
    const meet = (x: string, y: string) => {
      const set = partners.get(x) ?? new Set<string>();
      partners.set(x, set.add(y));
    };
    for (const [from, row] of flows) {
      for (const to of row.keys()) {
        meet(from, to);
        meet(to, from);
      }
    }

    for (const [x, row] of flows) {
      for (const [y, left] of row) {
        const back = flows.get(y)?.get(x);
        if (!back || x >= y) continue; // unpaired, or this pair was already taken from the other side
        const cx0 = before.crews.find((c) => c.boatId === x);
        const cy0 = before.crews.find((c) => c.boatId === y);
        const cx1 = after.crews.find((c) => c.boatId === x);
        const cy1 = after.crews.find((c) => c.boatId === y);
        if (!cx0 || !cy0 || !cx1 || !cy1) continue;

        const t = [crewTime(cx0), crewTime(cy0), crewTime(cx1), crewTime(cy1)];
        const gapBefore = t[0] != null && t[1] != null ? round2(t[1] - t[0]) : null;
        const gapAfter = t[2] != null && t[3] != null ? round2(t[3] - t[2]) : null;

        // Clean: same class, no other boat involved, and nothing else changed in either crew.
        const keysOf = (c: RaceCrew) => new Set(folkOf(c, boatOf?.(c)).map((f) => f.key));
        const gone = (who: Folk[]) => new Set(who.map((f) => f.key));
        const expect = (c: RaceCrew, out: Folk[], inn: Folk[]) =>
          new Set([...keysOf(c)].filter((key) => !gone(out).has(key)).concat(inn.map((f) => f.key)));
        const clean =
          cx0.badge === cy0.badge &&
          partners.get(x)?.size === 1 &&
          partners.get(y)?.size === 1 &&
          same(keysOf(cx1), expect(cx0, left, back)) &&
          same(keysOf(cy1), expect(cy0, back, left));

        let result: SwitchResult;
        if (!clean) result = { kind: "mixed" };
        else if (gapBefore == null || gapAfter == null) result = { kind: "pending" };
        else {
          const swing = round2(gapAfter - gapBefore);
          // X pulled further ahead once `back` had come into it, so `back` is the faster.
          result =
            swing === 0
              ? { kind: "level" }
              : swing > 0
                ? { kind: "won", winners: back, losers: left, by: swing }
                : { kind: "won", winners: left, losers: back, by: -swing };
        }
        out.push({
          piece: k,
          badge: cx0.badge,
          boats: [x, y],
          crews: [cx0.label, cy0.label],
          moved: [left, back],
          lead: { before: gapBefore, after: gapAfter },
          result,
        });
      }
    }
  }
  return out;
}

/** The rowers of piece `k` who sat in another boat in the piece before it —
    the ones to draw in red. Nobody for the first piece. */
export function switchedIn(day: RaceDay, k: number, boatOf?: BoatOf): Set<string> {
  const red = new Set<string>();
  if (k < 1 || !day.pieces[k]) return red;
  const was = placed(day.pieces[k - 1], boatOf);
  for (const [key, w] of placed(day.pieces[k], boatOf)) {
    const before = was.get(key);
    if (before && before.boatId !== w.boatId) red.add(key);
  }
  return red;
}

/* ── Words ──────────────────────────────────────────────────────────────── */

/** "1.1", "2.6", "0.45" — seconds, no more places than the times have. */
export const secs = (n: number) => String(round2(Math.abs(n)));

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Names for a group of rowers. Two who share a name are told apart by their
    full roster name, where there is one. */
export function folkNames(who: Folk[], others: Folk[], fullName: (id: string) => string | undefined): string {
  const clash = new Set(others.map((o) => norm(o.name)));
  return who
    .map((f) => (clash.has(norm(f.name)) && f.id ? (fullName(f.id) ?? f.name) : f.name))
    .join(" + ");
}

/** The same two names, as the typed notes spell them, for matching a note to a switch. */
export const nameKey = norm;
