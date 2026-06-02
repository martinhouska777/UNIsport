/*
  VARSITY ATHLETE PROFILE — editable record (source of truth for the Profile tab)
  ------------------------------------------------------------------------------
  The athlete's own rowing record: which year they are on the team, their
  height/weight, current status, and erg personal bests. This is private,
  editable data — it persists in the SAME `profiles.data` JSON the normal app
  profile uses, under a `varsity` sub-key, so the two never clash and one DB row
  still holds the whole person. Falls back to localStorage with no Supabase env.

  Everything offered as a choice (team-year pills, status options, which PR
  pieces exist) lives HERE as data — never hardcoded in the screen (rule 1 / 7).

  The athlete's NAME is NOT stored here: it is the same value the normal profile
  shows (profiles.data.name), read via fetchProfileFullName.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { classYears, freshmanClassYear } from "@/lib/onboarding";

/* ── Editable option lists ── */

// Class standing on the team (the "freshman / sophomore …" the owner asked for).
export const teamYearOptions = ["Freshman", "Sophomore", "Junior", "Senior", "Grad"] as const;

// Current status — `tone` maps to a theme token, never a raw color (rule 1).
export type StatusTone = "success" | "warn" | "danger" | "muted";
export const statusOptions: { title: string; sub: string; tone: StatusTone }[] = [
  { title: "Active", sub: "Available for training and selection", tone: "success" },
  { title: "Light training", sub: "Training modified — managing a niggle", tone: "warn" },
  { title: "Injured", sub: "Out of selection — rehab in progress", tone: "danger" },
  { title: "Away", sub: "Travelling / off the water this week", tone: "muted" },
];

// The erg pieces tracked as personal bests (the owner asked for 2K, 5K, 6K, 30r20).
// Editing this list changes which PRs the screen shows — no component change.
export const prPieces = ["2K", "5K", "6K", "30′ r20"] as const;

// Per-category dot color for the training calendar. These are CONTENT colors
// (like a house's identity colors) so per rule 1's exception they live as data
// and are applied via inline style — where a theme token fits we use it.
export const logCategoryColor: Record<string, string> = {
  water: "#4a90a4", // teal — on the water
  erg: "#60a5fa", // blue — erg
  weights: "#a78bfa", // purple — lifting
  run: "#34d399", // green — running
  bike: "#f59e0b", // amber — bike
  flex: "var(--accent)", // gold — mobility
  off: "var(--muted)",
  other: "var(--muted)",
};
// Human labels for the calendar legend (same keys as logCategoryColor).
export const logCategoryLabel: Record<string, string> = {
  water: "Water",
  erg: "Erg",
  weights: "Weights",
  run: "Run",
  bike: "Bike",
  flex: "Flex",
  off: "Off",
  other: "Other",
};
// Categories shown in the calendar legend, in order.
export const legendCategories = ["water", "erg", "weights", "run", "flex"] as const;

// Which logged categories count as "metres rowed" for the monthly total.
export const rowingCategories = new Set(["water", "erg"]);

/* ── The stored record ── */
export type VarsityAthleteProfile = {
  teamYear: string; // one of teamYearOptions
  heightCm: number | null;
  weightKg: number | null;
  status: string; // a statusOptions title
  prs: Record<string, string>; // piece label -> value (e.g. "2K" -> "6:08.4")
};

// Best guess at class standing from the academic class year (e.g. '30 = Freshman
// when '30 is the freshman class). Still fully editable afterwards.
export function defaultTeamYear(classYear: string): string {
  const fresh = classYears.indexOf(freshmanClassYear);
  const mine = classYears.indexOf(classYear);
  if (fresh < 0 || mine < 0) return "";
  const step = fresh - mine; // 0 = freshman, 1 = sophomore, …
  return teamYearOptions[step] ?? "";
}

export function defaultProfile(classYear: string): VarsityAthleteProfile {
  return {
    teamYear: defaultTeamYear(classYear),
    heightCm: null,
    weightKg: null,
    status: statusOptions[0].title,
    prs: {},
  };
}

// Fold a saved (partial) record onto the defaults so the screen always has a
// complete object to render.
function withDefaults(
  saved: Partial<VarsityAthleteProfile> | undefined,
  classYear: string,
): VarsityAthleteProfile {
  const base = defaultProfile(classYear);
  return {
    teamYear: saved?.teamYear || base.teamYear,
    heightCm: saved?.heightCm ?? base.heightCm,
    weightKg: saved?.weightKg ?? base.weightKg,
    status: saved?.status || base.status,
    prs: { ...base.prs, ...(saved?.prs ?? {}) },
  };
}

/* ── localStorage fallback (no Supabase env) ── */
const keyFor = (userId: string) => `varsityAthleteProfile:${userId}`;
function loadLocal(userId: string): Partial<VarsityAthleteProfile> | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    return raw ? (JSON.parse(raw) as Partial<VarsityAthleteProfile>) : undefined;
  } catch {
    return undefined;
  }
}
function saveLocal(userId: string, p: VarsityAthleteProfile) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyFor(userId), JSON.stringify(p));
  }
}

// Everything the Profile screen needs in one read: the shared name + academic
// class year (from onboarding), plus the merged, ready-to-render varsity record.
export type AthleteProfileBundle = {
  name: string;
  classYear: string;
  profile: VarsityAthleteProfile;
};

/* ── Read the athlete's varsity profile bundle (always returns complete data) ── */
export async function fetchAthleteProfile(userId: string | null): Promise<AthleteProfileBundle> {
  if (!userId || !hasSupabaseEnv()) {
    // Dev / no-Supabase: name + class year aren't stored locally, only the
    // varsity record is. Default the rest.
    return { name: "", classYear: "", profile: withDefaults(loadLocal(userId ?? ""), "") };
  }
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("data").eq("id", userId).maybeSingle();
  const d = (data?.data as
    | { name?: string; classYear?: string; varsity?: Partial<VarsityAthleteProfile> }
    | undefined) ?? {};
  const classYear = d.classYear ?? "";
  return {
    name: (d.name ?? "").trim(),
    classYear,
    profile: withDefaults(d.varsity, classYear),
  };
}

/* ── Save it back, merged under data.varsity so other profile fields survive ── */
export async function saveAthleteProfile(
  userId: string | null,
  next: VarsityAthleteProfile,
): Promise<{ error?: string }> {
  if (!userId) return {};
  if (!hasSupabaseEnv()) {
    saveLocal(userId, next);
    return {};
  }
  const supabase = createClient();
  const { data: row } = await supabase.from("profiles").select("data").eq("id", userId).maybeSingle();
  const current = (row?.data as Record<string, unknown>) ?? {};
  const merged = { ...current, varsity: next };
  const { error } = await supabase
    .from("profiles")
    .update({ data: merged, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return error ? { error: error.message } : {};
}
