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

/*
  HOW FAR BACK A SESSION CAN STILL BE LOGGED: today and the six days before it.
  The Log tab's day strip is built from this, and so is the Log button on a
  Home session card — a card older than this says "missed" and offers nothing,
  because the Log tab could not open that day anyway.
*/
export const LOG_DAYS_BACK = 7;

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
  effort: number | null; // how hard it felt, 1–5 (effortOptions); null = not answered
  note: string;
};

// What you pass in to create/update a log (id + created server-side).
export type LogDraft = Omit<LogEntry, "id">;

/*
  HOW HARD IT FELT — five taps, no typing. The plan says what was prescribed
  and the figures say what was done; this is what it cost, which is the one
  thing the athlete knows and the coach doesn't. Five steps because a rower
  with wet hands will not place a finger on a ten-point scale, and because
  "hard" and "very hard" are the words a boathouse already uses.

  Data, not component code (rule 7): the editor draws whatever is here, and
  the words are not tied to any sport.
*/
export const effortOptions: { value: number; label: string; hint: string }[] = [
  { value: 1, label: "Easy", hint: "Could have talked the whole way" },
  { value: 2, label: "Steady", hint: "Working, comfortable" },
  { value: 3, label: "Hard", hint: "Focused, breathing hard" },
  { value: 4, label: "Very hard", hint: "Close to the limit" },
  { value: 5, label: "Flat out", hint: "Nothing left" },
];

/** "Hard" for 3; null when unanswered or out of range. */
export const effortLabel = (effort: number | null | undefined): string | null =>
  effortOptions.find((o) => o.value === effort)?.label ?? null;

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
  effort?: number | null; // absent on a table that predates the column
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
  effort: r.effort ?? null,
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
  effort: d.effort ?? null,
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

/* ── Read all logs of one category, newest first (powers "Compare") ── */
export async function fetchLogsByCategory(
  athleteId: string,
  category: string,
): Promise<LogEntry[]> {
  if (!athleteId) return [];
  if (!hasSupabaseEnv()) {
    return loadLocal(athleteId)
      .filter((l) => l.category === category)
      .sort((a, b) => b.logDate.localeCompare(a.logDate));
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_logs")
    .select("*")
    .eq("athlete_id", athleteId)
    .eq("category", category)
    .order("log_date", { ascending: false });
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
