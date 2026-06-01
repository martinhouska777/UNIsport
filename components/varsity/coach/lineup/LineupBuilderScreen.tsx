"use client";

/*
  Coach LINEUP BUILDER (mobile-adapted from the desktop/phone mockup).
  Two views held in local state:
    • "days"    — pick a practice (a day's AM or PM) to build.
    • "builder" — fill boats for that practice from the athlete pool, then publish.
  Filling seats by typing/drag + the autocomplete come in the later interactive
  pass; this slice shows a worked-up boat, the pool, and the add-boat sheet so the
  layout and flow can be reviewed. All colors are theme tokens; rowing-side colors
  are content colors from lib/varsity/coachLineup.ts (rule-1 exception).
*/
import { useState } from "react";
import {
  practiceDays,
  practiceStatusMeta,
  sessionContext,
  initialBoats,
  pool,
  poolCount,
  sideMeta,
  boatTypes,
  boatShape,
  type PracticeDay,
  type Practice,
  type Boat,
  type Seat,
  type PoolAthlete,
  type BoatType,
} from "@/lib/varsity/coachLineup";
import {
  IconArrowLeft,
  IconChevronRight,
  IconClock,
  IconPlus,
  IconX,
  IconEye,
  IconSend,
  IconClipboard,
  IconPencil,
  IconDots,
  IconCalendar,
} from "@/components/icons";

/* ─────────────────────────  shared bits  ───────────────────────── */
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

function SideTag({ side }: { side: keyof typeof sideMeta }) {
  const m = sideMeta[side];
  return (
    <span
      className="rounded px-1.5 py-px text-[9px] font-bold tracking-[0.05em]"
      style={{ background: `${m.color}22`, color: m.color }}
    >
      {side}
    </span>
  );
}

function Avatar({
  initials,
  side,
  className = "",
}: {
  initials: string;
  side?: keyof typeof sideMeta;
  className?: string;
}) {
  const color = side ? sideMeta[side].color : undefined;
  return (
    <span
      className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${className}`}
      style={
        color
          ? { background: `${color}1f`, borderColor: `${color}66`, color }
          : undefined
      }
    >
      {initials}
    </span>
  );
}

/* ─────────────────────────  view 1: day picker  ───────────────────────── */
function PracticeButton({
  practice,
  onPick,
}: {
  practice: Practice;
  onPick: () => void;
}) {
  const s = practiceStatusMeta[practice.status];
  return (
    <button
      type="button"
      onClick={onPick}
      className="flex flex-1 flex-col items-center gap-1.5 border-r border-border py-3 last:border-r-0 active:bg-surface-2"
    >
      <span className="text-[11px] font-semibold tracking-[0.08em] text-text">
        {practice.period}
      </span>
      <span className="flex items-center gap-1.5 text-[10px] text-muted">
        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    </button>
  );
}

function DayCard({
  day,
  onPick,
}: {
  day: PracticeDay;
  onPick: (day: PracticeDay, p: Practice) => void;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border bg-surface ${
        day.today ? "border-primary/40 bg-gradient-to-br from-primary/10 to-surface" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between px-3.5 py-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold leading-none text-text">{day.num}</span>
          <div>
            <div className="text-[13px] font-semibold leading-none text-text">{day.weekday}</div>
            <div className="mt-1 text-[10px] text-muted">{day.month}</div>
          </div>
        </div>
        {day.today ? (
          <span className="rounded-md bg-primary px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-primary-contrast">
            Today
          </span>
        ) : (
          day.note && <span className="text-[11px] text-muted">{day.note}</span>
        )}
      </div>
      <div className="flex border-t border-border">
        <PracticeButton practice={day.am} onPick={() => onPick(day, day.am)} />
        <PracticeButton practice={day.pm} onPick={() => onPick(day, day.pm)} />
      </div>
    </div>
  );
}

function DayPicker({ onPick }: { onPick: (day: PracticeDay, p: Practice) => void }) {
  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
      <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
        Lineup
      </div>
      <h1 className="mt-0.5 text-2xl font-semibold text-text">Create Lineup</h1>
      <p className="mt-1 text-[12px] text-muted">Pick a practice to build.</p>

      <div className="mt-5">
        <SectionLabel>Next 3 days</SectionLabel>
        <div className="flex flex-col gap-2.5">
          {practiceDays.map((d) => (
            <DayCard key={d.id} day={d} onPick={onPick} />
          ))}
        </div>
      </div>

      <div className="mt-5">
        <SectionLabel>Later</SectionLabel>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-3.5 text-left"
        >
          <span className="text-muted">
            <IconCalendar size={18} />
          </span>
          <span className="flex-1 text-[13px] text-muted">Pick a different day from calendar</span>
          <span className="text-muted">
            <IconChevronRight size={14} />
          </span>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  view 2: builder  ───────────────────────── */
function SeatRow({ seat }: { seat: Seat }) {
  if (!seat.athlete) {
    return (
      <div className="flex items-center gap-2">
        <span className="w-5 flex-shrink-0 text-center text-[10px] font-bold text-muted">
          {seat.label}
        </span>
        <div className="flex min-h-[42px] flex-1 items-center gap-2 rounded-lg border border-dashed border-border px-2.5 text-muted">
          <IconPlus size={13} />
          <span className="text-[12px] italic">Type or drag a name…</span>
        </div>
      </div>
    );
  }
  const a = seat.athlete;
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 flex-shrink-0 text-center text-[10px] font-bold text-muted">
        {seat.label}
      </span>
      <div className="flex min-h-[42px] flex-1 items-center gap-2 rounded-lg border border-primary/35 bg-primary/10 px-2.5 py-1.5">
        <Avatar initials={a.initials} side={a.side} />
        <span className="flex-1 text-[13px] font-semibold text-text">{a.name}</span>
        <SideTag side={a.side} />
        <span className="text-muted">
          <IconX size={14} />
        </span>
      </div>
    </div>
  );
}

function BoatCard({ boat }: { boat: Boat }) {
  const filled = boat.seats.filter((s) => s.athlete).length;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {/* header */}
      <div className="flex items-center justify-between border-b border-border px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span className="rounded-md border border-primary/35 bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-primary">
            {boat.badge}
          </span>
          <span className="text-[14px] font-semibold text-text">{boat.name}</span>
          <span className="text-muted">
            <IconPencil size={12} />
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-muted">
          <span className="flex items-center gap-1 text-[12px]">
            <IconClock size={13} />
            <span className="font-medium text-text">{boat.dock}</span>
          </span>
          <IconDots size={16} />
        </div>
      </div>

      {/* hull */}
      <div className="px-3 py-4">
        <div className="relative rounded-[2.5rem_2.5rem_0.75rem_0.75rem] border border-border bg-gradient-to-b from-surface-2 to-background px-3.5 pb-7 pt-7">
          <div className="absolute left-1/2 top-2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
            ▲ Bow
          </div>
          <div className="flex flex-col gap-1.5">
            {boat.seats.map((s) => (
              <SeatRow key={s.label} seat={s} />
            ))}
          </div>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.1em] text-muted">
            Stroke ▼
          </div>
        </div>

        {/* cox */}
        {boat.cox && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.06] px-2.5 py-2">
            <span className="w-5 flex-shrink-0 text-center text-[9px] font-bold text-accent">
              COX
            </span>
            <Avatar
              initials={boat.cox.initials}
              className="border-accent/50 bg-accent/15 text-accent"
            />
            <span className="flex-1 text-[13px] font-semibold text-text">{boat.cox.name}</span>
            <span className="text-muted">
              <IconX size={14} />
            </span>
          </div>
        )}
      </div>

      {/* focus note */}
      <div className="flex items-center gap-2 border-t border-border px-3.5 py-2.5 text-muted">
        <IconClipboard size={14} />
        <span className="flex-1 text-[12px]">
          {boat.note ?? <span className="italic text-muted/70">Focus note for this boat…</span>}
        </span>
      </div>

      <div className="border-t border-border px-3.5 py-1.5 text-right text-[10px] text-muted">
        {filled} / {boat.seats.length} filled
      </div>
    </div>
  );
}

function PoolChip({ a }: { a: PoolAthlete }) {
  if (a.out) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-danger/25 bg-danger/[0.08] px-2 py-1.5 opacity-50">
        <Avatar
          initials={a.initials}
          className="border-danger/30 bg-danger/15 text-danger"
        />
        <span className="text-[12px] font-semibold text-muted">{a.name}</span>
        <span className="rounded bg-danger/20 px-1.5 py-px text-[9px] font-bold tracking-[0.05em] text-danger">
          {a.out}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1.5 active:border-primary/40 active:bg-primary/10">
      <Avatar initials={a.initials} side={a.side} />
      <span className="text-[12px] font-semibold text-text">{a.name}</span>
      <SideTag side={a.side} />
    </div>
  );
}

function Builder({
  context,
  boats,
  onBack,
  onAddBoat,
}: {
  context: { weekday: string; period: string; sub: string };
  boats: Boat[];
  onBack: () => void;
  onAddBoat: () => void;
}) {
  return (
    <div className="relative flex h-full flex-col">
      <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto px-4 pb-28 pt-4">
        {/* header */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-[13px] text-muted"
        >
          <IconArrowLeft size={16} /> Days
        </button>
        <h1 className="mt-1 text-2xl font-semibold text-text">
          {context.weekday} {context.period}
        </h1>
        <div className="mt-0.5 text-[11px] text-muted">{context.sub}</div>

        {/* prescribed session */}
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-3">
          <span className="h-2.5 w-2.5 flex-shrink-0 rounded-full bg-danger" />
          <div className="flex-1">
            <div className="text-[13px] font-semibold text-text">{sessionContext.title}</div>
            <div className="mt-0.5 text-[11px] text-muted">{sessionContext.sub}</div>
          </div>
          <span className="text-muted">
            <IconChevronRight size={14} />
          </span>
        </div>

        {/* boats */}
        <div className="mt-4 flex flex-col gap-3">
          {boats.map((b) => (
            <BoatCard key={b.id} boat={b} />
          ))}
        </div>

        <button
          type="button"
          onClick={onAddBoat}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface py-3.5 text-[13px] font-medium text-muted active:border-primary/40 active:text-primary"
        >
          <IconPlus size={16} /> Add Another Boat
        </button>

        {/* pool */}
        <div className="mt-6">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
              Athlete Pool
            </span>
            <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
              {poolCount.available} available · {poolCount.out} out
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {pool.map((g) => (
              <div key={g.label}>
                <div
                  className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                    g.danger ? "text-danger" : "text-muted"
                  }`}
                >
                  {g.label}
                  <span className="h-px flex-1 bg-border" />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.athletes.map((a) => (
                    <PoolChip key={a.initials} a={a} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* publish bar */}
      <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-background via-background to-transparent px-4 pb-6 pt-6">
        <div className="mx-auto flex max-w-screen-sm gap-2.5">
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-2xl border border-border bg-surface px-4 py-3.5 text-[13px] font-medium text-muted"
          >
            <IconEye size={15} /> Preview
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast"
          >
            <IconSend size={16} /> Publish Lineup
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────  add-boat sheet  ───────────────────────── */
function AddBoatSheet({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (type: BoatType) => void;
}) {
  const [type, setType] = useState<BoatType>("8+");
  return (
    <div
      className="absolute inset-0 z-50 flex items-end bg-black/60"
      onClick={onClose}
    >
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
              onClick={() => setType(b.type)}
              className={`flex flex-col items-center gap-1 rounded-2xl border px-3 py-3.5 ${
                type === b.type
                  ? "border-primary bg-primary/10"
                  : "border-border bg-surface"
              }`}
            >
              <span className="text-xl font-semibold text-text">{b.symbol}</span>
              <span className="text-[12px] font-semibold text-text">{b.name}</span>
              <span className="text-[10px] text-muted">{b.desc}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onAdd(type)}
          className="mt-4 w-full rounded-2xl bg-primary py-3.5 text-[14px] font-semibold text-primary-contrast"
        >
          Add {type} to practice
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
export default function LineupBuilderScreen() {
  const [view, setView] = useState<"days" | "builder">("days");
  const [context, setContext] = useState({ weekday: "Thursday", period: "AM", sub: "Jan 9 · 7:00am dock" });
  const [boats, setBoats] = useState<Boat[]>(initialBoats);
  const [sheetOpen, setSheetOpen] = useState(false);

  const pickPractice = (day: PracticeDay, p: Practice) => {
    setContext({
      weekday: day.weekday,
      period: p.period,
      sub: `${day.month.slice(0, 3)} ${day.num} · 7:00am dock`,
    });
    setBoats(day.id === "thu-9" && p.period === "AM" ? initialBoats : []);
    setView("builder");
  };

  const addBoat = (type: BoatType) => {
    const shape = boatShape[type];
    const seats: Seat[] = Array.from({ length: shape.rowers }, (_, i) => ({
      label: i === shape.rowers - 1 ? "S" : String(i + 1),
    }));
    setBoats((bs) => [
      ...bs,
      { id: `boat-${bs.length + 1}-${Date.now()}`, badge: type, name: `New ${type}`, dock: "7:00am", seats },
    ]);
    setSheetOpen(false);
  };

  if (view === "days") return <DayPicker onPick={pickPractice} />;

  return (
    <>
      <Builder
        context={context}
        boats={boats}
        onBack={() => setView("days")}
        onAddBoat={() => setSheetOpen(true)}
      />
      {sheetOpen && <AddBoatSheet onClose={() => setSheetOpen(false)} onAdd={addBoat} />}
    </>
  );
}
