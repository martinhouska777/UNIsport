"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
  The top bar, pinned — like a regular website's — EXCEPT over the stages.
  Below the intro the page is full-screen sticky stages (the two stories,
  the two closers), and a bar pinned over them sat on top of every one, so
  the bar used to be static. Now it is sticky and slides up out of the way
  while a stage is under it, and slides back on the ordinary sections
  (features beside a closer are inside the closer, so it stays away there).

  On a phone the bar is two rows (≈120px of an 844px screen), so there it
  also hides while scrolling down and returns on the first scroll up — the
  usual phone pattern; on desktop it is simply there.

  Measured on scroll through one rAF; the stages are found once by class
  (`.ls-story`, `.lc-closer`) — the same page structure the suites lock in.
  The bar is in flow (position: sticky), so nothing below it moves.
*/
export default function StickyBar({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const stages = Array.from(document.querySelectorAll<HTMLElement>(".ls-story, .lc-closer"));
    const phone = window.matchMedia("(max-width: 767px)");
    let lastY = window.scrollY;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = window.scrollY;
      const barH = el.offsetHeight;
      const overStage = stages.some((s) => {
        const r = s.getBoundingClientRect();
        return r.top < barH && r.bottom > 0;
      });
      const down = y > lastY + 2;
      const up = y < lastY - 2;
      lastY = y;
      setHidden((h) => {
        if (overStage) return true;
        if (!phone.matches) return false;
        if (y < 40) return false;
        if (down) return true;
        if (up) return false;
        return h; // no direction change: keep the current state
      });
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
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`sticky top-0 z-[30] transition-transform duration-300 ease-out motion-reduce:transition-none ${
        hidden ? "-translate-y-full" : "translate-y-0"
      }`}
    >
      {children}
    </div>
  );
}
