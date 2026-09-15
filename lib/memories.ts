/*
  MEMORIES — the photos from your logged sessions, shaped for a gallery.
  ---------------------------------------------------------------------------
  A "memory" is ONE photo, carrying everything about the session it came from:
  the day, where it was, who you were with, what you trained, and the note you
  wrote. A session with four photos makes four memories.

  Nothing new is stored. The photos already live on `workout_logs.photos`
  (db/workout_logs.sql); this file only rearranges what's there. That's why it
  sits in lib/ next to the other shaping helpers rather than in lib/supabase/,
  which is about reading and writing.

  Order is newest first, everywhere, and grouping is by DAY, then by SESSION
  inside the day — the screen draws one card per day and, inside it, each
  session with its own photos on top and its lines under them (owner,
  2026-09-15): "Gym", then "Chest", then where and who with.

  FLASHBACKS (same day) — a memory from this date in an earlier year, or, until
  there is a year of photos, in an earlier month. See `flashbackDates`.
*/
import {
  activityLabel,
  logMuscles,
  metricsSummary,
  type WorkoutLog,
} from "@/lib/supabase/workouts";

/** One photo, with the session it belongs to flattened onto it. */
export type Memory = {
  id: string; // logId + photo position — unique across the gallery
  logId: string;
  src: string; // the photo itself
  date: string; // ISO yyyy-mm-dd
  gym: string; // where it was, "" when the session didn't say
  partner: string; // who you were with, "" when solo
  partnerId?: string; // set when the partner is a real person on the app
  note: string; // the comment you wrote for the session
  trained: string; // what you trained, already in one line
  activity: string; // "Gym" · "Run" — the session's first line
  detail: string; // "Chest · Back" · "5 km · 30 min" — its second, "" when nothing
  position: number; // 1-based, within its own session
  count: number; // how many photos that session has
};

/** One session inside a day: its lines, and its own photos. */
export type MemorySession = {
  logId: string;
  trained: string; // what you did, in one line
  activity: string; // "Gym"
  detail: string; // "Chest", "" when nothing more is known
  gym: string; // "" when the session didn't say
  partner: string; // "" when solo
  memories: Memory[]; // this session's photos, in order
};

/** A day's worth of memories, with the header lines the screen shows. */
export type MemoryDay = {
  date: string; // ISO yyyy-mm-dd
  label: string; // "Today" · "Yesterday" · "Friday, August 14"
  trained: string; // everything trained that day, joined
  sessions: MemorySession[]; // each session that day, newest first
  memories: Memory[];
};

/*
  What the session was beyond its kind — the second line under "Gym".
  Runs and cardio describe themselves with distance and time; gym sessions are
  best described by the body parts worked. When a gym session has exercises but
  no muscle tags (older logs didn't have them), the exercise names say more.
*/
export function detailLine(log: WorkoutLog): string {
  if (log.activity === "running" || log.activity === "cardio") return metricsSummary(log);
  const muscles = logMuscles(log);
  if (muscles.length) return muscles.join(" · ");
  const names = log.exercises.map((e) => e.name.trim()).filter(Boolean);
  return names.slice(0, 3).join(" · ");
}

/** What you trained, in one line. */
export function trainedLine(log: WorkoutLog): string {
  if (log.activity === "running" || log.activity === "cardio") {
    return [activityLabel(log.activity), metricsSummary(log)].filter(Boolean).join(" · ");
  }
  return detailLine(log) || activityLabel(log.activity);
}

/** Local-time ISO yyyy-mm-dd, so "today" means today where the user is. */
const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/*
  The day's name. Today and Yesterday are named; anything older gets its weekday
  and date, and the year appears only once it isn't this year — a memory from
  last November shouldn't have to say 2026 to be understood.
*/
export function dayLabel(iso: string, now: Date = new Date()): string {
  const today = isoOf(now);
  if (iso === today) return "Today";
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (iso === isoOf(yest)) return "Yesterday";

  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

/** The full date, for the viewer, where there's room to spell it out. */
export function fullDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Every photo in the given logs, newest session first, as memories. */
export function toMemories(logs: WorkoutLog[]): Memory[] {
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const out: Memory[] = [];
  for (const log of sorted) {
    const trained = trainedLine(log);
    const activity = activityLabel(log.activity);
    const detail = detailLine(log);
    const solo = !log.partner || log.partner.trim().toLowerCase() === "solo";
    log.photos.forEach((src, i) => {
      out.push({
        id: `${log.id}:${i}`,
        logId: log.id,
        src,
        date: log.date,
        gym: log.gym.trim(),
        partner: solo ? "" : log.partner.trim(),
        ...(log.partnerId ? { partnerId: log.partnerId } : {}),
        note: log.note.trim(),
        trained,
        activity,
        detail: detail === activity ? "" : detail,
        position: i + 1,
        count: log.photos.length,
      });
    });
  }
  return out;
}

/** Group memories into days, and each day into its sessions, newest first. */
export function groupByDay(memories: Memory[], now: Date = new Date()): MemoryDay[] {
  const days: MemoryDay[] = [];
  const byDate = new Map<string, MemoryDay>();

  for (const m of memories) {
    let day = byDate.get(m.date);
    if (!day) {
      day = { date: m.date, label: dayLabel(m.date, now), trained: "", sessions: [], memories: [] };
      byDate.set(m.date, day);
      days.push(day);
    }
    day.memories.push(m);
    let session = day.sessions.find((s) => s.logId === m.logId);
    if (!session) {
      session = {
        logId: m.logId,
        trained: m.trained,
        activity: m.activity,
        detail: m.detail,
        gym: m.gym,
        partner: m.partner,
        memories: [],
      };
      day.sessions.push(session);
    }
    session.memories.push(m);
  }

  // A day can hold more than one session, so its summary lists each distinct
  // thing trained, once.
  for (const day of days) {
    const seen: string[] = [];
    for (const m of day.memories) if (m.trained && !seen.includes(m.trained)) seen.push(m.trained);
    day.trained = seen.join(" · ");
  }
  return days;
}

/* ─────────────────────────────  flashbacks  ───────────────────────────── */

/*
  Which earlier days count as "this day" (owner, 2026-09-15: "Flashback from
  September 10, gym with somebody", like Snapchat). First the same date in each
  of the last five years; the screen tries those, and only if none has a photo
  does it fall back to the same date in each of the last eleven months — so a
  campus that has used the app for one term still gets a Flashback. A date that
  doesn't exist in a month (the 31st, 29 February) is skipped, not moved.
*/
export function flashbackDates(now: Date = new Date()): { years: string[]; months: string[] } {
  const day = now.getDate();
  const years: string[] = [];
  for (let y = 1; y <= 5; y++) {
    const d = new Date(now.getFullYear() - y, now.getMonth(), day);
    if (d.getDate() === day) years.push(isoOf(d));
  }
  const months: string[] = [];
  for (let m = 1; m <= 11; m++) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, day);
    if (d.getDate() === day) months.push(isoOf(d));
  }
  return { years, months };
}

/** "September 10" this year, "September 15, 2025" in an earlier one. */
export function flashbackLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}
