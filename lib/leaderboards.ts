/*
  LEADERBOARDS — typed client helpers for db/leaderboards.sql.
  ---------------------------------------------------------------------------
  Every call goes through a SECURITY DEFINER function that counts everyone but
  only ever returns a name, initials, house, class year and a NUMBER. No
  workout, note, date or photo ever leaves the database for a leaderboard, so a
  board can never be read backwards into "what did that person actually do".

  A score is a SESSION COUNT for the period, where one day counts at most twice
  (see the SQL). Boards reset every month — the reset is the feature, not an
  implementation detail: a table nobody can still win is a table nobody plays.

  Nothing here invents numbers. With no database configured every board comes
  back empty and the screens say so, rather than showing a convincing fake.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { residenceLabel } from "@/lib/onboarding";
import { getGymByName } from "@/lib/gyms";

/* ─────────────────────────────  types  ───────────────────────────── */

export type Period = "week" | "month" | "all";

// The individual boards. `house` always means the CALLER's own house.
export type PeopleBoard = "campus" | "house" | "partners";
// The team boards.
export type GroupBoard = "house" | "year";

export type LeaderRow = {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  residence: string | null;
  classYear: string | null;
  score: number;
  isMe: boolean;
};

export type GroupRow = {
  rank: number;
  key: string; // "Winthrop" / "'27"
  members: number;
  actives: number; // how many of them trained this period
  sessions: number;
  avgSessions: number;
  isMine: boolean;
};

export type Standing = {
  sessions: number;
  partners: number;
  residence: string | null;
  classYear: string | null;
  campusRank: number | null; // null until you've logged something this period
  campusTotal: number;
  houseRankIn: number | null;
  houseActives: number;
  houseRank: number | null;
  houseTotal: number;
  yearRank: number | null;
  yearTotal: number;
  nextName: string | null;
  nextGap: number | null;
  nextScope: "house" | "campus" | null;
};

/*
  A house or class year needs this many signed-up members before it appears on a
  team board. One very keen person in an otherwise empty house would otherwise
  top the table on their own, which reads as broken rather than impressive.
  The same number is hard-coded in my_leaderboard_standing() so the rank on the
  Profile strip is the rank on the board.
*/
export const MIN_GROUP_MEMBERS = 3;

/* ─────────────────────────────  labels  ───────────────────────────── */

export const periodLabel: Record<Period, string> = {
  week: "This week",
  month: "This month",
  all: "All time",
};

/** "Winthrop" → "Winthrop House"; "'27" → "Class of '27". */
export function groupLabel(kind: GroupBoard, key: string): string {
  return kind === "year" ? `Class of ${key}` : residenceLabel(key);
}

/**
 * A house's own identity color, from `lib/gyms.ts` — CONTENT data, applied via
 * inline style. This is the rule-1 exception the lineup and gym screens use;
 * it is never a hardcoded color inside a component.
 */
export function houseColor(key: string | null | undefined): string | null {
  if (!key) return null;
  return getGymByName(key)?.houseColors?.primary ?? null;
}

/** "3 sessions" / "1 session", or "3 partners" on the partners board. */
export function scoreLabel(board: PeopleBoard, score: number): string {
  const noun = board === "partners" ? "partner" : "session";
  return `${score} ${noun}${score === 1 ? "" : "s"}`;
}

/* ─────────────────────────────  reads  ───────────────────────────── */

type PeopleRpcRow = {
  rank: number;
  user_id: string;
  name: string;
  initials: string;
  residence: string | null;
  class_year: string | null;
  score: number;
  is_me: boolean | null;
};

export async function fetchPeopleBoard(
  board: PeopleBoard,
  period: Period,
  limit = 50,
): Promise<LeaderRow[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await createClient().rpc("leaderboard_people", {
    board,
    period,
    limit_n: limit,
  });
  if (error || !data) return [];
  return (data as PeopleRpcRow[]).map((r) => ({
    rank: r.rank,
    userId: r.user_id,
    name: r.name,
    initials: r.initials,
    residence: r.residence,
    classYear: r.class_year,
    score: r.score,
    isMe: !!r.is_me,
  }));
}

type GroupRpcRow = {
  rank: number;
  key: string;
  members: number;
  actives: number;
  sessions: number;
  avg_sessions: string | number; // numeric comes back as a string
  is_mine: boolean | null;
};

export async function fetchGroupBoard(
  kind: GroupBoard,
  period: Period,
): Promise<GroupRow[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await createClient().rpc("leaderboard_groups", {
    kind,
    period,
    min_members: MIN_GROUP_MEMBERS,
  });
  if (error || !data) return [];
  return (data as GroupRpcRow[]).map((r) => ({
    rank: r.rank,
    key: r.key,
    members: r.members,
    actives: r.actives,
    sessions: r.sessions,
    avgSessions: Number(r.avg_sessions),
    isMine: !!r.is_mine,
  }));
}

type StandingRpcRow = {
  sessions: number;
  partners: number;
  residence: string | null;
  class_year: string | null;
  campus_rank: number | null;
  campus_total: number;
  house_rank_in: number | null;
  house_actives: number;
  house_rank: number | null;
  house_total: number;
  year_rank: number | null;
  year_total: number;
  next_name: string | null;
  next_gap: number | null;
  next_scope: string | null;
};

/** The signed-in user's own standing. Null when there's nothing to show yet. */
export async function fetchStanding(period: Period): Promise<Standing | null> {
  if (!hasSupabaseEnv()) return null;
  const { data, error } = await createClient().rpc("my_leaderboard_standing", { period });
  if (error || !data) return null;
  const r = (data as StandingRpcRow[])[0];
  if (!r) return null;
  return {
    sessions: r.sessions ?? 0,
    partners: r.partners ?? 0,
    residence: r.residence,
    classYear: r.class_year,
    campusRank: r.campus_rank,
    campusTotal: r.campus_total ?? 0,
    houseRankIn: r.house_rank_in,
    houseActives: r.house_actives ?? 0,
    houseRank: r.house_rank,
    houseTotal: r.house_total ?? 0,
    yearRank: r.year_rank,
    yearTotal: r.year_total ?? 0,
    nextName: r.next_name,
    nextGap: r.next_gap,
    nextScope: r.next_scope === "house" || r.next_scope === "campus" ? r.next_scope : null,
  };
}

/**
 * The nudge that makes the whole feature worth having: "2 more and you pass
 * Marcus" is a reason to train tonight in a way that "you are 7th" is not.
 * Returns null when there is nobody above you (or nothing logged yet).
 */
export function nextUpLine(s: Standing | null): string | null {
  if (!s || !s.nextName || !s.nextGap || s.nextGap < 1) return null;
  const where = s.nextScope === "house" ? "in your house" : "on campus";
  return `${s.nextGap} more session${s.nextGap === 1 ? "" : "s"} to pass ${s.nextName} ${where}`;
}
