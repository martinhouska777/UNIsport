"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  THE INTRO'S WORDMARK WATCH.

  This used to also fade the intro out and lag it behind the page as you
  scrolled, so the story's first stage rose over it. On a phone the owner read
  that as the page bleeding into itself — the top going dark while the next
  section arrived early (2026-09-05) — so the intro is STATIC now: it scrolls
  off at full strength, like any other section.

  What is left is one measurement, written onto the DOM and spent in CSS:

    data-hero-mark on <html>: "here" while the intro's big wordmark is on
                   screen, "gone" after. The top bar's small wordmark is drawn
                   only when it is "gone" — one mark at a time.

  Measured on scroll through one rAF, like StickyBar; nothing re-renders, and
  nothing here moves — no motion to switch off for reduced motion.
*/
export default function HeroFade({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const root = document.documentElement;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const span = Math.max(node.offsetHeight, 1);
      const p = Math.min(Math.max(window.scrollY / span, 0), 1);
      // Just over half way out: by then the big mark has left the screen.
      root.dataset.heroMark = p > 0.55 ? "gone" : "here";
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
      // Leaving the intro behind (a tabbed view, a route change) must give the
      // bar its wordmark back.
      delete root.dataset.heroMark;
    };
  }, []);

  return (
    <div ref={ref} className="l-hero-fade flex flex-col items-center">
      {children}
    </div>
  );
}
