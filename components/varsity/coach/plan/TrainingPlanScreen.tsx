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
  type PlanDay,
  type Slot,
} from "@/lib/varsity/coachPlan";
import { IconSend, IconInfo, IconPlus } from "@/components/icons";

function SlotRow({ label, slot }: { label: string; slot: Slot }) {
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
    <div
      className="rounded-lg border border-border bg-surface-2 py-2 pl-2.5 pr-2.5"
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
      {(slot.time || slot.loc) && (
        <div className="mt-0.5 text-[9px] text-muted">
          {[slot.time, slot.loc].filter(Boolean).join(" · ")}
        </div>
      )}
    </div>
  );
}

function DayCard({ day }: { day: PlanDay }) {
  return (
    <div className={`overflow-hidden rounded-xl border bg-surface ${day.today ? "border-primary/50" : "border-border"}`}>
      <div className={`flex items-center justify-between px-3 py-2 ${day.today ? "bg-primary/15" : "bg-surface-2"}`}>
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">{day.name}</span>
        <span className={`text-sm font-semibold ${day.today ? "text-primary" : "text-text"}`}>{day.num}</span>
      </div>
      <div className="flex flex-col gap-1.5 p-2">
        <SlotRow label="AM" slot={day.am} />
        <SlotRow label="PM" slot={day.pm} />
      </div>
    </div>
  );
}

export default function TrainingPlanScreen() {
  const [weekIdx, setWeekIdx] = useState(1); // Week 2 (0-based 1) has content
  const week = weeks[weekIdx];

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
          <DayCard key={d.name} day={d} />
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
    </div>
  );
}
