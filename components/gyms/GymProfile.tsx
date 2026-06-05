"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { useFavorites, useGymStats, timeAgo } from "@/lib/gymSocial";
import { StarRater, CrowdPicker, RatingValue } from "@/components/gyms/RateCrowd";
import type { Gym, GalleryIcon } from "@/lib/gyms";
import {
  IconArrowLeft,
  IconHeart,
  IconClock,
  IconMapPin,
  IconBarbell,
  IconRun,
  IconSwimming,
  IconBasketball,
} from "@/components/icons";

const galleryIcons: Record<GalleryIcon, (p: { size?: number; className?: string }) => React.ReactNode> = {
  barbell: IconBarbell,
  run: IconRun,
  swimming: IconSwimming,
  basketball: IconBasketball,
};

export default function GymProfile({ gym }: { gym: Gym }) {
  const { userId } = useAppState();
  const { isFavorite, toggle } = useFavorites(userId);
  const { getRating, setRating, getCrowd, reportCrowd } = useGymStats(userId);
  const favorite = isFavorite(gym.slug);
  const rating = getRating(gym.slug);
  const crowd = getCrowd(gym.slug);
  const [activePhoto, setActivePhoto] = useState(0);

  const onGalleryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setActivePhoto(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-2.5">
        <Link href="/gyms" aria-label="Back to gyms" className="text-muted">
          <IconArrowLeft size={18} />
        </Link>
        <span className="truncate px-2 text-[13px] font-medium text-text">
          {gym.name}
        </span>
        <button
          type="button"
          aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={favorite}
          onClick={() => toggle(gym.slug)}
          className={favorite ? "text-primary" : "text-muted"}
        >
          <IconHeart size={18} filled={favorite} />
        </button>
      </div>

      {/* Photo gallery */}
      {gym.gallery.length > 0 && (
        <div className="relative">
          <div
            onScroll={onGalleryScroll}
            className="flex snap-x snap-mandatory overflow-x-auto [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {gym.gallery.map((photo, i) => {
              const PhotoIcon = galleryIcons[photo.icon];
              return (
                <div
                  key={i}
                  className="flex h-50 min-w-full snap-start flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/25 to-surface-2"
                >
                  <span className="text-text/15">
                    <PhotoIcon size={40} />
                  </span>
                  <span className="text-[11px] text-text/40">{photo.label}</span>
                </div>
              );
            })}
          </div>

          {/* Dash indicators */}
          {gym.gallery.length > 1 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-background/70 to-transparent px-3.5 pb-2.5 pt-6">
              {gym.gallery.map((_, i) => (
                <span
                  key={i}
                  className={`h-[3px] rounded-sm transition-all ${
                    i === activePhoto ? "w-[18px] bg-text" : "w-1.5 bg-text/30"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Header block */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-1.5 text-[15px] font-medium text-text">{gym.name}</div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <IconClock size={13} /> {gym.hours}
          </span>
          <RatingValue rating={rating} showAgo />
          <span className="flex items-center gap-1.5">
            <IconMapPin size={13} /> {gym.address}
          </span>
        </div>
      </div>

      {/* Your rating + live crowd — what you fill in after / during a workout */}
      <div className="border-b border-border px-3.5 py-3.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-primary">
            Rate this gym
          </span>
          <span className="text-[11px] text-muted">
            {rating ? `You rated · ${timeAgo(rating.at)}` : "Tap a star"}
          </span>
        </div>
        <div className="mt-2">
          <StarRater value={rating?.value ?? 0} onRate={(n) => setRating(gym.slug, n)} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-primary">
            How busy right now?
          </span>
          <span className="text-[11px] text-muted">
            {crowd ? `Reported ${timeAgo(crowd.at)}` : "No recent reports"}
          </span>
        </div>
        <div className="mt-2">
          <CrowdPicker value={crowd?.level ?? null} onReport={(l) => reportCrowd(gym.slug, l)} />
        </div>
      </div>

      {/* Equipment sections — one block per section, one row per item */}
      {gym.equipment
        .filter((section) => section.rows.length > 0)
        .map((section) => (
          <div key={section.title} className="border-b border-border px-3.5 py-3">
            <div className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-primary">
              {section.title}
            </div>
            <div className="flex flex-col divide-y divide-border">
              {section.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2"
                >
                  <span className="text-xs text-muted">{row.label}</span>
                  <span className="text-xs font-medium text-text">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* Ratings breakdown — one gold bar per category */}
      {gym.ratings.length > 0 && (
        <div className="px-3.5 py-3">
          <div className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.1em] text-primary">
            Ratings Breakdown
          </div>
          <div className="flex flex-col gap-2">
            {gym.ratings.map((r) => (
              <div key={r.label} className="flex items-center gap-2.5">
                <span className="min-w-[90px] text-[11px] text-muted">{r.label}</span>
                <span className="h-1 flex-1 rounded-sm bg-surface-2">
                  <span
                    className="block h-1 rounded-sm bg-accent"
                    style={{ width: `${(r.value / 5) * 100}%` }}
                  />
                </span>
                <span className="min-w-[24px] text-right text-[11px] text-text">
                  {r.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom action — Match tab not built yet, so this is visual only */}
      <div className="px-3.5 pb-4 pt-2">
        <button
          type="button"
          className="w-full rounded-2xl bg-primary py-3.5 text-center text-[13px] font-medium text-primary-contrast"
        >
          Find a partner at this gym{" "}
          <span className="text-primary-contrast/60">→</span>
        </button>
      </div>
    </div>
  );
}
