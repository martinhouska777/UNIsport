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

  And two ways to read either of them:

    List    — a row per person, tap for their full result. Best on a phone,
              best for finding yourself.
    Table   — every column at once, the way the squad's spreadsheet has always
              looked, with the name column pinned while the stats scroll.

  The metric pills re-read the same results four ways (see lib/varsity/
  teamBoard.ts for why all four exist, and why the second one is TIME on a 2K
  but METRES on a 30' piece). On a ranked board they re-sort it too.

  All colours are theme tokens; the session's category dot is a content colour
  from data applied via inline style (the rule-1 exception the plan screens use).
*/
import { useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import ResultDetail from "@/components/varsity/team/ResultDetail";
import BoardTable from "@/components/varsity/team/BoardTable";
import Delta from "@/components/varsity/team/Delta";
import { sessionLabel, sessionColor } from "@/lib/varsity/coachPlan";
import {
  athleteHistory,
  buildBoard,
  metricsFor,
  metricMeta,
  pieceKindOf,
  pieceSignature,
  rowedAsReps,
  samePieceHistory,
  type MetricKey,
  type TeamWorkout,
} from "@/lib/varsity/teamBoard";
import { secToClock } from "@/lib/varsity/ergMath";
import type { TeamResult } from "@/lib/varsity/resultsStore";
import { IconFloors, IconChevronRight } from "@/components/icons";

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

type View = "list" | "table";

export default function WorkoutBoard({
  workout,
  results,
  workouts,
  allResults,
  myId,
  onClose,
  onOpenWorkout,
}: {
  workout: TeamWorkout;
  results: TeamResult[];
  workouts: TeamWorkout[]; // every team workout, for finding earlier goes at this piece
  allResults: TeamResult[];
  myId: string | null;
  onClose: () => void;
  /* Open another team workout in this board's place — how a previous edition
     of the same piece, tapped in someone's history, is reached. */
  onOpenWorkout?: (dayKey: string) => void;
}) {
  const ranked = workout.board === "ranked";
  /* Was this written as a set of reps ("8×500m", "3×25'"), or as one piece
     rowed straight through (a 2k, a 30')? The coach's own wording decides, and
     it is what says whether a row shows its total time. */
  const reps = rowedAsReps(workout.session);
  const [view, setView] = useState<View>("list");
  const [openRow, setOpenRow] = useState<string | null>(null);

  // Which of time / distance this piece let vary decides the second metric.
  const kind = useMemo(() => pieceKindOf(results), [results]);
  const metrics = useMemo(() => metricsFor(kind), [kind]);
  const [metric, setMetric] = useState<MetricKey>("split");

  // The same piece, earlier. The most recent one is what each row is measured
  // against; the whole run is what a single athlete's history is drawn from.
  const signature = useMemo(() => pieceSignature(results), [results]);
  const past = useMemo(
    () => samePieceHistory(workouts, allResults, signature, workout.date),
    [workouts, allResults, signature, workout.date],
  );
  const previous = past[0];

  const board = useMemo(
    () => buildBoard(results, workout.board, metric, myId, previous?.results, reps),
    [results, workout.board, metric, myId, previous, reps],
  );

  const readable = board.rows.some((r) => r.value != null);
  const mine = board.rows.find((r) => r.mine);

  /*
    YOUR OWN RUN AT THIS PIECE, ready for the block above the leaderboard.

    The board answers "how did the squad go"; this answers "how did I go, and
    is that better than last time" — which is the question the owner opens an
    8x500 to ask. It was reachable already, but only by finding your own name
    in the ranking and opening the sheet behind it; here it is simply on the
    board, under the piece it belongs to.

    Today's go is included (`past` is only the EARLIER ones), and the metric
    follows the pills below, so this block and the You row above it always
    speak the same units.
  */
  const myRun = useMemo(
    () =>
      mine ? athleteHistory([{ workout, results }, ...past], mine.result.athleteId, metric) : [],
    [mine, workout, results, past, metric],
  );

  return (
    /*
      NO TITLE ON THE SHEET. "Ranked" / "Squad" was a word for the shape of the
      screen, sitting directly above a card that already says what this is —
      the session, the workout and the day it was pulled. The bar keeps the
      handle and the X.
    */
    <Sheet title="" onClose={onClose}>
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
        {/* The turnout count ("43 of 43 logged") is gone — on a squad where
            everybody logs, it said 43 of 43 every single time. What stays is
            the day this board is measured against, still clickable: it opens
            THAT day's board in this one's place (onOpenWorkout, the same trick
            a previous edition inside ResultDetail uses), so you can go look at
            the piece you're being compared with instead of just being told its
            date. */}
        {previous && (
          <p className="mt-2 text-[11px] text-muted">
            Compared with{" "}
            {onOpenWorkout ? (
              <button
                type="button"
                onClick={() => onOpenWorkout(previous.workout.dayKey)}
                className="font-medium text-primary underline decoration-dotted underline-offset-2"
              >
                {previous.workout.dateLabel}
              </button>
            ) : (
              previous.workout.dateLabel
            )}
          </p>
        )}
      </div>

      {/* your own line, first — the thing you opened this to see. Tap it for
          your full result and your run of this piece over time. */}
      {mine && (
        <button
          type="button"
          onClick={() => setOpenRow(mine.result.id)}
          className="mt-2 flex w-full items-center gap-2.5 rounded-2xl border border-primary-line bg-primary-tint px-3.5 py-2.5 text-left"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            You
          </span>
          {ranked && mine.rank != null && (
            <span className="text-[12px] text-text">
              {mine.rank} of {board.rows.length}
            </span>
          )}
          <span className="ml-auto text-[14px] font-semibold tabular-nums text-text">
            {mine.display}
          </span>
          {mine.improvement != null && <Delta improvement={mine.improvement} metric={metric} />}
          <span className="text-muted">
            <IconChevronRight size={14} />
          </span>
        </button>
      )}

      {/*
        HOW YOU'VE GONE AT THIS PIECE — just you, above the squad's ranking.
        Only worth drawing when there is something to compare against, so it
        appears from your SECOND go at a piece onwards.

        Each earlier row opens that day's board (the same onOpenWorkout the
        "compared with" link uses), so a number you want the context for is
        one tap from the day it was set.
      */}
      {myRun.length > 1 && (
        <div className="mt-2 rounded-2xl border border-border bg-surface px-3.5 py-3">
          <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Your previous goes
          </div>
          <div className="flex flex-col divide-y divide-border">
            {myRun.map((h) => {
              const isToday = h.dayKey === workout.dayKey;
              const rowInner = (
                <>
                  <span
                    className={`text-[12px] ${isToday ? "font-semibold text-primary" : "text-muted"}`}
                  >
                    {isToday ? "This one" : h.dateLabel}
                  </span>
                  {h.best && myRun.length > 1 && (
                    <span className="rounded border border-accent-line bg-accent-tint px-1 py-px text-[10px] font-semibold uppercase tracking-wide text-accent">
                      Best
                    </span>
                  )}
                  <span className="ml-auto text-[13px] font-semibold tabular-nums text-text">
                    {h.display}
                  </span>
                  {h.improvement != null && <Delta improvement={h.improvement} metric={metric} />}
                </>
              );
              return isToday || !onOpenWorkout ? (
                <div key={h.dayKey} className="flex items-center gap-2 py-1.5">
                  {rowInner}
                </div>
              ) : (
                <button
                  key={h.dayKey}
                  type="button"
                  onClick={() => onOpenWorkout(h.dayKey)}
                  className="flex items-center gap-2 py-1.5 text-left active:opacity-70"
                >
                  {rowInner}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* metric filter */}
      <div className="mt-3 grid grid-cols-4 gap-1">
        {metrics.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMetric(m.key)}
            className={`rounded-xl border px-1 py-2 text-center ${
              metric === m.key ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
            }`}
          >
            <div
              className={`text-[12px] font-semibold leading-none ${
                metric === m.key ? "text-primary" : "text-text"
              }`}
            >
              {m.label}
            </div>
            {/* The gloss under each pill — PER 500 M, TOTAL, AVERAGE POWER,
                POWER PER KILO — is gone. Anyone reading an erg board knows what
                a split is, and four captions made the row twice as tall. */}
          </button>
        ))}
      </div>

      {/* the squad's averages, and how deep the speed goes */}
      {board.logged > 0 &&
        (ranked ? (
          <div className="mt-3 flex gap-1.5">
            <Tile value={board.averageDisplay} label="Squad avg" />
            {board.topAverages.map((t) => (
              <Tile key={t.n} value={t.display} label={`Top ${t.n}`} />
            ))}
          </div>
        ) : (
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
        ))}

      {/* list or full table */}
      <div className="mt-3 flex gap-1 rounded-xl border border-border bg-surface p-1">
        {(["list", "table"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`flex-1 rounded-lg py-1.5 text-[12px] font-semibold capitalize transition-colors ${
              view === v ? "bg-text text-background" : "text-muted"
            }`}
          >
            {v === "table" ? "All stats" : "List"}
          </button>
        ))}
      </div>

      {board.logged === 0 ? (
        <div className="mt-2 rounded-2xl border border-dashed border-border bg-surface-2 px-4 py-8 text-center text-[12px] text-muted">
          Nobody has logged this one yet.
        </div>
      ) : view === "table" ? (
        <div className="mt-2">
          <BoardTable
            rows={board.rows}
            kind={kind}
            session={workout.session}
            metric={metric}
            ranked={ranked}
            hasPrevious={!!previous}
          />
          <p className="mt-1.5 px-0.5 text-[11px] leading-relaxed text-muted">
            Swipe the table sideways for the rest. The name stays put.
          </p>
        </div>
      ) : (
        <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
          {board.rows.map((row, i) => (
            <button
              key={row.result.id}
              type="button"
              onClick={() => setOpenRow(row.result.id)}
              /* gap-2.5 / px-2.5, not gap-3 / px-3: it buys ten pixels, and
                 ten pixels is the difference between "Mason Cruz-Abrams" and
                 "Mason Cruz-Abra…". A ranked board is a list of PEOPLE. */
              className={`flex w-full items-center gap-2.5 px-2.5 py-2.5 text-left ${
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
              {/* No initials tile. On a board of forty names it was forty
                  identical squares repeating the first letters of the name
                  written beside them. */}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-semibold text-text">
                  {row.result.athleteName || "Unnamed"}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
                  {row.detail && <span className="truncate">{row.detail}</span>}
                  {/* How many REPS they logged — on a set of reps. A 2k also
                      stores four rows, but those are its 500s, not four
                      efforts, and "4" beside a 2k said nothing. */}
                  {reps && !!row.result.intervals?.length && (
                    <span className="flex flex-shrink-0 items-center gap-0.5">
                      <IconFloors size={11} />
                      {row.result.intervals.length}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-2">
                <span className="text-[13px] font-semibold tabular-nums text-text">{row.display}</span>
                {/* how much faster (or slower) than their own last go at this
                    piece — a chip, not small print, because it is the second
                    thing everyone reads on a ranking */}
                {row.improvement != null ? (
                  <Delta improvement={row.improvement} metric={metric} />
                ) : (
                  previous && <span className="w-[62px] flex-shrink-0" aria-hidden />
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* a different machine, listed apart rather than ranked */}
      {board.otherMachineRows.length > 0 && (
        <>
          <div className="mb-1.5 mt-4 px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Other machines
          </div>
          <div className="overflow-hidden rounded-2xl border border-border bg-surface">
            {board.otherMachineRows.map((row, i) => (
              <button
                key={row.result.id}
                type="button"
                onClick={() => setOpenRow(row.result.id)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left ${
                  i > 0 ? "border-t border-border" : ""
                } ${row.mine ? "bg-primary-tint" : "active:bg-surface-2"}`}
              >
                <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted">
                  {row.result.monitor}
                </span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">
                  {row.result.athleteName || "Unnamed"}
                </span>
                <span className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-text">
                  {row.display}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {openRow && (
        <ResultDetail
          result={
            [...board.rows, ...board.otherMachineRows].find((r) => r.result.id === openRow)!.result
          }
          workout={workout}
          history={[{ workout, results }, ...past]}
          kind={kind}
          onClose={() => setOpenRow(null)}
          onOpenWorkout={onOpenWorkout}
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
