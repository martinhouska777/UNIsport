/*
  RACE PIECES — reading and writing (Supabase table `varsity_race_results`,
  db/varsity_race_results.sql; localStorage when Supabase isn't configured).

  One row per SESSION, keyed by the plan's day_key like a lineup, holding the
  pieces as one JSON blob (lib/varsity/racePieces.ts). The squad reads; the
  coach writes — the screen only shows the pencil in the Coach Console, and
  the table's policies say the same thing in SQL.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { RaceDay, RacePiece } from "./racePieces";

const LOCAL = "varsityRaces";

function loadLocal(): RaceDay[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL);
    return raw ? (JSON.parse(raw) as RaceDay[]) : [];
  } catch {
    return [];
  }
}
function saveLocal(days: RaceDay[]) {
  try {
    window.localStorage.setItem(LOCAL, JSON.stringify(days));
  } catch {
    /* full or blocked — nothing to do */
  }
}

/** Every session that has race pieces, newest first. */
export async function fetchRaceDays(): Promise<RaceDay[]> {
  if (!hasSupabaseEnv()) return loadLocal();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_race_results")
    .select("day_key,pieces,updated_at")
    .order("updated_at", { ascending: false });
  if (error || !data) return [];
  return (data as { day_key: string; pieces: RacePiece[] | null; updated_at: string }[]).map((r) => ({
    dayKey: r.day_key,
    pieces: r.pieces ?? [],
    updatedAt: r.updated_at,
  }));
}

/** Write the whole day — its pieces are one blob, so a change to one crew's
    time is the row rewritten. Returns false when the write was refused. */
export async function saveRaceDay(day: RaceDay): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    const rest = loadLocal().filter((d) => d.dayKey !== day.dayKey);
    saveLocal([{ ...day, updatedAt: new Date().toISOString() }, ...rest]);
    return true;
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("varsity_race_results")
    .upsert({ day_key: day.dayKey, pieces: day.pieces, updated_at: new Date().toISOString() }, { onConflict: "day_key" });
  return !error;
}

export async function deleteRaceDay(dayKey: string): Promise<boolean> {
  if (!hasSupabaseEnv()) {
    saveLocal(loadLocal().filter((d) => d.dayKey !== dayKey));
    return true;
  }
  const supabase = createClient();
  const { error } = await supabase.from("varsity_race_results").delete().eq("day_key", dayKey);
  return !error;
}
