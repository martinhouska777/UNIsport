"use client";

/*
  Coach LINEUP BUILDER (DB-backed).
  Two views:
    • "days"    — pick a practice (a real day's AM or PM) to build. Each shows a
                  status dot (none / draft / published) read from the database.
    • "builder" — fill boats for that practice from the athlete pool, then Save
                  (draft) or Publish to the team. Loads any existing lineup.

  Seats are live: click an empty seat to TYPE a name (autocomplete from the pool),
  or DRAG a name from the pool (or another seat) onto a seat. The X clears a seat
  back to the pool. There is ONE roster, so each athlete is in exactly one place.
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

  The POOL is filtered four ways and grouped none: All, Port, Starboard, Cox,
  with the both-sides rowers appearing under both Port and Starboard. The
  UNAVAILABLE list underneath answers the same filter, and each name there
  carries its side as well as the reason it is out.

  NOTE: the roster is still demo data (no real athlete accounts yet), so athletes
  see the published boats but not a personalised "your seat" highlight — that
  needs real team membership (a later slice).
*/
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button, { buttonClass } from "@/components/ui/Button";
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
  type Practice,
  type PracticeStatus,
  type Boat,
  type Athlete,
  type BoatType,
  type PoolFilter,
} from "@/lib/varsity/coachLineup";
import {
  dayKeyLabel,
  isOnWater,
  parseSessionKey,
  sessionColor,
  sessionKey,
  sessionLabel,
  type Period,
} from "@/lib/varsity/coachPlan";
import { fetchPlan, type Plan } from "@/lib/varsity/planStore";
import { notifySquad } from "@/lib/push/client";
import {
  fetchLineup,
  fetchLineupStatuses,
  saveLineup,
  type LineupStatus,
} from "@/lib/varsity/lineupStore";
import CrewVideoStrip from "@/components/varsity/CrewVideoStrip";
import {
  IconArrowLeft,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconPlus,
  IconX,
  IconSend,
  IconCheck,
} from "@/components/icons";

/* a target slot inside a boat: a numbered seat, or the cox seat */
type Slot = { boatId: string; kind: "seat"; idx: number } | { boatId: string; kind: "cox" };
const slotKey = (s: Slot) => (s.kind === "cox" ? `${s.boatId}:cox` : `${s.boatId}:${s.idx}`);

/*
  What the training plan prescribes for one AM or PM slot, reduced to the few
  things worth showing on a picker button. Null when the plan has nothing there.

  `water` is the one that decides whether the slot can be tapped at all: a
  lineup seats a BOAT, so an erg, a lift, a flex session or a day off has no
  lineup to build. The owner's rule, and the reason `isOnWater` exists.
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
*/
function Seat({
  label,
  athlete,
  cox,
  typing,
  query,
  matches,
  dropActive,
  onStartType,
  onQuery,
  onAssign,
  onClear,
  onDragStartSeat,
  onDropSlot,
  onDragOverSlot,
  onDragLeaveSlot,
}: {
  /** The seat's number — "1" up to "8" — or the cox's "C". */
  label: string;
  athlete?: Athlete;
  cox?: boolean;
  typing: boolean;
  query: string;
  matches: Athlete[];
  dropActive: boolean;
  onStartType: () => void;
  onQuery: (v: string) => void;
  onAssign: (id: string) => void;
  onClear: () => void;
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
          {chip}
          <input
            autoFocus
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && matches[0]) onAssign(matches[0].id);
              if (e.key === "Escape") onClear();
            }}
            placeholder="Type a name…"
            /* 16px, so a phone does not zoom the whole boat when it focuses. */
            className="w-full min-w-0 flex-1 bg-transparent text-[16px] font-medium text-text outline-none placeholder:text-text-3"
          />
        </div>
        {matches.length > 0 && (
          <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 select-none overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
            {matches.slice(0, 5).map((m) => (
              <button
                key={m.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAssign(m.id);
                }}
                className="flex w-full items-center gap-2.5 border-b border-border px-3 py-2.5 text-left last:border-b-0 active:bg-primary-tint"
              >
                <Avatar initials={m.initials} side={m.side} cox={m.cox} />
                <span className="flex-1 truncate text-[13px] font-semibold text-text">
                  {m.name}
                </span>
                <AthleteTag a={m} />
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (athlete) {
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", athlete.id);
          onDragStartSeat();
        }}
        {...dropHandlers}
        className={`flex h-10 cursor-grab select-none items-center gap-2 rounded-[10px] border pl-[7px] pr-[6px] active:cursor-grabbing ${
          dropActive ? "border-primary bg-primary-tint" : "border-border bg-surface"
        }`}
        style={dropActive ? undefined : coxEdge}
      >
        {chip}
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
          onClick={onClear}
          aria-label={`Clear ${athlete.name} from this seat`}
          className="-mr-1 flex h-10 w-[34px] flex-shrink-0 items-center justify-center text-[17px] leading-none text-muted hover:text-danger"
        >
          <IconX size={15} />
        </button>
      </div>
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
function PoolChip({ a, onDragStart }: { a: Athlete; onDragStart: () => void }) {
  if (a.out) {
    /*
      Two facts, in the order a coach needs them: WHICH SIDE this person is
      (or that they cox), then WHY they are out. The side was missing here,
      so an unavailable rower was a name with no rig — and a coach reading
      the list to see what the injury costs them had to remember it.
    */
    return (
      <div className="flex h-[38px] select-none items-center gap-2 rounded-[10px] border border-danger-line bg-danger-tint px-2.5 opacity-60">
        <span className="text-[15px] font-medium text-muted">{a.name}</span>
        <AthleteTag a={a} />
        <span className="rounded bg-danger-tint px-1.5 py-px font-mono text-[9px] font-semibold uppercase tracking-[0.06em] text-danger">
          {outMeta[a.out]}
        </span>
      </div>
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
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", a.id);
        onDragStart();
      }}
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
  const [busy, setBusy] = useState<null | "save" | "publish">(null);
  const [justSaved, setJustSaved] = useState(false);
  const [typing, setTyping] = useState<Slot | null>(null);
  const [query, setQuery] = useState("");
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [poolFilter, setPoolFilter] = useState<PoolFilter>("all");

  /*
    What was loaded, as text. Anything else in `boats` means unsaved work —
    which matters because the ‹ › arrows leave this practice, and a half-seated
    eight is not something to lose to a mis-tap. Compared, not counted: a name
    typed into a boat or an oar set is as much work as a seat filled.
  */
  const loaded = useRef("[]");

  // Load any existing lineup for this practice from the database.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await fetchLineup(dayKey);
      if (!active) return;
      loaded.current = JSON.stringify(stored?.boats ?? []);
      setBoats(stored?.boats ?? []);
      setStatus(stored?.status ?? "draft");
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [dayKey]);

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
    () => roster.filter((a) => !a.out && !seatedIds.has(a.id)),
    [seatedIds],
  );
  // Injured or ill: never seatable, and shown as one list rather than dimmed
  // in among the training groups.
  const unavailable = useMemo(() => roster.filter((a) => a.out), []);
  // The same list under the filter the pool is showing — an out rower is no
  // more relevant to the cox seat than an available one.
  const unavailableHere = useMemo(
    () => unavailable.filter((a) => inPool(a, poolFilter)),
    [unavailable, poolFilter],
  );
  const matches = useMemo(() => {
    // A cox seat only offers coxes and a rowing seat never does — the one hard
    // rule left in a seat, because a cox does not row. Which SIDE a rower pulls
    // no longer narrows anything: a seat is a number, so every available rower
    // is offered for every seat, and the coach rigs the boat.
    const wantCox = typing?.kind === "cox";
    const list = available.filter((a) => !!a.cox === wantCox);
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (a) => a.name.toLowerCase().includes(q) || a.initials.toLowerCase().includes(q),
    );
  }, [available, query, typing]);

  // put `athleteId` into `slot`, removing them from wherever they were first.
  // The cox seat is locked to coxes; coxes can't take a rowing seat.
  const assign = (slot: Slot, athleteId: string) => {
    const a = rosterById[athleteId];
    if (!a) return;
    if (slot.kind === "cox" && !a.cox) return;
    if (slot.kind === "seat" && a.cox) return;
    setBoats((prev) =>
      prev
        .map((b) => ({
          ...b,
          seats: b.seats.map((s) => (s.athleteId === athleteId ? { ...s, athleteId: null } : s)),
          coxId: b.coxId === athleteId ? null : b.coxId,
        }))
        .map((b) => {
          if (b.id !== slot.boatId) return b;
          if (slot.kind === "cox") return { ...b, coxId: athleteId };
          return {
            ...b,
            seats: b.seats.map((s, i) => (i === slot.idx ? { ...s, athleteId } : s)),
          };
        }),
    );
    setTyping(null);
    setQuery("");
    setDropKey(null);
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
        name: `New ${type}`,
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

  const persist = async (newStatus: LineupStatus, which: "save" | "publish") => {
    setBusy(which);
    const { error } = await saveLineup(dayKey, boats, newStatus);
    setBusy(null);
    if (error) {
      console.error("saveLineup:", error);
      return;
    }
    loaded.current = JSON.stringify(boats);
    setStatus(newStatus);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1500);

    /*
      PUBLISHING TELLS THE SQUAD. Fired from here rather than from saveLineup(),
      because the arrows auto-save on the way out — and an already-published
      lineup saved by walking past it must not buzz forty phones. Only the
      button does that.
    */
    if (which === "publish") {
      notifySquad({
        kind: "team_lineup",
        preview: `${context.weekday} ${context.period}`,
      });
    }
  };

  /*
    Step to the water session either side of this one.

    Unsaved work is SAVED FIRST, keeping whatever status this lineup already
    has — a draft stays a draft, a published lineup stays published. Losing a
    seated crew to an arrow tap would be the worst thing this screen could do,
    and the coach did not ask to leave the work behind, only to move on.
  */
  const step = async (key: string | null) => {
    if (!key || busy) return;
    if (JSON.stringify(boats) !== loaded.current) {
      setBusy("save");
      const { error } = await saveLineup(dayKey, boats, status);
      setBusy(null);
      if (error) {
        console.error("saveLineup:", error);
        return; // stay put rather than walk away from work that didn't save
      }
      loaded.current = JSON.stringify(boats);
    }
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
        typing={!!typing && slotKey(typing) === key}
        query={query}
        matches={matches}
        dropActive={dropKey === key}
        onStartType={() => {
          setTyping(slot);
          setQuery("");
        }}
        onQuery={setQuery}
        onAssign={(id) => assign(slot, id)}
        onClear={() => {
          if (athleteId) clear(slot);
          else {
            setTyping(null);
            setQuery("");
          }
        }}
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
          <StepArrow dir="prev" to={nav.prev} label={nav.label} onGo={step} busy={busy !== null} />
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
          <StepArrow dir="next" to={nav.next} label={nav.label} onGo={step} busy={busy !== null} />
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
            <div className="flex-1">
              <div className="text-[13px] font-semibold text-text">{planContext.title}</div>
              <div className="mt-0.5 text-[11px] text-muted">{planContext.sub}</div>
            </div>
            <span className="text-muted">
              <IconChevronRight size={14} />
            </span>
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
                        <PoolChip key={a.id} a={a} onDragStart={() => setDropKey(null)} />
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
                        <PoolChip key={a.id} a={a} onDragStart={() => setDropKey(null)} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* save / publish bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-4 pb-6 pt-6">
        {/* data-tour: the two buttons only — the bar around them is a tall
            fade, and a ring drawn on that swallows half the pool. */}
        <div data-tour="coach-lineup-publish" className="mx-auto flex max-w-screen-sm gap-2.5">
          <button
            type="button"
            onClick={() => persist("draft", "save")}
            disabled={busy !== null}
            className={buttonClass({ variant: "secondary", size: "lg" })}
          >
            <IconCheck size={15} />
            {busy === "save" ? "Saving…" : justSaved && status === "draft" ? "Saved" : "Save draft"}
          </button>
          <Button
            size="lg"
            onClick={() => persist("published", "publish")}
            disabled={busy !== null}
            className="flex-1"
          >
            <IconSend size={16} />
            {busy === "publish"
              ? "Publishing…"
              : status === "published"
                ? "Update live lineup"
                : "Publish to team"}
          </Button>
        </div>
      </div>

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
export default function LineupBuilderScreen() {
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
        label: sessionLabel(sess),
        description: sess.description.trim(),
        // The INTENSITY's colour when the session has one, exactly as the plan
        // grid paints it — so a UT2 outing is the same green in both screens.
        color: sessionColor(sess),
        water: isOnWater(sess),
      };
    },
    [plan],
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
              title: s.description.trim() || sessionLabel(s),
              sub: sessionLabel(s),
              color: sessionColor(s),
              water: isOnWater(s),
            }
          : null,
      });
    },
    [plan],
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
      .filter(([, s]) => isOnWater(s))
      .flatMap(([key]) => {
        const p = parseSessionKey(key);
        return p ? [{ key, time: p.date.getTime(), period: p.period }] : [];
      })
      .sort((a, b) => a.time - b.time || (a.period === b.period ? 0 : a.period === "AM" ? -1 : 1));
  }, [plan]);

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
