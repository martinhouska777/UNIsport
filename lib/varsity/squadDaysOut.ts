/*
  WHO SAID THEY ARE OUT — the athletes' own word, read by their coach.
  ---------------------------------------------------------------------------
  A rower marks themselves Sick, Injured or Away on their own profile (the
  status switch, and the calendar's Missed button — lib/varsity/daysOut.ts).
  That lives on THEIR profile, which only they can read, so the coach's Lineup
  builder never saw it: its Unavailable list read the coach's own record
  (availabilityStore) and nothing else, and a rower who had said they were
  sick could be seated (audit, 2026-09-27).

  This asks the database for it through one narrow function
  (db/varsity_squad_days_out_2026-09-27.sql): for an approved coach, the days
  their squad marked and anyone whose status is still out — the reason and the
  day, nothing else off the profile.

  WHICH SEAT IS WHICH PERSON. The builder's pool is the roster in
  lib/varsity/coachLineup.ts, keyed by roster id, and accounts are joined to it
  the way "your seat" is found everywhere else (lineupStore.isMine): the roster
  id the athlete CLAIMED, and — only for an account that never claimed one —
  their name matched against the roster's.

  FAILS SOFT. Until the function is applied, for a captain or an athlete, or on
  a bad connection, this answers "nobody" and the builder shows exactly what it
  showed before.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { rosterById, type OutReason } from "./coachLineup";
import { toISO } from "./coachPlan";
import { rosterIdForName } from "./demoAthlete";
import type { DayOutReason } from "./daysOut";

/* The athlete's four words, as the builder's reasons. "Other" is what the
   calendar calls Missed. */
const asOutReason: Record<DayOutReason, OutReason> = {
  sick: "SICK",
  injured: "INJ",
  away: "AWAY",
  other: "MISSED",
};

type Row = {
  user_id: string;
  roster_id: string | null;
  name: string | null;
  day: string | null;
  reason: string | null;
  ongoing: boolean | null;
};

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Roster id → why that rower said they are out on `iso` (yyyy-mm-dd). */
export async function fetchSelfOutOn(iso: string): Promise<Record<string, OutReason>> {
  if (!hasSupabaseEnv() || !ISO.test(iso)) return {};
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_squad_days_out", { p_from: iso, p_to: iso });
  if (error || !Array.isArray(data)) return {};

  /*
    A day they marked beats the status they are in: it is about THIS day, and
    it is the one they may have given a different reason for ("away" on the
    Saturday of a week off sick).
  */
  const marked: Record<string, OutReason> = {};
  const status: Record<string, OutReason> = {};
  for (const r of data as Row[]) {
    const reason = asOutReason[r.reason as DayOutReason];
    if (!reason) continue;
    const seat = r.roster_id && rosterById[r.roster_id] ? r.roster_id : rosterIdForName(r.name);
    if (!seat) continue; // an account with no seat on the roster has nothing to be left out of
    if (r.ongoing) {
      // Out from the day the status was picked until they switch back. A
      // status with no recorded start says "out now", so it covers today and
      // the days ahead — never a day already past.
      const since = r.day && ISO.test(r.day) ? r.day : toISO(new Date());
      if (since <= iso) status[seat] = reason;
    } else if (r.day === iso) {
      marked[seat] = reason;
    }
  }
  return { ...status, ...marked };
}

/**
 * HOW MANY DAYS EACH ATHLETE SAID THEY WERE OUT between two dates — the
 * coach's consistency ranking ("who was sick", lib/varsity/ranking.ts).
 * Account id → days. Sick, injured and away only: "Other" is the calendar's
 * Missed, a day that did not happen, not a day off with a reason.
 *
 * A status that is still on counts every day from the day it was picked (or
 * from today, with no start day recorded) up to today, inside the window —
 * never a day still ahead. A day both marked and under a status counts once.
 */
export async function fetchOutDaysBetween(fromIso: string, toIso: string): Promise<Record<string, number>> {
  if (!hasSupabaseEnv() || !ISO.test(fromIso) || !ISO.test(toIso)) return {};
  const supabase = createClient();
  const { data, error } = await supabase.rpc("varsity_squad_days_out", { p_from: fromIso, p_to: toIso });
  if (error || !Array.isArray(data)) return {};

  const today = toISO(new Date());
  const last = toIso < today ? toIso : today;
  const days: Record<string, Set<string>> = {};
  const add = (id: string, iso: string) => (days[id] ??= new Set()).add(iso);
  for (const r of data as Row[]) {
    if (r.reason !== "sick" && r.reason !== "injured" && r.reason !== "away") continue;
    if (r.ongoing) {
      const since = r.day && ISO.test(r.day) ? r.day : today;
      const [y, m, d] = (since > fromIso ? since : fromIso).split("-").map(Number);
      for (const day = new Date(y, m - 1, d); toISO(day) <= last; day.setDate(day.getDate() + 1)) {
        add(r.user_id, toISO(day));
      }
    } else if (r.day && ISO.test(r.day)) {
      add(r.user_id, r.day);
    }
  }
  return Object.fromEntries(Object.entries(days).map(([id, set]) => [id, set.size]));
}
