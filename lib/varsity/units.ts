/*
  UNITS — kilometres or miles, kilograms or pounds.
  ---------------------------------------------------------------------------
  A per-person preference: a Czech rower thinks in km and kg, an American one in
  miles and pounds, and both use the same app. Everything the app STORES stays
  metric (metres and kilograms) — only the display converts — so the numbers
  never drift and switching units can't corrupt anything.

  The choice lives in the SAME profiles.data JSON as the rest of a person's
  settings, under a `units` key, so it follows the account to any device.

  Both option lists are DATA (rule 7): the Settings screen loops over them and
  never hardcodes "km" or "lb".
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

export type DistanceUnit = "km" | "mi";
export type WeightUnit = "kg" | "lb";
export type Units = { distance: DistanceUnit; weight: WeightUnit };

export const defaultUnits: Units = { distance: "km", weight: "kg" };

export const distanceOptions: { key: DistanceUnit; label: string; short: string }[] = [
  { key: "km", label: "Kilometres", short: "km" },
  { key: "mi", label: "Miles", short: "mi" },
];

export const weightOptions: { key: WeightUnit; label: string; short: string }[] = [
  { key: "kg", label: "Kilograms", short: "kg" },
  { key: "lb", label: "Pounds", short: "lb" },
];

const METRES_PER_MILE = 1609.344;
const POUNDS_PER_KG = 2.20462;

/* ── Distance ──────────────────────────────────────────────────────────────
   Stored in metres. Short rowing pieces read better as metres ("1,850 m" is
   how a rower says it), so anything under a kilometre stays in metres. */
export function formatDistance(metres: number, unit: DistanceUnit): string {
  if (!metres) return unit === "mi" ? "0 mi" : "0 km";
  if (unit === "km") {
    if (metres < 1000) return `${Math.round(metres).toLocaleString("en-US")} m`;
    const km = metres / 1000;
    return `${km >= 100 ? Math.round(km).toLocaleString("en-US") : km.toFixed(1)} km`;
  }
  const miles = metres / METRES_PER_MILE;
  if (miles < 0.1) return `${Math.round(metres).toLocaleString("en-US")} m`;
  return `${miles >= 100 ? Math.round(miles).toLocaleString("en-US") : miles.toFixed(1)} mi`;
}

/* ── Weight ── stored in kilograms ── */
export function formatWeight(kg: number | null, unit: WeightUnit): string {
  if (kg == null) return "—";
  return unit === "lb"
    ? `${Math.round(kg * POUNDS_PER_KG)} lb`
    : `${Number.isInteger(kg) ? kg : kg.toFixed(1)} kg`;
}

// For editing: turn what someone typed in their unit back into kilograms.
export function weightToKg(value: number, unit: WeightUnit): number {
  return unit === "lb" ? value / POUNDS_PER_KG : value;
}
export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === "lb" ? kg * POUNDS_PER_KG : kg;
}

/* ── Time, which has no preference to respect — 195 → "3h 15m" ── */
export function formatDuration(minutes: number): string {
  if (!minutes) return "0m";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function withDefaults(saved: Partial<Units> | undefined): Units {
  return {
    distance: saved?.distance === "mi" ? "mi" : "km",
    weight: saved?.weight === "lb" ? "lb" : "kg",
  };
}

/* ── Read / write, merged into profiles.data so other settings survive ── */
export async function fetchUnits(userId: string | null): Promise<Units> {
  if (!userId || !hasSupabaseEnv()) return defaultUnits;
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("data").eq("id", userId).maybeSingle();
  const d = (data?.data as { units?: Partial<Units> } | undefined) ?? {};
  return withDefaults(d.units);
}

export async function saveUnits(userId: string | null, next: Units): Promise<{ error?: string }> {
  if (!userId || !hasSupabaseEnv()) return {};
  const supabase = createClient();
  const { data: row } = await supabase
    .from("profiles")
    .select("data")
    .eq("id", userId)
    .maybeSingle();
  const current = (row?.data as Record<string, unknown>) ?? {};
  const { error } = await supabase
    .from("profiles")
    .update({ data: { ...current, units: next }, updated_at: new Date().toISOString() })
    .eq("id", userId);
  return error ? { error: error.message } : {};
}
