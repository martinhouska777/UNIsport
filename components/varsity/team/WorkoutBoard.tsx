"use client";

/*
  WORKOUT BOARD — one team workout, everyone's result.
  ---------------------------------------------------------------------------
  Opened from the Workouts list in the Team tab. Two shapes, decided by the
  coach when they switched the board on:

    ranked  — a test or race piece. Fastest first, numbered, your row marked.
    average — steady training. Nobody is ranked; instead the squad's averages
              sit at the top and the names run alphabetically, so a UT2 row can
              never be read as a league table.

  The four metric pills re-read the same results as split / total time / watts /
  watts-per-kilo (see lib/varsity/teamBoard.ts for why all four exist). On a
  ranked board they re-sort it too — W/kg is a different race from raw split.

  All colors are theme tokens; the session's category dot is a content color
  from data applied via inline style (the rule-1 exception the plan screens use).
*/
import { useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import ResultDetail from "@/components/varsity/team/ResultDetail";
import { IconCamera, IconFloors } from "@/components/icons";
import { sessionLabel, sessionColor } from "@/lib/varsity/coachPlan";
import {
  buildBoard,
  boardMetrics,
  metricMeta,
  type MetricKey,
  type TeamWorkout,
} from "@/lib/varsity/teamBoard";
import { secToClock } from "@/lib/varsity/ergMath";
import type { TeamResult } from "@/lib/varsity/resultsStore";

function Tile({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-border bg-surface-2 px-3 py-3 text-center">
      <div className="text-lg font-semibold leading-none text-text">{value}</div>
      <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </div>
    </div>
  );
}

export default function WorkoutBoard({
  workout,
  results,
  squadSize,
  myId,
  onClose,
}: {
  workout: TeamWorkout;
  results: TeamResult[];
  squadSize: number | null;
  myId: string | null;
  onClose: () => void;
}) {
  const [metric, setMetric] = useState<MetricKey>("split");
  // Which row is open in full (its numbers, its reps, its monitor photo).
  const [openRow, setOpenRow] = useState<string | null>(null);
  const ranked = workout.board === "ranked";
  const board = useMemo(
    () => buildBoard(results, workout.board, metric, myId),
    [results, workout.board, metric, myId],
  );

  // Whether anyone at all can be read on this metric — if not, say why rather
  // than showing a column of dashes.
  const readable = board.rows.some((r) => r.value != null);

  return (
    <Sheet title={ranked ? "Ranked" : "Squad"} onClose={onClose}>
      {/* what the workout was */}
      <div className="rounded-2xl border border-border bg-surface-2 px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ background: sessionColor(workout.session) }}
          />
          <span className="text-[13px] font-semibold text-text">
            {sessionLabel(workout.session)}
          </span>
          <span className="ml-auto text-[11px] text-muted">
            {workout.dateLabel} · {workout.period}
          </span>
        </div>
        {workout.session.description.trim() && (
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {workout.session.description}
          </p>
        )}
        <p className="mt-2 text-[11px] text-muted">
          {board.logged} {squadSize ? `of ${squadSize} ` : ""}logged
        </p>
      </div>

      {/* metric filter */}
      <div className="mt-3 grid grid-cols-4 gap-1">
        {boardMetrics.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`rounded-xl border px-1 py-2 text-center ${
              metric === m.key
                ? "border-primary bg-primary-tint"
                : "border-border bg-surface-2"
            }`}
          >
            <div
              className={`text-[12px] font-semibold leading-none ${
                metric === m.key ? "text-primary" : "text-text"
              }`}
            >
              {m.label}
            </div>
            <div className="mt-1 text-[8px] uppercase tracking-[0.1em] text-muted">{m.sub}</div>
          </button>
        ))}
      </div>

      {/* the squad's average. On a RANKED board it is one line — the number you
          want next to a ranking is "where do I sit against the squad", and an
          average distance tile on a 2K test where everyone rowed 2,000 m is a
          dead number. A steady session has no ranking to read against, so there
          it gets the full three tiles instead. Both follow the metric pills. */}
      {ranked && board.logged > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Squad average
          </span>
          <span className="text-[14px] font-semibold tabular-nums text-text">
            {board.averageDisplay}
          </span>
        </div>
      )}

      {!ranked && board.logged > 0 && (
        <div className="mt-3 flex gap-1.5">
          <Tile value={board.averageDisplay} label={`Avg ${metricMeta(metric).label}`} />
          <Tile
            value={board.avgMinutes != null ? secToClock(board.avgMinutes * 60) : "—"}
            label="Avg time"
          />
          <Tile
            value={
              board.avgMetres != null
                ? `${Math.round(board.avgMetres).toLocaleString("en-US")} m`
                : "—"
            }
            label="Avg distance"
          />
        </div>
      )}

      {/* the results */}
      {board.logged === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
          Nobody has logged this one yet.
        </div>
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
          {board.rows.map((row, i) => (
            <button
              key={row.result.id}
              type="button"
              onClick={() => setOpenRow(row.result.id)}
              className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                i > 0 ? "border-t border-border" : ""
              } ${row.mine ? "bg-primary-tint" : "active:bg-surface-2"}`}
            >
              {ranked && (
                <span
                  className={`w-5 flex-shrink-0 text-center text-[12px] font-semibold ${
                    row.rank != null && row.rank <= 3 ? "text-primary" : "text-muted"
                  }`}
                >
                  {row.rank ?? "—"}
                </span>
              )}
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-tint text-[11px] font-semibold text-primary">
                {row.initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-text">
                  {row.result.athleteName || "Unnamed"}
                  {row.mine && (
                    <span className="ml-1.5 rounded bg-text px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-background">
                      You
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                  {row.detail && <span className="truncate">{row.detail}</span>}
                  {/* what tapping this row will get you */}
                  {!!row.result.intervals?.length && (
                    <span
                      className="flex flex-shrink-0 items-center gap-0.5"
                      title={`${row.result.intervals.length} intervals`}
                    >
                      <IconFloors size={11} />
                      {row.result.intervals.length}
                    </span>
                  )}
                  {row.result.photoPath && (
                    <span className="flex-shrink-0" title="Monitor photo">
                      <IconCamera size={11} />
                    </span>
                  )}
                </div>
              </div>
              <span className="flex-shrink-0 text-right text-[13px] font-semibold tabular-nums text-text">
                {row.display}
              </span>
            </button>
          ))}
        </div>
      )}

      {openRow && (
        <ResultDetail
          result={board.rows.find((r) => r.result.id === openRow)!.result}
          dateLabel={`${workout.dateLabel} · ${workout.period} · ${workout.session.description.trim() || sessionLabel(workout.session)}`}
          onClose={() => setOpenRow(null)}
        />
      )}

      {board.logged > 0 && !readable && (
        <p className="mt-2 px-0.5 text-[11px] leading-relaxed text-muted">
          {metric === "wkg"
            ? "Nobody on this board has a body weight saved yet — add yours on the Profile tab and it will fill in from your next session."
            : `Nothing logged here carries the numbers ${metricMeta(metric).label.toLowerCase()} needs.`}
        </p>
      )}
    </Sheet>
  );
}
