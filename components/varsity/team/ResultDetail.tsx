"use client";

/*
  RESULT DETAIL — one person's piece, opened from the board.
  ---------------------------------------------------------------------------
  Three things a ranked row can't show:

    • THE NUMBERS in full — time, distance, split, rate, watts, watts/kg — so
      you don't have to switch the whole board's metric to read one person.
    • THE INTERVALS, when the monitor showed them. A 8×500m is not one number:
      the shape of it is the point, and the FADE (last rep against first) is
      what a coach reads first. Each rep gets a bar against the fastest one, so
      the shape is visible without reading eight timestamps.
    • THE PHOTO of the monitor. Self-reported times are worth what people trust
      them with; the screen the numbers came off is the evidence. It is also
      what makes a misread scan fixable.

  All colours are theme tokens.
*/
import { useEffect, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { ergPhotoUrl } from "@/lib/varsity/ergPhotos";
import { secToClock, secToSplit, deriveWatts, wattsPerKg } from "@/lib/varsity/ergMath";
import { initialsOf } from "@/lib/varsity/teamBoard";
import type { TeamResult } from "@/lib/varsity/resultsStore";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-2.5 py-2.5 text-center">
      <div className="text-[15px] font-semibold leading-none tabular-nums text-text">{value}</div>
      <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
    </div>
  );
}

export default function ResultDetail({
  result,
  dateLabel,
  onClose,
}: {
  result: TeamResult;
  dateLabel: string;
  onClose: () => void;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFailed, setPhotoFailed] = useState(false);

  // Signed once, when the sheet opens — a board of forty rows must never sign
  // forty urls it will not use.
  useEffect(() => {
    let active = true;
    ergPhotoUrl(result.photoPath).then((url) => active && setPhoto(url));
    return () => {
      active = false;
    };
  }, [result.photoPath]);

  const splitSec = result.splitSec;
  const watts = deriveWatts(result.watts, splitSec);
  const wkg = wattsPerKg(watts, result.weightKg);
  const rows = result.intervals ?? [];

  // The fade: how much slower the last rep was than the first. Negative means
  // they finished faster than they started, which is the good kind of piece.
  const first = rows[0]?.splitSec ?? null;
  const last = rows[rows.length - 1]?.splitSec ?? null;
  const fade = first != null && last != null ? last - first : null;

  // Bars are drawn against the fastest rep, so the slowest is visibly longest.
  const best = rows.reduce<number | null>(
    (m, r) => (r.splitSec != null && (m == null || r.splitSec < m) ? r.splitSec : m),
    null,
  );
  const worst = rows.reduce<number | null>(
    (m, r) => (r.splitSec != null && (m == null || r.splitSec > m) ? r.splitSec : m),
    null,
  );

  return (
    <Sheet title={result.athleteName || "Result"} onClose={onClose}>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-tint text-[13px] font-semibold text-primary">
          {initialsOf(result.athleteName)}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[14px] font-semibold text-text">
            {result.athleteName || "Unnamed"}
          </div>
          <div className="mt-0.5 text-[11px] text-muted">{dateLabel}</div>
        </div>
      </div>

      {/* the full set of numbers */}
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <Stat
          label="Time"
          value={result.minutes != null ? secToClock(result.minutes * 60) : "—"}
        />
        <Stat
          label="Distance"
          value={result.metres != null ? `${Math.round(result.metres).toLocaleString("en-US")} m` : "—"}
        />
        <Stat label="Split" value={splitSec != null ? secToSplit(splitSec, true) : "—"} />
        <Stat label="Rate" value={result.strokeRate != null ? `r${result.strokeRate}` : "—"} />
        <Stat label="Watts" value={watts != null ? String(Math.round(watts)) : "—"} />
        <Stat label="W / kg" value={wkg != null ? wkg.toFixed(2) : "—"} />
      </div>

      {result.note.trim() && (
        <p className="mt-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-[12px] leading-relaxed text-text-2">
          {result.note}
        </p>
      )}

      {/* the reps */}
      {rows.length > 0 && (
        <>
          <div className="mb-2 mt-4 flex items-baseline justify-between px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              {rows.length} intervals
            </span>
            {fade != null && (
              <span
                className={`text-[11px] font-semibold tabular-nums ${
                  fade > 0.05 ? "text-danger" : fade < -0.05 ? "text-success" : "text-muted"
                }`}
              >
                {fade > 0.05 ? "+" : fade < -0.05 ? "−" : "±"}
                {Math.abs(fade).toFixed(1)}s last vs first
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {rows.map((r, i) => {
              // Widths run 40%–100% across the range, so a tight piece still
              // reads as tight rather than being stretched into a big spread.
              const span = best != null && worst != null ? worst - best : 0;
              const frac =
                r.splitSec != null && best != null && span > 0.01
                  ? 0.4 + 0.6 * ((r.splitSec - best) / span)
                  : 1;
              const fastest = r.splitSec != null && r.splitSec === best;
              return (
                <div
                  key={i}
                  className={`px-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-4 flex-shrink-0 text-[11px] font-semibold text-muted">
                      {r.label ?? i + 1}
                    </span>
                    <span className="flex-1 text-[11px] tabular-nums text-muted">
                      {r.metres != null && `${r.metres.toLocaleString("en-US")} m`}
                      {r.timeSec != null && ` · ${secToClock(r.timeSec)}`}
                      {r.strokeRate != null && ` · r${r.strokeRate}`}
                    </span>
                    <span
                      className={`flex-shrink-0 text-[13px] font-semibold tabular-nums ${
                        fastest ? "text-success" : "text-text"
                      }`}
                    >
                      {r.splitSec != null ? secToSplit(r.splitSec, true) : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      // Neutral by default: the BAR'S LENGTH carries the
                      // meaning, and eight crimson bars read as eight warnings.
                      className={`h-full rounded-full ${fastest ? "bg-success" : "bg-muted"}`}
                      style={{ width: `${Math.round(frac * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 px-0.5 text-[11px] leading-relaxed text-muted">
            Longer bar = slower rep. The fastest one is green.
          </p>
        </>
      )}

      {/* the evidence */}
      {result.photoPath && !photoFailed && (
        <>
          <div className="mb-2 mt-4 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            The monitor
          </div>
          {photo ? (
            // A signed, short-lived storage url can't go through next/image's
            // optimiser, and the drawn example is an inline data url.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt={`${result.athleteName}'s erg monitor`}
              onError={() => setPhotoFailed(true)}
              className="w-full rounded-2xl border border-border bg-surface-2"
            />
          ) : (
            <div className="skeleton h-40 w-full rounded-2xl" />
          )}
        </>
      )}

      {!result.photoPath && (
        <p className="mt-4 px-0.5 text-[11px] leading-relaxed text-muted">
          No monitor photo on this one — it was typed in by hand.
        </p>
      )}
    </Sheet>
  );
}
