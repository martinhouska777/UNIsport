"use client";

/*
  THE COMPETITION SWITCH — ‹ Houses › right in the bar.

  It used to be a dropdown button that opened a sheet from the bottom. The
  owner wanted it to move sideways instead (2026-09-15: "make it with the small
  arrows like it goes from right to left and you can swap it horizontally"):
  the arrows step through the competitions, a sideways swipe on the control
  does the same, and the new name slides in from the side it came from — next
  arrives from the right, previous from the left. The list wraps round, so
  neither arrow is ever dead.

  The slide is two keyframes in app/globals.css (lb-in-from-right / -left).
  touch-pan-y leaves vertical scrolling to the page; only a mostly-sideways
  swipe of 30px or more counts.

  Used for BOTH leaderboard controls, Competition and Period. Filled with the
  theme's text colour (white on the dark theme) so they stand out (owner,
  2026-09-19: "make it a different colour so it stands out, maybe white").
*/
import { useRef, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";

export type SwitchOption<K extends string> = { key: K; label: string };

export default function CompetitionSwitcher<K extends string>({
  caption,
  options,
  value,
  onChange,
}: {
  caption: string;
  options: SwitchOption<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  // Which way the last change went, so the name slides in from that side.
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const index = Math.max(0, options.findIndex((o) => o.key === value));
  const step = (by: 1 | -1) => {
    setDir(by === 1 ? "next" : "prev");
    onChange(options[(index + by + options.length) % options.length].key);
  };

  const slide =
    dir === "next"
      ? "animate-[lb-in-from-right_240ms_ease-out]"
      : dir === "prev"
        ? "animate-[lb-in-from-left_240ms_ease-out]"
        : "";

  return (
    <div
      className="flex min-w-0 flex-1 touch-pan-y select-none items-stretch rounded-xl bg-text text-background"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return;
        // Finger moving right to left pulls the next one in from the right.
        step(dx < 0 ? 1 : -1);
      }}
    >
      <button
        type="button"
        aria-label={`Previous ${caption.toLowerCase()}`}
        onClick={() => step(-1)}
        className="tap44 flex w-8 flex-shrink-0 items-center justify-center rounded-l-xl text-background/60 active:text-background"
      >
        <IconChevronLeft size={15} />
      </button>
      <div className="min-w-0 flex-1 overflow-hidden py-2 text-center" aria-live="polite">
        <span className="block text-[9px] uppercase tracking-[0.1em] text-background/60">{caption}</span>
        <span
          key={value}
          className={`mt-0.5 block truncate text-[13px] font-semibold text-background motion-reduce:animate-none ${slide}`}
        >
          {options[index]?.label}
        </span>
      </div>
      <button
        type="button"
        aria-label={`Next ${caption.toLowerCase()}`}
        onClick={() => step(1)}
        className="tap44 flex w-8 flex-shrink-0 items-center justify-center rounded-r-xl text-background/60 active:text-background"
      >
        <IconChevronRight size={15} />
      </button>
    </div>
  );
}
