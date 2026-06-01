"use client";

/*
  Coach TRAINING PLAN builder (mobile-adapted from the desktop console).
  Shows a block (Spring 2026) with a draft banner and a week switcher; the
  selected week lists its 7 days, each with AM/PM session slots colored by
  workout type. Tapping a slot is where the editor opens — wired up in the
  later interactive pass. Week switching is view-only state.
*/
import { useState } from "react";
import {
  weeks,
  planBlock,
  workoutMeta,
  workoutLegend,
  venueMeta,
  defaultVenue,
  type PlanDay,
  type Slot,
  type Venue,
} from "@/lib/varsity/coachPlan";
import { IconSend, IconInfo, IconPlus, IconAnchor, IconBarbell } from "@/components/icons";

// A session's id within the plan (week + day + AM/PM) — used to key venue edits.
type SlotId = { week: number; day: string; period: "AM" | "PM"; label: string };

function VenueTag({ venue }: { venue: Venue }) {
  return (
    <span
      className={`flex items-center gap-1 rounded px-1.5 py-px text-[8px] font-semibold tracking-[0.04em] ${
        venue === "water" ? "text-accent" : "text-muted"
      }`}
    >
      {venue === "water" ? <IconAnchor size={9} /> : <IconBarbell size={9} />}
      {venueMeta[venue].short}
    </span>
  );
}

function SlotRow({
  label,
  slot,
  venue,
  onEdit,
}: {
  label: string;
  slot: Slot;
  venue: Venue | null;
  onEdit: () => void;
}) {
  if (!slot) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-2 text-muted">
        <span className="text-[8px] font-bold tracking-[0.12em]">{label}</span>
        <span className="flex items-center gap-1 text-[11px] italic">
          <IconPlus size={12} /> add
        </span>
      </div>
    );
  }
  const meta = workoutMeta[slot.type];
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-2.5 pr-2.5 text-left"
      style={{ borderLeft: `3px solid ${meta.color}` }}
    >
      <div className="mb-0.5 flex items-center justify-between">
        <span className="text-[8px] font-bold tracking-[0.12em] text-muted">{label}</span>
        <span
          className="rounded px-1.5 py-px text-[8px] font-bold tracking-[0.05em] text-background"
          style={{ background: meta.color }}
        >
          {meta.short}
        </span>
      </div>
      <div className="text-[11px] font-medium leading-snug text-text">
        {slot.desc ?? meta.name}
      </div>
      <div className="mt-0.5 flex items-center justify-between">
        {(slot.time || slot.loc) && (
          <span className="text-[9px] text-muted">
            {[slot.time, slot.loc].filter(Boolean).join(" · ")}
          </span>
        )}
        {venue && <VenueTag venue={venue} />}
      </div>
    </button>
  );
}

function DayCard({
  day,
  week,
  venueOf,
  onEdit,
}: {
  day: PlanDay;
  week: number;
  venueOf: (id: SlotId, slot: Slot) => Venue | null;
  onEdit: (id: SlotId, slot: Slot) => void;
}) {
  const slots: { period: "AM" | "PM"; slot: Slot }[] = [
    { period: "AM", slot: day.am },
    { period: "PM", slot: day.pm },
  ];
  return (
    <div className={`overflow-hidden rounded-xl border bg-surface ${day.today ? "border-primary/50" : "border-border"}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${day.today ? "bg-primary/15" : "bg-surface-2"}`}>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{day.name}</span>
        <span className={`text-sm font-semibold ${day.today ? "text-primary" : "text-text"}`}>{day.num}</span>
      </div>
      <div className="flex flex-col gap-1.5 p-2">
        {slots.map(({ period, slot }) => {
          const id: SlotId = { week, day: day.name, period, label: period };
          return (
            <SlotRow
              key={period}
              label={period}
              slot={slot}
              venue={venueOf(id, slot)}
              onEdit={() => onEdit(id, slot)}
            />
          );
        })}
      </div>
    </div>
  );
}

const slotKey = (id: SlotId) => `${id.week}-${id.day}-${id.period}`;

export default function TrainingPlanScreen() {
  const [weekIdx, setWeekIdx] = useState(1); // Week 2 (0-based 1) has content
  const week = weeks[weekIdx];

  // Per-session venue overrides (the coach's On-water/On-land choice). Falls
  // back to the smart default. Local state until the plan is wired to the DB.
  const [venues, setVenues] = useState<Record<string, Venue>>({});
  const [editing, setEditing] = useState<{ id: SlotId; slot: Slot; venue: Venue } | null>(null);

  const venueOf = (id: SlotId, slot: Slot): Venue | null =>
    venues[slotKey(id)] ?? defaultVenue(slot);

  const openEditor = (id: SlotId, slot: Slot) => {
    const v = venueOf(id, slot);
    if (!v) return; // rest/off has no venue to set
    setEditing({ id, slot, venue: v });
  };

  const setVenue = (v: Venue) => {
    if (!editing) return;
    setVenues((prev) => ({ ...prev, [slotKey(editing.id)]: v }));
    setEditing(null);
  };

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-8 pt-4">
      {/* Block header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-accent">
            Training Plan
          </div>
          <h1 className="mt-0.5 text-2xl font-semibold text-text">{planBlock.name}</h1>
          <div className="mt-1 text-[11px] text-muted">
            {planBlock.range} · {planBlock.meta}
          </div>
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[11px] font-semibold text-primary-contrast"
        >
          <IconSend size={13} />
          Publish
        </button>
      </div>

      {/* Draft banner */}
      <div className="mt-3 flex items-start gap-2 rounded-xl border border-primary/35 bg-primary/10 px-3 py-2.5">
        <span className="mt-px text-primary">
          <IconInfo size={15} />
        </span>
        <div className="text-[11px] leading-relaxed text-text/80">
          <strong className="font-semibold text-text">Draft.</strong> Athletes can&apos;t see
          sessions until you publish — and they only ever see the current week plus what&apos;s
          ahead.
        </div>
      </div>

      {/* Week switcher */}
      <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {weeks.map((w, i) => (
          <button
            key={w.index}
            type="button"
            onClick={() => setWeekIdx(i)}
            className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-medium ${
              i === weekIdx
                ? "border-primary bg-primary text-primary-contrast"
                : "border-border bg-surface text-muted"
            }`}
          >
            Week {w.index}
          </button>
        ))}
      </div>

      {/* Selected week header + type chips */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          Week {week.index} · {week.range}
        </span>
        <div className="flex flex-wrap gap-1">
          {week.chips.map((c) => (
            <span
              key={c.type}
              className="rounded px-1.5 py-px text-[9px] font-semibold"
              style={{ background: `${workoutMeta[c.type].color}22`, color: workoutMeta[c.type].color }}
            >
              {c.count}× {workoutMeta[c.type].name}
            </span>
          ))}
        </div>
      </div>

      {/* Days */}
      <div className="mt-3 flex flex-col gap-2">
        {week.days.map((d) => (
          <DayCard key={d.name} day={d} week={week.index} venueOf={venueOf} onEdit={openEditor} />
        ))}
      </div>

      {/* Legend */}
      <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1.5 rounded-xl border border-border bg-surface px-3.5 py-3">
        {workoutLegend.map((t) => (
          <div key={t} className="flex items-center gap-1.5 text-[10px] text-muted">
            <span className="h-2.5 w-2.5 rounded" style={{ background: workoutMeta[t].color }} />
            {workoutMeta[t].name}
          </div>
        ))}
      </div>

      {/* Venue editor — the On-water / On-land button for a session */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setEditing(null)}>
          <div
            className="w-full max-w-screen-sm rounded-t-3xl border-t border-border bg-background px-5 pb-8 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
            <h2 className="text-lg font-semibold text-text">Where is this session?</h2>
            <p className="mb-1 text-[12px] text-muted">
              {editing.slot?.desc ?? workoutMeta[editing.slot!.type].name}
            </p>
            <p className="mb-4 text-[11px] text-muted">
              On-water sessions get a boat lineup; land sessions (erg, weights) don&apos;t.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {(["water", "land"] as Venue[]).map((v) => {
                const active = editing.venue === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setVenue(v)}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border px-3 py-4 ${
                      active ? "border-primary bg-primary/10" : "border-border bg-surface"
                    }`}
                  >
                    <span className={active ? "text-primary" : "text-muted"}>
                      {v === "water" ? <IconAnchor size={22} /> : <IconBarbell size={22} />}
                    </span>
                    <span className="text-[13px] font-semibold text-text">{venueMeta[v].label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
