"use client";

import { useEffect, useRef, useState } from "react";
import { dayHeading, type Memory } from "@/lib/memories";
import {
  IconX,
  IconSend,
  IconChevronLeft,
  IconChevronRight,
  IconMapPin,
  IconUser,
  IconCheck,
} from "@/components/icons";

/*
  ONE MEMORY, FULL SCREEN — the photo first, everything else laid over it.

  Swipe left/right (or the arrow keys, or the chevrons on a laptop) to move
  through the whole gallery without going back to the grid. Under the photo sits
  the part a camera roll can't give you: the day, the gym it was taken at, what
  you trained, who you trained with, and the comment you wrote for that session.

  Tapping the photo hides the overlay so you can just look at the picture.
  Colors are theme tokens (rule 1).
*/

// A drag has to travel this far before it counts as "next photo" rather than a tap.
const SWIPE_PX = 55;

export default function MemoryViewer({
  memories,
  index,
  onIndexChange,
  onClose,
  onShare,
}: {
  memories: Memory[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  onShare: (memory: Memory) => void;
}) {
  const [bare, setBare] = useState(false); // overlay hidden — just the photo
  const startX = useRef<number | null>(null);
  const moved = useRef(false);

  const memory = memories[index];
  const hasPrev = index > 0;
  const hasNext = index < memories.length - 1;

  const go = (delta: number) => {
    const next = index + delta;
    if (next >= 0 && next < memories.length) onIndexChange(next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // `go` closes over index, so this re-binds when the photo changes.
  }, [index, memories.length, onClose]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!memory) return null;

  const solo = !memory.partner || memory.partner.toLowerCase() === "solo";

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background [animation:backdrop-in_0.2s_ease-out]">
      {/* Photo layer — swipe here, and tap to hide/show the overlay. */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ touchAction: "pan-y" }}
        onPointerDown={(e) => {
          startX.current = e.clientX;
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (startX.current === null) return;
          if (Math.abs(e.clientX - startX.current) > 10) moved.current = true;
        }}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (dx <= -SWIPE_PX) go(1);
          else if (dx >= SWIPE_PX) go(-1);
          else if (!moved.current) setBare((b) => !b);
        }}
        onPointerCancel={() => {
          startX.current = null;
        }}
      >
        {/* Keyed on the memory so each photo fades in — swiping should feel like
            moving, not like one image being swapped in place. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={memory.id}
          src={memory.photo}
          alt=""
          className="max-h-full max-w-full object-contain [animation:backdrop-in_0.18s_ease-out]"
        />
      </div>

      {/* Top bar: close, position, share */}
      <div
        className={`relative flex items-center gap-2 px-3.5 pt-3 transition-opacity duration-200 ${
          bare ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap44 press-icon flex h-9 w-9 items-center justify-center rounded-full bg-surface/80 text-text backdrop-blur"
        >
          <IconX size={17} />
        </button>
        <span className="rounded-full bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-muted backdrop-blur">
          {index + 1} / {memories.length}
        </span>
        <button
          type="button"
          onClick={() => onShare(memory)}
          className="press ml-auto flex h-9 items-center gap-1.5 rounded-full bg-primary-live px-3.5 text-[12px] font-semibold text-primary-contrast"
        >
          <IconSend size={14} />
          Share
        </button>
      </div>

      {/* Laptop chevrons — a phone swipes, a mouse needs something to click. */}
      {hasPrev && (
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous memory"
          className={`press-icon absolute left-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-text backdrop-blur lg:flex ${
            bare ? "pointer-events-none opacity-0" : ""
          }`}
        >
          <IconChevronLeft size={18} />
        </button>
      )}
      {hasNext && (
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next memory"
          className={`press-icon absolute right-2 top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface/80 text-text backdrop-blur lg:flex ${
            bare ? "pointer-events-none opacity-0" : ""
          }`}
        >
          <IconChevronRight size={18} />
        </button>
      )}

      {/* The caption block — what makes this a memory and not a photo. */}
      <div
        className={`relative mt-auto transition-opacity duration-200 ${
          bare ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        {/* The note is a free-text field with no length limit, so this block has
            to be able to scroll — otherwise a long comment pushes the date and
            the chips off the top of the screen. */}
        <div className="max-h-[52dvh] overflow-y-auto overscroll-contain bg-gradient-to-t from-background via-background/85 to-transparent px-4 pb-5 pt-10">
          <div className="mx-auto w-full max-w-screen-sm">
            <div className="text-[15px] font-semibold text-text">{dayHeading(memory.date)}</div>

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {memory.trained.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-primary-tint px-2.5 py-1 text-[11px] font-medium text-primary"
                >
                  {t}
                </span>
              ))}
              {memory.verified && (
                <span className="flex items-center gap-1 rounded-full border border-success bg-success-tint px-2 py-1 text-[11px] font-medium text-success">
                  <IconCheck size={10} /> Verified
                </span>
              )}
            </div>

            {(memory.gym || !solo) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                {memory.gym && (
                  <span className="flex items-center gap-1">
                    <IconMapPin size={12} /> {memory.gym}
                  </span>
                )}
                {!solo && (
                  <span className="flex items-center gap-1">
                    <IconUser size={12} /> {memory.partner}
                  </span>
                )}
              </div>
            )}

            {memory.note && (
              <p className="mt-2.5 text-[13px] leading-relaxed text-text">{memory.note}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
