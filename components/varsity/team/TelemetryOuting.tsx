"use client";

/*
  TELEMETRY OUTING — one water session's pieces.
  ---------------------------------------------------------------------------
  Opened from the Workouts list. PowerLine's left-hand panel, on a phone: the
  outing (crew, date, where the file came from), then every piece in order —
  name, duration, metres, rating, split — with a mark on the ones that carry
  the crew's per-seat numbers. Tap a piece for the crew (TelemetryPiece).

  All colours are theme tokens.
*/
import { useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import TelemetryPiece from "@/components/varsity/team/TelemetryPiece";
import type { CompareCandidate } from "@/components/varsity/team/TelemetryPiece";
import { fmtDuration, fmtSplit, outingTotals, type TelemetryOuting as Outing } from "@/lib/varsity/telemetry";
import { dayKeyLabel } from "@/lib/varsity/coachPlan";
import { IconChevronRight } from "@/components/icons";

export default function TelemetryOuting({
  outing,
  dateLabel,
  allOutings,
  onClose,
}: {
  outing: Outing;
  dateLabel: string; // "Fri 15 May · AM"
  /* Every outing there is, so a piece can be compared with one of about the
     same length from another day. */
  allOutings?: Outing[];
  onClose: () => void;
}) {
  const [openPiece, setOpenPiece] = useState<string | null>(null);
  const totals = outingTotals(outing);
  const withSeats = outing.pieces.filter((p) => p.seats?.length).length;
  const piece = outing.pieces.find((p) => p.id === openPiece) ?? null;

  // Pieces within ~6% of this one's distance, anywhere, that have segments —
  // labelled with their day (and name when the day has several).
  const compareWith: CompareCandidate[] = piece
    ? (allOutings ?? [outing]).flatMap((o) =>
        o.pieces
          .filter(
            (p) =>
              p.id !== piece.id &&
              (p.segments?.length ?? 0) >= 2 &&
              Math.abs(p.metres - piece.metres) / Math.max(1, piece.metres) <= 0.06,
          )
          .map((p) => ({
            piece: p,
            label: o.id === outing.id ? p.name : `${p.name} · ${dayKeyLabel(o.dayKey)}`,
          })),
      )
    : [];

  return (
    <Sheet title="Water" onClose={onClose}>
      {/* the outing */}
      <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text">{outing.crew}</span>
          <span className="rounded border border-border px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
            {outing.source === "peach" ? "Peach" : "SpeedCoach"}
          </span>
          <span className="ml-auto text-[11px] text-muted">{dateLabel}</span>
        </div>
        <p className="mt-2 text-[11px] tabular-nums text-muted">
          {outing.pieces.length} pieces · {totals.metres.toLocaleString("en-US")} m ·{" "}
          {fmtDuration(totals.sec)}
          {withSeats > 0 && ` · seats on ${withSeats}`}
        </p>
        {(outing.box || outing.sessionNo || outing.file) && (
          <p className="mt-1 truncate text-[11px] text-muted">
            {outing.box && `Box ${outing.box}`}
            {outing.sessionNo && ` · Session ${outing.sessionNo}`}
            {outing.file && ` · ${outing.file}`}
          </p>
        )}
      </div>

      {/* the pieces */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
        {outing.pieces.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenPiece(p.id)}
            className={`flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-surface-2 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <span className="w-5 flex-shrink-0 text-center text-[11px] font-semibold text-muted">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-medium text-text">{p.name}</span>
                {p.seats?.length ? (
                  <span className="flex-shrink-0 rounded border border-primary-line bg-primary-tint px-1 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-primary">
                    {p.seats.length} seats
                  </span>
                ) : null}
              </div>
              <div className="mt-0.5 text-[11px] tabular-nums text-muted">
                {fmtDuration(p.durationSec)} · {p.metres.toLocaleString("en-US")} m
                {p.rating != null && ` · r${p.rating.toFixed(1)}`}
              </div>
            </div>
            <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-text">
              {fmtSplit(p.splitSec)}
            </span>
            <span className="flex-shrink-0 text-muted">
              <IconChevronRight size={14} />
            </span>
          </button>
        ))}
      </div>
      <p className="mt-1.5 px-0.5 text-[11px] leading-relaxed text-muted">
        In the order they were rowed. The split is the piece&apos;s average per 500 m.
      </p>

      {piece && (
        <TelemetryPiece
          outing={outing}
          piece={piece}
          dateLabel={dateLabel}
          compareWith={compareWith}
          onClose={() => setOpenPiece(null)}
        />
      )}
    </Sheet>
  );
}
