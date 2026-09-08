"use client";

/*
  PICK A DAY — a real one, with a date on it, called by its full name.

  Both places that ask "when?" once offered seven bare weekday pills: "Mon"
  meant some Monday and you couldn't tell which. That was replaced by a calendar
  week with arrows and a month of forward planning, which cost a header row, two
  arrows, and half the strip greyed out as days already gone.

  It is now THE NEXT SEVEN DAYS, today first, each with its full weekday name
  and date. Nothing is dead, nothing needs paging to reach, and "Wednesday" is a
  word you read rather than a "W" you decode. Two columns, because "Wednesday"
  does not fit in a seventh of a phone.

  Today and tomorrow say so, in a small line under the name — those are the two
  days people actually book, and counting back from a date to work out whether
  the 9th is today is exactly the sum a picker should do for you.

  Shared by the session search and the board post form, because they are the
  same question asked from two ends and must not drift apart.

  Presentational: it owns no state. Colors are theme tokens.
*/
import { nextDays } from "@/lib/schedule";

export default function WeekPicker({
  value,
  onChange,
}: {
  /** The chosen date as yyyy-mm-dd, or null. */
  value: string | null;
  onChange: (iso: string) => void;
}) {
  const days = nextDays();

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {days.map((d) => {
        const on = value === d.iso;
        const when = d.isToday ? "Today" : d.isTomorrow ? "Tomorrow" : null;
        return (
          <button
            key={d.iso}
            type="button"
            onClick={() => onChange(d.iso)}
            aria-label={`${d.name} ${d.num} ${d.month}`}
            aria-pressed={on}
            className={`tap44 flex flex-col items-start rounded-[10px] border px-2.5 py-2 text-left transition-colors ${
              on
                ? "border-primary bg-primary text-primary-contrast"
                : d.isToday
                  ? "border-primary bg-surface text-text"
                  : "border-border bg-surface text-text"
            }`}
          >
            <span className="text-[13px] font-medium leading-tight">{d.name}</span>
            <span
              className={`text-[11px] leading-tight tabular-nums ${
                on ? "opacity-80" : "text-muted"
              }`}
            >
              {when ?? `${d.num} ${d.month}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
