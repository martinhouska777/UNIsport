"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Phone from "@/components/landing/Phone";
import { useCloserGate } from "@/components/landing/useCloserGate";
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
  scrolled out of view. Two things the artifact did from outside are native
  here: the cycle only STARTS once the section is in view (so the reader
  always arrives on Harvard, the colour the story's phone was wearing), and it
  resets to Harvard when it leaves. Reduced motion: no cycling, no fades — a
  still Harvard, and the dots still work.

  `data-closer-phone` marks the phone the story's flying phone will land on
  once the stories are ported.
*/

const PERIOD_MS = 2600;

export default function CampusColours({ id }: { id?: string }) {
  const [{ idx, prev }, setSchool] = useState<{ idx: number; prev: number | null }>({ idx: 0, prev: null });
  const [pinned, setPinned] = useState(false);

  /* In view → cycle; out of view → stop, un-pin, and go back to Harvard so
     the next arrival opens on it. */
  const { ref, inView, reduced } = useCloserGate(() => {
    setPinned(false);
    setSchool({ idx: 0, prev: null });
  });

  useEffect(() => {
    if (!inView || pinned || reduced) return;
    const t = setInterval(() => {
      setSchool((s) => ({ idx: (s.idx + 1) % schools.length, prev: s.idx }));
    }, PERIOD_MS);
    return () => clearInterval(t);
  }, [inView, pinned, reduced]);

  const pick = (i: number) => {
    setPinned(true);
    setSchool((s) => (s.idx === i ? s : { idx: i, prev: s.idx }));
  };

  const s = schools[idx];
  const animate = prev != null && !reduced;
  const copy = closers.campus;

  return (
    <section
      ref={ref}
      id={id}
      data-closer="campus"
      className="relative z-[1] flex scroll-mt-20 flex-col items-center overflow-hidden border-t border-l-border px-6 py-14 sm:px-8"
    >
      {/* ── The words ── */}
      <div className="mb-11 max-w-[760px] text-center">
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
        <Phone className="order-2 w-[min(270px,84vw)] flex-none lg:order-1" data-closer-phone="campus">
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
        <div className="relative order-1 flex min-w-[240px] flex-none flex-col items-center text-center lg:order-2">
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
    </section>
  );
}
