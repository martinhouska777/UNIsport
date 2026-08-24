"use client";

/*
  FEED — the fifth tab.
  ---------------------------------------------------------------------------
  What's happening, rather than who or where: a picture from a session, a line
  about a lift, a "going at 6, anyone?" — visible to people who never opened
  Match.

  THE ONE THING THAT MAKES IT DIFFERENT: this is the only place in Zone 2 where
  the wall between universities is deliberately open. Match will only ever offer
  partners at your own school (db/matching.sql). The feed shows every campus,
  and from a post you can reach the person's profile, follow them and message
  them — a DM across schools already worked, there was simply never a way to
  find the person.

  Two ways to narrow it:
    Following  the people you follow, plus your own posts
    Everyone   every campus, or one at a time via the school chips

  Nothing here is faked: posts come from db/posts.sql. Colours are theme tokens
  (rule 1); the only per-school colour is a dot on the school chips, which is
  content data out of lib/themes.ts.
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { IconPlus } from "@/components/icons";
import PostCard from "@/components/feed/PostCard";
import ComposeSheet from "@/components/feed/ComposeSheet";
import { useAppState } from "@/components/AppState";
import { universities } from "@/lib/themes";
import {
  deletePost,
  listFeed,
  FEED_PAGE,
  type FeedScope,
  type Post,
} from "@/lib/supabase/posts";

const SCOPES: { key: FeedScope; label: string; hint: string }[] = [
  {
    key: "following",
    label: "Following",
    hint: "People you follow, and your own posts.",
  },
  {
    key: "everyone",
    label: "Everyone",
    hint: "Every campus on the app — not just yours.",
  },
];

export default function FeedPage() {
  const { universityKey, userId } = useAppState();
  const [scope, setScope] = useState<FeedScope>("everyone");
  const [school, setSchool] = useState<string | null>(null); // null = all schools
  const [loadingMore, setLoadingMore] = useState(false);
  const [composing, setComposing] = useState(false);
  const [reload, setReload] = useState(0); // bumped after posting

  /*
    What's on screen, and WHICH question it answers. Keeping the query key on
    the data (rather than blanking the list the moment a chip is tapped) means
    the switch to "Following" shows "Loading…" without a render pass where the
    old campus's posts sit under the new heading.
  */
  const key = `${scope}|${school ?? ""}`;
  const [feed, setFeed] = useState<{
    key: string;
    posts: Post[];
    more: boolean;
    failed: boolean;
  } | null>(null);
  const loaded = feed && feed.key === key ? feed : null;
  const posts = loaded?.posts ?? null;
  const more = loaded?.more ?? false;

  /*
    Your own school first, then the rest in the order lib/themes.ts lists them.
    Adding a ninth university adds a ninth chip — no change here (rule 2).
  */
  const schools = Object.values(universities).sort((a, b) =>
    a.key === universityKey ? -1 : b.key === universityKey ? 1 : 0,
  );

  useEffect(() => {
    let alive = true;
    listFeed(scope, school)
      .then((rows) => {
        if (alive) setFeed({ key, posts: rows, more: rows.length === FEED_PAGE, failed: false });
      })
      .catch(() => {
        if (alive) setFeed({ key, posts: [], more: false, failed: true });
      });
    return () => {
      alive = false;
    };
  }, [scope, school, key, reload]);

  const loadMore = async () => {
    if (!posts || loadingMore) return;
    setLoadingMore(true);
    try {
      const rows = await listFeed(scope, school, FEED_PAGE, posts.length);
      setFeed((current) =>
        current && current.key === key
          ? { ...current, posts: [...current.posts, ...rows], more: rows.length === FEED_PAGE }
          : current,
      );
    } catch {
      setFeed((current) => (current ? { ...current, more: false } : current));
    }
    setLoadingMore(false);
  };

  // Optimistic: the card goes now, and comes back if the delete didn't land.
  const removePost = async (id: string) => {
    const before = feed;
    setFeed((current) =>
      current ? { ...current, posts: current.posts.filter((p) => p.id !== id) } : current,
    );
    try {
      await deletePost(id);
    } catch {
      setFeed(before);
    }
  };

  const scopeHint = SCOPES.find((s) => s.key === scope)!.hint;

  return (
    <div className="mx-auto w-full max-w-screen-sm lg:max-w-3xl lg:px-4 lg:pt-3">
      <h1 className="sr-only px-3 text-lg font-semibold text-text lg:not-sr-only lg:mb-1 lg:block">
        Feed
      </h1>

      {/* Following / Everyone — the same toggle shape Messages uses. */}
      <div className="bg-surface px-3 pb-2 pt-2.5">
        <div className="flex overflow-hidden rounded-xl border border-border">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s.key)}
              aria-pressed={scope === s.key}
              className={`min-h-11 flex-1 py-2 text-center text-xs font-medium transition-colors ${
                scope === s.key ? "bg-text text-background" : "bg-surface-2 text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <p className="px-0.5 pt-1.5 text-[11px] text-muted">{scopeHint}</p>
      </div>

      {/* The school chips belong to "Everyone" — "Following" is about people,
          not campuses, and two filters at once would be one too many. */}
      {scope === "everyone" && (
        <div className="-mx-0 flex gap-1.5 overflow-x-auto px-3 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SchoolChip
            label="All schools"
            active={school === null}
            onClick={() => setSchool(null)}
          />
          {schools.map((u) => (
            <SchoolChip
              key={u.key}
              label={u.shortName}
              dot={u.theme.primary}
              active={school === u.key}
              onClick={() => setSchool(school === u.key ? null : u.key)}
            />
          ))}
        </div>
      )}

      {posts === null ? (
        <p className="px-6 py-16 text-center text-sm text-muted">Loading…</p>
      ) : posts.length === 0 ? (
        <Empty
          scope={scope}
          school={school}
          failed={loaded?.failed ?? false}
          onWrite={() => setComposing(true)}
        />
      ) : (
        <>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onDeleted={removePost} />
          ))}
          {more && (
            <div className="px-3 py-4 text-center">
              <Button variant="secondary" size="md" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Show older"}
              </Button>
            </div>
          )}
        </>
      )}

      {/* Sits above the bottom nav on a phone, bottom-right of the column on a
          laptop. The one action this tab has. */}
      <button
        type="button"
        onClick={() => setComposing(true)}
        aria-label="Write a post"
        className="press fixed bottom-[76px] right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-primary-live text-primary-contrast shadow-lg lg:bottom-6"
      >
        <IconPlus size={22} />
      </button>

      {composing && (
        <ComposeSheet
          userId={userId ?? ""}
          onPosted={() => {
            // Straight to where the new post actually is.
            setScope("everyone");
            setSchool(null);
            setReload((n) => n + 1);
          }}
          onClose={() => setComposing(false)}
        />
      )}
    </div>
  );
}

function SchoolChip({
  label,
  dot,
  active,
  onClick,
}: {
  label: string;
  dot?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`tap44 flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${
        active ? "border-primary bg-primary-tint text-primary" : "border-border bg-surface text-muted"
      }`}
    >
      {dot && (
        <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      )}
      {label}
    </button>
  );
}

function Empty({
  scope,
  school,
  failed,
  onWrite,
}: {
  scope: FeedScope;
  school: string | null;
  failed: boolean;
  onWrite: () => void;
}) {
  if (failed) {
    return (
      <div className="px-6 py-16 text-center">
        <h2 className="text-sm font-medium text-text">Couldn’t load the feed</h2>
        <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
          Check your connection and pull the tab again.
        </p>
      </div>
    );
  }

  const schoolName = school ? universities[school]?.shortName : null;

  return (
    <div className="px-6 py-16 text-center">
      <h2 className="text-sm font-medium text-text">
        {scope === "following"
          ? "Nothing from the people you follow"
          : schoolName
            ? `Nothing from ${schoolName} yet`
            : "Nothing here yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-muted">
        {scope === "following"
          ? "Follow someone from Match or from a post, and the sessions they share turn up here."
          : "Log a session on your Profile tab and flip “Share to feed” — your note and photos land here, from your school and from every other campus on the app."}
      </p>
      <div className="mt-4">
        <Button variant="primary" size="md" onClick={onWrite}>
          Write the first one
        </Button>
      </div>
    </div>
  );
}
