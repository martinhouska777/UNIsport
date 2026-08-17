"use client";

/*
  MEMORY VIEWER — one photo, full screen, with the session written under it.
  ---------------------------------------------------------------------------
  Opened by tapping any tile in the Memories gallery. The picture is the screen;
  everything the session knew about itself sits in a panel over the bottom of
  it: the day, where you were, what you trained, who you were with, and the note
  you wrote at the time.

  It browses the WHOLE gallery, not just the session the photo came from — swipe
  or use the arrows and you walk back through your training the way you'd walk
  back through a camera roll. The counter in the corner still tells you where
  you are inside the session ("2 / 4"), because that's the number that explains
  why two photos in a row look the same.

  All colour is theme tokens (rule 1). The scrim is the background colour faded
  out, so it reads as the app dimming rather than a black box.
*/
import { useEffect, useRef } from "react";
import {
  IconX,
  IconMapPin,
  IconUser,
  IconChevronLeft,
  IconChevronRight,
} from "@/components/icons";
import { fullDateLabel, type Memory } from "@/lib/memories";

// A swipe has to travel this far before it counts, so a tap never navigates.
const SWIPE_PX = 50;

export default function MemoryViewer({
  memories,
  index,
  onIndex,
  onClose,
}: {
  memories: Memory[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const startX = useRef<number | null>(null);
  const memory = memories[index];

  const hasPrev = index > 0;
  const hasNext = index < memories.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onIndex(index - 1);
      if (e.key === "ArrowRight" && index < memories.length - 1) onIndex(index + 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, memories.length, onIndex, onClose]);

  if (!memory) return null;

  const onTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? startX.current) - startX.current;
    startX.current = null;
    if (dx <= -SWIPE_PX && hasNext) onIndex(index + 1);
    if (dx >= SWIPE_PX && hasPrev) onIndex(index - 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar — close, and where you are inside this session */}
      <div className="flex items-center justify-between px-3 py-3">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap44 press-icon flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-text"
        >
          <IconX size={18} />
        </button>
        {memory.count > 1 && (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-muted">
            {memory.position} / {memory.count}
          </span>
        )}
      </div>

      {/* The photo, and the arrows that walk the gallery */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={memory.src}
          alt={`${memory.trained} on ${fullDateLabel(memory.date)}`}
          className="max-h-full max-w-full rounded-xl object-contain"
        />

        {hasPrev && (
          <button
            type="button"
            onClick={() => onIndex(index - 1)}
            aria-label="Previous photo"
            className="tap44 press-icon absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2/90 text-text"
          >
            <IconChevronLeft size={18} />
          </button>
        )}
        {hasNext && (
          <button
            type="button"
            onClick={() => onIndex(index + 1)}
            aria-label="Next photo"
            className="tap44 press-icon absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-surface-2/90 text-text"
          >
            <IconChevronRight size={18} />
          </button>
        )}
      </div>

      {/* What this session was */}
      <div className="shrink-0 px-4 pb-7 pt-4">
        <div className="text-[11px] uppercase tracking-[0.12em] text-muted">
          {fullDateLabel(memory.date)}
        </div>

        {memory.trained && (
          <div className="mt-1.5 text-[15px] font-semibold text-text">{memory.trained}</div>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {memory.gym && (
            <span className="flex items-center gap-1.5 text-[13px] text-text-2">
              <IconMapPin size={14} />
              {memory.gym}
            </span>
          )}
          {memory.partner && (
            <span className="flex items-center gap-1.5 text-[13px] text-text-2">
              <IconUser size={14} />
              with {memory.partner}
            </span>
          )}
        </div>

        {memory.note && (
          <p className="mt-3 rounded-xl border border-border bg-surface px-3.5 py-3 text-[13px] leading-relaxed text-text-2">
            {memory.note}
          </p>
        )}
      </div>
    </div>
  );
}
