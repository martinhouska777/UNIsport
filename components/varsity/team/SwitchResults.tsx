"use client";

/*
  THE DAY'S SWITCHES — who beat whom (coach console only).
  ---------------------------------------------------------------------------
  One card per switch, in the order they happened: the class and the two
  pieces it was made between, then the answer — "HK beat Dykema · 1.1 s".

  A tap opens THE FOUR BOATS the answer comes from (owner, 2026-10-01: "delete
  the small text… do a dropdown where you will directly see the 4 boats — a
  switch between 2 boats has 4 combinations"): the two crews before the
  switch and the same two boats after it, each with its time and its gap, the
  rowers who changed places in red. Each piece lists its boats in finishing
  order, numbered 1 and 2 like the board (owner, same day: keeping one order
  in both pieces "looks strange" — the first boat is always on top). It
  replaced a line of words that said the same thing ("Grundy was 1.5 s down
  on Scott, then 2.6 s down").

  A switch the times cannot score shows a dash instead of guessing; its boats
  say why (a time missing, or other changes in the same boats — raceSwitch.ts).
  Results are the coach's: a rower never opens this tab. Theme tokens only.

  Opened from the coach's list of seat races (TeamRanking), the race that was
  tapped there wears the school's colour round it and is scrolled into view.
*/
import { useEffect, useRef, useState } from "react";
import { IconChevronDown, IconSwap } from "@/components/icons";
import CrewBoat from "@/components/varsity/team/CrewBoat";
import RankBadge from "@/components/varsity/team/RankBadge";
import { rosterById } from "@/lib/varsity/coachLineup";
import { classTitle, crewTime, formatClock, formatMargin, type RacePiece } from "@/lib/varsity/racePieces";
import { folkNames, secs, type Switch } from "@/lib/varsity/raceSwitch";

const fullName = (id: string) => rosterById[id]?.name;

/* The header row of a list — the same as the board's. */
const TH = "text-[9px] font-semibold uppercase tracking-[0.1em] text-muted";

/** One piece of a switch: its two boats in finishing order, with place, time and gap.
    A boat with no time yet comes last, with no place. */
function PieceBoats({ piece, boats, red }: { piece: RacePiece | undefined; boats: [string, string]; red: Set<string> }) {
  const rows = boats
    .map((id) => piece?.crews.find((c) => c.boatId === id))
    .filter((c) => c != null)
    .map((c) => ({ c, time: crewTime(c) }))
    .sort((a, b) => (a.time ?? Infinity) - (b.time ?? Infinity));
  const crews = rows.map((r) => r.c);
  const times = rows.map((r) => r.time);
  const best = times.every((t) => t != null) ? Math.min(...(times as number[])) : null;
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className={`grid grid-cols-[1.25rem_minmax(0,1fr)_4.4rem_3.9rem] gap-1.5 border-b border-border px-2.5 py-1.5 ${TH}`}>
        <span className="col-span-2">{piece?.name}</span>
        <span className="text-right">Time</span>
        <span className="text-right">To 1st</span>
      </div>
      {crews.map((c, i) => (
        <div
          key={c.boatId}
          className={`grid grid-cols-[1.25rem_minmax(0,1fr)_4.4rem_3.9rem] items-center gap-1.5 px-2.5 py-2 ${
            i > 0 ? "border-t border-border" : ""
          } ${best != null && times[i] === best ? "bg-surface-2" : ""}`}
        >
          {times[i] != null ? <RankBadge rank={times[i] === times[0] ? 1 : i + 1} /> : <span />}
          <CrewBoat crew={{ ...c, note: "" }} red={red} dim={times[i] == null} />
          {times[i] != null ? (
            <span className="text-right text-[13px] font-semibold tabular-nums text-text">{formatClock(times[i])}</span>
          ) : (
            <span className="text-right text-[11px] text-muted">no time yet</span>
          )}
          <span className="text-right text-[12px] tabular-nums text-muted">
            {best != null && times[i] !== best ? formatMargin((times[i] as number) - best) : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function SwitchResults({
  switches,
  pieces,
  focus,
}: {
  switches: Switch[];
  pieces: RacePiece[];
  /** The switch to outline, by its place in `switches`. */
  focus?: number;
}) {
  const focused = useRef<HTMLDivElement>(null);
  useEffect(() => {
    focused.current?.scrollIntoView({ block: "center" });
  }, []);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const toggle = (n: number) =>
    setOpen((was) => {
      const next = new Set(was);
      if (!next.delete(n)) next.add(n);
      return next;
    });
  return (
    <div className="mt-3 flex flex-col gap-2">
      {switches.map((s, n) => {
        const mine = folkNames(s.moved[0], s.moved[1], fullName);
        const theirs = folkNames(s.moved[1], s.moved[0], fullName);
        const r = s.result;
        const shown = open.has(n);
        // Everyone who changed boats, red in all four crews: leaving before, arrived after.
        const red = new Set([...s.moved[0], ...s.moved[1]].map((f) => f.key));
        return (
          <div
            key={n}
            ref={n === focus ? focused : undefined}
            className={`rounded-2xl border bg-surface shadow-card ${
              n === focus ? "border-primary ring-1 ring-primary" : "border-border"
            }`}
          >
            <button
              type="button"
              onClick={() => toggle(n)}
              aria-expanded={shown}
              className="block w-full px-3.5 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-[11px] text-muted">
                <span className="rounded-md bg-text px-1.5 py-0.5 font-mono text-[11px] font-semibold text-background">
                  {classTitle(s.badge)}
                </span>
                <span className="min-w-0 truncate">
                  {pieces[s.piece]?.name} → {pieces[s.piece + 1]?.name}
                </span>
              </span>

              <span className="mt-2 flex items-center gap-3">
                <span className="min-w-0 flex-1 text-[14px] text-text">
                  {r.kind === "won" ? (
                    <>
                      <span className="font-semibold">{folkNames(r.winners, r.losers, fullName)}</span>
                      <span className="text-muted"> beat </span>
                      {folkNames(r.losers, r.winners, fullName)}
                    </>
                  ) : (
                    <span className="inline-flex flex-wrap items-center gap-x-1.5 font-semibold text-danger">
                      {mine}
                      <IconSwap size={13} />
                      {theirs}
                    </span>
                  )}
                </span>
                <span className="flex-shrink-0 text-[14px] font-semibold tabular-nums text-text">
                  {r.kind === "won" ? `${secs(r.by)} s` : r.kind === "level" ? "Level" : "—"}
                </span>
                <span className={`flex-shrink-0 text-muted transition-transform ${shown ? "rotate-180" : ""}`}>
                  <IconChevronDown size={14} />
                </span>
              </span>
            </button>

            {shown && (
              <div className="flex flex-col gap-2 px-3.5 pb-3.5">
                <PieceBoats piece={pieces[s.piece]} boats={s.boats} red={red} />
                <PieceBoats piece={pieces[s.piece + 1]} boats={s.boats} red={red} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
