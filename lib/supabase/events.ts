/*
  EVENT COUNTERS — typed client for db/events.sql.
  ------------------------------------------------------------------------
  The database COUNTS (days trained, people met, lifts, cardio, kilometres);
  what an event asks for lives in lib/events.ts as data. These two calls hand
  back the raw counters for the signed-in person and for every house, and the
  screens hold them up against the event that is running.

  Nothing here invents numbers: with no database configured both come back
  empty and the screens say so.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { distanceWeight, type EventCounts } from "@/lib/events";

const weightArgs = {
  w_running: distanceWeight.running,
  w_rowing: distanceWeight.rowing,
  w_cycling: distanceWeight.cycling,
};

type CounterRow = {
  days: number;
  partners: number;
  new_partners: number;
  gym_sessions: number;
  cardio_sessions: number;
  distance_km: string | number;
};

const toCounts = (r: CounterRow): EventCounts => ({
  days: r.days ?? 0,
  partners: r.partners ?? 0,
  newPartners: r.new_partners ?? 0,
  gymSessions: r.gym_sessions ?? 0,
  cardioSessions: r.cardio_sessions ?? 0,
  distance: Number(r.distance_km ?? 0),
});

/** My own counters since `sinceIso` (this Monday, or the 1st). Null without a database. */
export async function fetchMyEventCounts(sinceIso: string): Promise<EventCounts | null> {
  if (!hasSupabaseEnv()) return null;
  const { data, error } = await createClient().rpc("event_counters", {
    since_date: sinceIso,
    only_me: true,
    ...weightArgs,
  });
  if (error || !data) return null;
  const row = (data as CounterRow[])[0];
  return row ? toCounts(row) : { days: 0, partners: 0, newPartners: 0, gymSessions: 0, cardioSessions: 0, distance: 0 };
}

export type HouseCounts = {
  key: string;
  members: number;
  actives: number;
  counts: EventCounts;
  isMine: boolean;
};

/** Every house's counters since `sinceIso`, limited to `onlyKeys` (the houses list). */
export async function fetchHouseEventCounts(
  sinceIso: string,
  onlyKeys: string[],
): Promise<HouseCounts[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await createClient().rpc("event_house_counters", {
    since_date: sinceIso,
    only_keys: onlyKeys,
    ...weightArgs,
  });
  if (error || !data) return [];
  return (data as (CounterRow & { key: string; members: number; actives: number; is_mine: boolean | null })[]).map(
    (r) => ({
      key: r.key,
      members: r.members ?? 0,
      actives: r.actives ?? 0,
      counts: { ...toCounts(r), actives: r.actives ?? 0 },
      isMine: !!r.is_mine,
    }),
  );
}

/*
  THE DUELS' MEMORY (db/patch_house_duels_2026-09-27.sql): when each house got
  into this month's race, and when it was first seen over the line. Calling it
  is also what writes those moments down — the database works the numbers out
  itself, so nothing sent from here can put a house across. Null when it can't
  be read, and the tab falls back to drawing from today's numbers.
*/
export async function settleHouseDuels(
  onlyKeys: string[],
): Promise<{ house: string; enteredAt: number; crossedAt: number | null }[] | null> {
  if (!hasSupabaseEnv()) return null;
  const { data, error } = await createClient().rpc("house_duel_settle", { p_keys: onlyKeys });
  if (error || !data) return null;
  return (data as { house: string; entered_at: string; crossed_at: string | null }[]).map((r) => ({
    house: r.house,
    enteredAt: Date.parse(r.entered_at),
    crossedAt: r.crossed_at ? Date.parse(r.crossed_at) : null,
  }));
}
