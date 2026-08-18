"use client";

import { useEffect, useRef, useState } from "react";

/*
  What both closers share: they only MOVE while on screen, they honour
  prefers-reduced-motion live, and when they scroll out of view they hand
  control back (un-pin, return to Harvard) so the next arrival opens the way
  the first one did — the colour the story's phone was wearing.

  Returns the ref to put on the section, and the two gates.
*/
export function useCloserGate(onLeave: () => void) {
  const ref = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const leave = useRef(onLeave);
  useEffect(() => {
    leave.current = onLeave;
  }, [onLeave]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (!e.isIntersecting) leave.current();
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return { ref, inView, reduced };
}
