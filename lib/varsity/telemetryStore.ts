/*
  TELEMETRY STORE — reading outings (db/varsity_telemetry.sql).
  ---------------------------------------------------------------------------
  Read side only for now: the Workouts list asks for every outing, newest
  first, and gets TelemetryOuting records. Writing (the coach attaching a
  Peach / SpeedCoach export) arrives with the importer, once a real export
  file has been seen — until then nothing writes here.

  Fails soft, like resultsStore: no Supabase env, a missing table, or RLS in
  the way all read as "no outings", and the screen falls back to the example.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { TelemetryOuting, TelemetryPiece, TelemetrySource } from "./telemetry";

type Row = {
  id: string;
  day_key: string;
  source: string;
  crew: string;
  box: string | null;
  session_no: string | null;
  file_path: string | null;
  data: unknown;
};

function rowToOuting(r: Row): TelemetryOuting | null {
  const pieces = Array.isArray(r.data) ? (r.data as TelemetryPiece[]) : null;
  if (!pieces) return null;
  const source: TelemetrySource = r.source === "speedcoach" ? "speedcoach" : "peach";
  return {
    id: r.id,
    dayKey: r.day_key,
    source,
    crew: r.crew,
    box: r.box ?? undefined,
    sessionNo: r.session_no ?? undefined,
    file: r.file_path ?? undefined,
    pieces,
  };
}

export async function fetchOutings(): Promise<TelemetryOuting[]> {
  if (!hasSupabaseEnv()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_telemetry")
    .select("id, day_key, source, crew, box, session_no, file_path, data")
    .order("created_at", { ascending: false });
  if (error || !data) {
    // Table not created yet, or RLS — no outings, not an error screen.
    if (error) console.error("fetchOutings:", error.message);
    return [];
  }
  return (data as Row[]).map(rowToOuting).filter((o): o is TelemetryOuting => o != null);
}
