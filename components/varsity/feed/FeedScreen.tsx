"use client";

/*
  THE VARSITY FEED.
  ---------------------------------------------------------------------------
  What today happens on Instagram — "jak kdo kde zajel" — inside the app, where
  the numbers already are. Nothing lands here automatically: a post is a session
  its owner deliberately shared, one step after saving it
  (components/varsity/feed/ShareToFeedStep.tsx).

  Two scopes, because a post picks its audience when it is published:
    Team     — your own squad.
    Everyone — every varsity athlete, at every school, plus your squad's own.

  And the coach sees none of it. There is no Feed tab in the Coach Console, and
  db/varsity_posts.sql returns an empty feed to a coach even if one were built.

  Colors are theme tokens (rule 1).
*/
import { useCallback, useEffect, useState } from "react";
import VarsityPostCard from "@/components/varsity/feed/VarsityPostCard";
import Button from "@/components/ui/Button";
import {
  deleteVarsityPost,
  listVarsityFeed,
  FEED_PAGE,
  type FeedScope,
  type VarsityPost,
} from "@/lib/varsity/postsStore";

const scopes: { key: FeedScope; label: string }[] = [
  { key: "team", label: "My team" },
  { key: "everyone", label: "Everyone" },
];

export default function FeedScreen() {
  const [scope, setScope] = useState<FeedScope>("team");
  const [posts, setPosts] = useState<VarsityPost[] | null>(null);
  const [more, setMore] = useState(false); // another page might exist
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (which: FeedScope) => {
    setPosts(null);
    setError("");
    try {
      const rows = await listVarsityFeed(which);
      setPosts(rows);
      setMore(rows.length === FEED_PAGE);
    } catch {
      setPosts([]);
      setError("Couldn’t load the feed. Pull the screen again in a moment.");
    }
  }, []);

  useEffect(() => {
    load(scope);
  }, [scope, load]);

  const loadMore = async () => {
    if (!posts || loadingMore) return;
    setLoadingMore(true);
    try {
      const rows = await listVarsityFeed(scope, FEED_PAGE, posts.length);
      setPosts((prev) => [...(prev ?? []), ...rows]);
      setMore(rows.length === FEED_PAGE);
    } catch {
      setMore(false);
    }
    setLoadingMore(false);
  };

  // Deleting is optimistic; a refusal puts the post back rather than pretending.
  const remove = async (id: string) => {
    const before = posts ?? [];
    setPosts(before.filter((p) => p.id !== id));
    const res = await deleteVarsityPost(id);
    if (res.error) {
      setPosts(before);
      setError("Couldn’t take that post down. Try again.");
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-1 flex-col">
      {/* Scope switch */}
      <div className="flex gap-1.5 px-3.5 py-3">
        {scopes.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setScope(s.key)}
            aria-pressed={scope === s.key}
            className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold ${
              scope === s.key
                ? "border-primary bg-primary-tint text-primary"
                : "border-border bg-surface text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {error && <p className="px-4 pb-2 text-[12px] text-danger">{error}</p>}

      {posts === null ? (
        <p className="px-6 py-12 text-center text-[13px] text-muted">Loading…</p>
      ) : posts.length === 0 ? (
        <div className="px-8 py-14 text-center">
          <p className="text-[14px] font-medium text-text">Nothing here yet</p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {scope === "team"
              ? "Log a session, and when it’s saved you’ll be asked whether it goes on the feed. Your squad sees it here."
              : "Posts shared with everyone show up here — every squad, every school."}
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col">
            {posts.map((post) => (
              <VarsityPostCard key={post.id} post={post} onDeleted={remove} />
            ))}
          </div>
          {more && (
            <div className="px-4 py-5">
              <Button variant="secondary" size="md" full onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
