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
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  boatTypes,
  makeSeats,
  defaultBoatName,
  outOptions,
  type OutReason,
  type Practice,
  type PracticeStatus,
  type Boat,
  type Athlete,
  type BoatType,
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
import { fetchOutOn, markBackIn, markOut } from "@/lib/varsity/availabilityStore";
import Sheet from "@/components/varsity/Sheet";
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
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
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
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

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

function Avatar({
  initials,
  side,
  cox,
  className = "",
}: {
  initials: string;
  side?: Side;
  cox?: boolean;
  className?: string;
}) {
  const paint = cox
    ? blade(COX_COLOR, COX_INK)
    : side
      ? blade(sideMeta[side].color, sideMeta[side].ink)
      : undefined;
  return (
    <span
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[11px] font-bold ${className}`}
      style={paint}
    >
      {initials}
    </span>
  );
}

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
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">Lineup</div>
      <h1 className="mt-0.5 text-2xl font-semibold text-text">Create Lineup</h1>
      <p className="mt-1 text-[12px] text-muted">
        Pick a practice to build. A lineup seats a boat, so the water sessions are
        the usual ones — but any slot opens.
      </p>

      <div className="mt-5">
        <SectionLabel>Next 7 days</SectionLabel>
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
        {matches.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 select-none overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
            {matches.slice(0, 5).map((m) => (
              <button
                key={m.a.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAssign(m.a.id);
                }}
                className="flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 active:bg-primary-tint"
              >
                <Avatar initials={m.a.initials} side={m.a.side} cox={m.a.cox} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
                  {m.a.name}
                  {/* Already in a boat: say where, because picking them is a
                      swap and the coach should know what it costs. */}
                  {m.where && (
                    <span className="ml-1.5 font-normal text-muted">· {m.where}</span>
                  )}
                </span>
                <AthleteTag a={m.a} />
              </button>
            ))}
          </div>
        )}
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
/* ─────────────────────────  pool chip  ───────────────────────── */
/*
  TAP A CHIP TO SAY WHO IS OUT. The chip is where the coach is already
  looking when someone texts "not coming" at 5:30, so it is also where they
  are marked out — and where they are brought back. `out` is the reason they
  are out on THIS practice's day (from availabilityStore), never a fact about
  the person. Dragging still works on a desktop: a drag never fires the tap.
*/
function PoolChip({
  a,
  out,
  onTap,
  onDragStart,
}: {
  a: Athlete;
  out?: OutReason;
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
        aria-label={`${a.name}, out — ${outMeta[out]}. Tap to bring back in.`}
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
      aria-label={`${a.name}. Tap to mark out.`}
      className="flex h-[38px] cursor-grab select-none items-center gap-2 rounded-[10px] border border-border bg-surface px-2.5 active:cursor-grabbing active:border-primary-line active:bg-primary-tint"
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
  nav,
  onBack,
}: {
  dayKey: string;
  context: { weekday: string; period: string; sub: string };
  planContext: PlanContext;
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
    WHO IS OUT ON THIS DAY, and why. A fact about the day, read from the
    availability store for the date this practice falls on — so the AM and PM
    of one day agree, and a rower marked injured on Tuesday is still out when
    Friday's boats are seated. `outSheet` is the person the coach has tapped.
  */
  const dayIso = useMemo(() => {
    const parsed = parseSessionKey(dayKey);
    return parsed ? toISO(parsed.date) : toISO(new Date());
  }, [dayKey]);
  const [outById, setOutById] = useState<Record<string, OutReason>>({});
  const [outSheet, setOutSheet] = useState<Athlete | null>(null);
  const [outBusy, setOutBusy] = useState(false);

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
    Which practice this crew was CARRIED from, when it was. Null for a practice
    that already had a lineup of its own (even an empty one the coach cleared
    — that was a decision, and it stands) and for a squad never given one.
  */
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
        Nothing here yet. Start from the last crew the squad was given, as a
        draft. `saved` stays "[]" — the database really does hold nothing — so
        the carried crew is dirty from the first frame and the autosave writes
        it as this practice's draft, exactly as if the coach had seated it.
      */
      const carried = await fetchCarriedLineup(dayKey);
      if (!active) return;
      setSaved("[]");
      setAnnounced(null);
      setBoats(carried?.boats ?? []);
      setCarriedFrom(carried?.from ?? null);
      setStatus("draft");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dayKey]);

  /* The coach would rather build this one from scratch. */
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
  const setOut = async (a: Athlete, reason: OutReason | null) => {
    setOutBusy(true);
    const { error } = reason
      ? await markOut(
          a.id,
          reason,
          dayIso,
          outOptions.find((o) => o.reason === reason)?.span === "day" ? dayIso : null,
        )
      : await markBackIn(a.id, dayIso);
    setOutBusy(false);
    if (error) {
      console.error("availability:", error);
      return;
    }
    setOutById((prev) => {
      const next = { ...prev };
      if (reason) next[a.id] = reason;
      else delete next[a.id];
      return next;
    });
    if (reason) {
      setBoats((prev) =>
        prev.map((b) => ({
          ...b,
          seats: b.seats.map((s) => (s.athleteId === a.id ? { ...s, athleteId: null } : s)),
          coxId: b.coxId === a.id ? null : b.coxId,
        })),
      );
    }
    setOutSheet(null);
  };

  const setNote = (boatId: string, note: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, note } : b)));
  const setName = (boatId: string, name: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, name } : b)));
  const setDock = (boatId: string, dock: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, dock } : b)));
  const setOars = (boatId: string, oars: string) =>
    setBoats((prev) => prev.map((b) => (b.id === boatId ? { ...b, oars } : b)));

  const addBoat = (type: BoatType) => {
    setBoats((bs) => [
      ...bs,
      {
        id: `boat-${Date.now()}`,
        badge: type,
        name: defaultBoatName(type),
        dock: DEFAULT_DOCK,
        oars: "",
        note: "",
        hasCox: type === "8+" || type === "4+",
        coxId: null,
        seats: makeSeats(type),
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

  const renderSeat = (slot: Slot, label: string, athleteId: string | null, cox = false) => {
    const key = slotKey(slot);
    return (
      <Seat
        key={key}
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
    );
  };

  return (
    <div className="relative flex h-full flex-col">
      <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto px-4 pb-28 pt-4">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-[13px] text-muted">
          <IconArrowLeft size={16} /> Days
        </button>
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
                {status === "published" ? "Live" : "Draft"}
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
                should not make. */}
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-text">{planContext.title}</div>
              <div className="mt-0.5 text-[11px] text-muted">{planContext.sub}</div>
            </div>
          </div>
        )}

        {/*
          A lineup seats a boat, so an erg or a lift is an odd thing to build one
          for. Odd is not wrong — the coach may be seating a tank session, an erg
          in boat order, or a day the plan has not caught up with — so this SAYS
          so and gets out of the way. It never blocks (the owner's rule).
        */}
        {planContext && !planContext.water && (
          <div className="mt-2.5 rounded-xl border border-warn-line bg-warn-tint px-3 py-2.5 text-[11px] leading-relaxed text-text">
            The plan has <span className="font-semibold">{planContext.sub}</span> here, not a
            water session. You can still build a lineup.
          </div>
        )}

        {loading ? (
          <div className="mt-8 text-center text-[13px] text-muted">Loading lineup…</div>
        ) : (
          <>
            {/*
              WHERE THESE BOATS CAME FROM. Said plainly, because a coach opening
              a blank Friday and finding Tuesday's crews already seated has to
              be able to tell that nothing was decided for Friday yet — these
              are a starting point, and the one button undoes the whole thing.
              It stays until the coach leaves or starts empty: a crew you have
              already changed three seats of still began as somebody else's.
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
                const filled = boat.seats.filter((s) => s.athleteId).length;
                return (
                  <div key={boat.id} className="overflow-hidden rounded-2xl border border-border bg-surface">
                    {/* header — the rigging, the boat's name and the push-off
                        time, read-only. The name is EDITED under the crew,
                        where the coach's own lineup sheet puts it; it is echoed
                        up here so a boat stays identifiable while you scroll
                        past its nine seats. */}
                    <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="flex-shrink-0 rounded-md border border-primary-line bg-primary-tint px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {boat.badge}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-text">
                          {boat.name}
                        </span>
                      </div>
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
                      </div>
                    </div>

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

                    {/*
                      Footer — how full the boat is, and WHO is in it: how many
                      port, how many starboard, how many row either way. It no
                      longer says what the boat "needs", because the seats no
                      longer claim a side. It is a count of the crew, which the
                      coach reads against the rig they have in mind.
                    */}
                    <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2 text-[11px] text-muted">
                      <span>
                        {filled} / {boat.seats.length} filled
                      </span>
                      <span className="flex items-center gap-2">
                        {(["P", "S", "B"] as const).map((sd) => {
                          const have = boat.seats.filter(
                            (st) => st.athleteId && rosterById[st.athleteId]?.side === sd,
                          ).length;
                          return (
                            <span key={sd} className="flex items-center gap-1">
                              <span
                                className="h-2.5 w-2.5 rounded-sm border"
                                style={blade(sideMeta[sd].color, sideMeta[sd].ink)}
                              />
                              <span className={have ? "text-text" : undefined}>
                                {have} {sideMeta[sd].label.toLowerCase()}
                              </span>
                            </span>
                          );
                        })}
                      </span>
                    </div>
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
                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                  {available.length} available · {unavailable.length} out
                </span>
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
                          onTap={() => setOutSheet(a)}
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
                          onTap={() => setOutSheet(a)}
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
        The publish bar. No Save button any more — the crew saves itself, and
        the quiet line above says so. What is left is the one decision worth a
        button, in the same three states and the same words as the Plan tab.
      */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-4 pb-6 pt-8">
        <div className="mx-auto max-w-screen-sm">
          <div className="mb-1.5 flex justify-end">
            <SaveState
              status={failed ? "error" : writing || dirty ? "saving" : "saved"}
              onRetry={() => void persist()}
            />
          </div>
          <PublishBar
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
        MARK OUT / BRING BACK. Opened by tapping a name in the pool. The two
        ways of being out are data (outOptions): sick is today, injured is
        until the coach says otherwise. Someone already out gets the way back
        in first, then the other reason — a "sick" who turns out to be hurt is
        one tap, not two.
      */}
      {outSheet && (
        <Sheet
          title={outById[outSheet.id] ? `${outSheet.name} is out` : `Mark ${outSheet.name} out`}
          onClose={() => setOutSheet(null)}
        >
          <div className="flex flex-col gap-2">
            {outById[outSheet.id] && (
              <button
                type="button"
                disabled={outBusy}
                onClick={() => void setOut(outSheet, null)}
                className="flex w-full items-center gap-3 rounded-xl border border-success-line bg-success-tint px-3.5 py-3 text-left disabled:opacity-50"
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-text">Back in</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    Available from {dayKeyLabel(dayKey)}. The days missed stay on record.
                  </span>
                </span>
                <IconCheck size={16} className="flex-shrink-0 text-success" />
              </button>
            )}
            {outOptions
              .filter((o) => o.reason !== outById[outSheet.id])
              .map((o) => (
                <button
                  key={o.reason}
                  type="button"
                  disabled={outBusy}
                  onClick={() => void setOut(outSheet, o.reason)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-left disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-text">{o.label}</span>
                    <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">{o.sub}</span>
                  </span>
                  <IconChevronRight size={14} className="flex-shrink-0 text-muted" />
                </button>
              ))}
            {seatedIds.has(outSheet.id) && !outById[outSheet.id] && (
              <p className="px-1 pt-1 text-[11px] leading-relaxed text-muted">
                {outSheet.name.split(/\s+/)[0]} is in a boat — marking them out empties that seat.
              </p>
            )}
          </div>
        </Sheet>
      )}

      {sheetOpen && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/60" onClick={() => setSheetOpen(false)}>
          <div
            className="w-full rounded-t-3xl border-t border-border bg-background px-5 pb-8 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
            <h2 className="text-lg font-semibold text-text">Add Boat</h2>
            <p className="mb-4 text-[12px] text-muted">Pick a rigging type.</p>
            <div className="grid grid-cols-2 gap-2">
              {boatTypes.map((b) => (
                <button
                  key={b.type}
                  type="button"
                  onClick={() => addBoat(b.type)}
                  className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-3 py-3.5 active:border-primary active:bg-primary-tint"
                >
                  <span className="text-xl font-semibold text-text">{b.symbol}</span>
                  <span className="text-[12px] font-semibold text-text">{b.name}</span>
                  <span className="text-[11px] text-muted">{b.desc}</span>
                </button>
              ))}
            </div>
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
