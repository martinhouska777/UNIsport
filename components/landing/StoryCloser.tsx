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
};

const DUR = 1500;
const JUMP = 0.32;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/* Where the flight exists: the two-column layout, without reduced motion.
   Decided once, at mount (a resize mid-story would otherwise change the page
   height under the reader — the artifact decides it once too). */
const FLIES_MQ = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
const noop = () => () => {};
function useFlies() {
  return useSyncExternalStore(
    noop,
    () => window.matchMedia(FLIES_MQ).matches,
    () => false,
  );
}

export default function StoryCloser({ storyId, beats, accent, closer, closerId, fromBeat, toBeat, children }: Props) {
  const story = useRef<ScrollStoryHandle>(null);
  const clo = useRef<CloserHandle>(null);
  const flight = useRef<HTMLDivElement>(null);
  const flightPhone = useRef<HTMLDivElement>(null);
  const flightShots = useRef<HTMLDivElement>(null);
  // Only the pinned, flown-into closer needs the extra screen of scroll, and
  // only where the two-column layout exists to fly across.
  const pinned = useFlies();

  useEffect(() => {
    const flies = window.matchMedia(FLIES_MQ).matches;
    const c = clo.current;
    const sec = c?.el();
    if (!c || !sec) return;

    c.prime(flies ? "hide" : "pre");

    let armed = false;
    let flown = false;
    let flying = false;

    const storyPhoneRect = () => story.current?.phoneRect() ?? null;

    /* ── the flight ─────────────────────────────────────────────────── */
    function runFlight(done: () => void) {
      const fl = flight.current, fp = flightPhone.current, fs = flightShots.current;
      const start = storyPhoneRect();
      const target = c!.phoneTarget();
      const fromShot = story.current?.shotEl(fromBeat);
      const toShot = story.current?.shotEl(toBeat);
      if (!fl || !fp || !fs || !start || !target || start.width < 10 || !fromShot || !toShot) {
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

      const step = (now: number) => {
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
          requestAnimationFrame(step);
          return;
        }
        if (driving) window.scrollTo(0, scrollTo); // exactly on the pin
        c!.arriveAfterFlight(); // theirs, exactly here, takes over
        fl.style.display = "none";
        fl.style.transform = "";
        story.current?.setPhoneHidden(false);
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchmove", release);
        window.removeEventListener("keydown", release);
        flying = false;
        flown = true; // the way back starts from here
        done();
      };
      requestAnimationFrame(step);
    }

    function runFlightBack(done: () => void) {
      const fl = flight.current, fp = flightPhone.current, fs = flightShots.current;
      const from = c!.phoneRect();
      const fromShot = story.current?.shotEl(toBeat); // leave on the closer's screen…
      const toShot = story.current?.shotEl(fromBeat); // …arrive on the frame the story ended on
      if (!fl || !fp || !fs || !from || !storyPhoneRect() || !fromShot || !toShot) {
        flying = false;
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

      /* The same in-place cut, backwards: the closer empties around the held
         phone, the page is cut back above the closer while only the phone is
         visible, and the phone glides up to where the story's phone stands —
         measured live AFTER the cut, because its sticky stage settles with the
         scroll and the landing has to be exact. */
      const step = (now: number) => {
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
          requestAnimationFrame(step);
          return;
        }
        if (driving) window.scrollTo(0, scrollTo);
        story.current?.setPhoneHidden(false); // theirs again, exactly here
        story.current?.setGone(false);
        fl.style.display = "none";
        fl.style.transform = "";
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchmove", release);
        window.removeEventListener("keydown", release);
        flying = false;
        flown = false;
        done();
      };
      requestAnimationFrame(step);
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
      const hold = (now?: number) => {
        if (over || !holding) return;
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
      if (flies && near) runFlight(() => {});
      else c.arriveInPlace();
    };
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) {
            // Scrolled back above it: put it away, so coming back plays it again.
            if (e.boundingClientRect.top > 0 && armed && !flying) {
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
      },
      { threshold: flies ? 0.02 : 0.3 },
    );
    io.observe(sec);

    /* A nudge up ANYWHERE on the landed closer plays the film in reverse.
       Anywhere, because with smooth scrolling the wheel events arrive while
       the page is still deep in the cushion. armed stays true until the
       reverse lands, so the observer cannot replay the arrival mid-move. */
    const onWheelUp = (ev: WheelEvent) => {
      if (ev.deltaY >= 0 || !armed || !flown || flying) return;
      const r = sec.getBoundingClientRect(), mid = window.innerHeight / 2;
      if (r.top > mid || r.bottom < mid) return; // it is not what is on screen
      flying = true; // claimed from the first frame of the act
      retract(() => runFlightBack(() => { armed = false; }));
    };
    if (flies) window.addEventListener("wheel", onWheelUp, { passive: true });

    return () => {
      io.disconnect();
      window.removeEventListener("wheel", onWheelUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <ScrollStory ref={story} id={storyId} beats={beats} accent={accent} />
      {children}
      {closer === "campus" ? (
        <CampusColours ref={clo} id={closerId} managed pinned={pinned} />
      ) : (
        <BladeLock ref={clo} id={closerId} managed pinned={pinned} />
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
