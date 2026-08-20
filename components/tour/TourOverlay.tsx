"use client";

/*
  THE TOUR OVERLAY — the dim, the hole, and the caption.
  ---------------------------------------------------------------------------
  Steps come from a `Tour` (lib/tour.ts) — one ordered walk. There are two of
  them: the app's own, and the Coach Console's (lib/varsity/coachTour.ts). This
  file knows nothing about either; it is handed one and walks it. Each step
  names a `data-tour` anchor; this finds that element, measures it, and cuts
  a hole in the dim around it, so the REAL button is what you see lit — nothing
  is cloned or redrawn, which is the whole point: you learn where the thing
  actually is.

  It also DRIVES the app. A step can name a route to go to and a control to
  press first, so the walk crosses tabs, opens a gym and opens the Log Session
  editor on its own. Everything a step needs may therefore be absent at the
  moment that step begins, so each one waits for its own target and gives up
  after a few seconds by moving on — a screen that fails to load costs one step,
  never the whole tour.

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
  in Zone 1 colours. It is mounted in the tab shell instead — which, being
  outside the keyed <main>, is also the only place that survives the tour's own
  navigation between tabs.
*/
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tour } from "@/lib/tour";

const PAD = 8; // breathing room around the lit element
const EDGE = 6; // never let the hole run off the side of the screen
const GAP = 14; // between the hole and the caption
const CAPTION_W = 340; // caption width when it sits beside the hole (laptop)
const BEAT = 150; // ms between "is it here yet?" checks
const PATIENCE = 30; // that many beats — about 4.5s — then move on
const TAP_LEAD = 430; // let the tap animation land before the control is pressed
const TAP_HOLD = 220; // and stay a moment after, so the cause outlives the effect
const GRACE = 6; // beats to let a pressed control do its work before forcing the route

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
  tour,
  onDone,
}: {
  /** Which walk to run — its steps, and what to shut on the way out. */
  tour: Tour;
  /** Called when the tour ends, however it ends — finished, skipped, Escape. */
  onDone: () => void;
}) {
  const router = useRouter();
  const [i, setI] = useState(0);
  /*
    Which step has its target on screen and ready. Held as an index rather than
    a boolean so arriving at a new step disarms it by definition — the effect
    below never has to reach in and switch it off, which would be a setState in
    an effect body and a cascading render.
  */
  const [armedFor, setArmedFor] = useState(-1);
  const [box, setBox] = useState<Box | null>(null);
  // Where the tour is currently pressing, so a tap can be drawn there first.
  const [tapAt, setTapAt] = useState<{ x: number; y: number } | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  const steps = tour.steps;
  const step = steps[i];
  const armed = armedFor === i;
  const last = i >= steps.length - 1;

  /*
    Ending the tour, however it ends. It shuts anything it opened on your
    behalf first (lib/tour.ts) — walk out during the Log Session steps and you
    would otherwise be left standing in an editor you never asked to open.
  */
  const finish = useCallback(() => {
    tour.closeOnExit.forEach((anchor) => visibleAnchor(anchor)?.click());
    onDone();
  }, [tour, onDone]);

  const next = useCallback(() => {
    if (i >= steps.length - 1) finish();
    else setI((n) => n + 1);
  }, [i, steps, finish]);

  /*
    A step whose target never appeared. On its own that costs one step — but a
    step in a GROUP takes the rest of its group with it, because a group is a
    dive into a screen the walk had to open, and the first failed move makes
    every later one unreachable. Without this, a coach with no training block
    would sit through eleven four-second waits in a row.
  */
  const giveUp = useCallback(() => {
    const group = steps[i].group;
    let n = i + 1;
    if (group) while (n < steps.length && steps[n].group === group) n++;
    if (n >= steps.length) finish();
    else setI(n);
  }, [i, steps, finish]);

  /*
    GETTING TO THE STEP — and being SEEN to. The step names the control that
    leads here; the tour draws a tap on it, waits long enough for that to
    register as a press, and only then clicks it. Nobody should land on a new
    screen wondering what just happened, which is what a silent router.push
    felt like.

    `route` is the safety net rather than the method: it says where the press
    ought to land, and is used directly only when the control can't be found or
    the press went nowhere. Everything after that is waiting — a route change
    re-renders the shell, the Log Session editor mounts a beat after its button
    is pressed, and Match and Profile fetch from Supabase — so this checks on a
    timer rather than assuming.

    Reading `window.location.pathname` rather than the usePathname() hook is
    deliberate: the hook would re-run this effect mid-wait and start the whole
    approach again from the top.
  */
  useEffect(() => {
    let cancelled = false;
    let pressed = false;
    let pushed = false;
    let beats = 0;
    let timer: ReturnType<typeof setTimeout>;

    const attempt = () => {
      if (cancelled) return;
      const arrived = () => !step.route || window.location.pathname === step.route;

      // 1. Press the control that leads here — visibly.
      if (step.press && !pressed) {
        const control = visibleAnchor(step.press);
        if (control) {
          pressed = true;
          let r = control.getBoundingClientRect();
          if (r.top < 0 || r.bottom > window.innerHeight) {
            control.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
            r = control.getBoundingClientRect();
          }
          setTapAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          timer = setTimeout(() => {
            if (cancelled) return;
            control.click();
            timer = setTimeout(() => {
              if (cancelled) return;
              setTapAt(null);
              attempt();
            }, TAP_HOLD);
          }, TAP_LEAD);
          return;
        }
      }

      // 2. The press didn't get us there (or there was none to make). Go.
      if (!arrived() && step.route && !pushed && (!step.press || beats >= GRACE)) {
        pushed = true;
        router.push(step.route);
      }

      if (arrived() && (step.anchor === null || !!visibleAnchor(step.anchor))) {
        setArmedFor(i);
        return;
      }

      if (++beats < PATIENCE) {
        timer = setTimeout(attempt, BEAT);
        return;
      }
      // It never turned up. Move on — with the rest of its dive, if it is in one.
      giveUp();
    };

    // On a timer rather than straight away: a step whose target is already
    // there would otherwise arm itself synchronously inside this effect.
    timer = setTimeout(attempt, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // `giveUp` changes with i, which is the only thing that should restart this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

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
    if (!step.anchor) {
      apply(null);
      return;
    }
    const el = visibleAnchor(step.anchor);
    if (!el) return; // gone for a frame — keep the last good position
    /*
      Bring it into view first. Some targets sit down the page — the rate/crowd
      block on a gym, the photo grid in the Log Session editor — and the overlay
      eats taps, so nobody can scroll to them. "instant" on purpose: a smooth
      scroll would still be moving when this measures, and the hole would land
      where the target used to be.
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
    pixels low, every time. A step that presses its own control breaks it from
    the other end: the press re-lays-out the screen after the measurement.

    So it keeps measuring for about three quarters of a second, which outlasts
    both that entrance and the ring's own travel, and `apply` above makes the
    frames where nothing moved cost nothing.
  */
  useEffect(() => {
    if (!armed) return;
    let raf = 0;
    let frames = 0;
    const tick = () => {
      measure();
      if (++frames < 45) raf = requestAnimationFrame(tick);
    };
    tick(); // reads the target's real position — see the note above
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    // Capture: the page scrolls inside <main> and inside sheets, not on window.
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [armed, measure]);

  /*
    Escape ends it, same as every other overlay in the app. Deliberately NOTHING
    else: focus sits on the Next button, so Enter and Space already advance it
    natively — handling them here as well would step twice per press.
  */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [finish]);

  /*
    Focus goes on Next, not on the card. The card is a plain container, and this
    app's global :focus-visible ring is gold with the stated rule that gold can
    only ever mean focus (app/globals.css) — so ringing a non-interactive box
    would be a lie. On the button it is both true and useful.
  */
  useEffect(() => {
    if (armed) nextRef.current?.focus();
  }, [i, armed]);

  /*
    The dim — and the glow that lets it stay light.

    It used to be 93%: on a near-black theme the scrim and the page under it are
    nearly the same colour, so a soft scrim left the lit element looking no
    brighter than its neighbours. The owner's objection to that was fair — you
    could no longer see the app you were being taught. The answer is not a
    heavier scrim but a brighter target: at 68% the screen stays legible, and
    the hole now carries its own crimson ring and halo, so what's lit is lit by
    ADDING light rather than by drowning everything else.

    The glow is listed BEFORE the scrim in the shadow list, because box-shadows
    paint in order and the first one wins. None of them may be transitioned —
    re-interpolating a 9999px spread flickers the whole screen.
  */
  const dim = "color-mix(in oklab, var(--background) 68%, transparent)";
  const glow = [
    "0 0 0 2px var(--primary-live)",
    "0 0 0 5px color-mix(in oklab, var(--primary-live) 30%, transparent)",
    "0 0 28px 10px color-mix(in oklab, var(--primary-live) 28%, transparent)",
  ].join(", ");

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
      /*
        Above EVERYTHING. The app's sheets sit at z-50 and won on DOM order,
        but the plan's workout editor is z-[60] AND portalled to <body>, so a
        z-50 overlay was drawn behind the very screen it was explaining. 70 is
        clear of every sheet in the app; the wrapper this lives in is `relative`
        with no z-index, so it creates no stacking context and this really does
        compete at the root.
      */
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
    >
      {/*
        The dim. With an anchor it's the hole's shadow; without one (the opening
        and closing cards) it's a plain backdrop over everything. The last hole
        is deliberately left lit while the next step is being reached, so the
        light TRAVELS to its next target instead of blinking off and on.
      */}
      {box ? (
        /*
          Tapping the lit element moves the tour on, which is the whole point of
          lighting it: the owner asked to be able to press the thing rather than
          only ever press Next. The real control underneath never receives the
          tap — this sits over it — so the step that follows performs the press
          itself, animation and all, and the outcome is the same either way.
        */
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={next}
          className="tour-hole absolute cursor-pointer"
          style={{
            top: box.top,
            left: box.left,
            width: box.width,
            height: box.height,
            borderRadius: box.radius,
            boxShadow: `${glow}, 0 0 0 9999px ${dim}`,
          }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: dim }} />
      )}

      {/*
        The tap. Drawn on the control the tour is about to press, a beat before
        it presses it — a ring opening out of a dot, the shape of a finger
        landing. Without it a screen simply changed on its own.
      */}
      {tapAt && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute"
          style={{ left: tapAt.x, top: tapAt.y }}
        >
          <span
            className="tour-tap-ring absolute block h-14 w-14 rounded-full border-2"
            style={{ borderColor: "var(--primary-live)" }}
          />
          <span
            className="tour-tap-dot absolute block h-9 w-9 rounded-full"
            style={{ background: "color-mix(in oklab, var(--primary-live) 55%, transparent)" }}
          />
        </div>
      )}

      {armed && (
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
              onClick={finish}
              className="tap44 press rounded-full px-1 text-[13px] font-medium text-muted"
            >
              {last ? "Close" : "Skip"}
            </button>
            <div className="flex items-center gap-3">
              <span className="text-[11px] tabular-nums text-text-3">
                {i + 1} / {steps.length}
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
      )}
    </div>
  );
}
