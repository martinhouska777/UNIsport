/*
  ERG MATH — the arithmetic every erg board needs, in one place.
  ---------------------------------------------------------------------------
  A rower's result can arrive in several shapes: a photo scan might give a split
  and no watts, a typed log might give time and distance and no split at all.
  Everything here converts between those shapes so a board can rank people who
  entered their piece differently.

  The watts formula is Concept2's own:  watts = 2.80 / pace³  (pace = seconds
  per metre). Re-expressed for a 500 m split in seconds it is 350,000,000 / s³ —
  a 2:00 split is 202.5 W and a 1:45 is 302.3 W, which is what the C2 chart
  says. It is not an approximation; it is the definition the monitor uses.

  Pure functions only — no React, no data fetching, so the numbers can never
  disagree between two screens that both need them.
*/

/* ── Clocks ──────────────────────────────────────────────────────────────── */

// "1:52.3" | "6:08" | "1:08:00" | "112.3" → seconds. null when unreadable.
export function clockToSec(clock: string | null | undefined): number | null {
  if (!clock) return null;
  const parts = clock.trim().split(":");
  if (parts.some((p) => p === "" || !/^\d+(\.\d+)?$/.test(p))) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n))) return null;
  // ss | m:ss | h:mm:ss
  const sec =
    nums.length === 1 ? nums[0]
    : nums.length === 2 ? nums[0] * 60 + nums[1]
    : nums.length === 3 ? nums[0] * 3600 + nums[1] * 60 + nums[2]
    : NaN;
  return Number.isFinite(sec) ? sec : null;
}

/*
  112.3 → "1:52.3". Whole seconds show as "1:52" so a typed-by-hand split
  doesn't grow a fake ".0" of precision — EXCEPT with alwaysTenths, which a
  ranked column wants: "1:30" sitting between "1:29.9" and "1:30.2" reads as a
  rounder, less precise number than its neighbours when it isn't one.
*/
export function secToSplit(sec: number, alwaysTenths = false): string {
  const tenths = Math.round(sec * 10);
  const m = Math.floor(tenths / 600);
  const s = (tenths % 600) / 10;
  const whole = Math.floor(s);
  const frac = tenths % 10;
  const ss = String(whole).padStart(2, "0");
  return frac || alwaysTenths ? `${m}:${ss}.${frac}` : `${m}:${ss}`;
}

// 3684 → "1:01:24" for anything an hour or longer, else "6:08".
export function secToClock(sec: number): string {
  const total = Math.round(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/* ── Watts ───────────────────────────────────────────────────────────────── */

const C2_CONSTANT = 2.8 * 500 * 500 * 500; // 350,000,000

// Average watts for a 500 m split given in seconds.
export function wattsFromSplitSec(splitSec: number): number | null {
  if (!splitSec || splitSec <= 0) return null;
  return C2_CONSTANT / (splitSec * splitSec * splitSec);
}

// The reverse, for completeness — what split a wattage corresponds to.
export function splitSecFromWatts(watts: number): number | null {
  if (!watts || watts <= 0) return null;
  return Math.cbrt(C2_CONSTANT / watts);
}

/* ── Filling in what a result didn't state ───────────────────────────────── */

/*
  The 500 m split for a result, from whatever it does have:
    1. the split the athlete entered / the monitor showed, else
    2. derived from total time and total distance.
  Returns null when neither is possible (e.g. a weights session).
*/
export function deriveSplitSec(
  split: string | null | undefined,
  minutes: number | null | undefined,
  metres: number | null | undefined,
): number | null {
  const stated = clockToSec(split);
  if (stated != null && stated > 0) return stated;
  if (minutes != null && minutes > 0 && metres != null && metres > 0) {
    return (minutes * 60 * 500) / metres;
  }
  return null;
}

/*
  Total time for a result, in seconds.

  The log's Minutes field is a whole number, so a 2K logged as "6" would sink a
  ranked board by a quarter of a minute. Wherever a split and a distance exist
  we rebuild the time from those instead — split × distance is exactly the time
  the monitor showed, to the tenth, and every scanned result has both. The
  typed whole minutes are only the last resort.
*/
export function deriveTotalSec(
  splitSec: number | null,
  metres: number | null | undefined,
  minutes: number | null | undefined,
): number | null {
  if (splitSec != null && splitSec > 0 && metres != null && metres > 0) {
    return (splitSec * metres) / 500;
  }
  return minutes != null && minutes > 0 ? minutes * 60 : null;
}

// Average watts for a result: the monitor's figure if we have it, else the
// figure its split implies.
export function deriveWatts(
  watts: number | null | undefined,
  splitSec: number | null,
): number | null {
  if (watts != null && watts > 0) return watts;
  return splitSec != null ? wattsFromSplitSec(splitSec) : null;
}

// Watts per kilogram of body weight — the fair way to compare a 95 kg engine
// with a 72 kg one. Null when either half is missing.
export function wattsPerKg(watts: number | null, kg: number | null | undefined): number | null {
  if (watts == null || kg == null || kg <= 0) return null;
  return watts / kg;
}
