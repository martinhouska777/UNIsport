/*
  MEMORIES — the photos from your logged sessions, shaped for a gallery.
  ---------------------------------------------------------------------------
  A "memory" is ONE photo, carrying everything about the session it came from:
  the day, where it was, who you were with, what you trained, and the note you
  wrote. A session with four photos makes four memories, so the gallery is a
  wall of pictures rather than a list of sessions — the whole point of the
  screen.

  Nothing new is stored. The photos already live on `workout_logs.photos`
  (db/workout_logs.sql); this file only rearranges what's there. That's why it
  sits in lib/ next to the other shaping helpers rather than in lib/supabase/,
  which is about reading and writing.

  Order is newest first, everywhere, and grouping is by DAY — the way you
  actually remember training.
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
  position: number; // 1-based, within its own session
  count: number; // how many photos that session has
};

/** A day's worth of memories, with the header line the screen shows. */
export type MemoryDay = {
  date: string; // ISO yyyy-mm-dd
  label: string; // "Today" · "Yesterday" · "Friday 14 August"
  trained: string; // everything trained that day, joined
  memories: Memory[];
};

/*
  What you trained, in one line.
  Runs and cardio describe themselves with distance and time; gym sessions are
  best described by the body parts worked. When a gym session has exercises but
  no muscle tags (older logs didn't have them), the exercise names say more than
  the word "Gym" does.
*/
export function trainedLine(log: WorkoutLog): string {
  if (log.activity === "running" || log.activity === "cardio") {
    return [activityLabel(log.activity), metricsSummary(log)].filter(Boolean).join(" · ");
  }
  const muscles = logMuscles(log);
  if (muscles.length) return muscles.join(" · ");
  const names = log.exercises.map((e) => e.name.trim()).filter(Boolean);
  if (names.length) return names.slice(0, 3).join(" · ");
  return activityLabel(log.activity);
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
        position: i + 1,
        count: log.photos.length,
      });
    });
  }
  return out;
}

/** Group memories into days, keeping the newest-first order they arrive in. */
export function groupByDay(memories: Memory[], now: Date = new Date()): MemoryDay[] {
  const days: MemoryDay[] = [];
  const byDate = new Map<string, MemoryDay>();

  for (const m of memories) {
    let day = byDate.get(m.date);
    if (!day) {
      day = { date: m.date, label: dayLabel(m.date, now), trained: "", memories: [] };
      byDate.set(m.date, day);
      days.push(day);
    }
    day.memories.push(m);
  }

  // A day can hold more than one session, so its header lists each distinct
  // thing trained, once.
  for (const day of days) {
    const seen: string[] = [];
    for (const m of day.memories) if (m.trained && !seen.includes(m.trained)) seen.push(m.trained);
    day.trained = seen.join(" · ");
  }
  return days;
}
