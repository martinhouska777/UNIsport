/*
  THE LEAGUE — typed client helpers for db/league.sql.
  ---------------------------------------------------------------------------
  The database hands back COUNTERS. This file turns them into XP, a level and a
  place on the board, using the rules in lib/xp.ts and the ladder in
  lib/challenges.ts. That is the whole point of the split: one set of rules,
  applied identically to your own row and to everybody else's, held in a data
  file rather than in SQL.

  Ranking happens HERE rather than in the database, because a person's total is
  activity XP plus whatever their finished challenges paid — and what a
  challenge pays is data. The database orders by activity XP alone and returns
  a generous slice; this file adds the challenge XP and sorts properly.

  As everywhere else in this app, nothing here invents numbers. With no database
  configured every call comes back empty and the screens say so, rather than
  showing a convincing fake.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { activityXp, levelProgress, sessionXp, type LevelProgress } from "@/lib/xp";
import { challengeXp, emptyCounters, type Counters } from "@/lib/challenges";

export type LeagueRow = {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  residence: string | null;
  classYear: string | null;
  counters: Counters;
  /** XP from turning up. */
  fromSessions: number;
  /** XP from finished challenges. */
  fromChallenges: number;
  xp: number;
  progress: LevelProgress;
  isMe: boolean;
};

type RpcRow = {
  user_id: string;
  name: string;
  initials: string;
  residence: string | null;
  class_year: string | null;
  solo: number;
  partner: number;
  new_partner: number;
  partners: number;
  new_partners: number;
  gyms: number;
  weeks3: number;
  km: string | number; // numeric comes back as a string
  is_me: boolean | null;
};

function shape(r: RpcRow, universityKey: string): Omit<LeagueRow, "rank"> {
  const counters: Counters = {
    sessions: (r.solo ?? 0) + (r.partner ?? 0) + (r.new_partner ?? 0),
    partners: r.partners ?? 0,
    newPartners: r.new_partners ?? 0,
    gyms: r.gyms ?? 0,
    weeks3: r.weeks3 ?? 0,
    km: Number(r.km ?? 0),
  };
  const fromSessions = activityXp({
    solo: r.solo ?? 0,
    partner: r.partner ?? 0,
    newPartner: r.new_partner ?? 0,
  });
  const fromChallenges = challengeXp(counters, universityKey);
  const xp = fromSessions + fromChallenges;
  return {
    userId: r.user_id,
    name: r.name,
    initials: r.initials,
    residence: r.residence,
    classYear: r.class_year,
    counters,
    fromSessions,
    fromChallenges,
    xp,
    progress: levelProgress(xp),
    isMe: !!r.is_me,
  };
}

async function read(universityKey: string, limit: number, onlyMe: boolean) {
  if (!hasSupabaseEnv()) return [] as Omit<LeagueRow, "rank">[];
  const { data, error } = await createClient().rpc("league_counters", {
    limit_n: limit,
    xp_solo: sessionXp.solo,
    xp_partner: sessionXp.partner,
    xp_new: sessionXp.newPartner,
    only_me: onlyMe,
  });
  if (error || !data) return [] as Omit<LeagueRow, "rank">[];
  return (data as RpcRow[]).map((r) => shape(r, universityKey));
}

/**
 * The individual board, ranked by total XP. `limit` is how many people to
 * fetch, not how many to show — the extra headroom means adding challenge XP
 * cannot shuffle somebody off the end of the list.
 */
export async function fetchLeagueBoard(
  universityKey: string,
  limit = 200,
): Promise<LeagueRow[]> {
  const rows = await read(universityKey, limit, false);
  // Ties share a rank, and the next rank skips — the same behaviour Postgres's
  // rank() gives the other boards, so the two screens never disagree.
  const sorted = rows.sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name));
  let lastXp = Number.NaN;
  let lastRank = 0;
  return sorted.map((row, i) => {
    if (row.xp !== lastXp) {
      lastRank = i + 1;
      lastXp = row.xp;
    }
    return { ...row, rank: lastRank };
  });
}

/** Just you — returned even when you have logged nothing at all. */
export async function fetchMyLeague(universityKey: string): Promise<LeagueRow | null> {
  const rows = await read(universityKey, 1, true);
  const mine = rows[0];
  return mine ? { ...mine, rank: 0 } : null;
}

/** An empty standing, for the screens to render before anything has loaded. */
export function blankLeague(): Omit<LeagueRow, "rank" | "userId" | "name" | "initials"> {
  return {
    residence: null,
    classYear: null,
    counters: emptyCounters,
    fromSessions: 0,
    fromChallenges: 0,
    xp: 0,
    progress: levelProgress(0),
    isMe: true,
  };
}

/**
 * The nudge that earns the whole feature: "2 more sessions and you're Level 6"
 * is a reason to train tonight in a way that "Level 5" is not. Expressed in
 * SESSIONS rather than XP, because nobody plans their evening in XP.
 */
export function toNextLevelLine(p: LevelProgress): string {
  const sessions = Math.max(1, Math.ceil(p.toGo / sessionXp.solo));
  const withNew = Math.max(1, Math.ceil(p.toGo / sessionXp.newPartner));
  if (withNew < sessions) {
    return `${sessions} more session${sessions === 1 ? "" : "s"} to Level ${
      p.level + 1
    } — or ${withNew} with someone new`;
  }
  return `${sessions} more session${sessions === 1 ? "" : "s"} to Level ${p.level + 1}`;
}
