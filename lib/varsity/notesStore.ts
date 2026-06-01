/*
  COACH NOTES STORE — the coach's per-athlete technical note.
  ------------------------------------------------------------------------
  Each athlete can have one short note from the coach. The coach's Notes
  screen reads the team roster (real onboarded accounts) + every note; the
  athlete's Home reads just their own. A blank note means "all clear" and is
  stored as no row (we delete it), so the Home shows a green "Good job".

  Backed by Supabase (db/varsity_coach_notes.sql). Falls back to localStorage
  when Supabase env isn't configured, so the screen still works in plain dev.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export type TeamMember = { id: string; name: string };

/* ── localStorage fallback (no Supabase env) ── */
const keyFor = (athleteId: string) => `varsityCoachNote:${athleteId}`;

function loadLocalNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const out: Record<string, string> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith("varsityCoachNote:")) {
      const v = window.localStorage.getItem(k);
      if (v) out[k.slice("varsityCoachNote:".length)] = v;
    }
  }
  return out;
}

/* ── The team roster (real onboarded accounts), id + display name ── */
export async function fetchTeamRoster(): Promise<TeamMember[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_team_roster");
  if (error || !data) {
    console.error("fetchTeamRoster:", error?.message);
    return [];
  }
  return (data as TeamMember[]).filter((m) => m.id);
}

/* ── Every note, keyed by athlete id (powers the coach list) ── */
export async function fetchNotes(): Promise<Record<string, string>> {
  if (!hasSupabaseEnv()) return loadLocalNotes();
  const supabase = createClient();
  const { data, error } = await supabase.from("varsity_coach_notes").select("athlete_id,note");
  if (error || !data) return {};
  const out: Record<string, string> = {};
  for (const r of data as { athlete_id: string; note: string }[]) {
    if (r.note?.trim()) out[r.athlete_id] = r.note;
  }
  return out;
}

/* ── One athlete's note (powers their Home card) ── */
export async function fetchNote(athleteId: string | null): Promise<string> {
  if (!athleteId) return "";
  if (!hasSupabaseEnv()) {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(keyFor(athleteId)) ?? "";
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("varsity_coach_notes")
    .select("note")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  return (data?.note as string | undefined)?.trim() ? (data!.note as string) : "";
}

/* ── Save (or clear) an athlete's note ── */
export async function saveNote(athleteId: string, note: string): Promise<{ error?: string }> {
  const trimmed = note.trim();
  if (!hasSupabaseEnv()) {
    if (typeof window !== "undefined") {
      if (trimmed) window.localStorage.setItem(keyFor(athleteId), trimmed);
      else window.localStorage.removeItem(keyFor(athleteId));
    }
    return {};
  }
  const supabase = createClient();
  // Empty note = "all clear": remove the row so the athlete sees the green state.
  if (!trimmed) {
    const { error } = await supabase.from("varsity_coach_notes").delete().eq("athlete_id", athleteId);
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase
    .from("varsity_coach_notes")
    .upsert({ athlete_id: athleteId, note: trimmed, updated_at: new Date().toISOString() });
  return error ? { error: error.message } : {};
}
