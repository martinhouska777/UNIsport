"use client";

/*
  ONE TIME OF ONE CREW, SPUN OR TYPED — the sheet that opens from a Start,
  Finish or Time on the timing sheet (owner, 2026-09-28).
  ---------------------------------------------------------------------------
  "We can write it as well as get it from the thing where you can tap the
  time… spin the wheel to pick the time." So both, on one small sheet, and
  they are one value:

    • THE WHEELS — hours, minutes, seconds and tenths, on the phone's own
      scroll-and-snap, so a flick turns them the way an alarm clock's do;
    • THE DIGITS above them, which can be typed: numbers only, the colon and
      the dot put themselves in, because a phone's number pad has no colon
      key. LEFT TO RIGHT (owner, same day: "first hour, then minutes, then
      seconds, and then last"): each digit overwrites the next place of the
      time showing — greyed while it waits, black once typed — so "802115"
      over 8:00:00.0 is 8:02:11.5 (racePieces.ts, watchSlots).
  A spin rewrites the digits; typing turns the wheels.

  NEXT keeps the sheet open and moves on — Start, Finish, the next boat's
  Start — so a whole piece goes in without closing anything. It never takes
  the focus off the digits, so once the keyboard is up it stays up, and the
  buttons sit right under the digits, where the keyboard cannot cover them.
  Done on the last time. Clear empties this one. Nothing is written until one
  of the three is pressed: the backdrop, the X and Escape leave it as it was.
  Where the wheels start on an empty time is the caller's (wheelStart).

  It rides above the phone's keyboard (visualViewport) rather than under it,
  and it is a layer of its own rather than a second <Sheet>: a Sheet shuts on
  Escape, and so does the sheet of times beneath it — one key would have
  thrown away every time typed on it. All colours are theme tokens.
*/
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { IconArrowRight, IconX } from "@/components/icons";
import { classTitle, formatWatch, watchFromSlots, watchSlots } from "@/lib/varsity/racePieces";
import { useTourRunning } from "@/lib/tour";

/* One row of a wheel, in px — five of them show, the middle one is the value. */
const ROW = 36;

type Parts = [number, number, number, number]; // hours, minutes, seconds, tenths

const toParts = (sec: number): Parts => {
  const t = Math.max(0, Math.round(sec * 10));
  return [Math.min(23, Math.floor(t / 36000)), Math.floor(t / 600) % 60, Math.floor(t / 10) % 60, t % 10];
};
const fromParts = ([h, m, s, d]: Parts) => h * 3600 + m * 60 + s + d / 10;

/*
  A WHEEL — a column that scrolls and snaps on the middle row. Its position
  and its value are the same thing: a scroll picks the row that lands in the
  middle; a value set from outside (the digits, a new time) scrolls it there.
  `picked` remembers the last row the scroll itself chose, so the wheel does
  not yank itself back to the middle of a row while a finger is still on it.
*/
function Wheel({
  label,
  count,
  value,
  pad,
  onPick,
}: {
  label: string;
  count: number;
  value: number;
  pad: boolean;
  onPick: (n: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const picked = useRef<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    const mine = picked.current === value;
    picked.current = null;
    if (el && !mine) el.scrollTop = value * ROW;
  }, [value]);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const n = Math.max(0, Math.min(count - 1, Math.round(el.scrollTop / ROW)));
    if (n !== value) {
      picked.current = n;
      onPick(n);
    }
  };

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
        e.preventDefault();
        picked.current = null; // a key is not a scroll: the wheel follows it
        onPick(Math.max(0, Math.min(count - 1, value + (e.key === "ArrowDown" ? 1 : -1))));
      }}
      className="relative h-[180px] min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain outline-none [mask-image:linear-gradient(to_bottom,transparent,var(--text)_32%,var(--text)_68%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{ paddingTop: ROW * 2, paddingBottom: ROW * 2 }}
    >
      {Array.from({ length: count }, (_, n) => (
        <div
          key={n}
          role="option"
          aria-selected={n === value}
          onClick={() => ref.current?.scrollTo({ top: n * ROW, behavior: "smooth" })}
          className={`flex h-9 snap-center items-center justify-center font-mono text-[20px] tabular-nums ${
            n === value ? "font-semibold text-text" : "text-muted"
          }`}
        >
          {pad ? String(n).padStart(2, "0") : n}
        </div>
      ))}
    </div>
  );
}

/*
  THE DIGITS, a place at a time. While the coach types, the places typed so
  far are black, the rest still show the time being overwritten, in grey, and
  a line sits under the next place to go. The colon and the dot take the
  colour of the digit after them.
*/
function Places({ digits, hour, typed }: { digits: string; hour: number; typed: string | null }) {
  const out: ReactNode[] = [];
  digits.split("").forEach((d, i) => {
    const mine = typed == null || i < typed.length;
    const tone = mine ? "text-text" : "text-muted/45";
    if (i === hour || i === hour + 2) out.push(<span key={`c${i}`} className={tone}>:</span>);
    if (i === hour + 4) out.push(<span key={`c${i}`} className={tone}>.</span>);
    out.push(
      <span
        key={i}
        className={`border-b-[3px] ${tone} ${typed != null && i === typed.length ? "border-text" : "border-transparent"}`}
      >
        {typed != null && i < typed.length ? typed[i] : d}
      </span>,
    );
  });
  return <>{out}</>;
}

const Colon = ({ children }: { children: ReactNode }) => (
  <span aria-hidden className="relative flex items-center font-mono text-[20px] font-semibold text-muted">
    {children}
  </span>
);

export default function TimeSheet({
  fieldKey,
  who,
  badge,
  what,
  value,
  from,
  last,
  onSet,
  onClose,
}: {
  /** Which time this is (crew + field): a new one resets the sheet. */
  fieldKey: string;
  /** The crew as the sheet names it — the cox, or the surnames. */
  who: string;
  badge: string;
  /** "Start", "Finish" or "Time". */
  what: string;
  /** What is written now, or null. */
  value: number | null;
  /** Where the wheels start when nothing is written. */
  from: number;
  /** No time after this one: the button says Done. */
  last: boolean;
  /** A time (null = cleared), and whether to move on, close, or stay. */
  onSet: (value: number | null, then: "next" | "done" | "stay") => void;
  onClose: () => void;
}) {
  const vTheme = useVarsityTheme();
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);

  /*
    The time on the wheels, and — while the coach is typing — the time being
    overwritten and the digits typed over it so far. A new time resets both,
    the documented adjust-state-on-a-prop way; if the keyboard is already up,
    the next time is ready for its first digit straight away.
  */
  type Typing = { base: number; typed: string };
  const [at, setAt] = useState({ key: fieldKey, sec: value ?? from, typing: null as Typing | null });
  if (at.key !== fieldKey) {
    const sec = value ?? from;
    setAt({ key: fieldKey, sec, typing: focused ? { base: sec, typed: "" } : null });
  }

  /* THE KEYBOARD: how far it has pushed up from the bottom of the screen. */
  const [lift, setLift] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const measure = () => setLift(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    vv.addEventListener("resize", measure);
    vv.addEventListener("scroll", measure);
    return () => {
      vv.removeEventListener("resize", measure);
      vv.removeEventListener("scroll", measure);
    };
  }, []);

  /* On a laptop the keys are right there, so the digits take them at once; a
     phone opens on the wheels, and a tap on the digits brings up its pad. */
  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) input.current?.focus();
  }, []);

  /* Escape closes THIS, and only this (see the note up top) — except while
     the console walk is on, where Escape ends the walk, and the walk shuts
     everything it opened (lib/varsity/coachTour.ts, closeOnExit). Caught
     here, it would close this alone and leave the walk lighting nothing. */
  const touring = useTourRunning();
  const close = useRef(onClose);
  const touringNow = useRef(touring);
  useEffect(() => {
    close.current = onClose;
    touringNow.current = touring;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || touringNow.current) return;
      e.stopPropagation();
      close.current();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  const parts = toParts(at.sec);
  /* From the time as it is NOW, not as this render saw it: two wheels still
     turning at once must not undo each other. */
  const spin = (i: number, n: number) =>
    setAt((a) => {
      const next = toParts(a.sec);
      next[i] = n;
      const sec = fromParts(next);
      return { ...a, sec, typing: focused ? { base: sec, typed: "" } : null };
    });
  /* A digit overwrites the next place; one past the last place is ignored. */
  const typeDigits = (text: string) =>
    setAt((a) => {
      if (!a.typing) return a;
      const slots = watchSlots(a.typing.base);
      const typed = text.replace(/\D/g, "").slice(0, slots.digits.length);
      return {
        ...a,
        typing: { ...a.typing, typed },
        sec: watchFromSlots(typed + slots.digits.slice(typed.length), slots.hour),
      };
    });
  /* A time only looked at is written back exactly as it was (an older sheet
     may carry hundredths); one that was spun or typed is in tenths. */
  const commit = (then: "next" | "done") =>
    onSet(value != null && at.sec === value ? value : Math.round(at.sec * 10) / 10, then);

  /* What the digits show: the time being typed over, or the time on the wheels. */
  const slots = watchSlots(at.typing ? at.typing.base : at.sec);
  /* A button that must not take the focus off the digits, or the phone's
     keyboard would drop between one time and the next. */
  const keepFocus = (e: React.PointerEvent | React.MouseEvent) => e.preventDefault();

  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[70] flex flex-col justify-end" style={{ paddingBottom: lift }}>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
        />
        <div
          role="dialog"
          aria-label={`${what}, ${who}`}
          data-tour="coach-race-watch"
          className="sheet-panel relative rounded-t-3xl border-t border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2.5 [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]"
        >
          <div className="mx-auto mb-2.5 h-1 w-9 rounded-full bg-border" />
          <div className="mx-auto w-full max-w-sm">
            {/* Whose time, and which of their three. */}
            <div className="flex items-center gap-2">
              <span className="min-w-0 truncate text-[15px] font-semibold text-text">{who}</span>
              <span className="flex-shrink-0 rounded-md bg-text px-1.5 py-0.5 font-mono text-[11px] font-semibold text-background">
                {classTitle(badge)}
              </span>
              <span className="ml-auto flex-shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                {what}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                data-tour="coach-race-watch-close"
                className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
              >
                <IconX size={14} />
              </button>
            </div>

            {/* THE DIGITS, with the number pad's input laid invisibly over them:
                a tap anywhere on them brings the pad up. */}
            <div className={`relative mt-3 rounded-2xl bg-surface-2 py-2.5 ${focused ? "ring-2 ring-text" : ""}`}>
              <div
                aria-hidden
                className="flex justify-center font-mono text-[34px] font-semibold leading-tight tabular-nums"
              >
                <Places digits={slots.digits} hour={slots.hour} typed={at.typing ? at.typing.typed : null} />
              </div>
              <input
                ref={input}
                value={at.typing?.typed ?? ""}
                onChange={(e) => typeDigits(e.target.value)}
                onFocus={() => {
                  setFocused(true);
                  setAt((a) => ({ ...a, typing: { base: a.sec, typed: "" } }));
                }}
                onBlur={() => {
                  setFocused(false);
                  setAt((a) => ({ ...a, typing: null }));
                }}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  e.preventDefault();
                  commit(last ? "done" : "next");
                }}
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint={last ? "done" : "next"}
                autoComplete="off"
                aria-label={`${what}: ${formatWatch(at.sec)}`}
                className="absolute inset-0 h-full w-full cursor-text rounded-2xl bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none"
              />
            </div>

            <div className="mt-2.5 flex items-center justify-between">
              <button
                type="button"
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={() => {
                  setAt((a) => ({ ...a, typing: focused ? { base: a.sec, typed: "" } : null }));
                  onSet(null, "stay");
                }}
                className="tap44 px-1 py-2 text-[13px] font-medium text-muted"
              >
                Clear
              </button>
              <button
                type="button"
                onPointerDown={keepFocus}
                onMouseDown={keepFocus}
                onClick={() => commit(last ? "done" : "next")}
                className="tap44 flex items-center gap-1.5 rounded-full bg-text px-5 py-2.5 text-[13px] font-semibold text-background"
              >
                {last ? "Done" : "Next"}
                {!last && <IconArrowRight size={14} />}
              </button>
            </div>

            {/* THE WHEELS, on one grey band across the middle row. */}
            <div className="relative mt-2 flex items-stretch gap-0.5">
              <div aria-hidden className="pointer-events-none absolute inset-x-0 top-[72px] h-9 rounded-xl bg-surface-2" />
              <Wheel label="Hours" count={24} value={parts[0]} pad={false} onPick={(n) => spin(0, n)} />
              <Colon>:</Colon>
              <Wheel label="Minutes" count={60} value={parts[1]} pad onPick={(n) => spin(1, n)} />
              <Colon>:</Colon>
              <Wheel label="Seconds" count={60} value={parts[2]} pad onPick={(n) => spin(2, n)} />
              <Colon>.</Colon>
              <Wheel label="Tenths" count={10} value={parts[3]} pad={false} onPick={(n) => spin(3, n)} />
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>,
    document.body,
  );
}
