"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Wordmark from "@/components/landing/Wordmark";
import { nav, views, type LandingView } from "@/lib/landingCopy";

/*
  The phone menu (owner, 2026-09-15). The six tabs used to take a second row
  of the top bar that scrolled sideways; now a menu button at the left of the
  bar slides them in as a panel from the left edge, and the bar is one row.
  Laptops keep the tabs in the bar (this is md:hidden).

  The panel is portalled to <body>: the bar lives inside StickyBar, which
  slides with a transform, and a fixed element inside a transform is pinned
  to the bar instead of the screen.

  Closes on the ✕, a tap on the dimmed page, Escape, choosing a tab, or the
  window growing to laptop width. While open the page does not scroll.
*/
export default function LandingMenu({ view }: { view: LandingView }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const wide = window.matchMedia("(min-width: 768px)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    const trigger = triggerRef.current;
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={nav.menu}
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="tap44 -ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-l-text transition-colors hover:bg-l-bg-elevated md:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[60] md:hidden">
            <div aria-hidden onClick={close} className="absolute inset-0 bg-l-scrim animate-[backdrop-in_200ms_ease-out] motion-reduce:animate-none" />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={nav.menu}
              className="absolute inset-y-0 left-0 flex w-[min(82vw,320px)] flex-col border-r border-l-line bg-l-bg animate-[drawer-in_260ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none"
            >
              <div className="flex items-center justify-between px-6 py-[11px]">
                <Link href="/" aria-label="UNIsport" onClick={close}>
                  <Wordmark className="text-2xl" />
                </Link>
                <button
                  ref={closeRef}
                  type="button"
                  aria-label={nav.closeMenu}
                  onClick={close}
                  className="tap44 -mr-2 flex h-10 w-10 items-center justify-center rounded-full text-l-text-2 transition-colors hover:bg-l-bg-elevated hover:text-l-text"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
              <nav aria-label="Sections" className="flex flex-col gap-1 border-t border-l-line px-3 pt-3">
                {views.map((v) => {
                  const on = v.view === view;
                  return (
                    <Link
                      key={v.view}
                      href={v.href}
                      onClick={close}
                      aria-current={on ? "page" : undefined}
                      className={`rounded-2xl px-4 py-3 text-base font-medium tracking-tight transition-colors ${
                        on ? "bg-l-line-hover/60 text-l-text" : "text-l-text-2 hover:bg-l-bg-elevated hover:text-l-text"
                      }`}
                    >
                      {v.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
