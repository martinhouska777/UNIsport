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
      a win for each rower in the crew that finished first. The classes are
      kept apart, "pairs, then fours, then fours plus, and 8 is just eight,
      which is different"; a better or worse boat is left for the coach to
      read off the names — "look at the names, and you just know the pattern.
      Later, we can specify."
    • CONSISTENCY, "against the plan: how much he logged and extra sessions…
      so coaches also know how consistent each one is" — the athlete's own
      count of planned sessions done (athleteStats.planSlots, the one count
      their Statistics use), the sessions logged on top, and the days they
      said they were out ("who was sick").
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
import { boatTypes, roster } from "./coachLineup";
import { parseSessionKey, type SessionMap } from "./coachPlan";
import { classTitle, crewMembers, pieceBoards, type RaceDay } from "./racePieces";
import type { LogEntry } from "./logStore";

/* ── The lists ──────────────────────────────────────────────────────────── */

export type RankingList = "erg" | "water" | "consistency";

/** The three lists, in the owner's order: "erg rankings and water rankings",
    and consistency as "a third list". */
export const rankingLists: { key: RankingList; label: string }[] = [
  { key: "erg", label: "Erg" },
  { key: "water", label: "Water" },
  { key: "consistency", label: "Consistency" },
];

/* ── The window ─────────────────────────────────────────────────────────── */

/** Month and Semester, the team statistics' own entries — "pick dates" is the
    third choice, made on the screen. */
export const rankingRanges: TeamRange[] = teamRanges.filter((r) => r.key === "month" || r.key === "semester");
export const defaultRankingRange = "month";

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

export type WaterClass = { badge: string; title: string };

export type WaterRankRow = {
  /** As the timing sheet wrote them — their surname — which is how they are
      matched from piece to piece, as on the race board's Athletes tab. */
  key: string;
  /** The roster's full name when exactly one rower has that surname. */
  name: string;
  wins: number;
  raced: number;
  /** Per class badge: the pieces won and raced in it. */
  byClass: Record<string, { wins: number; raced: number }>;
  rank: number;
};

/* Biggest boat first, as on a regatta card — the race board's order. */
const classOrder = (badge: string) => {
  const i = boatTypes.findIndex((k) => k.key === badge);
  return i === -1 ? boatTypes.length : i;
};

const lastWord = (name: string) => {
  const words = name.trim().split(/\s+/);
  return words[words.length - 1] ?? "";
};

/** A surname off the sheet, as the full name of the one rower who has it. */
function fullName(surname: string): string {
  const s = surname.trim().toLowerCase();
  const matches = roster.filter((a) => !a.cox && lastWord(a.name).toLowerCase() === s);
  return matches.length === 1 ? matches[0].name : surname;
}

/**
 * Every rower who raced a piece in the window, most wins first, and the
 * classes those pieces were in (biggest boat first).
 *
 * A piece counts in a class only when two or more of its crews have a time —
 * one boat is not a race (the race board's own rule). The crew with the
 * fastest time wins it, and so does any crew level with it to the hundredth.
 * No coxes, as on the race board's Athletes tab: a cox carries whichever boat
 * they steer, so their wins would be the boat's, not theirs.
 */
export function waterRanking(races: RaceDay[], span: Span): { rows: WaterRankRow[]; classes: WaterClass[] } {
  const people = new Map<string, WaterRankRow>();
  const seen = new Set<string>();
  for (const day of races) {
    const date = parseSessionKey(day.dayKey)?.date;
    if (!date || !within(date, span)) continue;
    for (const piece of day.pieces) {
      for (const board of pieceBoards(piece)) {
        if (board.rows.length < 2) continue;
        seen.add(board.badge);
        const best = board.rows[0].time;
        for (const row of board.rows) {
          const won = row.time === best;
          for (const raw of crewMembers(row.crew).rowers) {
            const key = raw.trim();
            if (!key) continue;
            let person = people.get(key);
            if (!person) {
              person = { key, name: fullName(key), wins: 0, raced: 0, byClass: {}, rank: 0 };
              people.set(key, person);
            }
            const cls = (person.byClass[board.badge] ??= { wins: 0, raced: 0 });
            cls.raced += 1;
            person.raced += 1;
            if (won) {
              cls.wins += 1;
              person.wins += 1;
            }
          }
        }
      }
    }
  }
  const rows = numberPlaces(
    [...people.values()].sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name)),
    (a, b) => a.wins === b.wins,
  );
  const classes = [...seen]
    .sort((a, b) => classOrder(a) - classOrder(b))
    .map((badge) => ({ badge, title: classTitle(badge) }));
  return { rows, classes };
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
