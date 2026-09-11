/*
  LEADERBOARDS — typed client helpers for db/leaderboards.sql.
  ---------------------------------------------------------------------------
  Every call goes through a SECURITY DEFINER function that counts everyone but
  only ever returns a name, initials, house, class year and a NUMBER. No
  workout, note, date or photo ever leaves the database for a leaderboard, so a
  board can never be read backwards into "what did that person actually do".

  A score is POINTS for the period. The database counts sessions and splits
  them three ways — alone, with a partner, with somebody new — and what each
  one is WORTH lives in lib/points.ts as data. The monthly board resets, and
  the reset is the feature rather than an implementation detail: a table nobody
  can still win is a table nobody plays. (`semester` is still a period the
  database understands; the screen only offers month and all time, because in
  the first weeks of a term "this semester" and "this month" are the same
  window and reading the same numbers twice explains nothing.)

  Every row keeps its session counts alongside its points, because a score
  nobody can check is a score nobody trusts — the screens always show what the
  points were made of.

  Nothing here invents numbers. With no database configured every board comes
  back empty and the screens say so, rather than showing a convincing fake.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { classYears, houses, residenceLabel, yardDorms } from "@/lib/onboarding";
import { getGymByName } from "@/lib/gyms";
import { dormColors } from "@/lib/cohorts";
import { rateArgs, sessionPoints, type SessionKinds } from "@/lib/points";

/* ─────────────────────────────  types  ───────────────────────────── */

export type Period = "month" | "semester" | "all";

// The individual boards. Narrow either of them to one house or dorm with
// `residence` — that is what makes a house on the team board openable.
export type PeopleBoard = "campus" | "partners";
// The team boards.
export type GroupBoard = "house" | "year";

export type LeaderRow = {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  residence: string | null;
  classYear: string | null;
  /** Points — except on the partners board, where it is a head count. */
  score: number;
  /** What the score was made of. */
  kinds: SessionKinds;
  /** Different people trained with this period. */
  partners: number;
  isMe: boolean;
};

export type GroupRow = {
  rank: number;
  key: string; // "Winthrop" / "'27"
  members: number;
  actives: number; // how many of them trained this period
  sessions: number;
  points: number;
  /** Points per member — what the board is ranked on. */
  avgPoints: number;
  isMine: boolean;
};

export type Standing = {
  points: number;
  sessions: number;
  kinds: SessionKinds;
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
  /** POINTS needed to draw level with the person above you. */
  nextGap: number | null;
  nextScope: "house" | "campus" | null;
};

/*
  NO MINIMUM ON THE PLAIN BOARDS. Every house, every first-year dorm and every
  class year is on its board, always — including the ones with nobody signed
  up, which come last and read "0 pts · nobody yet". With a handful of test
  accounts a board of two houses looks broken; a board of twelve, most at
  zero, looks like a race that has just started, which is the truth. The one
  place a minimum still gates anything is the interhouse race (lib/events.ts,
  HOUSE_RACE_MIN_ACTIVE).
*/

/* ────────────────────  the two ways to read a team board  ──────────────────── */

/*
  A house board can be read two honest ways and they disagree, which is exactly
  why the screen now offers both instead of quietly picking one:

    • per member — total points divided by everyone signed up, so a house of
      four hundred can't win on size alone. It measures whether a house is
      actually USING the app.
    • total      — the raw pile of points the house put on the board. It is the
      number people shout about, and the one a big house deserves credit for.

  The database still does the counting; it returns EVERY qualifying group with
  both numbers on it (there is no limit on a team board — twelve houses, four
  dorms, four years), so switching between the two is a re-sort here rather
  than a second round trip. Ties share a rank and skip the next number, exactly
  as Postgres's rank() does in db/leaderboards.sql, so the two orderings can
  never describe ranks differently.
*/
export type GroupMetric = "perMember" | "total";

export const GROUP_METRICS: {
  key: GroupMetric;
  label: string;
  /** Fits in a segmented pill on a narrow phone. */
  short: string;
  /** The unit written under the score on a row. */
  unit: string;
}[] = [
  { key: "perMember", label: "Points per member", short: "Per member", unit: "per member" },
  { key: "total", label: "Total points", short: "Total", unit: "pts" },
];

/** The number the board is ranked on, for one metric. */
export function groupScore(row: GroupRow, metric: GroupMetric): number {
  return metric === "total" ? row.points : row.avgPoints;
}

/** How that number is written on a row. */
export function groupScoreLabel(row: GroupRow, metric: GroupMetric): string {
  return metric === "total"
    ? row.points.toLocaleString("en-US")
    : row.avgPoints.toFixed(1);
}

/** Re-sorts and re-ranks a team board for the chosen metric. */
export function rankGroups(rows: GroupRow[], metric: GroupMetric): GroupRow[] {
  const sorted = [...rows].sort(
    (a, b) =>
      groupScore(b, metric) - groupScore(a, metric) ||
      // The other measure breaks a tie before the name does.
      (metric === "total" ? b.avgPoints - a.avgPoints : b.points - a.points) ||
      a.key.localeCompare(b.key),
  );
  let rank = 0;
  let previous: number | null = null;
  return sorted.map((row, index) => {
    const score = groupScore(row, metric);
    if (previous === null || score !== previous) rank = index + 1;
    previous = score;
    return { ...row, rank };
  });
}

/* ─────────────────────────────  labels  ───────────────────────────── */

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
  return getGymByName(key)?.houseColors?.primary ?? dormColors(key)?.primary ?? null;
}

/**
 * BOTH of a group's colours, for its crest. A house wears its own; a first-year
 * dorm wears the entry-year cohort's (lib/cohorts.ts), so the Dorms board has
 * no empty crests. Null for anything else (a class year, off campus).
 */
export function houseCrest(
  key: string | null | undefined,
): { primary: string; secondary: string } | null {
  if (!key) return null;
  const c = getGymByName(key)?.houseColors ?? dormColors(key);
  return c ? { primary: c.primary, secondary: c.secondary } : null;
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
  solo: number;
  partner: number;
  new_partner: number;
  partners: number;
  is_me: boolean | null;
};

/**
 * `residence` narrows the board to the people living in one house or dorm —
 * which is exactly what a house's points ARE, so opening a house shows who
 * put them there. Anybody may open anybody's house.
 */
export async function fetchPeopleBoard(
  board: PeopleBoard,
  period: Period,
  limit = 50,
  residence?: string,
): Promise<LeaderRow[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await createClient().rpc("leaderboard_people", {
    board,
    period,
    limit_n: limit,
    ...rateArgs,
    residence_filter: residence ?? null,
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
    kinds: { solo: r.solo, partner: r.partner, newPartner: r.new_partner },
    partners: r.partners,
    isMe: !!r.is_me,
  }));
}

type GroupRpcRow = {
  rank: number;
  key: string;
  members: number;
  actives: number;
  sessions: number;
  points: number;
  avg_points: string | number; // numeric comes back as a string
  is_mine: boolean | null;
};

/**
 * `onlyKeys` limits the board to those group names — how the twelve Houses and
 * the first-year Yard dorms stay in separate competitions. The lists are data
 * (lib/onboarding.ts), so the database never learns a house name.
 *
 * EVERY KEY COMES BACK. The database can only report groups that have at least
 * one profile in them; a house nobody has joined yet is filled in here as a
 * zero row (members 0), so the board is always the whole list. For the years
 * board the list is the class years themselves.
 */
export async function fetchGroupBoard(
  kind: GroupBoard,
  period: Period,
  onlyKeys?: string[],
): Promise<GroupRow[]> {
  const allKeys = onlyKeys ?? (kind === "year" ? classYears : []);
  if (!hasSupabaseEnv()) return fillMissingGroups([], allKeys);
  const { data, error } = await createClient().rpc("leaderboard_groups", {
    kind,
    period,
    min_members: 0,
    ...rateArgs,
    only_keys: onlyKeys ?? null,
  });
  if (error || !data) return fillMissingGroups([], allKeys);
  const rows = (data as GroupRpcRow[]).map((r) => ({
    rank: r.rank,
    key: r.key,
    members: r.members,
    actives: r.actives,
    sessions: r.sessions,
    points: r.points,
    avgPoints: Number(r.avg_points),
    isMine: !!r.is_mine,
  }));
  return fillMissingGroups(rows, allKeys);
}

/** Add a zero row for every group the database had nobody in. Ranked last, level. */
function fillMissingGroups(rows: GroupRow[], keys: string[]): GroupRow[] {
  const have = new Set(rows.map((r) => r.key));
  const missing = keys.filter((k) => !have.has(k));
  if (missing.length === 0) return rows;
  const lastRank = rows.length + 1;
  return [
    ...rows,
    ...missing.map((key) => ({
      rank: lastRank,
      key,
      members: 0,
      actives: 0,
      sessions: 0,
      points: 0,
      avgPoints: 0,
      isMine: false,
    })),
  ];
}

/** True for a group with nobody signed up at all — the "nobody yet" row. */
export const nobodyYet = (row: GroupRow) => row.members === 0;

type StandingRpcRow = {
  points: number;
  sessions: number;
  solo: number;
  partner: number;
  new_partner: number;
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
  const { data, error } = await createClient().rpc("my_leaderboard_standing", {
    period,
    ...rateArgs,
    // Both lists, because we don't yet know where this person lives. The
    // database ranks their residence against whichever one it belongs to, so
    // the rank on the Profile strip is the rank on the board they'll open.
    dorm_keys: yardDorms,
    house_keys: houses,
  });
  if (error || !data) return null;
  const r = (data as StandingRpcRow[])[0];
  if (!r) return null;
  return {
    points: r.points ?? 0,
    sessions: r.sessions ?? 0,
    kinds: {
      solo: r.solo ?? 0,
      partner: r.partner ?? 0,
      newPartner: r.new_partner ?? 0,
    },
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
 * The nudge that makes the whole feature worth having: "40 pts and you pass
 * Marcus" is a reason to train tonight in a way that "you are 7th" is not.
 * Returns null when there is nobody above you (or nothing logged yet).
 *
 * A points gap on its own is not actionable, so when the gap is small enough
 * to close it also says the CHEAPEST way to — which is always the sociable
 * one, because that is what the multipliers are for.
 */
export function nextUpLine(s: Standing | null): string | null {
  if (!s || !s.nextName || !s.nextGap || s.nextGap < 1) return null;
  const where = s.nextScope === "house" ? "in your house" : "on campus";
  const lead = `${s.nextGap} pts to pass ${s.nextName} ${where}`;
  const runs = Math.ceil(s.nextGap / sessionPoints.newPartner);
  // Beyond three it stops being tonight's problem and reads as nagging.
  if (runs > 3) return lead;
  return `${lead} — ${runs} session${runs === 1 ? "" : "s"} with someone new`;
}
