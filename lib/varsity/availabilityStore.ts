/*
  AVAILABILITY STORE — who is OUT, and on which days.
  ------------------------------------------------------------------------
  The coach marks a rower out from the Lineup pool. A spell out is a row: an
  athlete, a reason, a first day, and a last day — or no last day, for an
  injury that lasts until the coach brings them back in. The pool for a
  practice asks "who is out on THIS day" and gets every spell covering it.

  Days are ISO dates (yyyy-mm-dd, from toISO in coachPlan.ts) and never the
  practice's day_key: being sick is about the whole day, not the AM.

  Backed by Supabase (db/varsity_availability.sql). Falls back to localStorage
  when Supabase env isn't configured, so the pool still works in plain dev.
  Everything fails soft: an unreachable table reads as "everyone available".
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { addDays } from "./coachPlan";
import type { OutReason } from "./coachLineup";

export type Spell = {
  id: string;
  athleteId: string;
  reason: OutReason;
  from: string; // ISO yyyy-mm-dd
  until: string | null; // ISO, inclusive — null is open-ended
};

/** Does this spell cover that day? */
const covers = (s: Spell, iso: string) => s.from <= iso && (s.until === null || s.until >= iso);

/* ── localStorage fallback (no Supabase env) ── */
const LOCAL_KEY = "varsityAvailability";

function loadLocal(): Spell[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Spell[]) : [];
  } catch {
    return [];
  }
}
function saveLocal(spells: Spell[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(spells));
}

/* ── DB row <-> model ── */
type Row = {
  id: string;
  athlete_id: string;
  reason: string;
  from_date: string;
  until_date: string | null;
};
const rowToSpell = (r: Row): Spell => ({
  id: r.id,
  athleteId: r.athlete_id,
  reason: r.reason as OutReason,
  from: r.from_date,
  until: r.until_date,
});

/* ── Every spell covering one day, as athleteId → reason ── */
export async function fetchOutOn(iso: string): Promise<Record<string, OutReason>> {
  let spells: Spell[];
  if (!hasSupabaseEnv()) {
    spells = loadLocal();
  } else {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("varsity_availability")
      .select("id,athlete_id,reason,from_date,until_date")
      .lte("from_date", iso)
      .or(`until_date.is.null,until_date.gte.${iso}`);
    if (error || !data) {
      console.error("fetchOutOn:", error?.message);
      return {};
    }
    spells = (data as Row[]).map(rowToSpell);
  }
  const out: Record<string, OutReason> = {};
  for (const s of spells) if (covers(s, iso)) out[s.athleteId] = s.reason;
  return out;
}

/* ── Mark someone out from a day: for that day only, or until further notice ── */
export async function markOut(
  athleteId: string,
  reason: OutReason,
  from: string,
  until: string | null,
): Promise<{ error?: string }> {
  // One spell per person per day — anything already covering `from` is
  // closed first, so switching Sick → Injured never leaves two rows disagreeing.
  const closed = await markBackIn(athleteId, from);
  if (closed.error) return closed;

  if (!hasSupabaseEnv()) {
    const spells = loadLocal();
    spells.push({ id: `spell-${Date.now()}`, athleteId, reason, from, until });
    saveLocal(spells);
    return {};
  }
  const supabase = createClient();
  const { error } = await supabase.from("varsity_availability").insert({
    athlete_id: athleteId,
    reason,
    from_date: from,
    until_date: until,
    updated_at: new Date().toISOString(),
  });
  return error ? { error: error.message } : {};
}

/*
  Bring someone back in from a day: every spell covering it ends the day
  before. A spell that STARTED that day has no day before to end on, so it
  goes entirely. History stays true either way — the days they did miss are
  still recorded as missed.
*/
export async function markBackIn(athleteId: string, iso: string): Promise<{ error?: string }> {
  const lastDay = addDays(iso, -1);

  if (!hasSupabaseEnv()) {
    const spells = loadLocal();
    const next = spells.flatMap((s) => {
      if (s.athleteId !== athleteId || !covers(s, iso)) return [s];
      return s.from >= iso ? [] : [{ ...s, until: lastDay }];
    });
    saveLocal(next);
    return {};
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("varsity_availability")
    .select("id,athlete_id,reason,from_date,until_date")
    .eq("athlete_id", athleteId)
    .lte("from_date", iso)
    .or(`until_date.is.null,until_date.gte.${iso}`);
  if (error) return { error: error.message };
  const open = ((data ?? []) as Row[]).map(rowToSpell).filter((s) => covers(s, iso));
  const toDelete = open.filter((s) => s.from >= iso).map((s) => s.id);
  const toClose = open.filter((s) => s.from < iso).map((s) => s.id);
  if (toDelete.length) {
    const { error: e } = await supabase.from("varsity_availability").delete().in("id", toDelete);
    if (e) return { error: e.message };
  }
  if (toClose.length) {
    const { error: e } = await supabase
      .from("varsity_availability")
      .update({ until_date: lastDay, updated_at: new Date().toISOString() })
      .in("id", toClose);
    if (e) return { error: e.message };
  }
  return {};
}
