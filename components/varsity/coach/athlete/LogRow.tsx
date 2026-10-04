"use client";

/*
  ONE LOGGED SESSION ON THE COACH'S LIST — read-only, no edit, no delete.
  ---------------------------------------------------------------------------
  DRAWN LIKE A ROW ON THE WORKOUTS TAB (owner, 2026-10-01: "make it consistent
  with the other things we did"): a white card, the dot in the session's
  intensity colour, the workout in bold, and under it what was done — then
  the arrow. A tap opens the session the way the athlete sees it
  (WorkoutDetail). The grey card, the day headings above the rows and the
  PLAN chip it had are gone — the Workouts tab has none of them, and the
  detail still says Plan or Extra.

  THE DAY IS ON THE RIGHT, NOT THE SPLIT (owner, 2026-10-04, the water first:
  "u water nechci vidět ten split u preview, ale vpravo bude jen date jak
  normálně", then the erg: "u toho erg stejně jak u toho workouts, ať je to
  konzistentní s tou varsity"): the day over the session's time, the Workouts
  tab's own column. The split is one tap away, in the session itself.

  The dot's colour is a CONTENT colour from data, applied inline — the
  documented exception to rule 1. Everything else is a theme token.
*/
import { formatMetrics } from "@/lib/varsity/logParse";
import type { LogEntry } from "@/lib/varsity/logStore";
import { markColor } from "@/lib/colorMarks";
import { IconChevronRight } from "@/components/icons";

export default function LogRow({
  log,
  day,
  time = "",
  color,
  onOpen,
}: {
  log: LogEntry;
  /** "Mon 28 Sep" */
  day: string;
  /** "7:00 AM", or AM / PM — under the day. */
  time?: string;
  /** The session's colour, by the calendar's own rule. */
  color: string;
  onOpen: () => void;
}) {
  const done = formatMetrics(log.minutes, log.metres, null);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-3 text-left active:bg-surface-2"
    >
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: markColor(color) ?? "var(--faint)" }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-text">{log.title}</div>
        {done && <div className="mt-1 truncate text-[11px] tabular-nums text-muted">{done}</div>}
      </div>
      <span className="flex-shrink-0 whitespace-nowrap text-right tabular-nums leading-tight">
        <span className="block text-[13px] font-semibold text-text">{day}</span>
        {time && <span className="mt-1 block text-[12px] text-muted">{time}</span>}
      </span>
      <span className="text-muted">
        <IconChevronRight size={15} />
      </span>
    </button>
  );
}
