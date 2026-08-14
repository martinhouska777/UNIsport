/*
  Typed client helpers for the partner-matching RPC functions defined in
  db/matching.sql (match_browse / match_session_search).

  These call Supabase RPC from the browser (Client Components). The DB functions
  are SECURITY DEFINER + granted to `authenticated`, so a signed-in user can call
  them; the score breakdown is returned for debugging / UI display.
*/
import { createClient } from "@/lib/supabase/client";

// --- Score breakdown -------------------------------------------------------
// Affinity (54): interests 22 | concentration 12 | origin 12 | languages 8
// Logistics (46): gym 20 | level 12 | schedule 8 | training 6
// (session search drops `schedule`, so it's optional below.)
export type MatchBreakdown = {
  interests: number;
  concentration: number;
  origin: number;
  languages: number;
  gym: number;
  level: number;
  schedule?: number; // present for browse, omitted for session search
  training: number;
};

/*
  COMPATIBILITY TIERS
  The score is a sum over eight overlapping dimensions, so even an excellent
  partner — trains at your gym, your level, free when you are — collects only
  about a third of the theoretical maximum. Rendering that as "33%" reads as a
  failed match rather than a good one, so the raw number never reaches the UI:
  it becomes one of three plain-English tiers instead. Anything below the
  bottom tier isn't worth putting on screen at all.

  Tones are theme tokens (rule 1), same approach as CROWD_LEVELS in lib/gymSocial.
*/
export type MatchTier = {
  key: "strong" | "good" | "worth";
  label: string;
  tone: string;
};

// Ordered strongest first; `minPercent` is a share of that search's max score.
const TIERS: (MatchTier & { minPercent: number })[] = [
  { key: "strong", label: "Strong fit", tone: "text-success", minPercent: 30 },
  { key: "good", label: "Good fit", tone: "text-accent", minPercent: 18 },
  { key: "worth", label: "Worth a try", tone: "text-muted", minPercent: 10 },
];

/** The tier a score falls in, or null when it's too weak to recommend. */
export function matchTier(score: number, max: number): MatchTier | null {
  const percent = max > 0 ? (score / max) * 100 : 0;
  return TIERS.find((t) => percent >= t.minPercent) ?? null;
}

/** Look a tier up by key — for screens that receive it as a URL parameter. */
export function tierByKey(key: string | null): MatchTier | null {
  return TIERS.find((t) => t.key === key) ?? null;
}

/**
 * Drops results too weak to recommend. Rows already arrive sorted best-first,
 * so this only ever trims the tail.
 */
export function rankedMatches(rows: Match[], max: number): Match[] {
  return rows.filter((m) => matchTier(m.score, max) !== null);
}

export type Match = {
  userId: string; // the candidate's profile id
  name: string;
  level: string | null; // 'beginner' | 'intermediate' | 'advanced' | null
  residence: string | null; // their house / dorm, for the card subtitle
  score: number; // browse: out of 100, session search: out of 92
  breakdown: MatchBreakdown;
};

export type SessionMatchParams = {
  userId: string;
  activity: string; // 'gym' | 'running' | 'cardio' | 'other' (required)
  day: string; // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' (required)
  hour: number; // 24h clock, 30-min steps OK (15 = 3 PM, 15.5 = 3:30 PM) (required)
  gym?: string | null; // optional: gym name exactly as in lib/gyms.ts
  level?: string | null; // optional: 'beginner' | 'intermediate' | 'advanced'
  gender?: string | null; // optional: 'male' | 'female'
};

// Raw row shape returned by the SQL functions (snake_case, schedule optional).
type RpcRow = {
  candidate_id: string;
  name: string;
  level: string | null;
  residence: string | null;
  score: number | string;
  interests_pts: number | string;
  concentration_pts: number | string;
  origin_pts: number | string;
  languages_pts: number | string;
  gym_pts: number | string;
  level_pts: number | string;
  schedule_pts?: number | string;
  training_pts: number | string;
};

const num = (v: number | string | undefined) => (v == null ? 0 : Number(v));

function toMatch(r: RpcRow): Match {
  const breakdown: MatchBreakdown = {
    interests: num(r.interests_pts),
    concentration: num(r.concentration_pts),
    origin: num(r.origin_pts),
    languages: num(r.languages_pts),
    gym: num(r.gym_pts),
    level: num(r.level_pts),
    training: num(r.training_pts),
  };
  if (r.schedule_pts != null) breakdown.schedule = num(r.schedule_pts);
  return {
    userId: r.candidate_id,
    name: r.name,
    level: r.level,
    residence: r.residence,
    score: num(r.score),
    breakdown,
  };
}

/** Function 1 — all compatible partners, scored out of 100, best first. */
export async function getBrowseMatches(userId: string): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_browse", {
    searcher_id: userId,
  });
  if (error) throw new Error(`getBrowseMatches failed: ${error.message}`);
  return (data as RpcRow[]).map(toMatch);
}

/**
 * Function 2 — partners for an activity + day, free within ±2h of a chosen
 * hour, scored out of 92. Gym/level/gender are optional filters (omit = any).
 */
export async function getSessionMatches(params: SessionMatchParams): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_session_search", {
    searcher_id: params.userId,
    activity_filter: params.activity,
    target_day: params.day,
    target_hour: params.hour,
    gym_filter: params.gym ?? null,
    level_filter: params.level ?? null,
    gender_filter: params.gender ?? null,
  });
  if (error) throw new Error(`getSessionMatches failed: ${error.message}`);
  return (data as RpcRow[]).map(toMatch);
}
