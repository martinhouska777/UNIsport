"use client";

import { useEffect, useState, type RefObject } from "react";

/*
  A TITLE CARD ARRIVES WHEN YOU REACH IT — StudentIntro and Interlude.

  Returns true while the card is on screen; the CSS (.l-titlecard.is-in, in
  app/globals.css) does the rest. It goes back to false when the card leaves,
  so scrolling back up to the card plays its entrance again rather than
  showing a card that has already happened.

  Takes the ref rather than making one: both cards already have a ref on that
  same <section> for the school cycle.
*/
export function useReveal(ref: RefObject<HTMLElement | null>, threshold = 0.25) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, threshold]);
  return on;
}
