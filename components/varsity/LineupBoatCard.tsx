"use client";

/*
  ONE BOAT, drawn the same everywhere — Home, the session card, and All boats.
  ---------------------------------------------------------------------------
  THE BOAT IS DRAWN AS A BOAT. One hull, rounded at both ends, with the seats
  stacked inside it bow → stroke and the COX SEATED INSIDE at the stern, under
  the stroke divider — which is where a cox actually sits. Before this the seats
  were a plain list and the cox was stranded below the boat entirely.

  Reading it top to bottom is reading the boat from the bow, which is the order
  the coach's builder shows and the order the sheet on the boathouse wall is
  written in. An athlete finding their name in both should never have to read
  one of them upside down.

  Each row is: seat number, name, and the SIDE that person rows — port red,
  starboard green, both blue. Those three are per-athlete identity colours from
  a data file (lib/varsity/coachLineup → sideMeta), applied inline: the
  documented exception to rule 1. Everything else is a theme token.

  The card still COLLAPSES. Shut, its header answers the two questions somebody
  has walking to the boathouse — which boat, and which seat — without opening
  anything. Which boat is answered by the coach's own name for it, or failing
  that by the cox, or the stroke (lib/varsity/home → boatTitle).
*/
import { useState } from "react";
import CrewVideoStrip from "@/components/varsity/CrewVideoStrip";
import { IconChevronDown, IconChevronUp } from "@/components/icons";
import { sideMeta, COX_COLOR, COX_INK, COX_TAG, COX_LABEL } from "@/lib/varsity/coachLineup";
import { boatTitle, type Lineup, type Seat } from "@/lib/varsity/home";

/* Is this the reader's own boat? Their seat, or the cox's seat, is marked when
   the lineup is built (lib/varsity/lineupStore.ts). */
export function isMyBoat(l: Lineup): boolean {
  return l.seats.some((s) => s.mine) || !!l.cox?.mine;
}

/** "5", or "Cox" — whichever seat is theirs. Null when they are not aboard. */
export function mySeat(l: Lineup): string | null {
  const seat = l.seats.find((s) => s.mine);
  if (seat) return seat.num;
  return l.cox?.mine ? "Cox" : null;
}

/** An empty seat reads as empty however the coach left it. */
const isOpen = (name: string) => !name || name === "—";

/* ── The pieces of a row ─────────────────────────────────────────────────── */

/** The number in the boat: 1 at the bow, up to the stroke. Filled when it's you. */
function SeatChip({ label, mine, cox }: { label: string; mine?: boolean; cox?: boolean }) {
  return (
    <span
      className={`flex h-[23px] w-[23px] flex-shrink-0 items-center justify-center rounded-[7px] border font-mono text-[12px] font-semibold ${
        mine
          ? "border-primary bg-primary text-primary-contrast"
          : cox
            ? "border-transparent"
            : "border-border bg-surface-2 text-text-2"
      }`}
      style={cox && !mine ? { background: COX_COLOR, color: COX_INK } : undefined}
    >
      {label}
    </span>
  );
}

/** Port / starboard / both, in that side's own colour. */
function SidePill({ side }: { side: keyof typeof sideMeta }) {
  const meta = sideMeta[side];
  return (
    <span
      className="flex h-[21px] flex-shrink-0 items-center rounded-md px-[7px] font-mono text-[10px] font-semibold tracking-[0.06em]"
      style={{ background: meta.color, color: meta.ink }}
      title={meta.label}
    >
      {meta.tag}
    </span>
  );
}

/* ── One seat in the hull ────────────────────────────────────────────────── */

function SeatRow({ seat }: { seat: Seat }) {
  const open = isOpen(seat.name);
  if (seat.mine) {
    /* YOUR SEAT. Taller, ringed and filled — on a sheet of nine names it has to
       be findable without reading any of the other eight. */
    return (
      <div className="flex h-11 items-center gap-2 rounded-[11px] border-2 border-primary bg-primary-tint pl-[6px] pr-2.5">
        <SeatChip label={seat.num} mine />
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-text">
          {seat.name}
        </span>
        <span className="flex-shrink-0 font-mono text-[10px] font-semibold tracking-[0.1em] text-text">
          YOU
        </span>
        {seat.side && <SidePill side={seat.side} />}
      </div>
    );
  }
  return (
    <div
      className={`flex h-10 items-center gap-2 rounded-[10px] border pl-[7px] pr-2.5 ${
        open ? "border-dashed border-border bg-transparent" : "border-border bg-surface"
      }`}
    >
      <SeatChip label={seat.num} />
      <span
        className={`min-w-0 flex-1 truncate ${
          open ? "text-[15px] text-muted" : "text-[16px] font-medium text-text"
        }`}
      >
        {open ? "Open seat" : seat.name}
      </span>
      {!open && seat.side && <SidePill side={seat.side} />}
    </div>
  );
}

/* ── The cox, seated inside the hull at the stern ────────────────────────── */

function CoxRow({ cox }: { cox: NonNullable<Lineup["cox"]> }) {
  const open = isOpen(cox.name);
  if (cox.mine) {
    return (
      <div className="flex h-11 items-center gap-2 rounded-[11px] border-2 border-primary bg-primary-tint pl-[6px] pr-2.5">
        <SeatChip label={COX_TAG} mine />
        <span className="min-w-0 flex-1 truncate text-[16px] font-semibold text-text">
          {cox.name}
        </span>
        <span className="flex-shrink-0 font-mono text-[10px] font-semibold tracking-[0.1em] text-text">
          YOU
        </span>
        <span
          className="flex h-[21px] flex-shrink-0 items-center rounded-md px-[7px] font-mono text-[10px] font-semibold tracking-[0.06em]"
          style={{ background: COX_COLOR, color: COX_INK }}
        >
          {COX_LABEL}
        </span>
      </div>
    );
  }
  return (
    <div
      className={`flex h-10 items-center gap-2 rounded-[10px] border pl-[7px] pr-2.5 ${
        open ? "bg-transparent" : "bg-surface"
      }`}
      style={{ borderColor: COX_COLOR, borderStyle: open ? "dashed" : "solid" }}
    >
      {open ? (
        <span
          className="flex h-[23px] w-[23px] flex-shrink-0 items-center justify-center rounded-[7px] border font-mono text-[12px] font-semibold"
          style={{ borderColor: COX_COLOR, color: COX_COLOR }}
        >
          {COX_TAG}
        </span>
      ) : (
        <SeatChip label={COX_TAG} cox />
      )}
      <span
        className={`min-w-0 flex-1 truncate ${
          open ? "text-[15px] text-muted" : "text-[16px] font-medium text-text"
        }`}
      >
        {open ? "No cox yet" : cox.name}
      </span>
      <span
        className="flex h-[21px] flex-shrink-0 items-center rounded-md px-[7px] font-mono text-[10px] font-semibold tracking-[0.06em]"
        style={
          open
            ? { color: COX_COLOR, boxShadow: `inset 0 0 0 1px ${COX_COLOR}` }
            : { background: COX_COLOR, color: COX_INK }
        }
      >
        {COX_LABEL}
      </span>
    </div>
  );
}

/* ── The hull ────────────────────────────────────────────────────────────── */

/** The bow and stern caps: which end of the boat you are looking at. */
function HullCap({ arrow, word }: { arrow: string; word: string }) {
  return (
    <div className="flex h-[30px] items-center justify-center gap-[7px] font-mono text-[11px] font-semibold tracking-[0.16em] text-text-2">
      <span className="text-[12px] leading-none">{arrow}</span>
      {word}
    </div>
  );
}

/*
  THE BOAT. One outline around the whole crew, deeply rounded at both ends, with
  the cox inside it under the stroke divider. Every row keeps the same width —
  the 44px corner and the hull's own side padding are what hold them inside the
  outline, so no row has to be drawn narrower than its neighbour to look seated.
*/
export function LineupSeats({ l }: { l: Lineup }) {
  return (
    <div className="rounded-[44px] border-2 border-text-2 bg-surface-2 px-4 pb-3 pt-2.5">
      <HullCap arrow="▲" word="BOW" />
      <div className="flex flex-col gap-1">
        {l.seats.map((s) => (
          <SeatRow key={s.num} seat={s} />
        ))}
      </div>
      {l.cox && (
        <>
          {/* The stroke divider — one rule, no words. Everything below it is
              the stern of the boat, which is where the cox sits. */}
          <div className="px-1.5 pb-[3px] pt-1">
            <div className="h-[1.5px] rounded-[1px] bg-muted" />
          </div>
          <CoxRow cox={l.cox} />
        </>
      )}
      <HullCap arrow="▼" word="STROKE" />
    </div>
  );
}

/* ── What is written under the hull ──────────────────────────────────────── */

/** BOAT → Resolute, OARS → Blue set. One label column, so the two line up. */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-h-[46px] items-center gap-2 rounded-[11px] border border-border bg-surface px-[11px]">
      <span className="w-11 flex-shrink-0 font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
        {label}
      </span>
      <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-text">{value}</span>
    </div>
  );
}

/* ── The card ────────────────────────────────────────────────────────────── */

export default function LineupBoatCard({
  l,
  defaultOpen = false,
}: {
  l: Lineup;
  /* Your own boat on Home opens itself — it is the thing you came to look at.
     A page listing every boat opens none of them, or it is the same wall of
     names this was built to end. */
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const seat = mySeat(l);
  const seated = l.seats.filter((s) => !isOpen(s.name)).length + (l.cox && !isOpen(l.cox.name) ? 1 : 0);
  const { title, tag } = boatTitle(l);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold text-text">{title}</span>
            {/* Whose name this is, when it is a person's rather than a boat's. */}
            {tag && (
              <span className="flex-shrink-0 rounded border border-border bg-surface-2 px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
                {tag}
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[11px] text-muted">
            {/* Shut, this line has to be worth reading on its own — which half
                of the day, when it pushes off, and whether you are in it. The
                TIME lives here rather than beside the note, because a boat
                without a note still leaves at a quarter past seven. */}
            {[l.period, l.dock, seat ? `Your seat · ${seat}` : `${seated} aboard`]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </span>
        <span className="flex-shrink-0 text-muted">
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <>
          <div className="flex flex-col gap-2.5 border-t border-border p-3">
            {/* THE COACH'S NOTE TO THIS CREW, on top — it is the one thing that
                changes what you do before you have even read the seats. */}
            {l.note && (
              <div className="rounded-xl bg-surface-2 px-3 py-2.5 text-[15px] leading-snug text-text">
                {l.note}
              </div>
            )}
            <LineupSeats l={l} />
            {/*
              The shell's name is NOT repeated here — the card's own header is
              already the boat's name whenever the coach gave it one. Which oars
              to take off the rack is the one thing left to say.
            */}
            {l.oars && <InfoRow label="OARS" value={l.oars} />}
          </div>
          {/*
            VIDEO of this boat — the same strip the coach has in the builder,
            because it is often an athlete who filmed. Attached here, a clip
            lands on the Home screen of everyone who was in the boat, already
            named and already carrying its seats. Only a boat read from the
            database has one (the demo day has no real crew to file against).
          */}
          {l.dayKey && l.boat && <CrewVideoStrip dayKey={l.dayKey} boat={l.boat} />}
        </>
      )}
    </div>
  );
}
