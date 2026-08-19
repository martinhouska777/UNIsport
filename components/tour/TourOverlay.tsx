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
const GAP = 14; // between the hole and the caption
const CAPTION_W = 340; // caption width when it sits beside the hole (laptop)

type Box = { top: number; left: number; width: number; height: number };

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
    Resolving anchors has to wait for the commit — on the first render of the
    shell the navs are in the same commit as this overlay, so they aren't in the
    DOM yet. Measuring the DOM after paint is what effects are for; the one-time
    state sync that follows is the same sanctioned exception ThemeMode.tsx makes
    for reading localStorage on mount.

    If nothing resolves (no nav on screen at all) the list stays empty and this
    renders nothing — deliberately WITHOUT calling onDone, so a tour nobody saw
    never gets marked as seen.
  */
  useEffect(() => {
    const usable = steps.filter((s) => s.anchor === null || visibleAnchor(s.anchor));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLive(usable.some((s) => s.anchor) ? usable : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const step = live?.[i];

  const measure = useCallback(() => {
    if (!step?.anchor) {
      setBox(null);
      return;
    }
    const el = visibleAnchor(step.anchor);
    if (!el) {
      setBox(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setBox({
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    });
  }, [step]);

  // Re-measure on every step, and whenever the window changes shape under it.
  useEffect(() => {
    if (!live) return;
    // Reading the target's real position — see the note above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
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
          className="tour-hole absolute rounded-2xl"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
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
