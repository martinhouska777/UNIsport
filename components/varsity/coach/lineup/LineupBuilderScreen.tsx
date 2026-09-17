"use client";

/*
  Coach LINEUP BUILDER (DB-backed).
  Two views:
    • "days"    — pick a practice (a real day's AM or PM) to build. Each shows a
                  status dot (none / draft / published) read from the database.
    • "builder" — fill boats for that practice from the athlete pool. The crew
                  autosaves as a draft; one button publishes it to the team.
                  Loads any existing lineup.

  Seats are live: tap an empty seat to TYPE a name (autocomplete from the pool),
  or DRAG a name from the pool (or another seat) onto a seat. The X clears a seat
  back to the pool. There is ONE roster, so each athlete is in exactly one place.

  SWAPPING IS TWO TAPS, AND THE KEYBOARD STAYS DOWN. Tap a filled seat to
  pick it up (highlighted, no field), then tap any other seat: the two rowers
  trade places (or the first one moves, if the second was empty). Tap the
  same seat again instead and its field opens, to type a name in. The same
  swap holds for a drag onto a filled seat, and for typing a seated rower's
  name into a seat — nobody is ever knocked out of the boat by somebody
  arriving; they go where the newcomer came from. Only a pool name replacing
  a seated one sends anyone back to the pool.
  Lineups persist per practice (day_key) via lib/varsity/lineupStore.ts. Colors
  are theme tokens; rowing-side colors are content colors (rule-1 exception).

  THE BOAT IS DRAWN AS A BOAT — the same hull the ATHLETE reads on their own
  phone (components/varsity/LineupBoatCard), so a coach seating a crew is
  looking at the thing the squad will see. One outline, rounded at both ends,
  ▲ BOW at the top and ▼ STROKE at the bottom, seats stacked inside it 1 at the
  bow up to 8 at the stroke, and the COX SEATED INSIDE at the stern below the
  stroke divider. The cox used to be stranded under the hull entirely.

  A SEAT IS A NUMBER: seat, name, and the SIDE THAT PERSON rows. Under the hull,
  three lines — boat, oars, crew note — which is the column order of the squad's
  own lineup sheet, so a crew can be copied across without reading it backwards.
  (The note used to sit above the crew; it moved down with the redesign.)

  Seats carry no side and no colour of their own, and nothing is ever flagged
  "off side" — how the boat is rigged is the coach's business, not the app's.
  The only rule left in a seat is that a cox does not row and a rower does not
  cox.

  The builder's ‹ › arrows step to the next WATER session in the plan, saving
  anything unsaved on the way out, so a week of outings is seated in one run.

  A PRACTICE WITH NO LINEUP DOES NOT OPEN EMPTY. It opens on the last crew the
  squad was given — the most recent PUBLISHED practice before it — as a draft,
  with a line saying which day it came from and a button to start empty
  instead. Tuesday's eight is Monday's eight minus one person; seating
  twenty-seven names again to change one seat was the reason a coach would
  stop opening this tab. What carries and what does not is decided in
  lib/varsity/coachLineup.ts (carryBoats); which practice it comes from in
  lib/varsity/lineupStore.ts (latestPublishedBefore).

  The POOL is filtered four ways and grouped none: All, Port, Starboard, Cox,
  with the both-sides rowers appearing under both Port and Starboard. The
  UNAVAILABLE list underneath answers the same filter, and each name there
  carries its side as well as the reason it is out.

  WHO IS OUT IS THE COACH'S CALL, MADE HERE. Tap a name in the pool to mark
  them sick (out today) or injured (out until brought back); tap an out name
  to bring them back in. It is written per DAY to lib/varsity/availabilityStore
  — so the AM and PM agree, and an injury marked on Tuesday still holds when
  Friday is seated — and marking someone out empties any seat they hold in
  this lineup, so the boat shows the hole to fill.

  NOTE: the roster is still demo data (no real athlete accounts yet), so athletes
  see the published boats but not a personalised "your seat" highlight — that
  needs real team membership (a later slice).
*/
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  practiceStatusMeta,
  roster,
  rosterById,
  sideMeta,
  COX_COLOR,
  COX_INK,
  COX_TAG,
  COX_LABEL,
  seatLabel,
  poolFilters,
  inPool,
  dockTimes,
  DEFAULT_DOCK,
  outMeta,
  makeSeats,
  defaultBoatName,
  type OutReason,
  type Practice,
  type PracticeStatus,
  type Boat,
  type Athlete,
  type BoatKind,
  type PoolFilter,
} from "@/lib/varsity/coachLineup";
import {
  dayKeyLabel,
  parseSessionKey,
  sessionKey,
  toISO,
  type Period,
} from "@/lib/varsity/coachPlan";
import {
  configNeedsLineup,
  configSessionColor,
  configSessionLabel,
  defaultConfig,
  type TrainingConfig,
} from "@/lib/varsity/trainingConfig";
import { fetchTrainingConfig } from "@/lib/varsity/configStore";
import { useMembership } from "@/components/varsity/useMembership";
import { fetchOutOn, markBackIn } from "@/lib/varsity/availabilityStore";
import { fetchPlan, type Plan } from "@/lib/varsity/planStore";
import { notifySquad } from "@/lib/push/client";
import SaveState from "@/components/varsity/coach/SaveState";
import PublishBar from "@/components/varsity/coach/PublishBar";
import {
  fetchCarriedLineup,
  fetchLineup,
  fetchLineupStatuses,
  saveLineup,
  type LineupStatus,
} from "@/lib/varsity/lineupStore";
import CrewVideoStrip from "@/components/varsity/CrewVideoStrip";
import {
  IconArrowLeft,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconClock,
  IconPlus,
  IconRepeat,
  IconX,
} from "@/components/icons";

/* a target slot inside a boat: a numbered seat, or the cox seat */
type Slot = { boatId: string; kind: "seat"; idx: number } | { boatId: string; kind: "cox" };
const slotKey = (s: Slot) => (s.kind === "cox" ? `${s.boatId}:cox` : `${s.boatId}:${s.idx}`);

/*
  What the training plan prescribes for one AM or PM slot, reduced to the few
  things worth showing on a picker button. Null when the plan has nothing there.

  `water` is whether this session's TYPE needs a lineup — the coach's own rule
  from Training settings (needsLineup), read through configNeedsLineup(). For
  a rowing squad that is the water sessions, hence the name; a swimming coach
  who says their Pool sessions need one gets exactly the same treatment. It
  decides how loud the slot is drawn and where the ‹ › arrows stop; it never
  locks a slot.
*/
type PlanCell = { label: string; description: string; color: string; water: boolean } | null;

// A real calendar day in the picker, with its two practices.
type PickDay = {
  id: string;
  date: Date;
  num: number;
  weekday: string;
  month: string;
  today?: boolean;
  note?: string;
  am: Practice & { plan: PlanCell };
  pm: Practice & { plan: PlanCell };
};

// What the prescribed-session card shows (from the published plan, if any).
type PlanContext = { title: string; sub: string; color: string; water: boolean } | null;

/* ─────────────────────────  shared bits  ───────────────────────── */
type Side = Athlete["side"];

/*
  A BLADE. Every side marker in this screen is the same object: a solid patch of
  the side's colour with legible lettering on it, the way an oar is painted.

  Solid rather than the old tint-and-matching-text: a 13% wash of the side's
  colour is nearly nothing on the varsity light theme. Painting the blade and
  putting the side's `ink` on top is the one treatment that survives both themes
  and all three colours, and the hairline border keeps the patch's edge crisp.
*/
function blade(color: string, ink: string): React.CSSProperties {
  return {
    background: color,
    color: ink,
    borderColor: `color-mix(in oklab, ${ink} 22%, transparent)`,
  };
}

function SideTag({ side }: { side: Side }) {
  const m = sideMeta[side];
  return (
    <span
      className="rounded border px-1.5 py-px text-[10px] font-bold tracking-[0.05em]"
      style={blade(m.color, m.ink)}
    >
      {m.tag}
    </span>
  );
}

/*
  ONE LINE UNDER THE HULL — the boat, the oars, the crew note. A label column
  wide enough for all three words, so the answers line up down the card, and the
  field beside it is a plain input at 16px (anything smaller and a phone zooms
  the whole boat the moment it is tapped). An empty NOTE is dashed: it is the
  one of the three that is genuinely optional.
*/
function InfoField({
  label,
  value,
  placeholder,
  strong,
  dashedWhenEmpty,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  /** The boat's name is the card's identity, so it is written heavier. */
  strong?: boolean;
  dashedWhenEmpty?: boolean;
  onChange: (v: string) => void;
}) {
  const empty = !value.trim();
  return (
    <div
      className={`flex min-h-[46px] items-center gap-2 rounded-[11px] border bg-surface px-[11px] ${
        dashedWhenEmpty && empty ? "border-dashed border-border" : "border-border"
      }`}
    >
      <span className="w-11 flex-shrink-0 select-none font-mono text-[10px] font-medium tracking-[0.12em] text-muted">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        placeholder={placeholder}
        className={`min-w-0 flex-1 bg-transparent text-[16px] text-text outline-none placeholder:text-muted ${
          strong ? "font-semibold placeholder:font-normal" : "font-medium"
        }`}
      />
    </div>
  );
}

/*
  THE ENDS OF THE HULL. Which way the boat is pointing, said once at each end,
  so the seats between them are unambiguously bow → stroke. The same caps the
  athlete's own card wears.
*/
function HullCap({ arrow, word }: { arrow: string; word: string }) {
  return (
    <div className="flex h-[30px] select-none items-center justify-center gap-[7px] font-mono text-[11px] font-semibold tracking-[0.16em] text-muted">
      <span className="text-[12px] leading-none">{arrow}</span>
      {word}
    </div>
  );
}

/*
  The side marker worn INSIDE THE BOAT — the same pill, at the same size, that
  the athlete reads on their own phone (components/varsity/LineupBoatCard). A
  seat looks the same to the coach filling it and to the person sitting in it.
*/
function SidePill({ side }: { side: Side }) {
  const m = sideMeta[side];
  return (
    <span
      className="flex h-[21px] flex-shrink-0 items-center rounded-md px-[7px] font-mono text-[10px] font-semibold tracking-[0.06em]"
      style={blade(m.color, m.ink)}
      title={m.label}
    >
      {m.tag}
    </span>
  );
}

/* The initials roundel that used to sit on the left of every suggested name is
   gone: it repeated the name beside it, and the owner does not want it
   (2026-09-17). A name and a side is the whole row, in the pool and in a seat. */

/*
  Tag shown for an athlete in the pool and in the pick-a-name list: their side,
  or the WORD "COX". The word, not the letter — these are the places with room
  to read one. The single "C" is only ever the seat badge inside the boat,
  which is 20px across and where "COX" turned to mush.
*/
function AthleteTag({ a }: { a: Athlete }) {
  if (a.cox) {
    return (
      <span
        className="rounded border px-1.5 py-px text-[10px] font-bold tracking-[0.05em]"
        style={blade(COX_COLOR, COX_INK)}
      >
        {COX_LABEL}
      </span>
    );
  }
  return <SideTag side={a.side} />;
}

/* ─────────────────────────  view 1: day picker  ───────────────────────── */
/*
  One AM / PM slot. It answers two questions at once, which is why it stacks:
  WHAT is prescribed here (from the training plan) and WHERE the lineup for it
  has got to (from the lineup database). A coach picking a practice to seat
  wants the first one before they tap — otherwise every day is an identical
  pair of buttons and they have to open one to find out.

  EVERY slot opens. A lineup normally seats a boat, so a water session is the
  usual one to build — but that is a NOTICE, never a lock (the owner's rule):
  the builder says so at the top and the coach carries on if they mean to.
  Non-water slots are simply drawn quieter, so the water ones stand out.
*/
function PracticeBody({ practice }: { practice: Practice & { plan: PlanCell } }) {
  const s = practiceStatusMeta[practice.status];
  const plan = practice.plan;
  const water = !!plan?.water;
  return (
    <>
      <span
        className={`text-[11px] font-semibold tracking-[0.08em] ${water ? "text-text" : "text-muted"}`}
      >
        {practice.period}
      </span>

      {plan ? (
        <span className="flex w-full min-w-0 flex-col items-center gap-0.5">
          <span
            className={`max-w-full truncate text-[11px] font-medium ${water ? "text-text" : "text-muted"}`}
          >
            {plan.label}
          </span>
          {plan.description && (
            /* Full-strength text on a painted cell: muted grey on the yellow of
               a UT1 outing is the one pairing that goes hard to read. */
            <span
              className={`w-full truncate text-[10px] leading-snug ${water ? "text-text/85" : "text-muted"}`}
            >
              {plan.description}
            </span>
          )}
        </span>
      ) : (
        <span className="text-[11px] text-muted/70">Nothing planned</span>
      )}

      <span className={`flex items-center gap-1.5 text-[11px] ${water ? "text-text/85" : "text-muted"}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    </>
  );
}

/*
  THE WHOLE CELL IS THE SESSION'S COLOUR. It used to be a 1.5px dot beside the
  label, which is nothing to glance at — and the coach's own spreadsheet paints
  the entire square, so a week is read as a pattern before a word of it is.
  Same colour source as the plan grid (intensity when there is one), so green /
  yellow / red mean here exactly what they mean there.

  Water sessions are painted at full strength and everything else at less than
  half, which keeps the old signal — a lineup seats a boat, so the water slots
  are the ones being looked for — without taking their colour away entirely.

  color-mix over `transparent` rather than a hex + "22" suffix: these colours
  are theme tokens as often as hex (var(--success)), and a suffix silently
  produces nothing at all for those. Content colour, applied inline (rule 1).
*/
function PracticeButton({
  practice,
  onPick,
  tour,
}: {
  practice: Practice & { plan: PlanCell };
  onPick: () => void;
  /** data-tour, so the console tour can press one (lib/varsity/coachTour.ts). */
  tour?: string;
}) {
  const plan = practice.plan;
  const wash = plan
    ? { background: `color-mix(in oklab, ${plan.color} ${plan.water ? 30 : 12}%, transparent)` }
    : undefined;
  return (
    <button
      type="button"
      onClick={onPick}
      data-tour={tour}
      style={wash}
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5 border-r border-border px-2.5 py-3 last:border-r-0 active:brightness-95"
    >
      <PracticeBody practice={practice} />
    </button>
  );
}

function DayCard({
  day,
  first,
  onPick,
}: {
  day: PickDay;
  /** The tour presses the first day's AM to get into a builder. */
  first?: boolean;
  onPick: (day: PickDay, p: Practice) => void;
}) {
  return (
    <div
      data-tour={first ? "coach-lineup-first-day" : undefined}
      className={`overflow-hidden rounded-2xl border bg-surface ${
        day.today ? "border-primary-line bg-gradient-to-br from-primary/10 to-surface" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold leading-none text-text">{day.num}</span>
          <div>
            <div className="text-[13px] font-semibold leading-none text-text">{day.weekday}</div>
            <div className="mt-1 text-[11px] text-muted">{day.month}</div>
          </div>
        </div>
        {day.today && (
          <span className="rounded-md bg-text px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-background">
            Today
          </span>
        )}
      </div>
      <div className="flex border-t border-border">
        <PracticeButton
          practice={day.am}
          tour={first ? "coach-lineup-first-practice" : undefined}
          onPick={() => onPick(day, day.am)}
        />
        <PracticeButton practice={day.pm} onPick={() => onPick(day, day.pm)} />
      </div>
    </div>
  );
}

function DayPicker({ days, onPick }: { days: PickDay[]; onPick: (day: PickDay, p: Practice) => void }) {
  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
      {/* Straight into the days — no "Lineups" title either; the tab bar
          already says it, and seven dated cards explain themselves. */}
      <h1 className="sr-only">Lineups</h1>

      <div>
        {/* data-tour: the tour lights the FIRST card (coach-lineup-first-day,
            on DayCard) rather than the list — seven cards are taller than the
            screen, and a hole that size lights nothing. */}
        <div className="flex flex-col gap-2.5">
          {days.map((d, i) => (
            <DayCard key={d.id} day={d} first={i === 0} onPick={onPick} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  view 2: builder (interactive)  ───────────────────────── */
/*
  ONE SEAT IN THE HULL, and the one place a crew is actually built: tap it to
  type a name, drag a name onto it, drag the name out again, or clear it with
  the ×. It is drawn to the same anatomy as the seat an ATHLETE reads on their
  own phone — number, name, side — so a coach seating a boat is looking at the
  thing the squad will see, not at a different rendering of it.

  A FILLED SEAT IS TAPPABLE TOO, in two stages. The first tap PICKS IT UP —
  highlighted, no keyboard: tap any other seat and the two rowers swap (or
  this one moves, if that seat was empty). A second tap on the same seat opens
  its text field, to type a name in — anyone in the pool, or anyone already
  seated — and whoever was here goes where the newcomer came from. Two taps,
  no keyboard, is the version for a dock at dawn. Tapping the seat's number
  badge puts it down without clearing anyone; so does Escape once the field
  is open.
*/
type Match = { a: Athlete; where: string | null };

function Seat({
  label,
  athlete,
  cox,
  typing,
  query,
  matches,
  selected,
  dropActive,
  onStartType,
  onQuery,
  onAssign,
  onClear,
  onCancelType,
  onDragStartSeat,
  onDropSlot,
  onDragOverSlot,
  onDragLeaveSlot,
}: {
  /** The seat's number — "1" up to "8" — or the cox's "C". */
  label: string;
  athlete?: Athlete;
  cox?: boolean;
  /** The text field is open here (the second tap on a filled seat, or the first on an empty one). */
  typing: boolean;
  /** Picked up, no keyboard: the next seat tapped is where this rower goes. */
  selected: boolean;
  query: string;
  /** Who can come into this seat, and — for anyone already seated — where they are now. */
  matches: Match[];
  dropActive: boolean;
  onStartType: () => void;
  onQuery: (v: string) => void;
  onAssign: (id: string) => void;
  onClear: () => void;
  /** Stop typing into this seat, leaving whoever is in it alone. */
  onCancelType: () => void;
  onDragStartSeat: () => void;
  onDropSlot: (id: string) => void;
  onDragOverSlot: () => void;
  onDragLeaveSlot: () => void;
}) {
  const dropHandlers = {
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      onDragOverSlot();
    },
    onDragLeave: onDragLeaveSlot,
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      const id = e.dataTransfer.getData("text/plain");
      if (id) onDropSlot(id);
    },
  };

  /*
    The seat's badge. A rowing seat carries its NUMBER and nothing else — no
    colour, because the boat no longer claims to know which side that seat
    rows. The cox's badge keeps the cox yellow, because that is a person's
    role rather than a rig.
  */
  const chip = (
    <span
      className={`flex h-[23px] w-[23px] flex-shrink-0 select-none items-center justify-center rounded-[7px] border font-mono text-[12px] font-semibold ${
        cox ? "" : "border-border bg-surface-2 text-text-2"
      }`}
      style={cox ? blade(COX_COLOR, COX_INK) : undefined}
      title={cox ? "Cox" : `Seat ${label}`}
    >
      {label}
    </span>
  );

  /* The cox's row is outlined in the cox's own yellow, filled or not — it is
     the one seat in the boat that is a different job. */
  const coxEdge = cox ? { borderColor: COX_COLOR } : undefined;

  if (typing) {
    return (
      <div className="relative">
        <div
          className="flex h-10 items-center gap-2 rounded-[10px] border bg-surface-2 pl-[7px] pr-2.5"
          style={coxEdge ?? { borderColor: "var(--primary)" }}
        >
          {/* Tapping the active seat's own badge puts it down again. */}
          <button type="button" onClick={onCancelType} aria-label="Stop editing this seat" className="flex">
            {chip}
          </button>
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) onAssign(matches[0].a.id);
              if (e.key === "Escape") onCancelType();
            }}
            /* A filled seat says what a tap elsewhere will do; an empty one
               just asks for a name. */
            placeholder={athlete ? "Swap in a name, or tap another seat" : "Type a name…"}
            /* 16px, so a phone does not zoom the whole boat when it focuses. */
            className="w-full min-w-0 flex-1 bg-transparent text-[16px] font-medium text-text outline-none placeholder:text-text-3"
          />
        </div>
      </div>
    );
  }

  if (athlete) {
    return (
      <>
        <div
          draggable
          role="button"
          tabIndex={0}
          onClick={onStartType}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onStartType();
            }
          }}
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", athlete.id);
            onDragStartSeat();
          }}
          {...dropHandlers}
          aria-label={
            selected
              ? `${athlete.name} in seat ${label}, picked up. Tap another seat to move them there, or tap again to type a name.`
              : `${athlete.name} in seat ${label}. Tap to pick up.`
          }
          aria-pressed={selected}
          /* Picked up looks like a drop target looks — the same primary ring —
             because it is the same idea: this seat is the one in play. */
          className={`flex h-10 cursor-grab select-none items-center gap-2 rounded-[10px] border pl-[7px] pr-[6px] active:cursor-grabbing ${
            dropActive || selected ? "border-primary bg-primary-tint" : "border-border bg-surface"
          }`}
          style={dropActive || selected ? undefined : coxEdge}
        >
          {/* Picked up: the badge is the way to put it down again without
              opening the keyboard — the rest of the row is the second tap. */}
          {selected ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancelType();
              }}
              aria-label="Put this seat down"
              className="flex"
            >
              {chip}
            </button>
          ) : (
            chip
          )}
          <span className="min-w-0 flex-1 truncate text-[16px] font-medium text-text">
            {athlete.name}
          </span>
          {/* The rower's OWN side, which is a fact about them. The seat has none.
              A coxswain takes no side, so their row says COX instead. */}
          {cox ? (
            <span
              className="flex h-[21px] flex-shrink-0 items-center rounded-md px-[7px] font-mono text-[10px] font-semibold tracking-[0.06em]"
              style={blade(COX_COLOR, COX_INK)}
            >
              {COX_LABEL}
            </span>
          ) : (
            <SidePill side={athlete.side} />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // the row underneath is the tap-to-swap
              onClear();
            }}
            aria-label={`Clear ${athlete.name} from this seat`}
            className="-mr-1 flex h-10 w-[34px] flex-shrink-0 items-center justify-center text-[17px] leading-none text-muted hover:text-danger"
          >
            <IconX size={15} />
          </button>
        </div>
        {/* What the pick-up means, said once, under the seat it is about. */}
        {selected && (
          <div className="px-1 pb-0.5 text-[11px] leading-snug text-muted" aria-live="polite">
            Tap another seat to swap · tap again to type a name · tap the number to put down
          </div>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={onStartType}
      {...dropHandlers}
      className={`flex h-10 w-full select-none items-center gap-2 rounded-[10px] border border-dashed pl-[7px] pr-[6px] text-left ${
        dropActive ? "border-primary bg-primary-tint" : "border-border"
      }`}
      style={dropActive ? undefined : coxEdge}
    >
      {cox ? (
        <span
          className="flex h-[23px] w-[23px] flex-shrink-0 items-center justify-center rounded-[7px] border font-mono text-[12px] font-semibold"
          style={{ borderColor: COX_COLOR, color: COX_COLOR }}
        >
          {label}
        </span>
      ) : (
        chip
      )}
      <span className="min-w-0 flex-1 truncate text-[15px] text-muted">
        {cox ? "No cox yet" : "Open seat"}
      </span>
      {cox && (
        <span
          className="flex h-[21px] flex-shrink-0 items-center rounded-md px-[7px] font-mono text-[10px] font-semibold tracking-[0.06em]"
          style={{ color: COX_COLOR, boxShadow: `inset 0 0 0 1px ${COX_COLOR}` }}
        >
          {COX_LABEL}
        </span>
      )}
      <span className="flex h-10 w-[34px] flex-shrink-0 items-center justify-center text-muted">
        <IconPlus size={14} />
      </span>
    </button>
  );
}
/*
  `select-none` on everything below that carries a NAME.

  These are things you drag, not things you read: a chip, a filled seat, an
  empty slot, the suggestion list. Pressing one to drag it, or tapping the same
  name twice, made the browser select the text instead and leave a blue
  smear across the boat. Nothing here is worth copying, so nothing here is
  selectable. The one exception is the seat's own search field, which is a real
  input and stays fully editable.
*/
/* ─────────────────────  the pool, under the seat  ───────────────────── */
/*
  WHO CAN SIT HERE, OPENED UNDER THE SEAT ITSELF. Tapping a seat used to drop a
  five-name list over the boat — "it just pops down like a random text" (owner,
  2026-09-17) — and the real pool stayed at the bottom of the screen, out of
  sight behind a seated eight. This is that pool, inside the hull, immediately
  below the seat being filled.

  A LIST OF NAMES, FILTERED BY SIDE (owner, 2026-09-17: "just do the names and
  you can scroll down and filter them on top by port or starboard — don't show
  the whole pool"). So:

  - Port / Starboard / All sit across the top, and they are how a side is read
    here. The names themselves carry no blade marker any more: the coach has
    just said which side they are filling, so repeating it on forty rows is
    noise. Anyone who rows BOTH shows up under Port AND Starboard.
  - one name per row, so the eye runs straight down a column instead of
    hunting across a wrapped block of chips;
  - a short window — about five names — and then it scrolls. The whole squad is
    reachable without the boat being pushed off the screen;
  - typing in the seat still narrows it, on top of the side filter;
  - a name already in another boat says where, because taking them is a swap.

  The cox seat has no side row: coxswains do not have one, and it is the only
  seat that offers them.
*/
function SeatPool({
  matches,
  cox,
  query,
  onAssign,
}: {
  matches: Match[];
  /** The cox seat offers coxswains only, so it says so instead of "pool". */
  cox?: boolean;
  query: string;
  onAssign: (id: string) => void;
}) {
  /* Which side this seat is being filled from. It resets to All every time a
     different seat is opened, because the component is mounted with it. */
  const [side, setSide] = useState<PoolFilter>("all");
  const sides = poolFilters.filter((f) => f.key !== "cox"); // All · Port · Starboard
  const shown = cox ? matches : matches.filter((m) => inPool(m.a, side));

  return (
    <div className="select-none rounded-[14px] border border-primary-line bg-background p-2">
      <div className="mb-1.5 flex items-center justify-between px-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          {cox ? "Coxswains" : "Athlete pool"}
        </span>
        <span className="text-[10px] font-medium text-muted">{shown.length}</span>
      </div>

      {!cox && (
        <div className="mb-1.5 flex gap-1.5">
          {sides.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setSide(f.key)}
              aria-pressed={side === f.key}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                side === f.key
                  ? "border-primary bg-primary-tint text-text"
                  : "border-border bg-surface text-muted"
              }`}
            >
              {f.color && (
                <span
                  className="h-2.5 w-2.5 rounded-sm border"
                  style={blade(f.color, f.ink ?? "#ffffff")}
                />
              )}
              {f.label}
            </button>
          ))}
        </div>
      )}

      {shown.length === 0 ? (
        <p className="px-0.5 pb-1 text-[12px] italic text-muted">
          {query.trim() ? `Nobody called “${query.trim()}”.` : "Nobody left to pick."}
        </p>
      ) : (
        /* A fixed window on a long list: about five names, then scroll. Any
           taller and the seat being filled is pushed off the screen. */
        <div className="max-h-[196px] overflow-y-auto">
          <div className="flex flex-col gap-1">
            {shown.map((m) => (
              <button
                key={m.a.id}
                type="button"
                onClick={() => onAssign(m.a.id)}
                className="flex h-[36px] w-full items-center justify-between gap-2 rounded-[10px] border border-border bg-surface px-2.5 text-left active:border-primary-line active:bg-primary-tint"
              >
                <span className="truncate text-[14px] font-medium text-text">{m.a.name}</span>
                {/* Already in a boat: say where, because picking them is a swap
                    and the coach should know what it costs. */}
                {m.where && (
                  <span className="flex-shrink-0 text-[11px] text-muted">{m.where}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  pool chip  ───────────────────────── */
/*
  TAP A NAME TO PICK IT UP. The chip is where the coach is already looking, so
  it is where a rower is chosen: tap the name, then tap the seat they go in
  (owner, 2026-09-17). Tapping it again puts them down.

  It used to open the mark-out sheet instead. It no longer does: an athlete says
  on their own profile that they are sick or hurt, and the coach's tap is needed
  for the thing the coach is actually doing here. `out` is still the reason
  somebody is out on THIS practice's day (from availabilityStore) — never a fact
  about the person — and tapping an out chip brings them back in.

  Dragging still works on a desktop: a drag never fires the tap.
*/
function PoolChip({
  a,
  out,
  picked,
  onTap,
  onDragStart,
}: {
  a: Athlete;
  out?: OutReason;
  /** Chosen, waiting for a seat. */
  picked?: boolean;
  onTap: () => void;
  onDragStart: () => void;
}) {
  if (out) {
    /*
      Two facts, in the order a coach needs them: WHICH SIDE this person is
      (or that they cox), then WHY they are out. The side was missing here,
      so an unavailable rower was a name with no rig — and a coach reading
      the list to see what the injury costs them had to remember it.
    */
    return (
      <button
        type="button"
        onClick={onTap}
        aria-label={`${a.name}, out — ${outMeta[out]}. Tap to bring them back into the pool.`}
        className="flex h-[38px] select-none items-center gap-2 rounded-[10px] border border-danger-line bg-danger-tint px-2.5 opacity-60 active:opacity-90"
      >
        <span className="text-[15px] font-medium text-muted">{a.name}</span>
        <AthleteTag a={a} />
        <span className="rounded bg-danger-tint px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-danger">
          {outMeta[out]}
        </span>
      </button>
    );
  }
  /*
    A NAME AND A SIDE, and nothing else — the same two facts the seat it is
    about to be dropped into will show. The initials roundel is gone with the
    redesign: it repeated the name it was sitting next to, and the pool is
    read by name.
  */
  return (
    <div
      role="button"
      tabIndex={0}
      draggable
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onTap();
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", a.id);
        onDragStart();
      }}
      aria-label={
        picked ? `${a.name}, picked. Tap a seat to put them in.` : `${a.name}. Tap to pick.`
      }
      aria-pressed={!!picked}
      /* Picked looks the way a picked-up SEAT looks — the same primary ring —
         because it is the same idea: this is the one in play. */
      className={`flex h-[38px] cursor-grab select-none items-center gap-2 rounded-[10px] border px-2.5 active:cursor-grabbing ${
        picked ? "border-primary bg-primary-tint" : "border-border bg-surface active:border-primary-line active:bg-primary-tint"
      }`}
    >
      <span className="text-[15px] font-medium text-text">{a.name}</span>
      {a.cox ? (
        <span
          className="flex h-[19px] flex-shrink-0 items-center rounded px-1.5 font-mono text-[9px] font-semibold tracking-[0.06em]"
          style={blade(COX_COLOR, COX_INK)}
        >
          {COX_LABEL}
        </span>
      ) : (
        <span
          className="flex h-[19px] flex-shrink-0 items-center rounded px-1.5 font-mono text-[9px] font-semibold tracking-[0.06em]"
          style={blade(sideMeta[a.side].color, sideMeta[a.side].ink)}
        >
          {sideMeta[a.side].tag}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────  builder  ───────────────────────── */
/* Stepping between water sessions: which ones, and how to open one. */
type Nav = {
  prev: string | null;
  next: string | null;
  label: (key: string) => string;
  go: (key: string) => void;
};

/*
  One end of the day stepper. Dead rather than gone at the ends of the plan:
  a control that disappears moves everything beside it, and this one sits next
  to the title a coach is already aiming at.
*/
function StepArrow({
  dir,
  to,
  label,
  onGo,
  busy,
}: {
  dir: "prev" | "next";
  to: string | null;
  label: (key: string) => string;
  onGo: (key: string | null) => void;
  busy: boolean;
}) {
  const live = !!to && !busy;
  const where = to ? label(to) : null;
  return (
    <button
      type="button"
      disabled={!live}
      onClick={() => onGo(to)}
      title={where ? `${dir === "prev" ? "Previous" : "Next"} water session — ${where}` : undefined}
      aria-label={
        where
          ? `${dir === "prev" ? "Previous" : "Next"} water session, ${where}`
          : `No ${dir === "prev" ? "earlier" : "later"} water session in the plan`
      }
      /* tap44: the button is 36px, and this screen is used standing on a dock
         with cold hands — the helper grows the hit area to 44px without moving
         a pixel of what you see. */
      className={`tap44 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border ${
        live
          ? "border-border bg-surface text-text active:bg-surface-2"
          : "border-border/50 bg-surface/40 text-muted/40"
      }`}
    >
      {dir === "prev" ? <IconChevronLeft size={18} /> : <IconChevronRight size={18} />}
    </button>
  );
}

function Builder({
  dayKey,
  context,
  planContext,
  boatKinds,
  nav,
  onBack,
}: {
  dayKey: string;
  context: { weekday: string; period: string; sub: string };
  planContext: PlanContext;
  /** The riggings this squad rows, from their own settings. */
  boatKinds: BoatKind[];
  nav: Nav;
  onBack: () => void;
}) {
  const [boats, setBoats] = useState<Boat[]>([]);
  const [status, setStatus] = useState<LineupStatus>("draft");
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [failed, setFailed] = useState(false);
  /*
    THE SEAT IN PLAY, in two stages. `typing` is the active slot. `keyboard`
    says whether its text field is open: a FILLED seat is first PICKED UP
    (highlighted, no keyboard — the next seat tapped is where its rower goes)
    and only a second tap opens the field. An EMPTY seat opens the field on
    the first tap, because there is nobody in it to move. Two taps to swap,
    and the phone's keyboard never comes up unless a name is about to be typed.
  */
  const [typing, setTyping] = useState<Slot | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const [query, setQuery] = useState("");
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all");

  /*
    BOATS THE COACH HAS FINISHED WITH, shut by their own id. A seated eight is
    nine rows, a hull, three fields and a video strip; three of them is a very
    long screen to scroll past to reach the fourth (owner, 2026-09-17). Closing
    one leaves its header — rigging, name, how full it is — and nothing else.

    Held in this screen, not on the boat: it is where the coach has got to in
    this sitting, not a fact about the crew, and nothing about it is worth
    saving to the database or showing the squad.
  */
  const [shut, setShut] = useState<Set<string>>(new Set());
  const toggleShut = (id: string) => {
    // Shutting the boat whose seat is being typed into would leave the keyboard
    // open on something nobody can see. Put that seat down first.
    if (typing?.boatId === id) {
      setTyping(null);
      setKeyboard(false);
      setQuery("");
    }
    setShut((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  };

  /*
    DRAGGING THE ADD-BOAT SHEET DOWN. `drag` is how far below its resting place
    the sheet is being held, in pixels; it only ever goes down. Let go past a
    third of the sheet's own height and it closes, short of that it slides back
    — the distance is measured against the sheet rather than a fixed number of
    pixels, so it behaves the same on any phone.

    Pointer events, not touch: the same three handlers cover a thumb and a
    mouse. A drag that starts on one of the four buttons is ignored, so a
    pressed button stays a press.
  */
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragFrom = useRef<number | null>(null);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);

  const onSheetDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    dragFrom.current = e.clientY;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onSheetMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (dragFrom.current === null) return;
    setDrag(Math.max(0, e.clientY - dragFrom.current));
  };
  const onSheetUp = () => {
    if (dragFrom.current === null) return;
    const height = sheetRef.current?.offsetHeight ?? 260;
    const gone = drag > height / 3;
    dragFrom.current = null;
    setDragging(false);
    setDrag(0);
    if (gone) setSheetOpen(false);
  };

  /*
    WHO IS OUT ON THIS DAY, and why. A fact about the day, read from the
    availability store for the date this practice falls on — so the AM and PM
    of one day agree, and a rower marked injured on Tuesday is still out when
    Friday's boats are seated.

    THE COACH NO LONGER MARKS ANYONE OUT here. An athlete says they are sick or
    hurt on their own profile, and this screen reads it (owner, 2026-09-17).
    What a tap on a name in the pool does now is PICK them for a seat, which is
    the thing a coach is doing on this screen. The one thing left that writes to
    the availability store is putting somebody back in the pool: tapping a name
    in Unavailable brings them back, so nobody can be stranded out.
  */
  const dayIso = useMemo(() => {
    const parsed = parseSessionKey(dayKey);
    return parsed ? toISO(parsed.date) : toISO(new Date());
  }, [dayKey]);
  const [outById, setOutById] = useState<Record<string, OutReason>>({});
  const [outBusy, setOutBusy] = useState(false);
  /*
    PICKED FROM THE POOL, waiting for a seat. The other half of the same idea as
    picking a seat up: tap a name, tap where they go (owner, 2026-09-17). Either
    end can be chosen first, and whichever is chosen second completes the move.
  */
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchOutOn(dayIso).then((o) => {
      if (active) setOutById(o);
    });
    return () => {
      active = false;
    };
  }, [dayIso]);

  /*
    What the DATABASE holds, as text. Anything else in `boats` is work not
    written yet — which matters because a half-seated eight is not something to
    lose to a mis-tap, a closed app or an arrow. Compared, not counted: a name
    typed into a boat or an oar set is as much work as a seat filled.

    State, not a ref, because the save line and the publish bar both read it
    while rendering.
  */
  const [saved, setSaved] = useState("[]");
  /*
    And what the SQUAD was last told. A published lineup is live: it autosaves,
    so a seat swapped at the dock is on their phones as it happens. So the only
    thing left to offer is a heads-up — and only once it differs from this.
  */
  const [announced, setAnnounced] = useState<string | null>(null);
  /*
    The last crew the squad was given, and whether the coach has ASKED for it.

    `carried` is the offer — which practice it comes from and its boats, held
    ready but not on screen. `carriedFrom` is set only once the coach presses
    the button, and is what the "started from" line reads.

    It used to seat them the moment the practice opened, which read as though
    Friday had a lineup already; the coach could not tell a decision from a
    suggestion (owner, 2026-09-17). An empty practice now opens empty, and
    repeating a crew is one button. Nothing is written to the database until
    that button is pressed, so a day merely looked at stays "Not started".

    Null for a practice that already has a lineup of its own — even an empty
    one the coach cleared: that was a decision, and it stands.
  */
  const [carried, setCarried] = useState<{ from: string; boats: Boat[] } | null>(null);
  const [carriedFrom, setCarriedFrom] = useState<string | null>(null);

  // Load this practice's lineup — or, when it has none, the last one published.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await fetchLineup(dayKey);
      if (!active) return;
      if (stored) {
        const text = JSON.stringify(stored.boats);
        setSaved(text);
        // A lineup already live when this opened: what the squad was last
        // TOLD is on the row, so an edit made and closed on last sitting still
        // offers the buzz. A live row from before that was recorded is taken
        // as up to date — nothing honest can be said about it.
        setAnnounced(stored.status === "published" ? (stored.announced ?? text) : null);
        setBoats(stored.boats);
        setStatus(stored.status);
        setLoading(false);
        return;
      }
      /*
        Nothing here yet: open EMPTY, and hold the last crew the squad was given
        as an offer. `saved` stays "[]" — the database really does hold nothing,
        and nothing is dirty, so no draft is written for a practice that was
        only looked at.
      */
      const found = await fetchCarriedLineup(dayKey);
      if (!active) return;
      setSaved("[]");
      setAnnounced(null);
      setBoats([]);
      setCarried(found);
      setCarriedFrom(null);
      setStatus("draft");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dayKey]);

  /* Yes — repeat that crew here. */
  const useCarried = () => {
    if (!carried) return;
    setBoats(carried.boats);
    setCarriedFrom(carried.from);
  };

  /* The coach would rather build this one from scratch. The offer comes back:
     an empty practice is exactly where it belongs. */
  const startEmpty = () => {
    setBoats([]);
    setCarriedFrom(null);
  };

  // who's seated right now (across all boats)
  const seatedIds = useMemo(() => {
    const set = new Set<string>();
    for (const b of boats) {
      for (const s of b.seats) if (s.athleteId) set.add(s.athleteId);
      if (b.coxId) set.add(b.coxId);
    }
    return set;
  }, [boats]);

  const available = useMemo(
    () => roster.filter((a) => !outById[a.id] && !seatedIds.has(a.id)),
    [seatedIds, outById],
  );
  // Injured or ill today: never seatable, and shown as one list rather than
  // dimmed in among the rest.
  const unavailable = useMemo(() => roster.filter((a) => !!outById[a.id]), [outById]);
  // The same list under the filter the pool is showing — an out rower is no
  // more relevant to the cox seat than an available one.
  const unavailableHere = useMemo(
    () => unavailable.filter((a) => inPool(a, poolFilter)),
    [unavailable, poolFilter],
  );
  /* Where everyone seated is right now: id → the slot, and id → words for it. */
  const seatOf = useMemo(() => {
    const slots: Record<string, Slot> = {};
    const words: Record<string, string> = {};
    for (const b of boats) {
      b.seats.forEach((s, i) => {
        if (!s.athleteId) return;
        slots[s.athleteId] = { boatId: b.id, kind: "seat", idx: i };
        words[s.athleteId] = `${b.name}, ${seatLabel(i)}`;
      });
      if (b.coxId) {
        slots[b.coxId] = { boatId: b.id, kind: "cox" };
        words[b.coxId] = `${b.name}, ${COX_LABEL.toLowerCase()}`;
      }
    }
    return { slots, words };
  }, [boats]);

  const athleteAt = (slot: Slot): string | null => {
    const b = boats.find((x) => x.id === slot.boatId);
    if (!b) return null;
    return slot.kind === "cox" ? b.coxId : b.seats[slot.idx]?.athleteId ?? null;
  };

  const matches = useMemo<Match[]>(() => {
    // A cox seat only offers coxes and a rowing seat never does — the one hard
    // rule left in a seat, because a cox does not row. Which SIDE a rower pulls
    // no longer narrows anything: a seat is a number, so every available rower
    // is offered for every seat, and the coach rigs the boat.
    //
    // EVERYONE NOT OUT IS OFFERED, seated or not — picking someone already in
    // a boat is a swap, and the coach can see where they are. The pool comes
    // first, because filling a hole is the common case and a swap the rarer.
    if (!typing) return [];
    const wantCox = typing.kind === "cox";
    const here = athleteAt(typing);
    const q = query.trim().toLowerCase();
    return roster
      .filter((a) => !!a.cox === wantCox && !outById[a.id] && a.id !== here)
      .filter((a) => !q || a.name.toLowerCase().includes(q) || a.initials.toLowerCase().includes(q))
      .map((a) => ({ a, where: seatOf.words[a.id] ?? null }))
      .sort((x, y) => Number(!!x.where) - Number(!!y.where) || x.a.name.localeCompare(y.a.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, query, typing, outById, seatOf]);

  /*
    Put `athleteId` into `slot`. Whoever was in that slot does not fall out of
    the boat: if the newcomer came from another seat, the two SWAP; if they came
    from the pool, the old occupant goes back to the pool. The cox seat is
    locked to coxes and coxes never take a rowing seat, so a swap can only
    ever be like for like. Returns false if the move is not allowed at all.
  */
  const assign = (slot: Slot, athleteId: string): boolean => {
    const a = rosterById[athleteId];
    if (!a) return false;
    if (slot.kind === "cox" && !a.cox) return false;
    if (slot.kind === "seat" && a.cox) return false;
    const from = seatOf.slots[athleteId] ?? null;
    const displaced = athleteAt(slot);
    if (from && slotKey(from) === slotKey(slot)) {
      setTyping(null);
      setKeyboard(false);
      setQuery("");
      setDropKey(null);
      return true; // dropped back where they were
    }
    const put = (b: Boat, target: Slot, id: string | null): Boat => {
      if (b.id !== target.boatId) return b;
      if (target.kind === "cox") return { ...b, coxId: id };
      return { ...b, seats: b.seats.map((s, i) => (i === target.idx ? { ...s, athleteId: id } : s)) };
    };
    setBoats((prev) => {
      // Lift the newcomer out of wherever they were…
      let next = prev.map((b) => ({
        ...b,
        seats: b.seats.map((s) => (s.athleteId === athleteId ? { ...s, athleteId: null } : s)),
        coxId: b.coxId === athleteId ? null : b.coxId,
      }));
      // …seat them, and send whoever was there to the newcomer's old seat.
      next = next.map((b) => put(b, slot, athleteId));
      if (displaced && displaced !== athleteId && from) next = next.map((b) => put(b, from, displaced));
      return next;
    });
    setTyping(null);
    setKeyboard(false);
    setQuery("");
    setDropKey(null);
    return true;
  };

  /*
    A TAP ON A SEAT.
      • Nothing in play → this seat is. Filled: picked up, no keyboard. Empty:
        the text field opens, because there is nobody here to move.
      • The seat in play is FILLED and this is a different seat → its rower
        moves here, swapping with whoever is here. If that move is not allowed
        (a rower onto the cox seat) the tap picks this seat up instead.
      • The seat in play is this very seat, picked up → second tap: open the
        field, to swap a name in by typing.
  */
  const tapSeat = (slot: Slot) => {
    const here = athleteAt(slot);
    // Somebody is already in hand from the pool: this seat is where they go.
    if (picked) {
      const who = picked;
      setPicked(null);
      if (assign(slot, who)) return;
    }
    if (typing && slotKey(typing) === slotKey(slot)) {
      if (!keyboard) setKeyboard(true);
      return;
    }
    if (typing) {
      const moving = athleteAt(typing);
      if (moving && assign(slot, moving)) return;
    }
    setTyping(slot);
    setKeyboard(here === null);
    setQuery("");
  };

  const putDown = () => {
    setTyping(null);
    setKeyboard(false);
    setQuery("");
  };

  const clear = (slot: Slot) => {
    setBoats((prev) =>
      prev.map((b) => {
        if (b.id !== slot.boatId) return b;
        if (slot.kind === "cox") return { ...b, coxId: null };
        return { ...b, seats: b.seats.map((s, i) => (i === slot.idx ? { ...s, athleteId: null } : s)) };
      }),
    );
  };

  /*
    MARKING SOMEONE OUT. Written to the store for this day (or open-ended),
    and — the part that matters at 5:30 — pulled out of any seat they hold in
    THIS lineup, so the boat shows the hole the coach now has to fill. The
    seat empties in this practice only: a Friday lineup already seated is not
    rewritten because Tuesday's rower is ill, since Friday may be different.
  */
  /* Back in the pool. One tap on the name, no sheet: the coach is not deciding
     anything about the athlete, only undoing an absence that is over. */
  const bringBackIn = async (a: Athlete) => {
    if (outBusy) return;
    setOutBusy(true);
    const { error } = await markBackIn(a.id, dayIso);
    setOutBusy(false);
    if (error) {
      console.error("availability:", error);
      return;
    }
    setOutById((prev) => {
      const next = { ...prev };
      delete next[a.id];
      return next;
    });
  };

  const setNote = (boatId: string, note: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, note } : b)));
  const setName = (boatId: string, name: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, name } : b)));
  const setDock = (boatId: string, dock: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, dock } : b)));
  const setOars = (boatId: string, oars: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, oars } : b)));

  /* Everything about the new boat comes off the rigging the coach picked —
     how many seats, whether there is a cox, what it is called. Nothing here
     knows what an "8+" is any more; the squad's settings do. */
  const addBoat = (kind: BoatKind) => {
    setBoats((bs) => [
      ...bs,
      {
        id: `boat-${Date.now()}`,
        badge: kind.key,
        name: defaultBoatName(kind.symbol),
        dock: DEFAULT_DOCK,
        oars: "",
        note: "",
        hasCox: kind.cox,
        coxId: null,
        seats: makeSeats(kind.rowers),
      },
    ]);
    setSheetOpen(false);
  };

  /* Is there a seat the database hasn't got yet? */
  const text = useMemo(() => JSON.stringify(boats), [boats]);
  const dirty = text !== saved;

  /* Write the crew. Returns false if it failed, so a caller that must be sure
     (publishing) can hold its notification back. */
  const persist = useCallback(
    async (newStatus?: LineupStatus, announcedNow?: string | null) => {
      const s = newStatus ?? status;
      const snap = JSON.stringify(boats);
      setWriting(true);
      const { error } = await saveLineup(dayKey, boats, s, announcedNow);
      setWriting(false);
      if (error) {
        console.error("saveLineup:", error);
        setFailed(true);
        return false;
      }
      setSaved(snap);
      setStatus(s);
      setFailed(false);
      return true;
    },
    [boats, dayKey, status],
  );

  /*
    THE AUTOSAVE. Same rule as the Plan tab: the coach's work saves itself, a
    short pause after the last change, keeping whatever status this lineup
    already has — a draft stays a draft, a live lineup stays live.
  */
  useEffect(() => {
    if (loading || !dirty || writing) return;
    const t = window.setTimeout(() => void persist(), 700);
    return () => window.clearTimeout(t);
  }, [loading, dirty, writing, persist]);

  /* Leaving inside that pause — an arrow, the Days list, another tab — must not
     outrun it, so the last crew is flushed on the way out. */
  const pending = useRef<{ dirty: boolean; boats: Boat[]; status: LineupStatus }>({
    dirty: false,
    boats: [],
    status: "draft",
  });
  useEffect(() => {
    pending.current = { dirty, boats, status };
  }, [dirty, boats, status]);
  useEffect(
    () => () => {
      const p = pending.current;
      if (p.dirty) void saveLineup(dayKey, p.boats, p.status);
    },
    [dayKey],
  );

  /*
    PUBLISHING TELLS THE SQUAD — and it is the only thing that does. The
    autosave writes constantly; forty phones must not buzz for a seat tried
    and untried again.
  */
  const publish = async () => {
    const snap = JSON.stringify(boats);
    if (!(await persist("published", snap))) return;
    setAnnounced(snap);
    notifySquad({ kind: "team_lineup", dayKey, preview: `${context.weekday} ${context.period}` });
  };

  /* Already live, already changed on their phones — this sends the buzz, and
     writes down that it was sent, so the offer does not come back tomorrow. */
  const tellSquad = async () => {
    /* Unconditional, even when nothing moved: the point of this tap is to write
       `announced` down, so the bar does not re-offer the buzz tomorrow. */
    const snap = JSON.stringify(boats);
    if (!(await persist(undefined, snap))) return;
    setAnnounced(snap);
    notifySquad({ kind: "team_lineup", dayKey, preview: `${context.weekday} ${context.period}` });
  };

  /* Back to a draft: the crew disappears from the squad's phones again. */
  const unpublish = async () => {
    if (!(await persist("draft", null))) return;
    setAnnounced(null);
  };

  /*
    Step to the water session either side of this one. Whatever is on screen is
    written first — losing a seated crew to an arrow tap would be the worst
    thing this screen could do, and the coach did not ask to leave the work
    behind, only to move on.
  */
  const step = async (key: string | null) => {
    if (!key || writing) return;
    if (dirty && !(await persist())) return; // stay put rather than walk away from it
    nav.go(key);
  };

  /*
    What the plan's card says, and whether it would say it twice. `sub` is the
    session's category ("Off", "Erg · UT2"), `title` the coach's description or
    — when there is none — that same category again.
  */
  const planLabel = planContext
    ? planContext.water
      ? planContext.sub
      : `${planContext.sub} (no water session)`
    : "";
  const planSaysTwice =
    !!planContext && planContext.title.trim().toLowerCase() === planContext.sub.trim().toLowerCase();

  const renderSeat = (slot: Slot, label: string, athleteId: string | null, cox = false) => {
    const key = slotKey(slot);
    const active = !!typing && slotKey(typing) === key;
    return (
      /* The seat and, when it is the one in play, the pool under it. Wrapped so
         the two travel together inside the hull's column of seats. */
      <div key={key} className="flex flex-col gap-1">
        <Seat
          label={label}
          cox={cox}
          athlete={athleteId ? rosterById[athleteId] : undefined}
          typing={!!typing && slotKey(typing) === key && keyboard}
          selected={!!typing && slotKey(typing) === key && !keyboard}
          query={query}
          matches={matches}
          dropActive={dropKey === key}
          onStartType={() => tapSeat(slot)}
          onQuery={setQuery}
          onAssign={(id) => void assign(slot, id)}
          onClear={() => {
            if (athleteId) clear(slot);
            putDown();
          }}
          onCancelType={putDown}
          onDragStartSeat={() => setDropKey(null)}
          onDropSlot={(id) => assign(slot, id)}
          onDragOverSlot={() => setDropKey(key)}
          onDragLeaveSlot={() => setDropKey((k) => (k === key ? null : k))}
        />
        {active && (
          <SeatPool matches={matches} cox={cox} query={query} onAssign={(id) => void assign(slot, id)} />
        )}
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto px-4 pb-8">
        {/*
          THE TOP ROW, AND IT STAYS. Back on the left, and on the right the two
          things that say what is happening to this lineup: whether it is saved,
          and the one button that publishes it. It used to live in a bar across
          the BOTTOM, over a fade that washed out the boats behind it (owner,
          2026-09-17) — there is no fade now, and nothing floats over the work.
          Sticky, so "finished — press publish" never means scrolling back up.
        */}
        <div className="sticky top-0 z-20 -mx-4 flex items-center gap-2 bg-background px-4 pb-2 pt-4">
          <button type="button" onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted">
            <IconArrowLeft size={16} /> Days
          </button>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-2">
            <SaveState
              status={failed ? "error" : writing || dirty ? "saving" : "saved"}
              onRetry={() => void persist()}
            />
            <PublishBar
              bare
              tourId="coach-lineup-publish"
              what="lineup"
              live={status === "published"}
              changed={announced !== null && announced !== text}
              busy={writing}
              onPublish={publish}
              onNotify={tellSquad}
              onUnpublish={unpublish}
            />
          </div>
        </div>
        {/*
          ‹ day › — the next and previous WATER session in the plan, because
          that is the run of practices a coach seats one after another. Which
          day each one goes to is on the button (its label and its tooltip),
          and an end of the plan leaves the arrow in place but dead, so the row
          never reflows under a thumb that is already reaching for it.
        */}
        <div className="mt-1 flex items-center gap-2">
          <StepArrow dir="prev" to={nav.prev} label={nav.label} onGo={step} busy={writing} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold text-text">
                {context.weekday} {context.period}
              </h1>
              <span
                className={`flex flex-shrink-0 items-center gap-1 rounded px-1.5 py-px text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  status === "published"
                    ? "border border-success-line bg-success-tint text-success"
                    : "border border-warn-line bg-warn-tint text-warn"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${status === "published" ? "bg-success" : "bg-warn"}`}
                />
                {status === "published" ? "Published" : "Draft"}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] text-muted">{context.sub}</div>
          </div>
          <StepArrow dir="next" to={nav.next} label={nav.label} onGo={step} busy={writing} />
        </div>

        {/* prescribed session (from the published plan, if any) */}
        {planContext && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-3">
            {/* The session's own colour, not a fixed red — a UT2 outing is not
                a hard piece, and this card sits under a picker that now says
                so in colour. */}
            <span
              className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
              style={{ background: planContext.color }}
            />
            {/* Read-only: what the plan says for this practice. No chevron —
                it used to wear one and led nowhere, which is a promise a card
                should not make.

                TWO LINES ONLY WHEN THERE ARE TWO THINGS TO SAY. An Off day has
                no description, so the card's own fallback made both lines read
                "Off" — the plan said the same word to itself twice (owner,
                2026-09-17). One line now, unless the coach wrote a description.

                And a session a lineup is an odd fit for — an erg, a lift, an
                Off day — simply says so in brackets: "Off (no water session)".
                It used to be a yellow panel underneath explaining that you may
                build one anyway. You may; that was never in doubt, and it does
                not need a paragraph. Nothing blocks (the owner's rule). */}
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-text">
                {planSaysTwice ? planLabel : planContext.title}
              </div>
              {!planSaysTwice && <div className="mt-0.5 text-[11px] text-muted">{planLabel}</div>}
            </div>
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-center text-[13px] text-muted">Loading lineup…</div>
        ) : (
          <>
            {/*
              THE OFFER. Nothing has been done to this practice: the last crew
              the squad was given is simply available, and the button takes it.
              Shown only while this practice is still empty and untouched, so
              it never sits over work the coach has started.
            */}
            {carried && !carriedFrom && boats.length === 0 && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-dashed border-border bg-surface px-3 py-2.5">
                <span className="flex-shrink-0 text-muted">
                  <IconRepeat size={14} />
                </span>
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-text">
                  Repeat <span className="font-semibold">{nav.label(carried.from)}</span>&rsquo;s
                  boats? That is the last crew the squad was given.
                </span>
                <button
                  type="button"
                  onClick={useCarried}
                  className="flex-shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-text active:bg-surface-2"
                >
                  Use them
                </button>
              </div>
            )}

            {/*
              AND ONCE IT IS TAKEN — where these boats came from, said plainly,
              because a crew you have already changed three seats of still began
              as somebody else's. The one button undoes the whole thing and puts
              the offer back.
            */}
            {carriedFrom && (
              <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5">
                <span className="flex-shrink-0 text-muted">
                  <IconRepeat size={14} />
                </span>
                <span className="min-w-0 flex-1 text-[12px] leading-snug text-text">
                  Started from <span className="font-semibold">{nav.label(carriedFrom)}</span>
                  &rsquo;s boats. Change what&rsquo;s different.
                </span>
                <button
                  type="button"
                  onClick={startEmpty}
                  className="flex-shrink-0 rounded-lg border border-border px-2.5 py-1.5 text-[12px] font-semibold text-muted active:bg-surface-2"
                >
                  Start empty
                </button>
              </div>
            )}

            {/* boats */}
            <div className="mt-4 flex flex-col gap-3">
              {boats.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-surface py-7 text-center text-[12px] italic text-muted">
                  No boats added yet
                </div>
              )}
              {boats.map((boat) => {
                const isShut = shut.has(boat.id);
                /* How full the boat is — shown ONLY while it is shut. Open, the
                   hull says it seat by seat, and the owner cut the footer that
                   repeated it. Closed, this is the one thing left that says
                   whether the crew is finished. */
                const total = boat.seats.length + (boat.hasCox ? 1 : 0);
                const filled =
                  boat.seats.filter((s) => s.athleteId).length +
                  (boat.hasCox && boat.coxId ? 1 : 0);
                return (
                  <div key={boat.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                    {/* header — the rigging, the boat's name and the push-off
                        time, read-only. The name is EDITED under the crew,
                        where the coach's own lineup sheet puts it; it is echoed
                        up here so a boat stays identifiable while you scroll
                        past its nine seats. */}
                    <div
                      className={`flex items-center justify-between gap-2 px-3.5 py-3 ${
                        isShut ? "" : "border-b border-border"
                      }`}
                    >
                      {/* The whole title is the way to open and shut it, so a
                          thumb has the width of the card to aim at. */}
                      <button
                        type="button"
                        onClick={() => toggleShut(boat.id)}
                        aria-expanded={!isShut}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                      >
                        <span className="flex-shrink-0 rounded-md border border-primary-line bg-primary-tint px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {boat.badge}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">
                          {boat.name}
                        </span>
                        {isShut && (
                          <span
                            className={`flex-shrink-0 rounded-md border px-1.5 py-0.5 text-[11px] font-semibold ${
                              filled === total
                                ? "border-success-line bg-success-tint text-success"
                                : "border-border text-muted"
                            }`}
                          >
                            {filled}/{total}
                          </span>
                        )}
                      </button>
                      {/*
                        Push-off time — a plain dropdown of every five minutes,
                        which is the native scroll wheel on a phone. A boat the
                        coach has never touched already says 7:15am, so the
                        common case is no work at all. `dockTimes` may not carry
                        a time an older lineup was saved with, so that one is
                        added to the list rather than silently swapped out.
                      */}
                      <div className="flex flex-shrink-0 items-center gap-1 text-muted">
                        <IconClock size={13} />
                        <select
                          value={boat.dock}
                          onChange={(e) => setDock(boat.id, e.target.value)}
                          aria-label="Push-off time"
                          /* No `outline-none` here, unlike the text fields
                             around it: a select shows no caret, so the gold
                             keyboard ring is its only focus mark — and a select
                             (unlike a text field) only matches :focus-visible
                             when a keyboard put it there, so a tap stays clean. */
                          className="bg-transparent text-right text-[12px] font-medium text-text"
                        >
                          {(dockTimes.includes(boat.dock) ? dockTimes : [boat.dock, ...dockTimes]).map(
                            (t) => (
                              <option key={t} value={t} className="bg-surface text-text">
                                {t}
                              </option>
                            ),
                          )}
                        </select>
                        <button
                          type="button"
                          onClick={() => toggleShut(boat.id)}
                          aria-label={isShut ? `Show ${boat.name}` : `Hide ${boat.name}`}
                          className="tap44 -mr-1.5 flex h-8 w-8 items-center justify-center text-muted"
                        >
                          {isShut ? <IconChevronDown size={16} /> : <IconChevronUp size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Shut: the header is all that is left of this boat. */}
                    {!isShut && (
                      <>
                      {/*
                        THE CREW, IN THE ORDER THE COACH ALREADY WRITES IT: bow at
                        the top, down through the stroke, cox last — then the boat,
                        then the oars. That is the column order of the squad's own
                        lineup sheet, and a coach copying a crew across from it
                        should never have to read one list bottom-up against the
                        other.
                      */}
                      <div className="px-3 py-4">
                        <div className="rounded-[44px] border-2 border-primary-line bg-surface-2 px-4 pb-3 pt-2.5">
                          <HullCap arrow="▲" word="BOW" />
                          {/* The number comes from the seat's POSITION, not from
                              what an older saved lineup happens to have stored in
                              `label` — so a lineup built before the numbering
                              changed still reads 1…8 today. */}
                          <div className="flex flex-col gap-1">
                            {boat.seats.map((s, i) =>
                              renderSeat(
                                { boatId: boat.id, kind: "seat", idx: i },
                                seatLabel(i),
                                s.athleteId,
                              ),
                            )}
                          </div>
                          {/* THE COX SITS INSIDE THE BOAT, at the stern, below the
                              stroke divider — which is where a cox sits. They used
                              to be stranded under the hull entirely. */}
                          {boat.hasCox && (
                            <>
                              <div className="px-1.5 pb-[3px] pt-1">
                                <div className="h-[1.5px] rounded-[1px] bg-muted" />
                              </div>
                              {renderSeat({ boatId: boat.id, kind: "cox" }, COX_TAG, boat.coxId, true)}
                            </>
                          )}
                          <HullCap arrow="▼" word="STROKE" />
                        </div>
                      </div>

                      {/*
                        THE THREE LINES UNDER THE HULL, in the new design's order:
                        which shell, which oars, and anything else the crew needs.
                        One label column so the three answers line up, and each on
                        its own card rather than as full-width rules — the boat
                        above them is now a shape, and a stack of edge-to-edge
                        rules under it read as the hull leaking into the page.

                        The NOTE used to sit ABOVE the crew. It moved down here
                        with the design: the coach is filling seats first, and the
                        note is the last thing written before the boat goes out.

                        OARS is free text for now — the sets are named on the
                        boathouse rack and the owner is fetching those names. When
                        they land they become a data list and this becomes a
                        picker: no new component, the same field.
                      */}
                      <div className="flex flex-col gap-[7px] px-3 pb-3">
                        <InfoField
                          label="BOAT"
                          value={boat.name}
                          placeholder="Which shell…"
                          strong
                          onChange={(v) => setName(boat.id, v)}
                        />
                        <InfoField
                          label="OARS"
                          value={boat.oars ?? ""}
                          placeholder="Which set to take…"
                          onChange={(v) => setOars(boat.id, v)}
                        />
                        <InfoField
                          label="NOTE"
                          value={boat.note}
                          placeholder="Add a crew note…"
                          dashedWhenEmpty
                          onChange={(v) => setNote(boat.id, v)}
                        />
                      </div>

                      {/*
                        VIDEO — last, because it is the only line filled in AFTER
                        the outing. Everything above it is written before the boat
                        pushes off; this is what comes back with it.
                      */}
                      <CrewVideoStrip dayKey={dayKey} boat={boat} />
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              data-tour="coach-lineup-add-boat"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3.5 text-[13px] font-medium text-muted active:border-primary-line active:text-primary"
            >
              <IconPlus size={16} /> Add{boats.length ? " Another" : ""} Boat
            </button>

            {/* pool */}
            <div className="mt-6">
              <div data-tour="coach-lineup-count" className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Athlete Pool
                </span>
                {picked ? (
                  <span className="rounded-full border border-primary-line bg-primary-tint px-2 py-0.5 text-[11px] font-semibold text-primary">
                    Tap a seat for {rosterById[picked]?.name.split(/\s+/)[0] ?? "them"}
                  </span>
                ) : (
                  <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                    {available.length} available · {unavailable.length} out
                  </span>
                )}
              </div>

              {/*
                FOUR BUTTONS. All, Port, Starboard, Cox. Anyone who rows BOTH
                appears under Port AND Starboard, because they can genuinely
                take either seat and hiding them from a filter would cost the
                coach an option. Cox is its own button: coxswains have no side
                to be found under, so filling the cox seat used to mean picking
                them out of All by eye.

                The pool used to be split by erg-training column (Group B, OYO,
                Rx…). Gone on the owner's call: those groups are not true for
                long, and they are not the question being asked while a boat is
                being filled.
              */}
              <div data-tour="coach-lineup-filters" className="mb-2.5 flex select-none gap-1.5">
                {poolFilters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setPoolFilter(f.key)}
                    aria-pressed={poolFilter === f.key}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                      poolFilter === f.key
                        ? "border-primary bg-primary-tint text-text"
                        : "border-border bg-surface text-muted"
                    }`}
                  >
                    {f.color && (
                      <span
                        className="h-2.5 w-2.5 rounded-sm border"
                        style={blade(f.color, f.ink ?? "#ffffff")}
                      />
                    )}
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {(() => {
                  // One flat list, alphabetical. Anyone unavailable is left out
                  // here and listed once at the bottom under its own heading.
                  const chips = available
                    .filter((a) => inPool(a, poolFilter))
                    .sort((a, b) => a.name.localeCompare(b.name));
                  if (chips.length === 0) {
                    return (
                      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] italic text-muted">
                        Nobody left in the pool.
                      </div>
                    );
                  }
                  return (
                    <div className="flex flex-wrap gap-1.5">
                      {chips.map((a) => (
                        <PoolChip
                          key={a.id}
                          a={a}
                          picked={picked === a.id}
                          onTap={() => {
                            // A seat is already open and waiting: this name
                            // belongs in it. Otherwise pick them up and wait
                            // for the seat.
                            if (typing) void assign(typing, a.id);
                            else setPicked((p) => (p === a.id ? null : a.id));
                          }}
                          onDragStart={() => setDropKey(null)}
                        />
                      ))}
                    </div>
                  );
                })()}

                {/*
                  UNAVAILABLE — the question a coach asks before any of the
                  others: who can't I pick today. It answers the SAME filter as
                  the pool above it, because "who can't I pick" is only ever
                  asked about the seat being filled: on Cox it is the coxswains
                  who are out, and nobody wants four injured rowers listed
                  under it.
                */}
                {unavailableHere.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
                      Unavailable
                      <span className="h-px flex-1 bg-danger-line" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {unavailableHere.map((a) => (
                        <PoolChip
                          key={a.id}
                          a={a}
                          out={outById[a.id]}
                          onTap={() => void bringBackIn(a)}
                          onDragStart={() => setDropKey(null)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/*
        ADD BOAT. Four riggings, written the way a crew writes them — 8+, 4+,
        4−, 2− — and nothing else. It used to spell each one out underneath
        ("Eight", "Coxed Four", "8 rowers + cox") in a card twice the size, and
        a heading in big type over a line explaining what riggings are. A coach
        knows what 4− is (owner, 2026-09-17). Two words and four buttons.

        THE GREY LINE DOES WHAT IT LOOKS LIKE. Drag the sheet down and it goes;
        past a third of its own height it closes, short of that it springs back.
        The handle was there from the first day and had never been draggable.
      */}
      {sheetOpen && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/60" onClick={() => setSheetOpen(false)}>
          <div
            ref={sheetRef}
            className="w-full touch-none rounded-t-3xl border-t border-border bg-background px-5 pb-8 pt-3"
            style={{
              transform: drag ? `translateY(${drag}px)` : undefined,
              transition: dragging ? "none" : "transform 0.22s cubic-bezier(0.2,0.8,0.2,1)",
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={onSheetDown}
            onPointerMove={onSheetMove}
            onPointerUp={onSheetUp}
            onPointerCancel={onSheetUp}
          >
            <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-border" />
            <h2 className="text-[15px] font-semibold text-text">Add Boat</h2>
            {boatKinds.length === 0 ? (
              /* A squad that deleted every rigging. Said plainly, with the one
                 place that fixes it named. */
              <p className="mt-3 text-[12px] leading-relaxed text-muted">
                No boats set up. Add the ones your squad rows in Settings → Boats.
              </p>
            ) : (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {boatKinds.map((b) => (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => addBoat(b)}
                    title={b.name}
                    className="tap44 rounded-2xl border border-border bg-surface py-3.5 text-xl font-semibold text-text active:border-primary active:bg-primary-tint"
                  >
                    {b.symbol}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
export default function LineupBuilderScreen({
  openKey = null,
}: {
  /** A practice to open straight away (?practice= from the Today screen). */
  openKey?: string | null;
}) {
  const { membership } = useMembership();
  /*
    THE SQUAD'S OWN WORDS AND RULES — which types need a lineup, and what each
    session is called and coloured. The same config the Plan tab edits by, so
    a "Pool" session a swimming coach marked as needing a lineup lights up
    here exactly as a rowing coach's "Water" does. Until it loads (and for a
    squad that never opened Settings) it is the rowing default.
  */
  const [cfg, setCfg] = useState<TrainingConfig>(defaultConfig);
  useEffect(() => {
    const teamId = membership?.teamId;
    if (!teamId) return;
    let active = true;
    fetchTrainingConfig(teamId).then((c) => {
      if (active) setCfg(c);
    });
    return () => {
      active = false;
    };
  }, [membership?.teamId]);

  const [statuses, setStatuses] = useState<Record<string, LineupStatus>>({});
  const [plan, setPlan] = useState<Plan | null>(null);
  const [practice, setPractice] = useState<{
    key: string;
    dayKey: string;
    context: { weekday: string; period: string; sub: string };
    planContext: PlanContext;
  } | null>(null);

  const refreshStatuses = async () => setStatuses(await fetchLineupStatuses());

  // What the plan prescribes for one slot — the same lookup the builder does
  // when it shows the prescribed-session card, just one screen earlier.
  const planCell = useCallback(
    (dayKey: string): PlanCell => {
      const sess = plan?.sessions[dayKey];
      if (!sess) return null;
      return {
        label: configSessionLabel(cfg, sess.category, sess.intensity),
        description: sess.description.trim(),
        // The INTENSITY's colour when the session has one, exactly as the plan
        // grid paints it — so a UT2 outing is the same green in both screens.
        color: configSessionColor(cfg, sess.category, sess.intensity),
        water: configNeedsLineup(cfg, sess.category),
      };
    },
    [plan, cfg],
  );

  useEffect(() => {
    (async () => {
      const [s, p] = await Promise.all([fetchLineupStatuses(), fetchPlan()]);
      setStatuses(s);
      setPlan(p);
    })();
  }, []);

  // The next 7 days, each with its two practices and DB status.
  const days: PickDay[] = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    const out: PickDay[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const amKey = sessionKey(d, "AM");
      const pmKey = sessionKey(d, "PM");
      out.push({
        id: amKey.slice(0, -3),
        date: d,
        num: d.getDate(),
        weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
        month: d.toLocaleDateString("en-US", { month: "long" }),
        today: i === 0,
        am: { period: "AM", status: (statuses[amKey] as PracticeStatus) ?? "none", plan: planCell(amKey) },
        pm: { period: "PM", status: (statuses[pmKey] as PracticeStatus) ?? "none", plan: planCell(pmKey) },
      });
    }
    return out;
  }, [statuses, planCell]);

  /*
    Open a practice by its day key. Everything the builder needs about WHICH
    day this is comes out of the key itself, so the arrows below can open a day
    that is nowhere on the seven-day picker.
  */
  const open = useCallback(
    (dayKey: string) => {
      const parsed = parseSessionKey(dayKey);
      if (!parsed) return;
      const { date, period } = parsed;
      const s = plan?.sessions[dayKey];
      setPractice({
        key: dayKey,
        dayKey,
        context: {
          weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
          period,
          sub: `${date.toLocaleDateString("en-US", { month: "short" })} ${date.getDate()}`,
        },
        planContext: s
          ? {
              title: s.description.trim() || configSessionLabel(cfg, s.category, s.intensity),
              sub: configSessionLabel(cfg, s.category, s.intensity),
              color: configSessionColor(cfg, s.category, s.intensity),
              water: configNeedsLineup(cfg, s.category),
            }
          : null,
      });
    },
    [plan, cfg],
  );

  /*
    EVERY WATER SESSION IN THE PLAN, in the order they happen. This is the track
    the builder's ‹ › arrows run on: a coach seats Tuesday's outing and steps
    straight to the next one, instead of going back to the picker, finding the
    day and reading which slot was the water one.

    Sorted on the parsed Date, never on the key as text — the key carries a
    zero-based, unpadded month ("2026-5-22-AM" is 22 June), so sorting it as a
    string interleaves the year's months.
  */
  const waterStops = useMemo(() => {
    if (!plan) return [] as { key: string; time: number; period: Period }[];
    return Object.entries(plan.sessions)
      .filter(([, s]) => configNeedsLineup(cfg, s.category))
      .flatMap(([key]) => {
        const p = parseSessionKey(key);
        return p ? [{ key, time: p.date.getTime(), period: p.period }] : [];
      })
      .sort((a, b) => a.time - b.time || (a.period === b.period ? 0 : a.period === "AM" ? -1 : 1));
  }, [plan, cfg]);

  /*
    ARRIVING FROM TODAY. Once the plan is in (so the prescribed-session card
    has something to say), open the practice the link named — once per link,
    so pressing ‹ Days afterwards does not throw the coach straight back in.
  */
  const opened = useRef<string | null>(null);
  useEffect(() => {
    if (!openKey || !plan || opened.current === openKey) return;
    opened.current = openKey;
    open(openKey);
  }, [openKey, plan, open]);

  // The water session either side of the one open. Null at each end of the plan.
  const nav = useMemo(() => {
    const cur = practice ? parseSessionKey(practice.dayKey) : null;
    if (!cur) return { prev: null, next: null };
    const t = cur.date.getTime();
    let prev: string | null = null;
    let next: string | null = null;
    for (const stop of waterStops) {
      const isBefore = stop.time < t || (stop.time === t && stop.period === "AM" && cur.period === "PM");
      const isAfter = stop.time > t || (stop.time === t && stop.period === "PM" && cur.period === "AM");
      if (isBefore) prev = stop.key; // sorted, so the last one before wins
      else if (isAfter && !next) next = stop.key;
    }
    return { prev, next };
  }, [practice, waterStops]);

  if (!practice)
    return <DayPicker days={days} onPick={(day, p) => open(sessionKey(day.date, p.period))} />;

  return (
    <Builder
      key={practice.key}
      dayKey={practice.dayKey}
      context={practice.context}
      planContext={practice.planContext}
      boatKinds={cfg.boats}
      nav={{
        prev: nav.prev,
        next: nav.next,
        label: (key: string) => `${dayKeyLabel(key)} ${parseSessionKey(key)?.period ?? ""}`.trim(),
        go: (key: string) => {
          open(key);
          void refreshStatuses();
        },
      }}
      onBack={() => {
        setPractice(null);
        void refreshStatuses();
      }}
    />
  );
}
