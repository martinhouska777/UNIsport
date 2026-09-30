"use client";

/*
  A second tap on something that already does its job on the FIRST one — the
  Profile tab in the bottom bar.

  Unlike useTapOrDoubleTap, the first tap is not held back: the tab opens
  Profile at once, the way every tab does, and only a second tap inside the
  window runs `onDoubleTap`. Instagram's profile tab works the same way: two
  taps on it switch account; here they switch mode (owner, 2026-09-30).

  Pass `null` when there is nothing to switch to, and the tab is just a tab.
*/
import { useCallback, useRef, type MouseEvent } from "react";

// A touch longer than useTapOrDoubleTap's 240ms: nothing waits on this one, so
// a generous window costs nothing and catches a slower thumb.
const DOUBLE_TAP_MS = 300;

export default function useDoubleTap(onDoubleTap: (() => void) | null) {
  const lastTap = useRef(0);

  return useCallback(
    (e: MouseEvent) => {
      if (!onDoubleTap) return;
      const now = performance.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        lastTap.current = 0;
        // The second tap is the switch, not another visit to Profile.
        e.preventDefault();
        onDoubleTap();
        return;
      }
      lastTap.current = now;
    },
    [onDoubleTap],
  );
}
