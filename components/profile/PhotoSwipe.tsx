"use client";

/*
  PHOTO SWIPE — one session's photos, one at a time, swiped sideways.
  ---------------------------------------------------------------------------
  Used on the Memories screen and in its Flashback (owner, 2026-09-15: "you
  can tap pictures and scroll them"). Each photo fills the width; a swipe snaps
  to the next, the dots under it say which one you're on, and a tap opens the
  full-screen viewer at that photo. One photo means no dots.

  It is plain CSS scroll-snap, so the phone's own swipe does the work and it
  scrolls with a trackpad or a mouse wheel too. Colours are theme tokens.
*/
import { useRef, useState } from "react";

export default function PhotoSwipe({
  photos,
  label,
  onOpen,
}: {
  photos: { id: string; src: string }[];
  /** Says what the photos are, for screen readers: "Gym on Monday, August 24". */
  label: string;
  onOpen: (index: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);

  const onScroll = () => {
    const el = track.current;
    if (!el || el.clientWidth === 0) return;
    setAt(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div>
      <div
        ref={track}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onOpen(i)}
            aria-label={`${label}, photo ${i + 1} of ${photos.length}`}
            className="aspect-square w-full flex-shrink-0 snap-center overflow-hidden bg-surface-2"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt="" className="h-full w-full object-cover" draggable={false} />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
          {photos.map((p, i) => (
            <span
              key={p.id}
              className={`h-1.5 rounded-full transition-all ${i === at ? "w-4 bg-text" : "w-1.5 bg-border"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
