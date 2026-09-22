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

  AND YOU CAN GO FURTHER OUT (owner, 2026-09-22: "put there a calendar of days
  that you can switch — now it's just this week, let me put it more into the
  future"). The arrows move a whole week at a time, up to WEEKS_AHEAD of them,
  and the header says which week you are looking at. Nothing is greyed out: the
  first page still starts at today, so a week never opens on days already gone.

  Today and tomorrow say so, in a small line under the name — those are the two
  days people actually book, and counting back from a date to work out whether
  the 9th is today is exactly the sum a picker should do for you.

  Shared by the session search and the board post form, because they are the
  same question asked from two ends and must not drift apart.

  Colors are theme tokens.
*/
import { useState } from "react";
import { nextDays } from "@/lib/schedule";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

/** How many seven-day pages forward you can reach — a month of planning. */
const WEEKS_AHEAD = 4;

export default function WeekPicker({
  value,
  onChange,
}: {
  /** The chosen date as yyyy-mm-dd, or null. */
  value: string | null;
  onChange: (iso: string) => void;
}) {
  // 0 = the seven days starting today, 1 = the seven after those, …
  const [page, setPage] = useState(0);

  /* Asked for as ONE run of days from today and then sliced, so `isToday` and
     `isTomorrow` stay attached to the real today however far out you page. */
  const days = nextDays(7 * (page + 1)).slice(page * 7);
  const first = days[0];
  const last = days[days.length - 1];

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          aria-label="Earlier days"
          className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border text-muted disabled:opacity-30"
        >
          <IconChevronLeft size={14} />
        </button>
        <span className="min-w-0 truncate text-[12px] font-medium tabular-nums text-text">
          {page === 0
            ? "Next 7 days"
            : `${first.num} ${first.month} – ${last.num} ${last.month}`}
        </span>
        <button
          type="button"
          onClick={() => setPage((p) => Math.min(WEEKS_AHEAD - 1, p + 1))}
          disabled={page >= WEEKS_AHEAD - 1}
          aria-label="Later days"
          className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border border-border text-muted disabled:opacity-30"
        >
          <IconChevronRight size={14} />
        </button>
      </div>

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
    </div>
  );
}
