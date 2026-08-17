"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import Phone from "@/components/landing/Phone";
import { useCloserGate } from "@/components/landing/useCloserGate";
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

export default function BladeLock({ id }: { id?: string }) {
  const [active, setActive] = useState(0);
  const [pinned, setPinned] = useState(false);

  const oars = useRef<(HTMLButtonElement | null)[]>([]);
  const rot = useRef(0);
  const pinRot = useRef(0);
  const pinnedRef = useRef(false);
  const activeRef = useRef(0);

  /* Place every oar for the current rotation. Pure DOM writes. */
  const renderFrame = useCallback(() => {
    let best = 0;
    let bestD = -2;
    for (let i = 0; i < schools.length; i++) {
      const btn = oars.current[i];
      if (!btn) continue;
      const a = ((i * STEP + rot.current) * Math.PI) / 180;
      const d = Math.cos(a); // 1 = front, -1 = back
      const x = Math.sin(a) * RADIUS;
      const y = -(1 - d) * 20;
      const s = 0.5 + 0.58 * Math.pow((d + 1) / 2, 1.35);
      btn.style.transform = `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(3)})`;
      btn.style.opacity = (0.62 + (0.38 * (d + 1)) / 2).toFixed(3);
      btn.style.zIndex = String(40 + Math.round(d * 40));
      const dim = btn.querySelector<SVGRectElement>("[data-dim]");
      if (dim) dim.setAttribute("opacity", ((1 - Math.max(0, Math.min(1, (d + 0.3) / 0.6))) * 0.22).toFixed(3));
      if (d > bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best !== activeRef.current) {
      activeRef.current = best;
      setActive(best);
    }
  }, []);

  const reset = useCallback(() => {
    pinnedRef.current = false;
    setPinned(false);
    rot.current = 0;
    pinRot.current = 0;
    renderFrame();
  }, [renderFrame]);

  const { ref, inView, reduced } = useCloserGate(reset);

  /* First paint, and whenever the wheel is not running: place the oars once. */
  useEffect(() => {
    renderFrame();
  }, [renderFrame]);

  /* The wheel. Turns one oar per PERIOD while free; eases onto the picked
     oar while pinned. Only runs on screen and without reduced motion. */
  useEffect(() => {
    if (!inView || reduced) return;
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - last);
      last = t;
      if (pinnedRef.current) {
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
    pinnedRef.current = true;
    setPinned(true);
    if (reduced || !inView) {
      rot.current = pinRot.current;
      renderFrame();
    }
  };

  const s = schools[active];
  const copy = closers.blades;
  const ct = "transition-colors duration-[600ms] ease-in-out motion-reduce:transition-none";

  return (
    <section
      ref={ref}
      id={id}
      data-closer="blades"
      data-pinned={pinned || undefined}
      className="relative z-[1] flex min-h-svh scroll-mt-20 flex-col items-center justify-center overflow-hidden border-t border-l-border px-6 py-10 sm:px-8"
    >
      {/* ── The words ── */}
      <div className="mb-10 max-w-[640px] text-center">
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
      <div className="relative w-full max-w-[860px] flex-none" style={{ height: STAGE_H }}>
        {schools.map((sc, i) => (
          <button
            key={sc.key}
            ref={(el) => {
              oars.current[i] = el;
            }}
            type="button"
            aria-label={`${sc.name} ${copy.label}`}
            aria-pressed={pinned && i === active}
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
          className="absolute bottom-0 left-1/2 z-[100] w-[272px] -translate-x-1/2"
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
        className={`pt-3 font-mono text-[17px] font-bold tracking-[5px] uppercase brightness-[1.35] saturate-[1.1] ${ct} transition-[color,text-shadow]`}
        style={{ color: s.ink, textShadow: `0 0 14px ${rgba(s.ink, 0.9)}, 0 0 34px ${rgba(s.ink, 0.55)}` }}
      >
        {s.name} {copy.label}
      </div>
    </section>
  );
}
