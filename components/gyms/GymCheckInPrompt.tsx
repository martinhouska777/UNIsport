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

  All colour = theme tokens.
*/
import { useState } from "react";
import {
  REVIEW_CATEGORIES,
  EMPTY_SCORES,
  saveGymReview,
  overallOf,
  type ReviewScores,
} from "@/lib/supabase/gymReviews";
import { StarRater } from "@/components/gyms/RateCrowd";
import Button from "@/components/ui/Button";

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
  const [scores, setScores] = useState<ReviewScores>(EMPTY_SCORES);
  const [busy, setBusy] = useState(false);

  const done = async () => {
    if (overallOf(scores) === null) return onDone();
    setBusy(true);
    try {
      await saveGymReview(userId, gymSlug, scores, "");
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
                value={scores[c.key] ?? 0}
                size={20}
                onRate={(n) => setScores((s) => ({ ...s, [c.key]: n }))}
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
