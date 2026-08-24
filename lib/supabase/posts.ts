/*
  FEED POSTS — typed client helpers for db/posts.sql.

  Everything goes through SECURITY DEFINER RPCs that act for the signed-in user
  (auth.uid()), exactly like the follow graph and the DMs. Without Supabase env
  configured the feed reads as empty rather than crashing the tab.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

/** How much of the feed one page holds. */
export const FEED_PAGE = 20;

/** Which slice of the feed to read. */
export type FeedScope = "following" | "everyone";

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
};

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

/** Publish a post. Returns its id. */
export async function createPost(body: string, photo: string | null): Promise<string> {
  const { data, error } = await createClient().rpc("post_create", {
    body_text: body,
    photo_data: photo,
  });
  if (error) throw new Error(`createPost failed: ${error.message}`);
  return data as string;
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
