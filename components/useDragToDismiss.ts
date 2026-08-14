"use client";

/*
  Drag a bottom sheet down to close it, the way every native sheet works.

  The little rounded bar at the top of our sheets was decoration — it looks like
  a grab handle, so people try to drag it and nothing happens. This makes it real:
  the sheet follows your finger, and letting go past the threshold closes it.
  Below the threshold it springs back, so a half-hearted drag is not destructive.

  Attach `dragProps` to the grab area (the handle and the title block — NOT the
  scrolling body, or every scroll would fight the drag) and `sheetStyle` to the
  sheet itself.
*/
import { useRef, useState } from "react";

// How far down you must drag before letting go closes the sheet.
const DISMISS_AFTER_PX = 110;
// Matches the slide-out below, so onDismiss fires as the sheet leaves the screen.
const SLIDE_OUT_MS = 200;

export function useDragToDismiss(onDismiss: () => void) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const closing = useRef(false);

  const slideOutAndClose = () => {
    if (closing.current) return;
    closing.current = true;
    setDragging(false);
    // Push it past the bottom of the screen, then unmount once it's gone.
    setOffset(typeof window === "undefined" ? 800 : window.innerHeight);
    window.setTimeout(onDismiss, SLIDE_OUT_MS);
  };

  const endDrag = (e: React.PointerEvent) => {
    if (!dragging || closing.current) return;
    setDragging(false);
    const target = e.currentTarget as HTMLElement;
    if (target.hasPointerCapture?.(e.pointerId)) target.releasePointerCapture(e.pointerId);
    if (offset > DISMISS_AFTER_PX) slideOutAndClose();
    else setOffset(0);
  };

  const dragProps = {
    onPointerDown: (e: React.PointerEvent) => {
      // Let the close button (and any other control up here) behave normally —
      // capturing the pointer would swallow its click.
      if ((e.target as HTMLElement).closest("button")) return;
      startY.current = e.clientY;
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (!dragging || closing.current) return;
      const dy = e.clientY - startY.current;
      // Downward follows the finger; upward is heavily damped so the sheet can't
      // be flung up past where it belongs.
      setOffset(dy > 0 ? dy : dy / 5);
    },
    onPointerUp: endDrag,
    onPointerCancel: endDrag,
    // Without this the browser pans the page instead of giving us the move events.
    style: { touchAction: "none" as const },
  };

  const sheetStyle = {
    transform: offset ? `translateY(${offset}px)` : undefined,
    // No transition mid-drag or the sheet lags behind the finger.
    transition: dragging ? "none" : `transform ${SLIDE_OUT_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1)`,
  };

  return { dragProps, sheetStyle, dragging };
}
