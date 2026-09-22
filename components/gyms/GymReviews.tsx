"use client";

/*
  THE RATING, on the gym page — what the campus thinks, and your own say in it.

  Three parts, in the order somebody reads them:
    1. the score — one number, the stars, and how many people it is made of
    2. the breakdown — equipment, cleanliness, atmosphere, as bars
    3. the reviews — signed, with whatever people wrote

  Every number is a row in db/gym_reviews.sql, written by a student. The
  placeholder `rating` / `ratingCount` still sitting on each gym in lib/gyms.ts
  is never read here: a made-up 4.8 on a real, named campus gym is a claim
  nobody made, which is why the old breakdown was cut in the first place.

  Rating is TAPPING: the stars in the editor are the control, one row per
  category, and a comment underneath is optional. Saving rewrites your one row
  (the database has a primary key on you + the gym), so nobody can rate a gym
  twice into the average.

  All colour is theme tokens (rule 1).
*/
import { useCallback, useEffect, useState } from "react";
import {
  REVIEW_CATEGORIES,
  EMPTY_SCORES,
  listGymReviews,
  saveGymReview,
  removeGymReview,
  gymScores,
  overallOf,
  scoreLabel,
  type GymReview,
  type GymScore,
  type ReviewScores,
} from "@/lib/supabase/gymReviews";
import { timeAgo } from "@/lib/gymSocial";
import { StarRater } from "@/components/gyms/RateCrowd";
import Avatar from "@/components/messages/Avatar";
import Button from "@/components/ui/Button";
import SectionLabel from "@/components/ui/SectionLabel";
import { IconStar } from "@/components/icons";

/** One category's average, as a bar. Empty track when nobody has said. */
function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[86px] shrink-0 text-[12px] text-muted">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="w-[26px] shrink-0 text-right text-[12px] tabular-nums text-text">
        {scoreLabel(value)}
      </span>
    </div>
  );
}

export default function GymReviews({
  userId,
  gymSlug,
}: {
  userId: string | null;
  gymSlug: string;
}) {
  const [summary, setSummary] = useState<GymScore | null>(null);
  const [reviews, setReviews] = useState<GymReview[]>([]);
  const [loaded, setLoaded] = useState(false);

  // The editor: closed until somebody taps. Prefilled with your own row when
  // you have one, so "rate" and "change my rating" are the same screen.
  const [editing, setEditing] = useState(false);
  const [scores, setScores] = useState<ReviewScores>(EMPTY_SCORES);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!userId) return;
    const [all, byGym] = await Promise.all([
      listGymReviews(userId, gymSlug),
      gymScores(userId),
    ]);
    setReviews(all);
    setSummary(byGym[gymSlug] ?? null);
    setLoaded(true);
  }, [userId, gymSlug]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
      } catch {
        // A failed read is an empty card, not a broken page.
        if (active) setLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const mine = reviews.find((r) => r.mine) ?? null;

  const openEditor = () => {
    setScores(mine ? mine.scores : EMPTY_SCORES);
    setComment(mine?.comment ?? "");
    setFailed(false);
    setEditing(true);
  };

  const save = async () => {
    setBusy(true);
    setFailed(false);
    try {
      await saveGymReview(userId ?? "", gymSlug, scores, comment);
      await load();
      setEditing(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeGymReview(userId ?? "", gymSlug);
      await load();
      setEditing(false);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  const draftOverall = overallOf(scores);
  const nothingToSave = draftOverall === null && comment.trim() === "";
  const score = summary?.score ?? null;
  const count = summary?.reviews ?? 0;

  return (
    <div className="rounded-2xl border border-border bg-surface p-3.5">
      <SectionLabel>Rating</SectionLabel>

      {/* THE SCORE. A gym nobody has rated says so rather than showing 0.0 —
          which would read as "this gym is terrible". */}
      <div className="mt-2.5 flex items-center gap-3.5">
        {/* No number at all until there is one — a big "—" reads as a score. */}
        {count > 0 && (
          <span className="text-[34px] font-semibold leading-none tabular-nums text-text">
            {scoreLabel(score)}
          </span>
        )}
        <div className="min-w-0">
          <StarRater value={score ? Math.round(score) : 0} size={16} />
          <div className="mt-1 text-[11.5px] text-muted">
            {count === 0
              ? "No ratings yet"
              : `${count} ${count === 1 ? "rating" : "ratings"}`}
          </div>
        </div>
      </div>

      {/* THE BREAKDOWN — the three things the score is made of. */}
      {count > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {REVIEW_CATEGORIES.map((c) => (
            <ScoreBar key={c.key} label={c.label} value={summary?.byCategory[c.key] ?? null} />
          ))}
        </div>
      )}

      {/* THE EDITOR — one star row per category, then a comment. */}
      {editing ? (
        <div className="mt-3.5 flex flex-col gap-3 border-t border-border pt-3.5">
          {REVIEW_CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-text">{c.label}</span>
              <StarRater
                value={scores[c.key] ?? 0}
                size={20}
                onRate={(n) => setScores((s) => ({ ...s, [c.key]: n }))}
              />
            </div>
          ))}
          <textarea
            value={comment}
            maxLength={600}
            onChange={(e) => setComment(e.target.value)}
            aria-label="Your comment"
            className="min-h-[76px] w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-text placeholder:text-text-3 focus:border-primary focus:outline-none"
          />
          {failed && <span className="text-[12px] text-danger">Couldn’t save that. Try again.</span>}
          <div className="flex items-center gap-2">
            <Button size="md" onClick={save} disabled={busy || nothingToSave}>
              {busy ? "Saving…" : "Post"}
            </Button>
            <Button size="md" variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
            {mine && (
              <button
                type="button"
                onClick={remove}
                disabled={busy}
                className="ml-auto text-[12px] text-muted underline underline-offset-4"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={openEditor}
          className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-primary-line bg-primary-tint py-2.5 text-[13px] font-semibold text-primary active:opacity-70"
        >
          <IconStar size={14} />
          {mine ? "Change your rating" : "Rate this gym"}
        </button>
      )}

      {/* WHAT PEOPLE WROTE. Only reviews that actually say something appear —
          a bare score is already in the average above. */}
      {loaded && reviews.some((r) => r.comment) && (
        <ul className="mt-3.5 flex flex-col divide-y divide-border border-t border-border">
          {reviews
            .filter((r) => r.comment)
            .map((r) => (
              <li key={r.userId} className="flex gap-2.5 py-3">
                <Avatar size={30} src={r.authorPhoto ?? undefined} alt={r.authorName} />
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-text">
                      {r.mine ? "You" : r.authorName}
                    </span>
                    {r.overall !== null && (
                      <span className="flex shrink-0 items-center gap-1 text-[12px] tabular-nums text-accent">
                        <IconStar size={11} />
                        {scoreLabel(r.overall)}
                      </span>
                    )}
                    <span className="ml-auto shrink-0 text-[11px] text-muted">{timeAgo(r.at)}</span>
                  </div>
                  <p className="mt-0.5 whitespace-pre-line text-[13px] leading-snug text-text-2">
                    {r.comment}
                  </p>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
