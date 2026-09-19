"use client";

import { useEffect, useRef, type ReactNode } from "react";

/*
  The feature rows ARRIVE FROM THE LEFT, one after another, the first time the
  list comes on screen (owner, 2026-09-19: "a pak to overview of the app, jak
  je tam ta každá feature, tak udělej ať to tam přijede zleva").

  Same rules as the stories' own arrival (.ls-enter in app/globals.css):
    • armed by JS only, so with no script nothing is ever hidden;
    • armed only when the list is still below the fold — a list already on
      screen (a deep link, a short window) is never yanked away to be animated
      back in;
    • never armed under reduced motion.
  It plays once. Each row carries its place as --i, which staggers the delay.
*/
export default function SlideInRows({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add("l-slide-armed");
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        el.classList.add("l-slide-in");
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ul ref={ref} className={className}>
      {children}
    </ul>
  );
}
