"use client";

import Image from "next/image";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import Phone from "@/components/landing/Phone";
import { useCloserGate } from "@/components/landing/useCloserGate";
import type { CloserHandle } from "@/components/landing/closer";
import { closers } from "@/lib/landingCopy";
import { schools, rgba } from "@/lib/landingSchools";

/*
  CAMPUS COLOURS — the closer of the student story.

  Ported natively from the "UNIsport Campus Colours" design piece (a bundled
  app that was iframed): the same layout — words, then phone beside a giant
  serif letter with the school's name under it, then eight dots — with real
  selectable text, the l-* tokens for every page colour, and the school
  colours applied inline from lib/landingSchools.ts (content, rule 1's
  exception).

  Inside the phone is the REAL Gyms screen, recoloured per school (the same
  captures the artifact's closer shows) — not the design's drawn gym list.
  The Gyms capture carries the app's own tab bar, so none is drawn here.

  Behaviour, as the piece: it cycles through the eight schools every 2.6s,
  a click on a dot pins that school, and it un-pins once the section has
  scrolled out of view. It opens on Harvard — the colour the story's phone
  was wearing — and resets to Harvard when it leaves.

  ARRIVAL. On its own (`managed` off, the /closers-preview route) it simply
  cycles while in view. Under StoryCloser (`managed`) it is a stage the flow
  dresses: the phone is hidden while the page's phone flies in and lands on
  it, or parked for its own slide-in; the letter swings out from behind the
  phone; the words come in from the right; the cycle starts only once all of
  that has played. Reduced motion: no cycling, no fades — a still Harvard,
  and the dots still work.
*/

const PERIOD_MS = 2600;
type Phase = "hide" | "pre" | "in";

export default function CampusColours({
  id,
  managed = false,
  pinned = false,
  ref,
}: {
  id?: string;
  /** Under StoryCloser: arrival is the flow's to play, cycling waits for it. */
  managed?: boolean;
  /** A little taller than one screen, sticky inside — the flight lands here. */
  pinned?: boolean;
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
    const t = setInterval(() => {
      setSchool((s) => ({ idx: (s.idx + 1) % schools.length, prev: s.idx }));
    }, PERIOD_MS);
    return () => clearInterval(t);
  }, [inView, held, reduced, cycling]);

  const pick = (i: number) => {
    setHeld(true);
    setSchool((s) => (s.idx === i ? s : { idx: i, prev: s.idx }));
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
      later(() => setCycling(true), 1700); // …and only then does it start rotating
    },
    arriveInPlace: () => {
      // The phone may be hidden waiting for a flight that is not coming: swap
      // the hiding for the slide-in entrance, so it arrives instead of just
      // appearing.
      setPhone("pre");
      later(() => setPhone("in"), 30);
      later(() => setLetter("in"), 260);
      later(() => setWordsPre(false), 320);
      later(() => setCycling(true), 1500);
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
  const letterCls =
    letter === "pre" ? "lc-pre" : letter === "now" ? "lc-now" : letter === "rev" ? "lc-rev lc-pre" : "";

  return (
    <section
      ref={sectionRef}
      id={id}
      data-closer="campus"
      className={`lc-closer relative z-[1] scroll-mt-20 border-t border-l-border ${pinned ? "lc-pinned" : ""}`}
    >
      <div
        ref={stick}
        className="lc-stick flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-10 sm:px-8"
      >
        {/* ── The words ── */}
        <div className={`lc-words mb-11 max-w-[760px] text-center ${wordsPre ? "lc-pre" : ""}`}>
          <p className="mb-2.5 font-display text-[clamp(16px,2vw,20px)] text-l-text-2">{copy.leadIn}</p>
          <h2 className="font-display text-[clamp(36px,4.6vw,60px)] font-normal leading-[1.1] tracking-tight text-balance text-l-text">
            {copy.headline}{" "}
            <em
              className="italic transition-colors duration-[600ms] ease-in-out motion-reduce:transition-none"
              style={{ color: s.ink }}
            >
              {copy.headlineEm}
            </em>
          </h2>
          <p className="mx-auto mt-3.5 max-w-[52ch] text-[clamp(15px,1.6vw,17px)] leading-[1.6] text-pretty text-l-text-2">
            {copy.sub}
          </p>
        </div>

        {/* ── Phone beside the letter (letter above the phone below 1024px) ── */}
        <div className="flex w-full flex-col items-center justify-center gap-10 lg:flex-row lg:gap-[60px]">
          <Phone
            ref={phoneEl}
            className={`lc-phone relative z-[3] order-2 w-[min(270px,84vw)] flex-none lg:order-1 ${
              phone === "hide" ? "lc-hide" : phone === "pre" ? "lc-pre" : ""
            }`}
            data-closer-phone="campus"
          >
            <div className="relative aspect-[900/1480] overflow-hidden bg-l-phone-screen">
              {schools.map((sc, i) => (
                <Image
                  key={sc.key}
                  src={`/landing/closers/gyms-${sc.key}.webp`}
                  alt={`The Gyms screen in ${sc.name}'s colours`}
                  fill
                  sizes="270px"
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
              className="relative mt-[26px] font-mono text-[26px] uppercase tracking-[0.2em] transition-colors duration-[600ms] ease-in-out motion-reduce:transition-none"
              style={{ color: s.ink }}
            >
              {s.name}
            </div>
          </div>
        </div>

        {/* ── One dot per school ── */}
        <div className="mt-12 flex items-center justify-center gap-3.5" role="group" aria-label="Choose a university">
          {schools.map((sc, i) => {
            const on = i === idx;
            return (
              <button
                key={sc.key}
                type="button"
                aria-label={sc.name}
                aria-pressed={on}
                onClick={() => pick(i)}
                className="h-2.5 w-2.5 cursor-pointer rounded-full border-0 bg-l-border-hover p-0 transition-[transform,background-color] duration-300 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text motion-reduce:transition-none"
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
      </div>
    </section>
  );
}
