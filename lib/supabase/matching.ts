/*
  Typed client helpers for the partner-matching RPC functions defined in
  db/matching.sql (match_browse / match_session_search / match_pair).

  These call Supabase RPC from the browser (Client Components). The DB functions
  are SECURITY DEFINER + granted to `authenticated`, so a signed-in user can call
  them.

  Each row carries TWO kinds of "why": the score breakdown (how many points each
  component contributed) and the FACTS behind those points — the actual shared
  interests, concentration, country, gym. The UI shows facts, never points, so a
  reason on screen is always something real out of the database — see
  lib/matchReasons.ts, which turns a row into the wording shown to the user.
*/
import { createClient } from "@/lib/supabase/client";

// --- Score breakdown -------------------------------------------------------
// Affinity (50): interests 18 | concentration 12 | origin 12 | languages 8
// Logistics (50): activity 12 | gym 12 | level 12 | schedule 8 | training 6
// (session search drops `schedule`, so it's optional below.)
export type MatchBreakdown = {
  interests: number;
  concentration: number;
  origin: number;
  languages: number;
  gym: number;
  level: number;
  activity: number;
  schedule?: number; // present for browse + pair, omitted for session search
  training: number;
};

/*
  What the two people actually have in common. Every field is an overlap with
  the SEARCHER, so nothing here is private to the candidate — `sharedInterests`
  is the intersection, not their full list.
*/
export type MatchFacts = {
  interests: string[];
  languages: string[];
  concentration: string | null; // set only when it's the same
  country: string | null; // same country
  region: string | null; // same region, different country
  gym: string | null; // the best-ranked gym they both list
  // How the experience levels relate: same, one step apart, or a deliberate
  // mentor pairing. Null when either person never gave a level.
  levelNote: "same" | "close" | "mentor" | null;
  /*
    The activity the two of you share — 'gym' | 'running' | 'cardio' | 'other'
    — and in what shape, because "you both run" and "she runs too" are not the
    same sentence:
      both_main  — it's the main thing for both of you
      their_main — it's their main thing, one of your extras
      they_also  — it's YOUR main thing, one of their extras
      both_side  — you both do it on the side
    Null when you have no activity in common at all.
  */
  activity: string | null;
  activityNote: "both_main" | "their_main" | "they_also" | "both_side" | null;
  // How often THEY do it, as they answered it ("3x"). Only their extras carry
  // a frequency — a main activity is never asked for one.
  activityFreq: string | null;
};

export type Match = {
  userId: string; // the candidate's profile id
  name: string;
  level: string | null; // 'beginner' | 'intermediate' | 'advanced' | null
  residence: string | null; // their house / dorm, for the card subtitle
  classYear: string | null; // "'27" — the card shows it as Fr / So / Jr / Sr
  mainActivity: string | null; // 'gym' | 'running' | 'cardio' | 'other'
  score: number; // browse + pair: out of 100, session search: out of 92
  breakdown: MatchBreakdown;
  facts: MatchFacts;
};

/** The optional narrowing every match surface shares. Null = don't narrow. */
export type MatchFilters = {
  // What they do — main activity OR one of their extras. Browse could not ask
  // this until now, which was its biggest gap: you could see every lifter on
  // campus but never say "show me the runners".
  activity?: string | null;
  concentration?: string | null;
  interests?: string[] | null; // people into AT LEAST ONE of these
  gym?: string | null; // gym name exactly as in lib/gyms.ts
  level?: string | null; // 'beginner' | 'intermediate' | 'advanced'
  gender?: string | null; // 'male' | 'female'
};

export type SessionMatchParams = MatchFilters & {
  userId: string;
  activity: string; // 'gym' | 'running' | 'cardio' | 'other' (required)
  day: string; // 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun' (required)
  hour: number; // 24h clock, 30-min steps OK (15 = 3 PM, 15.5 = 3:30 PM) (required)
  /*
    How far either side of that hour still counts. Two by default; the screen
    asks again with a whole day when the exact hour finds nobody, because three
    people training later that day is a better answer than an empty list.
  */
  windowHours?: number;
};

// Raw row shape returned by the SQL functions (snake_case, schedule optional).
type RpcRow = {
  candidate_id: string;
  name: string;
  level: string | null;
  residence: string | null;
  class_year: string | null;
  main_activity: string | null;
  score: number | string;
  interests_pts: number | string;
  concentration_pts: number | string;
  origin_pts: number | string;
  languages_pts: number | string;
  gym_pts: number | string;
  level_pts: number | string;
  schedule_pts?: number | string;
  training_pts: number | string;
  shared_interests: string[] | null;
  shared_languages: string[] | null;
  same_concentration: string | null;
  shared_country: string | null;
  shared_region: string | null;
  shared_gym: string | null;
  level_note: string | null;
  activity_pts: number | string;
  shared_activity: string | null;
  activity_note: string | null;
  their_activity_freq: string | null;
};

const num = (v: number | string | undefined) => (v == null ? 0 : Number(v));

// Only the three notes the database can emit survive the crossing; anything
// else becomes null rather than reaching the UI as an unknown wording.
const levelNote = (v: string | null): MatchFacts["levelNote"] =>
  v === "same" || v === "close" || v === "mentor" ? v : null;

// Same guard for the activity shape: an unknown wording never reaches the UI.
const activityNote = (v: string | null): MatchFacts["activityNote"] =>
  v === "both_main" || v === "their_main" || v === "they_also" || v === "both_side"
    ? v
    : null;

function toMatch(r: RpcRow): Match {
  const breakdown: MatchBreakdown = {
    interests: num(r.interests_pts),
    concentration: num(r.concentration_pts),
    origin: num(r.origin_pts),
    languages: num(r.languages_pts),
    gym: num(r.gym_pts),
    level: num(r.level_pts),
    activity: num(r.activity_pts),
    training: num(r.training_pts),
  };
  if (r.schedule_pts != null) breakdown.schedule = num(r.schedule_pts);
  return {
    userId: r.candidate_id,
    name: r.name,
    level: r.level,
    residence: r.residence,
    classYear: r.class_year,
    mainActivity: r.main_activity,
    score: num(r.score),
    breakdown,
    facts: {
      interests: r.shared_interests ?? [],
      languages: r.shared_languages ?? [],
      concentration: r.same_concentration,
      country: r.shared_country,
      region: r.shared_region,
      gym: r.shared_gym,
      levelNote: levelNote(r.level_note),
      activity: r.shared_activity,
      activityNote: activityNote(r.activity_note),
      activityFreq: r.their_activity_freq,
    },
  };
}

// An empty interests array means "no filter", not "match nobody" — the RPC
// treats null that way, so normalise before sending.
const arrayOrNull = (v: string[] | null | undefined) => (v && v.length > 0 ? v : null);

/** Every compatible partner, scored out of 100, best first. Filters optional. */
export async function getBrowseMatches(
  userId: string,
  filters: MatchFilters = {},
): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_browse", {
    searcher_id: userId,
    concentration_filter: filters.concentration ?? null,
    interests_filter: arrayOrNull(filters.interests),
    gym_filter: filters.gym ?? null,
    level_filter: filters.level ?? null,
    gender_filter: filters.gender ?? null,
    activity_filter: filters.activity ?? null,
  });
  if (error) throw new Error(`getBrowseMatches failed: ${error.message}`);
  return (data as RpcRow[]).map(toMatch);
}

/**
 * Partners for an activity + day, free within ±2h of a chosen hour, scored out
 * of 92 (the schedule component is dropped — the slot is already fixed).
 */
export async function getSessionMatches(params: SessionMatchParams): Promise<Match[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_session_search", {
    searcher_id: params.userId,
    activity_filter: params.activity,
    target_day: params.day,
    target_hour: params.hour,
    window_hours: params.windowHours ?? 2,
    gym_filter: params.gym ?? null,
    level_filter: params.level ?? null,
    gender_filter: params.gender ?? null,
    concentration_filter: params.concentration ?? null,
    interests_filter: arrayOrNull(params.interests),
  });
  if (error) throw new Error(`getSessionMatches failed: ${error.message}`);
  return (data as RpcRow[]).map(toMatch);
}

/**
 * The same scored row for ONE person — what powers "Why you match" on their
 * profile. Null when the two aren't a valid pairing at all (different school,
 * they train solo, gender preferences rule it out).
 */
export async function getPairMatch(
  userId: string,
  otherId: string,
): Promise<Match | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("match_pair", {
    searcher_id: userId,
    other_id: otherId,
  });
  if (error) throw new Error(`getPairMatch failed: ${error.message}`);
  const rows = data as RpcRow[];
  return rows.length > 0 ? toMatch(rows[0]) : null;
}
