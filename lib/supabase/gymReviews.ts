/*
  GYM REVIEWS — three scores and a comment, per person, per gym.
  ------------------------------------------------------------------------
  Typed helpers for the SECURITY DEFINER RPCs in db/gym_reviews.sql. Everything
  here is REAL: the score on a gym page is the average of rows students wrote,
  never the placeholder `rating` still sitting in lib/gyms.ts.

  Your own row is the one you can write — the database enforces that, not this
  file. Reviews are signed with the author's name and photo, because a comment
  about a named campus gym from nobody in particular is worth nothing.

  Falls back to localStorage when Supabase env isn't configured (the same
  approach as lib/supabase/gymCrowd.ts), so the app still runs with no database
  — there the "campus" is just this browser, and you are the only reviewer.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

/** The three things a gym is scored on. Data, so a fourth is one line here. */
export const REVIEW_CATEGORIES = [
  { key: "equipment", label: "Equipment" },
  { key: "cleanliness", label: "Cleanliness" },
  { key: "atmosphere", label: "Atmosphere" },
] as const;

export type ReviewCategory = (typeof REVIEW_CATEGORIES)[number]["key"];

/** 1..5 per category, or null for "didn't say". */
export type ReviewScores = Record<ReviewCategory, number | null>;

export const EMPTY_SCORES: ReviewScores = {
  equipment: null,
  cleanliness: null,
  atmosphere: null,
};

export type GymReview = {
  userId: string;
  authorName: string;
  authorPhoto: string | null;
  scores: ReviewScores;
  /** The average of the scores this person gave, or null if they gave none. */
  overall: number | null;
  comment: string | null;
  at: number; // epoch ms
  mine: boolean;
};

/** What one gym looks like once everyone's rows are averaged. */
export type GymScore = {
  reviews: number;
  score: number | null;
  byCategory: Record<ReviewCategory, number | null>;
  comments: number;
};

/** The average of the scores actually given — the same rule the database uses. */
export function overallOf(scores: ReviewScores): number | null {
  const given = REVIEW_CATEGORIES.map((c) => scores[c.key]).filter(
    (v): v is number => typeof v === "number",
  );
  if (given.length === 0) return null;
  return given.reduce((a, b) => a + b, 0) / given.length;
}

/** "4.3" — one decimal, which is as precise as a handful of ratings can be. */
export const scoreLabel = (score: number | null) => (score === null ? "—" : score.toFixed(1));

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

/* ── localStorage fallback (no Supabase env) ── */
const LOCAL_KEY = "gymReviews";
type LocalRow = {
  userId: string;
  gymSlug: string;
  scores: ReviewScores;
  comment: string | null;
  at: number;
};

function loadLocal(): LocalRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]");
    return Array.isArray(raw) ? (raw as LocalRow[]) : [];
  } catch {
    return [];
  }
}
function saveLocal(rows: LocalRow[]) {
  if (typeof window !== "undefined") window.localStorage.setItem(LOCAL_KEY, JSON.stringify(rows));
}

const localToReview = (r: LocalRow, userId: string): GymReview => ({
  userId: r.userId,
  authorName: "You",
  authorPhoto: null,
  scores: r.scores,
  overall: overallOf(r.scores),
  comment: r.comment,
  at: r.at,
  mine: r.userId === userId,
});

/** Every review of one gym — yours first, then newest. */
export async function listGymReviews(userId: string, gymSlug: string): Promise<GymReview[]> {
  if (!userId || !gymSlug) return [];
  if (!hasSupabaseEnv()) {
    return loadLocal()
      .filter((r) => r.gymSlug === gymSlug)
      .map((r) => localToReview(r, userId));
  }
  const { data, error } = await createClient().rpc("gym_reviews_for", {
    p_gym_slug: gymSlug,
    p_limit: 50,
  });
  if (error) throw new Error(`listGymReviews failed: ${error.message}`);
  return (data as Record<string, unknown>[]).map((r) => ({
    userId: r.user_id as string,
    authorName: (r.author_name as string) || "Member",
    authorPhoto: (r.author_photo as string) || null,
    scores: {
      equipment: num(r.equipment),
      cleanliness: num(r.cleanliness),
      atmosphere: num(r.atmosphere),
    },
    overall: num(r.overall),
    comment: (r.comment as string) || null,
    at: Date.parse(r.updated_at as string),
    mine: !!r.mine,
  }));
}

/** Write (or rewrite) the caller's review of one gym. */
export async function saveGymReview(
  userId: string,
  gymSlug: string,
  scores: ReviewScores,
  comment: string,
): Promise<void> {
  const body = comment.trim();
  if (!hasSupabaseEnv()) {
    const rest = loadLocal().filter((r) => !(r.userId === userId && r.gymSlug === gymSlug));
    rest.push({ userId, gymSlug, scores, comment: body || null, at: Date.now() });
    saveLocal(rest);
    return;
  }
  const { error } = await createClient().rpc("gym_review_save", {
    p_gym_slug: gymSlug,
    p_equipment: scores.equipment,
    p_cleanliness: scores.cleanliness,
    p_atmosphere: scores.atmosphere,
    p_comment: body || null,
  });
  if (error) throw new Error(`saveGymReview failed: ${error.message}`);
}

/** Take the caller's review down. */
export async function removeGymReview(userId: string, gymSlug: string): Promise<void> {
  if (!hasSupabaseEnv()) {
    saveLocal(loadLocal().filter((r) => !(r.userId === userId && r.gymSlug === gymSlug)));
    return;
  }
  const { error } = await createClient().rpc("gym_review_remove", { p_gym_slug: gymSlug });
  if (error) throw new Error(`removeGymReview failed: ${error.message}`);
}

/** Every gym's score in one read, keyed by slug — the list paints from this. */
export async function gymScores(userId: string): Promise<Record<string, GymScore>> {
  if (!userId) return {};
  if (!hasSupabaseEnv()) {
    const out: Record<string, GymScore> = {};
    for (const r of loadLocal()) {
      const s = (out[r.gymSlug] ??= {
        reviews: 0,
        score: null,
        byCategory: { ...EMPTY_SCORES },
        comments: 0,
      });
      s.reviews += 1;
      s.score = overallOf(r.scores);
      s.byCategory = r.scores;
      if (r.comment) s.comments += 1;
    }
    return out;
  }
  const { data, error } = await createClient().rpc("gym_review_summary");
  if (error) throw new Error(`gymScores failed: ${error.message}`);
  const out: Record<string, GymScore> = {};
  for (const r of data as Record<string, unknown>[]) {
    out[r.gym_slug as string] = {
      reviews: Number(r.reviews ?? 0),
      score: num(r.score),
      byCategory: {
        equipment: num(r.equipment_avg),
        cleanliness: num(r.cleanliness_avg),
        atmosphere: num(r.atmosphere_avg),
      },
      comments: Number(r.comments ?? 0),
    };
  }
  return out;
}
