/*
  THE COACH'S RANKINGS — who has been on top over a month, a semester, or two
  dates the coach picks.
  ---------------------------------------------------------------------------
  Asked for on 2026-09-27 ("for coaches we want to do some athletes ranking…
  based on wins"), and settled question by question the same night:

    • SEPARATE LISTS, never one score: an erg ranking, a water ranking, and
      consistency against the plan. Who pulls the fastest, whose boat wins and
      who does the work are different questions; one number made of all three
      would hide which one a rower is good at.
    • ERG: every RANKED erg test in the window hands out points by place —
      "the higher in ranking, the more points he gets. It's pretty easy like
      that." First of eighteen gets 18, each place down one less, last gets 1,
      and a rower's points add up over the window. A test somebody did not row
      gives them nothing: the list is over a stretch of time "because people
      can improve", and turning up is part of it.
    • WATER: the NUMBER OF WINS (the owner's pick over a win percentage) —
      every piece on a timing sheet where a class had two or more crews timed,
      a win for each rower in the crew that finished first — and beside it
      where their boat finished in every piece, "first, second, third, and
      fourth… I would do it in every piece". A place is within its class,
      "pairs, then fours, then fours plus, and 8 is just eight, which is
      different"; a better or worse boat is left for the coach to read off
      the names — "look at the names, and you just know the pattern. Later,
      we can specify."
    • CONSISTENCY, "against the plan: how much he logged and extra sessions…
      so coaches also know how consistent each one is" — the athlete's own
      count of planned sessions done (athleteStats.planSlots, the one count
      their Statistics use), the sessions logged on top, and the days they
      said they were out ("who was sick").
    • SEAT RACES (2026-10-01): read out of the race pieces — NOT a ranking:
      the people who seat raced, each with who they beat and who beat them,
      and by how many seconds. The old Seat races screen is gone; this is
      what its "Rowers" table was for.
    • THE WINDOW is the team statistics' own Month and Semester, or two dates
      ("1. a month 2. semester 3. pick dates"), so "a month" is the same four
      weeks on both screens.
    • COACHES ONLY: it is drawn on the Coach Console's Workouts tab and
      nowhere a rower can open.

  Pure: the screen hands in what the Workouts tab has already read, and a new
  list here is a new list on the screen (rule 7).
*/
import { planSlots, type Span } from "./athleteStats";
import { teamRanges, toIso, type TeamRange } from "./teamStats";
import { buildBoard, onTheWater, type TeamWorkout } from "./teamBoard";
import type { TeamResult } from "./resultsStore";
import { rosterById, type Boat } from "./coachLineup";
import { parseSessionKey, type SessionMap } from "./coachPlan";
import { crewPeople, personKey, pieceBoards, type RaceCrew, type RaceDay } from "./racePieces";
import { seatRacesOf, type SeatRaceDay } from "./raceSwitch";
import type { LogEntry } from "./logStore";

/* ── The lists ──────────────────────────────────────────────────────────── */

export type RankingList = "erg" | "water" | "consistency" | "seatraces";

/** The lists, in the owner's order: "erg rankings and water rankings",
    consistency as "a third list", and since 2026-10-01 the seat races, which
    used to be a screen of their own — every seat race, session by session,
    not a ranking (seatRaceSessions). */
export const rankingLists: { key: RankingList; label: string }[] = [
  { key: "erg", label: "Erg" },
  { key: "water", label: "Water" },
  { key: "consistency", label: "Consistency" },
  { key: "seatraces", label: "Seat races" },
];

/* ── The window ─────────────────────────────────────────────────────────── */

/** Month and Semester, the team statistics' own entries — "pick dates" is the
    third choice, made on the screen. It opens on the semester (owner,
    2026-10-01: "preset it for semester"). */
export const rankingRanges: TeamRange[] = teamRanges.filter((r) => r.key === "month" || r.key === "semester");
export const defaultRankingRange = "semester";

/** The window's first and last day: a built-in one counts back from today,
    today included; two dates the coach picked are their own window. */
export function rankingSpan(range: TeamRange, now: Date): Span {
  if (range.start && range.end) return { startIso: range.start, endIso: range.end };
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (range.days - 1));
  return { startIso: toIso(first), endIso: toIso(today) };
}

const within = (d: Date, span: Span) => {
  const iso = toIso(d);
  return iso >= span.startIso && iso <= span.endIso;
};

/* ── The erg ranking ────────────────────────────────────────────────────── */

/**
 * The tests it is made of: the team workouts the coach flagged RANKED, rowed
 * on an erg, inside the window — oldest first, the order they are read in
 * across the screen. An "Everyone" board lists people alphabetically and
 * ranks nobody, so it hands out no places; a flagged session on the water is
 * a boat's split, not an erg score.
 */
export function ergTests(workouts: TeamWorkout[], span: Span): TeamWorkout[] {
  return workouts
    .filter((w) => w.board === "ranked" && !onTheWater(w.session) && within(w.date, span))
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.period.localeCompare(b.period));
}

/** Where somebody finished one test, and out of how many placed on it. */
export type ErgPlace = { place: number; of: number };

export type ErgRankRow = {
  athleteId: string;
  name: string;
  points: number;
  /** Per test, in ergTests' order: their place, or null where they have none. */
  places: (ErgPlace | null)[];
  /** How many of the window's tests they have a place on. */
  tests: number;
  rank: number;
};

/**
 * Everybody who placed on at least one test, most points first.
 *
 * A test's places are its board's own — the same split order, the same rows
 * left unranked (a result the split can't be read from, a row rowed on
 * another machine), so the ranking can never disagree with the board a rower
 * opens. Nobody with no place is listed: they are an unknown, not a zero.
 * Equal points share a place (1, 2, 2, 4) — nothing here is a tie-break the
 * coach did not ask for.
 */
export function ergRanking(workouts: TeamWorkout[], results: TeamResult[], span: Span): ErgRankRow[] {
  const tests = ergTests(workouts, span);
  const byDay = new Map<string, TeamResult[]>();
  for (const r of results) {
    const list = byDay.get(r.dayKey);
    if (list) list.push(r);
    else byDay.set(r.dayKey, [r]);
  }

  const people = new Map<string, ErgRankRow>();
  tests.forEach((test, i) => {
    const placed = buildBoard(byDay.get(test.dayKey) ?? [], "ranked", "split", null).rows.filter(
      (row) => row.rank != null,
    );
    const of = placed.length;
    for (const row of placed) {
      const id = row.result.athleteId;
      let person = people.get(id);
      if (!person) {
        person = { athleteId: id, name: "", points: 0, places: Array(tests.length).fill(null), tests: 0, rank: 0 };
        people.set(id, person);
      }
      const place = row.rank!;
      person.places[i] = { place, of };
      person.points += of - place + 1;
      person.tests += 1;
      /* The name as they last logged it — the tests run oldest first, so a
         later one overwrites an older spelling. */
      if (row.result.athleteName) person.name = row.result.athleteName;
    }
  });

  return numberPlaces(
    [...people.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name)),
    (a, b) => a.points === b.points,
  );
}

/*
  EQUAL SCORES SHARE A PLACE (1, 2, 2, 4) — `same` says when two neighbours in
  the sorted list are level. Nothing here breaks a tie the coach did not ask
  to have broken.
*/
function numberPlaces<T extends { rank: number }>(list: T[], same: (a: T, b: T) => boolean): T[] {
  list.forEach((r, i) => (r.rank = i > 0 && same(r, list[i - 1]) ? list[i - 1].rank : i + 1));
  return list;
}

/* ── The water ranking ──────────────────────────────────────────────────── */

/** One piece that was a race, as a column: its name and its session. */
export type WaterPiece = { id: string; name: string; dayKey: string; date: Date; period: string };

/** Where a rower's boat finished one piece, out of how many in its class, and the class. */
export type WaterPlace = { place: number; of: number; badge: string };

export type WaterRankRow = {
  /** Who they are — their roster id, or the sheet's name when the roster
      cannot say (racePieces.personKey). Two rowers who share a surname are
      two rows. */
  key: string;
  /** Their full name off the roster, or the name as the sheet wrote it. */
  name: string;
  wins: number;
  /** Per piece, in waterRanking's order: where their boat finished, or null. */
  places: (WaterPlace | null)[];
  rank: number;
};

/**
 * Every rower who raced a piece in the window, most wins first, and the
 * pieces themselves, oldest first — so each rower can be read piece by piece,
 * "first, second, third, and fourth … in every piece" (owner, 2026-09-27).
 *
 * A piece counts in a class only when two or more of its crews have a time —
 * one boat is not a race (the race board's own rule) — and a piece with no
 * such class is not a column at all. A place is within the class of the boat
 * the rower sat in (a 1st in the pairs is not a 1st in the fours, so the
 * class goes with it); the crew with the fastest time wins, and so does any
 * crew level with it to the hundredth. No coxes: a cox carries whichever
 * boat they steer, so their wins would be the boat's, not theirs.
 *
 * People are WHO they are, not the surname the sheet wrote (crewPeople): the
 * crew's saved roster ids, or the seat in that session's lineup boat
 * (`boats`, session key → its boats), or the roster.
 */
export function waterRanking(
  races: RaceDay[],
  span: Span,
  boats: Record<string, Boat[]> = {},
): { rows: WaterRankRow[]; pieces: WaterPiece[] } {
  /* The races first, in the order they were rowed: every session in the
     window oldest first, its pieces in their own order. */
  const days = races
    .map((day) => ({ day, parsed: parseSessionKey(day.dayKey) }))
    .filter((d): d is { day: RaceDay; parsed: NonNullable<typeof d.parsed> } => !!d.parsed && within(d.parsed.date, span))
    .sort((a, b) => a.parsed.date.getTime() - b.parsed.date.getTime() || a.parsed.period.localeCompare(b.parsed.period));
  const raced: { piece: WaterPiece; boards: ReturnType<typeof pieceBoards> }[] = [];
  for (const { day, parsed } of days) {
    for (const piece of day.pieces) {
      const boards = pieceBoards(piece).filter((b) => b.rows.length >= 2);
      if (boards.length === 0) continue;
      raced.push({
        piece: { id: `${day.dayKey}:${piece.id}`, name: piece.name, dayKey: day.dayKey, date: parsed.date, period: parsed.period },
        boards,
      });
    }
  }

  const people = new Map<string, WaterRankRow>();
  raced.forEach(({ piece, boards }, col) => {
    for (const board of boards) {
      for (const row of board.rows) {
        // Level on time is level on place: 1 + the crews that were faster.
        const place = 1 + board.rows.filter((r) => r.time < row.time).length;
        const boat = (boats[piece.dayKey] ?? []).find((b) => b.id === row.crew.boatId);
        for (const who of crewPeople(row.crew, boat)) {
          if (!who.name && !who.id) continue;
          const key = personKey(who);
          let person = people.get(key);
          if (!person) {
            const name = (who.id && rosterById[who.id]?.name) || who.name;
            person = { key, name, wins: 0, places: Array(raced.length).fill(null), rank: 0 };
            people.set(key, person);
          }
          person.places[col] = { place, of: board.rows.length, badge: board.badge };
          if (place === 1) person.wins += 1;
        }
      }
    }
  });

  const rows = numberPlaces(
    [...people.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name)),
    (a, b) => a.wins === b.wins,
  );
  return { rows, pieces: raced.map((r) => r.piece) };
}

/* ── The seat races ─────────────────────────────────────────────────────── */

/**
 * THE SEAT RACES OF A STRETCH OF TIME, SESSION BY SESSION — NOT A RANKING.
 * Most of the squad never seat races, so there is nothing to rank them on
 * (owner, 2026-10-01). It was a list of the people who did, A to Z, with who
 * they beat; the owner then picked, from three drawn ways, every race listed
 * once under the session it was rowed in, the newest session first, so a tap
 * opens that session (raceSwitch.ts: seatRacesOf). A session with no seat
 * race in it is left out.
 */
export function seatRaceSessions(races: RaceDay[], span: Span, boats: Record<string, Boat[]> = {}): SeatRaceDay[] {
  return races
    .map((day) => ({ day, when: parseSessionKey(day.dayKey) }))
    .filter((x): x is { day: RaceDay; when: NonNullable<typeof x.when> } => !!x.when && within(x.when.date, span))
    .sort(
      (x, y) =>
        y.when.date.getTime() - x.when.date.getTime() || (x.when.period === y.when.period ? 0 : x.when.period === "PM" ? -1 : 1),
    )
    .map(({ day }) => ({
      dayKey: day.dayKey,
      races: seatRacesOf(day, (crew: RaceCrew) => (boats[day.dayKey] ?? []).find((b) => b.id === crew.boatId)),
    }))
    .filter((d) => d.races.length > 0);
}

/* ── Which session a column was ─────────────────────────────────────────── */

/** Anything that is a column of a list and came out of one session: an erg
    test, or one piece of a timing sheet. */
type SessionColumn = { dayKey: string; date: Date; period: string };

/** One session's columns side by side: its day, and how many columns it has. */
export type SessionRun = SessionColumn & { count: number };

/**
 * THE SESSIONS A LIST IS MADE OF (owner, 2026-09-28: "make sure that we know
 * which pieces we were doing somewhere on top, so I'm going to see which piece
 * it was"). Columns arrive oldest first with a session's pieces next to each
 * other, so each run of one day key is one session: the header puts ONE tag
 * over all of its pieces, with its day and what the plan called it.
 */
export function sessionRuns(columns: SessionColumn[]): SessionRun[] {
  const runs: SessionRun[] = [];
  for (const c of columns) {
    const last = runs[runs.length - 1];
    if (last && last.dayKey === c.dayKey) last.count += 1;
    else runs.push({ dayKey: c.dayKey, date: c.date, period: c.period, count: 1 });
  }
  return runs;
}

/*
  THE WORKOUT WITHOUT ITS REST, for a session's tag at the top of a list
  (owner, 2026-09-28: "for erg don't put the rest time there, then it fits").
  The tag is a column wide; "8×500m, 1:30 rest" broke into "8×500 / m, 1:3…",
  and the rest is the one part a coach does not need to tell two tests apart.
  So "8×500m, 1:30 rest" → "8×500m", "3×10' / 3' rest @ r24" → "3×10' @ r24",
  "6×1k (2' rest)" → "6×1k". Only a TIME followed by rest (or "rest" and a
  time) goes: "r20" is a rate and stays, "UT2 recovery paddle" stays. The
  board a tap on the tag opens still says the whole workout, rest included.
*/
const REST_AMOUNT = String.raw`(?<![A-Za-z\d.:])\d+(?:[:.]\d+)?\s*(?:'|′|"|″|secs?|seconds?|mins?|minutes?|s|m)?`;
const REST = new RegExp(
  String.raw`\s*(?:[,;/+–—-]|\bw\/|\bwith\b)?\s*\(?\s*(?:${REST_AMOUNT}\s*(?:of\s+)?(?:rest|rec|recovery)\b|\brest\b\s*[:=]?\s*(?:${REST_AMOUNT})?|\b(?:rec|recovery)\s*[:=]?\s*${REST_AMOUNT})(?:\s+between(?:\s+\w+)?)?\s*\)?`,
  "gi",
);
export function withoutRest(words: string): string {
  const out = words
    .replace(REST, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,;])/g, "$1")
    .replace(/^[\s,;/+–—-]+|[\s,;/+–—-]+$/g, "");
  return out || words;
}

/* ── The consistency ranking ────────────────────────────────────────────── */

export type ConsistencyRow = {
  id: string;
  name: string;
  /** Sessions the plan put up in the window (up to today), and how many of them they logged. */
  planned: number;
  done: number;
  /** Training logged against no session of the plan. */
  extra: number;
  /** Days they marked themselves sick, injured or away. */
  out: number;
  /** Done out of planned, as a whole percentage; null when nothing was planned. */
  share: number | null;
  rank: number;
};

/**
 * EVERYBODY ON THE SQUAD, not only the people who logged something — the
 * one place that is deliberately so. An average must leave out somebody who
 * logged nothing (they are an unknown, not a zero), but a coach reading "how
 * consistent is each one" is asking about exactly that person.
 *
 * Highest share of the plan first; level on that, more sessions on top first
 * — the owner named the extra sessions as part of it. Days out are shown, not
 * forgiven: whether a sick day should come off the plan is the owner's call.
 */
export function consistencyRanking(
  people: { id: string; name: string }[],
  logsByAthlete: Record<string, LogEntry[]>,
  plan: SessionMap,
  span: Span,
  outDays: Record<string, number>,
): ConsistencyRow[] {
  const rows: ConsistencyRow[] = people.map((p) => {
    const logs = (logsByAthlete[p.id] ?? []).filter((l) => l.logDate >= span.startIso && l.logDate <= span.endIso);
    const slots = planSlots(logs, plan, span);
    const planned = slots.keys.length;
    return {
      id: p.id,
      name: p.name,
      planned,
      done: slots.done,
      extra: logs.filter((l) => l.category !== "off" && !l.dayKey).length,
      out: outDays[p.id] ?? 0,
      share: planned ? Math.min(100, Math.round((slots.done / planned) * 100)) : null,
      rank: 0,
    };
  });
  const share = (r: ConsistencyRow) => r.share ?? -1;
  return numberPlaces(
    rows.sort((a, b) => share(b) - share(a) || b.extra - a.extra || a.name.localeCompare(b.name)),
    (a, b) => share(a) === share(b) && a.extra === b.extra,
  );
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}
