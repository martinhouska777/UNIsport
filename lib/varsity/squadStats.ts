/*
  THE SQUAD'S TRAINING, MADE OF THE ATHLETES' OWN LOGS.
  ---------------------------------------------------------------------------
  The team statistics used to be the BOATS added up — the lineups the coach
  drew, with the kilometres a crew wrote on them. That answers one question
  ("how far did the boats go") and cannot answer any of the others, which is
  why the screen only ever had four cells on it and all four said "outing".
  A coach asked for the rest of it (owner, 2026-09-22):

    "I want the same statistics that make sense, just for the team, comprised
     of all of the statistics from the single athletes… average row, average
     time trained, how much you spend maybe on weights… let's say there was
     something prescribed and then they did more or less, so they want to see
     how each person trained."

  So the squad is now read the way ONE athlete is read: out of the training
  people logged. Same source, same arithmetic, same groups — what a rower sees
  about themselves, the coach sees about the average of them.

  THE AVERAGE IS OVER THE PEOPLE WHO TRAINED, never over the roster. A squad of
  twenty-four with sixteen who logged anything in the window did not train
  two-thirds of a session each; the eight who logged nothing are not a zero,
  they are an unknown, and an unknown must not be averaged in (owner: "the
  don't-knows won't be counted in that thing"). How many people the average IS
  over is the first number on the screen, so it is never read alone.

  Everything comes back as the same StatGroup / StatCell data the athlete's
  rowingReport returns, so the screen renders whatever this file decides to say
  and a new number here is a new number on the screen (rule 7).
*/
import type { LogEntry } from "./logStore";
import type { SessionMap } from "./coachPlan";
import { parseSessionKey } from "./coachPlan";
import { formatDistance, formatDuration, type Units } from "./units";
import { rowingCategories } from "./athleteProfile";
import type { Span } from "./athleteStats";
import type { StatCell, StatGroup } from "./rowingStats";

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const dash = "—";

const asDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/* A rest day is a note that nothing happened, so it is never a session. */
const isTraining = (l: LogEntry) => l.category !== "off";
const isRowed = (l: LogEntry) => rowingCategories.has(l.category ?? "");

/* The kinds of training that get their own "time on" cell, boat first — the
   same list, in the same order, as the athlete's own Time group. */
const TIME_CATEGORIES = ["water", "erg", "weights", "run", "bike", "other"] as const;
const TIME_LABEL: Record<(typeof TIME_CATEGORIES)[number], string> = {
  water: "Time on water",
  erg: "Time on erg",
  weights: "Weights",
  run: "Run",
  bike: "Bike",
  other: "Other",
};

/** One person's window, in raw numbers — the unit everything here averages. */
export type SquadPerson = {
  id: string;
  name: string;
  /** Rowed metres: the water and the erg together. */
  metres: number;
  water: number;
  erg: number;
  /** Minutes of training, every kind. */
  minutes: number;
  /** Minutes per category, so "Weights" can be an average of its own. */
  byCategory: Record<string, number>;
  /** Rowing sessions that wrote a distance — the denominator of "average row". */
  measured: number;
  metresMeasured: number;
  /** Distinct days with something logged on them. */
  daysTrained: number;
  /** The coach's plan, and what became of it. */
  planned: number;
  done: number;
  missed: number;
  extra: number;
};

/**
 * WHAT THE COACH PUT UP FOR THIS PERSON INSIDE THE WINDOW, and what became of
 * it. The same rules as the athlete's own screen, deliberately — the two must
 * never disagree about what was missed:
 *   - a rest slot is not a session
 *   - nothing still ahead of us counts, so a perfect fortnight read on Monday
 *     is not nine missed sessions
 *   - "extra" is training logged against no slot at all
 */
function planCounts(logs: LogEntry[], plan: SessionMap, span: Span) {
  const start = asDate(span.startIso);
  const end = asDate(span.endIso);
  const todayIso = toIso(new Date());
  const loggedKeys = new Set(logs.filter((l) => l.dayKey && isTraining(l)).map((l) => l.dayKey!));

  let planned = 0;
  let done = 0;
  for (const [key, session] of Object.entries(plan)) {
    if (session.category === "off") continue;
    const parsed = parseSessionKey(key);
    if (!parsed) continue;
    if (parsed.date < start || parsed.date > end) continue;
    const iso = toIso(parsed.date);
    if (iso > todayIso) continue;
    if (iso === todayIso && !loggedKeys.has(key)) continue;
    planned += 1;
    if (loggedKeys.has(key)) done += 1;
  }
  const extra = logs.filter((l) => isTraining(l) && !l.dayKey).length;
  return { planned, done, missed: Math.max(0, planned - done), extra };
}

/**
 * One row per person WHO LOGGED SOMETHING in the window.
 *
 * Anyone on the squad who logged nothing is left out entirely rather than
 * added as a zero: see the note at the top of this file.
 */
export function squadPeople(
  logsByAthlete: Record<string, LogEntry[]>,
  names: Record<string, string>,
  plan: SessionMap,
  span: Span,
): SquadPerson[] {
  const out: SquadPerson[] = [];
  for (const [id, all] of Object.entries(logsByAthlete)) {
    const inWindow = all.filter((l) => l.logDate >= span.startIso && l.logDate <= span.endIso);
    const training = inWindow.filter(isTraining);
    if (training.length === 0) continue;

    const rowed = training.filter(isRowed);
    const measured = rowed.filter((l) => (l.metres ?? 0) > 0);
    const byCategory: Record<string, number> = {};
    for (const l of training) {
      const k = l.category ?? "other";
      byCategory[k] = (byCategory[k] ?? 0) + (l.minutes ?? 0);
    }
    out.push({
      id,
      name: names[id] ?? "Unnamed",
      metres: sum(rowed.map((l) => l.metres ?? 0)),
      water: sum(rowed.filter((l) => l.category === "water").map((l) => l.metres ?? 0)),
      erg: sum(rowed.filter((l) => l.category === "erg").map((l) => l.metres ?? 0)),
      minutes: sum(training.map((l) => l.minutes ?? 0)),
      byCategory,
      measured: measured.length,
      metresMeasured: sum(measured.map((l) => l.metres ?? 0)),
      daysTrained: new Set(training.map((l) => l.logDate)).size,
      ...planCounts(inWindow, plan, span),
    });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/** The mean of a number across the people, or null when there is nobody. */
const per = (people: SquadPerson[], of: (p: SquadPerson) => number): number | null =>
  people.length ? sum(people.map(of)) / people.length : null;

/** How many weeks the window is, so "in a week" means something. */
const weeksIn = (span: Span): number => {
  const days =
    Math.round((asDate(span.endIso).getTime() - asDate(span.startIso).getTime()) / 86_400_000) + 1;
  return Math.max(1, days / 7);
};

/*
  WHAT THE WINDOW COMES TO. Four groups, in the athlete's own order — how many
  of us, how far, how long, how steady:

    The squad    — how many people this is the average of, and the whole
                   squad's distance and time, which is the one thing a coach
                   wants as a TOTAL rather than an average.
    Distance     — per person: the total, the water and the erg it is made of,
                   and the average row.
    Time         — per person: the total, an average week, and then how long
                   went on each thing. Weights is in here, which is the point.
    Consistency  — per person: days trained, and with a plan up what was put
                   up, what got done, what got missed and what was done on
                   top. Never "against the plan".

  A kind of training nobody did is left out rather than printing a dash at a
  coach, and the plan's four only appear when there is a plan over the window.
*/
export function squadReport(
  people: SquadPerson[],
  span: Span,
  units: Units,
  /** How many are on the squad at all, so the average says what it is over. */
  squadSize: number,
): StatGroup[] {
  if (people.length === 0) return [];
  const weeks = weeksIn(span);
  const km = (v: number | null) => (v == null ? dash : formatDistance(v, units.distance));
  const hrs = (v: number | null) => (v == null || v <= 0 ? dash : formatDuration(Math.round(v)));

  const totalMetres = sum(people.map((p) => p.metres));
  const totalMinutes = sum(people.map((p) => p.minutes));
  const measured = sum(people.map((p) => p.measured));
  const metresMeasured = sum(people.map((p) => p.metresMeasured));

  const groups: StatGroup[] = [
    {
      key: "squad",
      title: "The squad",
      cells: [
        {
          key: "people",
          label: "People logging",
          value: squadSize > 0 ? `${people.length} of ${squadSize}` : `${people.length}`,
        },
        { key: "allDistance", label: "Distance, everyone", value: km(totalMetres) },
        { key: "allTime", label: "Time, everyone", value: hrs(totalMinutes) },
      ],
    },
    {
      key: "distance",
      title: "Distance per person",
      cells: [
        { key: "total", label: "Total", value: km(per(people, (p) => p.metres)) },
        { key: "water", label: "On the water", value: km(per(people, (p) => p.water)) },
        { key: "erg", label: "On the erg", value: km(per(people, (p) => p.erg)) },
        /* THE AVERAGE ROW is over the sessions that wrote a distance, across
           the whole squad — not the average of each person's average, which
           would let somebody who rowed once weigh as much as somebody who
           rowed thirty times. */
        {
          key: "row",
          label: "Average row",
          value: measured > 0 ? formatDistance(metresMeasured / measured, units.distance) : dash,
        },
      ],
    },
  ];

  const timeCells: StatCell[] = [
    { key: "total", label: "Total", value: hrs(per(people, (p) => p.minutes)) },
    { key: "week", label: "In a week", value: hrs(per(people, (p) => p.minutes / weeks)) },
  ];
  for (const c of TIME_CATEGORIES) {
    const v = per(people, (p) => p.byCategory[c] ?? 0);
    if (v == null || v < 0.5) continue; // nobody did it — not a dash, just absent
    timeCells.push({ key: c, label: TIME_LABEL[c], value: hrs(v) });
  }
  groups.push({ key: "time", title: "Time per person", cells: timeCells });

  const planned = per(people, (p) => p.planned) ?? 0;
  const consistency: StatCell[] = [
    {
      key: "days",
      label: "Days trained",
      value: (per(people, (p) => p.daysTrained) ?? 0).toFixed(1),
    },
  ];
  if (planned > 0) {
    const done = per(people, (p) => p.done) ?? 0;
    const missed = per(people, (p) => p.missed) ?? 0;
    const extra = per(people, (p) => p.extra) ?? 0;
    consistency.push(
      { key: "planned", label: "Planned", value: planned.toFixed(1) },
      { key: "done", label: "Done", value: done.toFixed(1), tone: "success" },
      /* Missed is only coloured when there IS something missed: a squad that
         did everything should not be shown a warning-coloured zero. */
      {
        key: "missed",
        label: "Missed",
        value: missed.toFixed(1),
        tone: missed >= 0.05 ? "warn" : "muted",
      },
      { key: "extra", label: "On top", value: extra.toFixed(1) },
    );
  }
  groups.push({ key: "consistency", title: "Consistency per person", cells: consistency });

  return groups;
}

/** One person's line in the table at the foot: what they did, against the plan. */
export type SquadRow = {
  id: string;
  name: string;
  distance: string;
  time: string;
  /** "12/14", or a dash when nothing was planned for them in the window. */
  plan: string;
  /** How they stand against the plan, as a word the screen turns into a colour. */
  tone: "success" | "warn" | "muted";
  /** What the rows are ordered by. */
  sort: number;
};

/*
  THE PEOPLE, ONE ROW EACH (owner, 2026-09-22: "they want to see how each
  person trained… what actually happened compared to the plan").

  Ordered by distance, most first, because that is the column a coach runs
  their eye down. Somebody who did everything the plan asked is green;
  somebody short of it is warned; a person with nothing planned is neither.
*/
export function squadRows(people: SquadPerson[], units: Units): SquadRow[] {
  return people
    .map((p) => ({
      id: p.id,
      name: p.name,
      distance: p.metres > 0 ? formatDistance(p.metres, units.distance) : dash,
      time: p.minutes > 0 ? formatDuration(Math.round(p.minutes)) : dash,
      plan: p.planned > 0 ? `${p.done}/${p.planned}` : dash,
      tone: (p.planned === 0
        ? "muted"
        : p.done >= p.planned
          ? "success"
          : "warn") as SquadRow["tone"],
      sort: p.metres,
    }))
    .sort((a, b) => b.sort - a.sort || a.name.localeCompare(b.name));
}
