/*
  WHO TRAINED, AND HOW MUCH — a week of boats added up per person.
  ---------------------------------------------------------------------------
  Every boat carries what it actually did (Boat.metres / Boat.minutes — see
  boatWork.ts), and a boat's figure counts for every seat in it. So one rower
  ends the term on 110k and their team-mate on 100: not because either trained
  differently, but because one of them was in the eight that went past the
  bridge. That is the whole point of counting it this way, and it is the answer
  a coach cannot get from a training plan — the plan says what was asked for,
  these are the boats that went out.

  THE COX COUNTS. They were in the boat for every one of those kilometres, and
  a squad that leaves its coxswains out of the mileage is telling them they
  weren't there.

  A boat with no figures written on it adds nothing and is not counted as an
  outing — it is "nobody has said yet", not a zero, and a zero would drag an
  average down for a morning that may well have been the longest of the week.
*/
import { rosterById, type Boat } from "./coachLineup";
import { sessionKey, type Period } from "./coachPlan";

/* ── The week ─────────────────────────────────────────────────────────────── */

/* MONDAY. A training week starts on Monday in every boathouse this app will
   see, and Sunday-first weeks are a calendar convention, not a squad's. */
export function weekStart(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const back = (d.getDay() + 6) % 7; // Sun(0) → 6, Mon(1) → 0
  d.setDate(d.getDate() - back);
  return d;
}

export function weekDays(start: Date): Date[] {
  return Array.from(
    { length: 7 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  );
}

/** Every practice key in a week — seven days, morning and afternoon. */
export function weekDayKeys(start: Date): string[] {
  const out: string[] = [];
  for (const d of weekDays(start)) {
    for (const p of ["AM", "PM"] as Period[]) out.push(sessionKey(d, p));
  }
  return out;
}

const MO = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "15–21 Sep", or "29 Sep – 5 Oct" when the week straddles two months. */
export function weekRangeLabel(start: Date): string {
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  return sameMonth
    ? `${start.getDate()}–${end.getDate()} ${MO[end.getMonth()]}`
    : `${start.getDate()} ${MO[start.getMonth()]} – ${end.getDate()} ${MO[end.getMonth()]}`;
}

/* ── Adding it up ─────────────────────────────────────────────────────────── */

export type PersonMileage = {
  id: string;
  name: string;
  cox: boolean;
  metres: number;
  minutes: number;
  /** How many boats they were in that had figures written on them. */
  outings: number;
};

export type Mileage = {
  /** Everyone who was in a boat that week, furthest first. */
  people: PersonMileage[];
  /** The squad's own total: every person's kilometres added together. */
  metres: number;
  /** Person-minutes — eight rowers out for an hour is eight hours of training. */
  minutes: number;
  /** How many boats went out with figures on them. */
  boats: number;
  /** Boats that went out with nothing written on them yet. */
  unfilled: number;
};

/*
  A week of practices → one row per person. `lineups` is what
  lineupStore.fetchLineupsFor returned: practice key → that practice's boats.
  Nothing here cares which day a boat was on; the caller chose the days.
*/
export function mileageFrom(lineups: Record<string, Boat[]>): Mileage {
  const by = new Map<string, PersonMileage>();
  let metres = 0;
  let minutes = 0;
  let boats = 0;
  let unfilled = 0;

  const add = (id: string | null) => {
    if (!id) return;
    const known = rosterById[id];
    if (!by.has(id)) {
      by.set(id, {
        id,
        // A seat filled by somebody who has since left the roster still rowed
        // the kilometres; it is shown as the id rather than dropped in silence.
        name: known?.name ?? id,
        cox: !!known?.cox,
        metres: 0,
        minutes: 0,
        outings: 0,
      });
    }
    return by.get(id)!;
  };

  for (const boatList of Object.values(lineups)) {
    for (const boat of boatList) {
      const m = boat.metres ?? 0;
      const mins = boat.minutes ?? 0;
      const seated = [...boat.seats.map((s) => s.athleteId), boat.hasCox ? boat.coxId : null].filter(
        (id): id is string => !!id,
      );
      if (!m && !mins) {
        // An empty boat is not an outing anybody forgot to fill in.
        if (seated.length) unfilled++;
        continue;
      }
      if (!seated.length) continue; // figures on a boat with nobody in it
      boats++;
      for (const id of seated) {
        const row = add(id);
        if (!row) continue;
        row.metres += m;
        row.minutes += mins;
        row.outings++;
        metres += m;
        minutes += mins;
      }
    }
  }

  const people = [...by.values()].sort(
    (a, b) => b.metres - a.metres || b.minutes - a.minutes || a.name.localeCompare(b.name),
  );
  return { people, metres, minutes, boats, unfilled };
}

/*
  THE AVERAGE PERSON'S WEEK — how far, and how long. Over the people who were
  actually in a boat, never over the whole roster: a squad of fifty with
  fourteen on the water is not a squad averaging a fifth of an outing each, and
  dividing by the roster would say exactly that.
*/
export const averageMetres = (m: Mileage): number =>
  m.people.length ? m.metres / m.people.length : 0;
export const averageMinutes = (m: Mileage): number =>
  m.people.length ? m.minutes / m.people.length : 0;
