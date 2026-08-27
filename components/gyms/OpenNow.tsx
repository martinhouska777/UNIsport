"use client";

/*
  "Open now · closes 11pm" — one line, shared by the gyms list and the gym page
  so the two can never word it differently.

  The CLOCK is passed in rather than read here (lib/gymHours' useMinuteNow), for
  two reasons: a list of fifteen cards then judges them all against one moment,
  and the list needs the same answer for its ordering as the card shows. Until
  the browser has mounted `now` is null and the plain timetable is drawn — the
  server has no idea what time it is where the reader is.
*/
import { gymOpenState, type Clock } from "@/lib/gymHours";
import { IconClock } from "@/components/icons";

export default function OpenNow({
  hours,
  now,
  size = 13,
}: {
  hours: string;
  now: Clock | null;
  size?: number;
}) {
  const state = now === null ? null : gymOpenState(hours, now.minutes);
  // Green while it's open, amber in the last hour, inherited muted once shut.
  const tone = !state ? "" : state.closingSoon ? "text-warn" : state.open ? "text-success" : "";
  return (
    <span className={`flex items-center gap-1 ${tone}`}>
      <IconClock size={size} /> {state ? state.label : hours}
    </span>
  );
}
