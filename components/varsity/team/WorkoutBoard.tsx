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
import Medal from "@/components/leaderboards/Medal";
import { useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import ResultDetail from "@/components/varsity/team/ResultDetail";
import BoardTable from "@/components/varsity/team/BoardTable";
import Delta from "@/components/varsity/team/Delta";
import { isTwoKTest, sessionColor, workoutLabel } from "@/lib/varsity/coachPlan";
import {
  buildBoard,
  metricsFor,
  metricMeta,
  pieceKindOf,
  pieceSignature,
  rowedAsReps,
  samePieceHistory,
  type BoardRow,
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

/*
  The face of the board's top card. It is a BUTTON when there is a result on it
  to open, and a plain block when there isn't (a board you never logged) — so
  nothing is pressable that leads nowhere.
*/
function Face({
  top,
  onOpen,
  children,
}: {
  top: BoardRow | undefined;
  onOpen?: () => void;
  children: React.ReactNode;
}) {
  const cls = "w-full px-3.5 py-3 text-left";
  return top && onOpen ? (
    <button type="button" onClick={onOpen} className={`${cls} active:bg-surface-2`}>
      {children}
    </button>
  ) : (
    <div className={cls}>{children}</div>
  );
}

export default function WorkoutBoard({
  workout,
  results,
  workouts,
  allResults,
  example = false,
  inConsole = false,
  myId,
  onClose,
  onOpenWorkout,
}: {
  workout: TeamWorkout;
  results: TeamResult[];
  workouts: TeamWorkout[]; // every team workout, for finding earlier goes at this piece
  allResults: TeamResult[];
  /* A worked example, not the squad's own results. Nobody real is on it, so
     the block at the top stands in for you rather than being you — see `top`. */
  example?: boolean;
  /* Opened from the Coach Console. A coach never pulled the piece, so there
     is no "you" to put on top, and the stand-in rower ("Sam Gallaudet · 21 of
     40") read as if the coach had picked someone out. The owner wants the
     whole list and nothing above it (2026-09-13). */
  inConsole?: boolean;
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
    THE ROW AT THE TOP — one person's piece, which is what everybody actually
    opens this board to read. Tapping it opens the SAME full screen a tap on
    anyone in the ranking opens: the numbers in full, the reps rep by rep, the
    monitor photo, and that person's whole run of this piece.

    Normally it is YOU. On the WORKED EXAMPLE nobody real is on the board, so
    there was no top row at all and the screen could not be seen before the
    squad had logged anything. It now stands in with the median rower, under
    their own (invented) name — so the block can be read and pressed, without
    putting the viewer's name on a 2k they never pulled. (It wore an EXAMPLE
    tag too; the owner had it taken off on 2026-09-13.)
  */
  const top = inConsole
    ? undefined
    : (mine ?? (example ? board.rows[Math.floor(board.rows.length / 2)] : undefined));

  return (
    /*
      NO TITLE ON THE SHEET. "Ranked" / "Squad" was a word for the shape of the
      screen, sitting directly above a card that already says what this is —
      the session, the workout and the day it was pulled. The bar keeps the
      handle and the X.
    */
    <Sheet title="" onClose={onClose} full>
      {/*
        THE WORKOUT AND YOUR OWN RESULT, IN ONE CARD.

        They used to be two cards stacked, which read as two separate facts —
        the piece, then a coloured strip about a person. They are one thing: my
        go at this piece. So the session, the day and the result now share a
        card, and the whole of it presses through to the full screen (the same
        one a tap on anybody in the ranking opens): the numbers, the reps rep
        by rep, the monitor photo, and every previous go at this piece.

        That last part is why the "Previous goes" block that used to sit under
        here is gone — it was a second, smaller copy of a run of results that
        the screen behind this card already lays out properly.

        Under the piece: YOU, your place in the squad, your result and the ±
        on your last go. Nothing else — that is the whole card.
      */}
      {/* White, not grey (owner, 2026-09-16): the card at the top stands out
          from the grey list of names under it. */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
        <Face top={top} onOpen={top ? () => setOpenRow(top.result.id) : undefined}>
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: sessionColor(workout.session) }}
            />
            <span className="text-[13px] font-semibold text-text">
              {workoutLabel(workout.session)}
            </span>
            <span className="ml-auto text-[11px] text-muted">
              {workout.dateLabel} · {workout.period}
            </span>
          </div>
          {/* A 2K test is already named "Erg · 2K" — no "2k test" under it. */}
          {workout.session.description.trim() && !isTwoKTest(workout.session) && (
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              {workout.session.description}
            </p>
          )}

          {/* The result itself, big, on its own line under the piece. */}
          {top && (
            <div className="mt-2.5 flex items-center gap-2.5 border-t border-border pt-2.5">
              {top.mine ? (
                <span className="flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                  You
                </span>
              ) : (
                <span className="min-w-0 truncate text-[13px] font-semibold text-text">
                  {top.result.athleteName || "Unnamed"}
                </span>
              )}
              {ranked && top.rank != null && (
                <span className="flex-shrink-0 text-[12px] text-muted">
                  {top.rank} of {board.rows.length}
                </span>
              )}
              <span className="ml-auto flex-shrink-0 text-[19px] font-semibold leading-none tabular-nums text-text">
                {top.display}
              </span>
              {top.improvement != null && <Delta improvement={top.improvement} metric={metric} />}
              <span className="flex-shrink-0 text-muted">
                <IconChevronRight size={15} />
              </span>
            </div>
          )}
        </Face>

        {/* NO "Compared with 12 Oct" row. The previous go is still what the
            ± on your result is measured against — it just doesn't need a line
            of its own saying so, and the full screen behind this card lists
            every earlier go properly. The card is shorter for it. */}
      </div>

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

      {/* list or full table — the selected half fills its side, edge to edge,
          the same as the Roster / Workouts switch above it (owner, 2026-09-14). */}
      <div className="mt-3 flex overflow-hidden rounded-xl border border-border bg-surface">
        {(["list", "table"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-[12px] font-semibold capitalize transition-colors ${
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
            ranked={ranked}
          />
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
                /* The top three wear a medal (owner, 2026-09-13) — the same
                   one the app's leaderboards use. Everyone else keeps the
                   number. */
                row.rank != null && row.rank <= 3 ? (
                  <span className="flex w-5 flex-shrink-0 justify-center">
                    <Medal place={row.rank as 1 | 2 | 3} rank={row.rank} size={20} />
                  </span>
                ) : (
                  <span className="w-5 flex-shrink-0 text-center text-[12px] font-semibold text-muted">
                    {row.rank ?? "—"}
                  </span>
                )
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
