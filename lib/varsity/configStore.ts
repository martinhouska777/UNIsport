/*
  TRAINING CONFIG STORE — where a squad's training vocabulary is read/written.
  ---------------------------------------------------------------------------
  One row per team in `varsity_team_config` (db/varsity_training_config.sql),
  holding the whole TrainingConfig as JSON. Same shape of fallback as
  planStore.ts: with no Supabase env we keep it in localStorage so the builder
  still works offline and in plain dev.

  A team that has never opened Settings has NO ROW, and that is not an error —
  it means "the rowing default", which is exactly what the app shipped with.
  Every read therefore falls back to defaultConfig() rather than failing.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { defaultConfig, type TrainingConfig } from "./trainingConfig";

const LOCAL_KEY = "varsityTrainingConfig";

/*
  A stored config was written by an older build, or hand-edited, or half-empty.
  Fill in anything missing rather than trusting the JSON — a config with no
  `types` would leave the coach staring at an editor with no buttons.
*/
function normalise(raw: unknown): TrainingConfig {
  const base = defaultConfig();
  if (!raw || typeof raw !== "object") return base;
  const v = raw as Partial<TrainingConfig>;
  return {
    preset: typeof v.preset === "string" ? v.preset : base.preset,
    types: Array.isArray(v.types) && v.types.length ? v.types : base.types,
    zones: Array.isArray(v.zones) ? v.zones : base.zones,
    library: v.library && typeof v.library === "object" ? v.library : {},
    times: { ...base.times, ...(v.times ?? {}) },
  };
}

function loadLocal(): TrainingConfig {
  if (typeof window === "undefined") return defaultConfig();
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? normalise(JSON.parse(raw)) : defaultConfig();
  } catch {
    return defaultConfig();
  }
}

function saveLocal(cfg: TrainingConfig) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(cfg));
  } catch {
    /* a full or blocked localStorage must not break the editor */
  }
}

/* ── Read ── */
export async function fetchTrainingConfig(teamId: string | null): Promise<TrainingConfig> {
  if (!teamId || !hasSupabaseEnv()) return loadLocal();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_team_config")
    .select("config")
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) {
    // Table missing or RLS blocked — the default is a good answer, not a crash.
    console.error("fetchTrainingConfig:", error.message);
    return defaultConfig();
  }
  return data ? normalise((data as { config: unknown }).config) : defaultConfig();
}

/* ── Write (coach only; the database re-checks) ── */
export async function saveTrainingConfig(
  teamId: string | null,
  cfg: TrainingConfig,
): Promise<{ error?: string }> {
  if (!teamId || !hasSupabaseEnv()) {
    saveLocal(cfg);
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase.rpc("varsity_save_team_config", {
    p_team: teamId,
    p_config: cfg,
  });
  return error ? { error: error.message } : {};
}
