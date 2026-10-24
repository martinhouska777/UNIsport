"use client";

/*
  PICK A DAY — a dropdown of real dates, today first.

  It was a grid of seven day tiles with arrows to page a week at a time. Now it
  is one dropdown that sits beside the Time dropdown, so "when" is one line
  (owner, 2026-10-24: "select a day from dropdown … right next to it there
  would be a dropdown time", look A of four). The reach is the same: four weeks
  ahead (owner, 2026-09-22: "let me put it more into the future").

  Today and tomorrow are said as words, the rest as "Mon 27 Oct", the app's one
  way to write a date (lib/schedule.ts → dateLabel), short enough to fit a
  half-width dropdown on a phone.

  Shared by the session search and the board post form, because they are the
  same question asked from two ends and must not drift apart.
*/
import { SelectField } from "@/components/onboarding/controls";
import { dateLabel, nextDays } from "@/lib/schedule";

/** How many days ahead you can pick: four weeks of planning. */
const DAYS_AHEAD = 28;

export default function DaySelect({
  value,
  onChange,
  placeholder,
}: {
  /** The chosen date as yyyy-mm-dd, or null. */
  value: string | null;
  onChange: (iso: string | null) => void;
  placeholder: string;
}) {
  const options = nextDays(DAYS_AHEAD).map((d) => ({
    value: d.iso,
    label: d.isToday ? "Today" : d.isTomorrow ? "Tomorrow" : dateLabel(d.iso),
  }));
  return (
    <SelectField
      value={value ?? ""}
      onChange={(v) => onChange(v || null)}
      options={options}
      placeholder={placeholder}
      ariaLabel="Day"
    />
  );
}
