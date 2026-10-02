"use client";

/*
  Varsity WORKOUT DETAIL — one logged session on its own full screen, reached by
  tapping a session in the calendar's day sheet (and, for a coach, a row on the
  athlete's Workouts). This is the home for the erg result, the photo of the
  monitor it was scanned from, the Compare button and (later) Garmin /
  heart-rate data. Portalled to <body> and re-wrapped in the Varsity
  ThemeProvider (same pattern as Sheet / the log editor). All colors are theme
  tokens; the per-category dot is a content color applied inline (rule-1
  exception).
*/
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { fetchLogsByCategory, type LogEntry } from "@/lib/varsity/logStore";
import { logPhotoUrl } from "@/lib/varsity/ergPhotos";
import { ergNote, ergPiece, type ErgPiece } from "@/lib/varsity/ergLog";
import { formatMetrics } from "@/lib/varsity/logParse";
import { logCategoryLabel } from "@/lib/varsity/athleteProfile";
import { IconArrowLeft, IconClock, IconChevronDown, IconChevronRight } from "@/components/icons";
import { markColor } from "@/lib/colorMarks";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface px-3.5 py-3 text-center">
      <div className="text-xl font-semibold leading-none text-text tabular-nums">{value}</div>
      <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</div>
    </div>
  );
}

/*
  ERG RESULT — the four numbers of an erg piece in one row: split, metres,
  time, rate (owner, 2026-10-02: smaller than the monitor-style panel it
  replaces, which put the split in huge type over a grey box). The exact time
  and the rate come from the scanner's part of the note (ergLog.ts → ergNote).
*/
function ErgResult({ log }: { log: LogEntry }) {
  const { time, rate } = ergNote(log.note);
  const timeLabel = time ?? (log.minutes != null ? `${log.minutes}:00` : null);
  const cells: { label: string; value: string; lead?: boolean }[] = [];
  if (log.split) cells.push({ label: "Split", value: log.split, lead: true });
  if (log.metres != null) cells.push({ label: "Metres", value: log.metres.toLocaleString("en-US") });
  if (timeLabel) cells.push({ label: "Time", value: timeLabel });
  if (rate) cells.push({ label: "s/m", value: rate });
  if (cells.length === 0) return null;

  return (
    <div
      className="mt-5 grid gap-1 rounded-2xl border border-border bg-surface px-2 py-3"
      style={{ gridTemplateColumns: `repeat(${cells.length}, minmax(0, 1fr))` }}
    >
      {cells.map((c) => (
        <div key={c.label} className="text-center">
          <div className={`text-lg font-semibold leading-none tabular-nums ${c.lead ? "text-primary" : "text-text"}`}>
            {c.value}
          </div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// Short date for compare rows, e.g. "May 28".
const shortDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// The one-line result shown on a compare row (non-erg sessions).
const rowMetric = (l: LogEntry) => formatMetrics(l.minutes, l.metres, l.split) || "";

/* An erg compare row: the number the piece did NOT fix (the time of a 5,000 m,
   the metres of a 30 min), then the split. */
function ergRowMetrics(l: LogEntry, piece: ErgPiece): { middle: string; split: string } {
  const exact = ergNote(l.note).time;
  const middle =
    piece.kind === "distance"
      ? (exact ?? (l.minutes != null ? `${l.minutes}:00` : ""))
      : l.metres != null
        ? `${l.metres.toLocaleString("en-US")} m`
        : "";
  return { middle, split: l.split ? `${l.split} /500` : "" };
}

export default function WorkoutDetail({
  log,
  userId,
  colorOf,
  onClose,
}: {
  log: LogEntry;
  userId: string | null;
  /* What colour this session is, decided by the calendar so the grid, the day
     list and this screen can never disagree (CalendarScreen → logColor). */
  colorOf: (l: LogEntry) => string;
  onClose: () => void;
}) {
  const vTheme = useVarsityTheme();
  // The session on screen. Tapping a Compare row swaps this without leaving.
  const [current, setCurrent] = useState<LogEntry>(log);
  const [compareOpen, setCompareOpen] = useState(false);
  const [similar, setSimilar] = useState<LogEntry[] | null>(null); // null = not loaded yet
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // The monitor photo, signed when the session on screen has one. Keyed by the
  // path it was signed for, so a Compare row that swaps the session never shows
  // the previous session's picture (or a failure that belonged to it).
  const photoPath = current.photoPath ?? null;
  const [photo, setPhoto] = useState<{ path: string; url: string | null } | null>(null);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  useEffect(() => {
    if (!photoPath) return;
    let active = true;
    logPhotoUrl(photoPath).then((url) => active && setPhoto({ path: photoPath, url }));
    return () => {
      active = false;
    };
  }, [photoPath]);
  const photoUrl = photo && photo.path === photoPath ? photo.url : undefined; // undefined = still signing

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cat = current.category ?? "other";
  const color = colorOf(current);
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

  // An erg session is compared only with the same piece (ergLog.ts), and its
  // note shows only what the rower wrote — the scanner's numbers are above.
  const erg = cat === "erg";
  const piece = erg ? ergPiece(current) : null;
  const noteText = erg ? ergNote(current.note).own : current.note.trim();

  // Same-category logs, newest first, fetched once when Compare first opens
  // (for an erg session, narrowed to the same piece below).
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

  const others = (similar ?? []).filter(
    (l) => l.id !== current.id && (!piece || ergPiece(l)?.key === piece.key),
  );
  // What Compare is against: "5,000 m pieces", or "rowing sessions" off the erg.
  const compareWhat = piece ? `${piece.label} pieces` : `${catLabel.toLowerCase()} sessions`;

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
            <span className="h-3 w-3 flex-shrink-0 rounded-full" style={{ background: markColor(color) }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{catLabel}</span>
            <span className="ml-auto rounded-md border border-border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-muted">
              {current.source === "plan" ? "Plan" : "Extra"}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-semibold text-text">{current.title}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
            <IconClock size={13} />
            {dateLabel}
            {current.period && ` · ${current.period}`}
          </div>

          {/* Erg logs get their four numbers in one row; everything else gets tiles. */}
          {erg ? (
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

          {/* Note — only when the rower wrote one. */}
          {noteText && (
            <div className="mt-5">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Note</div>
              <div className="rounded-2xl border border-border bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-text-2">
                {noteText}
              </div>
            </div>
          )}

          {/* The monitor it was scanned from — the numbers above can be checked
              against it. Hidden when the photo can't be opened. */}
          {photoPath && failedPhoto !== photoPath && photoUrl !== null && (
            <div className="mt-5">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                The monitor
              </div>
              {photoUrl ? (
                // A signed, short-lived storage url can't go through next/image's optimiser.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photoUrl}
                  alt="Erg monitor"
                  onError={() => setFailedPhoto(photoPath)}
                  className="w-full rounded-2xl border border-border bg-surface-2"
                />
              ) : (
                <div className="skeleton h-40 w-full rounded-2xl" />
              )}
            </div>
          )}

          {/* Compare — your other sessions of the same kind (on the erg, the same
              piece), tap to open one. An erg session with no distance or time
              has no piece to compare. */}
          {!(erg && !piece) && (
          <div className="mt-6">
            <button
              type="button"
              onClick={toggleCompare}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-3 text-[13px] font-semibold text-text active:bg-surface-2"
            >
              Compare with past {compareWhat}
              <IconChevronDown size={15} className={compareOpen ? "rotate-180" : ""} />
            </button>

            {compareOpen && (
              <div className="mt-2">
                {loadingSimilar ? (
                  <div className="py-4 text-center text-[12px] text-muted">Loading…</div>
                ) : others.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
                    No other {compareWhat} yet.
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
                        {piece ? (
                          <>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium tabular-nums text-text">
                              {ergRowMetrics(l, piece).middle}
                            </span>
                            <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums text-text-2">
                              {ergRowMetrics(l, piece).split}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{l.title}</span>
                            {rowMetric(l) && (
                              <span className="flex-shrink-0 text-[12px] font-semibold tabular-nums text-text-2">
                                {rowMetric(l)}
                              </span>
                            )}
                          </>
                        )}
                        <IconChevronRight size={15} className="flex-shrink-0 text-muted" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      {overlay}
    </ThemeProvider>,
    document.body,
  );
}
