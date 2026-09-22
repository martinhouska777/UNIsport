"use client";

/*
  HOLDING A NAME IN THE LINEUP BUILDER — the gesture, on its own.
  ---------------------------------------------------------------------------
  Lifted out of LineupBuilderScreen because it is two hundred lines of pointer
  bookkeeping that has nothing to do with boats, and because on its own it can
  be driven and checked without a coach account.
*/
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

/* a target slot inside a boat: a numbered seat, or the cox seat */
export type Slot = { boatId: string; kind: "seat"; idx: number } | { boatId: string; kind: "cox" };
export const slotKey = (s: Slot) => (s.kind === "cox" ? `${s.boatId}:cox` : `${s.boatId}:${s.idx}`);

/** The seat a slot key names, read back off a drop target. A boat id has no
    colon in it, so the LAST colon is the one that splits the two. */
export function slotFromKey(key: string): Slot | null {
  const at = key.lastIndexOf(":");
  if (at < 0) return null;
  const boatId = key.slice(0, at);
  const tail = key.slice(at + 1);
  if (tail === "cox") return { boatId, kind: "cox" };
  const idx = Number(tail);
  return Number.isInteger(idx) ? { boatId, kind: "seat", idx } : null;
}

/*
  HOLD A NAME AND PUT IT SOMEWHERE — and keep scrolling while you do.
  ---------------------------------------------------------------------------
  Seating a crew used to offer the browser's own drag-and-drop, which on a
  PHONE does not exist: a finger held on a name did nothing at all, so the
  only way to move anybody was tap-a-name, tap-a-seat. The owner asked for the
  other one back (2026-09-21: "he can also hold the name and put it somewhere.
  I want to scroll during that thing"), so this is the same gesture built out
  of pointer events, which a thumb and a mouse both speak.

  A FINGER SCROLLS UNTIL IT DECIDES NOT TO. Touching a name starts a quarter
  of a second's HOLD, not a drag: move inside that quarter second and the
  screen scrolls as it always did, and the name is never picked up. Stay still
  and the name lifts, and from then on the finger is carrying it — the page
  stops scrolling under it, and the list scrolls ITSELF whenever the finger is
  near the top or the bottom edge, so a rower can be carried from the pool at
  the bottom up into the first boat without ever putting them down. A mouse
  has no such problem and does not wait: it drags the moment it moves.

  WHAT IS UNDER THE FINGER is asked of the document itself — every seat is
  marked `data-slot` with its key — rather than measured and cached, because
  the list moves while the drag is happening and a cached rectangle would be
  pointing at the wrong seat within one scroll.

  Letting go on a seat drops the name there (the same `assign` a tap makes, so
  a swap is a swap either way); letting go anywhere else puts it back. The
  click that a browser fires after the finger lifts is swallowed, so a drag
  never also counts as a tap on the name it started from.
*/
type NameDrag = { id: string; x: number; y: number; over: string | null };

export function useNameDrag(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  onDrop: (slot: Slot, athleteId: string) => void,
) {
  const [drag, setDrag] = useState<NameDrag | null>(null);
  const api = useRef<{ down: (id: string, e: ReactPointerEvent) => void }>({ down: () => {} });
  const dropRef = useRef(onDrop);
  // Kept current in an effect, not in the render: the listeners below are
  // registered once and must not close over the first render's `assign`.
  useEffect(() => {
    dropRef.current = onDrop;
  });

  useEffect(() => {
    /** How long a thumb has to stay still before the name lifts. */
    const HOLD_MS = 240;
    /** How far a thumb may wander inside that hold and still be a scroll. */
    const SLOP = 10;
    /** How close to an edge the finger has to be for the list to scroll. */
    const EDGE = 78;
    /** A mouse never waits, so its hold timer is simply never allowed to fire. */
    const NEVER = 1000000;

    let hold: { id: string; x: number; y: number; touch: boolean; timer: number } | null = null;
    let live: NameDrag | null = null;
    let at = { x: 0, y: 0 };
    let frame: number | null = null;
    let swallow = false;

    const slotAt = (x: number, y: number) => {
      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      return el?.closest<HTMLElement>("[data-slot]")?.dataset.slot ?? null;
    };

    const paint = () => setDrag(live ? { ...live } : null);

    /* The list scrolls itself while a name is held near its top or bottom. */
    const loop = () => {
      frame = requestAnimationFrame(loop);
      const box = scrollRef.current;
      if (!live || !box) return;
      const r = box.getBoundingClientRect();
      let by = 0;
      if (at.y < r.top + EDGE) by = -Math.min(20, Math.ceil((r.top + EDGE - at.y) / 4));
      else if (at.y > r.bottom - EDGE) by = Math.min(20, Math.ceil((at.y - (r.bottom - EDGE)) / 4));
      if (!by) return;
      const before = box.scrollTop;
      box.scrollTop = before + by;
      if (box.scrollTop === before) return; // already at the end of the list
      const over = slotAt(at.x, at.y);
      if (over !== live.over) {
        live = { ...live, over };
        paint();
      }
    };

    const begin = (id: string, x: number, y: number) => {
      if (hold) window.clearTimeout(hold.timer);
      hold = null;
      at = { x, y };
      live = { id, x, y, over: slotAt(x, y) };
      swallow = true; // the click after this gesture is not a tap
      document.body.style.userSelect = "none";
      paint();
      if (frame == null) frame = requestAnimationFrame(loop);
    };

    const finish = (commit: boolean) => {
      if (hold) window.clearTimeout(hold.timer);
      hold = null;
      if (live && commit) {
        const key = slotAt(at.x, at.y);
        const slot = key ? slotFromKey(key) : null;
        if (slot) dropRef.current(slot, live.id);
      }
      live = null;
      if (frame != null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      document.body.style.userSelect = "";
      paint();
    };

    const onMove = (e: PointerEvent) => {
      at = { x: e.clientX, y: e.clientY };
      if (live) {
        e.preventDefault();
        const over = slotAt(e.clientX, e.clientY);
        live = { ...live, x: e.clientX, y: e.clientY, over };
        paint();
        return;
      }
      if (!hold) return;
      const far = Math.hypot(e.clientX - hold.x, e.clientY - hold.y);
      // A thumb that moves is scrolling; a mouse that moves is dragging.
      if (hold.touch) {
        if (far > SLOP) {
          window.clearTimeout(hold.timer);
          hold = null;
        }
      } else if (far > 6) {
        begin(hold.id, e.clientX, e.clientY);
      }
    };

    const onUp = () => finish(true);
    const onCancel = () => finish(false);
    /* A held name must not also scroll the page: pointermove's preventDefault
       does not stop a touch scroll that has already begun, but this does. */
    const onTouchMove = (e: TouchEvent) => {
      if (live) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!swallow) return;
      swallow = false;
      e.stopPropagation();
      e.preventDefault();
    };
    /* A carry that ends without the browser bothering to fire a click would
       leave the swallow armed, and it would eat the next real tap instead.
       The next press disarms it: a click always follows its own press. */
    const onDown = () => {
      swallow = false;
    };

    api.current.down = (id, e) => {
      swallow = false;
      if (e.button != null && e.button !== 0) return;
      // The X and the seat badge are buttons of their own; a press on one of
      // those is not the start of a carry.
      if ((e.target as HTMLElement).closest("button")) return;
      const touch = e.pointerType !== "mouse";
      const x = e.clientX;
      const y = e.clientY;
      at = { x, y };
      if (hold) window.clearTimeout(hold.timer);
      hold = {
        id,
        x,
        y,
        touch,
        timer: window.setTimeout(() => {
          if (hold) begin(hold.id, hold.x, hold.y);
        }, touch ? HOLD_MS : NEVER),
      };
    };

    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("click", onClick, true);
      if (hold) window.clearTimeout(hold.timer);
      if (frame != null) cancelAnimationFrame(frame);
      document.body.style.userSelect = "";
    };
  }, [scrollRef]);

  /** Put these on anything that can be carried: a pool name, a seated rower. */
  const carry = useCallback(
    (id: string) => ({
      onPointerDown: (e: ReactPointerEvent) => api.current.down(id, e),
    }),
    [],
  );

  return { drag, carry };
}

