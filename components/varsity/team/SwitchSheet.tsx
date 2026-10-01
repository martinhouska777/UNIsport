"use client";

/*
  SWITCH — who rows what in this piece (coach console only).
  ---------------------------------------------------------------------------
  The seat race, built into the race piece (owner, 2026-10-01). Tap one rower,
  then a rower in ANOTHER boat of the SAME class — only those light up, because
  boats of different classes cannot be compared — and the two change places.
  They stay in each other's boats in every piece after this one until somebody
  moves them again (raceSwitch.ts), so nothing is typed twice. Whoever sits in
  a different boat than in the piece before is drawn red, the board's own red
  for a switch. Undo takes the last one back; tapping the same two seats again
  does the same.

  Nothing here is saved by a button: every switch is written as it is made,
  like the times are. All colours are theme tokens.
*/
import { useState } from "react";
import Sheet from "@/components/varsity/Sheet";
import { COX_COLOR, COX_INK, COX_LABEL } from "@/lib/varsity/coachLineup";
import {
  classTitle,
  crewMembers,
  crewsInClassOrder,
  crewTime,
  formatClock,
  type RaceCrew,
  type RaceDay,
} from "@/lib/varsity/racePieces";
import { folkOf, switchRowers, switchedIn, type BoatOf, type Seat } from "@/lib/varsity/raceSwitch";

export default function SwitchSheet({
  day,
  k,
  boatOf,
  onChange,
  onClose,
}: {
  day: RaceDay;
  /** The piece being arranged (0-based). */
  k: number;
  boatOf?: BoatOf;
  /** The day with the switch made — the board writes it, like a time. */
  onChange: (next: RaceDay) => void;
  onClose: () => void;
}) {
  const piece = day.pieces[k];
  const [first, setFirst] = useState<Seat | null>(null);
  /* The switches made while this sheet has been open, for Undo. */
  const [made, setMade] = useState<[Seat, Seat][]>([]);
  if (!piece) return null;

  const red = switchedIn(day, k, boatOf);
  const firstCrew = first ? piece.crews.find((c) => c.boatId === first.boatId) : undefined;

  const tap = (boatId: string, index: number) => {
    if (first && first.boatId === boatId && first.index === index) return setFirst(null);
    const crew = piece.crews.find((c) => c.boatId === boatId);
    const canPair = first && firstCrew && crew && first.boatId !== boatId && firstCrew.badge === crew.badge;
    if (canPair) {
      const next = switchRowers(day, k, first, { boatId, index });
      if (next) {
        onChange(next);
        setMade([...made, [first, { boatId, index }]]);
        setFirst(null);
        return;
      }
    }
    // Anything else is just a different first pick.
    setFirst({ boatId, index });
  };

  const undo = () => {
    const last = made[made.length - 1];
    if (!last) return;
    const next = switchRowers(day, k, last[0], last[1]);
    if (next) onChange(next);
    setMade(made.slice(0, -1));
    setFirst(null);
  };

  // Class by class, as the board draws them.
  const groups: { badge: string; crews: RaceCrew[] }[] = [];
  for (const c of crewsInClassOrder(piece.crews)) {
    const g = groups[groups.length - 1];
    if (g && g.badge === c.badge) g.crews.push(c);
    else groups.push({ badge: c.badge, crews: [c] });
  }

  return (
    <Sheet full title={`${piece.name} · switch`} onClose={onClose}>
      {made.length > 0 && (
        <div className="mb-1 flex justify-end">
          <button
            type="button"
            onClick={undo}
            className="tap44 rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12px] font-medium text-text"
          >
            Undo
          </button>
        </div>
      )}

      {groups.map((g) => (
        <div key={g.badge} className="mb-4">
          <div className="mb-1.5">
            <span className="inline-flex rounded-md bg-text px-2 py-0.5 font-mono text-[12px] font-semibold text-background">
              {classTitle(g.badge)}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {g.crews.map((c) => {
              const { cox } = crewMembers(c);
              const folk = folkOf(c, boatOf?.(c));
              const time = crewTime(c);
              /* A coxless crew the sheet names by its rowers needs no heading:
                 the names are right under it. */
              const heading = cox ?? (c.label === folk.map((f) => f.name).join("/") ? "" : c.label);
              return (
                <div key={c.boatId} className="rounded-2xl border border-border bg-surface p-3 shadow-card">
                  <div className="mb-2 flex min-h-[18px] items-center gap-2">
                    <span className="flex min-w-0 flex-1 items-center gap-1.5">
                      {heading && <span className="truncate text-[13px] font-semibold text-text">{heading}</span>}
                      {cox && (
                        <span
                          className="flex h-[16px] flex-shrink-0 items-center rounded-[4px] px-[5px] font-mono text-[9px] font-semibold tracking-[0.06em]"
                          style={{ background: COX_COLOR, color: COX_INK }}
                        >
                          {COX_LABEL}
                        </span>
                      )}
                    </span>
                    {time != null && (
                      <span className="flex-shrink-0 font-mono text-[12px] tabular-nums text-muted">{formatClock(time)}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {folk.map((f, i) => {
                      const isFirst = !!first && first.boatId === c.boatId && first.index === i;
                      const isTarget = !!first && !!firstCrew && first.boatId !== c.boatId && firstCrew.badge === c.badge;
                      const dimmed = !!first && !isFirst && !isTarget;
                      const switched = red.has(f.key);
                      /* One border colour, chosen once: a rower you can pick
                         as the partner gets the ink, and a switched-in one
                         keeps its red. */
                      const border = isTarget ? (switched ? "border-danger" : "border-text") : switched ? "border-danger-line" : "border-border";
                      return (
                        <button
                          key={`${f.key}:${i}`}
                          type="button"
                          onClick={() => tap(c.boatId, i)}
                          aria-pressed={isFirst}
                          aria-label={`${f.name}, ${heading || c.label}${switched ? ", switched in" : ""}`}
                          className={`tap44 flex min-h-10 min-w-0 max-w-full items-center rounded-xl border px-3 text-[13px] transition-opacity ${border} ${
                            switched
                              ? "bg-danger-tint font-semibold text-danger"
                              : "bg-surface-2 font-medium text-text"
                          } ${isFirst ? "ring-2 ring-text ring-offset-2 ring-offset-surface" : ""} ${dimmed ? "opacity-40" : ""}`}
                        >
                          <span className="truncate">{f.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </Sheet>
  );
}
