"use client";

/*
  THIS WEEK — seven days, Monday to Sunday, from the logged sessions.

  The Profile tab used to open on a whole month, which is a record; a week is
  a plan. Each day shows what was trained (body parts, or the activity for a
  run); today is outlined; a day with nothing on it says nothing. Tapping a
  trained day opens it. The full month is one tap away underneath.

  Reads the same logs the month calendar does and words the chips the same
  way (dayChips, exported from SessionCalendar), so the two can never
  disagree about what a day was. Colours are theme tokens.
*/
import { dayChips, shortMuscle } from "@/components/profile/SessionCalendar";
import type { WorkoutLog } from "@/lib/supabase/workouts";
import { nextDays } from "@/lib/schedule";

/** Monday of the week that contains `today`, plus the six days after. */
export function thisWeek(today = new Date()) {
  const back = (today.getDay() + 6) % 7; // Monday = 0
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
  return nextDays(7, monday);
}

export default function WeekCalendar({
  logs,
  onPickDate,
}: {
  logs: WorkoutLog[];
  onPickDate: (dateIso: string) => void;
}) {
  const days = thisWeek();
  const todayIso = nextDays(1)[0].iso;
  const trained = days.filter((d) => dayChips(logs, d.iso).length > 0).length;

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">This week</div>
        <div className="text-[11px] text-muted">
          {trained === 0 ? "Nothing logged yet" : `${trained} ${trained === 1 ? "day" : "days"} trained`}
        </div>
      </div>
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
              <span className={`text-[10px] leading-none ${has || isToday ? "text-text" : past ? "text-text-3" : "text-muted"}`}>
                {d.letter}
              </span>
              <span className={`text-[11px] font-medium leading-tight ${has || isToday ? "text-text" : "text-muted"}`}>
                {d.num}
              </span>
              {has && (
                <span className="mt-auto flex flex-col gap-0.5">
                  {chips.slice(0, 2).map((c) => (
                    <span
                      key={c}
                      className="truncate rounded bg-primary-tint px-[3px] text-[7px] font-medium leading-[1.4] text-primary"
                    >
                      {shortMuscle(c)}
                    </span>
                  ))}
                  {chips.length > 2 && (
                    <span className="px-[3px] text-[7px] font-medium leading-[1.3] text-muted">+{chips.length - 2}</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
