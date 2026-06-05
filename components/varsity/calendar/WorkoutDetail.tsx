"use client";

/*
  Varsity WORKOUT DETAIL — one logged session on its own full screen, reached by
  tapping a session in the calendar's day sheet. This is the home for the erg
  screen, the Compare button and (later) Garmin / heart-rate data. Portalled to
  <body> and re-wrapped in the Varsity ThemeProvider (same pattern as Sheet / the
  log editor). All colors are theme tokens; the per-category dot is a content
  color applied inline (rule-1 exception).
*/
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { varsityTheme, varsityLightTheme } from "@/lib/varsity/theme";
import { fetchLogsByCategory, type LogEntry } from "@/lib/varsity/logStore";
import { formatMetrics } from "@/lib/varsity/logParse";
import { logCategoryColor, logCategoryLabel } from "@/lib/varsity/athleteProfile";
import { IconArrowLeft, IconClock, IconChevronDown, IconChevronRight } from "@/components/icons";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface px-3.5 py-3 text-center">
      <div className="text-xl font-semibold leading-none text-text tabular-nums">{value}</div>
      <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
    </div>
  );
}

/*
  Pull the extra erg numbers the scanner tucks into the note ("7:32 · r24 ·
  250W · …"). Each is optional — only what's actually present is returned. Time
  is anchored to the start so a user's own note text can't be mistaken for it.
*/
function ergExtras(note: string) {
  const time = note.match(/^(\d{1,3}:\d{2})/)?.[1] ?? null;
  const rate = note.match(/\br(\d{1,2})\b/i)?.[1] ?? null;
  const watts = note.match(/\b(\d{2,4})\s*W\b/)?.[1] ?? null;
  return { time, rate, watts };
}

// A single number on the erg "monitor" panel.
function ErgCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
      <div className="mt-1 text-lg font-semibold leading-none text-text tabular-nums">{value}</div>
    </div>
  );
}

/*
  ERG RESULT — a Concept2-style summary for erg logs: the /500m split as the
  headline (the number that matters on an erg), then distance / time / rate /
  watts underneath. Reads stored fields + ergExtras(note). All theme tokens.
*/
function ErgResult({ log }: { log: LogEntry }) {
  const { time, rate, watts } = ergExtras(log.note);
  const timeLabel = time ?? (log.minutes != null ? `${log.minutes}:00` : null);
  const cells: { label: string; value: string }[] = [];
  if (log.metres != null) cells.push({ label: "Metres", value: log.metres.toLocaleString() });
  if (timeLabel) cells.push({ label: "Time", value: timeLabel });
  if (rate) cells.push({ label: "s/m", value: rate });
  if (watts) cells.push({ label: "Watts", value: watts });

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-surface-2">
      <div className="border-b border-border px-4 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
        Erg result
      </div>
      <div className="px-4 py-4 text-center">
        <div className="text-4xl font-semibold leading-none text-primary tabular-nums">
          {log.split ?? "—"}
        </div>
        <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">/500m split</div>
      </div>
      {cells.length > 0 && (
        <div
          className="grid gap-2 border-t border-border px-4 py-3"
          style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
        >
          {cells.map((c) => (
            <ErgCell key={c.label} label={c.label} value={c.value} />
          ))}
        </div>
      )}
    </div>
  );
}

// Short date for compare rows, e.g. "May 28".
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// The one-line result shown on a compare row (split for ergs, else the summary).
const rowMetric = (l: LogEntry) =>
  l.category === "erg" && l.split ? `${l.split} /500` : formatMetrics(l.minutes, l.metres, l.split) || "";

export default function WorkoutDetail({
  log,
  userId,
  onClose,
}: {
  log: LogEntry;
  userId: string | null;
  onClose: () => void;
}) {
  // The session on screen. Tapping a Compare row swaps this without leaving.
  const [current, setCurrent] = useState<LogEntry>(log);
  const [compareOpen, setCompareOpen] = useState(false);
  const [similar, setSimilar] = useState<LogEntry[] | null>(null); // null = not loaded yet
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cat = current.category ?? "other";
  const color = logCategoryColor[cat] ?? "var(--muted)";
  const catLabel = logCategoryLabel[cat] ?? "Other";
  const dateLabel = new Date(`${current.logDate}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  // The numbers we already store, shown as result tiles when present (non-erg).
  const tiles: { label: string; value: string }[] = [];
  if (current.metres != null) tiles.push({ label: "Metres", value: current.metres.toLocaleString() });
  if (current.minutes != null) tiles.push({ label: "Minutes", value: String(current.minutes) });
  if (current.split) tiles.push({ label: "Split /500m", value: current.split });

  // Same-category logs, newest first, fetched once when Compare first opens.
  const toggleCompare = async () => {
    if (compareOpen) {
      setCompareOpen(false);
      return;
    }
    setCompareOpen(true);
    if (similar === null && userId) {
      setLoadingSimilar(true);
      setSimilar(await fetchLogsByCategory(userId, cat));
      setLoadingSimilar(false);
    }
  };

  const others = (similar ?? []).filter((l) => l.id !== current.id);

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
              {current.source === "plan" ? "Plan" : "Extra"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-text">{current.title}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            <IconClock size={13} />
            {dateLabel}
            {current.period && ` · ${current.period}`}
          </div>

          {/* Erg logs get the Concept2-style result; everything else gets tiles. */}
          {cat === "erg" ? (
            <ErgResult log={current} />
          ) : tiles.length > 0 ? (
            <div className="mt-5 flex gap-2">
              {tiles.map((t) => (
                <Stat key={t.label} label={t.label} value={t.value} />
              ))}
            </div>
          ) : (
            formatMetrics(current.minutes, current.metres, current.split) && (
              <div className="mt-5 text-[14px] font-medium text-text">
                {formatMetrics(current.minutes, current.metres, current.split)}
              </div>
            )
          )}

          {/* Note */}
          {current.note && (
            <div className="mt-5">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">Note</div>
              <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-text/90">
                {current.note}
              </div>
            </div>
          )}

          {/* Compare — your other sessions of the same kind, tap to open one. */}
          <div className="mt-6">
            <button
              type="button"
              onClick={toggleCompare}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[13px] font-semibold text-text active:bg-surface-2"
            >
              Compare with past {catLabel.toLowerCase()} sessions
              <IconChevronDown size={15} className={compareOpen ? "rotate-180" : ""} />
            </button>

            {compareOpen && (
              <div className="mt-2">
                {loadingSimilar ? (
                  <div className="py-4 text-center text-[12px] text-muted">Loading…</div>
                ) : others.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-6 text-center text-[12px] text-muted">
                    No other {catLabel.toLowerCase()} sessions yet.
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {others.map((l) => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          setCurrent(l);
                          setCompareOpen(false);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-left active:bg-surface-2"
                      >
                        <span className="w-12 flex-shrink-0 text-[11px] font-medium tabular-nums text-muted">
                          {shortDate(l.logDate)}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{l.title}</span>
                        {rowMetric(l) && (
                          <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums text-text/90">
                            {rowMetric(l)}
                          </span>
                        )}
                        <IconChevronRight size={15} className="flex-shrink-0 text-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
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
