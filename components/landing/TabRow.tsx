"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/*
  The phone-width tab row. Six labels do not fit a 390px phone at a readable
  size, so the row scrolls sideways — and this wrapper draws a fade on the
  right edge while there is more to the right, and drops it once the row is
  scrolled to its end, so the visitor knows there is (and then isn't) more.
  Client-side only for that one measurement; the tabs themselves are plain
  links rendered by the server.
*/
export default function TabRow({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
    // Open with the current tab in view (Contact sits off the right edge of a phone).
    const on = el.querySelector<HTMLElement>("[aria-current]");
    if (on) el.scrollLeft = Math.max(0, on.offsetLeft - (el.clientWidth - on.offsetWidth) / 2);
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      ro.disconnect();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div ref={ref} className="-mx-6 overflow-x-auto px-6 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <div
        aria-hidden
        className={`pointer-events-none absolute -right-6 top-0 bottom-3 w-14 bg-gradient-to-r from-transparent to-l-bg transition-opacity ${
          more ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
