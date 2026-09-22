"use client";

/*
  The week as a grid of hours — Monday to Sunday across, 6 am to 9 pm down.
  Tap an hour to say you're free then; tap it again to take it back. Or put a
  finger down and SWIPE: every hour you pass over gets what the first one got
  — lit if it was dark, dark if it was lit — so "5 pm to 8 pm" is one stroke
  down the column, not four taps.

  Every cell says its own hour (the owner wanted it that way — no label column
  to read across to), and back-to-back hours on the same day join into one
  block, so "5 pm to 8 pm" reads as a single stretch of time.

  The grid holds no state of its own: it draws the saved schedule and reports
  each hour it is asked to set, and the parent applies that to the schedule as
  it is at that moment (quick taps in a row must all land). The one thing it
  keeps is the stroke in progress — which way it paints, and which cells it
  has already touched, so a finger wobbling back over a cell doesn't undo it.
*/
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { weekDays } from "@/lib/onboarding";
import { GRID_FIRST_HOUR, GRID_LAST_HOUR, hourName, hoursOfDay } from "@/lib/schedule";

const HOURS = Array.from(
  { length: GRID_LAST_HOUR - GRID_FIRST_HOUR + 1 },
  (_, i) => GRID_FIRST_HOUR + i,
);

/* The cell under a point on the screen, as "day hour", or null off the grid. */
function cellAt(x: number, y: number): { day: string; hour: number } | null {
  const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-day]");
  if (!el || !el.dataset.day || !el.dataset.hour) return null;
  return { day: el.dataset.day, hour: Number(el.dataset.hour) };
}

export default function WeekHourGrid({
  schedule,
  onSet,
}: {
  schedule: Record<string, string[]>;
  /** Make one hour of one day lit (true) or dark (false). */
  onSet: (day: string, hour: number, on: boolean) => void;
}) {
  const lit = Object.fromEntries(weekDays.map((d) => [d.key, hoursOfDay(schedule[d.key])]));

  /*
    The stroke in progress. `paint` is what every cell in this stroke becomes;
    `touched` stops a cell being set twice when the finger passes back over it.
    Null between strokes.
  */
  const stroke = useRef<{
    paint: boolean;
    touched: Set<string>;
    /** Where the pointer last was, so a fast swipe can be filled in. */
    last: { x: number; y: number };
  } | null>(null);

  const visit = (day: string, hour: number) => {
    const s = stroke.current;
    if (!s) return;
    const id = `${day} ${hour}`;
    if (s.touched.has(id)) return;
    s.touched.add(id);
    if (lit[day].has(hour) !== s.paint) onSet(day, hour, s.paint);
  };

  const begin = (e: ReactPointerEvent<HTMLDivElement>) => {
    const cell = cellAt(e.clientX, e.clientY);
    if (!cell) return;
    // Capture on the grid itself: moves keep arriving even once the finger
    // slides off the cell it started on, or off the grid altogether.
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A pointer the browser no longer counts as active — the stroke still
      // works for as long as the finger stays over the grid.
    }
    stroke.current = {
      paint: !lit[cell.day].has(cell.hour),
      touched: new Set(),
      last: { x: e.clientX, y: e.clientY },
    };
    visit(cell.day, cell.hour);
  };

  /*
    A quick flick reports only a few points along the way, so the cells between
    two reports would be skipped. Walk the line from the last point to this one
    in small steps and visit every cell it crosses — the stroke comes out solid.
  */
  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const s = stroke.current;
    if (!s) return;
    const { x: x0, y: y0 } = s.last;
    const dx = e.clientX - x0;
    const dy = e.clientY - y0;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / 8));
    for (let i = 1; i <= steps; i++) {
      const cell = cellAt(x0 + (dx * i) / steps, y0 + (dy * i) / steps);
      if (cell) visit(cell.day, cell.hour);
    }
    s.last = { x: e.clientX, y: e.clientY };
  };

  const end = () => {
    stroke.current = null;
  };

  return (
    <div
      className="grid select-none grid-cols-7 gap-x-1"
      // No browser panning while a finger is on the grid — a swipe down a
      // column paints hours; it must not scroll the page out from under it.
      style={{ touchAction: "none" }}
      onPointerDown={begin}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      {weekDays.map((d) => (
        <div key={d.key} className="pb-1.5 text-center text-[11px] font-semibold text-text">
          {d.label.slice(0, 3)}
        </div>
      ))}

      {HOURS.map((h) => (
        <div key={h} className="contents">
          {weekDays.map((d) => {
            const on = lit[d.key].has(h);
            const joinUp = on && lit[d.key].has(h - 1);
            const joinDown = on && lit[d.key].has(h + 1);
            return (
              <button
                key={d.key}
                type="button"
                data-day={d.key}
                data-hour={h}
                // The pointer handlers above own mouse and touch. A click with
                // no pointer behind it is the keyboard (Enter / Space) — that
                // one still flips the cell.
                onClick={(e) => {
                  if (e.detail === 0) onSet(d.key, h, !on);
                }}
                aria-pressed={on}
                aria-label={`${d.label} ${hourName(h)}`}
                className="relative h-7"
              >
                <span
                  className={`absolute inset-x-0 flex items-center justify-center whitespace-nowrap text-[10px] tabular-nums transition-colors ${
                    on ? "bg-primary font-medium text-primary-contrast" : "bg-surface-2 text-muted"
                  } ${joinUp ? "top-0" : "top-[2px] rounded-t-md"} ${
                    joinDown ? "bottom-0" : "bottom-[2px] rounded-b-md"
                  }`}
                >
                  {hourName(h)}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
