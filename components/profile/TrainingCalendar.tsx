"use client";

/*
  THE TRAINING CALENDAR on the Profile tab — one block, two zoom levels.

  It opens on THIS WEEK, because a week is a plan; "Month" expands the same
  thing into a wall calendar, because a month is a record. Either way you can
  go back and forward with the arrows or by swiping the grid sideways — the
  same movement the varsity calendar has (components/varsity/calendar), so the
  two sides of the app page through time the same way.

  It draws nothing itself: the parent owns which week/month is showing and
  hands down the logs for that range (see the Profile tab), so the day sheet
  and the calendar can never disagree about what a day was.

  Replaces the old pair of components (a week strip + a separate month grid,
  both hard-wired to today, with a "Show the whole month" link between them).
  All colour is theme tokens (rule 1).
*/
import { useRef } from "react";
import { activityLabel, logMuscles, type WorkoutLog } from "@/lib/supabase/workouts";
import { nextDays } from "@/lib/schedule";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";

export type CalendarMode = "week" | "month";

const WEEK_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoFor = (year: number, month: number, day: number) =>
  `${year}-${pad(month + 1)}-${pad(day)}`;

/** The Monday of the week that contains `d`. */
export function mondayOf(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
}

/** Monday of this week, plus the six days after — used by the log fetch. */
export function thisWeek(today = new Date()) {
  return nextDays(7, mondayOf(today));
}

/**
 * The first and last day the given view shows, as ISO dates. The Profile tab
 * fetches exactly this range, so paging back a month loads that month.
 */
export function calendarRange(anchor: Date, mode: CalendarMode): { from: string; to: string } {
  if (mode === "week") {
    const monday = mondayOf(anchor);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { from: isoOf(monday), to: isoOf(sunday) };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: isoOf(first), to: isoOf(last) };
}

/**
 * The anchor moved one week / one month, in either direction. Paging months
 * keeps the day of the month (clamped to a short month) rather than snapping
 * to the 1st, so the anchor stays a real day — which is what the month grid
 * marks as "the week you're on".
 */
export function shiftAnchor(anchor: Date, mode: CalendarMode, step: number) {
  if (mode === "week") {
    return new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + step * 7);
  }
  const y = anchor.getFullYear();
  const m = anchor.getMonth() + step;
  const lastDay = new Date(y, m + 1, 0).getDate();
  return new Date(y, m, Math.min(anchor.getDate(), lastDay));
}

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
  // Runs and cardio fall through here too, and the slice() fallback below made
  // "Running" read "Runni" on the tile.
  Running: "Run",
  Cardio: "Cardio",
  Session: "Session",
};
/** The tile-sized word for a chip. */
export const shortMuscle = (label: string) => SHORT_MUSCLE[label] ?? label.slice(0, 5);

/*
  What one day's logs say on a tile: the distinct body parts trained
  (gym/other), falling back to the distinct activity names (Run / Cardio) when
  there are no muscles. Empty for a day with nothing logged.
*/
export function dayChips(logs: WorkoutLog[], iso: string): string[] {
  const dayLogs = logs.filter((l) => l.date === iso);
  if (dayLogs.length === 0) return [];
  const muscles: string[] = [];
  for (const l of dayLogs) for (const m of logMuscles(l)) if (!muscles.includes(m)) muscles.push(m);
  if (muscles.length > 0) return muscles;
  const acts: string[] = [];
  for (const l of dayLogs) {
    const a = activityLabel(l.activity);
    if (!acts.includes(a)) acts.push(a);
  }
  return acts;
}

/** The chips on a tile, at most two, plus "+N" for the rest. */
function Chips({ chips }: { chips: string[] }) {
  return (
    <span className="mt-auto flex flex-col gap-0.5">
      {chips.slice(0, 2).map((c) => (
        <span
          key={c}
          className="truncate rounded bg-primary-tint px-[3px] text-left text-[7px] font-medium leading-[1.4] text-primary"
        >
          {shortMuscle(c)}
        </span>
      ))}
      {chips.length > 2 && (
        <span className="px-[3px] text-left text-[7px] font-medium leading-[1.3] text-muted">
          +{chips.length - 2}
        </span>
      )}
    </span>
  );
}

export default function TrainingCalendar({
  logs,
  anchor,
  mode,
  onAnchorChange,
  onModeChange,
  onPickDate,
}: {
  logs: WorkoutLog[];
  /** Any day inside the week / month being shown. */
  anchor: Date;
  mode: CalendarMode;
  onAnchorChange: (next: Date) => void;
  onModeChange: (next: CalendarMode) => void;
  onPickDate: (dateIso: string) => void;
}) {
  const todayIso = isoOf(new Date());

  // Never past the week or month we're in: there is nothing logged in the
  // future, so forward would only ever show empty boxes.
  const atLatest =
    mode === "week"
      ? calendarRange(anchor, "week").to >= calendarRange(new Date(), "week").to
      : calendarRange(anchor, "month").to >= calendarRange(new Date(), "month").to;

  const go = (step: number) => {
    if (step > 0 && atLatest) return;
    onAnchorChange(shiftAnchor(anchor, mode, step));
  };

  // SWIPE — the same gesture as the arrows. Only a decisively horizontal drag
  // counts, so scrolling the page past the grid never changes the week.
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    go(dx > 0 ? -1 : 1);
  };

  const days = nextDays(7, mondayOf(anchor));

  // Month grid: Monday-first, with the blank lead-in cells.
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells: (number | null)[] = [
    ...Array(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  /*
    WHERE THE WEEK IS. Switching to Month is an expansion, not a jump to
    somewhere else: the week you were looking at is marked in the grid so you
    can see it sitting inside the month. That's this row.
  */
  const weekIsos = new Set(days.map((d) => d.iso));
  // The month, chunked into its calendar weeks — the rows the grid draws.
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  const lastRow = rows[rows.length - 1];
  if (lastRow) while (lastRow.length < 7) lastRow.push(null);

  // "8 – 14 Sep" for a week; "September 2026" for a month.
  const label =
    mode === "week"
      ? `${days[0].num} ${days[0].month} – ${days[6].num} ${days[6].month}`
      : new Date(year, month, 1).toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="border-b border-border px-3.5 py-3">
      {/* Header: an arrow at each end, the week or month between them, and the
          zoom under it. Nothing counts your days at you. */}
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          aria-label={mode === "week" ? "Previous week" : "Previous month"}
          onClick={() => go(-1)}
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted"
        >
          <IconArrowLeft size={14} />
        </button>

        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <div className="truncate text-[13px] font-semibold text-text">{label}</div>
          {/* Week / Month — the same block, zoomed. */}
          <div className="flex overflow-hidden rounded-full border border-border">
            {(["week", "month"] as CalendarMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => onModeChange(m)}
                aria-pressed={mode === m}
                className={`px-3 py-0.5 text-[11px] font-medium capitalize ${
                  mode === m ? "bg-primary text-primary-contrast" : "bg-surface-2 text-muted"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          aria-label={mode === "week" ? "Next week" : "Next month"}
          onClick={() => go(1)}
          disabled={atLatest}
          className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
        >
          <IconArrowRight size={14} />
        </button>
      </div>

      {/* The grid. Swiping it left/right is the same as the arrows. */}
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {mode === "week" ? (
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const chips = dayChips(logs, d.iso);
              const has = chips.length > 0;
              const isToday = d.iso === todayIso;
              const past = d.iso < todayIso;
              return (
                <button
                  key={d.iso}
                  type="button"
                  disabled={!has}
                  onClick={() => has && onPickDate(d.iso)}
                  aria-label={has ? `${chips.join(", ")} on ${d.name}` : d.name}
                  className={`flex min-h-[64px] flex-col items-stretch overflow-hidden rounded-md p-1 text-left ${
                    has
                      ? "border border-primary-line bg-primary-tint"
                      : isToday
                        ? "border border-primary bg-surface-2"
                        : "bg-surface-2"
                  } ${isToday ? "ring-1 ring-primary" : ""} disabled:cursor-default`}
                >
                  <span
                    className={`text-[10px] leading-none ${
                      has || isToday ? "text-text" : past ? "text-text-3" : "text-muted"
                    }`}
                  >
                    {d.letter}
                  </span>
                  <span
                    className={`text-[11px] font-medium leading-tight ${
                      has || isToday ? "text-text" : "text-muted"
                    }`}
                  >
                    {d.num}
                  </span>
                  {has && <Chips chips={chips} />}
                </button>
              );
            })}
          </div>
        ) : (
          <>
            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEK_LETTERS.map((d, i) => (
                <div key={i} className="text-center text-[11px] text-muted">
                  {d}
                </div>
              ))}
            </div>
            {/* One block per calendar week, so THE WEEK YOU CAME FROM can be
                marked: it keeps a ring around it inside the month, which is
                how you see where it sits. The whole thing unfolds (the
                cal-month-expand keyframe) rather than appearing whole. */}
            <div className="cal-month-expand origin-center space-y-1">
              {rows.map((row, r) => {
                const isThisWeek = row.some(
                  (n) => n !== null && weekIsos.has(isoFor(year, month, n)),
                );
                return (
                  <div
                    key={r}
                    className={`grid grid-cols-7 gap-1 rounded-lg ${
                      isThisWeek ? "bg-primary-tint/40 p-0.5 ring-1 ring-primary-line" : ""
                    }`}
                  >
                    {row.map((n, idx) => {
                      if (n === null) return <div key={idx} />;
                      const iso = isoFor(year, month, n);
                      const chips = dayChips(logs, iso);
                      const has = chips.length > 0;
                      const isToday = iso === todayIso;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!has}
                          onClick={() => has && onPickDate(iso)}
                          aria-label={has ? `${chips.join(", ")} on day ${n}` : `Day ${n}`}
                          className={`flex aspect-square flex-col items-stretch overflow-hidden rounded-md p-1 ${
                            has
                              ? "border border-primary-line bg-primary-tint"
                              : isToday
                                ? "border border-primary bg-primary-tint"
                                : "bg-surface-2"
                          } ${isToday ? "ring-1 ring-primary" : ""} disabled:cursor-default`}
                        >
                          <span
                            className={`text-left text-[11px] font-medium leading-none ${
                              has || isToday ? "text-text" : "text-muted"
                            }`}
                          >
                            {n}
                          </span>
                          {has && <Chips chips={chips} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
