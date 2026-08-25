/*
  VARSITY FEED STORE — posts, kudos, and the audience each post was given.
  ---------------------------------------------------------------------------
  Backed by db/varsity_posts.sql. Every call is an RPC into a SECURITY DEFINER
  function that re-checks the caller on the server, so nothing in this file is
  a security boundary — it only decides what to SHOW.

  Two rules the database enforces and this file simply mirrors:
    • a post is 'team' (your squad) or 'everyone' (all varsity, every school);
    • a COACH sees nothing at all, in either scope.

  Falls back to localStorage with no Supabase env, like every other store in
  lib/varsity — so the flow can be walked through in dev before the SQL is run.
*/
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";

/** Which slice of the feed to read. */
export type FeedScope = "team" | "everyone";

/** Who a post is for. Chosen per post, at share time. */
export type Audience = "team" | "everyone";

/*
  The session behind a post — the public-safe subset db/varsity_posts.sql
  exposes out of the author's (otherwise private) log. The log's own note is
  NOT here on purpose: the words on the feed are the ones typed when sharing.
*/
export type PostSession = {
  id: string;
  date: string; // ISO yyyy-mm-dd
  title: string;
  category: string | null; // erg / water / weights / run / bike / other
  minutes: number | null;
  metres: number | null;
  split: string | null; // as shown on the monitor, e.g. "1:52.3"
};

export type VarsityPost = {
  id: string;
  authorId: string;
  authorName: string;
  teamId: string;
  teamName: string;
  schoolKey: string; // lib/themes.ts key — the school the post was written at
  audience: Audience;
  body: string; // the comment written when sharing
  photo: string | null; // downscaled JPEG data URL
  createdAt: string; // ISO timestamp
  kudos: number;
  kudoed: boolean; // did I give it 💪?
  mine: boolean; // my own post (so it can be taken down)
  session: PostSession | null;
};

/** How much of the feed one page holds. */
export const FEED_PAGE = 20;

type Row = {
  id: string;
  author_id: string;
  author_name: string | null;
  team_id: string;
  team_name: string | null;
  school_key: string | null;
  audience: string | null;
  body: string | null;
  photo: string | null;
  created_at: string;
  kudos: number | null;
  kudoed: boolean | null;
  mine: boolean | null;
  workout: RawSession | null;
};

type RawSession = {
  id: string;
  date: string;
  title: string | null;
  category: string | null;
  minutes: number | null;
  metres: number | null;
  split: string | null;
};

const toSession = (w: RawSession | null): PostSession | null =>
  w
    ? {
        id: w.id,
        date: w.date,
        title: w.title ?? "Session",
        category: w.category,
        minutes: w.minutes,
        metres: w.metres,
        split: w.split,
      }
    : null;

const toPost = (r: Row): VarsityPost => ({
  id: r.id,
  authorId: r.author_id,
  authorName: r.author_name || "Athlete",
  teamId: r.team_id,
  teamName: r.team_name ?? "",
  schoolKey: r.school_key ?? "harvard",
  audience: r.audience === "everyone" ? "everyone" : "team",
  body: r.body ?? "",
  photo: r.photo,
  createdAt: r.created_at,
  kudos: Number(r.kudos ?? 0),
  kudoed: !!r.kudoed,
  mine: !!r.mine,
  session: toSession(r.workout),
});

/* ── localStorage fallback (no Supabase env) ──────────────────────────────
   One shared key, so at least your own posts show up while developing. It
   knows nothing about squads, so every post is visible in both scopes. */
const LOCAL_KEY = "varsityPosts";

function loadLocal(): VarsityPost[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "[]") as VarsityPost[];
  } catch {
    return [];
  }
}
function saveLocal(all: VarsityPost[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
  }
}

/* ── Read ─────────────────────────────────────────────────────────────── */

/** One page of the feed, newest first. Empty for a coach — by design. */
export async function listVarsityFeed(
  scope: FeedScope,
  limit = FEED_PAGE,
  offset = 0,
): Promise<VarsityPost[]> {
  if (!hasSupabaseEnv()) return loadLocal().slice(offset, offset + limit);
  const { data, error } = await createClient().rpc("varsity_feed_list", {
    p_scope: scope,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(error.message);
  return ((data as Row[]) ?? []).map(toPost);
}

/** The post this session of yours is already shared as, or null. */
export async function varsityPostForLog(logId: string): Promise<string | null> {
  if (!logId) return null;
  if (!hasSupabaseEnv()) return loadLocal().find((p) => p.session?.id === logId)?.id ?? null;
  const { data, error } = await createClient().rpc("varsity_post_for_log", { p_log: logId });
  if (error) return null; // "is it shared?" is never worth an error on screen
  return (data as string | null) ?? null;
}

/* ── Write ────────────────────────────────────────────────────────────── */

export type NewPost = {
  logId: string | null; // the session this post is about
  body: string; // the comment, written at share time
  photo: string | null; // one downscaled JPEG data URL
  audience: Audience;
  /* Only used by the localStorage fallback, so a post made in dev can still
     draw its session card. The database reads all of this off the log. */
  session?: PostSession | null;
  authorName?: string;
  teamName?: string;
};

/** Publish a post. Returns its id, or an error to show — never both. */
export async function createVarsityPost(
  post: NewPost,
): Promise<{ id?: string; error?: string }> {
  if (!hasSupabaseEnv()) {
    const id = `local-${Date.now()}`;
    const all = loadLocal();
    all.unshift({
      id,
      authorId: "local",
      authorName: post.authorName || "You",
      teamId: "local",
      teamName: post.teamName ?? "",
      schoolKey: "harvard",
      audience: post.audience,
      body: post.body,
      photo: post.photo,
      createdAt: new Date().toISOString(),
      kudos: 0,
      kudoed: false,
      mine: true,
      session: post.session ?? null,
    });
    saveLocal(all);
    return { id };
  }
  const { data, error } = await createClient().rpc("varsity_post_create", {
    p_log: post.logId,
    p_body: post.body,
    p_photo: post.photo,
    p_audience: post.audience,
  });
  if (error) return { error: error.message };
  return { id: data as string };
}

/** Take one of your own posts off the feed. */
export async function deleteVarsityPost(id: string): Promise<{ error?: string }> {
  if (!hasSupabaseEnv()) {
    saveLocal(loadLocal().filter((p) => p.id !== id));
    return {};
  }
  const { error } = await createClient().rpc("varsity_post_delete", { p_post: id });
  return error ? { error: error.message } : {};
}

/** Toggle 💪. Returns the settled count and whether you're now in it. */
export async function toggleVarsityKudos(
  id: string,
): Promise<{ kudos: number; kudoed: boolean }> {
  if (!hasSupabaseEnv()) {
    const all = loadLocal();
    const post = all.find((p) => p.id === id);
    if (!post) return { kudos: 0, kudoed: false };
    post.kudoed = !post.kudoed;
    post.kudos = Math.max(0, post.kudos + (post.kudoed ? 1 : -1));
    saveLocal(all);
    return { kudos: post.kudos, kudoed: post.kudoed };
  }
  const { data, error } = await createClient().rpc("varsity_post_kudos_toggle", { p_post: id });
  if (error) throw new Error(error.message);
  const row = (data ?? {}) as { kudos?: number; kudoed?: boolean };
  return { kudos: Number(row.kudos ?? 0), kudoed: !!row.kudoed };
}
