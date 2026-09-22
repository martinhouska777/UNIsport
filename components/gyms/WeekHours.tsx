"use client";

/*
  The week's opening hours, seven rows, today in full-strength text.

  The rows come from lib/gymHours' weekHours() — data in, list out — so the day
  a gym gets real per-day hours this component needs no change at all.
*/
import { weekHours, isAlwaysOpen, type Clock } from "@/lib/gymHours";

export default function WeekHours({ hours, now }: { hours: string; now: Clock | null }) {
  /* A gym that never shuts has no week to print, and the line at the top of
     the page already says "Open 24/7" — a second block repeating it is the
     same fact twice. The house gyms therefore have no hours section. */
  if (isAlwaysOpen(hours)) return null;
  const days = weekHours(hours, now?.weekday ?? null);
  return (
    <div className="border-b border-border px-3.5 py-3.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        Opening hours
      </h2>
      <ul className="mt-2 flex flex-col">
        {days.map((d) => (
          <li
            key={d.day}
            className={`flex items-center justify-between py-1 text-[13px] ${
              d.today ? "font-medium text-text" : "text-muted"
            }`}
          >
            <span>{d.day}</span>
            <span>{d.hours}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
