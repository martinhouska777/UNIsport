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

export type Match = {
  userId: string; // the candidate's profile id
  name: string;
  score: number; // browse: out of 100, session search: out of 92
  breakdown: MatchBreakdown;
};

export type SessionMatchParams = {
  userId: string;
  gym: string; // gym name exactly as in lib/gyms.ts
  day: string; // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'
  block: string; // 'Early AM' | 'AM' | 'Midday' | 'PM' | 'Late PM'
  level?: string | null; // 'beginner' | 'intermediate' | 'advanced' | null
  gender?: string | null; // 'male' | 'female' | null
};

// Raw row shape returned by the SQL functions (snake_case, schedule optional).
type RpcRow = {
  candidate_id: string;
  name: string;
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
  return { userId: r.candidate_id, name: r.name, score: num(r.score), breakdown };
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

/** Function 2 — partners for a fixed gym + day + time block, scored out of 92. */
export async function getSessionMatches(params: SessionMatchParams): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_session_search", {
    searcher_id: params.userId,
    target_gym: params.gym,
    target_day: params.day,
    target_block: params.block,
    level_filter: params.level ?? null,
    gender_filter: params.gender ?? null,
  });
  if (error) throw new Error(`getSessionMatches failed: ${error.message}`);
  return (data as RpcRow[]).map(toMatch);
}
