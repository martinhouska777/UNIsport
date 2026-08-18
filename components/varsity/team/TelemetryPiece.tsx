"use client";

/*
  TELEMETRY PIECE — one piece of an outing, the crew's numbers.
  ---------------------------------------------------------------------------
  PowerLine's analysis window for a piece, phone-sized:

    • THE BOAT — average speed, rating, average power, metres per stroke: the
      "Average" panel top-right.
    • POWER BY SEAT — eight bars with the crew's names: the middle-right panel.
      Bars are drawn against the strongest seat, so balance is visible at a
      glance; the numbers say the rest.
    • THE TECHNIQUE TABLE — seat, side, catch / finish angle, length, effective
      length, slip / wash: the "Average" table bottom-right, as a table with
      the seat column pinned and the rest scrolling under your thumb (the same
      pattern as the erg board's All stats).
    • SEGMENTS — the piece's own 5-second bursts or 400 m chunks, when the
      source split it that way.

  A piece is a CREW result. Seats are listed bow to stroke, never sorted by
  anything, and nothing here ranks anyone — a bow-pair number and a stroke-
  seat number are not the same kind of number and everyone knows it.

  Force curves are not drawn yet: they need the traces from the export, which
  the app does not hold until the importer lands. All colours are theme tokens.
*/
import Sheet from "@/components/varsity/Sheet";
import { fmtDuration, fmtSplit, fmtDeg, type TelemetryPiece as Piece, type TelemetryOuting } from "@/lib/varsity/telemetry";

const TH = "px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted whitespace-nowrap";
const TD = "px-2.5 py-2 text-[12px] tabular-nums text-text whitespace-nowrap";

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface-2 px-2 py-3 text-center">
      <div className="text-[15px] font-semibold leading-none tabular-nums text-text">{value}</div>
      <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
    </div>
  );
}

export default function TelemetryPiece({
  outing,
  piece,
  dateLabel,
  onClose,
}: {
  outing: TelemetryOuting;
  piece: Piece;
  dateLabel: string;
  onClose: () => void;
}) {
  const seats = piece.seats ?? [];
  const maxW = seats.reduce((m, s) => Math.max(m, s.watts ?? 0), 0);
  const avgW =
    seats.length && seats.some((s) => s.watts != null)
      ? seats.reduce((t, s) => t + (s.watts ?? 0), 0) / seats.filter((s) => s.watts != null).length
      : null;

  return (
    <Sheet title={piece.name} onClose={onClose}>
      {/* what this piece was */}
      <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-semibold text-text">{outing.crew}</span>
          <span className="rounded border border-border px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-muted">
            {outing.source === "peach" ? "Peach" : "SpeedCoach"}
          </span>
          <span className="ml-auto text-[11px] text-muted">{dateLabel}</span>
        </div>
        <p className="mt-2 text-[12px] tabular-nums text-muted">
          {fmtDuration(piece.durationSec)} · {piece.metres.toLocaleString("en-US")} m
          {piece.rating != null && ` · r${piece.rating.toFixed(1)}`}
          {piece.splitSec != null && ` · ${fmtSplit(piece.splitSec)} /500m`}
        </p>
      </div>

      {/* the boat */}
      {piece.boat && (
        <div className="mt-3 flex gap-1.5">
          <Tile value={piece.boat.speed != null ? piece.boat.speed.toFixed(2) : "—"} label="m/s" />
          <Tile value={piece.boat.rating != null ? piece.boat.rating.toFixed(1) : "—"} label="Rating" />
          <Tile value={piece.boat.power != null ? String(Math.round(piece.boat.power)) : "—"} label="Avg W" />
          <Tile value={piece.boat.distPerStroke != null ? piece.boat.distPerStroke.toFixed(2) : "—"} label="m / stroke" />
        </div>
      )}

      {/* power by seat */}
      {seats.length > 0 && (
        <>
          <div className="mb-2 mt-4 flex items-baseline justify-between px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Power by seat
            </span>
            {avgW != null && (
              <span className="text-[11px] tabular-nums text-muted">crew avg {Math.round(avgW)} W</span>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {seats.map((s, i) => {
              const frac = s.watts != null && maxW > 0 ? s.watts / maxW : 0;
              const top = s.watts != null && s.watts === maxW;
              return (
                <div key={s.seat} className={`px-3 py-2 ${i > 0 ? "border-t border-border" : ""}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-primary-tint text-[11px] font-semibold text-primary">
                      {s.seat}
                    </span>
                    <span className="w-3 flex-shrink-0 text-[10px] font-semibold text-muted">{s.side}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                      {s.name ?? `Seat ${s.seat}`}
                    </span>
                    <span
                      className={`flex-shrink-0 text-[13px] font-semibold tabular-nums ${top ? "text-primary" : "text-text"}`}
                    >
                      {s.watts != null ? `${s.watts} W` : "—"}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${top ? "bg-primary" : "bg-muted"}`}
                      style={{ width: `${Math.round(frac * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-1.5 px-0.5 text-[11px] leading-relaxed text-muted">
            Bow to stroke. Bars against the strongest seat — the length is the balance, not a ranking.
          </p>
        </>
      )}

      {/* the technique table */}
      {seats.length > 0 && (
        <>
          <div className="mb-2 mt-4 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Angles &amp; length
          </div>
          <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className={`${TH} sticky left-0 z-10 border-r border-border bg-surface`}>Seat</th>
                  <th className={TH}>Catch</th>
                  <th className={TH}>Finish</th>
                  <th className={TH}>Length</th>
                  <th className={TH}>Effective</th>
                  <th className={TH}>Slip</th>
                  <th className={TH}>Wash</th>
                </tr>
              </thead>
              <tbody>
                {seats.map((s, i) => (
                  <tr key={s.seat} className={i > 0 ? "border-t border-border" : ""}>
                    <td className={`${TD} sticky left-0 z-10 border-r border-border bg-surface`}>
                      <span className="font-semibold">{s.seat}</span>
                      <span className="ml-1 text-[10px] text-muted">{s.side}</span>
                      {s.name && <span className="ml-1.5 text-muted">{s.name.split(" ")[0]}</span>}
                    </td>
                    <td className={TD}>{fmtDeg(s.catchAngle)}°</td>
                    <td className={TD}>{fmtDeg(s.finishAngle)}°</td>
                    <td className={TD}>{fmtDeg(s.length, false)}°</td>
                    <td className={TD}>{fmtDeg(s.effective, false)}°</td>
                    <td className={TD}>{fmtDeg(s.slip, false)}°</td>
                    <td className={TD}>{fmtDeg(s.wash, false)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 px-0.5 text-[11px] leading-relaxed text-muted">
            Gate angles: catch is negative, finish positive. Slip and wash are the degrees lost at
            each end. Swipe the table sideways for the rest.
          </p>
        </>
      )}

      {/* the piece's own segments */}
      {piece.segments && piece.segments.length > 0 && (
        <>
          <div className="mb-2 mt-4 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {piece.segments.length} segments
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {piece.segments.map((g, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 px-3 py-2 text-[12px] tabular-nums ${
                  i > 0 ? "border-t border-border" : ""
                }`}
              >
                <span className="w-4 flex-shrink-0 font-semibold text-muted">{i + 1}</span>
                <span className="flex-1 text-muted">
                  {fmtDuration(g.durationSec)} · {g.metres} m
                  {g.rating != null && ` · r${g.rating.toFixed(1)}`}
                </span>
                <span className="flex-shrink-0 font-semibold text-text">{fmtSplit(g.splitSec)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {seats.length === 0 && !piece.boat && (
        <p className="mt-4 px-0.5 text-[11px] leading-relaxed text-muted">
          Only the boat&apos;s totals were read for this piece.
        </p>
      )}
    </Sheet>
  );
}
