"use client";

/*
  ONE BOAT, drawn the same everywhere — Home and the all-boats page.
  ---------------------------------------------------------------------------
  A published eight is nine rows of names. Three boats is a screen and a half of
  scrolling before you reach anything else, which is why Home now shows only the
  boat you are in and sends the rest to their own page.

  So the card COLLAPSES. Shut, it still answers the two questions somebody has
  walking to the boathouse — which boat, and which seat — from its header alone.
  Open, it is the full sheet: bow at the top, down to the stroke, cox last, the
  order the coach's own builder shows and the order the sheet on the boathouse
  wall is written in. An athlete finding their name in both should not have to
  read one of them upside down.
*/
import { useState } from "react";
import CrewVideoStrip from "@/components/varsity/CrewVideoStrip";
import { IconAnchor, IconChevronDown, IconChevronUp } from "@/components/icons";
import type { Lineup } from "@/lib/varsity/home";

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

function SeatRow({
  label,
  name,
  mine,
  cox,
}: {
  label: string;
  name: string;
  mine?: boolean;
  cox?: boolean;
}) {
  const open = name === "—" || name === "";
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${
        mine
          ? "border-primary bg-primary-tint"
          : cox
            ? "border-accent-line bg-accent-tint"
            : "border-border bg-surface-2"
      }`}
    >
      <span
        className={`flex h-6 w-14 flex-shrink-0 items-center justify-center rounded text-[11px] font-semibold uppercase tracking-[0.12em] ${
          cox
            ? "bg-accent-tint text-accent"
            : mine
              ? "bg-primary-tint text-primary"
              : "bg-background text-muted"
        }`}
      >
        {label}
      </span>
      <span
        className={`flex-1 truncate text-[13px] font-medium ${
          mine ? "text-primary" : open ? "italic text-text-3" : "text-text"
        }`}
      >
        {open ? "Open seat" : name}
      </span>
      {mine && (
        <span className="flex-shrink-0 rounded bg-text px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-background">
          You
        </span>
      )}
    </div>
  );
}

/* The seats on their own, for the boat that opens inside a session card. */
export function LineupSeats({ l }: { l: Lineup }) {
  return (
    <div className="flex flex-col gap-1.5">
      {l.seats.map((s) => (
        <SeatRow key={s.num} label={s.num} name={s.name} mine={s.mine} />
      ))}
      {l.cox && <SeatRow label="Cox" name={l.cox.name} mine={l.cox.mine} cox />}
    </div>
  );
}

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
  const seated = l.seats.filter((s) => s.name && s.name !== "—").length + (l.cox ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[12px] font-semibold text-text">{l.period}</span>
          <span className="block text-[11px] text-muted">
            {/* Shut, this line has to be worth reading on its own. */}
            {seat ? `Your seat · ${seat}` : `${l.type} · ${seated} aboard`}
          </span>
        </span>
        <span className="flex-shrink-0 text-muted">
          {open ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </span>
      </button>

      {open && (
        <>
          <div className="border-t border-border p-3">
            <LineupSeats l={l} />
          </div>
          {/* Which oars to take off the rack, when the coach named a set. */}
          {l.oars && (
            <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-muted">
              <IconAnchor size={13} />
              <span className="text-text">{l.oars}</span>
            </div>
          )}
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
