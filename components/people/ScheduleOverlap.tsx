"use client";

/*
  WHEN YOU BOTH TRAIN — their week laid over yours.

  The same week-of-hours the onboarding grid draws (Mon–Sun across, 6 am to
  9 pm down, lib/schedule.ts), shrunk to a glance: no text in the cells, an
  hour mark every three hours down the left. An hour is filled solid when you
  are BOTH free then, tinted when only they are, outlined when only you are.
  The shared hours also as words ("Mon 07:00–09:00"), because that is what
  you will type into the message.

  FOLDED by default (owner, 2026-09-22: the full grid took half the screen).
  The closed row carries the shared hours as chips, so the useful answer is
  always on screen; the tap opens the whole week under it.

  Nothing saved. Colours are theme tokens.
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
}: {
  theirs: Schedule;
  /** Your own schedule; null while it is still loading (their week alone is drawn). */
  mine: Schedule | null;
}) {
  const lit = Object.fromEntries(
    weekDays.map((d) => [
      d.key,
      { them: hoursOfDay(theirs?.[d.key]), me: hoursOfDay(mine?.[d.key]) },
    ]),
  );
  const shared = mine ? sharedSlots(theirs, mine) : [];
  const [open, setOpen] = useState(false);

  const chips = !mine ? (
    <span className="text-[12px] text-muted">—</span>
  ) : shared.length === 0 ? (
    <span className="text-[12px] text-muted">No shared hours</span>
  ) : (
    shared.flatMap((d) =>
      d.slots.map((s) => (
        <span
          key={`${d.day} ${s}`}
          className="rounded-md bg-primary px-2 py-1 text-[11.5px] font-medium tabular-nums text-primary-contrast"
        >
          {d.day} {s.replace("-", "–")}
        </span>
      )),
    )
  );

  return (
    <div>
      {/* The closed row: the shared hours, and the chevron that opens the week. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="tap44 flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex flex-wrap items-center gap-1.5">{chips}</span>
        <span
          className={`shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        >
          <IconChevronDown size={15} />
        </span>
      </button>

      {open && (
        <div className="mt-3">
          {/* Legend — the three states, in the order they matter. */}
          {mine && (
            <div className="mb-2 flex items-center gap-3 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-primary" /> Both
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] bg-primary-tint" /> Them
              </span>
              <span className="flex items-center gap-1.5">
                <i className="h-2.5 w-2.5 rounded-[3px] border border-dashed border-primary-line" />{" "}
                You
              </span>
            </div>
          )}

          <div className="grid grid-cols-[26px_repeat(7,minmax(0,1fr))] gap-x-1 gap-y-[2px]">
            <span aria-hidden="true" />
            {weekDays.map((d) => (
              <div
                key={d.key}
                className="pb-1 text-center text-[11px] font-semibold text-text"
              >
                {d.letter}
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
                        them && me
                          ? "both"
                          : them
                            ? "them"
                            : me
                              ? "you"
                              : "neither"
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
