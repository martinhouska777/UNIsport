"use client";

import Image from "next/image";
import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import Phone from "@/components/landing/Phone";
import { useCloserGate } from "@/components/landing/useCloserGate";
import type { CloserHandle } from "@/components/landing/closer";
import { closers } from "@/lib/landingCopy";
import { BLADE_PATH, OAR_ART, schools, rgba } from "@/lib/landingSchools";

/*
  BLADE LOCK — the closer of the varsity story.

  Ported natively from the "Blade Lock Light" design piece: the words, then
  the varsity phone with EIGHT ROWING OARS fanned behind it on a slowly turning
  wheel, and the crew's name under it. Whichever blade is at the front is the
  crew showing — its colour runs through the headline, the phone's tab bar and
  the label. A click on a blade turns the wheel to it and holds; it lets go
  once the section has scrolled out of view.

  Inside the phone is the REAL Varsity Home, recoloured (and its header
  renamed) per school — the same captures the artifact's closer shows. That
  capture stops above the app's tab bar, so the bar is drawn here, as the
  artifact drew it: Home · Calendar · + · Team · Profile, in the crew's colour.

  The wheel is the piece's own maths, untouched: 45° per oar, a 295px radius,
  the same scale / fade / depth curves. It runs on requestAnimationFrame and
  writes the oars' styles directly (a re-render per frame would be absurd);
  React only hears about it when the FRONT oar changes. The blade glow the
  piece drew was removed in the artifact (cb4a72c) and is not drawn here.

  ARRIVAL, under StoryCloser (`managed`): the oars start PARKED — hidden
  behind the phone, shrunk to nothing. When the phone has set down, just the
  blades rise into view above it, close together, already in formation (the
  whole wheel compressed toward its centre, Harvard's blade in the middle,
  peeking ~90px above the phone); hold a beat; then spread out onto a wheel
  that has already started turning, so they arrive into motion. The crew's
  name appears once they are in their places. The way back is the same film
  reversed: the wheel holds, the blades gather into the formation and sink
  behind the phone. All of it is one blend inside the wheel's own frame
  function — no CSS transitions on transform, which the wheel rewrites every
  frame. (The artifact had to MEASURE this pose through the iframe; here the
  geometry is ours, so it is computed.)

  Like the campus closer: the wheel only turns while on screen, opens on
  Harvard, and resets to Harvard on leaving. Reduced motion: a still wheel,
  Harvard at the front; clicking a blade jumps straight to it.

  Like the piece it is one screen tall with the content centred; the stage is
  a touch shorter than the piece's (560 vs 660) so the whole thing, label
  included, fits a 900px laptop without the piece's page-zoom. The phone is
  the piece's 272px. Below ~700px wide the outermost oars run off the sides,
  exactly as they do in the piece — the phone stays readable, the wheel is
  the decoration.
*/

const PERIOD_MS = 2600;
const STEP = 45; // degrees between oars
const RADIUS = 295;
const STAGE_H = 560;
const WHEEL_TOP = 220; // the wheel's centre, from the top of the stage
const OAR_W = 78;
const OAR_H = 468;
// the small formation: the wheel compressed toward its centre (F), smaller (K)
const FORM_K = 0.4;
const FORM_F = 0.3;
const PEEK = 90; // how far the topmost blade shows above the phone
const PARK_SCALE = 0.3;

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/* The app's varsity tab bar — five slots, the centre one is the log button. */
const VARSITY_TABS: { label: string; d: string }[] = [
  { label: "Home", d: "M4 11l8-6 8 6v8h-5v-5H9v5H4z" },
  { label: "Calendar", d: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" },
  { label: "", d: "" },
  {
    label: "Team",
    d: "M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-4.5 6-4.5S15 16 15 19M17 10a2.5 2.5 0 1 0 0-5M16 14c3 0 5 1.5 5 4",
  },
  { label: "Profile", d: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6" },
];

/* One oar: the piece's drawing. Handle, shaft, collar; then the blade,
   clipped to the blade shape — base coat, the crew's marks, a shade that the
   wheel fades in as the blade turns away — and its outline. */
function Oar({ i }: { i: number }) {
  const s = schools[i];
  const clip = `l-blade-${s.key}`;
  return (
    <svg viewBox="0 0 980 160" className="block h-auto w-full overflow-visible" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={BLADE_PATH} />
        </clipPath>
      </defs>
      <g>
        <rect x="2" y="72" width="150" height="16" rx="6" fill={OAR_ART.handle} stroke={OAR_ART.line} strokeWidth="1" />
        <rect x="146" y="75" width="642" height="10" rx="4" fill={OAR_ART.shaft} stroke={OAR_ART.line} strokeWidth="1" />
        <rect x="784" y="67" width="22" height="26" rx="3" fill={OAR_ART.collar} stroke={OAR_ART.line} strokeWidth="1" />
      </g>
      <g transform="translate(280,0) translate(700,95) scale(1.30) translate(-700,-95)">
        <g clipPath={`url(#${clip})`}>
          <rect x="518" y="44" width="188" height="100" fill={s.blade.base} />
          {s.blade.marks.map((m, k) =>
            m.kind === "polygon" ? (
              <polygon key={k} points={m.points} fill={m.fill} />
            ) : m.kind === "path" ? (
              <path key={k} d={m.d} fill={m.fill} />
            ) : m.kind === "rect" ? (
              <rect key={k} x={m.x} y={m.y} width={m.w} height={m.h} fill={m.fill} />
            ) : (
              <circle key={k} cx={m.cx} cy={m.cy} r={m.r} fill={m.fill} />
            ),
          )}
          <rect data-dim x="518" y="44" width="188" height="100" fill={OAR_ART.shade} opacity="0" />
        </g>
        <path d={BLADE_PATH} fill="none" stroke={OAR_ART.outline} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/** A value gliding from where it is to a target over `ms`, read per frame. */
type Glide = { from: number; to: number; t0: number; ms: number };
const glideAt = (g: Glide, now: number) =>
  g.ms <= 0 ? g.to : g.from + (g.to - g.from) * easeOut(Math.min(1, (now - g.t0) / g.ms));

export default function BladeLock({
  id,
  managed = false,
  pinned = false,
  ref,
}: {
  id?: string;
  /** Under StoryCloser: arrival is the flow's to play, the wheel waits for it. */
  managed?: boolean;
  /** A little taller than one screen, sticky inside — the flight lands here. */
  pinned?: boolean;
  ref?: Ref<CloserHandle>;
}) {
  const [active, setActive] = useState(0);
  const [held, setHeld] = useState(false);
  const [phone, setPhone] = useState<"hide" | "pre" | "in">("in");
  const [wordsPre, setWordsPre] = useState(false);
  const [labelPre, setLabelPre] = useState(false);

  const stick = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const phoneEl = useRef<HTMLDivElement>(null);
  const oars = useRef<(HTMLButtonElement | null)[]>([]);
  const rot = useRef(0);
  const pinRot = useRef(0);
  const heldRef = useRef(managed); // the wheel holds until the flow lets go
  const activeRef = useRef(0);
  // the pose: 1 = fully parked behind the phone / fully in the small formation
  const park = useRef<Glide>({ from: managed ? 1 : 0, to: managed ? 1 : 0, t0: 0, ms: 0 });
  const form = useRef<Glide>({ from: managed ? 1 : 0, to: managed ? 1 : 0, t0: 0, ms: 0 });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /* Place every oar for the current rotation and pose. Pure DOM writes. */
  const renderFrame = useCallback(() => {
    const now = performance.now();
    const k = glideAt(park.current, now); // 0 free … 1 parked
    const m = glideAt(form.current, now); // 0 spread … 1 formation
    // the phone, in stage coordinates relative to the wheel's centre
    const sr = stage.current?.getBoundingClientRect();
    const pr = phoneEl.current?.getBoundingClientRect();
    const phoneTop = sr && pr ? pr.top - sr.top - WHEEL_TOP : STAGE_H - 486 - WHEEL_TOP;
    const phoneMidY = sr && pr ? phoneTop + pr.height / 2 : phoneTop + 243;

    // first pass: the wheel
    const full: { x: number; y: number; s: number; d: number }[] = [];
    let best = 0;
    let bestD = -2;
    for (let i = 0; i < schools.length; i++) {
      const a = ((i * STEP + rot.current) * Math.PI) / 180;
      const d = Math.cos(a); // 1 = front, -1 = back
      full.push({
        x: Math.sin(a) * RADIUS,
        y: -(1 - d) * 20,
        s: 0.5 + 0.58 * Math.pow((d + 1) / 2, 1.35),
        d,
      });
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    // the formation: same wheel, compressed toward its centre, and lifted so
    // the topmost blade peeks PEEK px above the phone
    let minTop = Infinity;
    full.forEach((o) => {
      minTop = Math.min(minTop, FORM_F * o.y - (OAR_H * o.s * FORM_K) / 2);
    });
    const dy = phoneTop - PEEK - minTop;

    for (let i = 0; i < schools.length; i++) {
      const btn = oars.current[i];
      if (!btn) continue;
      const o = full[i];
      // blend: full → formation (m) → parked (k)
      let x = o.x + (FORM_F * o.x - o.x) * m;
      let y = o.y + (FORM_F * o.y + dy - o.y) * m;
      let s = o.s + (o.s * FORM_K - o.s) * m;
      x += (0 - x) * k;
      y += (phoneMidY - y) * k;
      s += (PARK_SCALE - s) * k;
      const op = (0.62 + (0.38 * (o.d + 1)) / 2) * (1 - k);
      btn.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
      btn.style.opacity = op.toFixed(3);
      btn.style.zIndex = String(40 + Math.round(o.d * 40));
      const dim = btn.querySelector<SVGRectElement>("[data-dim]");
      if (dim) dim.setAttribute("opacity", ((1 - Math.max(0, Math.min(1, (o.d + 0.3) / 0.6))) * 0.22).toFixed(3));
    }
    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, []);

  const toHarvard = useCallback(() => {
    rot.current = 0;
    pinRot.current = 0;
    heldRef.current = managed;
    setHeld(false);
    renderFrame();
  }, [managed, renderFrame]);

  const { ref: sectionRef, inView, reduced } = useCloserGate(toHarvard);

  /* First paint, and whenever the wheel is not running: place the oars once. */
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  /* The wheel. Turns one oar per PERIOD while free; eases onto the picked
     oar while held. Only runs on screen and without reduced motion. */
  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      if (heldRef.current) {
        const diff = pinRot.current - rot.current;
        if (Math.abs(diff) > 0.05) rot.current += diff * Math.min(1, dt * 0.005);
        else rot.current = pinRot.current;
      } else {
        rot.current -= (dt * STEP) / PERIOD_MS;
      }
      renderFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, renderFrame]);

  const pick = (i: number) => {
    const base = -i * STEP;
    const diff = ((((base - rot.current) % 360) + 540) % 360) - 180;
    pinRot.current = rot.current + diff;
    heldRef.current = true;
    setHeld(true);
    if (reduced || !inView) {
      rot.current = pinRot.current;
      renderFrame();
    }
  };

  const setPose = (which: "park" | "form", to: number, ms: number) => {
    const g = which === "park" ? park : form;
    const now = performance.now();
    g.current = { from: glideAt(g.current, now), to, t0: now, ms: reduced ? 0 : ms };
  };

  // The oars, as drawn: hidden behind the phone; when it settles, just the
  // BLADES rise into view above it — close together, already in formation —
  // hold a beat, then spread out to their places in the arc.
  const playOars = (delay: number) => {
    later(() => setPose("park", 0, 800), delay);
    // The rise takes .8s; the formation then HOLDS for a beat before spreading.
    later(() => {
      // The wheel is released the moment the spread BEGINS: the blades glide
      // out onto a wheel already turning, and arrive into motion.
      heldRef.current = false;
      setPose("form", 0, 800);
      later(() => setLabelPre(false), 850); // the crew's name, once they are in place
    }, delay + 1150);
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
      toHarvard();
      heldRef.current = true; // the wheel waits, Harvard in front
      if (reduced) return;
      setPhone(mode);
      setWordsPre(true);
      setLabelPre(true);
      setPose("park", 1, 0);
      setPose("form", 1, 0);
      renderFrame();
    },
    arriveAfterFlight: () => {
      setPhone("in");
      later(() => setWordsPre(false), 220);
      playOars(240); // peek, hold, then spread onto the turning wheel
    },
    arriveInPlace: () => {
      setPhone("pre");
      later(() => setPhone("in"), 30);
      later(() => setWordsPre(false), 320);
      playOars(700); // after the phone's own entrance
    },
    retract: () =>
      new Promise<void>((resolve) => {
        clearTimers();
        setWordsPre(true);
        setLabelPre(true);
        // hold the wheel still on whichever crew it is showing — the gather
        // needs a formation that stands where it was measured
        pinRot.current = rot.current;
        heldRef.current = true;
        setPose("form", 1, 600); // gather off the arc into the formation…
        later(() => setPose("park", 1, 550), 650); // …and down behind the phone
        later(resolve, 1200);
      }),
    setPhoneHidden: (h) => setPhone(h ? "hide" : "in"),
    rewind: () => {
      clearTimers();
      toHarvard();
      heldRef.current = true;
      if (reduced) return;
      setPhone("hide");
      setWordsPre(true);
      setLabelPre(true);
      setPose("park", 1, 0);
      setPose("form", 1, 0);
      renderFrame();
    },
  }));

  const s = schools[active];
  const copy = closers.blades;
  const ct = "transition-colors duration-[600ms] ease-in-out motion-reduce:transition-none";

  return (
    <section
      ref={sectionRef}
      id={id}
      data-closer="blades"
      data-held={held || undefined}
      className={`lc-closer relative z-[1] scroll-mt-20 border-t border-l-border ${pinned ? "lc-pinned" : ""}`}
    >
      <div
        ref={stick}
        className="lc-stick flex min-h-svh flex-col items-center justify-center overflow-hidden px-6 py-10 sm:px-8"
      >
        {/* ── The words ── */}
        <div className={`lc-words mb-10 max-w-[640px] text-center ${wordsPre ? "lc-pre" : ""}`}>
          <p className="font-display text-[clamp(14px,1.8vw,17px)] text-l-text-2">{copy.leadIn}</p>
          <h2 className="mt-1 mb-1.5 font-display text-[clamp(32px,4.2vw,52px)] font-normal leading-[1.05] tracking-tight text-balance text-l-text">
            {copy.headline}{" "}
            <em
              className={`italic brightness-[1.3] ${ct} transition-[color,text-shadow]`}
              style={{ color: s.ink, textShadow: `0 0 18px ${rgba(s.ink, 0.6)}` }}
            >
              {copy.headlineEm}
            </em>
          </h2>
          <p className="mx-auto max-w-[52ch] text-[clamp(14px,1.5vw,16px)] leading-[1.45] text-pretty text-l-text-2">
            {copy.sub}
          </p>
        </div>

        {/* ── The stage: the wheel of oars, the phone in front of it ── */}
        <div ref={stage} className="relative w-full max-w-[860px] flex-none" style={{ height: STAGE_H }}>
          {schools.map((sc, i) => (
            <button
              key={sc.key}
              ref={(el) => {
                oars.current[i] = el;
              }}
              type="button"
              aria-label={`${sc.name} ${copy.label}`}
              aria-pressed={held && i === active}
              onClick={() => pick(i)}
              className="absolute left-1/2 cursor-pointer rounded-lg border-0 bg-transparent p-0 opacity-0 will-change-transform focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-l-text"
              style={{ top: WHEEL_TOP, width: OAR_W, height: OAR_H }}
            >
              {/* the oar is drawn lying down and stood up here, blade at the top */}
              <span
                className="absolute top-1/2 left-1/2 block -translate-x-1/2 -translate-y-1/2 -rotate-90"
                style={{ width: OAR_H, height: OAR_W }}
              >
                <Oar i={i} />
              </span>
            </button>
          ))}

          <Phone
            ref={phoneEl}
            className={`lc-phone absolute bottom-0 left-1/2 z-[100] w-[272px] -translate-x-1/2 ${
              phone === "hide" ? "lc-hide" : phone === "pre" ? "lc-pre" : ""
            }`}
            data-closer-phone="blades"
          >
            <div className="relative aspect-[900/1480] overflow-hidden bg-l-phone-screen">
              {schools.map((sc, i) => (
                <Image
                  key={sc.key}
                  src={`/landing/closers/vhome-${sc.key}.webp`}
                  alt={`Varsity Home in ${sc.name}'s colours`}
                  fill
                  sizes="272px"
                  loading={i === 0 ? "eager" : "lazy"}
                  aria-hidden={i !== active}
                  className="object-fill transition-opacity duration-[450ms] ease-in-out motion-reduce:transition-none"
                  style={{ opacity: i === active ? 1 : 0 }}
                />
              ))}
              {/* the app's tab bar, which the capture stops above */}
              <div
                aria-hidden
                className="absolute inset-x-0 bottom-0 z-[2] flex h-[12%] items-center justify-around border-t border-l-phone-line bg-l-phone-screen pb-[1.6%]"
              >
                {VARSITY_TABS.map((t, i) =>
                  t.label ? (
                    <span
                      key={t.label}
                      className={`flex flex-col items-center gap-[2px] leading-none text-l-phone-ink-2 ${ct}`}
                      style={i === 0 ? { color: s.ink } : undefined}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="h-[5.5cqw] w-[5.5cqw]"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d={t.d} />
                      </svg>
                      <b className="font-sans text-[2.4cqw] font-semibold tracking-[0.02em]">{t.label}</b>
                    </span>
                  ) : (
                    <span
                      key="plus"
                      className={`-mt-[8%] flex aspect-square w-[16%] items-center justify-center rounded-full text-l-phone-screen shadow-md ring-[5px] ring-l-phone-screen/90 ${ct} transition-[background-color]`}
                      style={{ background: s.ink }}
                    >
                      <svg viewBox="0 0 24 24" className="h-[48%] w-[48%]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <path d="M12 4v16M4 12h16" />
                      </svg>
                    </span>
                  ),
                )}
              </div>
            </div>
          </Phone>
        </div>

        {/* ── The crew's name ── */}
        <div
          className={`lc-label pt-3 font-mono text-[17px] font-bold tracking-[5px] uppercase brightness-[1.35] saturate-[1.1] ${labelPre ? "lc-pre" : ""}`}
          style={{ color: s.ink, textShadow: `0 0 14px ${rgba(s.ink, 0.9)}, 0 0 34px ${rgba(s.ink, 0.55)}` }}
        >
          {s.name} {copy.label}
        </div>
      </div>
    </section>
  );
}
