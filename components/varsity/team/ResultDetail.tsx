"use client";

/*
  RESULT DETAIL — one person's piece, opened from the board.
  ---------------------------------------------------------------------------
  Two things a ranked row can't show:

    • THE NUMBERS in full — time, distance, split, rate, watts, watts/kg — so
      you don't have to switch the whole board's metric to read one person.
    • THE PHOTO of the monitor, straight under them. Self-reported times are
      worth what people trust them with; the screen the numbers came off is the
      evidence. It is also what makes a misread scan fixable.

  NO REP-BY-REP LIST, NO DATE LINE, NO NAME IN THE TOP BAR (owner, 2026-10-02).
  The rows of 1k splits under a 5k (and their bars) were the monitor's own
  detail screen copied out again — the photo IS that screen, so it now sits
  where they were. The line under the name ("Monday 28 September · PM · 5k erg
  test") repeated the board this was opened from, and the name beside Back
  repeated the name on the page. A result typed in by hand has no photo and
  says nothing about it.

  And the question a single result can never answer on its own: AM I GETTING
  FASTER. Under the piece, with no heading over it, is this ONE person's run of
  it: every go newest first — the result big (time on a 2K, metres on a 30'),
  the split / rate / watts under it, the change on the go before as a
  chip, and a bar where the best go is the longest. Each earlier edition is a
  button: tapping it opens THAT day's board in place of this one
  (onOpenWorkout), so a run of results can be walked back through. "Same piece"
  is decided by fingerprint, not by the coach's wording — a 2K is a 2K whether
  it was typed as "2k test" or "2000m".

  EVERY BAR IS THE SAME COLOUR, on the reps and on the run. Length is the whole
  message: a bar picked out in green or crimson makes the eye read the colour
  first and then need a sentence underneath explaining what the colour meant.
  The word that matters — "Best" — is a word.

  All colours are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { ergPhotoUrl } from "@/lib/varsity/ergPhotos";
import { secToClock, secToSplit, deriveWatts, wattsPerKg } from "@/lib/varsity/ergMath";
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

// White, like every card around it (owner, 2026-10-02) — it was a grey box.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-2.5 py-2.5 text-center">
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
  water = false,
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
  /* A session on the water: no watts anywhere on it, and no line about a
     monitor photo — a boat has neither (teamBoard.ts → onTheWater). */
  water?: boolean;
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
  const splitSec = result.splitSec;
  const watts = deriveWatts(result.watts, splitSec);
  const wkg = wattsPerKg(watts, result.weightKg);

  return (
    <Sheet title="" onClose={onClose} full>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-tint text-[13px] font-semibold text-primary">
          {initialsOf(result.athleteName)}
        </span>
        <div className="min-w-0 truncate text-[14px] font-semibold text-text">
          {result.athleteName || "Unnamed"}
        </div>
      </div>

      {/* the full set of numbers */}
      <div className={`mt-3 grid gap-1.5 ${water ? "grid-cols-2" : "grid-cols-3"}`}>
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
        {!water && <Stat label="Watts" value={watts != null ? String(Math.round(watts)) : "—"} />}
        {!water && <Stat label="W / kg" value={wkg != null ? wkg.toFixed(2) : "—"} />}
      </div>

      {result.note.trim() && (
        <p className="mt-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-[12px] leading-relaxed text-text-2">
          {result.note}
        </p>
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

      {/* am I getting faster — this person's every go at the piece */}
      {editions.length > 1 && (
        <>
          {/* NO HEADING, NO SUMMARY TILES. "Compared with previous · 3 × this
              piece" was a label for a list that says it itself — every go at
              this piece, dated, newest first. The three tiles above it (vs last
              time, vs first, best) were three numbers the list already carries,
              read out a second time. What is left is the run itself. */}
          {/* every edition, newest first: the piece's own result big, the rest
              of the numbers under it, the change on the go before, and a bar —
              the longest bar is the best go. Tap one to open that day's board. */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-border bg-surface">
            {editions.map((e, i) => {
              const current = e.workout.dayKey === workout.dayKey;
              const canOpen = !current && !!onOpenWorkout;
              const eSplit = e.mine.splitSec;
              const eWatts = deriveWatts(e.mine.watts, eSplit);
              const secondary = [
                eSplit != null ? `${secToSplit(eSplit, true)} /500m` : null,
                e.mine.strokeRate != null ? `r${e.mine.strokeRate}` : null,
                !water && eWatts != null ? `${Math.round(eWatts)} W` : null,
                /* No W/kg on these lines (owner, 2026-09-13). */
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
                        {/* No "this one" (owner, 2026-09-13): the row you
                            opened is already tinted. Only "Best" is said. */}
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
                      /* One colour here too — "Best" is already said in
                         words on the row above. */
                      className="h-full rounded-full bg-faint"
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

    </Sheet>
  );
}
