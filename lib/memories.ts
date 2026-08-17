/*
  MEMORIES — the photo side of your logged sessions.
  ---------------------------------------------------------------------------
  The session calendar answers "which days did I train?". Memories answers the
  other question: "show me the pictures." Same data, no new table — every photo
  already lives on a workout_logs row next to the gym it was taken at, the note
  you wrote, and the exercises you did.

  This file is PURE derivation (no I/O, no React): it flattens the logs into one
  entry per PHOTO, works out the "what did I train" line for each, and groups
  them by day. Keeping it here means the screen, the viewer and the share sheet
  all agree on what a memory is.
*/
import {
  activityLabel,
  logMuscles,
  metricsSummary,
  type WorkoutLog,
} from "@/lib/supabase/workouts";

// One photo, with everything the viewer needs to caption it.
export type Memory = {
  id: string; // `${logId}:${photoIndex}` — stable, so React keys survive a refetch
  logId: string;
  photoIndex: number;
  photo: string; // downscaled data URL (as stored on the log)
  date: string; // ISO yyyy-mm-dd
  gym: string; // "" when the session had no gym
  note: string; // the comment you wrote for the session ("" if none)
  trained: string[]; // body parts, or the run/cardio line, or the activity name
  activity: string;
  partner: string; // display name; "" or "Solo" for a solo session
  verified: boolean;
};

export type MemoryDay = {
  date: string; // ISO yyyy-mm-dd
  label: string; // "Today" / "Yesterday" / "Monday 4 August"
  items: Memory[];
};

/*
  WHAT DID I TRAIN — one short list, whatever the activity was:
    gym/other  → the body parts ("Chest", "Triceps")
    running    → the distance/time ("5.2 km", "24:30")
    cardio     → the type first ("Rowing", "2 km", "8:12")
  Falls back to the activity name so a memory is never captioned with nothing.
*/
export function trainedParts(log: WorkoutLog): string[] {
  const muscles = logMuscles(log);
  if (muscles.length > 0) return muscles;
  const metrics = metricsSummary(log);
  if (metrics) return metrics.split(" · ").filter(Boolean);
  return [activityLabel(log.activity)];
}

/** One line of the same thing, for chat previews and share cards. */
export function trainedLine(log: WorkoutLog): string {
  return trainedParts(log).join(" · ");
}

/** Every photo across the given logs, newest day first. */
export function memoriesFromLogs(logs: WorkoutLog[]): Memory[] {
  const out: Memory[] = [];
  // Newest first, so the grid opens on the most recent thing you did.
  const ordered = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const log of ordered) {
    const trained = trainedParts(log);
    log.photos.forEach((photo, photoIndex) => {
      if (!photo) return;
      out.push({
        id: `${log.id}:${photoIndex}`,
        logId: log.id,
        photoIndex,
        photo,
        date: log.date,
        gym: log.gym,
        note: log.note,
        trained,
        activity: log.activity,
        partner: log.partner,
        verified: !!log.verified,
      });
    });
  }
  return out;
}

// Local-date ISO (yyyy-mm-dd), matching how log_date is stored.
const localIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/**
 * "Today" / "Yesterday" for the two days that have their own name, then the
 * weekday and date. The year only appears once it isn't this one — writing 2026
 * on every tile from this year is noise.
 */
export function dayHeading(iso: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (iso === localIso(today)) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === localIso(yesterday)) return "Yesterday";

  const d = new Date(`${iso}T00:00:00`);
  const sameYear = d.getFullYear() === today.getFullYear();
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

/** "August 2026" — the divider in the all-photos grid. */
export function monthHeading(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** "4 Aug" — the small stamp on a memory in a chat. */
export function shortDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Group memories (already newest-first) into days, keeping that order. */
export function groupByDay(memories: Memory[]): MemoryDay[] {
  const days: MemoryDay[] = [];
  for (const m of memories) {
    const last = days[days.length - 1];
    if (last && last.date === m.date) last.items.push(m);
    else days.push({ date: m.date, label: dayHeading(m.date), items: [m] });
  }
  return days;
}

/** Group memories into months — the section dividers in the all-photos grid. */
export function groupByMonth(memories: Memory[]): { key: string; label: string; items: Memory[] }[] {
  const months: { key: string; label: string; items: Memory[] }[] = [];
  for (const m of memories) {
    const key = m.date.slice(0, 7); // yyyy-mm
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(m);
    else months.push({ key, label: monthHeading(m.date), items: [m] });
  }
  return months;
}
