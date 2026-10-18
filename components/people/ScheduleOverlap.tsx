"use client";

/*
  THEIR CALENDAR, BEHIND ONE BUTTON — "See Sam's calendar" on someone's
  profile, which opens their whole week as a grid and closes it again.

  ONLY THE BUTTON since 2026-10-18 (owner: "see martin calendar only the
  button"). It used to be a card of its own, "When you're both free", with
  the shared hours as red rectangles above the button and a line for every
  state (no times set, set your hours, no hours in common). The red
  rectangles moved into "Why you match" on the same page, where the other
  reasons are (`sharedSlots` below feeds them); this keeps the button and
  the grid it opens.

  REBUILT 2026-09-30 (owner: "I see random times and I don't know what the
  times do … I want to see what the times are that match, and then press the
  button down to see all the times … this is one of the main things we are
  doing"). The grid: an hour a cell, filled when you are both free, tinted
  when only they are, outlined when only you are.

  Nobody to show (they set no times): nothing at all, not a button to an
  empty grid. Nothing saved. Colours are theme tokens.
*/
import { useState } from "react";
import { weekDays } from "@/lib/onboarding";
import { IconChevronDown } from "@/components/icons";
import {
  GRID_FIRST_HOUR,
  GRID_LAST_HOUR,
  hoursOfDay,
  hoursToSlots,
} from "@/lib/schedule";

const HOURS = Array.from(
  { length: GRID_LAST_HOUR - GRID_FIRST_HOUR + 1 },
  (_, i) => GRID_FIRST_HOUR + i,
);

// "6a", "12p" — short enough for a 26px column.
const mark = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;

type Schedule = Record<string, string[]> | undefined;

/** Whether a week has any hour set at all. */
export const hasAnyTimes = (s: Schedule) => weekDays.some((d) => hoursOfDay(s?.[d.key]).size > 0);

/** The hours you share, per day, as saved-slot strings ("07:00-09:00"). */
export function sharedSlots(
  theirs: Schedule,
  mine: Schedule,
): { day: string; slots: string[] }[] {
  return weekDays
    .map((d) => {
      const a = hoursOfDay(theirs?.[d.key]);
      const b = hoursOfDay(mine?.[d.key]);
      const both = [...a].filter((h) => b.has(h));
      return { day: d.label.slice(0, 3), slots: hoursToSlots(both) };
    })
    .filter((d) => d.slots.length > 0);
}

export default function ScheduleOverlap({
  theirs,
  mine,
  name,
}: {
  theirs: Schedule;
  /** Your own schedule; null while it is still loading. */
  mine: Schedule | null;
  /** Their first name, for the button and the key ("See Sam's calendar"). */
  name: string;
}) {
  const [open, setOpen] = useState(false);
  if (!hasAnyTimes(theirs)) return null;
  const iHave = mine ? hasAnyTimes(mine) : false;

  const lit = Object.fromEntries(
    weekDays.map((d) => [
      d.key,
      { them: hoursOfDay(theirs?.[d.key]), me: hoursOfDay(mine?.[d.key]) },
    ]),
  );

  return (
    <div>
      {/* THE BUTTON — their whole calendar, opened and closed in place. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary-line bg-primary-tint py-2.5 text-[13px] font-semibold text-primary active:opacity-70"
      >
        {open ? "Hide the calendar" : `See ${name}’s calendar`}
        <IconChevronDown
          size={15}
          className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Open, the week sits in a white card of its own under the button. */}
      {open && (
        <div className="mt-2.5 rounded-2xl border border-border bg-surface p-3.5">
          {/* The key — the three states, in the order they matter. */}
          <div className="mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
            {iHave && (
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-primary" /> Both free
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <i className="h-2.5 w-2.5 rounded-[3px] bg-primary-tint" /> Only {name}
            </span>
            {iHave && (
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-primary-line" /> Only you
              </span>
            )}
          </div>

          <div className="grid grid-cols-[26px_repeat(7,minmax(0,1fr))] gap-x-1 gap-y-[2px]">
            <span aria-hidden="true" />
            {weekDays.map((d) => (
              <div key={d.key} className="pb-1 text-center text-[11px] font-semibold text-text">
                {d.label.slice(0, 3)}
              </div>
            ))}

            {HOURS.map((h) => (
              <div key={h} className="contents">
                <div className="pr-1 text-right text-[9px] leading-[14px] tabular-nums text-text-3">
                  {h % 3 === 0 ? mark(h) : ""}
                </div>
                {weekDays.map((d) => {
                  const them = lit[d.key].them.has(h);
                  const me = lit[d.key].me.has(h);
                  const cls =
                    them && me
                      ? "bg-primary"
                      : them
                        ? "bg-primary-tint"
                        : me
                          ? "border border-dashed border-primary-line"
                          : "bg-surface-2";
                  return (
                    <div
                      key={d.key}
                      role="img"
                      aria-label={`${d.label} ${h}:00, ${
                        them && me ? "both free" : them ? `only ${name}` : me ? "only you" : "neither"
                      }`}
                      className={`h-[14px] rounded-[3px] ${cls}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
