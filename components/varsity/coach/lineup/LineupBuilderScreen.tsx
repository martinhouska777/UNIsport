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
  rosterGroups,
  sideMeta,
  COX_COLOR,
  COX_INK,
  seatSide,
  fitsSeat,
  sideDemand,
  outMeta,
  boatTypes,
  makeSeats,
  type Practice,
  type PracticeStatus,
  type Boat,
  type Athlete,
  type BoatType,
} from "@/lib/varsity/coachLineup";
import { categoryMeta, isOnWater, sessionKey, sessionLabel } from "@/lib/varsity/coachPlan";
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

// Tag shown for an athlete in the pool / a seat: their side, or "COX".
function AthleteTag({ a }: { a: Athlete }) {
  if (a.cox) {
    return (
      <span
        className="rounded border px-1.5 py-px text-[10px] font-bold tracking-[0.05em]"
        style={blade(COX_COLOR, COX_INK)}
      >
        COX
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

  The category dot is a CONTENT colour out of categoryMeta (rule-1 exception),
  applied inline, exactly as the plan builder paints it.
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
            className={`flex max-w-full items-center gap-1.5 text-[11px] font-medium ${
              water ? "text-text" : "text-muted"
            }`}
          >
            <span
              className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
              style={{ background: plan.color, opacity: water ? 1 : 0.5 }}
            />
            <span className="truncate">{plan.label}</span>
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

function PracticeButton({
  practice,
  onPick,
}: {
  practice: Practice & { plan: PlanCell };
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5 border-r border-border px-2.5 py-3 last:border-r-0 active:bg-surface-2"
    >
      <PracticeBody practice={practice} />
    </button>
  );
}

function DayCard({ day, onPick }: { day: PickDay; onPick: (day: PickDay, p: Practice) => void }) {
  return (
    <div
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
        <PracticeButton practice={day.am} onPick={() => onPick(day, day.am)} />
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
        <div className="flex flex-col gap-2.5">
          {days.map((d) => (
            <DayCard key={d.id} day={d} onPick={onPick} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  view 2: builder (interactive)  ───────────────────────── */
function Seat({
  label,
  side,
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
  label: string;
  /** Which side this seat rows. Absent on the cox seat, which rows neither. */
  side?: Exclude<Side, "B">;
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
    The seat's own blade, carrying the seat number. A seat rows one side and
    only one — that is how a boat is rigged — so the number is painted in that
    side's colour rather than described in words. Reading down the hull you see
    red, white, red, white: four of each, which is the point.
  */
  const seatPaint = cox ? blade(COX_COLOR, COX_INK) : side ? blade(sideMeta[side].color, sideMeta[side].ink) : undefined;

  /*
    Seated on the wrong side. Not prevented — a coach may know something the
    roster doesn't, and being overruled by a form is worse than being warned —
    but it is never silent.
  */
  const wrongSide = !!athlete && !cox && !!side && !fitsSeat(athlete, side);

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
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border text-[11px] font-bold"
        style={seatPaint}
        title={cox ? "Cox" : side ? `${sideMeta[side].label} side` : undefined}
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
                  {!cox && !!side && !fitsSeat(m, side) && (
                    <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-warn">
                      Off side
                    </span>
                  )}
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
              : wrongSide
                ? "border-warn-line bg-warn-tint"
                : cox
                  ? "border-accent-line bg-accent-tint"
                  : "border-primary-line bg-primary-tint"
          }`}
        >
          <Avatar initials={athlete.initials} side={athlete.side} cox={cox} />
          <span className="flex-1 truncate text-[13px] font-semibold text-text">{athlete.name}</span>
          {wrongSide && (
            <span
              className="flex-shrink-0 text-[10px] font-bold uppercase tracking-[0.06em] text-warn"
              title="This seat is rigged the other way. Fine if you meant it — a tandem rig looks exactly like this."
            >
              Off side
            </span>
          )}
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
  const [poolFilter, setPoolFilter] = useState<"all" | "P" | "S">("all");

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
    // A cox seat only offers coxes and a rowing seat never does — that one IS a
    // hard rule, because a cox does not row.
    //
    // The SIDE is not. Seats are rigged alternately by default, but a coach may
    // rig tandem (port, port, starboard, starboard) or seat someone off side on
    // purpose, so every available rower is offered. The ones who fit the seat's
    // rigged side are listed FIRST, and the rest are marked "off side" here and
    // in the seat once they are in it. A notice, never a lock (the owner's rule).
    const wantCox = typing?.kind === "cox";
    let list = available.filter((a) => !!a.cox === wantCox);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) => a.name.toLowerCase().includes(q) || a.initials.toLowerCase().includes(q),
      );
    }
    if (typing?.kind === "seat") {
      const boat = boats.find((b) => b.id === typing.boatId);
      if (boat) {
        const need = seatSide(typing.idx, boat.seats.length);
        list = [...list].sort(
          (a, b) => Number(fitsSeat(b, need)) - Number(fitsSeat(a, need)),
        );
      }
    }
    return list;
  }, [available, query, typing, boats]);

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

  const addBoat = (type: BoatType) => {
    setBoats((bs) => [
      ...bs,
      {
        id: `boat-${Date.now()}`,
        badge: type,
        name: `New ${type}`,
        dock: "7:00am",
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

  const renderSeat = (boat: Boat, slot: Slot, label: string, athleteId: string | null, cox = false) => {
    const key = slotKey(slot);
    // A rowing seat rows one side; the cox seat rows none.
    const side = slot.kind === "seat" ? seatSide(slot.idx, boat.seats.length) : undefined;
    return (
      <Seat
        key={key}
        label={label}
        side={side}
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
                    {/* header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border px-3.5 py-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="flex-shrink-0 rounded-md border border-primary-line bg-primary-tint px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
                          {boat.badge}
                        </span>
                        <input
                          value={boat.name}
                          onChange={(e) => setName(boat.id, e.target.value)}
                          aria-label="Boat name"
                          className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-text outline-none focus:border-b focus:border-primary"
                        />
                        <span className="flex-shrink-0 text-muted">
                          <IconPencil size={12} />
                        </span>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1 text-muted">
                        <IconClock size={13} />
                        <input
                          value={boat.dock}
                          onChange={(e) => setDock(boat.id, e.target.value)}
                          aria-label="Boat time"
                          className="w-16 bg-transparent text-right text-[12px] font-medium text-text outline-none focus:border-b focus:border-primary"
                        />
                      </div>
                    </div>

                    {/* hull — cox + stroke at the top, down to bow at the bottom */}
                    <div className="px-3 py-4">
                      {boat.hasCox && (
                        <div className="mb-2">
                          {renderSeat(boat, { boatId: boat.id, kind: "cox" }, "COX", boat.coxId, true)}
                        </div>
                      )}
                      <div className="relative rounded-[0.75rem_0.75rem_2.5rem_2.5rem] border border-border bg-gradient-to-b from-surface-2 to-background px-3.5 pb-7 pt-7">
                        <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Stroke ▲
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {boat.seats
                            .map((s, i) =>
                              renderSeat(boat, { boatId: boat.id, kind: "seat", idx: i }, s.label, s.athleteId),
                            )
                            .reverse()}
                        </div>
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                          Bow ▼
                        </div>
                      </div>
                    </div>

                    {/* note — usually which oars / which boat to take */}
                    <div className="flex items-center gap-2 border-t border-border px-3.5 py-2.5 text-muted">
                      <IconClipboard size={14} />
                      <input
                        value={boat.note}
                        onChange={(e) => setNote(boat.id, e.target.value)}
                        placeholder="Note — oars, which boat to take…"
                        className="flex-1 bg-transparent text-[12px] text-text outline-none placeholder:italic placeholder:text-text-3"
                      />
                    </div>

                    {/*
                      Footer — filled count, and the side maths. An eight needs
                      four stroke-side and four bow-side; a four needs two of
                      each. Showing "3 / 4" against each blade is the fastest
                      way to see a boat that cannot actually go out.
                    */}
                    <div className="flex items-center justify-between gap-2 border-t border-border px-3.5 py-2 text-[11px] text-muted">
                      <span>
                        {filled} / {boat.seats.length} filled
                      </span>
                      <span className="flex items-center gap-1.5">
                        {(["P", "S"] as const).map((sd) => {
                          const want = sideDemand(boat.seats.length)[sd];
                          const have = boat.seats.filter(
                            (st, i) =>
                              st.athleteId &&
                              seatSide(i, boat.seats.length) === sd &&
                              rosterById[st.athleteId] &&
                              fitsSeat(rosterById[st.athleteId], sd),
                          ).length;
                          return (
                            <span key={sd} className="flex items-center gap-1">
                              <span
                                className="h-2.5 w-2.5 rounded-sm border"
                                style={blade(sideMeta[sd].color, sideMeta[sd].ink)}
                              />
                              <span className={have === want ? "text-text" : undefined}>
                                {have}/{want} {sideMeta[sd].label.toLowerCase()}
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
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3.5 text-[13px] font-medium text-muted active:border-primary-line active:text-primary"
            >
              <IconPlus size={16} /> Add{boats.length ? " Another" : ""} Boat
            </button>

            {/* pool */}
            <div className="mt-6">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Athlete Pool
                </span>
                <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
                  {available.length} available · {unavailable.length} out
                </span>
              </div>

              {/* sort the pool by side */}
              <div className="mb-2.5 flex gap-1.5">
                {(
                  [
                    ["all", "All"],
                    ["P", sideMeta.P.label],
                    ["S", sideMeta.S.label],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setPoolFilter(key)}
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                      poolFilter === key ? "border-primary bg-primary-tint text-text" : "border-border bg-surface text-muted"
                    }`}
                  >
                    {key !== "all" && (
                      <span
                        className="h-2.5 w-2.5 rounded-sm border"
                        style={blade(sideMeta[key].color, sideMeta[key].ink)}
                      />
                    )}
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-3">
                {rosterGroups.map((g) => {
                  const chips = g.ids
                    .map((id) => rosterById[id])
                    // Anyone unavailable is listed once, at the bottom, under
                    // its own heading — not scattered through the groups at
                    // half opacity where a coach has to hunt for them.
                    .filter((a) => !a.out && !seatedIds.has(a.id))
                    // side filter: Stroke shows P (+ both); Bow shows S (+ both); coxes only under All
                    .filter((a) => poolFilter === "all" || (!a.cox && (a.side === poolFilter || a.side === "B")));
                  if (chips.length === 0) return null;
                  return (
                    <div key={g.label}>
                      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                        {g.label}
                        <span className="h-px flex-1 bg-border" />
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {chips.map((a) => (
                          <PoolChip key={a.id} a={a} onDragStart={() => setDropKey(null)} />
                        ))}
                      </div>
                    </div>
                  );
                })}

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
        <div className="mx-auto flex max-w-screen-sm gap-2.5">
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
        color: categoryMeta[sess.category].color,
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
