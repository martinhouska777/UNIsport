"use client";

/*
  BOARD TABLE — the squad's results as the spreadsheet has always shown them.
  ---------------------------------------------------------------------------
  Every column at once: weight, W/kg, the result, split, watts, rate, and every
  interval. (The "vs last" column was cut on 2026-09-13 at the owner's ask.)
  On a phone that cannot fit, so the rank and name column is PINNED and the stats scroll under your thumb — you never
  lose track of whose row you are reading. Rows are banded for the same reason:
  when the numbers slide sideways, the band is what your eye holds on to.

  The rank sits in its own fixed slot, so every name starts at the same place
  whether it is #1 or #24, and the interval columns say WHAT they are — R1…R8
  for a set of reps, 500 / 1000 / 1500 / 2000 for a piece rowed straight
  through (rowedAsReps() in teamBoard.ts decides which).

  This is the view for a coach going down the squad. The list view next door is
  the one for finding yourself; both read the same board.

  All colours are theme tokens.
*/
import Medal from "@/components/leaderboards/Medal";
import { useUnits } from "@/components/useUnits";
import { formatWeight } from "@/lib/varsity/units";
import { secToSplit, secToClock, deriveWatts, wattsPerKg } from "@/lib/varsity/ergMath";
import {
  intervalHeadings,
  rowedAsReps,
  type BoardRow,
  type PieceKind,
} from "@/lib/varsity/teamBoard";
import type { Session } from "@/lib/varsity/coachPlan";

const TH = "px-2.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted whitespace-nowrap";
const TD = "px-2.5 py-2.5 text-[13px] tabular-nums text-text whitespace-nowrap";

export default function BoardTable({
  rows,
  kind,
  session,
  ranked,
}: {
  rows: BoardRow[];
  /* The piece's own result column — TIME on a 2K, METRES on a 30' piece. It
     follows the piece, not the metric pills: the pills choose what the board is
     ranked by, but this table always shows every column, so the one the piece
     actually measured is always the one here. */
  kind: PieceKind;
  /* The coach's own wording for the piece — it is what says whether the last
     columns are separate REPS (R1…R8) or the marks of one piece rowed straight
     through (500, 1000, 1500, 2000). See rowedAsReps() in teamBoard.ts. */
  session: Session;
  ranked: boolean;
}) {
  const { units } = useUnits();

  // How many interval columns to draw — the longest piece anyone logged.
  const splitCount = rows.reduce((n, r) => Math.max(n, r.result.intervals?.length ?? 0), 0);
  const resultLabel = kind === "time" ? "Metres" : "Time";
  const headings = intervalHeadings(session, rows.map((r) => r.result), splitCount);
  const groupTitle = rowedAsReps(session) ? "One rep" : "The split at this mark";

  return (
    <div className="overflow-x-auto overscroll-x-contain rounded-2xl border border-border bg-surface">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th className={`${TH} sticky left-0 z-10 border-r-2 border-border bg-surface`}>
              {ranked ? "# Name" : "Name"}
            </th>
            <th className={TH}>Weight</th>
            <th className={TH}>W/kg</th>
            <th className={TH}>{resultLabel}</th>
            <th className={TH}>Split</th>
            <th className={TH}>Watts</th>
            <th className={TH}>Rate</th>
            {/* Each interval column says WHAT it is: R1…R8 for reps, or the
                mark the split was taken at (500, 1000, 1500, 2000) for a piece
                rowed straight through. A bare "1 2 3 4" made a coach count. */}
            {headings.map((h, i) => (
              <th
                key={i}
                title={groupTitle}
                className={`${TH} ${i === 0 ? "border-l border-border" : ""}`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const r = row.result;
            const watts = deriveWatts(r.watts, r.splitSec);
            const wkg = wattsPerKg(watts, r.weightKg);
              /* Alternating rows. The table scrolls sideways under a thumb and
                 the numbers are all the same shape, so a banded row is what
                 keeps your eye on the person you started reading. */
              const band = row.mine ? "bg-primary-tint" : i % 2 ? "bg-surface-2" : "bg-surface";
              return (
              <tr key={r.id} className={`${i > 0 ? "border-t border-border" : ""} ${band}`}>
                <th
                  scope="row"
                  className={`${TD} sticky left-0 z-10 border-r-2 border-border text-left font-semibold ${band}`}
                >
                  {/* Rank in its own fixed column, so every name starts at the
                      same place whether it is 1 or 24. */}
                  <span className="flex items-center gap-2">
                    {ranked &&
                      (row.rank != null && row.rank <= 3 ? (
                        /* Medals for the top three, as on the list. The
                           medal and the numbers under it share one CENTRE
                           line (owner, 2026-09-13): right-aligned, 4…9 sat to
                           the right of the medals above them. */
                        <span className="flex w-5 flex-shrink-0 justify-center">
                          <Medal place={row.rank as 1 | 2 | 3} rank={row.rank} size={18} />
                        </span>
                      ) : (
                        <span className="w-5 flex-shrink-0 text-center text-[12px] font-semibold text-muted">
                          {row.rank ?? "—"}
                        </span>
                      ))}
                    <span className="max-w-[8.5rem] truncate">{r.athleteName || "Unnamed"}</span>
                  </span>
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
                {Array.from({ length: splitCount }, (_, k) => {
                  const iv = r.intervals?.[k];
                  return (
                    <td
                      key={k}
                      className={`${TD} text-muted ${k === 0 ? "border-l border-border" : ""}`}
                    >
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
