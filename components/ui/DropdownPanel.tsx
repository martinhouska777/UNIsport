"use client";

/*
  A PANEL THAT OPENS UNDER ITS BUTTON AND NEVER RUNS OFF THE BOTTOM.

  The filter panels used to be a flat "62% of the screen tall" box dropped into
  the page. That is fine when the button sits near the top, but the Session
  search and the Buddy Board put their Filters button halfway down — so the
  panel started low, ended below the screen, and the Apply button at its foot
  was somewhere you couldn't see.

  This measures the room actually left between the panel's top and the bottom of
  the scrolling area, and is only ever that tall. When even that is too little
  it takes a workable minimum instead and scrolls the page just far enough to
  bring its own bottom edge into view. Either way the last thing you see is the
  panel's own edge, with the Apply row sitting on it.

  It re-measures on resize and when the phone's keyboard changes the visible
  area (visualViewport), so an opened panel stays inside the screen.
*/
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Never squeeze the panel below this — a smaller one is unusable. */
const MIN_HEIGHT = 260;
/** Never let it take more than this share of the screen, even with room to spare. */
const MAX_SHARE = 0.62;
/** Breathing room under the panel, so its edge doesn't touch the screen's. */
const GAP = 10;

/** The nearest ancestor that actually scrolls — the tab's <main>, normally. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

export default function DropdownPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  /** Extra classes for the panel box itself (the look; the height is ours). */
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [maxHeight, setMaxHeight] = useState<number | null>(null);

  // How tall it may be, from the room genuinely left below its top edge.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const scroller = scrollParent(el);
      const floor = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
      const room = floor - el.getBoundingClientRect().top - GAP;
      const ceiling = window.innerHeight * MAX_SHARE;
      setMaxHeight(Math.max(Math.min(MIN_HEIGHT, ceiling), Math.min(room, ceiling)));
    };
    measure();
    window.addEventListener("resize", measure);
    window.visualViewport?.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.visualViewport?.removeEventListener("resize", measure);
    };
  }, []);

  // Then, if it still hangs over the bottom (it was clamped to the minimum),
  // scroll it up by exactly the overhang so the whole panel is on screen.
  useEffect(() => {
    if (maxHeight === null) return;
    const el = ref.current;
    if (!el) return;
    const scroller = scrollParent(el);
    const floor = scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight;
    const over = el.getBoundingClientRect().bottom + GAP - floor;
    if (over > 1) (scroller ?? window).scrollBy({ top: over, behavior: "smooth" });
  }, [maxHeight]);

  return (
    <div
      ref={ref}
      // Until the first measure lands, the old cap keeps it sane (and it is
      // what a server-rendered pass shows).
      style={{ maxHeight: maxHeight === null ? "62dvh" : `${maxHeight}px` }}
      className={`mt-2 overflow-y-auto overscroll-contain ${className}`}
    >
      {children}
    </div>
  );
}
