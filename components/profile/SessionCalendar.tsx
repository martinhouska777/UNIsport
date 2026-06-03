"use client";

import type { WorkoutLog } from "@/lib/supabase/workouts";

// Monday-first weekday header, matching the rest of the app.
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

// Local-time ISO yyyy-mm-dd for a given day in the shown month.
const isoFor = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/*
  Month calendar driven by the user's logged workouts. A day with one or more
  logged sessions is filled crimson and tappable (opens that day's sessions);
  today is outlined; everything else is dim.
*/
export default function SessionCalendar({
  logs,
  onPickDate,
}: {
  logs: WorkoutLog[];
  onPickDate: (dateIso: string) => void;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const lead = (firstDow + 6) % 7; // shift so Monday is the first column

  // Count of logged sessions per day-of-month + the first photo found that day
  // (only days in the shown month). The photo turns a day into a "memory" tile.
  const countByDay = new Map<number, number>();
  const photoByDay = new Map<number, string>();
  for (const l of logs) {
    const d = new Date(`${l.date}T00:00:00`);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      countByDay.set(day, (countByDay.get(day) ?? 0) + 1);
      if (l.photos.length > 0 && !photoByDay.has(day)) photoByDay.set(day, l.photos[0]);
    }
  }

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
          const count = countByDay.get(n) ?? 0;
          const hasSession = count > 0;
          const photo = photoByDay.get(n);
          const isToday = n === today;
          const cls = photo
            ? "cursor-pointer text-text"
            : hasSession
              ? "bg-primary text-primary-contrast cursor-pointer"
              : isToday
                ? "border border-primary bg-primary/15 text-text cursor-default"
                : "bg-surface-2 text-muted cursor-default";
          const ring = isToday && (hasSession || photo)
            ? photo
              ? "ring-1 ring-primary"
              : "ring-1 ring-primary-contrast"
            : "";
          return (
            <button
              key={idx}
              type="button"
              disabled={!hasSession}
              onClick={() => hasSession && onPickDate(isoFor(year, month, n))}
              aria-label={hasSession ? `${count} session${count > 1 ? "s" : ""} on day ${n}` : `Day ${n}`}
              className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-md text-[11px] ${cls} ${ring}`}
            >
              {photo && (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="absolute inset-0 bg-gradient-to-t from-background/85 via-background/10 to-transparent" />
                </>
              )}
              <span className={photo ? "absolute bottom-0.5 left-1 font-semibold" : ""}>{n}</span>
              {count > 1 && (
                <span
                  className={`absolute bottom-0.5 right-0.5 text-[7px] font-semibold leading-none ${
                    photo ? "text-text" : "text-primary-contrast/90"
                  }`}
                >
                  {count}
                </span>
              )}
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
