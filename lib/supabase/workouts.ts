/*
  WORKOUT LOGS — the signed-in user's own logged sessions.
  ------------------------------------------------------------------------
  Private per-user data (db/workout_logs.sql, RLS = own rows only). Powers the
  Profile tab's session calendar and the "Log Session" flow. Falls back to
  localStorage when Supabase env isn't configured (same approach as the Varsity
  log store, so the app still works in a no-database environment).
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

// Hevy-style gym logging: an exercise has a primary muscle group and a list of
// SETS, each with its own weight + reps, an optional type (Warmup/Normal/Drop/
// Failure) and a done flag. Values are strings so the form stays forgiving.
export type SetType = "W" | "N" | "D" | "F";
export type WorkoutSet = {
  weight: string;
  reps: string;
  type?: SetType; // undefined = normal
  done?: boolean;
};
export type WorkoutExercise = {
  name: string;
  muscle?: string; // muscle group (from the catalog); optional for custom/legacy
  sets: WorkoutSet[];
};

export type DistanceUnit = "km" | "mi" | "m";
export type WeightUnit = "kg" | "lb";

// Activity-specific metrics (running & cardio) plus the gym weight unit. All
// optional; kept as strings so the form is forgiving (distance "5.2", duration
// "45 min" or "1:05:00").
export type WorkoutMetrics = {
  cardioType?: string; // cardio only — Cycling / Rowing / Swimming / …
  distance?: string;
  unit?: DistanceUnit;
  duration?: string;
  weightUnit?: WeightUnit; // gym / other — kg or lb
};

export type WorkoutLog = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  activity: string; // 'gym' | 'running' | 'cardio' | 'other'
  gym: string;
  partner: string;
  exercises: WorkoutExercise[]; // gym / other
  metrics: WorkoutMetrics; // running / cardio
  photos: string[]; // session photos (downscaled data URLs) — "memories"
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
  exercises: unknown; // new per-set shape, or the old flat shape — normalized on read
  metrics: WorkoutMetrics | null;
  photos: string[] | null;
  note: string | null;
};

const cap20 = (n: number) => Math.min(Math.max(n, 1), 20);

const normSet = (s: Record<string, unknown>): WorkoutSet => ({
  weight: String(s.weight ?? ""),
  reps: String(s.reps ?? ""),
  ...(s.type ? { type: s.type as SetType } : {}),
  ...(s.done ? { done: true } : {}),
});

/*
  Read either shape. New logs store { name, muscle, sets: [{weight,reps,…}] }.
  Old logs stored the flat { name, sets:"3", reps:"5", weight:"100" } — those are
  expanded into N identical set rows so they still display in the new UI.
*/
function normalizeExercises(raw: unknown): WorkoutExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    const ex = (e ?? {}) as Record<string, unknown>;
    if (Array.isArray(ex.sets)) {
      return {
        name: String(ex.name ?? ""),
        ...(ex.muscle ? { muscle: String(ex.muscle) } : {}),
        sets: (ex.sets as Record<string, unknown>[]).map(normSet),
      };
    }
    // Legacy flat row → expand to `sets` identical entries.
    const count = cap20(parseInt(String(ex.sets ?? "1"), 10) || 1);
    const weight = String(ex.weight ?? "");
    const reps = String(ex.reps ?? "");
    return {
      name: String(ex.name ?? ""),
      sets: Array.from({ length: count }, () => ({ weight, reps })),
    };
  });
}

const rowToLog = (r: Row): WorkoutLog => ({
  id: r.id,
  date: r.log_date,
  activity: r.activity ?? "gym",
  gym: r.gym ?? "",
  partner: r.partner ?? "",
  exercises: normalizeExercises(r.exercises),
  metrics: r.metrics && typeof r.metrics === "object" ? r.metrics : {},
  photos: Array.isArray(r.photos) ? r.photos : [],
  note: r.note ?? "",
});

// Keep only the metrics that apply to the activity, dropping empty fields.
const cleanMetrics = (activity: string, m: WorkoutMetrics): WorkoutMetrics => {
  if (activity === "running" || activity === "cardio") {
    const out: WorkoutMetrics = {};
    if (activity === "cardio" && m.cardioType?.trim()) out.cardioType = m.cardioType.trim();
    if (m.distance?.trim()) {
      out.distance = m.distance.trim();
      out.unit = m.unit ?? "km";
    }
    if (m.duration?.trim()) out.duration = m.duration.trim();
    return out;
  }
  // gym / other → remember the weight unit the sets were logged in.
  return m.weightUnit ? { weightUnit: m.weightUnit } : {};
};

const draftToRow = (userId: string, d: WorkoutDraft) => ({
  user_id: userId,
  log_date: d.date,
  activity: d.activity,
  gym: d.gym.trim() || null,
  partner: d.partner.trim() || null,
  // Exercises only apply to gym/other; keep any named exercise, drop empty sets.
  exercises:
    d.activity === "running" || d.activity === "cardio"
      ? []
      : d.exercises
          .map((e) => ({
            ...e,
            sets: e.sets.filter((s) => s.weight.trim() || s.reps.trim() || s.done),
          }))
          .filter((e) => e.name.trim() && e.sets.length > 0),
  metrics: cleanMetrics(d.activity, d.metrics),
  photos: Array.isArray(d.photos) ? d.photos : [],
  note: d.note.trim(),
});

/* ── localStorage fallback (no Supabase env) ── */
const keyFor = (userId: string) => `workoutLogs:${userId}`;
function loadLocal(userId: string): WorkoutLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(keyFor(userId)) ?? "[]") as WorkoutLog[];
    // Migrate any legacy flat exercises so old localStorage logs read in the new shape.
    return raw.map((l) => ({ ...l, exercises: normalizeExercises(l.exercises) }));
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
    .select("id, log_date, activity, gym, partner, exercises, metrics, photos, note")
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

/**
 * Compact one-line summary of an exercise, e.g. "Bench Press · 3 sets · 100 kg × 5".
 * The third part is the heaviest logged set (the one most worth seeing at a glance).
 */
export function exerciseSummary(e: WorkoutExercise, unit: WeightUnit = "kg"): string {
  const count = e.sets.length;
  const setsLabel = count > 0 ? `${count} set${count === 1 ? "" : "s"}` : "";
  // Heaviest set that actually has a weight + reps.
  const top = e.sets
    .filter((s) => s.weight.trim() && s.reps.trim())
    .sort((a, b) => (parseFloat(b.weight) || 0) - (parseFloat(a.weight) || 0))[0];
  const topLabel = top ? `${top.weight} ${unit} × ${top.reps}` : "";
  return [e.name.trim(), setsLabel, topLabel].filter(Boolean).join(" · ");
}

/** Distinct muscle groups trained in a log, in first-seen order (gym/other). */
export function logMuscles(log: WorkoutLog): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of log.exercises) {
    if (e.muscle && !seen.has(e.muscle)) {
      seen.add(e.muscle);
      out.push(e.muscle);
    }
  }
  return out;
}

/**
 * One-line summary of a running/cardio log's metrics, e.g.
 * "5.2 km · 24:30" or "Cycling · 20 km · 45 min". Empty for gym/other.
 */
export function metricsSummary(log: WorkoutLog): string {
  const m = log.metrics ?? {};
  const dist = m.distance ? `${m.distance} ${m.unit ?? "km"}` : "";
  if (log.activity === "running") return [dist, m.duration].filter(Boolean).join(" · ");
  if (log.activity === "cardio") return [m.cardioType, dist, m.duration].filter(Boolean).join(" · ");
  return "";
}
