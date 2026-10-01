"use client";

/*
  ONE LOGGED SESSION, exactly as the athlete wrote it — no edit, no delete.
  ---------------------------------------------------------------------------
  A row on the coach's list of an athlete's past workouts. Given `onOpen`, it
  is a button that opens the session the way the athlete sees it
  (WorkoutDetail).

  The category dot is a CONTENT colour from data (lib/varsity/athleteProfile),
  applied inline — the documented exception to rule 1. Everything else is a
  theme token.
*/
import { logCategoryColor } from "@/lib/varsity/athleteProfile";
import { formatMetrics } from "@/lib/varsity/logParse";
import type { LogEntry } from "@/lib/varsity/logStore";
import { markColor } from "@/lib/colorMarks";
import { IconChevronRight } from "@/components/icons";

export default function LogRow({ log, onOpen }: { log: LogEntry; onOpen?: () => void }) {
  const metrics = formatMetrics(log.minutes, log.metres, log.split);
  const Box = onOpen ? "button" : "div";
  return (
    <Box
      {...(onOpen ? { type: "button" as const, onClick: onOpen } : {})}
      className={`flex w-full items-start gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3 text-left ${
        onOpen ? "active:bg-surface" : ""
      }`}
    >
      <span
        className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ background: markColor(logCategoryColor[log.category ?? "other"]) ?? "var(--muted)" }}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold text-text">{log.title}</div>
        {metrics && <div className="mt-0.5 text-[12px] text-text-2">{metrics}</div>}
        {log.note && <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{log.note}</div>}
      </div>
      {/* Was this one of the coach's own sessions, or something they added? */}
      {log.source === "plan" && (
        <span className="flex-shrink-0 rounded-md border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          Plan
        </span>
      )}
      {onOpen && <IconChevronRight size={15} className="mt-0.5 flex-shrink-0 text-muted" />}
    </Box>
  );
}
