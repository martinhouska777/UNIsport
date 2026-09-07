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
import {
  activityXp,
  houseLevelProgress,
  levelProgress,
  sessionXp,
  type LevelProgress,
  type SessionCounts,
} from "@/lib/xp";
import {
  challengeXp,
  emptyCounters,
  emptyHouseCounters,
  houseChallengeXp,
  type Counters,
  type HouseCounters,
} from "@/lib/challenges";
import { fetchGroupBoard, type GroupRow } from "@/lib/leaderboards";
import { emptyEventCounters, weekStartISO, type EventCounters } from "@/lib/events";
import { residenceKind, type ResidenceKind } from "@/lib/onboarding";

export type LeagueRow = {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  residence: string | null;
  classYear: string | null;
  counters: Counters;
  /** The three kinds of session, kept apart for the campus statistics. */
  sessionsBy: SessionCounts;
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
  const sessionsBy: SessionCounts = {
    solo: r.solo ?? 0,
    partner: r.partner ?? 0,
    newPartner: r.new_partner ?? 0,
  };
  const fromSessions = activityXp(sessionsBy);
  const fromChallenges = challengeXp(counters, universityKey);
  const xp = fromSessions + fromChallenges;
  return {
    userId: r.user_id,
    name: r.name,
    initials: r.initials,
    residence: r.residence,
    classYear: r.class_year,
    counters,
    sessionsBy,
    fromSessions,
    fromChallenges,
    xp,
    progress: levelProgress(xp),
    isMe: !!r.is_me,
  };
}

async function read(
  universityKey: string,
  limit: number,
  onlyMe: boolean,
  since?: string,
) {
  if (!hasSupabaseEnv()) return [] as Omit<LeagueRow, "rank">[];
  const { data, error } = await createClient().rpc("league_counters", {
    limit_n: limit,
    xp_solo: sessionXp.solo,
    xp_partner: sessionXp.partner,
    xp_new: sessionXp.newPartner,
    only_me: onlyMe,
    since_date: since ?? null,
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
  /** Omitted = all time. The weekly events pass the Monday just gone. */
  since?: string,
): Promise<LeagueRow[]> {
  const rows = await read(universityKey, limit, false, since);
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
    sessionsBy: { solo: 0, partner: 0, newPartner: 0 },
    fromSessions: 0,
    fromChallenges: 0,
    xp: 0,
    progress: levelProgress(0),
    isMe: true,
  };
}

/* ═══════════════════════  houses and dorms  ═══════════════════════ */

export type HouseStanding = {
  rank: number;
  key: string; // "Winthrop" / "Grays" / "'27"
  kind: ResidenceKind; // "other" for a class year, which has no residence kind
  counters: HouseCounters;
  fromMembers: number; // everything its members earned
  fromChallenges: number; // what the group's own challenges paid
  xp: number;
  progress: LevelProgress;
  isMine: boolean;
};

/**
 * Every house, dorm or class year, with its level.
 *
 * Two reads, joined here rather than in SQL: the per-person counters give the
 * XP, and the existing group board gives how many people BELONG to each group —
 * which the counters cannot, because somebody who has never logged anything has
 * no row at all. "Everyone in" is measured against that second number, so it
 * has to be the real one.
 *
 * min_members is 1 on purpose (see fetchGroupBoard): a house of one still has a
 * level, and hiding it from the person who lives there would be absurd. Whether
 * it may enter house-vs-house is a separate question, and a later one.
 */
export function buildGroupLeague(
  kind: "house" | "year",
  people: LeagueRow[],
  groups: GroupRow[],
): HouseStanding[] {
  const byKey = new Map<string, HouseStanding>();

  for (const g of groups) {
    byKey.set(g.key, {
      rank: 0,
      key: g.key,
      kind: kind === "house" ? residenceKind(g.key) : "other",
      counters: { ...emptyHouseCounters, members: g.members, actives: g.actives },
      fromMembers: 0,
      fromChallenges: 0,
      xp: 0,
      progress: houseLevelProgress(0),
      isMine: g.isMine,
    });
  }

  // Every point a member earns counts for their group — their sessions AND
  // their own finished challenges. That is what "you contribute to your house"
  // has to mean if it is going to make anybody nag their friends.
  for (const p of people) {
    const key = kind === "house" ? p.residence : p.classYear;
    if (!key) continue;
    const group = byKey.get(key);
    if (!group) continue;
    group.fromMembers += p.xp;
    group.counters.sessions += p.counters.sessions;
    group.counters.partners += p.counters.partners;
    group.counters.km += p.counters.km;
  }

  const all = [...byKey.values()].map((h) => {
    h.counters.km = Math.round(h.counters.km * 10) / 10;
    const fromChallenges = houseChallengeXp(h.counters);
    const xp = h.fromMembers + fromChallenges;
    return { ...h, fromChallenges, xp, progress: houseLevelProgress(xp) };
  });

  return rankHouses(all);
}

/**
 * Ranks a set of houses among THEMSELVES. Houses and Yard dorms are ranked
 * separately on screen — freshmen have been on campus three weeks and should
 * not be measured against a house of seniors — so the rank has to be worked out
 * after the split, not before it.
 */
export function rankHouses(rows: HouseStanding[]): HouseStanding[] {
  const sorted = [...rows].sort((a, b) => b.xp - a.xp || a.key.localeCompare(b.key));
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

/* ═══════════════════════  campus statistics  ═══════════════════════ */

export type CampusStats = {
  people: number; // how many have logged anything at all
  sessions: number;
  withPartner: number;
  km: number;
  partnerships: number;
  topLevel: number;
  busiestHouse: string | null;
  avgSessions: number;
  totalXp: number;
};

/*
  EVERYTHING THE LEAGUE NEEDS, IN ONE ROUND OF READS.

  The per-person counters are read ONCE and then reused for the people board,
  the house levels, the year levels and the campus statistics. Fetching them
  again per section would be three more copies of the same query for a screen
  that shows one moment in time.
*/
/** One house's week, for the race. `xp` is its ALL-TIME total — the gate. */
export type HouseWeek = {
  key: string;
  kind: ResidenceKind;
  counters: EventCounters;
  xp: number;
  isMine: boolean;
};

export type LeagueData = {
  me: LeagueRow | null;
  people: LeagueRow[];
  houses: HouseStanding[];
  years: HouseStanding[];
  stats: CampusStats;
  /** Monday to now — what the weekly events are measured on. */
  week: { mine: EventCounters; houses: HouseWeek[] };
};

/**
 * What the screen renders when a read fails. It must still SETTLE — a section
 * stuck on "Counting…" forever tells nobody that anything went wrong.
 */
export function emptyLeague(): LeagueData {
  return {
    me: null,
    people: [],
    houses: [],
    years: [],
    stats: {
      people: 0,
      sessions: 0,
      withPartner: 0,
      km: 0,
      partnerships: 0,
      topLevel: 1,
      busiestHouse: null,
      avgSessions: 0,
      totalXp: 0,
    },
    week: { mine: emptyEventCounters, houses: [] },
  };
}

export async function fetchLeague(universityKey: string): Promise<LeagueData> {
  const since = weekStartISO();
  const [people, weekPeople] = await Promise.all([
    fetchLeagueBoard(universityKey, 1000),
    fetchLeagueBoard(universityKey, 1000, since),
  ]);
  const [houseGroups, yearGroups] = await Promise.all([
    fetchGroupBoard("house", "all", 1),
    fetchGroupBoard("year", "all", 1),
  ]);
  const houses = buildGroupLeague("house", people, houseGroups);
  const years = buildGroupLeague("year", people, yearGroups);
  return {
    // league_counters always returns the caller's own row, even at zero, so
    // there is no separate read for "me".
    me: people.find((p) => p.isMe) ?? null,
    people,
    houses,
    years,
    stats: campusStats(people, houses),
    week: buildWeek(weekPeople, houses),
  };
}

/**
 * The week, folded up two ways: your own counters, and every house's.
 *
 * A house's MEMBERS and its XP come from the all-time standing — how many
 * people live there does not change on a Monday, and the level that opens the
 * race is the one the house has built over all time, not this week's effort.
 * Everything else is counted from Monday.
 */
function buildWeek(weekPeople: LeagueRow[], houses: HouseStanding[]): LeagueData["week"] {
  const mineRow = weekPeople.find((p) => p.isMe);
  const mine: EventCounters = {
    ...emptyEventCounters,
    sessions: mineRow?.counters.sessions ?? 0,
    partners: mineRow?.counters.partners ?? 0,
    km: mineRow?.counters.km ?? 0,
    gyms: mineRow?.counters.gyms ?? 0,
  };

  const byKey = new Map<string, HouseWeek>();
  for (const h of houses) {
    byKey.set(h.key, {
      key: h.key,
      kind: h.kind,
      counters: { ...emptyEventCounters, members: h.counters.members },
      xp: h.xp,
      isMine: h.isMine,
    });
  }
  for (const p of weekPeople) {
    if (!p.residence) continue;
    const house = byKey.get(p.residence);
    if (!house) continue;
    house.counters.sessions += p.counters.sessions;
    house.counters.partners += p.counters.partners;
    house.counters.km += p.counters.km;
    // "Turnout" asks how many members trained AT ALL this week, so a person
    // counts once however many times they went.
    if (p.counters.sessions > 0) house.counters.actives += 1;
  }

  const list = [...byKey.values()].map((h) => ({
    ...h,
    counters: { ...h.counters, km: Math.round(h.counters.km * 10) / 10 },
  }));
  return { mine, houses: list };
}

/** The whole campus in one glance, worked out from what is already loaded. */
export function campusStats(people: LeagueRow[], houses: HouseStanding[]): CampusStats {
  const training = people.filter((p) => p.counters.sessions > 0);
  const sessions = training.reduce((n, p) => n + p.counters.sessions, 0);
  const withPartner = training.reduce(
    (n, p) => n + p.sessionsBy.partner + p.sessionsBy.newPartner,
    0,
  );
  // Each pairing is logged from both sides when both people log it, so this is
  // the number of partner LINKS, not of distinct pairs — which is why it is
  // labelled the way it is on screen.
  const partnerships = training.reduce((n, p) => n + p.counters.partners, 0);
  const busiest = [...houses].sort((a, b) => b.counters.sessions - a.counters.sessions)[0];
  return {
    people: training.length,
    sessions,
    withPartner,
    km: Math.round(training.reduce((n, p) => n + p.counters.km, 0) * 10) / 10,
    partnerships,
    topLevel: training.reduce((n, p) => Math.max(n, p.progress.level), 1),
    busiestHouse: busiest && busiest.counters.sessions > 0 ? busiest.key : null,
    avgSessions: training.length ? Math.round((sessions / training.length) * 10) / 10 : 0,
    totalXp: training.reduce((n, p) => n + p.xp, 0),
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
