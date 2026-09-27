"use client";

/*
  Shown right after you save a workout logged at a known gym: an optional
  "rate the gym" card, because the moment you have just walked out of it is the
  one moment you actually know what it was like.

  It writes the SAME row the gym page writes — db/gym_reviews.sql, one review
  per person per gym — so a rating given here lands in the gym's public score
  instead of in a private corner of this browser. Done saves; Skip doesn't.

  The "how busy was it" half went when the owner cut busyness from the app
  (2026-09-22): nothing displays a crowd report any more, so asking for one
  promised something the app no longer does. The picker itself still exists in
  RateCrowd for the day it comes back.

  IT ADDS TO YOUR REVIEW, NEVER REPLACES IT. The row is one per person per gym
  and a save writes all of it, so the card starts from the review you already
  wrote and the save sends back everything it did not touch — your comment and
  any score you did not tap. Before this, one star here wiped a written review.
  The review is read again at the moment of saving, so a review edited on the
  gym page while this card was open is not written over either; if that read
  fails, nothing is saved rather than risk the wipe.

  All colour = theme tokens.
*/
import { useEffect, useState } from "react";
import {
  REVIEW_CATEGORIES,
  EMPTY_SCORES,
  listGymReviews,
  saveGymReview,
  type GymReview,
  type ReviewScores,
} from "@/lib/supabase/gymReviews";
import { StarRater } from "@/components/gyms/RateCrowd";
import Button from "@/components/ui/Button";

const myReview = async (userId: string, gymSlug: string): Promise<GymReview | null> =>
  (await listGymReviews(userId, gymSlug)).find((r) => r.mine) ?? null;

export default function GymCheckInPrompt({
  userId,
  gymSlug,
  gymName,
  onDone,
}: {
  userId: string;
  gymSlug: string;
  gymName: string;
  onDone: () => void;
}) {
  /* Only the scores tapped on this card; everything else stays as it was. */
  const [touched, setTouched] = useState<Partial<ReviewScores>>({});
  const [existing, setExisting] = useState<GymReview | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    myReview(userId, gymSlug)
      .then((r) => {
        if (live) setExisting(r);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [userId, gymSlug]);

  const shown = (k: keyof ReviewScores) => touched[k] ?? existing?.scores[k] ?? 0;

  const done = async () => {
    if (Object.keys(touched).length === 0) return onDone();
    setBusy(true);
    try {
      const now = await myReview(userId, gymSlug);
      await saveGymReview(
        userId,
        gymSlug,
        { ...EMPTY_SCORES, ...(now?.scores ?? {}), ...touched },
        now?.comment ?? "",
      );
    } catch {
      // Rating a gym is the smallest thing on this screen; a failed write is
      // not worth trapping somebody in a dialog over.
    } finally {
      setBusy(false);
      onDone();
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5">
        <div className="text-[15px] font-semibold text-text">Nice work at {gymName}</div>

        <div className="mt-4 flex flex-col gap-3">
          {REVIEW_CATEGORIES.map((c) => (
            <div key={c.key} className="flex items-center justify-between gap-2">
              <span className="text-[13px] text-text">{c.label}</span>
              <StarRater
                value={shown(c.key)}
                size={20}
                onRate={(n) => setTouched((s) => ({ ...s, [c.key]: n }))}
              />
            </div>
          ))}
        </div>

        <Button size="lg" full onClick={done} disabled={busy} className="mt-5">
          {busy ? "Saving…" : "Done"}
        </Button>
        <Button variant="muted" size="sm" full onClick={onDone} className="mt-1.5">
          Skip
        </Button>
      </div>
    </div>
  );
}
