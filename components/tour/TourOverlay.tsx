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
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setTourRunning, type Tour } from "@/lib/tour";

const PAD = 8; // breathing room around the lit element
const EDGE = 6; // never let the hole run off the side of the screen
const GAP = 14; // between the hole and the caption
const CAPTION_W = 340; // caption width when it sits beside the hole (laptop)
const CAPTION_MAX = 560; // …and the widest it gets above or below one
const WIDE = 640; // narrower than this, a caption above or below is the full width
const BEAT = 150; // ms between "is it here yet?" checks
const PATIENCE = 30; // that many beats — about 4.5s — then move on
const TAP_LEAD = 560; // let the finger glide in and land before the control is pressed
const TAP_HOLD = 260; // and stay a moment after, so the cause outlives the effect
const GRACE = 6; // beats to let a pressed control do its work before forcing the route
const ALSO_WAIT = 10; // beats a step waits for its `alsoAnchor` once its anchor is there (~1.5s)
const DEMO_WAIT = 800; // a demo step waits for its hole (and any scroll) to settle first
const SHOT_LAND = 36; // the demo photo's size once it lands in Memories (the row's h-9 tiles)

/*
  THE FINGER. A pointing hand drawn in the theme's own surface and text colours,
  whose fingertip sits exactly on the tap point — the owner asked for "a finger
  or a mouse" going into the thing (2026-09-30), so the tap is no longer a ring
  appearing on its own. 24-unit drawing, fingertip at (9, 1).
*/
const FINGER = 40;
const TIP = { x: (9 * FINGER) / 24, y: (1 * FINGER) / 24 };

function Finger() {
  return (
    <svg
      width={FINGER}
      height={FINGER}
      viewBox="0 0 24 24"
      className="tour-finger absolute drop-shadow-md"
      style={{ left: -TIP.x, top: -TIP.y, transformOrigin: `${TIP.x}px ${TIP.y}px` }}
    >
      <path
        d="M7 13.5V3a2 2 0 0 1 4 0v6a1.75 1.75 0 0 1 3.5 0v.8a1.75 1.75 0 0 1 3.5 0v1a1.5 1.5 0 0 1 3 0V15c0 4.4-2.8 7.5-7 7.5h-2.4c-2.2 0-3.5-.8-4.9-2.2L3 16.6a1.6 1.6 0 0 1 2.3-2.2L7 16.2Z"
        fill="var(--surface)"
        stroke="var(--text)"
        strokeWidth={1.3}
        strokeLinejoin="round"
      />
      <path d="M11 9v3M14.5 9.8v2.7M18 10.8v2.2" fill="none" stroke="var(--text)" strokeWidth={1.1} strokeLinecap="round" />
    </svg>
  );
}

/*
  THE DEMO PHOTO — two people side by side, in the school's colours, standing
  in for "a picture with your training partner". Drawn, not a stock photo: it
  is a sign for a photo, and it re-colours with every school's theme.
*/
function PhotoArt() {
  return (
    <svg viewBox="0 0 40 40" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
      {/* The tint mixed over the SURFACE, not transparent: a photo is opaque.
          (There is no --primary-tint variable to read — Tailwind inlines it.) */}
      <rect width="40" height="40" fill="color-mix(in oklab, var(--primary) 14%, var(--surface))" />
      <circle cx="26" cy="15" r="5.5" fill="var(--primary)" opacity="0.6" />
      <path d="M15 40c0-9.5 4.9-15.5 11-15.5S37 30.5 37 40Z" fill="var(--primary)" opacity="0.6" />
      <circle cx="14.5" cy="17" r="5.5" fill="var(--primary)" />
      <path d="M3.5 40c0-9 4.9-14.5 11-14.5S25.5 31 25.5 40Z" fill="var(--primary)" />
    </svg>
  );
}

type Shot = { x: number; y: number; size: number; landing: boolean };

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

/*
  The app can say outright that an anchor is NOT coming — the student shell
  does, once it knows nobody has planned a session with you
  (components/tour/TourInviteProbe.tsx) — with an empty
  `data-tour-absent="<anchor>"` element. The walk moves on at once instead of
  sitting on a frozen screen for its full four and a half seconds.
*/
function declaredAbsent(anchor: string) {
  return !!document.querySelector(`[data-tour-absent~="${anchor}"]`);
}

/*
  …and the opposite: `data-tour-pending="<anchor>"` says it IS coming, the
  screen is still fetching it. A step's second light (`alsoAnchor`) normally
  gets a second and a half; one that is declared pending is waited for as long
  as a step's own target would be. The leaderboards' podium is the case — the
  board is its own read, and arming without it lit the controls alone and then
  lurched down over the houses when the board landed (owner, 2026-10-03).
  A step's OWN target can say it too, when it is on screen but not finished —
  the first gym card, before its "going" line has loaded.
*/
function declaredPending(anchor: string) {
  return !!document.querySelector(`[data-tour-pending~="${anchor}"]`);
}

/*
  WHERE A TARGET CAN ACTUALLY BE SEEN. Inside the window is not enough: the
  plan's session editor scrolls its form above a Done bar that stays put, so
  a section that was "on screen" by the window sat half under that bar — lit,
  cut off, with Done lit inside it (2026-10-03, the coach walk's "Share
  results"). So: the window, cut down by every box around the target that
  scrolls. A fixed element ends the climb — what is around it does not move it.
*/
const scrolls = (p: HTMLElement, css: CSSStyleDeclaration) =>
  p.scrollHeight > p.clientHeight + 1 && /auto|scroll/.test(css.overflowY);

function seenArea(el: HTMLElement): { top: number; bottom: number } {
  let top = 0;
  let bottom = window.innerHeight;
  for (let p: HTMLElement | null = el; p; p = p.parentElement) {
    const css = window.getComputedStyle(p);
    if (p !== el && scrolls(p, css)) {
      const r = p.getBoundingClientRect();
      top = Math.max(top, r.top);
      bottom = Math.min(bottom, r.bottom);
    }
    if (css.position === "fixed") break;
  }
  return { top, bottom };
}

/* The box that scrolls it: the nearest one around it that can — never one
   outside a fixed panel (a sheet), which would move the page behind it. */
function scrollBoxOf(el: HTMLElement): HTMLElement | null {
  if (window.getComputedStyle(el).position === "fixed") return null;
  for (let p = el.parentElement; p; p = p.parentElement) {
    const css = window.getComputedStyle(p);
    if (scrolls(p, css)) return p;
    if (css.position === "fixed") return null;
  }
  return null;
}

/*
  Bring a target — and its partner, when a step lights two — into that area,
  centred in it (or its top in view, if the pair is taller than the area).
  "instant" on purpose: a smooth scroll would still be moving when this
  measures, and the hole would land where the target used to be. Whatever
  that cannot reach is left to the browser's own scrollIntoView, which is
  all this used to do.
*/
function bringIntoView(el: HTMLElement, also: HTMLElement | null = null) {
  const span = () => {
    const r = el.getBoundingClientRect();
    const a = also?.getBoundingClientRect();
    return { top: Math.min(r.top, a?.top ?? r.top), bottom: Math.max(r.bottom, a?.bottom ?? r.bottom) };
  };
  let { top, bottom } = span();
  const seen = seenArea(el);
  if (top >= seen.top && bottom <= seen.bottom) return;
  const box = scrollBoxOf(el);
  if (box) {
    const fits = bottom - top <= seen.bottom - seen.top - 2 * PAD;
    const by = fits ? (top + bottom) / 2 - (seen.top + seen.bottom) / 2 : top - seen.top - PAD;
    if (Math.abs(by) >= 1) box.scrollBy({ top: by, behavior: "instant" as ScrollBehavior });
    ({ top, bottom } = span());
    const now = seenArea(el);
    if (top >= now.top - 1 && (!fits || bottom <= now.bottom + 1)) return;
  }
  el.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior });
}

/*
  The lit box around an element (and its partner, when a step lights two):
  padded, clamped to the screen, with corners that fit what is inside.
*/
function boxAround(el: HTMLElement, also: HTMLElement | null): Box {
  const r = el.getBoundingClientRect();
  /*
    The ring borrows the target's OWN corner radius instead of imposing one.
    A fixed 16px radius on a square segmented-control button reads as a
    different shape parked near the button rather than a ring around it.
    Anything already rounded to half its height is a pill and stays one.
  */
  let own = parseFloat(window.getComputedStyle(el).borderTopLeftRadius) || 0;
  let pill = own >= Math.min(r.width, r.height) / 2 - 1;

  /*
    TWO THINGS IN ONE LIGHT (`alsoAnchor`): the hole grows to the box around
    both — the Sessions tab and the post row under it. Neither one's corners
    fit the pair, so it takes a card's rounding.
  */
  let edges = { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  if (also) {
    const a = also.getBoundingClientRect();
    edges = {
      left: Math.min(edges.left, a.left),
      top: Math.min(edges.top, a.top),
      right: Math.max(edges.right, a.right),
      bottom: Math.max(edges.bottom, a.bottom),
    };
    own = 12;
    pill = false;
  }

  /*
    Clamped to the screen. A bottom-nav tab is a quarter-width cell that
    starts at x=0, so its ring used to hang off the left edge; a full-width
    block hung off both.
  */
  const left = Math.max(EDGE, edges.left - PAD);
  const top = Math.max(EDGE, edges.top - PAD);
  const right = Math.min(window.innerWidth - EDGE, edges.right + PAD);
  const bottom = Math.min(window.innerHeight - EDGE, edges.bottom + PAD);

  return {
    top,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
    radius: pill ? 9999 : own + PAD,
  };
}

export default function TourOverlay({
  tour,
  onDone,
}: {
  /** Which walk to run — its steps, and what to shut on the way out. */
  tour: Tour;
  /** Called when the tour ends, however it ends — finished, skipped, Escape.
      `stayUp`: it is over, but a full page load is about to replace the
      screen, so leave it standing until then. */
  onDone: (stayUp?: boolean) => void;
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
  // The demo photo (steps with `demo`) — where it is, and whether it is flying.
  const [shot, setShot] = useState<Shot | null>(null);
  /* Steps passed over because their screen had nothing to show (no invite
     waiting, say). The counter leaves them out, so a walk without them counts
     on from where it was instead of jumping from 6 to 11. */
  const [skipped, setSkipped] = useState(0);
  /* The lit control's `data-tour-state` — "draft" or "live" on the plan's
     publish button — for a step whose caption depends on it (`bodyWhen`). */
  const [litState, setLitState] = useState<string | null>(null);
  const litStateRef = useRef<string | null>(null);
  const captionRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  const bodyId = useId();

  // While this is up, screens that would stop the walk stand aside (lib/tour.ts).
  useEffect(() => {
    setTourRunning(true);
    return () => setTourRunning(false);
  }, []);

  const steps = tour.steps;
  const step = steps[i];
  const armed = armedFor === i;
  const last = i >= steps.length - 1;
  const body = (litState !== null && step.bodyWhen?.[litState]) || step.body;

  /*
    Ending the tour, however it ends. It shuts anything it opened on your
    behalf first (lib/tour.ts) — walk out during the Log Session steps and you
    would otherwise be left standing in an editor you never asked to open.
  */
  const ending = useRef(false);
  const finish = useCallback(() => {
    if (ending.current) return;
    ending.current = true;
    tour.closeOnExit.forEach((anchor) => visibleAnchor(anchor)?.click());
    /*
      …and it leaves you where the walk says (`endRoute`: Match, for the app).
      It stays up until it gets there: the screen being left may have
      something waiting for the walk to end — the leaderboards' honour code —
      and that must not get a moment on screen (owner, 2026-10-03).
    */
    const home = tour.endRoute;
    if (!home || window.location.pathname === home) {
      onDone();
      return;
    }
    router.push(home);
    let beats = 0;
    const arrivedHome = () => {
      if (window.location.pathname === home) onDone();
      /* The move never landed (owner, 2026-10-03: "it gets stuck at 10 at
         the leaderboards"). Giving up used to close the walk where it stood
         — on the leaderboards, honour code and all. A real page load gets
         there for certain; the walk still counts as seen. */
      else if (++beats > 80) {
        onDone(true);
        window.location.assign(home);
      } else setTimeout(arrivedHome, 50);
    };
    arrivedHome();
  }, [tour, onDone, router]);

  const next = useCallback(() => {
    if (ending.current) return; // on its way out — nothing more to step to
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
    else {
      setSkipped((s) => s + (n - i));
      setI(n);
    }
  }, [i, steps, finish]);

  /*
    setBox, but only when the box has actually moved. The measuring loop below
    runs on every frame; without this it would re-render on each one and keep
    restarting the hole's CSS travel.
  */
  const boxRef = useRef<Box | null>(null);
  const apply = useCallback((next: Box | null) => {
    if (same(boxRef.current, next)) return;
    boxRef.current = next;
    setBox(next);
  }, []);
  // What the light is on.
  const litRef = useRef<{ el: HTMLElement } | null>(null);
  const light = useCallback(
    (el: HTMLElement | null, box: Box | null) => {
      if (litRef.current?.el !== el) litRef.current = el ? { el } : null;
      apply(box);
    },
    [apply],
  );

  /*
    A NEW SCREEN, and what the light was on went with the old one — the
    Leaderboards strip the finger just pressed, or the last step's Memories
    row when there was no strip to press. The light stayed behind over
    whatever the new screen has in that spot: on the leaderboards that was one
    of the houses, lit for seconds while the board loaded and then left
    (owner, 2026-10-03: "it zooms on a random house and only then moves
    there"). So it goes out, and comes back on the step's own target once that
    is ready. Something still on screen after the move — a tab in the nav —
    keeps its light, which travels on from it.

    THE SAME PAGE CAN DO IT TOO. The lineup's day list is swapped for the
    builder without the address changing, so the practice the finger pressed
    went and the light sat on the builder's empty top while its crew loaded
    (owner, 2026-10-04: "mezi 10 a 11 se to zaseklo"). What the light was on
    is gone — that is the test, wherever you are.
  */
  const dropStaleLight = useCallback(() => {
    const lit = litRef.current;
    if (lit && !(lit.el.isConnected && lit.el.getBoundingClientRect().width > 0)) {
      light(null, null);
    }
  }, [light]);

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
    /*
      What is left to press, in order. One name pressed `pressTimes` times is
      that name listed that many times — and each press still only happens
      while the control is on screen (the calendar's arrow lets go of its name
      once the planned day is showing).
    */
    let queue: string[] = !step.press
      ? []
      : Array.isArray(step.press)
        ? [...step.press]
        : Array.from({ length: step.pressTimes ?? 1 }, () => step.press as string);
    let pushed = false;
    let beats = 0;
    let alsoBeats = 0;
    let pendingBeats = 0;
    let timer: ReturnType<typeof setTimeout>;

    /*
      The next control to press: the first one in the queue that is on screen,
      passing over any before it (the profile's Back arrow, when there was no
      profile to open). A link to the page you are already on is dropped, not
      pressed — the Profile tab tapped while on the Profile did nothing you
      could see, and only left you wondering what the finger was for.
    */
    const nextControl = (): HTMLElement | null => {
      for (let k = 0; k < queue.length; k++) {
        const el = visibleAnchor(queue[k]);
        if (!el) continue;
        queue = queue.slice(k + 1);
        if (el.closest("a")?.getAttribute("href") === window.location.pathname) return nextControl();
        return el;
      }
      return null;
    };

    const attempt = () => {
      // Ending (Escape mid-approach) stops it: nothing is pressed after that.
      if (cancelled || ending.current) return;
      const arrived = () => !step.route || window.location.pathname === step.route;

      // 1. The app has said this step's thing is not coming. Don't wait — and
      //    don't tap your way towards it either (no trip into Messages for an
      //    invite that isn't there).
      if ([...queue, step.anchor].some((name) => name && declaredAbsent(name))) {
        giveUp();
        return;
      }

      // 2. Press the control that leads here — visibly, each its own tap.
      const control = nextControl();
      if (control) {
        // Where it can be seen — the finger must never land on a bar over it.
        bringIntoView(control);
        const r = control.getBoundingClientRect();
        setTapAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        /* …and LIGHT it while the finger is on it (owner, 2026-10-03: "what
           are you tapping"). The finger used to press things sitting in the
           dim; now the light travels to the control, the tap lands, and then
           it travels on to what the tap opened. */
        light(control, boxAround(control, null));
        timer = setTimeout(() => {
          if (cancelled || ending.current) return;
          control.click();
          timer = setTimeout(() => {
            if (cancelled) return;
            setTapAt(null);
            attempt();
          }, TAP_HOLD);
        }, TAP_LEAD);
        return;
      }

      // 2b. A new screen took what the light was on (dropStaleLight above).
      dropStaleLight();

      // 3. The press didn't get us there (or there was none to make). Go.
      if (!arrived() && step.route && !pushed && (!step.press || beats >= GRACE)) {
        pushed = true;
        router.push(step.route);
      }

      if (arrived() && (step.anchor === null || !!visibleAnchor(step.anchor))) {
        /* Its own target is on screen but still filling in (`data-tour-pending`
           on it): the first gym's "1 going" line is its own read, and it grew
           the lit card under a caption that had already appeared — the text
           hopped down a line (2026-10-04, run on the live site). It is waited
           for as long as a step waits for anything, then lit as it is. */
        if (step.anchor && declaredPending(step.anchor) && ++pendingBeats < PATIENCE) {
          timer = setTimeout(attempt, BEAT);
          return;
        }
        /* The second thing in the light often lands a beat after the first —
           the first person on Match, "Why you match" on a profile, each its
           own fetch. Give it a moment, so the light opens on both instead of
           on half and then lurching. (Beats spent here aren't held against
           the step: its anchor is already there.) One the screen says is NOT
           coming — Match with nobody on it — isn't waited for at all. */
        if (
          step.alsoAnchor &&
          !visibleAnchor(step.alsoAnchor) &&
          !declaredAbsent(step.alsoAnchor) &&
          (++alsoBeats < ALSO_WAIT || (declaredPending(step.alsoAnchor) && alsoBeats < PATIENCE))
        ) {
          timer = setTimeout(attempt, BEAT);
          return;
        }
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

  /* …checked every frame while a step is being reached, not only on the
     approach's 150 ms beat — a board that loads fast would otherwise still get
     a house lit for a moment. */
  useEffect(() => {
    if (armed) return;
    let raf = 0;
    const tick = () => {
      dropStaleLight();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [armed, dropStaleLight]);

  // Which state the lit control is in, for a step with a caption per state.
  const noteState = useCallback((state: string | null) => {
    if (litStateRef.current === state) return;
    litStateRef.current = state;
    setLitState(state);
  }, []);

  const measure = useCallback(() => {
    if (!step.anchor) {
      noteState(null);
      light(null, null);
      return;
    }
    const el = visibleAnchor(step.anchor);
    if (!el) return; // gone for a frame — keep the last good position
    /*
      Bring it into view first — with its partner, so a pair is never lit
      half under a bar. Some targets sit down the page — the photo grid in the
      Log Session editor, the Repeat buttons in the plan's — and the overlay
      eats taps, so nobody can scroll to them.
    */
    const also = step.alsoAnchor ? visibleAnchor(step.alsoAnchor) : null;
    bringIntoView(el, also);
    noteState(el.getAttribute("data-tour-state"));
    light(el, boxAround(el, also));
  }, [step, light, noteState]);

  /*
    Re-measure on every step, and whenever the page moves under it.

    Measuring ONCE was the alignment bug. A tab page slides eight pixels up as
    it arrives (`.app-page-enter`, app/globals.css), so a tour that opens with
    the screen measured its target mid-flight and drew the ring where the
    element was passing through rather than where it came to rest — a few
    pixels low, every time. A step that presses its own control breaks it from
    the other end: the press re-lays-out the screen after the measurement.

    It used to stop after three quarters of a second. That outlasted the
    entrance, but not the screens that keep arriving after it: on a profile,
    "Why you match" is its own fetch and can land a second later, pushing the
    lit times card down — the light stayed where the card had been (owner,
    2026-10-03, steps 4 and 5). So it follows the target for as long as the
    step is up, every frame; `apply` above makes the frames where nothing moved
    cost nothing, and a resize or scroll is just another frame.

    A LAYOUT effect, so the first measurement lands before the caption is
    painted: the caption appears beside the light where it comes to rest, not
    for one frame wherever the light was before.
  */
  useLayoutEffect(() => {
    if (!armed) return;
    let raf = 0;
    const tick = () => {
      measure();
      raf = requestAnimationFrame(tick);
    };
    tick(); // reads the target's real position — see the note above
    return () => cancelAnimationFrame(raf);
  }, [armed, measure]);

  /*
    ACTING OUT a step (`demo` in lib/tour.ts), once its hole has settled.

    add-photo    the finger taps "Add photo" — drawn only, the real button is
                 never clicked, so no file picker opens — and a picture pops
                 into that square.
    photo-lands  the same picture, still floating where it was while the form
                 closed under it, flies into the Memories row. If the photo
                 step was skipped past too fast to draw one, it simply appears
                 there.
  */
  const demo = armed ? step.demo : undefined;
  useEffect(() => {
    if (!demo) return;
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const later = (ms: number, fn: () => void) =>
      timers.push(setTimeout(() => !cancelled && fn(), ms));

    later(DEMO_WAIT, () => {
      if (demo === "add-photo") {
        const add = visibleAnchor("log-photo-add");
        if (!add) return;
        const r = add.getBoundingClientRect();
        setTapAt({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        later(TAP_LEAD, () => {
          setShot({ x: r.left, y: r.top, size: r.width, landing: false });
          later(TAP_HOLD, () => setTapAt(null));
        });
      } else {
        // The tiles box has no width while there are no photos yet, so it is
        // found directly rather than through visibleAnchor. Newest goes first.
        const tiles = document.querySelector<HTMLElement>('[data-tour="profile-memories-tiles"]');
        if (!tiles) return;
        const r = tiles.getBoundingClientRect();
        const land = {
          x: r.width < 1 ? r.right - SHOT_LAND : r.left,
          y: r.top + r.height / 2 - SHOT_LAND / 2,
          size: SHOT_LAND,
        };
        setShot((s) => (s ? { ...land, landing: true } : { ...land, landing: false }));
      }
    });
    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [demo]);
  // Only the two photo steps show it; everything after them simply doesn't.
  const showShot = step.demo === "add-photo" || step.demo === "photo-lands";

  /*
    THE TEXT IS ALWAYS ON SCREEN (owner, 2026-09-30: "in Memories I lost it").
    The placement above picks a side by where the hole is, not by how tall the
    card is, so a hole low on a short phone pushed the card off the bottom.
    After each paint this measures the card: if it doesn't fit, it tries the
    other side of the hole, and if neither side has room it sits on the
    screen's bottom edge, over the hole if it must — text over the light beats
    no text. Written straight onto the element (`translate`), so it costs no
    render and React never fights it.
  */
  useLayoutEffect(() => {
    const el = captionRef.current;
    if (!el) return;
    el.style.translate = "";
    const r = el.getBoundingClientRect();
    const H = window.innerHeight;
    const M = 12;
    if (r.top >= M && r.bottom <= H - M) return;
    let top = H - M - r.height;
    if (box) {
      const above = box.top - GAP - r.height;
      const below = box.top + box.height + GAP;
      if (above >= M) top = above;
      else if (below + r.height <= H - M) top = below;
    }
    el.style.translate = `0 ${Math.round(Math.max(M, top) - r.top)}px`;
  });

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
  /*
    …and since 2026-09-30, lighter again with a slight BLUR instead (owner:
    "you don't need to darken everything else that much, just blur it a little
    bit, not that much") — and then no blur at all while something is lit
    (below). 40% of the page colour keeps the app readable around the hole.
  */
  const dim = "color-mix(in oklab, var(--background) 40%, transparent)";
  const glow = [
    "0 0 0 2px var(--primary-live)",
    "0 0 0 5px color-mix(in oklab, var(--primary-live) 30%, transparent)",
    "0 0 28px 10px color-mix(in oklab, var(--primary-live) 28%, transparent)",
  ].join(", ");

  /*
    Where the caption goes. If there's room beside the hole it sits there —
    that's the laptop sidebar case. Otherwise it takes the taller free side,
    above or below. On a phone the nav spans the screen, so there is never
    room beside it and the caption always lands above it.

    Above or below, it is the FULL WIDTH only on a phone, where that is the
    light's own width anyway. On a laptop the full width was a thin bar from
    edge to edge — Skip at one end, Next at the other, and nowhere near the
    light (2026-10-03, the coach walk). There it takes the light's width, no
    narrower than a caption and no wider than a comfortable line, centred on
    the light.
  */
  const across = (b: Box): React.CSSProperties => {
    const vw = window.innerWidth;
    if (vw < WIDE) return { left: 16, right: 16 };
    const width = Math.min(Math.max(b.width, CAPTION_W), CAPTION_MAX, vw - 32);
    const left = Math.min(Math.max(b.left + b.width / 2 - width / 2, 16), vw - 16 - width);
    return { left, width };
  };
  let caption: React.CSSProperties;
  if (!box) {
    caption = { left: "50%", top: "50%", transform: "translate(-50%, -50%)", width: "min(340px, calc(100vw - 32px))" };
  } else if (typeof window !== "undefined" && window.innerWidth - (box.left + box.width) >= CAPTION_W + GAP * 2) {
    const centre = Math.min(Math.max(box.top + box.height / 2, 170), window.innerHeight - 170);
    caption = { left: box.left + box.width + GAP, top: centre, transform: "translateY(-50%)", width: CAPTION_W };
  } else if (typeof window !== "undefined" && box.top > window.innerHeight / 2) {
    caption = { ...across(box), bottom: window.innerHeight - box.top + GAP };
  } else if (typeof window !== "undefined") {
    caption = { ...across(box), top: box.top + box.height + GAP };
  } else {
    caption = { left: 16, right: 16, top: box.top + box.height + GAP };
  }

  return (
    <div
      /*
        Above EVERYTHING. The app's sheets sit at z-50 and won on DOM order,
        but the plan's workout editor is z-[60] AND portalled to <body>, so a
        z-50 overlay was drawn behind the very screen it was explaining. 70
        was clear of every sheet — until the walk opened the timing sheet's
        wheels (TimeSheet), which are z-[70] themselves and portalled after
        this, so they won on DOM order and covered the walk. 80 is clear of
        both. The wrapper this lives in is `relative` with no z-index, so it
        creates no stacking context and this really does compete at the root.
      */
      className="fixed inset-0 z-[80]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={body ? bodyId : undefined}
    >
      {/*
        The dim. With an anchor it's the hole's shadow; without one (the opening
        and closing cards) it's a plain backdrop over everything. The last hole
        is deliberately left lit while the next step is being reached, so the
        light TRAVELS to its next target instead of blinking off and on.
      */}
      {/*
        The blur — ONLY on the cards with nothing lit (the opening question and
        the closing card). While a step is showing something, nothing is
        blurred: the owner, 2026-09-30, "they want to see the things that are
        there" — with the blur on, Match showed no profile at all. And not in
        the moment between a press that opened a new screen and that screen's
        light coming on (2b above): that gap is a beat of plain dim, not a blur
        flicking on and off.
      */}
      {!box && armed && <div aria-hidden="true" className="tour-blur absolute inset-0" />}

      {box ? (
        /*
          Tapping the lit element moves the tour on, which is the whole point of
          lighting it: the owner asked to be able to press the thing rather than
          only ever press Next. The real control underneath never receives the
          tap — this sits over it — so the step that follows performs the press
          itself, animation and all, and the outcome is the same either way.

          EXCEPT on a step that asks (its own `next` word): there only the
          button answers. The invite card is lit whole, Decline included, and
          a tap on Decline must never come out as an Accept.
        */
        <button
          type="button"
          aria-hidden="true"
          tabIndex={-1}
          onClick={step.next ? undefined : next}
          className={`tour-hole absolute ${step.next ? "" : "cursor-pointer"}`}
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

      {/* The demo photo, over the dim and under the finger. */}
      {shot && showShot && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute overflow-hidden rounded-lg border-2 border-surface shadow-overlay ${
            shot.landing ? "tour-shot-fly" : "tour-shot-pop"
          }`}
          style={{ left: shot.x, top: shot.y, width: shot.size, height: shot.size }}
        >
          <PhotoArt />
        </div>
      )}

      {/*
        The tap. Drawn on the control the tour is about to press, a beat before
        it presses it — the finger glides in and presses, and a ring opens out
        of a dot under its tip. Without it a screen simply changed on its own.
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
          <Finger />
        </div>
      )}

      {armed && (
        <div
          ref={captionRef}
          className="absolute rounded-2xl border border-border bg-surface p-4 shadow-overlay"
          style={caption}
        >
          <h2 id={titleId} className="text-[15px] font-semibold text-text">
            {step.title}
          </h2>
          {/* A step may be its title alone. */}
          {body && (
            <p id={bodyId} className="mt-1.5 text-[13px] leading-relaxed text-text-2">
              {body}
            </p>
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={finish}
              className="tap44 press rounded-full px-1 text-[13px] font-medium text-muted"
            >
              {last ? "Close" : "Skip"}
            </button>
            <div className="flex items-center gap-3">
              {/* The opening card ASKS ("Show me") — a question, not step one
                  of ten, so no counter on it. The invite's "Accept" is a step
                  like any other and keeps its number: without it the count
                  read 5, nothing, 7 (2026-10-04). */}
              {!(step.next && i === 0) && (
                <span className="text-[11px] tabular-nums text-text-3">
                  {i + 1 - skipped} / {steps.length - skipped}
                </span>
              )}
              <button
                ref={nextRef}
                type="button"
                onClick={next}
                className="tap44 press rounded-full bg-primary-live px-4 py-2 text-[13px] font-semibold text-primary-contrast"
              >
                {step.next ?? (last ? "Done" : "Next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
