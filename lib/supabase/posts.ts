/*
  FEED POSTS — typed client helpers for db/posts.sql.

  Everything goes through SECURITY DEFINER RPCs that act for the signed-in user
  (auth.uid()), exactly like the follow graph and the DMs. Without Supabase env
  configured the feed reads as empty rather than crashing the tab.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { WorkoutExercise, WorkoutMetrics } from "@/lib/supabase/workouts";

/** How much of the feed one page holds. */
export const FEED_PAGE = 20;

/** Which slice of the feed to read. */
export type FeedScope = "following" | "everyone";

/*
  The session behind a post — the public-safe subset db/posts_workout.sql
  exposes out of the author's (otherwise private) workout log. Shaped so it can
  be handed straight to the summary helpers in lib/supabase/workouts.ts, which
  already know how to describe a session in one line.
*/
export type PostWorkout = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  activity: string; // 'gym' | 'running' | 'cardio' | 'other'
  gym: string;
  partner: string; // display name, "" when solo
  partnerId: string | null; // set when the partner is a real person on the app
  exercises: WorkoutExercise[];
  metrics: WorkoutMetrics;
  note: string; // the comment written when logging — the post's own words
  photo: string | null; // the session's FIRST photo (the feed never loads the rest)
  photoCount: number;
};

export type Post = {
  id: string;
  authorId: string;
  authorName: string;
  schoolKey: string; // lib/themes.ts key — the school the post was written at
  body: string;
  photo: string | null; // downscaled JPEG data URL
  createdAt: string; // ISO timestamp
  kudos: number;
  kudoed: boolean; // did I give it 💪?
  mine: boolean; // my own post (so it can be deleted)
  workout: PostWorkout | null; // the shared session, when the post is one
};

type Row = {
  id: string;
  author_id: string;
  author_name: string | null;
  school_key: string | null;
  body: string | null;
  photo: string | null;
  created_at: string;
  kudos: number | null;
  kudoed: boolean | null;
  mine: boolean | null;
  workout: RawWorkout | null;
};

type RawWorkout = {
  id: string;
  date: string;
  activity: string | null;
  gym: string | null;
  partner: string | null;
  partnerId: string | null;
  exercises: unknown;
  metrics: WorkoutMetrics | null;
  note: string | null;
  photo: string | null;
  photoCount: number | null;
};

/*
  The exercise list arrives as raw jsonb. Only the fields the feed card reads
  are trusted through — a card must not blow up on a session logged by an older
  version of the app.
*/
function toExercises(raw: unknown): WorkoutExercise[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    const ex = (e ?? {}) as Record<string, unknown>;
    const sets = Array.isArray(ex.sets) ? ex.sets : [];
    return {
      name: String(ex.name ?? ""),
      ...(ex.muscle ? { muscle: String(ex.muscle) } : {}),
      sets: sets.map((s) => {
        const set = (s ?? {}) as Record<string, unknown>;
        return { weight: String(set.weight ?? ""), reps: String(set.reps ?? "") };
      }),
    };
  });
}

const toWorkout = (w: RawWorkout | null): PostWorkout | null =>
  w
    ? {
        id: w.id,
        date: w.date,
        activity: w.activity ?? "gym",
        gym: w.gym ?? "",
        partner: w.partner ?? "",
        partnerId: w.partnerId ?? null,
        exercises: toExercises(w.exercises),
        metrics: w.metrics ?? {},
        note: w.note ?? "",
        photo: w.photo,
        photoCount: Number(w.photoCount ?? 0),
      }
    : null;

const toPost = (r: Row): Post => ({
  id: r.id,
  authorId: r.author_id,
  authorName: r.author_name ?? "Member",
  schoolKey: r.school_key ?? "harvard",
  body: r.body ?? "",
  photo: r.photo,
  createdAt: r.created_at,
  kudos: Number(r.kudos ?? 0),
  kudoed: !!r.kudoed,
  mine: !!r.mine,
  workout: toWorkout(r.workout),
});

/**
 * One page of the feed, newest first.
 * `school` narrows "everyone" to a single campus; null means all of them.
 */
export async function listFeed(
  scope: FeedScope,
  school: string | null = null,
  limit = FEED_PAGE,
  offset = 0,
): Promise<Post[]> {
  if (!hasSupabaseEnv()) return [];
  const { data, error } = await createClient().rpc("feed_list", {
    scope,
    school,
    page_limit: limit,
    page_offset: offset,
  });
  if (error) throw new Error(`listFeed failed: ${error.message}`);
  return (data as Row[]).map(toPost);
}

/**
 * Publish a post. Returns its id.
 * `logId` shares one of your own logged sessions — that post needs no words and
 * no picture of its own, because the session is the content.
 */
export async function createPost(
  body: string,
  photo: string | null,
  logId: string | null = null,
): Promise<string> {
  const { data, error } = await createClient().rpc("post_create", {
    body_text: body,
    photo_data: photo,
    log_id: logId,
  });
  if (error) throw new Error(`createPost failed: ${error.message}`);
  return data as string;
}

/** The post this session of yours is already shared as, or null. */
export async function postForLog(logId: string): Promise<string | null> {
  if (!hasSupabaseEnv()) return null;
  const { data, error } = await createClient().rpc("post_for_log", { log_id: logId });
  if (error) return null; // "is it shared?" is never worth an error on screen
  return (data as string | null) ?? null;
}

/** Delete one of your own posts. */
export async function deletePost(id: string): Promise<void> {
  const { error } = await createClient().rpc("post_delete", { post: id });
  if (error) throw new Error(`deletePost failed: ${error.message}`);
}

/** Toggle 💪. Returns the settled count and whether you're now in it. */
export async function toggleKudos(id: string): Promise<{ kudos: number; kudoed: boolean }> {
  const { data, error } = await createClient().rpc("post_kudos_toggle", { post: id });
  if (error) throw new Error(`toggleKudos failed: ${error.message}`);
  const row = (data ?? {}) as { kudos?: number; kudoed?: boolean };
  return { kudos: Number(row.kudos ?? 0), kudoed: !!row.kudoed };
}

/*
  "2 h" / "3 d" — how long ago, in the least words that still mean something.
  A feed is read at a glance; a full date belongs on the post's own screen.
*/
export function timeAgo(iso: string, now: Date = new Date()): string {
  const seconds = Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days} d`;
  const weeks = Math.round(days / 7);
  if (weeks < 5) return `${weeks} w`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
