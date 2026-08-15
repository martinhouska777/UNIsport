"use client";

/*
  One control, two gestures — the way Instagram's account name works.

  A single tap runs `onTap` (open the switcher), a double tap runs `onDoubleTap`
  (jump straight to the other mode). The single-tap action is held for a beat so
  a second tap can cancel it; otherwise every double tap would also fire the
  single-tap action on its way through.
*/
import { useCallback, useEffect, useRef } from "react";

// Long enough to catch a real double tap, short enough that the single tap
// still feels immediate (the sheet's own slide-up animation covers it).
const DOUBLE_TAP_MS = 240;

export default function useTapOrDoubleTap(onTap: () => void, onDoubleTap: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return useCallback(() => {
    // Second tap inside the window: cancel the pending single tap, go direct.
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      onDoubleTap();
      return;
    }
    timer.current = setTimeout(() => {
      timer.current = null;
      onTap();
    }, DOUBLE_TAP_MS);
  }, [onTap, onDoubleTap]);
}
