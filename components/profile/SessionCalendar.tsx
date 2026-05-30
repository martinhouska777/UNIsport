"use client";

import type { Session } from "@/lib/currentUser";

// Monday-first weekday header, matching the rest of the app.
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

/*
  Month calendar driven entirely by the sessions data. A day with a session is
  filled crimson and tappable; today is outlined; everything else is dim.
*/
export default function SessionCalendar({
  sessions,
  onPick,
}: {
  sessions: Session[];
  onPick: (s: Session) => void;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const lead = (firstDow + 6) % 7; // shift so Monday is the first column
  const byDay = new Map(sessions.map((s) => [s.day, s] as const));
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
          Session calendar
        </div>
        <div className="text-[11px] text-muted">{monthLabel}</div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEK.map((d, i) => (
          <div key={i} className="text-center text-[9px] text-muted">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((n, idx) => {
          if (n === null) return <div key={idx} />;
          const s = byDay.get(n);
          const isToday = n === today;
          const cls = s
            ? "bg-primary text-primary-contrast cursor-pointer"
            : isToday
              ? "border border-primary bg-primary/15 text-text cursor-default"
              : "bg-surface-2 text-muted cursor-default";
          return (
            <button
              key={idx}
              type="button"
              disabled={!s}
              onClick={() => s && onPick(s)}
              aria-label={s ? `${s.activity} on day ${n}` : `Day ${n}`}
              className={`flex aspect-square items-center justify-center rounded-md text-[11px] ${cls} ${
                s && isToday ? "ring-1 ring-primary-contrast" : ""
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex items-center gap-3 text-[9px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
          Session
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm bg-surface-2" />
          Rest
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-primary" />
          Today
        </span>
      </div>
    </div>
  );
}
