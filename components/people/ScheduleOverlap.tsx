"use client";

/*
  WHEN YOU'RE BOTH FREE — the hours you share with this person, then their
  whole week behind one button.

  REBUILT 2026-09-30 (owner: "I see random times and I don't know what the
  times do … I want to see what the times are that match, and then press the
  button down to see all the times … this is one of the main things we are
  doing"). It used to be a row of crimson chips with no heading under the
  Training tiles, and a 15px chevron as the only way into the week. Now:

    • the card has its own title (the page draws it — "When you're both free")
    • the shared hours are RED SQUARES, a row a day, the hours left to right
      (2026-10-01, owner: "the red squares are the similar times you can
      train"; it was a text list from 2026-09-30)
    • a full-width button opens THEIR CALENDAR as a grid — an hour a cell,
      filled when you are both free, tinted when only they are, outlined when
      only you are — and closes it again.

  Every state says what it is: nothing set on their side, nothing set on
  yours (with the way to set it), or no hours in common.

  Nothing saved. Colours are theme tokens.
*/
import { useState } from "react";
import Link from "next/link";
import { weekDays } from "@/lib/onboarding";
import { IconChevronDown } from "@/components/icons";
import {
  GRID_FIRST_HOUR,
  GRID_LAST_HOUR,
  hoursOfDay,
  hoursToSlots,
  rangeLabel,
} from "@/lib/schedule";

const HOURS = Array.from(
  { length: GRID_LAST_HOUR - GRID_FIRST_HOUR + 1 },
  (_, i) => GRID_FIRST_HOUR + i,
);

// "6a", "12p" — short enough for a 26px column.
const mark = (h: number) => `${h % 12 || 12}${h < 12 ? "a" : "p"}`;

type Schedule = Record<string, string[]> | undefined;

const hasAny = (s: Schedule) => weekDays.some((d) => hoursOfDay(s?.[d.key]).size > 0);

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
  const theyHave = hasAny(theirs);
  const iHave = mine ? hasAny(mine) : false;
  const shared = mine ? sharedSlots(theirs, mine) : [];

  const lit = Object.fromEntries(
    weekDays.map((d) => [
      d.key,
      { them: hoursOfDay(theirs?.[d.key]), me: hoursOfDay(mine?.[d.key]) },
    ]),
  );

  // Nothing of theirs to show at all — say so, and no button to an empty grid.
  if (!theyHave) {
    return <p className="text-[13px] text-muted">{name} hasn&rsquo;t set their times yet.</p>;
  }

  return (
    <div>
      {/* THE ANSWER — the shared hours, a day a line. */}
      {mine === null ? (
        <p className="text-[13px] text-muted">—</p>
      ) : !iHave ? (
        <p className="text-[13px] leading-relaxed text-muted">
          Add your own free time to see the hours you share.{" "}
          <Link href="/settings/training" className="font-semibold text-primary">
            Set your hours
          </Link>
        </p>
      ) : shared.length === 0 ? (
        <p className="text-[13px] text-muted">No hours in common.</p>
      ) : (
        /* THE RED SQUARES (owner, 2026-10-01: "the red squares are the
           similar times you can train", "similar times next to each other
           each day"). A row a day, the hours left to right, a square red
           where you are both free — so a day's shared hours sit side by side
           in one strip and the week reads in seven short lines. The words
           ("Mon 7:00–9:00 AM") live on each row for screen readers. */
        <div>
          <div className="flex items-end gap-2">
            <span className="w-8 flex-shrink-0" aria-hidden="true" />
            <div
              className="grid min-w-0 flex-1 gap-[2px]"
              style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}
              aria-hidden="true"
            >
              {HOURS.map((h) => (
                <span
                  key={h}
                  className="whitespace-nowrap text-center text-[9px] leading-[12px] tabular-nums text-text-3"
                >
                  {h % 3 === 0 ? mark(h) : ""}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-1 flex flex-col gap-[3px]">
            {weekDays.map((d) => {
              const both = new Set([...lit[d.key].them].filter((h) => lit[d.key].me.has(h)));
              const words = hoursToSlots(both)
                .map((s) => rangeLabel(s))
                .join(", ");
              return (
                <div
                  key={d.key}
                  role="img"
                  aria-label={`${d.label}: ${words || "no shared hours"}`}
                  className="flex items-center gap-2"
                >
                  <span className="w-8 flex-shrink-0 text-[12px] font-semibold text-text">
                    {d.label.slice(0, 3)}
                  </span>
                  <div
                    className="grid min-w-0 flex-1 gap-[2px]"
                    style={{ gridTemplateColumns: `repeat(${HOURS.length}, minmax(0, 1fr))` }}
                  >
                    {HOURS.map((h) => (
                      <span
                        key={h}
                        className={`h-[18px] rounded-[3px] ${both.has(h) ? "bg-primary" : "bg-surface-2"}`}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* THE BUTTON — his whole calendar, opened and closed in place. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary-line bg-primary-tint py-2.5 text-[13px] font-semibold text-primary active:opacity-70"
      >
        {open ? "Hide the calendar" : `See ${name}’s calendar`}
        <IconChevronDown
          size={15}
          className={`transition-transform duration-200 motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="mt-3">
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
                      aria-label={`${d.label} ${h}:00 — ${
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
