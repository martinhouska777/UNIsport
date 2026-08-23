"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  THE HAND-OVER. The intro used to simply scroll off and the first stage of the
  story was suddenly there — the owner's "you just land there".

  So the intro now LEAVES. As you scroll it fades and lags a little behind the
  page, and the story's first stage rises over it. Two numbers, both written
  onto the DOM and spent in CSS (app/globals.css, the .l-hero-fade rules):

    --l-out        0 at the top of the page → 1 once the intro has been
                   scrolled by its own height. Drives the fade and the lag.
    data-hero-mark on <html>: "here" while the intro's big wordmark is on
                   screen, "gone" after. The top bar's small wordmark is drawn
                   only when it is "gone" — one mark at a time.

  Measured on scroll through one rAF, like StickyBar; nothing re-renders.
  Reduced motion is handled in CSS (the fade is switched off), but the
  measurement still runs — the bar's wordmark depends on it.
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
      node.style.setProperty("--l-out", p.toFixed(3));
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
