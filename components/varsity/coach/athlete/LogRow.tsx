"use client";

/*
  ONE LOGGED SESSION ON THE COACH'S LIST — read-only, no edit, no delete.
  ---------------------------------------------------------------------------
  DRAWN LIKE A ROW ON THE WORKOUTS TAB (owner, 2026-10-01: "make it consistent
  with the other things we did"): a white card, the dot in the session's
  intensity colour, the workout in bold, and under it the day and what was
  done — then, the way every board on the water and the erg ends a row, the
  split in bold on the right, and the arrow. A tap opens the session the way
  the athlete sees it (WorkoutDetail). The grey card, the day headings above
  the rows and the PLAN chip it had are gone — the Workouts tab has none of
  them, and the detail still says Plan or Extra.

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
  color,
  onOpen,
}: {
  log: LogEntry;
  /** "Mon 28 Sep" */
  day: string;
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
      <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ background: markColor(color) ?? "var(--muted)" }} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-text">{log.title}</div>
        <div className="mt-1 truncate text-[11px] tabular-nums text-muted">
          {[day, log.period, done].filter(Boolean).join(" · ")}
        </div>
      </div>
      {log.split && (
        <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-text">{log.split}</span>
      )}
      <span className="text-muted">
        <IconChevronRight size={15} />
      </span>
    </button>
  );
}
