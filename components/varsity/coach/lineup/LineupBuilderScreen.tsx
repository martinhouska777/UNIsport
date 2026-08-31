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

  A SEAT IS A NUMBER, and the boat reads TOP-DOWN IN THE ORDER THE COACH ALREADY
  WRITES IT: 1 at the bow down to 8 at the stroke, cox last, marked "C" (the word
  COX did not survive a 20px badge; it is still the word everywhere there is room
  to read it). Then the boat, then the oars — the column order of the squad's own
  lineup sheet, so a crew can be copied across without reading it backwards.

  Seats carry no side and no colour
  of their own, and nothing is ever flagged "off side" — how the boat is rigged
  is the coach's business, not the app's. The only rule left in a seat is that a
  cox does not row and a rower does not cox.

  The POOL is filtered three ways and grouped none: All, Port, Starboard, with
  the both-sides rowers appearing under every filter.

  NOTE: the roster is still demo data (no real athlete accounts yet), so athletes
  see the published boats but not a personalised "your seat" highlight — that
  needs real team membership (a later slice).
*/
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { isOnWater, sessionColor, sessionKey, sessionLabel } from "@/lib/varsity/coachPlan";
import { fetchPlan, type Plan } from "@/lib/varsity/planStore";
import {
  fetchLineup,
  fetchLineupStatuses,
  saveLineup,
  type LineupStatus,
} from "@/lib/varsity/lineupStore";
import {
  IconArrowLeft,
  IconChevronRight,
  IconClock,
  IconAnchor,
  IconPlus,
  IconX,
  IconSend,
  IconClipboard,
  IconPencil,
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
type PlanContext = { title: string; sub: string; water: boolean } | null;

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
            <span className="w-full truncate text-[10px] leading-snug text-muted">
              {plan.description}
            </span>
          )}
        </span>
      ) : (
        <span className="text-[11px] text-muted/70">Nothing planned</span>
      )}

      <span className="flex items-center gap-1.5 text-[11px] text-muted">
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
  /** The seat's number — "8" down to "1" — or the cox's "C". */
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
  /*
    The seat's badge. A rowing seat carries its NUMBER and nothing else — no
    colour, because the boat no longer claims to know which side that seat
    rows. The cox's badge keeps the cox yellow, because that is a person's
    role rather than a rig.
  */
  const seatPaint = cox ? blade(COX_COLOR, COX_INK) : undefined;

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

  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border text-[11px] font-bold ${
          cox ? "" : "border-border bg-surface-2 text-text"
        }`}
        style={seatPaint}
        title={cox ? "Cox" : `Seat ${label}`}
      >
        {label}
      </span>

      {typing ? (
        <div className="relative min-h-[42px] flex-1">
          <div
            className={`flex min-h-[42px] items-center gap-2 rounded-lg border px-2.5 ${
              cox ? "border-accent" : "border-primary"
            } bg-surface-2`}
          >
            <input
              autoFocus
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && matches[0]) onAssign(matches[0].id);
                if (e.key === "Escape") onClear();
              }}
              placeholder="Type name or drag from pool"
              className="w-full bg-transparent text-[13px] font-medium text-text outline-none placeholder:text-text-3"
            />
          </div>
          {matches.length > 0 && (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-30 overflow-hidden rounded-xl border border-border bg-surface-2 shadow-xl">
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
      ) : athlete ? (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", athlete.id);
            onDragStartSeat();
          }}
          {...dropHandlers}
          className={`flex min-h-[42px] flex-1 cursor-grab items-center gap-2 rounded-lg border px-2.5 py-1.5 active:cursor-grabbing ${
            dropActive
              ? "border-accent bg-accent-tint"
              : cox
                ? "border-accent-line bg-accent-tint"
                : "border-primary-line bg-primary-tint"
          }`}
        >
          <Avatar initials={athlete.initials} side={athlete.side} cox={cox} />
          <span className="flex-1 truncate text-[13px] font-semibold text-text">{athlete.name}</span>
          {/* The rower's OWN side, which is a fact about them. The seat has none. */}
          {!cox && <SideTag side={athlete.side} />}
          <button type="button" onClick={onClear} className="text-muted hover:text-danger">
            <IconX size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartType}
          {...dropHandlers}
          className={`flex min-h-[42px] flex-1 items-center gap-2 rounded-lg border border-dashed px-2.5 text-left ${
            dropActive
              ? "border-accent bg-accent-tint text-accent"
              : cox
                ? "border-border text-muted hover:border-accent-line"
                : "border-border text-muted hover:border-primary-line"
          }`}
        >
          <IconPlus size={13} />
          <span className="text-[12px] italic">Type or drag a name…</span>
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────  pool chip  ───────────────────────── */
function PoolChip({ a, onDragStart }: { a: Athlete; onDragStart: () => void }) {
  if (a.out) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-danger-line bg-danger-tint px-2 py-1.5 opacity-50">
        <Avatar initials={a.initials} className="border-danger-line bg-danger-tint text-danger" />
        <span className="text-[12px] font-semibold text-muted">{a.name}</span>
        <span className="rounded bg-danger-tint px-1.5 py-px text-[10px] font-bold uppercase tracking-[0.05em] text-danger">
          {outMeta[a.out]}
        </span>
      </div>
    );
  }
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", a.id);
        onDragStart();
      }}
      className="flex cursor-grab items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5 active:cursor-grabbing active:border-primary-line active:bg-primary-tint"
    >
      <Avatar initials={a.initials} side={a.side} cox={a.cox} />
      <span className="text-[12px] font-semibold text-text">{a.name}</span>
      <AthleteTag a={a} />
    </div>
  );
}

/* ─────────────────────────  builder  ───────────────────────── */
function Builder({
  dayKey,
  context,
  planContext,
  onBack,
}: {
  dayKey: string;
  context: { weekday: string; period: string; sub: string };
  planContext: PlanContext;
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

  // Load any existing lineup for this practice from the database.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = await fetchLineup(dayKey);
      if (!active) return;
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
    setStatus(newStatus);
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1500);
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
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-text">
            {context.weekday} {context.period}
          </h1>
          <span
            className={`flex items-center gap-1 rounded px-1.5 py-px text-[11px] font-semibold uppercase tracking-[0.12em] ${
              status === "published"
                ? "border border-success-line bg-success-tint text-success"
                : "border border-warn-line bg-warn-tint text-warn"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status === "published" ? "bg-success" : "bg-warn"}`} />
            {status === "published" ? "Published" : "Draft"}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-muted">{context.sub}</div>

        {/* prescribed session (from the published plan, if any) */}
        {planContext && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-3">
            <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-danger" />
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
                    {/* header — the rigging and the push-off time. The boat's
                        NAME is not here: it sits under the crew, where the
                        coach's own lineup sheet puts it (see below). */}
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
                          className="bg-transparent text-right text-[12px] font-medium text-text outline-none"
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
                      NOTE FIRST. It is the one line that applies to the whole
                      crew ("meet at 6:45", "taking the trailer"), so it reads
                      before the names rather than after nine rows of them.
                    */}
                    <div className="flex items-center gap-2 border-b border-border px-3.5 py-2.5 text-muted">
                      <IconClipboard size={14} />
                      <input
                        value={boat.note}
                        onChange={(e) => setNote(boat.id, e.target.value)}
                        aria-label="Note"
                        placeholder="Note — anything else the crew needs…"
                        className="flex-1 bg-transparent text-[12px] text-text outline-none placeholder:italic placeholder:text-text-3"
                      />
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
                      <div className="relative rounded-[2.5rem_2.5rem_0.75rem_0.75rem] border border-border bg-gradient-to-b from-background to-surface-2 px-3.5 pb-7 pt-7">
                        <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Bow ▲
                        </div>
                        {/* The number comes from the seat's POSITION, not from
                            what an older saved lineup happens to have stored in
                            `label` — so a lineup built before the numbering
                            changed still reads 1…8 today. */}
                        <div className="flex flex-col gap-1.5">
                          {boat.seats.map((s, i) =>
                            renderSeat(
                              { boatId: boat.id, kind: "seat", idx: i },
                              seatLabel(i),
                              s.athleteId,
                            ),
                          )}
                        </div>
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Stroke ▼
                        </div>
                      </div>
                      {boat.hasCox && (
                        <div className="mt-2">
                          {renderSeat({ boatId: boat.id, kind: "cox" }, COX_TAG, boat.coxId, true)}
                        </div>
                      )}
                    </div>

                    {/* BOAT — which shell this crew takes out. Named here and
                        echoed read-only in the card header above, so a boat is
                        still identifiable while scrolling past its crew. */}
                    <div className="flex items-center gap-2 border-t border-border px-3.5 py-2.5 text-muted">
                      <IconPencil size={13} />
                      <input
                        value={boat.name}
                        onChange={(e) => setName(boat.id, e.target.value)}
                        aria-label="Boat name"
                        placeholder="Boat — which shell…"
                        className="flex-1 bg-transparent text-[12px] font-semibold text-text outline-none placeholder:font-normal placeholder:italic placeholder:text-text-3"
                      />
                    </div>

                    {/*
                      OARS — which set this crew takes off the rack. Its own
                      line rather than a phrase buried in the note, because it
                      is the second thing a crew needs after their seat, and
                      because the athletes' Home shows it back to them.

                      Free text for now: the sets are named on the boathouse
                      rack and the owner is fetching those names. When they
                      land they become a data list and this becomes a picker —
                      no new component, the same field.
                    */}
                    <div className="flex items-center gap-2 border-t border-border px-3.5 py-2.5 text-muted">
                      <IconAnchor size={14} />
                      <input
                        value={boat.oars ?? ""}
                        onChange={(e) => setOars(boat.id, e.target.value)}
                        aria-label="Oars"
                        placeholder="Oars — which set to take…"
                        className="flex-1 bg-transparent text-[12px] text-text outline-none placeholder:italic placeholder:text-text-3"
                      />
                    </div>

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
                THE ONLY THREE BUTTONS. All, Port, Starboard — and anyone who
                rows BOTH appears under every one of them, because they can
                genuinely take either seat and hiding them from a filter would
                cost the coach an option. Coxswains have no side, so they show
                under All.

                The pool used to be split by erg-training column (Group B, OYO,
                Rx…). Gone on the owner's call: those groups are not true for
                long, and they are not the question being asked while a boat is
                being filled.
              */}
              <div data-tour="coach-lineup-filters" className="mb-2.5 flex gap-1.5">
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
                    {f.key !== "all" && (
                      <span
                        className="h-2.5 w-2.5 rounded-sm border"
                        style={blade(sideMeta[f.key].color, sideMeta[f.key].ink)}
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
                  others: who can't I pick today. Kept out of the side filter
                  on purpose; "who is hurt" is not a stroke-side question.
                */}
                {unavailable.length > 0 && (
                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
                      Unavailable
                      <span className="h-px flex-1 bg-danger-line" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {unavailable.map((a) => (
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

  const pick = (day: PickDay, p: Practice) => {
    const dayKey = sessionKey(day.date, p.period);
    const s = plan?.sessions[dayKey];
    setPractice({
      key: dayKey,
      dayKey,
      context: {
        weekday: day.weekday,
        period: p.period,
        sub: `${day.month.slice(0, 3)} ${day.num}`,
      },
      planContext: s
        ? { title: s.description.trim() || sessionLabel(s), sub: sessionLabel(s), water: isOnWater(s) }
        : null,
    });
  };

  if (!practice) return <DayPicker days={days} onPick={pick} />;

  return (
    <Builder
      key={practice.key}
      dayKey={practice.dayKey}
      context={practice.context}
      planContext={practice.planContext}
      onBack={() => {
        setPractice(null);
        void refreshStatuses();
      }}
    />
  );
}
