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

  The card COLLAPSES to its title bar: which outing this is ("AM 2-") and when
  it pushes off, and nothing else. Open, it reads in the order a crew needs it —
  the coach's note, the boat, then the two things you carry down to the water:
  which shell, and which oars.
*/
import { useState } from "react";
import CrewVideoStrip from "@/components/varsity/CrewVideoStrip";
import { IconChevronDown, IconChevronUp } from "@/components/icons";
import { sideMeta, COX_COLOR, COX_INK, COX_TAG, COX_LABEL } from "@/lib/varsity/coachLineup";
import { boatHeading, crewName, type Lineup, type Seat } from "@/lib/varsity/home";

/* Is this the reader's own boat? Their seat, or the cox's seat, is marked when
   the lineup is built (lib/varsity/lineupStore.ts). */
export function isMyBoat(l: Lineup): boolean {
  return l.seats.some((s) => s.mine) || !!l.cox?.mine;
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

/* The bow and stern caps: which end of the boat you are looking at. Muted, like
   the outline they sit in — they label the boat, they are not part of the crew. */
function HullCap({ arrow, word }: { arrow: string; word: string }) {
  return (
    <div className="flex h-[30px] items-center justify-center gap-[7px] font-mono text-[11px] font-semibold tracking-[0.16em] text-muted">
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
    /*
      THE OUTLINE IS THE SCHOOL'S OWN COLOUR, DARKENED. It used to be drawn in
      `text-2` — a near-white line on a near-black card, which is the brightest
      thing on the screen and the first thing your eye lands on, ahead of the
      names it exists to contain. `primary-line` is the school's hue at just
      over a third strength, so it reads as a boat wearing the school's paint
      rather than a fluorescent tube. The seat that is YOURS keeps the primary
      at FULL strength, so it still wins the card.
    */
    <div className="rounded-[44px] border-2 border-primary-line bg-surface-2 px-4 pb-3 pt-2.5">
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
  const crew = crewName(l);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      {/*
        THE TITLE BAR, and nothing more in it: which outing this is on the left,
        when it pushes off on the right. "AM 2-" is how a crew says it out loud.
        Everything the header used to also carry — the shell's name, the seat
        count, your own seat — now lives where it belongs: the shell under the
        hull on the BOAT line, and your seat marked in the boat itself.
      */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-3.5 py-3 text-left"
      >
        <span className="flex min-w-0 flex-1 items-baseline gap-2">
          <span className="flex-shrink-0 text-[15px] font-semibold text-text">
            {boatHeading(l)}
          </span>
          {/* WHICH eight, on a morning that sent out three: the coach's name for
              the boat, or the cox's surname, or the stroke's. Quieter than the
              rig — you scan the column for "AM 8+" and land on the name. */}
          {crew && <span className="min-w-0 truncate text-[14px] text-muted">{crew}</span>}
        </span>
        {l.dock && (
          <span className="flex-shrink-0 font-mono text-[13px] font-medium text-text-2">
            {l.dock}
          </span>
        )}
        <span className="flex-shrink-0 text-muted">
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <>
          <div className="flex flex-col gap-2.5 border-t border-border p-3">
            {/* THE COACH'S NOTE TO THIS CREW, first and named — it is the one
                thing that changes what you do before you have even read the
                seats, and unlabelled it read as a stray line of text. */}
            {l.note && (
              <div className="rounded-xl bg-surface-2 px-3 py-2.5">
                <div className="font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
                  COACH&rsquo;S NOTE
                </div>
                <div className="mt-1 text-[15px] leading-snug text-text">{l.note}</div>
              </div>
            )}
            <LineupSeats l={l} />
            {/* Then the two things you carry down to the water: which shell,
                and which oars off the rack. A boat still called "New 8+" has
                not been named, so there is nothing to write on the BOAT line —
                `crewName` returns a person's surname in that case, which is not
                the name painted on the hull. */}
            {l.name && l.name === crew && <InfoRow label="BOAT" value={l.name} />}
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
