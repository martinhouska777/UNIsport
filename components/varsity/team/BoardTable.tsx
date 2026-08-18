"use client";

/*
  BOARD TABLE — the squad's results as the spreadsheet has always shown them.
  ---------------------------------------------------------------------------
  Every column at once: weight, W/kg, the result, split, watts, rate, the change
  since last time, and each 500 m of the piece. On a phone that cannot fit, so
  the rank and name column is PINNED and the stats scroll under your thumb —
  you never lose track of whose row you are reading.

  This is the view for a coach going down the squad. The list view next door is
  the one for finding yourself; both read the same board.

  All colours are theme tokens.
*/
import { useUnits } from "@/components/useUnits";
import { formatWeight } from "@/lib/varsity/units";
import { secToSplit, secToClock, deriveWatts, wattsPerKg } from "@/lib/varsity/ergMath";
import {
  improvementLabel,
  type BoardRow,
  type MetricKey,
  type PieceKind,
} from "@/lib/varsity/teamBoard";

const TH = "px-2.5 py-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted whitespace-nowrap";
const TD = "px-2.5 py-2 text-[12px] tabular-nums text-text whitespace-nowrap";

export default function BoardTable({
  rows,
  kind,
  metric,
  ranked,
  hasPrevious,
}: {
  rows: BoardRow[];
  /* The piece's own result column — TIME on a 2K, METRES on a 30' piece. It
     follows the piece, not the metric pills: the pills choose what the board is
     ranked by, but this table always shows every column, so the one the piece
     actually measured is always the one here. */
  kind: PieceKind;
  metric: MetricKey; // only the "vs last" column follows this
  ranked: boolean;
  hasPrevious: boolean;
}) {
  const { units } = useUnits();

  // How many 500 m columns to draw — the longest piece anyone logged.
  const splitCount = rows.reduce((n, r) => Math.max(n, r.result.intervals?.length ?? 0), 0);
  const resultLabel = kind === "time" ? "Metres" : "Time";

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th className={`${TH} sticky left-0 z-10 border-r border-border bg-surface`}>
              {ranked ? "# Name" : "Name"}
            </th>
            <th className={TH}>Weight</th>
            <th className={TH}>W/kg</th>
            <th className={TH}>{resultLabel}</th>
            <th className={TH}>Split</th>
            <th className={TH}>Watts</th>
            <th className={TH}>Rate</th>
            {hasPrevious && <th className={TH}>vs last</th>}
            {Array.from({ length: splitCount }, (_, i) => (
              <th key={i} className={TH}>
                {i + 1}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const r = row.result;
            const watts = deriveWatts(r.watts, r.splitSec);
            const wkg = wattsPerKg(watts, r.weightKg);
            const better = row.improvement != null && row.improvement > 0.05;
            const worse = row.improvement != null && row.improvement < -0.05;
            return (
              <tr
                key={r.id}
                className={`${i > 0 ? "border-t border-border" : ""} ${row.mine ? "bg-primary-tint" : ""}`}
              >
                <th
                  scope="row"
                  className={`${TD} sticky left-0 z-10 max-w-[9.5rem] truncate border-r border-border text-left font-medium ${
                    row.mine ? "bg-primary-tint" : "bg-surface"
                  }`}
                >
                  {ranked && (
                    <span
                      className={`mr-1.5 text-[11px] font-semibold ${
                        row.rank != null && row.rank <= 3 ? "text-primary" : "text-muted"
                      }`}
                    >
                      {row.rank ?? "—"}
                    </span>
                  )}
                  {r.athleteName || "Unnamed"}
                </th>
                <td className={TD}>{formatWeight(r.weightKg, units.weight)}</td>
                <td className={TD}>{wkg != null ? wkg.toFixed(2) : "—"}</td>
                <td className={`${TD} font-semibold`}>
                  {kind === "time"
                    ? r.metres != null
                      ? Math.round(r.metres).toLocaleString("en-US")
                      : "—"
                    : r.minutes != null
                      ? secToClock(r.minutes * 60)
                      : "—"}
                </td>
                <td className={TD}>{r.splitSec != null ? secToSplit(r.splitSec, true) : "—"}</td>
                <td className={TD}>{watts != null ? Math.round(watts) : "—"}</td>
                <td className={TD}>{r.strokeRate ?? "—"}</td>
                {hasPrevious && (
                  <td
                    className={`${TD} font-semibold ${
                      better ? "text-success" : worse ? "text-danger" : "text-muted"
                    }`}
                  >
                    {row.improvement != null ? improvementLabel(row.improvement, metric) : "—"}
                  </td>
                )}
                {Array.from({ length: splitCount }, (_, k) => {
                  const iv = r.intervals?.[k];
                  return (
                    <td key={k} className={`${TD} text-muted`}>
                      {iv?.splitSec != null ? secToSplit(iv.splitSec, true) : "—"}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
