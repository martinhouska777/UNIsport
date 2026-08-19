"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { useFavorites, useGymStats, timeAgo } from "@/lib/gymSocial";
import { StarRater, CrowdPicker, RatingValue } from "@/components/gyms/RateCrowd";
import { ButtonLink } from "@/components/ui/Button";
import { gymHighlights, type Gym, type GalleryIcon } from "@/lib/gyms";
import {
  IconArrowLeft,
  IconHeart,
  IconClock,
  IconMapPin,
  IconChevronDown,
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
  const highlights = gymHighlights(gym);
  const crowd = getCrowd(gym.slug);
  const [activePhoto, setActivePhoto] = useState(0);
  // See FavHeart in the gyms list: counts taps so the pop plays on the tap and
  // not on every render of a gym that's already a favourite.
  const [favTaps, setFavTaps] = useState(0);

  const onGalleryScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setActivePhoto(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-2.5">
        <Link
          href="/gyms"
          aria-label="Back to gyms"
          className="tap44 press-icon flex h-8 w-8 items-center justify-center text-muted"
        >
          <IconArrowLeft size={18} />
        </Link>
        <span className="truncate px-2 text-[13px] font-medium text-text">
          {gym.name}
        </span>
        <button
          type="button"
          aria-label={favorite ? "Remove from favourites" : "Add to favourites"}
          aria-pressed={favorite}
          onClick={() => {
            setFavTaps((t) => t + 1);
            toggle(gym.slug);
          }}
          className={`tap44 press-icon flex h-8 w-8 items-center justify-center ${
            favorite ? "text-primary-live" : "text-muted"
          }`}
        >
          <span key={favTaps} className={favTaps > 0 && favorite ? "react-pop block" : "block"}>
            <IconHeart size={18} filled={favorite} />
          </span>
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
                  className="flex h-50 min-w-full snap-start flex-col items-center justify-center gap-2 bg-gradient-to-br from-surface-2 to-background"
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
        <h1 className="mb-1.5 text-[15px] font-medium text-text">{gym.name}</h1>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-[11px] text-muted">
          <span className="flex items-center gap-1.5">
            <IconClock size={13} /> {gym.hours}
          </span>
          <RatingValue value={gym.rating} count={gym.ratingCount} />
          <span className="flex items-center gap-1.5">
            <IconMapPin size={13} /> {gym.address}
          </span>
        </div>

        {/*
          The headline kit, up here rather than fifteen rows down. "Can I squat,
          is there a bench, is there a pool" is the question a gym page is
          actually asked, and it used to be answered somewhere in the middle of
          four equal-looking lists. Which numbers count is DATA (lib/gyms.ts).
        */}
        {highlights.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {highlights.map((h) => (
              <li
                key={h}
                className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-2"
              >
                {h}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Your rating + live crowd — what you fill in after / during a workout */}
      {/* data-tour: the gym tour lights this pair (lib/tour.ts). */}
      <div data-tour="gym-rate" className="border-b border-border px-3.5 py-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Rate this gym
          </h2>
          <span className="text-[11px] text-muted">
            {rating ? `You rated · ${timeAgo(rating.at)}` : "Tap a star"}
          </span>
        </div>
        <div className="mt-2">
          <StarRater value={rating?.value ?? 0} onRate={(n) => setRating(gym.slug, n)} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            How busy right now?
          </h2>
          <span className="text-[11px] text-muted">
            {crowd ? `Reported ${timeAgo(crowd.at)}` : "No recent reports"}
          </span>
        </div>
        <div className="mt-2">
          <CrowdPicker value={crowd?.level ?? null} onReport={(l) => reportCrowd(gym.slug, l)} />
        </div>
      </div>

      {/*
        Equipment, folded away. All four sections used to be open at once — ~25
        rows of identical weight between the top of the page and the "find a
        partner" button, which is why nobody ever reached it. Closed, the whole
        gym fits on a screen and the sections become a table of contents; the
        headline numbers are already up in the header for anyone who only wanted
        those.

        <details> rather than React state on purpose: it opens without
        JavaScript, it is keyboard-operable and screen-reader-announced for
        free, and the browser handles find-in-page opening the right section.
      */}
      {gym.equipment
        .filter((section) => section.rows.length > 0)
        .map((section) => (
          <details key={section.title} className="group border-b border-border">
            <summary className="tap44 flex cursor-pointer list-none items-center justify-between px-3.5 py-3 [&::-webkit-details-marker]:hidden">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {section.title}
              </h2>
              {/* Chevron only. A bare row-count here read as a score on a page
                  that already shows "4.8 (142)" and a ratings breakdown. */}
              <span className="text-muted transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none">
                <IconChevronDown size={16} />
              </span>
            </summary>
            <div className="flex flex-col divide-y divide-border px-3.5 pb-3">
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
          </details>
        ))}

      {/* Ratings breakdown — one gold bar per category */}
      {gym.ratings.length > 0 && (
        <div className="px-3.5 py-3">
          {/* An average with no sample size is meaningless — 4.6 from two
              people reads the same as 4.6 from two hundred. */}
          <div className="mb-2.5 flex items-baseline justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Ratings Breakdown
            </h2>
            {gym.ratingCount > 0 && (
              <span className="text-[11px] text-muted">
                {gym.ratingCount} {gym.ratingCount === 1 ? "rating" : "ratings"}
              </span>
            )}
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

      {/*
        The page's one conversion action. It used to be a dead <button> with no
        handler, sitting below ~25 rows of equipment where nobody scrolled — so
        it is now a real link AND sticks to the bottom of the viewport (above
        the tab bar) instead of waiting at the end of the page.
      */}
      <div
        data-tour="gym-partner"
        className="sticky bottom-0 z-10 border-t border-border bg-surface px-3.5 pb-4 pt-3"
      >
        <ButtonLink href={`/match?gym=${encodeURIComponent(gym.name)}`} size="lg" full>
          Find a partner at this gym{" "}
          <span className="text-primary-contrast/60">→</span>
        </ButtonLink>
      </div>
    </div>
  );
}
