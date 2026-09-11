/*
  GYM CROWD REPORTS — shared "how busy is it right now" answers.
  ------------------------------------------------------------------------
  Typed helpers for the SECURITY DEFINER RPCs in db/gym_crowd.sql. A report is a
  real row everyone on campus can read (anonymously: level + time only), which
  is what lets account B see what account A just tapped.

  Falls back to localStorage when Supabase env isn't configured (same approach
  as lib/supabase/workouts.ts), so the app still runs in a no-database
  environment — there the "campus" is just this browser.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

// One person's latest answer for one gym, as the app reads it.
export type CrowdReport = {
  gymSlug: string;
  level: string; // a CrowdLevel key; unknown values are dropped by the reader
  at: number; // epoch ms
  mine: boolean; // the signed-in user's own answer
};

/* ── localStorage fallback (no Supabase env) ── */
const LOCAL_KEY = "gymCrowdReports";
type LocalRow = { userId: string; gymSlug: string; level: string; at: number };

function loadLocal(): LocalRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as LocalRow[]) : [];
  } catch {
    return [];
  }
}
function saveLocal(rows: LocalRow[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

/** Every report filed in the last `freshMs` milliseconds, for all gyms. */
export async function listCrowdReports(userId: string, freshMs: number): Promise<CrowdReport[]> {
  if (!userId) return [];
  if (!hasSupabaseEnv()) {
    const since = Date.now() - freshMs;
    return loadLocal()
      .filter((r) => r.at > since)
      .map((r) => ({ gymSlug: r.gymSlug, level: r.level, at: r.at, mine: r.userId === userId }));
  }
  const { data, error } = await createClient().rpc("gym_crowd_recent", {
    fresh_minutes: Math.max(1, Math.round(freshMs / 60_000)),
  });
  if (error) throw new Error(`listCrowdReports failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    gymSlug: r.gym_slug as string,
    level: r.level as string,
    at: Date.parse(r.created_at as string),
    mine: !!r.mine,
  }));
}

/** File (or replace) the caller's answer for one gym. */
export async function sendCrowdReport(userId: string, gymSlug: string, level: string): Promise<void> {
  if (!hasSupabaseEnv()) {
    const rest = loadLocal().filter((r) => !(r.userId === userId && r.gymSlug === gymSlug));
    rest.push({ userId, gymSlug, level, at: Date.now() });
    saveLocal(rest);
    return;
  }
  const { error } = await createClient().rpc("gym_crowd_report", {
    p_gym_slug: gymSlug,
    p_level: level,
  });
  if (error) throw new Error(`sendCrowdReport failed: ${error.message}`);
}
