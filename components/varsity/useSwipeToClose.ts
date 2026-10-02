"use client";

/*
  SWIPE DOWN TO CLOSE — for a bottom sheet with the grey handle on top (owner,
  2026-10-02: "there is a gray line that's horizontal. It looks like if I swipe
  down, I can leave. This is what I want to do… not just the gray cancel
  button").

  The sheet follows the finger down and, let go far enough (or flicked), slides
  the rest of the way out and closes; a short pull springs back. It starts from
  the top of the sheet, or from anywhere in it while the part under the finger
  is scrolled to its top — a pull further down a scrolled list just scrolls it
  back up, the way sheets work on a phone.

  Touch only: a mouse has the X, the backdrop and Escape. Native listeners, not
  React props, so a portalled screen opened from inside the sheet (it bubbles
  through React's tree, not the page's) never drags the sheet, and neither does
  a full-screen overlay that sits inside it in the page (the Log sheet's
  editor is `position: fixed` within the panel).
*/
import { useEffect, useRef, type RefObject } from "react";

const START = 6; // px of movement before a pull counts as a drag
const CLOSE_AT = 90; // px pulled down that closes it on release
const FLICK = 0.5; // px per ms downward that closes it however short the pull

// The nearest element between `from` and `panel` that scrolls vertically, or
// null when the touch is on something fixed (an overlay inside the panel).
function scroller(from: Element, panel: HTMLElement): { el: HTMLElement | null; fixed: boolean } {
  let el: Element | null = from;
  let found: HTMLElement | null = null;
  while (el && el !== panel.parentElement) {
    if (el instanceof HTMLElement) {
      const cs = getComputedStyle(el);
      if (el !== panel && cs.position === "fixed") return { el: null, fixed: true };
      if (!found && /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) found = el;
    }
    if (el === panel) break;
    el = el.parentElement;
  }
  return { el: found, fixed: false };
}

export function useSwipeToClose(
  panelRef: RefObject<HTMLElement | null>,
  onClose: () => void,
  backdropRef?: RefObject<HTMLElement | null>,
) {
  /* The latest onClose, read at release. Callers pass a fresh arrow every
     render; listening on it would re-attach mid-pull and leave the sheet
     hanging where the finger left it. */
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    let y0 = 0;
    let x0 = 0;
    let lastY = 0;
    let lastT = 0;
    let speed = 0; // px per ms, downward, over the last move
    let armed = false; // this touch may become a pull
    let dragging = false;
    let dy = 0;

    const setY = (y: number, animate: boolean) => {
      panel.style.transition = animate ? "transform 0.22s cubic-bezier(0.2,0.8,0.2,1)" : "none";
      panel.style.transform = y > 0 ? `translateY(${y}px)` : "";
      const backdrop = backdropRef?.current;
      if (backdrop) {
        backdrop.style.transition = animate ? "opacity 0.22s ease-out" : "none";
        backdrop.style.opacity = y > 0 ? String(Math.max(0, 1 - y / panel.offsetHeight)) : "";
      }
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || !(e.target instanceof Element)) return;
      const { el, fixed } = scroller(e.target, panel);
      armed = !fixed && (!el || el.scrollTop <= 0);
      dragging = false;
      dy = 0;
      y0 = lastY = e.touches[0].clientY;
      x0 = e.touches[0].clientX;
      lastT = e.timeStamp;
      speed = 0;
    };

    const onMove = (e: TouchEvent) => {
      if (!armed) return;
      const y = e.touches[0].clientY;
      const d = y - y0;
      if (!dragging) {
        const dx = Math.abs(e.touches[0].clientX - x0);
        // Upward, or more sideways than down: it is a scroll, not a pull.
        if (d < -START || (dx > START && dx > d)) {
          armed = false;
          return;
        }
        if (d < START) return;
        dragging = true;
      }
      e.preventDefault(); // the page must not scroll under the pull
      dy = Math.max(0, d);
      speed = (y - lastY) / Math.max(1, e.timeStamp - lastT);
      lastY = y;
      lastT = e.timeStamp;
      setY(dy, false);
    };

    const onEnd = () => {
      if (!dragging) {
        armed = false;
        return;
      }
      dragging = false;
      armed = false;
      if (dy > CLOSE_AT || (dy > START * 3 && speed > FLICK)) {
        setY(panel.offsetHeight, true);
        window.setTimeout(() => close.current(), 200);
      } else {
        setY(0, true);
      }
    };

    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd);
    panel.addEventListener("touchcancel", onEnd);
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onEnd);
    };
  }, [panelRef, backdropRef]);
}
