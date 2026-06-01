/*
  LOG PARSE — turn a prescribed session's text into minutes + metres.
  ------------------------------------------------------------------------
  When an athlete logs a planned session, we pre-fill the result from the
  coach's description so they barely have to type. Descriptions look like:
    "3×25' UT2"  → 75 min      "70' steady state" → 70 min
    "14k"        → 14000 m     "8×500m"           → 4000 m     "2k" → 2000 m

  Whichever of {time, distance} the description gives, we fill directly; the
  other we ESTIMATE from a default pace (split per 500 m). These default paces
  are rough starting points — easy to refine once we have real squad values.
*/
import type { Session } from "./coachPlan";

// Default pace (seconds per 500 m) used only to estimate the missing value.
export const DEFAULT_SPLIT_SEC: Record<string, number> = {
  water: 130, // ~2:10 /500m on the water (UT2-ish)
  erg: 115, // ~1:55 /500m on the erg
};

// Sum every duration in a description, in minutes. Handles "3×25'" reps and
// standalone "70'". (× or x, with or without spaces.)
export function parseMinutes(text: string): number | null {
  if (!text) return null;
  let total = 0;
  let rest = text;
  // reps first: "3×25'" / "3x25'"
  rest = rest.replace(/(\d+)\s*[×x]\s*(\d+)\s*['′]/gi, (_m, reps, mins) => {
    total += Number(reps) * Number(mins);
    return " ";
  });
  // then any standalone "25'"
  rest.replace(/(\d+)\s*['′]/g, (_m, mins) => {
    total += Number(mins);
    return " ";
  });
  return total > 0 ? total : null;
}

// Sum every distance in a description, in metres. Handles "14k"/"14km",
// "8×500m" reps, and standalone "500m".
export function parseMetres(text: string): number | null {
  if (!text) return null;
  let total = 0;
  let rest = text;
  // kilometres: "14k" / "14km" / "2.5k"
  rest = rest.replace(/(\d+(?:\.\d+)?)\s*k(?:m)?\b/gi, (_m, km) => {
    total += Math.round(Number(km) * 1000);
    return " ";
  });
  // reps in metres: "8×500m" / "6x750m"
  rest = rest.replace(/(\d+)\s*[×x]\s*(\d+)\s*m\b/gi, (_m, reps, met) => {
    total += Number(reps) * Number(met);
    return " ";
  });
  // standalone metres: "500m", "2000m"
  rest.replace(/(\d+)\s*m\b/gi, (_m, met) => {
    total += Number(met);
    return " ";
  });
  return total > 0 ? total : null;
}

// Pre-fill {minutes, metres} for a prescribed session: take what the text
// states, estimate the rest from the default pace for its category.
export function estimateForSession(session: Session): {
  minutes: number | null;
  metres: number | null;
} {
  const desc = session.description ?? "";
  let minutes = parseMinutes(desc);
  let metres = parseMetres(desc);
  const split = DEFAULT_SPLIT_SEC[session.category] ?? DEFAULT_SPLIT_SEC.erg;
  if (minutes && !metres) {
    metres = Math.round(((minutes * 60) / split) * 500 / 50) * 50; // nearest 50 m
  } else if (metres && !minutes) {
    minutes = Math.round((metres / 500) * (split / 60)); // nearest minute
  }
  return { minutes: minutes ?? null, metres: metres ?? null };
}

// "56 min · 14,000 m · 1:52" — the parts that are present, for list display.
export function formatMetrics(
  minutes: number | null,
  metres: number | null,
  split: string | null,
): string {
  const parts: string[] = [];
  if (minutes != null) parts.push(`${minutes} min`);
  if (metres != null) parts.push(`${metres.toLocaleString("en-US")} m`);
  if (split && split.trim()) parts.push(split.trim());
  return parts.join(" · ");
}
