/*
  WORKOUT LOGS — the signed-in user's own logged sessions.
  ------------------------------------------------------------------------
  Private per-user data (db/workout_logs.sql, RLS = own rows only). Powers the
  Profile tab's session calendar and the "Log Session" flow. Falls back to
  localStorage when Supabase env isn't configured (same approach as the Varsity
  log store, so the app still works in a no-database environment).
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

// One exercise line. Kept as strings so the form is forgiving (e.g. weight can
// be "100 kg" or "bodyweight"); empty fields are allowed.
export type WorkoutExercise = {
  name: string;
  sets: string;
  reps: string;
  weight: string;
};

export type WorkoutLog = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  activity: string; // 'gym' | 'running' | 'cardio' | 'other'
  gym: string;
  partner: string;
  exercises: WorkoutExercise[];
  note: string;
};

// What you pass in to create/update (id is assigned server-side).
export type WorkoutDraft = Omit<WorkoutLog, "id">;

type Row = {
  id: string;
  log_date: string;
  activity: string;
  gym: string | null;
  partner: string | null;
  exercises: WorkoutExercise[] | null;
  note: string | null;
};

const rowToLog = (r: Row): WorkoutLog => ({
  id: r.id,
  date: r.log_date,
  activity: r.activity ?? "gym",
  gym: r.gym ?? "",
  partner: r.partner ?? "",
  exercises: Array.isArray(r.exercises) ? r.exercises : [],
  note: r.note ?? "",
});

const draftToRow = (userId: string, d: WorkoutDraft) => ({
  user_id: userId,
  log_date: d.date,
  activity: d.activity,
  gym: d.gym.trim() || null,
  partner: d.partner.trim() || null,
  // Drop fully-empty exercise rows so blank lines don't get stored.
  exercises: d.exercises.filter(
    (e) => e.name.trim() || e.sets.trim() || e.reps.trim() || e.weight.trim(),
  ),
  note: d.note.trim(),
});

/* ── localStorage fallback (no Supabase env) ── */
const keyFor = (userId: string) => `workoutLogs:${userId}`;
function loadLocal(userId: string): WorkoutLog[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(keyFor(userId)) ?? "[]") as WorkoutLog[];
  } catch {
    return [];
  }
}
function saveLocal(userId: string, all: WorkoutLog[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(all));
  }
}

/* ── Read one calendar month (inclusive ISO bounds) ── */
export async function listMonth(
  userId: string,
  fromIso: string,
  toIso: string,
): Promise<WorkoutLog[]> {
  if (!userId) return [];
  if (!hasSupabaseEnv()) {
    return loadLocal(userId).filter((l) => l.date >= fromIso && l.date <= toIso);
  }
  const { data, error } = await createClient()
    .from("workout_logs")
    .select("id, log_date, activity, gym, partner, exercises, note")
    .eq("user_id", userId)
    .gte("log_date", fromIso)
    .lte("log_date", toIso)
    .order("log_date", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(rowToLog);
}

/* ── Total number of logged sessions (for the profile "Sessions" stat) ── */
export async function countWorkouts(userId: string): Promise<number> {
  if (!userId) return 0;
  if (!hasSupabaseEnv()) return loadLocal(userId).length;
  const { count, error } = await createClient()
    .from("workout_logs")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return error ? 0 : (count ?? 0);
}

/* ── Create a new log ── */
export async function saveWorkout(
  userId: string,
  draft: WorkoutDraft,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    const all = loadLocal(userId);
    all.push({ ...draft, id: `local-${Date.now()}` });
    saveLocal(userId, all);
    return {};
  }
  const { error } = await createClient().from("workout_logs").insert(draftToRow(userId, draft));
  return error ? { error: error.message } : {};
}

/* ── Update an existing log by id ── */
export async function updateWorkout(
  userId: string,
  id: string,
  draft: WorkoutDraft,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    const all = loadLocal(userId);
    const idx = all.findIndex((l) => l.id === id);
    if (idx >= 0) all[idx] = { ...draft, id };
    saveLocal(userId, all);
    return {};
  }
  const { error } = await createClient()
    .from("workout_logs")
    .update(draftToRow(userId, draft))
    .eq("id", id);
  return error ? { error: error.message } : {};
}

/* ── Delete a log ── */
export async function deleteWorkout(userId: string, id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    saveLocal(userId, loadLocal(userId).filter((l) => l.id !== id));
    return {};
  }
  const { error } = await createClient().from("workout_logs").delete().eq("id", id);
  return error ? { error: error.message } : {};
}

// ---- Shared helpers --------------------------------------------------------

/** Human label for an activity key. */
export function activityLabel(activity: string): string {
  const map: Record<string, string> = {
    gym: "Gym",
    running: "Running",
    cardio: "Cardio",
    other: "Other",
  };
  return map[activity] ?? (activity ? activity[0].toUpperCase() + activity.slice(1) : "Session");
}

/** Compact one-line summary of an exercise, e.g. "Bench · 5×5 · 100 kg". */
export function exerciseSummary(e: WorkoutExercise): string {
  const setsReps = [e.sets.trim(), e.reps.trim()].filter(Boolean).join("×");
  return [e.name.trim(), setsReps, e.weight.trim()].filter(Boolean).join(" · ");
}
