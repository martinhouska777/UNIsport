/*
  LINEUP STORE — where boat lineups are read from / written to.
  ------------------------------------------------------------------------
  One row per practice (day_key = sessionKey from coachPlan, e.g. '2026-5-22-AM').
  The coach's boats are stored as one JSON blob. There is ONE shared team for now
  (see db/varsity_lineups.sql); athletes read PUBLISHED practices on their Home.
  Falls back to localStorage when Supabase env isn't configured.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { rosterById, boatTypes, seatLabel, carryBoats, type Boat } from "./coachLineup";
import { parseSessionKey } from "./coachPlan";
import { isPushOffTime, type Lineup } from "./home";

export type LineupStatus = "draft" | "published";
/*
  `announced` is what the squad was last TOLD — the boats as JSON text at the
  moment the coach published or pressed Tell the squad (db/patch_announced.sql).
  The builder compares the current boats to it, so a live lineup edited and
  then closed still offers the buzz next time. Null: never told, or written
  before this was recorded — the builder treats a published lineup with null
  as up to date.
*/
export type StoredLineup = { boats: Boat[]; status: LineupStatus; announced: string | null };

/* ── localStorage fallback ── */
const keyFor = (dayKey: string) => `varsityLineup:${dayKey}`;
function loadLocal(dayKey: string): StoredLineup | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(keyFor(dayKey));
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<StoredLineup>;
    return { boats: v.boats ?? [], status: v.status ?? "draft", announced: v.announced ?? null };
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
    .select("boats,status,announced")
    .eq("day_key", dayKey)
    .maybeSingle();
  if (error || !data) return null;
  return {
    boats: (data.boats as Boat[]) ?? [],
    status: data.status as LineupStatus,
    announced: (data.announced as string | null) ?? null,
  };
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

/* ── Which practice a new lineup starts from ────────────────────────────────
   The most recent PUBLISHED practice strictly before this one. Published, not
   draft: a draft is the coach half-way through a thought, and a chain of
   drafts each copied from the last would compound whatever was unfinished in
   the first. What the squad was actually given is the safe thing to start from.

   Compared on the parsed date, never on the key as text — the key holds a
   zero-based, unpadded month (see parseSessionKey), so "2026-9-1" sorts before
   "2026-10-1" as a date and after it as a string. Same day, AM before PM. */
export function latestPublishedBefore(
  statuses: Record<string, LineupStatus>,
  dayKey: string,
): string | null {
  const here = parseSessionKey(dayKey);
  if (!here) return null;
  const order = (p: { date: Date; period: "AM" | "PM" }) =>
    p.date.getTime() * 2 + (p.period === "PM" ? 1 : 0);
  const cutoff = order(here);
  let best: { key: string; at: number } | null = null;
  for (const [key, status] of Object.entries(statuses)) {
    if (status !== "published") continue;
    const parsed = parseSessionKey(key);
    if (!parsed) continue;
    const at = order(parsed);
    if (at < cutoff && (!best || at > best.at)) best = { key, at };
  }
  return best?.key ?? null;
}

/*
  The boats a practice with NO lineup opens on. Null when the squad has never
  been given a lineup before this day — then the builder starts empty, as it
  always did. `from` is the practice it came from, so the screen can say so.
*/
export async function fetchCarriedLineup(
  dayKey: string,
): Promise<{ from: string; boats: Boat[] } | null> {
  const from = latestPublishedBefore(await fetchLineupStatuses(), dayKey);
  if (!from) return null;
  const source = await fetchLineup(from);
  if (!source || source.boats.length === 0) return null;
  return { from, boats: carryBoats(source.boats) };
}

/* ── Save / publish a practice's lineup ──
   `announced`: pass the boats' snapshot when the squad is being TOLD (publish,
   Tell the squad), null when the lineup goes back to a draft, and leave it
   out for an ordinary autosave — an upsert only writes the columns it is
   given, so what the squad was last told survives every autosave in between. */
export async function saveLineup(
  dayKey: string,
  boats: Boat[],
  status: LineupStatus,
  announced?: string | null,
): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    if (typeof window !== "undefined") {
      const prev = loadLocal(dayKey);
      const next: StoredLineup = {
        boats,
        status,
        announced: announced === undefined ? (prev?.announced ?? null) : announced,
      };
      window.localStorage.setItem(keyFor(dayKey), JSON.stringify(next));
    }
    return {};
  }
  const supabase = createClient();
  const row: Record<string, unknown> = {
    day_key: dayKey,
    boats,
    status,
    updated_at: new Date().toISOString(),
  };
  if (announced !== undefined) row.announced = announced;
  const { error } = await supabase.from("varsity_lineups").upsert(row);
  return error ? { error: error.message } : {};
}

/* ── Athlete Home: today's published boats as Lineup[] ── */
const boatTypeName = (badge: string) => boatTypes.find((b) => b.type === badge)?.name ?? badge;
const norm = (s: string) => s.trim().toLowerCase();

// `myName` is the signed-in athlete's full profile name. We have no real link
// between accounts and the (still-mock) roster yet, so we highlight "your seat"
// by matching that name to the seated athlete's name — works for anyone who's
// both a real account and in the squad (e.g. John Brown, the demo account).
function boatToLineup(
  period: string,
  boat: Boat,
  myName: string | null,
  dayKey?: string,
): Lineup {
  const me = myName ? norm(myName) : null;
  const fill = (athleteId: string | null) => {
    const a = athleteId ? rosterById[athleteId] : undefined;
    return {
      init: a?.initials ?? "—",
      name: a?.name ?? "—",
      mine: !!(me && a && norm(a.name) === me),
      // Which way this PERSON rows — the only marker beside their name in the
      // boat. A coxswain has no side, so a cox row simply carries none.
      side: a?.side,
    };
  };
  return {
    // The display string, kept honest: the dock field only joins it when it
    // really holds a push-off time (older lineups wrote a BOATHOUSE there).
    period: `${period} · ${boat.name}${isPushOffTime(boat.dock) ? ` · ${boat.dock.trim()}` : ""}`,
    periodKey: period === "PM" ? "PM" : "AM",
    type: boatTypeName(boat.badge),
    // The seat number is its POSITION in the boat (bow is 1), not whatever the
    // stored `label` says — lineups saved under the old scheme wrote "S" for
    // the stroke seat, and they must still read 8…1 now.
    seats: boat.seats.map((s, i) => ({ num: seatLabel(i), ...fill(s.athleteId) })),
    cox: boat.hasCox ? fill(boat.coxId) : undefined,
    oars: boat.oars?.trim() || undefined,
    // The three the boat is READ by, kept apart from the display string above
    // so a card can lay them out however it likes.
    name: boat.name?.trim() || undefined,
    badge: boat.badge,
    dock: boat.dock?.trim() || undefined,
    note: boat.note?.trim() || undefined,
    // Carried through so the athlete's Home can hang this boat's video off it —
    // the same boat record the coach's builder attaches footage to.
    dayKey,
    boat,
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
      for (const boat of s.boats) out.push(boatToLineup(p, boat, myName, dayKeyFor(p)));
    }
  });
  return out;
}
