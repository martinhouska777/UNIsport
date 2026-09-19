"use client";

/*
  ONE LOGGED SESSION, exactly as the athlete wrote it — no edit, no delete.
  ---------------------------------------------------------------------------
  Drawn once and used by both of the coach's readings of it: the day sheet that
  opens off their calendar, and the list of past workouts. The two were the same
  four lines of markup written twice, which is how a dot changes colour in one
  place and not the other.

  The category dot is a CONTENT colour from data (lib/varsity/athleteProfile),
  applied inline — the documented exception to rule 1. Everything else is a
  theme token.
*/
import { logCategoryColor } from "@/lib/varsity/athleteProfile";
import { formatMetrics } from "@/lib/varsity/logParse";
import type { LogEntry } from "@/lib/varsity/logStore";

export default function LogRow({ log }: { log: LogEntry }) {
  const metrics = formatMetrics(log.minutes, log.metres, log.split);
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
      <span
        className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
        style={{ background: logCategoryColor[log.category ?? "other"] ?? "var(--muted)" }}
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
    </div>
  );
}
