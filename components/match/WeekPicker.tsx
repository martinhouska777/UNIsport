"use client";

/*
  PICK A DAY — a real one, with a date on it.

  Both places that ask "when?" used to offer seven bare weekday pills. "Mon"
  meant some Monday: you couldn't tell which one, and you couldn't ask for the
  one after next. This shows a week at a time with the dates on, arrows to move
  between weeks, and a month of forward planning (lib/schedule.ts).

  Days already gone are dead — you can't arrange to have trained yesterday — and
  today is ringed so you can find your place without reading the numbers.

  Shared by the session search and the board post form, because they are the
  same question asked from two ends and must not drift apart.

  Presentational: it owns no state. Colors are theme tokens.
*/
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { weekStrip, weekLabel, MAX_WEEKS_AHEAD } from "@/lib/schedule";

export default function WeekPicker({
  value,
  onChange,
  week,
  onWeekChange,
}: {
  /** The chosen date as yyyy-mm-dd, or null. */
  value: string | null;
  onChange: (iso: string) => void;
  /** How many weeks ahead of this one we're looking at. */
  week: number;
  onWeekChange: (next: number) => void;
}) {
  const days = weekStrip(week);
  const canBack = week > 0;
  const canForward = week < MAX_WEEKS_AHEAD;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => canBack && onWeekChange(week - 1)}
          disabled={!canBack}
          aria-label="Previous week"
          className={`tap44 flex h-8 w-8 items-center justify-center rounded-lg border border-border ${
            canBack ? "text-text" : "text-muted/30"
          }`}
        >
          <IconChevronLeft size={15} />
        </button>
        <span className="text-[13px] font-medium text-text">{weekLabel(week)}</span>
        <button
          type="button"
          onClick={() => canForward && onWeekChange(week + 1)}
          disabled={!canForward}
          aria-label="Next week"
          className={`tap44 flex h-8 w-8 items-center justify-center rounded-lg border border-border ${
            canForward ? "text-text" : "text-muted/30"
          }`}
        >
          <IconChevronRight size={15} />
        </button>
      </div>

      <div className="flex gap-1">
        {days.map((d) => {
          const on = value === d.iso;
          return (
            <button
              key={d.iso}
              type="button"
              disabled={d.isPast}
              onClick={() => onChange(d.iso)}
              aria-label={d.iso}
              aria-pressed={on}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-[10px] border py-2 transition-colors ${
                on
                  ? "border-primary bg-primary text-primary-contrast"
                  : d.isPast
                    ? "border-transparent text-muted/30"
                    : d.isToday
                      ? "border-primary bg-surface text-text"
                      : "border-border bg-surface text-text"
              }`}
            >
              <span className="text-[10px] leading-none opacity-70">{d.letter}</span>
              <span className="text-[13px] font-medium leading-none tabular-nums">{d.num}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
