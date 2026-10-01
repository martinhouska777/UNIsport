"use client";

/*
  HOLD A ROW AND DRAG IT INTO PLACE — reordering a short list.
  ---------------------------------------------------------------------------
  The coach's intensity zones and boats (Training settings) are lists whose
  ORDER means something: the plan editor's zone buttons and the Lineup tab's
  Add Boat row read them in this order. The up/down arrows that used to move
  them were cut on 18 Sep as clutter, so the order changes the way a phone
  changes the order of anything: hold the row, drag it, let go (owner's pick,
  2026-10-01).

  The gesture is the lineup builder's (useNameDrag), for the same reasons:
    - A FINGER SCROLLS UNTIL IT DECIDES NOT TO. A thumb that moves straight
      away is scrolling the page and nothing is picked up. One that stays
      still for a quarter of a second has the row ready to lift, and the page
      stops scrolling under it.
    - A MOUSE does not wait: it drags as soon as it has moved a few pixels.
    - A SLOW TAP IS STILL A TAP. Nothing lifts until the pointer has really
      moved, so resting on a row and letting go opens it like any tap. The
      click a browser fires after a real drag is swallowed, so a drag never
      also opens the row it started from.

  While a row is carried it follows the pointer and the rows it passes slide
  out of its way, so the gap always shows where it will land. Letting go
  settles it into the gap, and only THEN does the list change order — one
  move, one save. Near the top or bottom of the scrolling page the page
  scrolls itself, so a row can be carried past the fold.

  Usage: spread `item(i)` on a wrapper around each row, in list order.
*/
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** The carry on screen: which row, the gap it would land in, how far it has
    travelled, and how tall it is (what the passed rows slide by). */
type Live = { from: number; to: number; dy: number; shift: number; settling: boolean };

/** How long a lifted row takes to settle into its gap after letting go. */
const SETTLE_MS = 160;

export function useDragReorder(count: number, onMove: (from: number, to: number) => void) {
  const [live, setLive] = useState<Live | null>(null);
  const els = useRef<(HTMLDivElement | null)[]>([]);
  const countRef = useRef(count);
  const moveRef = useRef(onMove);
  // Kept current in an effect, not in the render: the listeners below are
  // registered once and must not close over the first render's values.
  useEffect(() => {
    countRef.current = count;
    moveRef.current = onMove;
  });
  const api = useRef<{ down: (i: number, e: ReactPointerEvent) => void }>({ down: () => {} });

  useEffect(() => {
    /** How long a thumb has to stay still before the row is ready to lift. */
    const HOLD_MS = 240;
    /** How far a thumb may wander inside that hold and still be a scroll. */
    const SLOP = 10;
    /** How far a ready row (or a pressed mouse) has to travel to be a drag. */
    const DRAG = 8;
    /** How close to the scrolling box's edge the pointer must be to scroll it. */
    const EDGE = 64;

    type Hold = { i: number; id: number; y: number; x: number; touch: boolean; ready: boolean; timer: number | null };
    type Drag = {
      from: number;
      to: number;
      id: number;
      startY: number;
      y: number;
      startScroll: number;
      scroller: HTMLElement;
      rects: { top: number; bottom: number }[];
    };
    let hold: Hold | null = null;
    let drag: Drag | null = null;
    let settling = false;
    let frame: number | null = null;
    let swallow = false;

    /* The box that scrolls the list: the nearest ancestor that really scrolls,
       or the page itself. */
    const scrollerOf = (el: HTMLElement): HTMLElement => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const oy = getComputedStyle(p).overflowY;
        if ((oy === "auto" || oy === "scroll") && p.scrollHeight > p.clientHeight) return p;
      }
      return (document.scrollingElement as HTMLElement) ?? document.documentElement;
    };
    const visibleBox = (s: HTMLElement) => {
      if (s === document.scrollingElement || s === document.documentElement) {
        return { top: 0, bottom: window.innerHeight };
      }
      const r = s.getBoundingClientRect();
      return { top: Math.max(0, r.top), bottom: Math.min(window.innerHeight, r.bottom) };
    };

    const paint = () => {
      if (!drag) return;
      const { rects, from } = drag;
      // The page may have scrolled under the row since it lifted; the row
      // moved with it, so the distance it travelled includes that.
      let dy = drag.y - drag.startY + (drag.scroller.scrollTop - drag.startScroll);
      // It stays inside its own list — above the first row's top, below the
      // last row's bottom there is nowhere to put it.
      dy = Math.max(rects[0].top - rects[from].top, Math.min(rects[rects.length - 1].bottom - rects[from].bottom, dy));
      // A row it is carried over by half makes way: going down, its bottom
      // edge has passed that row's middle; going up, its top edge has. Pushed
      // against either end of the list, the end is always where it lands.
      const top = rects[from].top + dy;
      const bottom = rects[from].bottom + dy;
      let to = from;
      for (let i = from + 1; i < rects.length; i++) if (bottom > (rects[i].top + rects[i].bottom) / 2) to = i;
      for (let i = from - 1; i >= 0; i--) if (top < (rects[i].top + rects[i].bottom) / 2) to = i;
      drag.to = to;
      setLive({ from, to, dy, shift: rects[from].bottom - rects[from].top, settling: false });
    };

    /* The page scrolls itself while a row is held near its top or bottom. */
    const loop = () => {
      frame = requestAnimationFrame(loop);
      if (!drag) return;
      const box = visibleBox(drag.scroller);
      let by = 0;
      if (drag.y < box.top + EDGE) by = -Math.min(16, Math.ceil((box.top + EDGE - drag.y) / 4));
      else if (drag.y > box.bottom - EDGE) by = Math.min(16, Math.ceil((drag.y - (box.bottom - EDGE)) / 4));
      if (!by) return;
      // Only as far as the list goes: once its end is on screen there is
      // nowhere further to carry the row, and scrolling on would only pull
      // the list out from under the thumb.
      const scrolled = drag.scroller.scrollTop - drag.startScroll;
      const { rects } = drag;
      if (by > 0 && rects[rects.length - 1].bottom - scrolled <= box.bottom - EDGE / 2) return;
      if (by < 0 && rects[0].top - scrolled >= box.top + EDGE / 2) return;
      const before = drag.scroller.scrollTop;
      drag.scroller.scrollTop = before + by;
      if (drag.scroller.scrollTop !== before) paint();
    };

    const dropHold = () => {
      if (hold?.timer != null) window.clearTimeout(hold.timer);
      hold = null;
    };

    const begin = (h: Hold, y: number) => {
      dropHold();
      const rows = els.current.slice(0, countRef.current);
      const first = rows[h.i];
      if (!first || rows.some((r) => !r)) return;
      const rects = rows.map((r) => {
        const b = r!.getBoundingClientRect();
        return { top: b.top, bottom: b.bottom };
      });
      const scroller = scrollerOf(first);
      drag = { from: h.i, to: h.i, id: h.id, startY: h.y, y, startScroll: scroller.scrollTop, scroller, rects };
      swallow = true; // the click after this gesture is not a tap
      document.body.style.userSelect = "none";
      document.body.style.cursor = "grabbing";
      paint();
      if (frame == null) frame = requestAnimationFrame(loop);
    };

    const finish = (commit: boolean) => {
      // A hold that never became a drag ends here too — and as nothing was
      // lifted, `swallow` was never armed: the click that follows is a tap.
      dropHold();
      if (frame != null) {
        cancelAnimationFrame(frame);
        frame = null;
      }
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      if (!drag) return;
      const { from, rects } = drag;
      const to = commit ? drag.to : from;
      drag = null;
      // Glide into the gap first, then reorder: the row lands where the gap
      // was, so the list changing under it is invisible.
      const offset = to > from ? rects[to].bottom - rects[from].bottom : rects[to].top - rects[from].top;
      settling = true;
      setLive({ from, to, dy: offset, shift: rects[from].bottom - rects[from].top, settling: true });
      window.setTimeout(() => {
        settling = false;
        if (to !== from) moveRef.current(from, to);
        setLive(null);
      }, SETTLE_MS);
    };

    const onMove = (e: PointerEvent) => {
      if (drag) {
        if (e.pointerId !== drag.id) return;
        e.preventDefault();
        drag.y = e.clientY;
        paint();
        return;
      }
      if (!hold || e.pointerId !== hold.id) return;
      const far = Math.hypot(e.clientX - hold.x, e.clientY - hold.y);
      // A thumb that moves before the hold is up is scrolling. A thumb that
      // has held still, or a mouse, is dragging — once it has really moved.
      if (hold.touch && !hold.ready) {
        if (far > SLOP) dropHold();
      } else if (far > DRAG) {
        e.preventDefault();
        begin(hold, e.clientY);
      }
    };

    const onUp = (e: PointerEvent) => {
      if ((drag && e.pointerId === drag.id) || (hold && e.pointerId === hold.id)) finish(true);
    };
    const onCancel = (e: PointerEvent) => {
      if ((drag && e.pointerId === drag.id) || (hold && e.pointerId === hold.id)) finish(false);
    };
    /* A held row must not also scroll the page: pointermove's preventDefault
       does not stop a touch scroll, but this does — from the moment the hold
       is up, so the move that lifts the row is never taken for a scroll. */
    const onTouchMove = (e: TouchEvent) => {
      if (drag || hold?.ready) e.preventDefault();
    };
    /* A thumb held on a row is not asking for the browser's long-press menu. */
    const onContextMenu = (e: MouseEvent) => {
      if (drag || hold?.touch) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      if (!swallow) return;
      swallow = false;
      e.stopPropagation();
      e.preventDefault();
    };
    /* A drag that ends without the browser firing a click would leave the
       swallow armed, and it would eat the next real tap. The next press
       disarms it: a click always follows its own press. */
    const onDown = () => {
      swallow = false;
    };

    api.current.down = (i, e) => {
      swallow = false;
      if (settling || drag) return;
      if (e.button != null && e.button !== 0) return;
      const touch = e.pointerType !== "mouse";
      dropHold();
      // A mouse is ready at once; a thumb after it has held still.
      const next: Hold = { i, id: e.pointerId, x: e.clientX, y: e.clientY, touch, ready: !touch, timer: null };
      if (touch) {
        next.timer = window.setTimeout(() => {
          if (hold === next) next.ready = true;
        }, HOLD_MS);
      }
      hold = next;
    };

    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("click", onClick, true);
      dropHold();
      if (frame != null) cancelAnimationFrame(frame);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };
  }, []);

  /** Spread on the wrapper around row `i`. */
  const item = useCallback(
    (i: number) => {
      // No long-press callout or text selection under a held thumb.
      let style: CSSProperties = { WebkitTouchCallout: "none" };
      let className = "select-none";
      if (live) {
        const { from, to, dy, shift, settling } = live;
        if (i === from) {
          style = {
            ...style,
            position: "relative",
            zIndex: 10,
            transform: `translateY(${dy}px)`,
            // It follows the pointer exactly; it only glides when let go.
            transition: settling ? `transform ${SETTLE_MS}ms ease-out` : "none",
          };
          // Lifted off the card: its own white, a shadow, and no hairline
          // dragged along with it. Not the pressed look either — the app's
          // press dim (globals.css) and the row's grey would hold for as long
          // as the mouse button is down, and the row would travel faded.
          className +=
            " bg-surface shadow-lg [&_.row-line]:border-transparent [&_button]:bg-surface! [&_button]:opacity-100";
        } else {
          const by = from < i && i <= to ? -shift : to <= i && i < from ? shift : 0;
          style = { ...style, transform: by ? `translateY(${by}px)` : undefined, transition: "transform 180ms ease" };
        }
      }
      return {
        ref: (el: HTMLDivElement | null) => {
          els.current[i] = el;
        },
        onPointerDown: (e: ReactPointerEvent) => api.current.down(i, e),
        style,
        className,
      };
    },
    [live],
  );

  return item;
}

/** The list with one item taken out at `from` and put back in at `to`. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}
