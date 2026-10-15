/*
  THE DOOR. The student side opens at a school on ONE morning, for everybody
  at once (owner, 2026-10-15: the two-step waitlist).

  Letting people in one at a time means each of them arrives to an empty
  campus. So until the school's `opensAt` (lib/themes.ts), a student who has
  signed up and finished onboarding waits on /opening, and Match fills up
  behind the door. At that moment the door opens by itself.

  WHO WALKS PAST IT EARLY: the rowers already on a team (they are the app's
  first real people, on Varsity now) and the owner's test inbox. Both are
  decided in components/useDoor.ts, which has the session and the team.

  The date is data on the school, so a second campus later is a line in
  lib/themes.ts and nothing here changes.
*/
import { getUniversity, universityTimezone } from "@/lib/themes";

/** When this school's student side opens, or null when it is already open to all. */
export function opensAtFor(universityKey: string): Date | null {
  const iso = getUniversity(universityKey)?.opensAt;
  if (!iso) return null;
  const at = new Date(iso);
  return Number.isNaN(at.getTime()) ? null : at;
}

/** Is the school open at `now`? A school with no day set is open. */
export function isSchoolOpen(universityKey: string, now: number = Date.now()): boolean {
  const at = opensAtFor(universityKey);
  return !at || now >= at.getTime();
}

/*
  "Monday 25 January", the app's own order for a date (lib/schedule.ts), with
  the year only when it is not this one. Read on the CAMPUS clock, so a phone
  in another timezone shows the same day the school opens on.
*/
export function openingDayLabel(universityKey: string): string | null {
  const at = opensAtFor(universityKey);
  if (!at) return null;
  const timeZone = universityTimezone(universityKey);
  // Built from parts: with a year in it, en-GB puts a comma after the weekday.
  const parts = (d: Date) =>
    Object.fromEntries(
      new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone })
        .formatToParts(d)
        .map((p) => [p.type, p.value]),
    );
  const p = parts(at);
  const day = `${p.weekday} ${p.day} ${p.month}`;
  return p.year === parts(new Date()).year ? day : `${day} ${p.year}`;
}
