/*
  WINTER POINTS STORE — where the event, the team's sessions and the names come
  from (db/varsity_winter_points.sql). The rules and the scoring are in
  winterPoints.ts.

  One row per team: `draft` is what the captain is setting up, `config` what
  athletes see, copied from the draft on Publish. With no Supabase env the row
  lives in localStorage, like the training config (configStore.ts).

  The published config is kept in memory once read, so the Profile row, the
  Log screen and the Calendar ask the database once between them.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { withDefaults, type VarsityAthleteProfile } from "./athleteProfile";
import { fetchLogsInRange, type LogEntry } from "./logStore";
import {
  classOfTeamYear,
  normaliseWinterPoints,
  type WinterPoints,
  type WpLog,
  type WpPerson,
} from "./winterPoints";

const LOCAL_KEY = "varsityWinterPoints";

export type WinterRow = { draft: WinterPoints | null; config: WinterPoints | null; failed: boolean };

function loadLocal(): WinterRow {
  if (typeof window === "undefined") return { draft: null, config: null, failed: false };
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "null") as {
      draft?: unknown;
      config?: unknown;
    } | null;
    return { draft: normaliseWinterPoints(raw?.draft), config: normaliseWinterPoints(raw?.config), failed: false };
  } catch {
    return { draft: null, config: null, failed: false };
  }
}

/* ── the event ── */
export async function fetchWinterRow(teamId: string | null): Promise<WinterRow> {
  if (!teamId || !hasSupabaseEnv()) return loadLocal();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_winter_points")
    .select("draft, config")
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) {
    // Not applied yet, or no signal: no event rather than a crash.
    console.error("fetchWinterRow:", error.message);
    return { draft: null, config: null, failed: true };
  }
  const row = data as { draft: unknown; config: unknown } | null;
  return { draft: normaliseWinterPoints(row?.draft), config: normaliseWinterPoints(row?.config), failed: false };
}

const configCache = new Map<string, Promise<WinterPoints | null>>();

/** What athletes see, read once per team (and again after a Publish on this phone). */
export function fetchWinterConfig(teamId: string | null): Promise<WinterPoints | null> {
  const key = teamId ?? "local";
  let p = configCache.get(key);
  if (!p) {
    p = fetchWinterRow(teamId).then((r) => r.config);
    configCache.set(key, p);
    p.then((c) => {
      if (c === null) configCache.delete(key); // nothing yet: ask again next time
    });
  }
  return p;
}

export async function saveWinterPoints(
  teamId: string | null,
  draft: WinterPoints,
  publish: boolean,
): Promise<{ error?: string }> {
  configCache.delete(teamId ?? "local");
  if (!teamId || !hasSupabaseEnv()) {
    if (typeof window !== "undefined") {
      const prev = loadLocal();
      window.localStorage.setItem(
        LOCAL_KEY,
        JSON.stringify({ draft, config: publish ? draft : prev.config }),
      );
    }
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase.rpc("varsity_save_winter_points", {
    p_team: teamId,
    p_draft: draft,
    p_publish: publish,
  });
  if (error) {
    console.error("saveWinterPoints:", error.message);
    return { error: error.message };
  }
  return {};
}

/* ── a logged session, as the rules read it ── */
export const logToWp = (l: LogEntry): WpLog => ({
  id: l.id,
  date: l.logDate,
  category: l.category,
  minutes: l.minutes,
  metres: l.metres,
  activity: l.wpActivity ?? null,
  heartRate: l.heartRate ?? null,
});

type RpcLog = {
  id: string;
  log_date: string;
  category: string | null;
  minutes: number | null;
  metres: number | null;
  wp_activity: string | null;
  heart_rate: boolean | null;
};

/** Every teammate's sessions between two dates, by user id, oldest first. */
export async function fetchWinterLogs(
  teamId: string | null,
  userId: string | null,
  from: string,
  to: string,
): Promise<Record<string, WpLog[]>> {
  if (!teamId || !hasSupabaseEnv()) {
    if (!userId) return {};
    return { [userId]: (await fetchLogsInRange(userId, from, to)).map(logToWp) };
  }
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_winter_points_logs", {
    p_team: teamId,
    p_from: from,
    p_to: to,
  });
  if (error || !Array.isArray(data)) {
    if (error) console.error("fetchWinterLogs:", error.message);
    return {};
  }
  const out: Record<string, WpLog[]> = {};
  for (const r of data as { athlete_id: string; logs: RpcLog[] }[]) {
    out[r.athlete_id] = (r.logs ?? []).map((l) => ({
      id: l.id,
      date: l.log_date,
      category: l.category,
      minutes: l.minutes,
      metres: l.metres,
      activity: l.wp_activity,
      heartRate: l.heart_rate,
    }));
  }
  return out;
}

/* ── the people: names and classes, by user id ── */
type CardRow = {
  user_id: string;
  name: string | null;
  class_year: string | null;
  card: Partial<VarsityAthleteProfile> | null;
};

export async function fetchWinterPeople(teamId: string | null): Promise<Record<string, WpPerson>> {
  if (!teamId || !hasSupabaseEnv()) return {};
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_team_cards", { p_team: teamId });
  if (error || !Array.isArray(data)) {
    if (error) console.error("fetchWinterPeople:", error.message);
    return {};
  }
  const out: Record<string, WpPerson> = {};
  for (const r of data as CardRow[]) {
    const classYear = (r.class_year ?? "").trim();
    const profile = withDefaults(r.card ?? undefined, classYear);
    out[r.user_id] = {
      id: r.user_id,
      name: (r.name ?? "").trim() || "Teammate",
      cls: classOfTeamYear(profile.teamYear),
    };
  }
  return out;
}
