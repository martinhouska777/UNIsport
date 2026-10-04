/*
  THE ONE LINE UNDER A LOGGED SESSION — what was done, never how it felt.
  ---------------------------------------------------------------------------
  The Log tab's cards and Home's session cards both say a saved session in a
  line under its name. It used to be the figures and then the effort answer
  ("72 min · 16,000 m · 2:15 · Steady"). The owner cut the effort and trimmed
  the figures to what each kind of training is measured in (2026-10-04: "na
  vody nepiš split a steady, jen minuty a metres … nepiš, jak se to cítilo,
  jen u weights čas a u erga čas … a split"):

    water     72 min · 16,000 m
    weights   45 min
    erg       16:19.3 · 5,000 m · 1:37.9   (the monitor's exact time when the
                                            piece was scanned, else minutes)
    the rest  their figures, as before, without the effort

  An empty string when there is nothing to say — the card's own "Logged"
  already says it was done.
*/
import type { LogEntry } from "./logStore";
import { formatMetrics } from "./logParse";
import { ergNote } from "./ergLog";

export function loggedLine(l: LogEntry): string {
  const min = l.minutes != null ? `${l.minutes} min` : null;
  const metres = l.metres != null ? `${l.metres.toLocaleString("en-US")} m` : null;
  switch (l.category) {
    case "water":
      return [min, metres].filter(Boolean).join(" · ");
    case "weights":
      return min ?? "";
    case "erg":
      return [ergNote(l.note).time ?? min, metres, l.split?.trim() || null].filter(Boolean).join(" · ");
    default:
      return formatMetrics(l.minutes, l.metres, l.split);
  }
}
