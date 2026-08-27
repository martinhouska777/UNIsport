/*
  HOW BUSY IT USUALLY IS — the answer for the 99% of moments when nobody has
  filed a live report.

  "How busy right now?" was crowd-sourced and nothing else, so with a few
  hundred users it read "No recent reports" almost always. A prediction fills
  that silence: every gym can say something honest about a Tuesday at six.

  THE HONESTY RULE. This is a TYPICAL WEEK, not a measurement, and the app says
  so in the wording — "Usually busy", never "Busy". A live report (under two
  hours old, lib/gymSocial) always wins and switches the wording to "Busy ·
  reported 12 min ago". The buttons on the gym page therefore stop being the
  only source of data and become the correction.

  The shape of the day is DATA and lives right here (rule 7): two curves, one
  for the big athletic centres and one for the house gyms, each with a weekday
  and a weekend version. Twenty-four numbers, 0–3, hour by hour. They are a
  campus's ordinary rhythm — quiet mornings, a lunch bump, the after-class peak,
  house gyms filling up late — written to be argued with and edited, not
  measured. When real check-ins exist they replace this file wholesale.
*/
import type { GymKind } from "@/lib/gyms";
import { CROWD_LEVELS, type CrowdLevel } from "@/lib/gymSocial";

/* 0 = quiet, 1 = moderate, 2 = busy, 3 = packed. Index = hour of the day. */
type DayCurve = readonly number[];

const MAIN_WEEKDAY: DayCurve = [
  //12a 1  2  3  4  5  6a 7  8  9 10 11 12p 1  2  3  4  5p 6  7  8  9 10 11
  0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 2, 3, 3, 2, 2, 1, 1, 0,
];
const MAIN_WEEKEND: DayCurve = [
  0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 1, 1, 1, 2, 2, 1, 1, 1, 0, 0,
];
/* House gyms are one room. They are empty by day and fill up after dinner. */
const HOUSE_WEEKDAY: DayCurve = [
  0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 1, 2, 2, 2, 3, 3, 2, 1,
];
const HOUSE_WEEKEND: DayCurve = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 1,
];

const curve = (kind: GymKind, weekday: number): DayCurve => {
  const weekend = weekday === 0 || weekday === 6;
  if (kind === "house") return weekend ? HOUSE_WEEKEND : HOUSE_WEEKDAY;
  return weekend ? MAIN_WEEKEND : MAIN_WEEKDAY;
};

/** What a gym of this kind is usually like at this hour. */
export function predictedLevel(kind: GymKind, weekday: number, hour: number): CrowdLevel {
  const value = curve(kind, weekday)[((hour % 24) + 24) % 24] ?? 0;
  return CROWD_LEVELS[Math.max(0, Math.min(CROWD_LEVELS.length - 1, value))].key;
}

/** "Usually quiet" / "Usually busy" — the wording that keeps a guess a guess. */
export function predictedLabel(level: CrowdLevel): string {
  const meta = CROWD_LEVELS.find((c) => c.key === level) ?? CROWD_LEVELS[0];
  return `Usually ${meta.label.toLowerCase()}`;
}

export type BusyHour = { hour: number; level: CrowdLevel; label: string; height: number };

/*
  The next few hours as a little bar row: how full the place usually is at 6, at
  7, at 8. `height` is a fraction (0–1) so the caller can draw it however it
  likes without knowing the scale — the quietest hour still gets a visible stub
  rather than nothing, because a missing bar reads as missing data.
*/
export function nextHours(kind: GymKind, weekday: number, fromHour: number, count = 6): BusyHour[] {
  const out: BusyHour[] = [];
  for (let i = 0; i < count; i++) {
    const hour = (fromHour + i) % 24;
    // Past midnight the curve belongs to the next day.
    const day = (weekday + Math.floor((fromHour + i) / 24)) % 7;
    const value = curve(kind, day)[hour] ?? 0;
    const level = predictedLevel(kind, day, hour);
    out.push({
      hour,
      level,
      label: hour === 0 ? "12a" : hour === 12 ? "12p" : hour < 12 ? `${hour}a` : `${hour - 12}p`,
      height: 0.18 + (value / 3) * 0.82,
    });
  }
  return out;
}
