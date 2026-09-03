"use client";

import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import Phone from "@/components/landing/Phone";
import ScrollStory, { type ScrollStoryHandle } from "@/components/landing/ScrollStory";
import CampusColours from "@/components/landing/CampusColours";
import BladeLock from "@/components/landing/BladeLock";
import type { CloserHandle } from "@/components/landing/closer";
import type { Beat } from "@/lib/landingCopy";

/*
  A STORY AND ITS CLOSER, and the phone that flies between them.

  The story's phone and the closer's phone are two different phones. So
  neither is used for the move: a third phone, belonging to the page, takes
  off from exactly where the story's phone is, flies across the boundary, and
  lands exactly on the closer's phone — which has been invisible the whole
  time and is simply switched on underneath at the end.

  THE IN-PLACE CUT. The page never shows itself moving: while the story's
  words fade around the phone, nothing moves; then the scroll is cut to the
  pinned closer in one jump (everything around the phone is dark, so there is
  nothing to see it happen by), and the phone glides the short distance into
  its place. The new section then builds itself around it — the letter swings
  out from behind the phone (or the oars rise), the words come in from the
  right, and only then does the cycle start. The screen inside the phone
  changes at the pinch: profile → Gyms and season → Home are tab switches, so
  the screens slide.

  AND BACK AGAIN. One nudge up from the landed closer plays the film
  backwards: the words leave, the letter tucks in behind the phone (or the
  oars gather and sink), and the page's phone flies back up and sets down
  exactly where the story left it. The page lands with the closer just off
  the bottom of the screen, so scrolling down again plays it all afresh.

  This is the choreography script of scripts/landing/build-story.mjs, which
  did all of the above THROUGH an iframe by finding things geometrically. Here
  the closer is a component with a handle, so it is asked, not searched. Only
  the in-place cut is ported (both closers use it); the older camera-follow
  path is not.

  The flight only makes sense on the two-column layout (≥1024px) without
  reduced motion, and only when the reader actually CAME from the story — its
  phone near the screen to take off from. A reload that restores the scroll at
  the closer, or a jump from elsewhere, reveals the closer in place instead.
*/

type Props = {
  storyId: string;
  beats: Beat[];
  accent: "accent" | "varsity";
  closer: "campus" | "blades";
  closerId?: string;
  /** Which beat's screen the flight leaves on, and which it lands with. */
  fromBeat: number;
  toBeat: number;
  /** Anything to render between the story and the closer (nothing, usually). */
  children?: ReactNode;
  /** The feature rows that stand beside the closer's piece. */
  aside?: ReactNode;
};

const DUR = 1500;
const JUMP = 0.32;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Where the flight exists: the two-column layout, without reduced motion.
   1280 is CloserSplit's own breakpoint and the two MUST agree — the pinned
   stage is one screen tall with overflow hidden, so wrapping it around a
   single tall column cuts the bottom off.

   IT FOLLOWS A RESIZE NOW. This was decided once at mount, on the reasoning
   that a resize mid-story would change the page height under the reader. The
   owner found what that costs (2026-09-03 — "the animations broke, mainly
   when I have only half the screen"): drag the window narrower and the class
   never left, so the closer stayed pinned to one screen while its content
   went to one tall column — a measured 331px of it cut off and unreachable,
   with the flight still armed for a layout that was gone. A page relaying
   itself out under a deliberate drag is much the smaller surprise. */
const FLIES_MQ = "(min-width: 1280px) and (prefers-reduced-motion: no-preference)";
/* The media query changing is the event that matters, but it is not the only
   thing that moves the answer, and it is not dispatched everywhere (headless
   viewport emulation resizes the page and fires nothing at all — which is how
   this nearly shipped unverified). The resize event and a ResizeObserver on
   the document say the same thing by two other routes; asking flies() again
   is cheap and the value guard below swallows the repeats. */
const watchViewport = (cb: () => void) => {
  const mq = window.matchMedia(FLIES_MQ);
  mq.addEventListener("change", cb);
  window.addEventListener("resize", cb);
  const ro = new ResizeObserver(cb);
  ro.observe(document.documentElement);
  return () => {
    mq.removeEventListener("change", cb);
    window.removeEventListener("resize", cb);
    ro.disconnect();
  };
};
function useFlies() {
  return useSyncExternalStore(
    watchViewport,
    () => window.matchMedia(FLIES_MQ).matches,
    () => false,
  );
}

export default function StoryCloser({ storyId, beats, accent, closer, closerId, fromBeat, toBeat, children, aside }: Props) {
  const story = useRef<ScrollStoryHandle>(null);
  const clo = useRef<CloserHandle>(null);
  const flight = useRef<HTMLDivElement>(null);
  const flightPhone = useRef<HTMLDivElement>(null);
  const flightShots = useRef<HTMLDivElement>(null);
  // Only the pinned, flown-into closer needs the extra screen of scroll, and
  // only where the two-column layout exists to fly across.
  const pinned = useFlies();

  useEffect(() => {
    // Asked every time, never cached: the reader can drag the window across
    // the breakpoint at any moment, and everything below has to answer for the
    // width the page has NOW.
    const flies = () => window.matchMedia(FLIES_MQ).matches;
    const c = clo.current;
    const sec = c?.el();
    if (!c || !sec) return;

    c.prime(flies() ? "hide" : "pre");

    let armed = false;
    let flown = false;
    let flying = false;

    /*
      A FLIGHT CAN BE INTERRUPTED, and until 2026-09-01 nothing could stop one.
      It is a 1.5s requestAnimationFrame loop that also DRIVES the page scroll,
      and two things happen inside it that only its own last frame undoes: the
      story's phone is hidden and its words step aside (.ls-gone).

      Two ways a reader broke it. Scroll back up out of the closer while the
      flight is still playing and the "put it away" branch below was skipped
      (it refused to touch anything mid-flight), so the words never came back
      and the closer stayed armed — a story with an empty column beside the
      phone, for good. Or click a nav link mid-flight: the component unmounts,
      but the loop keeps running and keeps calling window.scrollTo, so the page
      you just opened yanks itself down to where the OLD page's closer was.

      So a running flight now publishes how to stop it. `abort(true)` puts
      everything back where the reader is (phone, words, the closer rewound so
      it plays again); `abort(false)` just stops the loop, for unmount. `dead`
      is the belt to that braces: every frame and every timer checks it.
    */
    let abort: null | ((restore: boolean) => void) = null;
    let dead = false;

    const storyPhoneRect = () => story.current?.phoneRect() ?? null;

    /* ── the flight ─────────────────────────────────────────────────── */
    function runFlight(done: () => void) {
      const fl = flight.current, fp = flightPhone.current, fs = flightShots.current;
      const start = storyPhoneRect();
      const target = c!.phoneTarget();
      const fromShot = story.current?.shotEl(fromBeat);
      const toShot = story.current?.shotEl(toBeat);
      if (!fl || !fp || !fs || !start || !target || start.width < 10 || !fromShot || !toShot) {
        // Whatever is missing, the closer still has to appear. This used to
        // return into a no-op, and the section's phone was primed HIDDEN — so
        // any measurement that came back empty (a screen not yet rendered, a
        // phone not yet laid out) left the reader looking at a closer with no
        // phone in it, permanently, because `armed` was already true and the
        // observer never fires twice.
        c!.arriveInPlace();
        done();
        return;
      }
      // Take the story's own screens with it: cloned, so the profile keeps the
      // exact scroll it ended on. Profile → Gyms and season → Home are tab
      // switches: the old screen leaves to the right, the new one comes in
      // from the left. `translate`, so the strip's own transform (the vertical
      // pan) survives.
      fs.innerHTML = "";
      const a = fromShot.cloneNode(true) as HTMLElement;
      const b = toShot.cloneNode(true) as HTMLElement;
      b.style.transform = "translateY(0px)"; // the new screen starts at its top
      a.style.opacity = "1";
      b.style.opacity = "1";
      a.style.transition = b.style.transition = "translate .5s cubic-bezier(.4,0,.2,1)";
      b.style.translate = "-110% 0";
      fs.appendChild(a);
      fs.appendChild(b);

      fp.style.width = start.width + "px";
      fl.style.display = "block";
      const box = fl.getBoundingClientRect();
      const w0 = box.width, h0 = box.height;

      // hide the story's phone: there is only ever one on screen — and its
      // words step aside: the phone is the whole story now
      story.current?.setPhoneHidden(true);
      story.current?.setGone(true);
      flying = true;

      const A = { x: start.left + start.width / 2, y: start.top + start.height / 2, w: start.width };
      const B = target;
      const t0 = performance.now();
      let swapped = false;
      let jumped = false;

      /* The move and the page arrive together: the same easing that flies the
         phone also carries the page to the pinned position — "scroll a little
         and it does the whole thing". The moment the reader touches the wheel
         the other way, the page is theirs again. */
      const scrollFrom = window.scrollY;
      const scrollTo = scrollFrom + sec!.getBoundingClientRect().top;
      let driving = true;
      const release = (ev?: Event) => {
        if (ev && ev.type === "wheel" && (ev as WheelEvent).deltaY > 0) return;
        driving = false;
      };
      window.addEventListener("wheel", release, { passive: true });
      window.addEventListener("touchmove", release, { passive: true });
      window.addEventListener("keydown", release);
      // A CLICK ends the driving too — and a nav link is a click. React unmounts
      // a route some hundreds of ms after the link is pressed, and until then
      // this loop was still calling window.scrollTo: press "About" mid-flight
      // and the page that opened scrolled itself to the bottom (owner,
      // 2026-09-01 — "clicked back to homepage and I didn't see the phone
      // screens"). Pointer down, hands off.
      window.addEventListener("pointerdown", release);
      const unlisten = () => {
        window.removeEventListener("pointerdown", release);
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchmove", release);
        window.removeEventListener("keydown", release);
      };

      let raf = 0;
      abort = (restore) => {
        cancelAnimationFrame(raf);
        driving = false;
        unlisten();
        fl.style.display = "none";
        fl.style.transform = "";
        flying = false;
        abort = null;
        if (!restore) return;
        story.current?.setPhoneHidden(false);
        story.current?.setGone(false);
        c!.rewind();
        armed = false;
        flown = false;
      };

      const step = (now: number) => {
        if (dead) return;
        const t = Math.min(1, (now - t0) / DUR);
        if (!jumped && t >= JUMP) jumped = true;
        if (driving) window.scrollTo(0, jumped ? scrollTo : scrollFrom);
        const g = t < JUMP ? 0 : (t - JUMP) / (1 - JUMP);
        const ge = easeInOut(g);
        const px = A.x + (B.x - A.x) * ge;
        const py = A.y + (B.y - A.y) * ge + 12 * Math.sin(Math.PI * g);
        const sc = (A.w + (B.w - A.w) * ge) / A.w;
        fl.style.transform = `translate(${px - (w0 * sc) / 2}px,${py - (h0 * sc) / 2}px) scale(${sc})`;
        if (!swapped && g >= 0.5) {
          swapped = true;
          a.style.translate = "110% 0";
          b.style.translate = "0 0";
        }
        if (t < 1) {
          raf = requestAnimationFrame(step);
          return;
        }
        if (driving) window.scrollTo(0, scrollTo); // exactly on the pin
        c!.arriveAfterFlight(); // theirs, exactly here, takes over
        fl.style.display = "none";
        fl.style.transform = "";
        story.current?.setPhoneHidden(false);
        unlisten();
        flying = false;
        abort = null;
        flown = true; // the way back starts from here
        done();
      };
      raf = requestAnimationFrame(step);
    }

    function runFlightBack(done: () => void) {
      const fl = flight.current, fp = flightPhone.current, fs = flightShots.current;
      const from = c!.phoneRect();
      const fromShot = story.current?.shotEl(toBeat); // leave on the closer's screen…
      const toShot = story.current?.shotEl(fromBeat); // …arrive on the frame the story ended on
      if (!fl || !fp || !fs || !from || !storyPhoneRect() || !fromShot || !toShot) {
        // retract() has already emptied the closer around the phone, and the
        // reader is still standing in it. Put it back rather than leaving the
        // section stripped: `done()` alone disarmed it, and the observer will
        // not re-fire while the section never left the screen.
        c!.arriveInPlace();
        flying = false;
        abort = null;
        done();
        return;
      }
      flying = true;
      // the page's phone takes over from theirs, exactly where it stands
      const A = { x: from.left + from.width / 2, y: from.top + from.height / 2, w: from.width };
      c!.setPhoneHidden(true);

      fs.innerHTML = "";
      const a = fromShot.cloneNode(true) as HTMLElement;
      const b = toShot.cloneNode(true) as HTMLElement;
      a.style.opacity = "1";
      a.style.transform = "translateY(0px)";
      b.style.opacity = "1";
      a.style.transition = b.style.transition = "translate .5s cubic-bezier(.4,0,.2,1)";
      b.style.translate = "110% 0";
      fs.appendChild(a);
      fs.appendChild(b);

      fp.style.width = A.w + "px";
      fl.style.display = "block";
      const box = fl.getBoundingClientRect();
      const w0 = box.width, h0 = box.height;

      // two phones again, for a moment: the story's stays hidden until landing
      story.current?.setPhoneHidden(true);

      const scrollFrom = window.scrollY;
      const secDocTop = scrollFrom + sec!.getBoundingClientRect().top;
      const scrollTo = Math.max(0, secDocTop - window.innerHeight - 2);
      const t0 = performance.now();
      let swapped = false;
      let jumped = false;
      let driving = true;
      const release = (ev?: Event) => {
        if (ev && ev.type === "wheel" && (ev as WheelEvent).deltaY < 0) return;
        driving = false;
      };
      window.addEventListener("wheel", release, { passive: true });
      window.addEventListener("touchmove", release, { passive: true });
      window.addEventListener("keydown", release);
      // A CLICK ends the driving too — and a nav link is a click. React unmounts
      // a route some hundreds of ms after the link is pressed, and until then
      // this loop was still calling window.scrollTo: press "About" mid-flight
      // and the page that opened scrolled itself to the bottom (owner,
      // 2026-09-01 — "clicked back to homepage and I didn't see the phone
      // screens"). Pointer down, hands off.
      window.addEventListener("pointerdown", release);
      const unlisten = () => {
        window.removeEventListener("pointerdown", release);
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchmove", release);
        window.removeEventListener("keydown", release);
      };

      let raf = 0;
      abort = (restore) => {
        cancelAnimationFrame(raf);
        driving = false;
        unlisten();
        fl.style.display = "none";
        fl.style.transform = "";
        flying = false;
        abort = null;
        if (!restore) return;
        // The way back was already heading here: give the reader the story.
        story.current?.setPhoneHidden(false);
        story.current?.setGone(false);
        c!.rewind();
        armed = false;
        flown = false;
      };

      /* The same in-place cut, backwards: the closer empties around the held
         phone, the page is cut back above the closer while only the phone is
         visible, and the phone glides up to where the story's phone stands —
         measured live AFTER the cut, because its sticky stage settles with the
         scroll and the landing has to be exact. */
      const step = (now: number) => {
        if (dead) return;
        const t = Math.min(1, (now - t0) / DUR);
        if (!jumped && t >= JUMP) jumped = true;
        if (driving) window.scrollTo(0, jumped ? scrollTo : scrollFrom);
        const g = t < JUMP ? 0 : (t - JUMP) / (1 - JUMP);
        const ge = easeInOut(g);
        const tr = jumped ? storyPhoneRect() : null;
        const B = tr ? { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2, w: tr.width } : A;
        const px = A.x + (B.x - A.x) * ge;
        const vy = A.y + (B.y - A.y) * ge - 12 * Math.sin(Math.PI * g);
        const sc = (A.w + (B.w - A.w) * ge) / A.w;
        fl.style.transform = `translate(${px - (w0 * sc) / 2}px,${vy - (h0 * sc) / 2}px) scale(${sc})`;
        if (!swapped && g >= 0.5) {
          swapped = true;
          a.style.translate = "-110% 0";
          b.style.translate = "0 0";
        }
        // the story's words come back with the landing, not after it
        if (g >= 0.7) story.current?.setGone(false);
        if (t < 1) {
          raf = requestAnimationFrame(step);
          return;
        }
        if (driving) window.scrollTo(0, scrollTo);
        story.current?.setPhoneHidden(false); // theirs again, exactly here
        story.current?.setGone(false);
        fl.style.display = "none";
        fl.style.transform = "";
        unlisten();
        flying = false;
        abort = null;
        flown = false;
        done();
      };
      raf = requestAnimationFrame(step);
    }

    /* THE WAY BACK, first act: everything the arrival brought out goes back
       in, the same way it came. The page is held still for the length of it —
       wherever in the pin the reader is, it first glides to the nearest
       properly framed spot, then holds there. */
    function retract(done: () => void) {
      const y0 = window.scrollY;
      let holding = true;
      let over = false;
      const secDocTop = y0 + sec!.getBoundingClientRect().top;
      const pinEnd = secDocTop + Math.max(0, sec!.offsetHeight - window.innerHeight);
      const yT = Math.max(secDocTop, Math.min(y0, pinEnd));
      const g0 = performance.now(), G = 240;
      const rel = (ev?: Event) => {
        if (ev && ev.type === "wheel" && (ev as WheelEvent).deltaY < 0) return;
        holding = false;
      };
      window.addEventListener("wheel", rel, { passive: true });
      window.addEventListener("touchmove", rel, { passive: true });
      window.addEventListener("keydown", rel);
      const unlisten = () => {
        window.removeEventListener("wheel", rel);
        window.removeEventListener("touchmove", rel);
        window.removeEventListener("keydown", rel);
      };
      // The first act counts as flight time (onWheelUp set `flying`), so it
      // has to be stoppable the same way — otherwise leaving during it strands
      // exactly what a stranded flight used to strand.
      abort = (restore) => {
        over = true;
        holding = false;
        unlisten();
        flying = false;
        abort = null;
        if (!restore) return;
        story.current?.setPhoneHidden(false);
        story.current?.setGone(false);
        c!.rewind();
        armed = false;
        flown = false;
      };
      const hold = (now?: number) => {
        if (over || !holding || dead) return;
        const g = Math.min(1, ((now || performance.now()) - g0) / G);
        const e = 1 - Math.pow(1 - g, 3);
        window.scrollTo(0, y0 + (yT - y0) * e);
        requestAnimationFrame(hold);
      };
      hold();
      c!.retract().then(() => {
        over = true;
        window.removeEventListener("wheel", rel);
        window.removeEventListener("touchmove", rel);
        window.removeEventListener("keydown", rel);
        done();
      });
    }

    /* ── arriving, and leaving ──────────────────────────────────────── */
    const arrive = () => {
      const st = storyPhoneRect();
      const near = !!st && st.width > 10 && st.bottom > 120 && st.top < window.innerHeight - 120;
      if (flies() && near) runFlight(() => {});
      else c.arriveInPlace();
    };
    const onIntersect = (entries: IntersectionObserverEntry[]) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) {
            // Scrolled back above it: put it away, so coming back plays it again.
            if (e.boundingClientRect.top > 0 && armed) {
              // Mid-flight this used to do NOTHING, which is how a reader who
              // turned around during the 1.5s ended up back in a story whose
              // words had stepped aside for good. Stop the flight instead: it
              // puts the phone, the words and the closer back itself.
              if (flying) {
                abort?.(true);
                return;
              }
              armed = false;
              flown = false;
              c.rewind();
              story.current?.setGone(false);
            }
            return;
          }
          if (armed) return;
          armed = true;
          arrive();
        });
    };
    // Rebuilt on a breakpoint flip: the threshold differs between the two
    // modes, and an observer keeps the one it was made with.
    const makeIO = () => new IntersectionObserver(onIntersect, { threshold: flies() ? 0.02 : 0.3 });
    let io = makeIO();
    io.observe(sec);

    /* THE BREAKPOINT FLIPPED UNDER THE READER — the window was dragged across
       1280, or reduced-motion was switched on. Everything measured for the old
       layout is void: stop any flight without restoring it (it would restore
       into geometry that no longer exists), and hand the section back in the
       state the new width expects. If the reader is standing in the closer,
       it appears in place, whole; if it is off screen, it is put away and the
       observer plays it afresh on the way in. */
    let mode = flies();
    const onFlip = () => {
      if (flies() === mode) return; // a resize that stayed on one side of 1280
      mode = !mode;
      abort?.(false);
      io.disconnect();
      armed = false;
      flown = false;
      flying = false;
      story.current?.setPhoneHidden(false);
      story.current?.setGone(false);
      c.setPhoneHidden(false);
      const r = sec.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) {
        c.arriveInPlace();
        armed = true;
      } else {
        c.rewind();
        c.prime(flies() ? "hide" : "pre");
      }
      io = makeIO();
      io.observe(sec);
    };
    const unwatch = watchViewport(onFlip);

    /* A nudge up ANYWHERE on the landed closer plays the film in reverse.
       Anywhere, because with smooth scrolling the wheel events arrive while
       the page is still deep in the cushion. armed stays true until the
       reverse lands, so the observer cannot replay the arrival mid-move. */
    const onWheelUp = (ev: WheelEvent) => {
      if (ev.deltaY >= 0 || !armed || !flown || flying || !flies()) return;
      const r = sec.getBoundingClientRect(), mid = window.innerHeight / 2;
      if (r.top > mid || r.bottom < mid) return; // it is not what is on screen
      flying = true; // claimed from the first frame of the act
      retract(() => runFlightBack(() => { armed = false; }));
    };
    // Always listening; onWheelUp is inert unless a flight has actually landed
    // (`flown`), and it asks flies() itself, so a flip cannot strand it.
    window.addEventListener("wheel", onWheelUp, { passive: true });

    return () => {
      // Leaving the page mid-flight: stop the loop. It drives window.scrollTo,
      // and it used to keep driving after the route had changed — the page you
      // opened scrolled itself to where the old page's closer had been.
      dead = true;
      abort?.(false);
      io.disconnect();
      unwatch();
      window.removeEventListener("wheel", onWheelUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ScrollStory ref={story} id={storyId} beats={beats} accent={accent} />
      {children}
      {closer === "campus" ? (
        <CampusColours ref={clo} id={closerId} managed pinned={pinned} aside={aside} />
      ) : (
        <BladeLock ref={clo} id={closerId} managed pinned={pinned} aside={aside} />
      )}
      {/* The phone in flight belongs to the PAGE, not to either section — the
          only way it can be on screen continuously across the boundary. */}
      <div
        ref={flight}
        aria-hidden
        data-flight={storyId}
        className="pointer-events-none fixed top-0 left-0 z-[6] origin-top-left will-change-transform"
        style={{ display: "none" }}
      >
        <Phone ref={flightPhone} className="w-[360px]">
          <div ref={flightShots} className="ls-shots" />
        </Phone>
      </div>
    </>
  );
}
