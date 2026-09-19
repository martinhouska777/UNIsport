/*
  WHAT A BOAT DID — the kilometres and the working time of one crew.
  ---------------------------------------------------------------------------
  The plan is written for the whole squad ("16k steady"), but the water is not:
  one eight turns at the bridge and does 14, the four carries on and does 17.
  So the figure is recorded on the BOAT (lib/varsity/coachLineup → Boat.metres /
  Boat.minutes) and it counts for every person seated in it. That is the whole
  answer to "why did he finish the term on 110k and I finished on 100k".

  This file is only the reading and writing of those two numbers: turning what
  somebody typed into metres and minutes, and turning them back into something
  a rower would say out loud. Adding them up across a squad is boatMileage.ts.

  Both numbers honour the reader's own km/mi setting on the way in and on the
  way out (lib/varsity/units); what is stored is always metric.
*/
import type { Boat } from "./coachLineup";
import {
  distanceToMetres,
  formatDistance,
  formatDuration,
  metresToUnit,
  type DistanceUnit,
  type Units,
} from "./units";

/* ── Distance ─────────────────────────────────────────────────────────────── */

/*
  WHAT SOMEBODY TYPED, IN METRES. A crew writes "16", or "16k", or "14,5" on a
  Czech keyboard — all three mean the same outing. An empty field is not zero:
  it is "nobody has said yet", which is why this returns null rather than 0 and
  why a boat with no number is left out of an average instead of dragging it
  down. Anything that is not a number at all also comes back null, so a stray
  keystroke can never be saved as a distance.
*/
export function parseDistanceField(text: string, unit: DistanceUnit): number | null {
  const cleaned = text.trim().toLowerCase().replace(",", ".");
  if (!cleaned) return null;
  // "16k" / "16 km" / "16km" — the k is how it is said, not a second unit.
  const m = cleaned.match(/^(\d+(?:\.\d+)?)\s*(?:k|km|mi|m)?$/);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(distanceToMetres(value, unit));
}

/** The stored metres back in the field's own unit: 16000 → "16", 14500 → "14.5". */
export function distanceFieldValue(metres: number | null | undefined, unit: DistanceUnit): string {
  if (!metres) return "";
  const v = metresToUnit(metres, unit);
  return String(Number(v.toFixed(2)));
}

/* ── Time ─────────────────────────────────────────────────────────────────── */

/*
  HOW LONG THE CREW WORKED, in minutes. A rower says it three ways — "90",
  "1:30", "1h30" — and all three are accepted, because being made to convert
  your own outing into the app's preferred notation on a wet phone is how a
  figure ends up not being entered at all.
*/
export function parseMinutesField(text: string): number | null {
  const cleaned = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!cleaned) return null;
  // "1:30" / "1h30" / "1h30m" / "1h"
  const split = cleaned.match(/^(\d+)(?::|h)(\d{1,2})?m?$/);
  if (split) {
    const mins = Number(split[1]) * 60 + Number(split[2] ?? 0);
    return mins > 0 ? mins : null;
  }
  // plain minutes: "90" or "90m"
  const plain = cleaned.match(/^(\d+(?:\.\d+)?)m?$/);
  if (!plain) return null;
  const value = Math.round(Number(plain[1]));
  return value > 0 ? value : null;
}

/** Minutes back in the field: 45 → "45", 90 → "1:30". */
export function minutesFieldValue(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes < 60) return String(minutes);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

/* ── Both, as one line ────────────────────────────────────────────────────── */

/*
  "16 km · 1h 30m" — and whichever half is missing is simply not written, so a
  crew who only knows how far they went is not asked to invent a time. Null when
  neither has been filled in: the strip's header then says nothing at all rather
  than showing a pair of dashes under every boat on the screen.
*/
export function boatWorkSummary(boat: Boat, units: Units): string | null {
  const bits: string[] = [];
  if (boat.metres) bits.push(formatDistance(boat.metres, units.distance));
  if (boat.minutes) bits.push(formatDuration(boat.minutes));
  return bits.length ? bits.join(" · ") : null;
}

/** Has anyone said what this boat did? */
export const hasBoatWork = (boat: Boat): boolean => !!(boat.metres || boat.minutes);
