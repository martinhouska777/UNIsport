"use client";

import Image from "next/image";
import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, type CSSProperties, type Ref } from "react";
import Phone from "@/components/landing/Phone";
import type { Beat } from "@/lib/landingCopy";
import { motion as motionByBeat, shotSize } from "@/lib/landingMotion";

/*
  SCROLL STORY — one component, fed by two data sets (the brief).

  A story is a sticky stage — the beats' words on one side, the phone on the
  other — over a column of scroll markers, one per beat. Which marker owns the
  middle of the screen decides the beat: its words fade up, its screen arrives
  in the phone the way the app would show it (a push, a tab switch, a sheet, a
  zoom into the tapped button — see lib/landingMotion.ts), the labels pointing
  into the phone switch, and the dot on the rail stretches. Tall captures pan
  inside the phone as the reader scrolls their beat. Once per story, at the
  narrative pivot, the phone crosses to the other side of the page.

  This is scripts/landing/story-script.js — the prototype's runtime, the one
  the owner signed off — ported onto refs. It reads the scroll on
  requestAnimationFrame and toggles classes; every visual is CSS
  (app/globals.css, the .ls-* rules). It is deliberately NOT re-rendered per
  scroll: React owns the markup, this hook owns the choreography.

  Copy comes from lib/landingCopy.ts, motion from lib/landingMotion.ts,
  matched by beat id. Every colour is a token; the story's accent (blue for
  students, gold for varsity) is one CSS variable, --sa.

  The imperative handle is for the flight (the phone flying from the last beat
  into the closer): where the phone is, which frame is showing, and two
  switches — hide the phone, and let the words step aside.
*/

export type ScrollStoryHandle = {
  /** The phone shell's rect, or null. */
  phoneRect: () => DOMRect | null;
  /** The <img> of a given beat, for cloning into the flight. */
  shotEl: (i: number) => HTMLImageElement | null;
  /** The phone column made invisible while the page's phone flies. */
  setPhoneHidden: (hidden: boolean) => void;
  /** The words and rail step aside (fade) while the phone is the whole story. */
  setGone: (gone: boolean) => void;
  /** Which beat the scroll is on. */
  current: () => number;
};

type Props = {
  id: string;
  beats: Beat[];
  /** The story's accent token: "accent" (student blue) or "varsity" (gold). */
  accent: "accent" | "varsity";
  ref?: Ref<ScrollStoryHandle>;
};

export default function ScrollStory({ id, beats, accent, ref }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const phoneEl = useRef<HTMLDivElement>(null);
  const phoneCol = useRef<HTMLDivElement>(null);
  const shotsBox = useRef<HTMLDivElement>(null);
  const beatEls = useRef<(HTMLDivElement | null)[]>([]);
  const frames = useRef<(HTMLDivElement | null)[]>([]);
  const shots = useRef<(HTMLImageElement | null)[]>([]);
  const taps = useRef<(HTMLSpanElement | null)[]>([]);
  const pointers = useRef<(HTMLSpanElement | null)[]>([]);
  const dots = useRef<(HTMLButtonElement | null)[]>([]);
  const markers = useRef<(HTMLDivElement | null)[]>([]);

  // choreography state — refs, never state: nothing here re-renders
  const current = useRef(-1);
  const shown = useRef(-1);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanup = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingTap = useRef<[number, number] | null>(null);
  const reduce = useRef(false);

  const mo = useMemo(() => beats.map((b) => motionByBeat[b.id] || {}), [beats]);

  useImperativeHandle(ref, () => ({
    phoneRect: () => phoneEl.current?.getBoundingClientRect() ?? null,
    shotEl: (i) => shots.current[i] ?? null,
    setPhoneHidden: (h) => {
      if (phoneCol.current) phoneCol.current.style.visibility = h ? "hidden" : "";
    },
    setGone: (g) => stage.current?.classList.toggle("ls-gone", g),
    current: () => current.current,
  }));

  /* ── the runtime ── */
  const replay = (el: HTMLElement | null | undefined) => {
    if (!el) return;
    el.classList.remove("ls-fire");
    void el.offsetWidth; // restart the animation from zero
    el.classList.add("ls-fire");
  };

  // The actual class flip: new frame in, old frame plays its exit.
  // "shown" tracks what is on screen; "current" tracks where the scroll is.
  // They differ only for the few hundred ms while a tap is playing out.
  const commit = useCallback(
    (i: number, prev: number, fwd: boolean) => {
      shown.current = i;
      const side = mo[i]?.side || "right";
      stage.current?.classList.toggle("ls-flip", side === "left");
      shotsBox.current?.classList.toggle("ls-rev", !fwd);

      if (cleanup.current) {
        clearTimeout(cleanup.current);
        cleanup.current = null;
      }
      const enter = mo[i]?.enter || "fade";
      frames.current.forEach((f, fi) => {
        if (!f) return;
        // Everyone not in this move snaps to their parking spot with the
        // transition off — otherwise a stray frame slides visibly across the
        // screen on its way there.
        if (fi !== i && fi !== prev) {
          f.style.transition = "none";
          f.classList.remove("ls-leaving", "ls-on");
          f.removeAttribute("data-out");
          void f.offsetWidth;
          f.style.transition = "";
          return;
        }
        f.classList.toggle("ls-on", fi === i);
        if (fi === prev && prev !== i && prev !== -1) {
          f.classList.add("ls-leaving");
          f.setAttribute("data-out", fwd ? enter : "fade");
          if (enter === "zoom" && pendingTap.current) {
            f.style.setProperty("--ox", pendingTap.current[0] + "%");
            f.style.setProperty("--oy", pendingTap.current[1] + "%");
          }
        } else {
          f.classList.remove("ls-leaving");
          f.removeAttribute("data-out");
        }
      });
      cleanup.current = setTimeout(() => {
        frames.current.forEach((f) => {
          if (!f || !f.classList.contains("ls-leaving")) return;
          f.style.transition = "none";
          f.classList.remove("ls-leaving");
          f.removeAttribute("data-out");
          void f.offsetWidth;
          f.style.transition = "";
        });
      }, 900);

      beatEls.current.forEach((el, bi) => el?.classList.toggle("ls-on", bi === i));
      dots.current.forEach((el, di) => el?.classList.toggle("ls-on", di === i));
      stage.current
        ?.querySelectorAll<HTMLElement>(".ls-ann")
        .forEach((el) => el.classList.toggle("ls-on", +(el.dataset.i || -1) === i));
    },
    [mo],
  );

  const setActive = useCallback(
    (i: number) => {
      if (i === current.current || i < 0) return;
      current.current = i;
      const prev = shown.current;
      const fwd = i > prev;
      if (pending.current) {
        clearTimeout(pending.current);
        pending.current = null;
      }
      if (i === prev) return; // scrolled back to what is already on screen

      // Moving forward into the NEXT beat with a recorded tap: play the tap on
      // the screen we are leaving first, then make the move. Backwards, or when
      // several beats fly by in one scroll, skip the theatre and just switch.
      const tap = fwd && prev !== -1 && i === prev + 1 && !reduce.current ? taps.current[i] : null;
      const pointer = tap ? pointers.current[i] : null;

      if (!tap) {
        pendingTap.current = null;
        commit(i, prev, fwd);
        return;
      }
      pendingTap.current = mo[i]?.tap || null;
      let delay: number;
      if (pointer) {
        replay(pointer);
        setTimeout(() => replay(tap), 520);
        delay = 900;
      } else {
        replay(tap);
        delay = 300;
      }
      pending.current = setTimeout(() => {
        pending.current = null;
        commit(i, prev, fwd);
      }, delay);
    },
    [commit, mo],
  );

  // Which beat owns the middle of the screen. Plain geometry rather than an
  // IntersectionObserver: the markers are pulled under a sticky stage with a
  // negative margin, and observers were not reporting them reliably there.
  const frame = useCallback(() => {
    const el = root.current;
    if (!el) return;
    const mid = window.innerHeight / 2;
    let best = -1;
    for (let i = 0; i < markers.current.length; i++) {
      const r = markers.current[i]?.getBoundingClientRect();
      if (r && r.top <= mid && r.bottom > mid) {
        best = i;
        break;
      }
    }
    if (best === -1) {
      const box = el.getBoundingClientRect();
      if (box.bottom <= mid) best = markers.current.length - 1;
      else if (box.top >= mid) best = 0;
    }
    setActive(best);

    if (reduce.current) return;

    // A slow drift over the whole story — deliberately a different speed from
    // the per-beat text, so the two never read as the same movement.
    const b = el.getBoundingClientRect();
    let q = (window.innerHeight - b.top) / (window.innerHeight + b.height);
    q = Math.max(0, Math.min(1, q));
    // Vertical only — a rotation here read as the phone being tilted.
    if (wrap.current) wrap.current.style.transform = `translateY(${(14 - q * 28).toFixed(1)}px)`;

    // Tall captures scroll inside the phone.
    shots.current.forEach((img, i) => {
      const m = mo[i];
      if (!img || !m?.pan) return;
      const mk = markers.current[i];
      if (!mk) return;
      const mr = mk.getBoundingClientRect();
      let p = (window.innerHeight - mr.top) / (window.innerHeight + mr.height);
      p = Math.max(0, Math.min(1, p));
      // A hold is a dead zone at the START of the beat: the screen sits still
      // long enough to be read, then the remaining scroll does the whole pan.
      const hold = m.hold || 0;
      if (hold > 0 && hold < 1) p = p <= hold ? 0 : (p - hold) / (1 - hold);
      const [from, to] = m.pan;
      // `to` past 1 means: reach the bottom early, then rest there.
      const frac = Math.min(1, from + (to - from) * p);
      const parent = img.parentElement;
      const travel = img.offsetHeight - (parent ? parent.offsetHeight : 0);
      if (travel > 0) img.style.transform = `translateY(${-(frac * travel).toFixed(1)}px)`;
    });
  }, [mo, setActive]);

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        frame();
        ticking = false;
      });
    };
    // Listen in the capture phase on document: if any ancestor ends up being
    // the scrolling box, scroll events fire there and never reach window.
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("load", frame);
    frame();
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("load", frame);
      if (pending.current) clearTimeout(pending.current);
      if (cleanup.current) clearTimeout(cleanup.current);
    };
  }, [frame]);

  // Scroll the page so a given beat sits in the middle. Everything else follows
  // from that, so navigation and scrolling can never disagree.
  const goTo = (i: number) => {
    const m = markers.current[i];
    if (!m) return;
    const r = m.getBoundingClientRect();
    const y = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: y, behavior: reduce.current ? "auto" : "smooth" });
  };
  const n = beats.length;
  const advance = () => goTo((current.current + 1) % n);
  const retreat = () => goTo((current.current - 1 + n) % n);
  const onPhoneKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      advance();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      retreat();
    }
  };

  const accentVar = { "--sa": `var(--color-l-${accent})` } as CSSProperties;

  return (
    <div ref={root} className="ls-story" id={id} data-story={id} style={accentVar}>
      <div ref={stage} className="ls-stage">
        {/* the rail */}
        <div className="ls-rail" role="group" aria-label="Steps">
          {beats.map((b, i) => (
            <button
              key={b.id}
              ref={(el) => {
                dots.current[i] = el;
              }}
              type="button"
              className={`ls-dot${i === 0 ? " ls-on" : ""}`}
              aria-label={`Go to step ${i + 1}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {/* the words */}
        <div className="ls-copy">
          {beats.map((b, i) => (
            <div
              key={b.id}
              ref={(el) => {
                beatEls.current[i] = el;
              }}
              className={`ls-beat${i === 0 ? " ls-on" : ""}`}
            >
              <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-(--sa) max-lg:text-[10px]">
                {b.kicker}
              </div>
              <h2 className="font-display text-[clamp(34px,4.6vw,56px)] font-normal leading-[1.04] tracking-[-0.015em] text-balance text-l-text max-lg:text-[clamp(27px,7.4vw,36px)]">
                {b.head}
                {b.headEm && <em className="mt-1.5 block italic text-(--sa)">{b.headEm}</em>}
              </h2>
              {b.sub && (
                <p className="max-w-[40ch] text-[17px] leading-[1.6] tracking-[-0.01em] text-l-text-2 max-lg:max-w-[34ch] max-lg:text-[14px] max-lg:leading-[1.5]">
                  {b.sub}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* the phone */}
        <div ref={phoneCol} className="ls-phone-col">
          <div ref={wrap} className="ls-phone-wrap">
            <Phone
              ref={phoneEl}
              className="ls-phone w-[min(360px,48svh,86vw)] cursor-pointer max-lg:w-[min(84vw,(100svh_-_230px)*0.55)]"
              data-story-phone={id}
              role="button"
              tabIndex={0}
              aria-label="Next step"
              onClick={advance}
              onKeyDown={onPhoneKey}
            >
              <div ref={shotsBox} className="ls-shots">
                {beats.map((b, i) => {
                  const m = mo[i];
                  const size = shotSize[b.shot] || { w: 900, h: 1480 };
                  return (
                    <div
                      key={b.id}
                      ref={(el) => {
                        frames.current[i] = el;
                      }}
                      className={`ls-frame${i === 0 ? " ls-on" : ""}`}
                      data-i={i}
                      data-enter={m.enter || "fade"}
                    >
                      <Image
                        ref={(el) => {
                          shots.current[i] = el;
                        }}
                        src={`/landing/${b.shot}`}
                        alt=""
                        width={size.w}
                        height={size.h}
                        sizes="(max-width: 1023px) 84vw, 360px"
                        loading={i === 0 ? "eager" : "lazy"}
                        className={`ls-shot${m.pan ? " ls-tall" : ""}`}
                      />
                    </div>
                  );
                })}
                {/* the taps that caused each arrival, drawn over the screen being left */}
                {beats.map((b, i) => {
                  const m = mo[i];
                  if (!m.tap) return null;
                  const pos = { left: `${m.tap[0]}%`, top: `${m.tap[1]}%` };
                  return (
                    <span key={b.id}>
                      <span
                        ref={(el) => {
                          taps.current[i] = el;
                        }}
                        className="ls-tap"
                        style={pos}
                      />
                      {m.pointer && (
                        <span
                          ref={(el) => {
                            pointers.current[i] = el;
                          }}
                          className="ls-pointer"
                          style={pos}
                        >
                          <svg viewBox="0 0 24 24" width="22" height="22">
                            <path
                              d="M5 2 L19 12.5 L12.6 13.8 L16 21 L13.2 22.2 L9.9 15.1 L5.4 19.6 Z"
                              className="fill-l-phone-screen stroke-l-phone-ink"
                              strokeWidth="1.2"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </Phone>

            {/* the labels pointing into the phone */}
            {beats.map((b, i) =>
              b.ann.map((a, k) => (
                <div
                  key={`${b.id}-${k}`}
                  className={`ls-ann ls-ann-${a.side}${i === 0 ? " ls-on" : ""}`}
                  data-i={i}
                  style={{ top: `${a.top}%` }}
                >
                  {a.side === "left" ? (
                    <>
                      <span>{a.text}</span>
                      <span className="ls-ann-line" />
                    </>
                  ) : (
                    <>
                      <span className="ls-ann-line" />
                      <span>{a.text}</span>
                    </>
                  )}
                </div>
              )),
            )}
          </div>
        </div>
      </div>

      {/* the scroll markers, one per beat, under the sticky stage */}
      <div className="ls-markers">
        {beats.map((b, i) => (
          <div
            key={b.id}
            ref={(el) => {
              markers.current[i] = el;
            }}
            className={`ls-marker${mo[i].pan ? " ls-pan" : ""}`}
            data-i={i}
          />
        ))}
      </div>
    </div>
  );
}
