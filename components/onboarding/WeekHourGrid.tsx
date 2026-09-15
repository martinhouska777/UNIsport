"use client";

/*
  The week as a grid of hours — Monday to Sunday across, 6 am to 9 pm down.
  Tap an hour to say you're free then; tap it again to take it back.

  Every cell says its own hour (the owner wanted it that way — no label column
  to read across to), and back-to-back hours on the same day join into one
  block, so "5 pm to 8 pm" reads as a single stretch of time.

  The grid holds no state of its own: it draws the saved schedule and reports
  each tap, and the parent applies the tap to the schedule as it is at that
  moment (quick taps in a row must all land).
*/
import { weekDays } from "@/lib/onboarding";
import { GRID_FIRST_HOUR, GRID_LAST_HOUR, hourName, hoursOfDay } from "@/lib/schedule";

const HOURS = Array.from(
  { length: GRID_LAST_HOUR - GRID_FIRST_HOUR + 1 },
  (_, i) => GRID_FIRST_HOUR + i,
);

export default function WeekHourGrid({
  schedule,
  onToggle,
}: {
  schedule: Record<string, string[]>;
  onToggle: (day: string, hour: number) => void;
}) {
  const lit = Object.fromEntries(weekDays.map((d) => [d.key, hoursOfDay(schedule[d.key])]));

  return (
    <div className="grid grid-cols-7 gap-x-1">
      {weekDays.map((d) => (
        <div key={d.key} className="pb-1.5 text-center text-[11px] font-semibold text-text">
          {d.label.slice(0, 3)}
        </div>
      ))}

      {HOURS.map((h) => (
        <div key={h} className="contents">
          {weekDays.map((d) => {
            const on = lit[d.key].has(h);
            const joinUp = on && lit[d.key].has(h - 1);
            const joinDown = on && lit[d.key].has(h + 1);
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => onToggle(d.key, h)}
                aria-pressed={on}
                aria-label={`${d.label} ${hourName(h)}`}
                className="relative h-8"
              >
                <span
                  className={`absolute inset-x-0 flex items-center justify-center whitespace-nowrap text-[10px] tabular-nums transition-colors ${
                    on ? "bg-primary font-medium text-primary-contrast" : "bg-surface-2 text-muted"
                  } ${joinUp ? "top-0" : "top-[2px] rounded-t-md"} ${
                    joinDown ? "bottom-0" : "bottom-[2px] rounded-b-md"
                  }`}
                >
                  {hourName(h)}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
