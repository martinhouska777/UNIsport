"use client";

/*
  Varsity WORKOUT DETAIL — one logged session on its own full screen, reached by
  tapping a session in the calendar's day sheet. This is the home for the erg
  screen, the Compare button and (later) Garmin / heart-rate data; for now it
  lays out everything we already store. Portalled to <body> and re-wrapped in the
  Varsity ThemeProvider (same pattern as Sheet / the log editor). All colors are
  theme tokens; the per-category dot is a content color applied inline (rule-1
  exception).
*/
import { useEffect } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { varsityTheme, varsityLightTheme } from "@/lib/varsity/theme";
import { type LogEntry } from "@/lib/varsity/logStore";
import { formatMetrics } from "@/lib/varsity/logParse";
import { logCategoryColor, logCategoryLabel } from "@/lib/varsity/athleteProfile";
import { IconArrowLeft, IconClock } from "@/components/icons";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface px-3.5 py-3 text-center">
      <div className="text-xl font-semibold leading-none text-text tabular-nums">{value}</div>
      <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
    </div>
  );
}

export default function WorkoutDetail({ log, onClose }: { log: LogEntry; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cat = log.category ?? "other";
  const color = logCategoryColor[cat] ?? "var(--muted)";
  const catLabel = logCategoryLabel[cat] ?? "Other";
  const dateLabel = new Date(`${log.logDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // The numbers we already store, shown as result tiles when present.
  const tiles: { label: string; value: string }[] = [];
  if (log.metres != null) tiles.push({ label: "Metres", value: log.metres.toLocaleString() });
  if (log.minutes != null) tiles.push({ label: "Minutes", value: String(log.minutes) });
  if (log.split) tiles.push({ label: "Split /500m", value: log.split });

  const overlay = (
    <div className="fixed inset-0 z-[60] flex h-dvh flex-col bg-background [animation:backdrop-in_0.2s_ease-out]">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <button type="button" onClick={onClose} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={18} /> Back
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 pt-4">
        <div className="mx-auto w-full max-w-screen-sm">
          {/* Title + category + plan/extra */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: color }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{catLabel}</span>
            <span className="ml-auto rounded-md border border-border px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
              {log.source === "plan" ? "Plan" : "Extra"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-text">{log.title}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            <IconClock size={13} />
            {dateLabel}
            {log.period && ` · ${log.period}`}
          </div>

          {/* Result tiles (or a one-line summary fallback) */}
          {tiles.length > 0 ? (
            <div className="mt-5 flex gap-2">
              {tiles.map((t) => (
                <Stat key={t.label} label={t.label} value={t.value} />
              ))}
            </div>
          ) : (
            formatMetrics(log.minutes, log.metres, log.split) && (
              <div className="mt-5 text-[14px] font-medium text-text">
                {formatMetrics(log.minutes, log.metres, log.split)}
              </div>
            )
          )}

          {/* Note */}
          {log.note && (
            <div className="mt-5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Note</div>
              <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-text/90">
                {log.note}
              </div>
            </div>
          )}

          {/* Where the erg screen, Compare and Garmin data will land in later slices. */}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <ThemeProvider tokens={varsityTheme} light={varsityLightTheme}>
      {overlay}
    </ThemeProvider>,
    document.body,
  );
}
