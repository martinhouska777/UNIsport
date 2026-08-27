"use client";

/*
  OPENING HOURS — "6am–11pm" turned into "is it open RIGHT NOW".

  A gym card used to print the timetable and leave the reader to do the sum.
  The one thing somebody standing outside actually wants to know is whether they
  can walk in, so that is what the card says now: "Open now · closes 11pm", or
  "Closed · opens 6am".

  The hours themselves stay where they have always been — a human-written string
  on each gym in lib/gyms.ts (rule 7: data is the source of truth). This file
  only READS that string; adding a school still means adding data, not code.

  Nothing here knows about colours or components: it hands back a state and a
  sentence, and the card decides how to draw them.
*/
import { useEffect, useState } from "react";

export type GymOpenState = {
  open: boolean;
  /** True while it is open but shuts within the hour. */
  closingSoon: boolean;
  /** "Open now · closes 11pm" / "Closes in 25 min" / "Closed · opens 6am" */
  label: string;
};

const MINUTES_IN_DAY = 24 * 60;

/*
  "6am" → 360, "10:45pm" → 1365, "12am" → 0 (as an opening time) — and midnight
  as a CLOSING time is handled by the caller, which pushes it to the end of the
  day rather than the start.
*/
function parseTime(raw: string): number | null {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (hour === 12) hour = 0; // 12am = 0, 12pm = 12 once the pm below is added
  if (m[3] === "pm") hour += 12;
  return hour * 60 + minute;
}

/** "6am–11pm" → { opens: 360, closes: 1380 }. Null if the string isn't one. */
export function parseHours(hours: string): { opens: number; closes: number } | null {
  const parts = hours.split(/[–—-]/);
  if (parts.length !== 2) return null;
  const opens = parseTime(parts[0]);
  let closes = parseTime(parts[1]);
  if (opens === null || closes === null) return null;
  // A closing time at or before opening means it runs past midnight: "7am–12am"
  // closes at the END of the day, not at the start of it.
  if (closes <= opens) closes += MINUTES_IN_DAY;
  return { opens, closes };
}

/*
  Pretty-prints a time back the way the data writes it: 1380 → "11pm". Midnight
  is the exception — "closes 12am" reads as a typo, and every house gym closes
  then, so it gets the word.
*/
function clockLabel(minutes: number): string {
  const m = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY;
  if (m === 0) return "midnight";
  const hour24 = Math.floor(m / 60);
  const minute = m % 60;
  const suffix = hour24 < 12 ? "am" : "pm";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${hour}${suffix}` : `${hour}:${String(minute).padStart(2, "0")}${suffix}`;
}

/*
  The state of one gym at one moment. `now` is minutes since midnight, passed in
  rather than read here so a whole list can be judged against a single clock —
  and so this stays a pure function that can be tested without waiting for 6am.
*/
export function gymOpenState(hours: string, now: number): GymOpenState | null {
  const span = parseHours(hours);
  if (!span) return null;

  // Yesterday's window can still be running (a midnight closer, read at 00:30).
  const open =
    (now >= span.opens && now < span.closes) ||
    (now + MINUTES_IN_DAY >= span.opens && now + MINUTES_IN_DAY < span.closes);

  if (!open) {
    return { open: false, closingSoon: false, label: `Closed · opens ${clockLabel(span.opens)}` };
  }

  const closesIn = (now >= span.opens ? span.closes - now : span.closes - now - MINUTES_IN_DAY);
  if (closesIn < 60) {
    return { open: true, closingSoon: true, label: `Closes in ${closesIn} min` };
  }
  return { open: true, closingSoon: false, label: `Open now · closes ${clockLabel(span.closes)}` };
}

/*
  The current time, in minutes since midnight — NULL until the component has
  mounted in the browser.

  That null matters: the server has no idea what time it is where the reader is,
  so rendering "Open now" during the server pass would make the first paint
  disagree with the second one (React calls that a hydration mismatch). Every
  caller therefore draws the plain timetable until this returns a number, and
  the label settles a moment later.

  It re-reads once a minute, so a gym that closes while you are looking at the
  list says so.
*/
export function useMinuteNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const read = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    read();
    const id = setInterval(read, 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}
