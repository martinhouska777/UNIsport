/*
  PLAN STORE — where the coach's training plan is read from / written to.
  ------------------------------------------------------------------------
  The plan (blocks + sessions) now lives in Supabase so athletes can see what
  the coach publishes. There is ONE shared team plan for now (see
  db/varsity_plan.sql). If Supabase env isn't configured we transparently fall
  back to localStorage, so the builder still works offline / in plain dev.

  The in-app model (Block / Session / SessionMap) is defined in coachPlan.ts;
  this module only maps it to and from the two DB tables.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { Block, Session, SessionMap, Category, Intensity } from "./coachPlan";

export type Plan = { blocks: Block[]; sessions: SessionMap };

/* ── localStorage fallback (no Supabase env) ── */
const BLOCKS_KEY = "varsityPlanBlocks";
const SESSIONS_KEY = "varsityPlanSessions";

function loadLocal(): Plan {
  if (typeof window === "undefined") return { blocks: [], sessions: {} };
  const read = <T,>(key: string, fallback: T): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  };
  return {
    blocks: read<Block[]>(BLOCKS_KEY, []),
    sessions: read<SessionMap>(SESSIONS_KEY, {}),
  };
}

function saveLocal(plan: Plan) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BLOCKS_KEY, JSON.stringify(plan.blocks));
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(plan.sessions));
}

/* ── DB row <-> model mappers ── */
type BlockRow = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  race_name: string | null;
  race_date: string | null;
};
type SessionRow = {
  day_key: string;
  category: string;
  intensity: string | null;
  description: string | null;
  time: string | null;
  note: string | null;
};

function rowToBlock(r: BlockRow): Block {
  return {
    id: r.id,
    name: r.name,
    start: r.start_date,
    end: r.end_date,
    status: r.status === "published" ? "published" : "draft",
    raceName: r.race_name ?? undefined,
    raceDate: r.race_date ?? undefined,
  };
}
function blockToRow(b: Block): BlockRow {
  return {
    id: b.id,
    name: b.name,
    start_date: b.start,
    end_date: b.end,
    status: b.status,
    race_name: b.raceName ?? null,
    race_date: b.raceDate ?? null,
  };
}
function rowToSession(r: SessionRow): Session {
  return {
    category: r.category as Category,
    intensity: (r.intensity as Intensity) ?? undefined,
    description: r.description ?? "",
    time: r.time ?? "",
    note: r.note ?? undefined,
  };
}
function sessionToRow(dayKey: string, s: Session) {
  return {
    day_key: dayKey,
    category: s.category,
    intensity: s.intensity ?? null,
    description: s.description ?? "",
    time: s.time ?? "",
    note: s.note ?? null,
    updated_at: new Date().toISOString(),
  };
}

/* ── Read the whole shared plan ── */
export async function fetchPlan(): Promise<Plan> {
  if (!hasSupabaseEnv()) return loadLocal();
  const supabase = createClient();
  const [blocksRes, sessionsRes] = await Promise.all([
    supabase.from("varsity_plan_blocks").select("*"),
    supabase.from("varsity_plan_sessions").select("*"),
  ]);
  if (blocksRes.error || sessionsRes.error) {
    // Table missing or RLS blocked — fail soft to an empty plan.
    console.error("fetchPlan:", blocksRes.error?.message ?? sessionsRes.error?.message);
    return { blocks: [], sessions: {} };
  }
  const blocks = (blocksRes.data as BlockRow[]).map(rowToBlock);
  const sessions: SessionMap = {};
  for (const r of sessionsRes.data as SessionRow[]) sessions[r.day_key] = rowToSession(r);
  return { blocks, sessions };
}

/* ── Save the whole shared plan (upsert what's there, delete what's gone) ── */
export async function savePlan(plan: Plan): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    saveLocal(plan);
    return {};
  }
  const supabase = createClient();

  // Blocks: upsert current, then delete any rows no longer present.
  if (plan.blocks.length) {
    const { error } = await supabase
      .from("varsity_plan_blocks")
      .upsert(plan.blocks.map(blockToRow));
    if (error) return { error: error.message };
  }
  const { data: existingBlocks } = await supabase.from("varsity_plan_blocks").select("id");
  const keepBlockIds = new Set(plan.blocks.map((b) => b.id));
  const delBlockIds = (existingBlocks ?? [])
    .map((r) => (r as { id: string }).id)
    .filter((id) => !keepBlockIds.has(id));
  if (delBlockIds.length) await supabase.from("varsity_plan_blocks").delete().in("id", delBlockIds);

  // Sessions: same upsert-then-prune.
  const sessionRows = Object.entries(plan.sessions).map(([k, s]) => sessionToRow(k, s));
  if (sessionRows.length) {
    const { error } = await supabase.from("varsity_plan_sessions").upsert(sessionRows);
    if (error) return { error: error.message };
  }
  const { data: existingSessions } = await supabase
    .from("varsity_plan_sessions")
    .select("day_key");
  const keepKeys = new Set(Object.keys(plan.sessions));
  const delKeys = (existingSessions ?? [])
    .map((r) => (r as { day_key: string }).day_key)
    .filter((k) => !keepKeys.has(k));
  if (delKeys.length) await supabase.from("varsity_plan_sessions").delete().in("day_key", delKeys);

  return {};
}

/* ── The signed-in athlete's first name (for the Home greeting) ── */
export async function fetchProfileName(userId: string | null): Promise<string> {
  if (!userId || !hasSupabaseEnv()) return "";
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("data").eq("id", userId).maybeSingle();
  const full = (data?.data as { name?: string } | undefined)?.name ?? "";
  return full.trim().split(/\s+/)[0] ?? ""; // first name only
}
