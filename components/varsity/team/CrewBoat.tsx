"use client";

import { IconSwap } from "@/components/icons";
import { COX_COLOR, COX_INK, COX_LABEL } from "@/lib/varsity/coachLineup";
import { crewMembers, switchPairs, type RaceCrew } from "@/lib/varsity/racePieces";
import { folkOf, nameKey } from "@/lib/varsity/raceSwitch";

/*
  THE CREW, DRAWN AS ITS BOAT. The names run ACROSS the row and wrap onto a
  second line when they run out of width — the stacked column they used to
  sit in left most of the row empty (owner, 2026-09-21). A coxed boat is
  named by its cox, the sheet's way, with the cox's yellow tag; after it
  every rower in a bordered chip, stroke first. A pair has no cox and no
  title: it IS its two chips. The note ("Bridge") is the last chip, dashed,
  so a remark never looks like a rower.
*/
/* A switch under its crew: who changed places with whom, and — for the coach
   — what the times said about it. */
export type SwitchChip = { left: string; right: string; said?: string };

const SWITCH_CHIP =
  "inline-flex min-h-[24px] max-w-full flex-wrap items-center gap-x-1.5 rounded-[6px] border border-danger-line bg-danger-tint px-2 py-0.5 text-[12px] font-semibold text-danger";

export default function CrewBoat({
  crew,
  dim = false,
  red,
  chips,
  covered,
}: {
  crew: RaceCrew;
  dim?: boolean;
  /** Keys of the rowers who sat in another boat in the piece before this one — drawn red. */
  red?: Set<string>;
  /** The switches made after this piece that this crew carries (see switchChips). */
  chips?: SwitchChip[];
  /** Every name in this piece's switches, so a typed note that says the same thing is not drawn twice. */
  covered?: Set<string>;
}) {
  const { cox, rowers } = crewMembers(crew);
  const folk = folkOf(crew); // the same rowers, in the same order, with their keys
  const noted = switchPairs(crew.note);
  /* A typed "Switch Dykema/HK" that the crews already show is the same switch;
     one they do not show (it was written but never made) stays as it was. */
  const typed = noted
    ? noted.filter(([a, b]) => !(covered?.has(nameKey(a)) && covered?.has(nameKey(b))))
    : null;
  const chip = (switched: boolean) =>
    `flex h-[22px] min-w-0 max-w-full items-center rounded-[6px] border px-[7px] text-[12px] ${
      switched
        ? "border-danger-line bg-danger-tint font-semibold text-danger"
        : dim
          ? "border-border text-muted"
          : "border-border bg-surface-2 font-medium text-text"
    }`;
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1">
      {cox && (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className={`truncate text-[13px] font-semibold ${dim ? "text-muted" : "text-text"}`}>{cox}</span>
          <span
            className="flex h-[16px] flex-shrink-0 items-center rounded-[4px] px-[5px] font-mono text-[9px] font-semibold tracking-[0.06em]"
            style={{ background: COX_COLOR, color: COX_INK }}
          >
            {COX_LABEL}
          </span>
        </span>
      )}
      {rowers.map((n, i) => {
        const switched = !!red?.has(folk[i]?.key ?? "");
        return (
          <span key={i} className={chip(switched)}>
            {switched && <span className="sr-only">Switched in: </span>}
            <span className="truncate">{n}</span>
          </span>
        );
      })}
      {/* A SWITCH IS RED, WHOLE, AND AN ARROW (owner, 2026-09-27): each pair
          on its own chip on a line of its own — "Richards ⇄ Weldon", the red
          and the two arrows saying "switch" — never cut off, so it reads as
          the change it is, not as a remark. Since 2026-10-01 they are READ
          OUT OF THE CREWS (raceSwitch.ts) rather than typed, and the coach
          also gets what the times said. Any other note stays the quiet dashed
          chip. */}
      {(chips && chips.length > 0) || (typed && typed.length > 0) ? (
        <span className="flex basis-full flex-wrap items-center gap-x-2 gap-y-1 pt-0.5">
          {chips?.map((c, i) => (
            <span key={`s${i}`} className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className={SWITCH_CHIP}>
                <span className="sr-only">Switch:</span>
                <span>{c.left}</span>
                <IconSwap size={13} />
                <span className="sr-only">switches with</span>
                <span>{c.right}</span>
              </span>
              {c.said && <span className="text-[11px] tabular-nums text-muted">{c.said}</span>}
            </span>
          ))}
          {typed?.map(([a, b], i) => (
            <span key={`t${i}`} className={SWITCH_CHIP}>
              <span className="sr-only">Switch:</span>
              <span>{a}</span>
              <IconSwap size={13} />
              <span className="sr-only">switches with</span>
              <span>{b}</span>
            </span>
          ))}
        </span>
      ) : (
        !noted &&
        crew.note && (
          <span className="flex h-[22px] min-w-0 max-w-full items-center rounded-[6px] border border-dashed border-border px-[7px] text-[11px] text-muted">
            <span className="truncate">{crew.note}</span>
          </span>
        )
      )}
      {!cox && rowers.length === 0 && (
        <span className={`text-[13px] font-semibold ${dim ? "text-muted" : "text-text"}`}>{crew.label}</span>
      )}
    </div>
  );
}
