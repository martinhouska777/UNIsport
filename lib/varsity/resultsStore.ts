/*
  RESULTS STORE — the shared team-workout board.
  ---------------------------------------------------------------------------
  Backed by db/varsity_results.sql. The athlete's own log (logStore.ts) stays
  private; when the coach has flagged a session as a TEAM WORKOUT, logging it
  ALSO writes a row here, which the whole squad can read.

  Two things are copied onto the row at log time rather than looked up later:
  the athlete's NAME (the board can't read other people's profiles — they are
  owner-read-only) and their WEIGHT (watts-per-kilo should use the weight they
  pulled the piece at, not today's). Both refresh whenever they re-log.

  Falls back to localStorage with no Supabase env, exactly like every other
  store here — one shared key, so at least your own result shows up in dev.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { clockToSec } from "./ergMath";
import { deleteErgPhoto } from "./ergPhotos";
import type { ErgScanInterval } from "./ergScan";

/*
  One row off an interval screen. Times are kept in SECONDS rather than as the
  "m:ss.t" text the monitor showed, because the board does arithmetic on them —
  the fade from first rep to last, the spread across the piece. The label stays
  as text: it is whatever named the row on screen.
*/
export type ResultInterval = {
  label: string | null;
  metres: number | null;
  timeSec: number | null;
  splitSec: number | null;
  strokeRate: number | null;
};

/*
  Scan rows → stored rows. A row the monitor showed but we could not read a
  single number from is DROPPED: a blank line in an interval table is worse
  than a shorter table, because it reads as a rep somebody failed to finish.
*/
export function intervalsFromScan(rows: ErgScanInterval[] | undefined): ResultInterval[] | null {
  if (!rows || rows.length === 0) return null;
  const out = rows
    .map((r) => ({
      label: r.label?.trim() || null,
      metres: r.metres ?? null,
      timeSec: clockToSec(r.time),
      splitSec: clockToSec(r.splitPer500),
      strokeRate: r.strokeRate ?? null,
    }))
    .filter((r) => r.metres != null || r.timeSec != null || r.splitSec != null);
  return out.length ? out : null;
}

export type TeamResult = {
  id: string;
  dayKey: string;
  athleteId: string;
  athleteName: string;
  minutes: number | null; // total time, decimal minutes
  metres: number | null;
  split: string | null; // as shown, e.g. "1:52.3"
  splitSec: number | null; // the same split in seconds — what ranking sorts on
  strokeRate: number | null;
  watts: number | null;
  weightKg: number | null;
  // Which machine it was rowed on. 'RP3' results sit in their own block rather
  // than being ranked against ergs — the two read different splits.
  monitor: string | null;
  photoPath: string | null; // the monitor shot in storage (lib/varsity/ergPhotos.ts)
  intervals: ResultInterval[] | null; // per-rep rows, when the screen had them
  note: string;
};

// What a caller hands in; the id and the timestamps are the database's job.
export type ResultDraft = Omit<TeamResult, "id" | "athleteId">;

type Row = {
  id: string;
  day_key: string;
  athlete_id: string;
  athlete_name: string | null;
  minutes: number | null;
  metres: number | null;
  split: string | null;
  split_sec: number | null;
  stroke_rate: number | null;
  watts: number | null;
  weight_kg: number | null;
  monitor: string | null;
  photo_path: string | null;
  intervals: ResultInterval[] | null;
  note: string | null;
};

const rowToResult = (r: Row): TeamResult => ({
  id: r.id,
  dayKey: r.day_key,
  athleteId: r.athlete_id,
  athleteName: (r.athlete_name ?? "").trim(),
  minutes: r.minutes,
  metres: r.metres,
  split: r.split,
  splitSec: r.split_sec,
  strokeRate: r.stroke_rate,
  watts: r.watts,
  weightKg: r.weight_kg,
  monitor: r.monitor,
  photoPath: r.photo_path,
  intervals: r.intervals ?? null,
  note: r.note ?? "",
});

const draftToRow = (athleteId: string, d: ResultDraft) => ({
  day_key: d.dayKey,
  athlete_id: athleteId,
  athlete_name: d.athleteName,
  minutes: d.minutes,
  metres: d.metres,
  split: d.split,
  split_sec: d.splitSec,
  stroke_rate: d.strokeRate,
  watts: d.watts,
  weight_kg: d.weightKg,
  monitor: d.monitor,
  photo_path: d.photoPath,
  intervals: d.intervals,
  note: d.note,
  updated_at: new Date().toISOString(),
});

/* ── localStorage fallback (no Supabase env) ── */
const LOCAL_KEY = "varsityResults";
function loadLocal(): TeamResult[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]") as TeamResult[];
  } catch {
    return [];
  }
}
function saveLocal(all: TeamResult[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  }
}

/* ── Every result for a set of workouts (one round trip for the whole board) ── */
export async function fetchResults(dayKeys: string[]): Promise<TeamResult[]> {
  if (dayKeys.length === 0) return [];
  if (!hasSupabaseEnv()) {
    const keys = new Set(dayKeys);
    return loadLocal().filter((r) => keys.has(r.dayKey));
  }
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_results")
    .select("*")
    .in("day_key", dayKeys);
  if (error || !data) {
    // Table missing or RLS blocked — fail soft to an empty board.
    console.error("fetchResults:", error?.message);
    return [];
  }
  return (data as Row[]).map(rowToResult);
}

/* ── Share (or re-share) your result for one team workout ──
     Upserts on (day_key, athlete_id): logging the same piece twice corrects
     your row rather than putting you on the board twice. ── */
export async function shareResult(
  athleteId: string,
  draft: ResultDraft,
): Promise<{ error?: string }> {
  if (!athleteId) return { error: "not signed in" };
  if (!hasSupabaseEnv()) {
    const all = loadLocal();
    const idx = all.findIndex((r) => r.dayKey === draft.dayKey && r.athleteId === athleteId);
    const entry: TeamResult = { ...draft, id: `local-${draft.dayKey}-${athleteId}`, athleteId };
    if (idx >= 0) all[idx] = entry;
    else all.push(entry);
    saveLocal(all);
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("varsity_results")
    .upsert(draftToRow(athleteId, draft), { onConflict: "day_key,athlete_id" });
  return error ? { error: error.message } : {};
}

/* ── Take your result back off a board (when you delete the log behind it).
     The monitor photo goes with it — an image left in the bucket after its
     result is gone is a leak nobody would ever notice. ── */
export async function unshareResult(
  athleteId: string,
  dayKey: string,
): Promise<{ error?: string }> {
  if (!athleteId) return {};
  await deleteErgPhoto(`${athleteId}/${dayKey}.jpg`);
  if (!hasSupabaseEnv()) {
    saveLocal(loadLocal().filter((r) => !(r.dayKey === dayKey && r.athleteId === athleteId)));
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("varsity_results")
    .delete()
    .eq("athlete_id", athleteId)
    .eq("day_key", dayKey);
  return error ? { error: error.message } : {};
}

/* ── How many people are on the squad — the denominator in "9 of 24 logged".
     Approved members only: someone still in the captain's waiting room isn't
     on the team yet and shouldn't make the board look incomplete. ── */
export async function fetchSquadSize(teamId: string | null): Promise<number | null> {
  if (!teamId || !hasSupabaseEnv()) return null;
  const supabase = createClient();
  const { count, error } = await supabase
    .from("varsity_members")
    .select("user_id", { count: "exact", head: true })
    .eq("team_id", teamId)
    .eq("status", "approved");
  if (error) {
    console.error("fetchSquadSize:", error.message);
    return null;
  }
  return count ?? null;
}
