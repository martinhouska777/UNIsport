"use client";

/*
  ONE VARSITY POST.
  ---------------------------------------------------------------------------
  Header (who, which squad, when) → the session → the comment → the picture →
  💪. The same shape as the normal app's feed card, because it is the right one:
  the training is the content, the words and the photo are what make it worth
  looking at, and one tap is the whole of what you can do about it.

  What is NOT on the card: the note from the athlete's own log. That text is
  private (db/varsity_posts.sql never sends it), so the only words here are the
  ones typed when sharing.

  The audience chip is shown on YOUR OWN posts only — you should be able to see
  at a glance whether that 2K went to the squad or to every school. On somebody
  else's post it would just be noise: you are looking at it, so you can see it.

  The school's colour is per-entity CONTENT data out of lib/themes.ts, applied
  via inline style to a 6px dot — never a hardcoded colour (rule 1). The
  category dot is the same exception, from lib/varsity/coachPlan.ts.
*/
import { useState } from "react";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import { IconGlobe, IconTrash, IconUsers } from "@/components/icons";
import { getUniversity } from "@/lib/themes";
import { timeAgo } from "@/lib/supabase/posts";
import { logCategoryMeta } from "@/lib/varsity/coachPlan";
import { formatMetrics } from "@/lib/varsity/logParse";
import { toggleVarsityKudos, type VarsityPost } from "@/lib/varsity/postsStore";

export default function VarsityPostCard({
  post,
  onDeleted,
}: {
  post: VarsityPost;
  onDeleted: (id: string) => void;
}) {
  // Kudos answer to the tap immediately and are corrected by whatever the
  // database settles on — a reaction that waits for a round-trip feels broken.
  const [kudos, setKudos] = useState(post.kudos);
  const [kudoed, setKudoed] = useState(post.kudoed);
  const [busy, setBusy] = useState(false);

  const school = getUniversity(post.schoolKey);
  const session = post.session;
  const numbers = session
    ? formatMetrics(session.minutes, session.metres, session.split)
    : "";
  // The category arrives as free text out of the database, so it is looked up
  // rather than trusted: a session logged by an older version of the app must
  // never blow the card up, it just gets no dot.
  const categories: Record<string, { label: string; color: string }> = logCategoryMeta;
  const category = session?.category ? categories[session.category] : undefined;

  const tapKudos = async () => {
    if (busy) return;
    setBusy(true);
    const next = !kudoed;
    setKudoed(next);
    setKudos((n) => n + (next ? 1 : -1));
    try {
      const settled = await toggleVarsityKudos(post.id);
      setKudos(settled.kudos);
      setKudoed(settled.kudoed);
    } catch {
      setKudoed(!next); // put it back — the tap didn't land
      setKudos((n) => n + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  return (
    <article className="border-b border-border bg-surface px-3.5 py-3.5">
      <header className="flex items-center gap-3">
        <InitialsAvatar name={post.authorName} size={40} />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[14px] font-medium text-text">{post.authorName}</div>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: school?.theme.primary }}
            />
            <span className="truncate">{post.teamName || school?.shortName || "Squad"}</span>
            <span aria-hidden>·</span>
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </div>
        </div>

        {post.mine && (
          <>
            <span
              className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[10px] font-semibold text-muted"
              title={
                post.audience === "team"
                  ? "Your squad only"
                  : "Every varsity athlete, at every school"
              }
            >
              {post.audience === "team" ? <IconUsers size={11} /> : <IconGlobe size={11} />}
              {post.audience === "team" ? "Team" : "Everyone"}
            </span>
            <button
              type="button"
              onClick={() => !busy && onDeleted(post.id)}
              disabled={busy}
              aria-label="Delete post"
              className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-full text-muted"
            >
              <IconTrash size={15} />
            </button>
          </>
        )}
      </header>

      {/* The session first: what they did is the reason the card exists. */}
      {session && (
        <div className="mt-2.5 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
          <div className="flex items-center gap-2">
            {category && (
              <span
                aria-hidden
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: category.color }}
              />
            )}
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
              {session.title}
            </span>
          </div>
          {numbers && <div className="mt-1 text-[12px] text-muted">{numbers}</div>}
        </div>
      )}

      {post.body && (
        <p className="mt-2.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-text-2">
          {post.body}
        </p>
      )}

      {post.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- a data URL, not a file next/image can optimise
        <img
          src={post.photo}
          alt=""
          className="mt-2.5 w-full rounded-xl border border-border object-cover"
        />
      )}

      <footer className="mt-2.5 flex items-center">
        <button
          type="button"
          onClick={tapKudos}
          aria-pressed={kudoed}
          aria-label={kudoed ? "Take back your kudos" : "Give kudos"}
          className={`tap44 press flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            kudoed
              ? "border-primary bg-primary-tint text-primary"
              : "border-border bg-surface-2 text-muted"
          }`}
        >
          <span aria-hidden className="text-[13px] leading-none">
            💪
          </span>
          {kudos > 0 ? kudos : "Kudos"}
        </button>
      </footer>
    </article>
  );
}
