"use client";

/*
  TWO DATES — the window the coach wants, when none of the built-in ones is it
  ("how did the two weeks before the race go"). The phone's own date picker on
  each field, 16px so nothing zooms. The team statistics' own sheet, shared
  with the coach's rankings (owner, 2026-09-27: "1. a month 2. semester 3.
  pick dates").
*/
import { useState } from "react";
import Sheet from "@/components/varsity/Sheet";

export type Dates = { start: string; end: string };

export default function DatesSheet({
  start,
  end,
  today,
  onApply,
  onClose,
}: {
  start: string;
  end: string;
  today: string;
  onApply: (d: Dates) => void;
  onClose: () => void;
}) {
  const [a, setA] = useState(start);
  const [b, setB] = useState(end);
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(a) && /^\d{4}-\d{2}-\d{2}$/.test(b);
  const field =
    "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-text outline-none focus:border-primary-line";
  return (
    <Sheet title="Choose dates" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">From</span>
          <input type="date" value={a} max={today} onChange={(e) => setA(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted">To</span>
          <input type="date" value={b} max={today} onChange={(e) => setB(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>
      {/* No "day by day / week by week" note (owner, 2026-09-22): the columns
          on the graph say which one it is, and the dates are the answer. */}
      <button
        type="button"
        disabled={!ok}
        onClick={() => onApply(a <= b ? { start: a, end: b } : { start: b, end: a })}
        className="tap44 mt-4 w-full rounded-full bg-primary px-5 py-2.5 text-[13px] font-semibold text-primary-contrast disabled:opacity-50"
      >
        Show these dates
      </button>
    </Sheet>
  );
}
