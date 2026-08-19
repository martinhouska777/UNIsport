/*
  ONE ATHLETE'S TRAINING, AS A WORKED EXAMPLE.
  ---------------------------------------------------------------------------
  A coach who opens a rower from the squad sees an empty screen until that
  rower has actually logged sessions and posted erg results — which, on a squad
  that has just signed up, is nobody. So when the database has nothing for an
  athlete, the coach's screen shows THIS instead, clearly labelled: the month
  they trained, and the ergs they pulled.

  Nothing new is invented here. Both halves are re-used from data that already
  exists and that the rest of Varsity Mode already shows:
    • the month comes from teamTraining.ts — the same derived month the squad
      roster already shows in an athlete's profile sheet;
    • the erg results come from demoWorkouts.ts — the same worked example the
      Workouts board falls back to, filtered to this one athlete, so a fast
      rower is fast here and on the board and their numbers agree.

  WHICH athlete: accounts are not linked to the (still mock) roster yet, so we
  match on NAME, exactly as lineupStore.ts does for "your seat" — which works
  for anyone who is both a real account and on the roster (John Brown, the demo
  account, is one). No match → no example, and the screen says "nothing yet".

  IT NEVER MASKS REAL DATA. Each half falls back on its own and only when that
  half is completely empty: the moment a rower logs a session that month, their
  real month is what the coach sees.
*/
import { roster } from "./coachLineup";
import { rngFor } from "./teamProfiles";
import { teamTrainingMonth } from "./teamTraining";
import { demoTeamPlan } from "./demoWorkouts";
import { logCategoryLabel } from "./athleteProfile";
import { toISO } from "./coachPlan";
import type { LogEntry } from "./logStore";
import type { TeamResult } from "./resultsStore";

/*
  What a session of each kind gets called. Real logs carry the coach's own
  wording, so the example has to carry wording of the same shape — "Erg
  session" everywhere would read as filler. Data (rule 7): edit the lists.
*/
const titles: Record<string, string[]> = {
  erg: ["3×25' UT2", "30' r20", "4×10' UT1", "8×500m, 1:30 rest", "5×1500m"],
  water: ["70' steady state", "4×12' UT1", "Technical paddle", "6×750m", "90' UT2"],
  weights: ["Main strength — squat, pull, press", "Circuits", "Core + auxiliary"],
  run: ["Easy 5k", "Steady run", "Hills"],
  bike: ["Steady spin", "Bike intervals"],
  flex: ["Stretch + mobility", "Yoga"],
};
const titleFor = (cat: string, r: number): string => {
  const list = titles[cat];
  if (!list) return logCategoryLabel[cat] ?? cat;
  return list[Math.floor(r * list.length) % list.length];
};

/** The roster athlete of that name, or null. Case- and space-insensitive. */
const norm = (s: string) => s.trim().toLowerCase();
export function rosterIdForName(name: string | null | undefined): string | null {
  if (!name?.trim()) return null;
  const me = norm(name);
  return roster.find((a) => norm(a.name) === me)?.id ?? null;
}

/*
  One derived month as LOG ENTRIES — the shape the coach's calendar reads, so
  the screen itself needs no special case beyond "is this real or the example".
*/
export function demoAthleteLogs(rosterId: string, y: number, m: number): LogEntry[] {
  const month = teamTrainingMonth(rosterId, y, m);
  const r = rngFor(rosterId, `titles${y}-${m}`);
  const out: LogEntry[] = [];
  for (const day of month.days) {
    const iso = toISO(new Date(y, m, day.day));
    day.sessions.forEach((s, i) => {
      out.push({
        id: `demo-${rosterId}-${iso}-${i}`,
        logDate: iso,
        period: i === 0 ? "AM" : "PM",
        dayKey: null,
        source: s.extra ? "extra" : "plan",
        title: titleFor(s.cat, r()),
        category: s.cat,
        minutes: s.minutes,
        metres: s.metres,
        split: s.split,
        note: "",
      });
    });
  }
  return out;
}

/*
  Every erg this athlete pulled in the worked example, newest first. Built once
  for the whole squad (that is how the pieces line up against each other) and
  then filtered — so it is cached rather than rebuilt per athlete.
*/
let allResults: TeamResult[] | null = null;
export function demoAthleteResults(rosterId: string): TeamResult[] {
  allResults ??= demoTeamPlan().results;
  return allResults
    .filter((x) => x.athleteId === rosterId)
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey));
}
