"use client";

import { activityLabel, logMuscles, type WorkoutLog } from "@/lib/supabase/workouts";

// Monday-first weekday header, matching the rest of the app.
const WEEK = ["M", "T", "W", "T", "F", "S", "S"];

// Local-time ISO yyyy-mm-dd for a given day in the shown month.
const isoFor = (year: number, month: number, day: number) =>
  `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

// Short, readable label for a muscle group on the tiny calendar tiles.
const SHORT_MUSCLE: Record<string, string> = {
  Chest: "Chest",
  Back: "Back",
  Shoulders: "Delts",
  Biceps: "Bis",
  Triceps: "Tris",
  Legs: "Legs",
  Glutes: "Glute",
  Calves: "Calf",
  Core: "Core",
  Forearms: "Fore",
};
const short = (label: string) => SHORT_MUSCLE[label] ?? label.slice(0, 5);

/*
  Month calendar driven by the user's logged workouts. Each trained day shows the
  BODY PARTS worked that day as small chips (gym/other), or the activity name for
  runs/cardio. Tap a day to open its sessions. Today is outlined; rest days dim.
  All colors are theme tokens (rule 1).
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

  // Per day-of-month: the distinct body parts trained (gym/other), falling back
  // to the distinct activity names (Run / Cardio) when there are no muscles.
  const chipsByDay = new Map<number, string[]>();
  for (let day = 1; day <= daysInMonth; day++) {
    const dayLogs = logs.filter((l) => {
      const d = new Date(`${l.date}T00:00:00`);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
    if (dayLogs.length === 0) continue;
    const muscles: string[] = [];
    for (const l of dayLogs) for (const m of logMuscles(l)) if (!muscles.includes(m)) muscles.push(m);
    if (muscles.length > 0) {
      chipsByDay.set(day, muscles);
    } else {
      // No tagged muscles → show the activity name(s) instead.
      const acts: string[] = [];
      for (const l of dayLogs) {
        const a = activityLabel(l.activity);
        if (!acts.includes(a)) acts.push(a);
      }
      chipsByDay.set(day, acts);
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
          const chips = chipsByDay.get(n);
          const hasSession = !!chips;
          const isToday = n === today;
          const cls = hasSession
            ? "border border-primary/40 bg-primary/15 cursor-pointer"
            : isToday
              ? "border border-primary bg-primary/10 cursor-default"
              : "bg-surface-2 cursor-default";
          const extra = chips ? chips.length - 2 : 0;
          return (
            <button
              key={idx}
              type="button"
              disabled={!hasSession}
              onClick={() => hasSession && onPickDate(isoFor(year, month, n))}
              aria-label={hasSession ? `${chips!.join(", ")} on day ${n}` : `Day ${n}`}
              className={`relative flex aspect-square flex-col items-stretch overflow-hidden rounded-md p-1 ${cls} ${
                isToday ? "ring-1 ring-primary" : ""
              }`}
            >
              <span
                className={`text-left text-[10px] font-medium leading-none ${
                  hasSession || isToday ? "text-text" : "text-muted"
                }`}
              >
                {n}
              </span>
              {chips && (
                <span className="mt-auto flex flex-col gap-0.5">
                  {chips.slice(0, 2).map((c) => (
                    <span
                      key={c}
                      className="truncate rounded bg-primary/15 px-1 text-left text-[7px] font-medium leading-[1.4] text-primary"
                    >
                      {short(c)}
                    </span>
                  ))}
                  {extra > 0 && (
                    <span className="px-1 text-left text-[7px] font-medium leading-[1.3] text-muted">
                      +{extra}
                    </span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-2.5 flex items-center gap-3 text-[9px] text-muted">
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-sm border border-primary/40 bg-primary/15" />
          Trained
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
