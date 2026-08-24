"use client";

/*
  ONE POST.
  ---------------------------------------------------------------------------
  Header (who, which school, when) → the session → the comment → the picture →
  💪. Strava's shape, because it is the right one: the training is the content,
  the words and the photo are what make it worth looking at, and one tap is the
  whole of what you can do about it.

  Tapping the name opens that person's profile, which is where Message lives —
  and that is the whole cross-school path: you can only be MATCHED with people
  at your own university, but you can read, follow and write to anyone the feed
  shows you.

  The school line is on every card on purpose. In a one-school world it reads
  as a fact about the person; the moment there is a second school it is the
  thing that tells two campuses apart, and it should not appear for the first
  time on the day that happens.

  The school's own colour is per-entity CONTENT data out of lib/themes.ts,
  applied via inline style to a 6px dot — never a hardcoded colour in a
  component, and never as text (rule 1). Everything else is theme tokens.
*/
import Link from "next/link";
import { useState } from "react";
import InitialsAvatar from "@/components/ui/InitialsAvatar";
import WorkoutAttachment from "@/components/feed/WorkoutAttachment";
import { IconTrash } from "@/components/icons";
import { getUniversity } from "@/lib/themes";
import { timeAgo, toggleKudos, type Post } from "@/lib/supabase/posts";

export default function PostCard({
  post,
  onDeleted,
}: {
  post: Post;
  onDeleted: (id: string) => void;
}) {
  // Kudos answer to the tap immediately and are corrected by whatever the
  // database settles on — a like that waits for a round-trip feels broken.
  const [kudos, setKudos] = useState(post.kudos);
  const [kudoed, setKudoed] = useState(post.kudoed);
  const [busy, setBusy] = useState(false);

  const school = getUniversity(post.schoolKey);

  // A shared session brings its own words and its own picture; a written post
  // brings its own. Either way the card shows one comment and one photo.
  const caption = post.body || post.workout?.note || "";
  const photo = post.photo ?? post.workout?.photo ?? null;
  const extraPhotos = post.photo ? 0 : Math.max(0, (post.workout?.photoCount ?? 0) - 1);

  const tapKudos = async () => {
    if (busy) return;
    setBusy(true);
    const next = !kudoed;
    setKudoed(next);
    setKudos((n) => n + (next ? 1 : -1));
    try {
      const settled = await toggleKudos(post.id);
      setKudos(settled.kudos);
      setKudoed(settled.kudoed);
    } catch {
      setKudoed(!next); // put it back — the tap didn't land
      setKudos((n) => n + (next ? -1 : 1));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (busy) return;
    setBusy(true);
    onDeleted(post.id); // the list handles the delete + any failure
  };

  return (
    <article className="border-b border-border bg-surface px-3.5 py-3.5">
      <header className="flex items-center gap-3">
        <Link href={`/people/${post.authorId}`} aria-label={`${post.authorName}'s profile`}>
          <InitialsAvatar name={post.authorName} size={40} />
        </Link>

        <div className="min-w-0 flex-1">
          <Link
            href={`/people/${post.authorId}`}
            className="block truncate text-[14px] font-medium text-text"
          >
            {post.authorName}
          </Link>
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted">
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: school?.theme.primary }}
            />
            <span className="truncate">{school?.shortName ?? "Campus"}</span>
            <span aria-hidden>·</span>
            <time dateTime={post.createdAt}>{timeAgo(post.createdAt)}</time>
          </div>
        </div>

        {post.mine && (
          <button
            type="button"
            onClick={remove}
            disabled={busy}
            aria-label="Delete post"
            className="tap44 press-icon flex h-8 w-8 items-center justify-center rounded-full text-text-3"
          >
            <IconTrash size={15} />
          </button>
        )}
      </header>

      {/* The session first: what they did is the reason the card exists. */}
      {post.workout && <WorkoutAttachment workout={post.workout} />}

      {/* The comment. A shared session carries the note written when logging it
          — the same words that are in the author's own calendar — unless the
          post was given its own caption. */}
      {caption && (
        <p className="mt-2.5 whitespace-pre-wrap break-words text-[14px] leading-relaxed text-text-2">
          {caption}
        </p>
      )}

      {photo && (
        <div className="relative mt-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element -- a data URL, not a file next/image can optimise */}
          <img src={photo} alt="" className="w-full rounded-xl border border-border object-cover" />
          {extraPhotos > 0 && (
            // The feed only ever loads the first photo (db/posts_workout.sql),
            // so the rest are counted rather than hidden.
            <span className="absolute bottom-2 right-2 rounded-full bg-background/80 px-2 py-1 text-[11px] font-semibold text-text">
              +{extraPhotos}
            </span>
          )}
        </div>
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
