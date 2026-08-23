"use client";

import { useEffect, useState, type RefObject } from "react";
import { schools } from "@/lib/landingSchools";

/*
  WHICH SCHOOL THE INTRO IS SHOWING — one index, ticking round the eight.

  It lives here rather than inside the backdrop because more than the phones
  answer to it now: the wordmark's second half, "Your people", the button and
  the row of letters all take the school's colour, so the intro owns the state
  and hands it down.

  It runs only when it is worth running: never under reduced motion, and
  stopped while the tab is in the background or the intro has been scrolled
  past — a timer swapping images nobody is looking at is just heat. It
  restarts from wherever it left off.

  `count` is how many of the eight captures are mounted: it starts at two — the
  one showing and the one coming — and only ever grows, so the eight arrive
  over the first cycle instead of all landing on the front door at once.
*/
export function useSchoolCycle(ref: RefObject<HTMLElement | null>, periodMs: number) {
  const [{ i, count }, setCycle] = useState({ i: 0, count: 2 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | null = null;
    let onScreen = true;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      if (timer || !onScreen || document.hidden) return;
      timer = setInterval(
        () =>
          setCycle((s) => {
            const next = (s.i + 1) % schools.length;
            return { i: next, count: Math.max(s.count, Math.min(next + 2, schools.length)) };
          }),
        periodMs,
      );
    };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    io.observe(el);
    const onVisible = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisible);
    start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [ref, periodMs]);

  return { i, count, school: schools[i] };
}
