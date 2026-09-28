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
    • THE WINDOW is the team statistics' own Month and Semester, or two dates
      ("1. a month 2. semester 3. pick dates"), so "a month" is the same four
      weeks on both screens.
    • COACHES ONLY: it is drawn on the Coach Console's Workouts tab and
      nowhere a rower can open.

  Pure: the screen hands in what the Workouts tab has already read, and a new
  list here is a new list on the screen (rule 7).
*/
import type { Span } from "./athleteStats";
import { teamRanges, toIso, type TeamRange } from "./teamStats";
import { buildBoard, onTheWater, type TeamWorkout } from "./teamBoard";
import type { TeamResult } from "./resultsStore";

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

  const list = [...people.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  list.forEach((r, i) => (r.rank = i > 0 && r.points === list[i - 1].points ? list[i - 1].rank : i + 1));
  return list;
}

/** 1 → "1st", 2 → "2nd", 11 → "11th", 22 → "22nd". */
export function ordinal(n: number): string {
  const teen = n % 100 >= 11 && n % 100 <= 13;
  const suffix = teen ? "th" : n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th";
  return `${n}${suffix}`;
}
