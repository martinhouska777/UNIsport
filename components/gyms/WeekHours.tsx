"use client";

/*
  The week's opening hours, seven rows, today in full-strength text.

  The rows come from lib/gymHours' weekHours() — data in, list out — so the day
  a gym gets real per-day hours this component needs no change at all.
*/
import { weekHours, isAlwaysOpen, type Clock } from "@/lib/gymHours";
import SectionLabel from "@/components/ui/SectionLabel";

export default function WeekHours({ hours, now }: { hours: string; now: Clock | null }) {
  const days = weekHours(hours, now?.weekday ?? null);
  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <SectionLabel>Opening hours</SectionLabel>
      {/* A gym that never shuts has no week to print — seven identical rows
          saying "Open 24 hours" is a table pretending to be information. Since
          the "Open now" line came off the top of the page, this one line is
          the only place a house gym says it at all. */}
      {isAlwaysOpen(hours) ? (
        <div className="mt-1.5 text-[13px] text-text">Open 24 hours, every day</div>
      ) : (
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
      )}
    </div>
  );
}
