"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
  type TouchEvent as ReactTouchEvent,
} from "react";
import Phone from "@/components/landing/Phone";
import { shotSrc, usePhoneMode } from "@/components/landing/PhoneMode";
import CloserSplit from "@/components/landing/CloserSplit";
import { useCloserGate } from "@/components/landing/useCloserGate";
import type { CloserHandle } from "@/components/landing/closer";
import { closers } from "@/lib/landingCopy";
import { schools, rgba, SCHOOL_CYCLE_MS } from "@/lib/landingSchools";

/*
  CAMPUS COLOURS — the closer of the student story.

  Ported natively from the "UNIsport Campus Colours" design piece (a bundled
  app that was iframed): the same layout — words, then phone beside a giant
  serif letter with the school's name under it, then eight dots — with real
  selectable text, the l-* tokens for every page colour, and the school
  colours applied inline from lib/landingSchools.ts (content, rule 1's
  exception).

  Inside the phone is the REAL Gyms screen, recoloured per school AND showing
  that school's own gyms — the Harvard capture, recolour-shifted by
  scripts/landing/recolor-shots.mjs and its three cards rewritten by
  patch-gyms.mjs (Payne Whitney for Yale, Dillon for Princeton, …). The Gyms
  capture carries the app's own tab bar, so none is drawn here.

  Behaviour, as the piece: it cycles through the eight schools every 2.6s
  (the first step sooner — see FIRST_MS),
  a click on a dot pins that school, and it un-pins once the section has
  scrolled out of view. It opens on Harvard — the colour the story's phone
  was wearing — and resets to Harvard when it leaves.

  SWIPE. Nobody should have to wait out the 2.6s to see the next school: a
  swipe left over the piece goes to the next one, right to the previous, and
  — like a dot click — pins it, so the cycle stops arguing with the finger.
  Only a clearly horizontal drag counts, so the page still scrolls normally
  through a piece that is taller than the screen.

  ARRIVAL. On its own (`managed` off, the /closers-preview route) it simply
  cycles while in view. Under StoryCloser (`managed`) it is a stage the flow
  dresses: the phone is hidden while the page's phone flies in and lands on
  it, or parked for its own slide-in; the letter swings out from behind the
  phone; the words come in from the right; the cycle starts only once all of
  that has played. Reduced motion: no cycling, no fades — a still Harvard,
  and the dots still work.
*/

// The page's one pace (lib/landingSchools.ts) — but the FIRST step (Harvard →
// Yale after landing) comes sooner: at that pace the wait for Yale, on top of
// the arrival, read as twice as long as every other step.
const PERIOD_MS = SCHOOL_CYCLE_MS;
const FIRST_MS = 1500;
/** How far a finger must travel across before it counts as a swipe. */
const SWIPE_PX = 40;
type Phase = "hide" | "pre" | "in";

export default function CampusColours({
  id,
  managed = false,
  pinned = false,
  aside,
  ref,
}: {
  id?: string;
  /** Under StoryCloser: arrival is the flow's to play, cycling waits for it. */
  managed?: boolean;
  /** A little taller than one screen, sticky inside — the flight lands here. */
  pinned?: boolean;
  /** Something to stand beside the piece — the feature rows. */
  aside?: ReactNode;
  ref?: Ref<CloserHandle>;
}) {
  const [{ idx, prev }, setSchool] = useState<{ idx: number; prev: number | null }>({ idx: 0, prev: null });
  const [held, setHeld] = useState(false); // a dot was clicked
  const [cycling, setCycling] = useState(!managed);
  const [phone, setPhone] = useState<Phase>("in");
  const [letter, setLetter] = useState<"in" | "pre" | "now" | "rev">("in");
  const [wordsPre, setWordsPre] = useState(false);
  const stick = useRef<HTMLDivElement>(null);
  const phoneEl = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const toHarvard = useCallback(() => {
    setHeld(false);
    setSchool({ idx: 0, prev: null });
  }, []);

  /* In view → cycle; out of view → stop, un-pin, and go back to Harvard so
     the next arrival opens on it. (Under the flow, the flow does this too,
     with the rest of the rewind.) */
  const { ref: sectionRef, inView, reduced } = useCloserGate(() => {
    toHarvard();
    if (managed) setCycling(false);
  });

  useEffect(() => {
    if (!inView || held || reduced || !cycling) return;
    const step = () => setSchool((s) => ({ idx: (s.idx + 1) % schools.length, prev: s.idx }));
    let t: ReturnType<typeof setInterval> | null = null;
    const first = setTimeout(() => {
      step();
      t = setInterval(step, PERIOD_MS);
    }, FIRST_MS);
    return () => {
      clearTimeout(first);
      if (t) clearInterval(t);
    };
  }, [inView, held, reduced, cycling]);

  const pick = (i: number) => {
    setHeld(true);
    setSchool((s) => (s.idx === i ? s : { idx: i, prev: s.idx }));
  };

  /* A swipe walks to the next/previous school and pins it, exactly as a dot
     click does — so a finger can outrun the 2.6s cycle. */
  const walk = (dir: 1 | -1) => {
    setHeld(true);
    setSchool((s) => ({ idx: (s.idx + dir + schools.length) % schools.length, prev: s.idx }));
  };

  const touchFrom = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: ReactTouchEvent) => {
    const t = e.touches[0];
    touchFrom.current = t ? { x: t.clientX, y: t.clientY } : null;
  };
  const onTouchEnd = (e: ReactTouchEvent) => {
    const from = touchFrom.current;
    touchFrom.current = null;
    const t = e.changedTouches[0];
    if (!from || !t) return;
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    // Too short is a tap; more down than across is the page being scrolled.
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    walk(dx < 0 ? 1 : -1);
  };

  useImperativeHandle(ref, () => ({
    el: () => sectionRef.current,
    phoneRect: () => phoneEl.current?.getBoundingClientRect() ?? null,
    phoneTarget: () => {
      const pr = phoneEl.current?.getBoundingClientRect();
      const sr = stick.current?.getBoundingClientRect();
      if (!pr || !sr) return null;
      return { x: pr.left + pr.width / 2, y: pr.top - sr.top + pr.height / 2, w: pr.width };
    },
    prime: (mode) => {
      clearTimers();
      setCycling(false);
      toHarvard();
      if (reduced) return;
      setPhone(mode);
      setLetter("pre");
      setWordsPre(true);
    },
    arriveAfterFlight: () => {
      setPhone("in"); // theirs, exactly here, takes over
      later(() => {
        setLetter("now");
        setWordsPre(false);
      }, 220);
      later(() => setCycling(true), 600); // …and only then does it start rotating
    },
    arriveInPlace: () => {
      // The phone may be hidden waiting for a flight that is not coming: swap
      // the hiding for the slide-in entrance, so it arrives instead of just
      // appearing.
      setPhone("pre");
      later(() => setPhone("in"), 30);
      later(() => setLetter("in"), 260);
      later(() => setWordsPre(false), 320);
      later(() => setCycling(true), 600);
    },
    retract: () =>
      new Promise<void>((resolve) => {
        clearTimers();
        setCycling(false);
        setWordsPre(true);
        setLetter("rev");
        later(resolve, 1000); // the letter's full swing home
      }),
    setPhoneHidden: (h) => setPhone(h ? "hide" : "in"),
    rewind: () => {
      clearTimers();
      setCycling(false);
      toHarvard();
      if (reduced) return;
      setPhone("hide");
      setLetter("pre");
      setWordsPre(true);
    },
  }));

  const s = schools[idx];
  const animate = prev != null && !reduced;
  const copy = closers.campus;
  const { mode } = usePhoneMode();
  const letterCls =
    letter === "pre" ? "lc-pre" : letter === "now" ? "lc-now" : letter === "rev" ? "lc-rev lc-pre" : "";

  return (
    <section
      ref={sectionRef}
      id={id}
      data-closer="campus"
      data-phone-screens
      className={`lc-closer relative z-[1] scroll-mt-20 border-t border-l-line ${pinned ? "lc-pinned" : ""}`}
    >
      <div
        ref={stick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        // touch-pan-y: vertical is the page's, across is ours.
        className="lc-stick flex min-h-svh touch-pan-y flex-col items-center justify-center overflow-hidden px-6 py-6 sm:px-8 lg:py-10"
      >
        <CloserSplit aside={aside} accent="accent">
        {/* ── The words ── */}
        <div className={`lc-words mb-6 max-w-[760px] text-center lg:mb-11 ${wordsPre ? "lc-pre" : ""}`}>
          {/* No lead-in over this block since 2026-09-04 (the owner: discard the
              sentence above the headline), exactly as Blade Lock. An empty <p>
              would still hold a line of height, so it only exists when there
              are words for it. */}
          {copy.leadIn && (
            <p className="mb-2.5 font-display text-[clamp(16px,2vw,20px)] text-l-text-2">{copy.leadIn}</p>
          )}
          <h2 className="font-display text-[clamp(36px,4.6vw,60px)] font-normal leading-[1.1] tracking-tight text-balance text-l-text">
            {copy.headline}{" "}
            <em
              className="italic transition-colors duration-[600ms] ease-in-out motion-reduce:transition-none"
              style={{ color: s.ink }}
            >
              {copy.headlineEm}
            </em>
          </h2>
          {/* The sub ends on the one thing you can press in the student story:
              "Bring it to yours next." opens a mail to the owner (the same door
              the Coach's Console gives a coach). It wears the CURRENT school's
              colour, so it is visibly not body text and it turns over with the
              rest of the piece — content colour from lib/landingSchools, rule
              1's exception. */}
          <p className="mx-auto mt-3.5 max-w-[52ch] text-[clamp(15px,1.6vw,17px)] leading-[1.6] text-pretty text-l-text-2">
            {copy.sub}{" "}
            <Link
              href={copy.ctaHref}
              className="tap44 font-medium underline underline-offset-4 transition-colors duration-[600ms] ease-in-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none"
              style={{ color: s.ink }}
            >
              {copy.cta}
            </Link>
          </p>
        </div>

        {/* ── Phone beside the letter (letter above the phone below 1024px) ── */}
        {/* On a phone the whole piece — words, letter, phone, dots — fits one screen:
            smaller phone, tighter gaps. Desktop is the piece's own spacing.

            AND IT HAS TO FIT A SHORT WINDOW TOO. From xl up the section is
            pinned: one screen tall, overflow hidden. The piece is a fixed
            759px (words 174 + 44, the phone's 482, the dots' 48 + 10) plus the
            stick's 80 of padding, so under ~840px of window height the bottom
            was simply cut off — a measured 139px gone at 1440x620 (owner,
            2026-09-03). Blade Lock had a fit routine for this and this piece
            had none. So above xl the phone is capped by what is LEFT of the
            screen: 100svh less that 356px of words, dots and padding, divided
            by its own 1480/900 aspect (x0.608 = width). At a normal window the
            min() picks 270 and nothing changes. */}
        <div className="flex w-full flex-col items-center justify-center gap-5 lg:flex-row lg:gap-[60px]">
          <Phone
            ref={phoneEl}
            className={`lc-phone relative z-[3] order-2 w-[min(270px,52vw)] flex-none lg:order-1 lg:w-[270px] xl:w-[min(270px,calc((100svh_-_356px)*0.608))] ${
              phone === "hide" ? "lc-hide" : phone === "pre" ? "lc-pre" : ""
            }`}
            data-closer-phone="campus"
          >
            <div className="relative aspect-[900/1480] overflow-hidden bg-l-phone-screen">
              {schools.map((sc, i) => (
                <Image
                  key={sc.key}
                  src={shotSrc(`/landing/closers/gyms-${sc.key}.webp`, mode)}
                  alt={`The Gyms screen in ${sc.name}'s colours`}
                  fill
                  sizes="270px"
                  quality={90}
                  loading={i === 0 ? "eager" : "lazy"}
                  aria-hidden={i !== idx}
                  className="object-fill transition-opacity duration-[450ms] ease-in-out motion-reduce:transition-none"
                  style={{ opacity: i === idx ? 1 : 0 }}
                />
              ))}
            </div>
          </Phone>

          {/* min-w: the block is as wide as its widest word, so the phone beside
              it does not shuffle sideways as "Yale" becomes "Princeton". */}
          <div
            className={`lc-letter relative z-[1] order-1 flex min-w-[240px] flex-none flex-col items-center text-center lg:order-2 ${letterCls}`}
          >
            {/* the school-coloured glow behind the letter */}
            <div
              aria-hidden
              className="pointer-events-none absolute -inset-[60px] transition-[background] duration-[600ms] ease-in-out motion-reduce:transition-none"
              style={{ background: `radial-gradient(circle at 50% 42%, ${rgba(s.color, 0.08)} 0%, transparent 62%)` }}
            />
            <div className="relative grid place-items-center">
              {animate && prev != null && (
                <span
                  key={`out-${prev}`}
                  aria-hidden
                  className="font-display text-[clamp(120px,14vw,240px)] leading-[0.8] [grid-area:1/1] [animation:l-letter-out_.6s_ease_both]"
                  style={{ color: schools[prev].ink }}
                >
                  {schools[prev].letter}
                </span>
              )}
              <span
                key={`in-${idx}`}
                className={`font-display text-[clamp(120px,14vw,240px)] leading-[0.8] [grid-area:1/1] ${
                  animate ? "[animation:l-letter-in_.6s_ease_both]" : ""
                }`}
                style={{ color: s.ink }}
              >
                {s.letter}
              </span>
            </div>
            <div
              className="relative mt-3 font-mono text-[22px] uppercase tracking-[0.2em] lg:mt-[26px] lg:text-[26px] transition-colors duration-[600ms] ease-in-out motion-reduce:transition-none"
              style={{ color: s.ink }}
            >
              {s.name}
            </div>
          </div>
        </div>

        {/* ── One dot per school ── */}
        <div className="mt-7 flex items-center justify-center gap-3.5 lg:mt-12" role="group" aria-label="Choose a university">
          {schools.map((sc, i) => {
            const on = i === idx;
            return (
              <button
                key={sc.key}
                type="button"
                aria-label={sc.name}
                aria-pressed={on}
                onClick={() => pick(i)}
                /* tap-dot: 10px to the eye, 44px tall to the thumb (globals.css) */
                className="tap-dot h-2.5 w-2.5 cursor-pointer rounded-full border-0 bg-l-line-hover p-0 transition-[transform,background-color] duration-300 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none"
                style={
                  on
                    ? {
                        background: sc.ink,
                        transform: "scale(1.4)",
                        boxShadow: `0 0 0 3px var(--color-l-bg), 0 0 0 5px ${rgba(sc.ink, 0.55)}`,
                      }
                    : undefined
                }
              />
            );
          })}
        </div>
        </CloserSplit>
      </div>
    </section>
  );
}
