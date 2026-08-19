"use client";

/*
  THE TOUR OVERLAY — the dim, the hole, and the caption.
  ---------------------------------------------------------------------------
  Steps come from lib/tour.ts. Each one names a `data-tour` anchor somewhere in
  the app; this finds that element, measures it, and cuts a hole in the dim
  around it, so the REAL button is what you see lit — nothing is cloned or
  redrawn, which is the whole point: you learn where the thing actually is.

  How the hole works: one div sits exactly over the target carrying a huge
  `box-shadow` spread. A box-shadow is painted OUTSIDE its element, so the
  shadow becomes the dim over the whole screen and the element's own area stays
  clear. No z-index juggling on the nav, no cloning, one moving part.

  Colours: the dim is `--background` mixed with transparent — the same
  treatment the sheets use (`bg-background/70` in ModeSwitcherSheet). It is
  written at the point of use rather than as a root token on purpose: a custom
  property declared on :root resolves its own var() references against :root,
  which is the NEUTRAL Zone 1 palette, so a root-level "--tour-dim" would come
  out pale on a dark university theme. Resolved here it picks up whichever
  theme the surrounding ThemeProvider set (rule 1 holds — no hex, only tokens).

  NOT portalled, deliberately. ThemeProvider writes the theme onto a wrapper
  div, not onto :root, so a portal to <body> would escape the theme and render
  in Zone 1 colours. It is mounted inside the tab shell instead, which is also
  the only place its anchors exist.
*/
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { TourStep } from "@/lib/tour";

const PAD = 8; // breathing room around the lit element
const EDGE = 6; // never let the hole run off the side of the screen
const GAP = 14; // between the hole and the caption
const CAPTION_W = 340; // caption width when it sits beside the hole (laptop)

type Box = { top: number; left: number; width: number; height: number; radius: number };

/** Same box, to within half a pixel? Keeps the settle loop from re-rendering. */
function same(a: Box | null, b: Box | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (["top", "left", "width", "height", "radius"] as const).every(
    (k) => Math.abs(a[k] - b[k]) < 0.5
  );
}

/*
  Phone renders BottomNav (`lg:hidden`), laptop renders SideNav (`hidden
  lg:flex`), and both carry the same anchor names — so exactly one copy of any
  anchor has a real size. Picking the measurable one is how this supports both
  layouts without asking how wide the window is.
*/
function visibleAnchor(anchor: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${anchor}"]`));
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

export default function TourOverlay({
  steps,
  onDone,
}: {
  steps: TourStep[];
  /** Called when the tour ends, however it ends — finished, skipped, Escape. */
  onDone: () => void;
}) {
  // Steps whose anchor actually exists. Resolved once, after mount, so a step
  // pointing at something that isn't on screen is dropped rather than showing
  // an empty hole.
  const [live, setLive] = useState<TourStep[] | null>(null);
  const [i, setI] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  /*
    Resolving anchors has to wait for the commit — on the first render the
    targets are in the same commit as this overlay, so they aren't in the DOM
    yet. Measuring the DOM after paint is what effects are for; the one-time
    state sync that follows is the same sanctioned exception ThemeMode.tsx makes
    for reading localStorage on mount.

    It RETRIES, because a screen's own content arrives later than its frame:
    Match and Profile fetch from Supabase, so their anchors appear a beat after
    the route does. Giving up on the first miss would teach half a screen and
    then mark it as taught.

    If nothing ever resolves the list stays empty and this renders nothing —
    deliberately WITHOUT calling onDone, so a tour nobody saw is never marked
    as seen and gets another go next time.
  */
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let tries = 0;
    const attempt = () => {
      const found = steps.map((s) => s.anchor === null || !!visibleAnchor(s.anchor));
      const done = found.every(Boolean); // everything is on screen — go now
      const timedOut = ++tries >= 20; // ~3s, then go with whatever showed up
      if (!done && !timedOut) {
        timer = setTimeout(attempt, 150);
        return;
      }
      const usable = steps.filter((_, k) => found[k]);
      setLive(usable.some((s) => s.anchor) ? usable : []);
    };
    attempt();
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = live?.[i];

  /*
    Steps marked `activate` press their own target before explaining it — the
    three Match sub-tabs, so each step shows the screen it's describing. Fired
    once per step: clicking re-renders the page underneath, which re-runs the
    measuring effect, and without this guard it would click forever.
  */
  const activated = useRef(-1);
  useEffect(() => {
    if (!live || !step?.activate || !step.anchor || activated.current === i) return;
    activated.current = i;
    visibleAnchor(step.anchor)?.click();
  }, [live, step, i]);

  /*
    setBox, but only when the box has actually moved. The measuring loop below
    runs on every frame for a moment; without this it would re-render on each
    one and keep restarting the hole's CSS travel.
  */
  const boxRef = useRef<Box | null>(null);
  const apply = useCallback((next: Box | null) => {
    if (same(boxRef.current, next)) return;
    boxRef.current = next;
    setBox(next);
  }, []);

  const measure = useCallback(() => {
    if (!step?.anchor) {
      apply(null);
      return;
    }
    const el = visibleAnchor(step.anchor);
    if (!el) {
      apply(null);
      return;
    }
    /*
      Bring it into view first. Some targets sit down the page — the rate/crowd
      block on a gym, the leaderboard strip on Profile — and the overlay eats
      taps, so nobody can scroll to them. "instant" on purpose: a smooth scroll
      would still be moving when this measures, and the hole would land where
      the target used to be.
    */
    let r = el.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) {
      el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
      r = el.getBoundingClientRect();
    }
    /*
      The ring borrows the target's OWN corner radius instead of imposing one.
      A fixed 16px radius on a square segmented-control button reads as a
      different shape parked near the button rather than a ring around it.
      Anything already rounded to half its height is a pill and stays one.
    */
    const own = parseFloat(window.getComputedStyle(el).borderTopLeftRadius) || 0;
    const pill = own >= Math.min(r.width, r.height) / 2 - 1;

    /*
      Clamped to the screen. A bottom-nav tab is a quarter-width cell that
      starts at x=0, so its ring used to hang off the left edge; a full-width
      block hung off both.
    */
    const left = Math.max(EDGE, r.left - PAD);
    const top = Math.max(EDGE, r.top - PAD);
    const right = Math.min(window.innerWidth - EDGE, r.right + PAD);
    const bottom = Math.min(window.innerHeight - EDGE, r.bottom + PAD);

    apply({
      top,
      left,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
      radius: pill ? 9999 : own + PAD,
    });
  }, [step, apply]);

  /*
    Re-measure on every step, and whenever the page moves under it.

    Measuring ONCE was the alignment bug. A tab page slides eight pixels up as
    it arrives (`.app-page-enter`, app/globals.css), so a tour that opens with
    the screen measured its target mid-flight and drew the ring where the
    element was passing through rather than where it came to rest — a few
    pixels low, every time. The `activate` steps break it from the other end:
    pressing a sub-tab re-lays-out the screen after the measurement.

    So it keeps measuring for about three quarters of a second, which outlasts
    both that entrance and the ring's own travel, and `apply` above makes the
    frames where nothing moved cost nothing.
  */
  useEffect(() => {
    if (!live) return;
    let raf = 0;
    let frames = 0;
    const tick = () => {
      measure();
      if (++frames < 45) raf = requestAnimationFrame(tick);
    };
    // Reading the target's real position — see the note above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    tick();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    // Capture: the page scrolls inside <main>, not on the window.
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [live, measure]);

  const last = !!live && i >= live.length - 1;
  const next = useCallback(() => {
    if (last) onDone();
    else setI((n) => n + 1);
  }, [last, onDone]);

  /*
    Escape ends it, same as every other overlay in the app. Deliberately NOTHING
    else: focus sits on the Next button, so Enter and Space already advance it
    natively — handling them here as well would step twice per press.
  */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDone();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onDone]);

  /*
    Focus goes on Next, not on the card. The card is a plain container, and this
    app's global :focus-visible ring is gold with the stated rule that gold can
    only ever mean focus (app/globals.css) — so ringing a non-interactive box
    would be a lie. On the button it is both true and useful.
  */
  useEffect(() => {
    nextRef.current?.focus();
  }, [i, live]);

  if (!live || !step) return null;

  /*
    The dim, written once and used by both the hole and the plain backdrop.
    Heavy on purpose: on a near-black theme the scrim colour and the page under
    it are nearly the same, so anything lighter leaves the lit tab looking no
    brighter than its neighbours — which is the one thing this has to achieve.
  */
  const dim = "color-mix(in oklab, var(--background) 93%, transparent)";

  /*
    Where the caption goes. If there's room beside the hole it sits there —
    that's the laptop sidebar case. Otherwise it takes the taller free side,
    above or below, full width. On a phone the nav spans the screen, so there
    is never room beside it and the caption always lands above it.
  */
  let caption: React.CSSProperties;
  if (!box) {
    caption = { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(340px, calc(100vw - 32px))" };
  } else if (typeof window !== "undefined" && window.innerWidth - (box.left + box.width) >= CAPTION_W + GAP * 2) {
    const centre = Math.min(Math.max(box.top + box.height / 2, 170), window.innerHeight - 170);
    caption = { left: box.left + box.width + GAP, top: centre, transform: "translateY(-50%)", width: CAPTION_W };
  } else if (typeof window !== "undefined" && box.top > window.innerHeight / 2) {
    caption = { left: 16, right: 16, bottom: window.innerHeight - box.top + GAP };
  } else {
    caption = { left: 16, right: 16, top: box.top + box.height + GAP };
  }

  return (
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      {/* The dim. With an anchor it's the hole's shadow; without one (the
          closing card) it's a plain backdrop over everything. */}
      {box ? (
        <div
          className="tour-hole absolute"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            borderRadius: box.radius,
            boxShadow: `0 0 0 9999px ${dim}`,
            outline: "2px solid var(--primary-live)",
            outlineOffset: "-1px",
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: dim }} />
      )}

      <div
        className="absolute rounded-2xl border border-border bg-surface p-4 shadow-overlay"
        style={caption}
      >
        <h2 id={titleId} className="text-[15px] font-semibold text-text">
          {step.title}
        </h2>
        <p id={bodyId} className="mt-1.5 text-[13px] leading-relaxed text-text-2">
          {step.body}
        </p>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDone}
            className="tap44 press rounded-full px-1 text-[13px] font-medium text-muted"
          >
            {last ? "Close" : "Skip"}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[11px] tabular-nums text-text-3">
              {i + 1} / {live.length}
            </span>
            <button
              ref={nextRef}
              type="button"
              onClick={next}
              className="tap44 press rounded-full bg-primary-live px-4 py-2 text-[13px] font-semibold text-primary-contrast"
            >
              {last ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
