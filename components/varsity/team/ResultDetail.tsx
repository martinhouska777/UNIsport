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

  And the question a single result can never answer on its own: AM I GETTING
  FASTER. "Compared with previous" is this ONE person's run of the piece: a
  headline (this go against the last one, against the first one, and their
  best), then every edition newest first — the piece's own result big (time on
  a 2K, metres on a 30'), the split / rate / watts / W/kg under it, the change
  on the go before as a chip, and a bar where the best go is the longest. Each
  previous edition is a button: tapping it opens THAT day's board in place of
  this one (onOpenWorkout), so a run of results can be walked back through.
  "Same piece" is decided by fingerprint, not by the coach's wording — a 2K is
  a 2K whether it was typed as "2k test" or "2000m".

  All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { ergPhotoUrl } from "@/lib/varsity/ergPhotos";
import { secToClock, secToSplit, deriveWatts, wattsPerKg } from "@/lib/varsity/ergMath";
import { sessionLabel } from "@/lib/varsity/coachPlan";
import {
  initialsOf,
  metricMeta,
  metricValue,
  metricDisplay,
  type PastPiece,
  type PieceKind,
  type MetricKey,
  type TeamWorkout,
} from "@/lib/varsity/teamBoard";
import type { TeamResult } from "@/lib/varsity/resultsStore";
import Delta from "@/components/varsity/team/Delta";
import { IconStar, IconChevronRight } from "@/components/icons";

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
  workout,
  history,
  kind,
  onClose,
  onOpenWorkout,
}: {
  result: TeamResult;
  workout: TeamWorkout;
  /* Every go this squad has had at the same piece, newest first, INCLUDING the
     one on screen — so the run reads as one story rather than "today" and "some
     other times". */
  history: PastPiece[];
  /* Whether the piece fixed the distance (a 2K) or the time (a 30'): decides
     which number IS the result in the comparison — time on the one, metres on
     the other. */
  kind: PieceKind;
  onClose: () => void;
  /* Open a previous edition's board in place of this one. */
  onOpenWorkout?: (dayKey: string) => void;
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

  const dateLabel = `${workout.dateLabel} · ${workout.period} · ${
    workout.session.description.trim() || sessionLabel(workout.session)
  }`;
  // This person's every go at the piece, newest first. The result compared is
  // the piece's OWN — time on a distance piece, metres on a timed one — not the
  // metric the board happens to be sorted by, so the comparison reads the same
  // whichever pill is lit. Each edition carries its change on the go before,
  // and a bar length where the best go is the longest.
  const primary: MetricKey = kind === "distance" ? "time" : "distance";
  const editions = useMemo(() => {
    const lowerIsBetter = metricMeta(primary).lowerIsBetter;
    const mine = history
      .map((p) => ({ workout: p.workout, mine: p.results.find((r) => r.athleteId === result.athleteId) }))
      .filter((e): e is { workout: TeamWorkout; mine: TeamResult } => !!e.mine)
      .sort((a, b) => b.workout.date.getTime() - a.workout.date.getTime());
    const values = mine.map((e) => metricValue(e.mine, primary));
    const known = values.filter((v): v is number => v != null);
    const bestValue = known.length ? (lowerIsBetter ? Math.min(...known) : Math.max(...known)) : null;
    const worstValue = known.length ? (lowerIsBetter ? Math.max(...known) : Math.min(...known)) : null;
    const span = bestValue != null && worstValue != null ? Math.abs(worstValue - bestValue) : 0;
    return mine.map((e, i) => {
      const value = values[i];
      const prev = values[i + 1] ?? null; // the go before = the next, older, one
      return {
        ...e,
        value,
        display: metricDisplay(value, primary),
        improvement:
          value != null && prev != null ? (lowerIsBetter ? prev - value : value - prev) : null,
        best: value != null && value === bestValue,
        // 40%–100%: the best go fills the row, the worst sits at 40%, so a
        // tight run of results still reads as tight.
        frac:
          value != null && bestValue != null && span > 0.01
            ? 1 - 0.6 * (Math.abs(value - bestValue) / span)
            : 1,
      };
    });
  }, [history, result.athleteId, primary]);
  const thisEdition = editions.find((e) => e.workout.dayKey === workout.dayKey) ?? null;
  const bestEdition = editions.find((e) => e.best) ?? null;
  const firstEdition = editions[editions.length - 1] ?? null;
  const vsFirst =
    thisEdition && firstEdition && thisEdition !== firstEdition && thisEdition.value != null && firstEdition.value != null
      ? metricMeta(primary).lowerIsBetter
        ? firstEdition.value - thisEdition.value
        : thisEdition.value - firstEdition.value
      : null;

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

      {/* am I getting faster — this person's every go at the piece */}
      {editions.length > 1 && (
        <>
          <div className="mb-2 mt-4 flex items-baseline justify-between px-0.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Compared with previous
            </span>
            <span className="text-[11px] text-muted">
              {editions.length} × this piece
            </span>
          </div>

          {/* the headline: this go against the last one and against the first,
              and the best they have ever done it in */}
          {thisEdition && (
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-xl border border-border bg-surface-2 px-2 py-2.5 text-center">
                <div className="flex justify-center">
                  {thisEdition.improvement != null ? (
                    <Delta improvement={thisEdition.improvement} metric={primary} size="lg" />
                  ) : (
                    <span className="text-[13px] font-semibold text-muted">—</span>
                  )}
                </div>
                <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                  vs last time
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 px-2 py-2.5 text-center">
                <div className="flex justify-center">
                  {vsFirst != null ? (
                    <Delta improvement={vsFirst} metric={primary} size="lg" />
                  ) : (
                    <span className="text-[13px] font-semibold text-muted">—</span>
                  )}
                </div>
                <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                  vs first · {editions[editions.length - 1].workout.dateLabel.replace(/^\w{3} /, "")}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-surface-2 px-2 py-2.5 text-center">
                <div className="flex items-center justify-center gap-1 text-[15px] font-semibold leading-none tabular-nums text-text">
                  <span className="text-accent">
                    <IconStar size={12} />
                  </span>
                  {bestEdition ? bestEdition.display : "—"}
                </div>
                <div className="mt-1.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Best{bestEdition && bestEdition.workout.dayKey !== workout.dayKey ? ` · ${bestEdition.workout.dateLabel}` : bestEdition ? " · this one" : ""}
                </div>
              </div>
            </div>
          )}

          {/* every edition, newest first: the piece's own result big, the rest
              of the numbers under it, the change on the go before, and a bar —
              the longest bar is the best go. Tap one to open that day's board. */}
          <div className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
            {editions.map((e, i) => {
              const current = e.workout.dayKey === workout.dayKey;
              const canOpen = !current && !!onOpenWorkout;
              const eSplit = e.mine.splitSec;
              const eWatts = deriveWatts(e.mine.watts, eSplit);
              const eWkg = wattsPerKg(eWatts, e.mine.weightKg);
              const secondary = [
                eSplit != null ? `${secToSplit(eSplit, true)} /500m` : null,
                e.mine.strokeRate != null ? `r${e.mine.strokeRate}` : null,
                eWatts != null ? `${Math.round(eWatts)} W` : null,
                eWkg != null ? `${eWkg.toFixed(2)} W/kg` : null,
              ]
                .filter(Boolean)
                .join(" · ");
              const Row = canOpen ? "button" : "div";
              return (
                <Row
                  key={e.workout.dayKey}
                  {...(canOpen
                    ? { type: "button" as const, onClick: () => onOpenWorkout!(e.workout.dayKey) }
                    : {})}
                  className={`block w-full px-3 py-2.5 text-left ${i > 0 ? "border-t border-border" : ""} ${
                    current ? "bg-primary-tint" : canOpen ? "active:bg-surface-2" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[12px] text-text">
                        <span className="truncate font-medium">{e.workout.dateLabel}</span>
                        {current && (
                          <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            this one
                          </span>
                        )}
                        {e.best && (
                          <span className="flex flex-shrink-0 items-center gap-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                            <IconStar size={10} /> Best
                          </span>
                        )}
                      </div>
                      {secondary && (
                        <div className="mt-0.5 truncate text-[11px] tabular-nums text-muted">{secondary}</div>
                      )}
                    </div>
                    <span className="flex-shrink-0 text-[15px] font-semibold tabular-nums text-text">
                      {e.display}
                    </span>
                    {e.improvement != null ? (
                      <Delta improvement={e.improvement} metric={primary} />
                    ) : (
                      <span className="w-[62px] flex-shrink-0 text-center text-[11px] text-muted">first</span>
                    )}
                    {canOpen && (
                      <span className="flex-shrink-0 text-muted">
                        <IconChevronRight size={14} />
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className={`h-full rounded-full ${e.best ? "bg-success" : current ? "bg-primary" : "bg-muted"}`}
                      style={{ width: `${Math.round(e.frac * 100)}%` }}
                    />
                  </div>
                </Row>
              );
            })}
          </div>
          {/* NO CAPTION UNDER THIS LIST (owner, 2026-09-06: "u toho comparison
              bych nedaval ty dlouhe explanation je to docela jasne"). Three
              sentences used to sit here saying that the longest bar is the best
              go, that each change is against the go before, that a row can be
              tapped, and what "same piece" means. The rower reading it has the
              dates, the numbers and the bars in front of them and can see all
              of that — the paragraph was the app explaining itself. */}
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
