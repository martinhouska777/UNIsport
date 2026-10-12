/*
  ADD TO CALENDAR — an accepted session, handed to the phone's own calendar.
  No account is connected: Apple gets a calendar file (the route at
  /api/calendar/plan/<id> serves it), Google gets its "new event" page with
  everything filled in. Either way the student only presses Add / Save.

  A plan has a start but no length, so every session goes in as an hour.
*/
import { SITE_URL } from "@/lib/siteUrl";
import { activityLabel } from "@/lib/supabase/workouts";

export const PLAN_EVENT_MINUTES = 60;

export type CalendarEvent = {
  /** stable across downloads, so a second add can replace the first */
  uid: string;
  title: string;
  place: string | null;
  start: Date;
  end: Date;
};

/** "Gym with Arjun Mehta" — the event's name in the calendar. */
export function planEvent(p: {
  planId: string;
  activity: string;
  otherName: string;
  place: string | null;
  scheduledAt: string;
}): CalendarEvent {
  const start = new Date(p.scheduledAt);
  return {
    uid: `${p.planId}@getunisport.com`,
    title: `${activityLabel(p.activity)} with ${p.otherName}`,
    place: p.place,
    start,
    end: new Date(start.getTime() + PLAN_EVENT_MINUTES * 60_000),
  };
}

/** 2026-10-13T21:00:00.000Z → "20261013T210000Z" (both formats below use it). */
function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Where the Apple choice points: the file is built on the server, from the plan. */
export function appleCalendarHref(planId: string): string {
  return `/api/calendar/plan/${encodeURIComponent(planId)}`;
}

/** Google Calendar's own "new event" page, filled in. */
export function googleCalendarHref(ev: CalendarEvent): string {
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: ev.title,
    dates: `${utcStamp(ev.start)}/${utcStamp(ev.end)}`,
    details: `Planned on UNIsport\n${SITE_URL}/messages`,
  });
  if (ev.place) q.set("location", ev.place);
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

// ---- the .ics file (RFC 5545) ---------------------------------------------

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Long lines are folded onto continuation lines (the limit is 75 BYTES; 60
    characters leaves room for accented names). */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 60) {
    parts.push(rest.slice(0, 60));
    rest = " " + rest.slice(60);
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function icsFile(ev: CalendarEvent, now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//UNIsport//Sessions//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${utcStamp(ev.start)}`,
    `DTEND:${utcStamp(ev.end)}`,
    `SUMMARY:${escapeText(ev.title)}`,
    ...(ev.place ? [`LOCATION:${escapeText(ev.place)}`] : []),
    `DESCRIPTION:${escapeText(`Planned on UNIsport\n${SITE_URL}/messages`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
