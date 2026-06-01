/*
  LINEUP STORE — where boat lineups are read from / written to.
  ------------------------------------------------------------------------
  One row per practice (day_key = sessionKey from coachPlan, e.g. '2026-5-22-AM').
  The coach's boats are stored as one JSON blob. There is ONE shared team for now
  (see db/varsity_lineups.sql); athletes read PUBLISHED practices on their Home.
  Falls back to localStorage when Supabase env isn't configured.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { rosterById, boatTypes, type Boat } from "./coachLineup";
import type { Lineup } from "./home";

export type LineupStatus = "draft" | "published";
export type StoredLineup = { boats: Boat[]; status: LineupStatus };

/* ── localStorage fallback ── */
const keyFor = (dayKey: string) => `varsityLineup:${dayKey}`;
function loadLocal(dayKey: string): StoredLineup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(dayKey));
    return raw ? (JSON.parse(raw) as StoredLineup) : null;
  } catch {
    return null;
  }
}
function loadLocalAll(): Record<string, LineupStatus> {
  if (typeof window === "undefined") return {};
  const out: Record<string, LineupStatus> = {};
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i);
    if (k?.startsWith("varsityLineup:")) {
      try {
        const v = JSON.parse(window.localStorage.getItem(k)!) as StoredLineup;
        out[k.slice("varsityLineup:".length)] = v.status;
      } catch {
        /* ignore */
      }
    }
  }
  return out;
}

/* ── Read one practice's lineup (coach builder) ── */
export async function fetchLineup(dayKey: string): Promise<StoredLineup | null> {
  if (!hasSupabaseEnv()) return loadLocal(dayKey);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_lineups")
    .select("boats,status")
    .eq("day_key", dayKey)
    .maybeSingle();
  if (error || !data) return null;
  return { boats: (data.boats as Boat[]) ?? [], status: data.status as LineupStatus };
}

/* ── Status of every practice that has a lineup (powers the day-picker dots) ── */
export async function fetchLineupStatuses(): Promise<Record<string, LineupStatus>> {
  if (!hasSupabaseEnv()) return loadLocalAll();
  const supabase = createClient();
  const { data, error } = await supabase.from("varsity_lineups").select("day_key,status");
  if (error || !data) return {};
  const out: Record<string, LineupStatus> = {};
  for (const r of data as { day_key: string; status: LineupStatus }[]) out[r.day_key] = r.status;
  return out;
}

/* ── Save / publish a practice's lineup ── */
export async function saveLineup(
  dayKey: string,
  boats: Boat[],
  status: LineupStatus,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(keyFor(dayKey), JSON.stringify({ boats, status }));
    }
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase
    .from("varsity_lineups")
    .upsert({ day_key: dayKey, boats, status, updated_at: new Date().toISOString() });
  return error ? { error: error.message } : {};
}

/* ── Athlete Home: today's published boats as Lineup[] ── */
const boatTypeName = (badge: string) => boatTypes.find((b) => b.type === badge)?.name ?? badge;
const norm = (s: string) => s.trim().toLowerCase();

// `myName` is the signed-in athlete's full profile name. We have no real link
// between accounts and the (still-mock) roster yet, so we highlight "your seat"
// by matching that name to the seated athlete's name — works for anyone who's
// both a real account and in the squad (e.g. Martin Houska).
function boatToLineup(period: string, boat: Boat, myName: string | null): Lineup {
  const me = myName ? norm(myName) : null;
  const fill = (athleteId: string | null) => {
    const a = athleteId ? rosterById[athleteId] : undefined;
    return {
      init: a?.initials ?? "—",
      name: a?.name ?? "—",
      mine: !!(me && a && norm(a.name) === me),
    };
  };
  return {
    period: `${period} · ${boat.name}${boat.dock ? ` · ${boat.dock}` : ""}`,
    type: boatTypeName(boat.badge),
    seats: boat.seats.map((s) => ({ num: s.label, ...fill(s.athleteId) })),
    cox: boat.hasCox ? fill(boat.coxId) : undefined,
  };
}

export async function fetchTodayLineups(
  dayKeyFor: (period: "AM" | "PM") => string,
  myName: string | null = null,
): Promise<Lineup[]> {
  const periods: ("AM" | "PM")[] = ["AM", "PM"];
  const stored = await Promise.all(periods.map((p) => fetchLineup(dayKeyFor(p))));
  const out: Lineup[] = [];
  periods.forEach((p, i) => {
    const s = stored[i];
    if (s && s.status === "published") {
      for (const boat of s.boats) out.push(boatToLineup(p, boat, myName));
    }
  });
  return out;
}
