/*
  COACH NOTES STORE — the coach's per-athlete note.
  ------------------------------------------------------------------------
  Each athlete can have one short note from the coach. The coach's Notes
  screen reads the team roster (real onboarded accounts) + every note; the
  athlete's Home reads just their own. A blank note means "all clear" and is
  stored as no row (we delete it), so the Home shows a green "Good job".

  A NOTE IS SIGNED (owner, 2026-09-20: "name it, which coach said it"). The
  row carries who wrote it — id and the name as it read at the time — so the
  athlete's card can say whose words these are. On a squad with a head coach
  and two assistants, "work the catch" from one of them is a different
  instruction than from another, and until now the card said only "the coach".
  The NAME is stored, not looked up: profiles are behind RLS, so an athlete
  cannot read their coach's row, and a note should keep saying who said it
  even if that person later leaves the squad.

  Backed by Supabase (db/varsity_coach_notes.sql + _author.sql). Falls back to
  localStorage when Supabase env isn't configured, so the screen still works in
  plain dev.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export type TeamMember = { id: string; name: string };

/** One athlete's note and who signed it ("" for either = not there). */
export type CoachNote = { note: string; coach: string };

/* ── localStorage fallback (no Supabase env) ── */
const keyFor = (athleteId: string) => `varsityCoachNote:${athleteId}`;
/* The signature, beside the note rather than inside it, so a note written
   before this existed still reads back fine (it just has no name). */
const byKeyFor = (athleteId: string) => `varsityCoachNoteBy:${athleteId}`;

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

/* ── One athlete's note, with the coach who signed it (their Home card) ── */
export const NO_NOTE: CoachNote = { note: "", coach: "" };

export async function fetchNote(athleteId: string | null): Promise<CoachNote> {
  if (!athleteId) return NO_NOTE;
  if (!hasSupabaseEnv()) {
    if (typeof window === "undefined") return NO_NOTE;
    const note = window.localStorage.getItem(keyFor(athleteId)) ?? "";
    if (!note.trim()) return NO_NOTE;
    return { note, coach: window.localStorage.getItem(byKeyFor(athleteId)) ?? "" };
  }
  const supabase = createClient();
  const { data } = await supabase
    .from("varsity_coach_notes")
    .select("note,coach_name")
    .eq("athlete_id", athleteId)
    .maybeSingle();
  const row = data as { note?: string; coach_name?: string | null } | null;
  if (!row?.note?.trim()) return NO_NOTE;
  return { note: row.note, coach: (row.coach_name ?? "").trim() };
}

/* ── Save (or clear) an athlete's note, signed by the coach writing it ── */
export async function saveNote(
  athleteId: string,
  note: string,
  coach: { id: string | null; name: string } = { id: null, name: "" },
): Promise<{ error?: string }> {
  const trimmed = note.trim();
  const coachName = coach.name.trim();
  if (!hasSupabaseEnv()) {
    if (typeof window !== "undefined") {
      if (trimmed) {
        window.localStorage.setItem(keyFor(athleteId), trimmed);
        if (coachName) window.localStorage.setItem(byKeyFor(athleteId), coachName);
        else window.localStorage.removeItem(byKeyFor(athleteId));
      } else {
        window.localStorage.removeItem(keyFor(athleteId));
        window.localStorage.removeItem(byKeyFor(athleteId));
      }
    }
    return {};
  }
  const supabase = createClient();
  // Empty note = "all clear": remove the row so the athlete sees the green state.
  if (!trimmed) {
    const { error } = await supabase.from("varsity_coach_notes").delete().eq("athlete_id", athleteId);
    return error ? { error: error.message } : {};
  }
  const { error } = await supabase.from("varsity_coach_notes").upsert({
    athlete_id: athleteId,
    note: trimmed,
    coach_id: coach.id,
    coach_name: coachName,
    updated_at: new Date().toISOString(),
  });
  return error ? { error: error.message } : {};
}
