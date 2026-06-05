"use client";

/*
  Shown right after you save a workout logged at a known gym: an optional
  one-tap "rate the gym + how busy was it" card. Taps save immediately (through
  useGymStats), so "Done" and "Skip" both just dismiss. All color = theme tokens.
*/
import { useGymStats } from "@/lib/gymSocial";
import { StarRater, CrowdPicker } from "@/components/gyms/RateCrowd";

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
  const { getRating, setRating, getCrowd, reportCrowd } = useGymStats(userId);
  const rating = getRating(gymSlug);
  const crowd = getCrowd(gymSlug);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-surface p-5">
        <div className="text-[15px] font-semibold text-text">Nice work at {gymName}</div>
        <div className="mt-1 text-[12px] text-muted">
          Optional — rate it and tell others how busy it was.
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-primary">
            How was it?
          </span>
          {rating && <span className="text-[11px] text-muted">{rating.value.toFixed(1)} / 5</span>}
        </div>
        <div className="mt-2">
          <StarRater value={rating?.value ?? 0} onRate={(n) => setRating(gymSlug, n)} />
        </div>

        <div className="mt-4 text-[10px] font-medium uppercase tracking-[0.1em] text-primary">
          How busy was it?
        </div>
        <div className="mt-2">
          <CrowdPicker value={crowd?.level ?? null} onReport={(l) => reportCrowd(gymSlug, l)} />
        </div>

        <button
          type="button"
          onClick={onDone}
          className="mt-5 w-full rounded-full bg-primary py-3 text-[14px] font-semibold text-primary-contrast"
        >
          Done
        </button>
        <button
          type="button"
          onClick={onDone}
          className="mt-1.5 w-full py-1 text-[12px] text-muted"
        >
          Skip
        </button>
      </div>
    </div>
  );
}
