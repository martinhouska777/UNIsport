/*
  LOG STORE — the athlete's own workout logs.
  ------------------------------------------------------------------------
  Private per-athlete data (db/varsity_logs.sql, RLS = own rows only). Two
  sources: a 'plan' log ties to a prescribed slot via day_key (one per slot,
  upsert); an 'extra' log is free training the athlete added (day_key null).
  Falls back to localStorage when Supabase env isn't configured.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export type LogSource = "plan" | "extra";

export type LogEntry = {
  id: string;
  logDate: string; // ISO yyyy-mm-dd
  period: string | null; // 'AM' | 'PM' | null
  dayKey: string | null; // plan slot key, or null for extra
  source: LogSource;
  title: string;
  category: string | null;
  minutes: number | null; // total time done
  metres: number | null; // total distance done
  split: string | null; // e.g. "1:52" (mainly erg)
  note: string;
};

// What you pass in to create/update a log (id + created server-side).
export type LogDraft = Omit<LogEntry, "id">;

type Row = {
  id: string;
  log_date: string;
  period: string | null;
  day_key: string | null;
  source: LogSource;
  title: string;
  category: string | null;
  minutes: number | null;
  metres: number | null;
  split: string | null;
  note: string;
};

const rowToEntry = (r: Row): LogEntry => ({
  id: r.id,
  logDate: r.log_date,
  period: r.period,
  dayKey: r.day_key,
  source: r.source,
  title: r.title,
  category: r.category,
  minutes: r.minutes,
  metres: r.metres,
  split: r.split,
  note: r.note ?? "",
});

const draftToRow = (athleteId: string, d: LogDraft) => ({
  athlete_id: athleteId,
  log_date: d.logDate,
  period: d.period,
  day_key: d.dayKey,
  source: d.source,
  title: d.title,
  category: d.category,
  minutes: d.minutes,
  metres: d.metres,
  split: d.split,
  note: d.note,
});

/* ── localStorage fallback (no Supabase env) ── */
const keyFor = (athleteId: string) => `varsityLogs:${athleteId}`;
function loadLocal(athleteId: string): LogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(keyFor(athleteId)) ?? "[]") as LogEntry[];
  } catch {
    return [];
  }
}
function saveLocal(athleteId: string, all: LogEntry[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(keyFor(athleteId), JSON.stringify(all));
  }
}

/* ── Read one day's logs ── */
export async function fetchLogsForDate(athleteId: string, dateIso: string): Promise<LogEntry[]> {
  if (!athleteId) return [];
  if (!hasSupabaseEnv()) return loadLocal(athleteId).filter((l) => l.logDate === dateIso);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_logs")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("log_date", dateIso)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(rowToEntry);
}

/* ── Read a date range of logs (powers the day-picker's "needs logging" dots) ── */
export async function fetchLogsInRange(
  athleteId: string,
  fromIso: string,
  toIso: string,
): Promise<LogEntry[]> {
  if (!athleteId) return [];
  if (!hasSupabaseEnv()) {
    return loadLocal(athleteId).filter((l) => l.logDate >= fromIso && l.logDate <= toIso);
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_logs")
    .select("*")
    .eq("athlete_id", athleteId)
    .gte("log_date", fromIso)
    .lte("log_date", toIso)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as Row[]).map(rowToEntry);
}

/* ── Save a PLAN log (one per slot → update if it exists, else insert) ── */
export async function savePlanLog(athleteId: string, draft: LogDraft): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    const all = loadLocal(athleteId);
    const idx = all.findIndex((l) => l.dayKey && l.dayKey === draft.dayKey);
    if (idx >= 0) all[idx] = { ...all[idx], ...draft };
    else all.push({ ...draft, id: `local-${Date.now()}` });
    saveLocal(athleteId, all);
    return {};
  }
  const supabase = createClient();
  const { data: existing } = await supabase
    .from("varsity_logs")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("day_key", draft.dayKey)
    .maybeSingle();
  const row = draftToRow(athleteId, draft);
  const { error } = existing
    ? await supabase.from("varsity_logs").update(row).eq("id", (existing as { id: string }).id)
    : await supabase.from("varsity_logs").insert(row);
  return error ? { error: error.message } : {};
}

/* ── Save an EXTRA log (always a new row) ── */
export async function saveExtraLog(athleteId: string, draft: LogDraft): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    const all = loadLocal(athleteId);
    all.push({ ...draft, id: `local-${Date.now()}` });
    saveLocal(athleteId, all);
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase.from("varsity_logs").insert(draftToRow(athleteId, draft));
  return error ? { error: error.message } : {};
}

/* ── Update an existing log by id (used to edit an extra session) ── */
export async function updateLog(
  athleteId: string,
  id: string,
  draft: LogDraft,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    const all = loadLocal(athleteId);
    const idx = all.findIndex((l) => l.id === id);
    if (idx >= 0) all[idx] = { ...draft, id };
    saveLocal(athleteId, all);
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase.from("varsity_logs").update(draftToRow(athleteId, draft)).eq("id", id);
  return error ? { error: error.message } : {};
}

/* ── Delete a log ── */
export async function deleteLog(athleteId: string, id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    saveLocal(athleteId, loadLocal(athleteId).filter((l) => l.id !== id));
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase.from("varsity_logs").delete().eq("id", id);
  return error ? { error: error.message } : {};
}
