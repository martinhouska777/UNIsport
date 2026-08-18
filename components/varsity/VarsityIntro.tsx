"use client";

/*
  VARSITY MODE INTRO — a one-shot title sequence played when you enter Varsity
  Mode. Two oars sweep in from the sides and cross in the middle; the crest then
  drops from the top onto the crossing point; the whole overlay fades to reveal
  the Home screen.

  Plays on layout mount (i.e. on entering Varsity Mode or a page reload), not on
  every tab switch. Disabled entirely under prefers-reduced-motion.

  The oars are the landing page's oars (the Blade Lock closer's drawing): a
  dark handle, shaft and collar, and the school's own blade — Harvard's
  crimson with the two white wedges — from lib/landingSchools.ts. Same
  data, same shape, stood upright here. The oar's colours are that data
  file's illustration colours applied inline (rule 1's content exception),
  so a school without a blade drawing falls back to the theme's primary.
*/
import { useEffect, useState } from "react";
import VarsityShield from "@/components/varsity/VarsityShield";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import { BLADE_PATH, OAR_ART, schools } from "@/lib/landingSchools";

/*
  One oar, blade at the top. The landing draws it lying down in a 980×160 box
  (handle at x=0, blade tip at x=980); here the box is turned upright, so
  the same rects and paths render tip-up. 250px tall like the placeholder it
  replaces, so the crossing, the crest and the motto sit where they did.
*/
function IntroOar({ schoolKey, side }: { schoolKey: string; side: "l" | "r" }) {
  const s = schools.find((x) => x.key === schoolKey);
  const clip = `v-intro-blade-${side}-${schoolKey}`; // one id per oar
  return (
    <svg width="41" height="250" viewBox="0 0 160 980" fill="none" aria-hidden="true">
      <defs>
        <clipPath id={clip}>
          <path d={BLADE_PATH} />
        </clipPath>
      </defs>
      {/* lying-down coordinates → upright: (x, y) ↦ (y, 980 − x) */}
      <g transform="translate(0,980) rotate(-90)">
        <rect x="2" y="72" width="150" height="16" rx="6" fill={OAR_ART.handle} stroke={OAR_ART.line} strokeWidth="1" />
        <rect x="146" y="75" width="642" height="10" rx="4" fill={OAR_ART.shaft} stroke={OAR_ART.line} strokeWidth="1" />
        <rect x="784" y="67" width="22" height="26" rx="3" fill={OAR_ART.collar} stroke={OAR_ART.line} strokeWidth="1" />
        <g transform="translate(280,0) translate(700,95) scale(1.30) translate(-700,-95)">
          {s ? (
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
            </g>
          ) : (
            <path d={BLADE_PATH} fill="var(--primary)" />
          )}
          <path d={BLADE_PATH} fill="none" stroke={OAR_ART.outline} strokeWidth="1.5" />
        </g>
      </g>
    </svg>
  );
}

export default function VarsityIntro() {
  const [leaving, setLeaving] = useState(false);
  // Respect the OS "reduce motion" setting: skip the intro outright. Decided
  // once, at mount — the varsity layout only renders this on the client (it
  // waits for the app state), so reading matchMedia here is safe.
  const [done, setDone] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  // The motto is the UNIVERSITY's, not Varsity Mode's, so it comes from the
  // same theme data every school will eventually have a row in (rule 2).
  const { universityKey } = useAppState();
  const motto = getUniversity(universityKey)?.motto;

  useEffect(() => {
    if (done) return;
    // The motto lands at ~1.95s; hold it a beat before fading the whole thing.
    const fade = setTimeout(() => setLeaving(true), 2250); // start fade-out
    const end = setTimeout(() => setDone(true), 2800); // unmount after fade
    return () => {
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, [done]);

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      className={`absolute inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative h-[320px] w-[320px]">
        {/* Left oar: slides in from the left, held at a fixed cross angle. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="v-oar-in-left">
            <div className="origin-center rotate-[-32deg]">
              <IntroOar schoolKey={universityKey} side="l" />
            </div>
          </div>
        </div>

        {/* Right oar: slides in from the right, mirrored angle → forms the X. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="v-oar-in-right">
            <div className="origin-center rotate-[32deg]">
              <IntroOar schoolKey={universityKey} side="r" />
            </div>
          </div>
        </div>

        {/* Crest drops from the top onto the crossing point. */}
        <div className="absolute inset-x-0 top-[86px] flex justify-center">
          <div className="v-crest-drop">
            <VarsityShield size={92} />
          </div>
        </div>

        {/* The motto, sliding in under the crest — bold, 17px, so it reads on
            the light ground too (the owner found 15px semibold too faint there).
            `text` is the token that
            flips with the background — off-white on the dark theme, near-black
            on the light one — so the words read either way without either
            colour being written here. The words themselves come from the
            university's data; a school with no motto has no line at all. */}
        {motto && (
          <div className="absolute inset-x-0 top-[196px] flex justify-center">
            <div
              className="v-motto-in whitespace-nowrap text-[17px] font-bold uppercase text-text"
              // The trailing letter's spacing would push the word off-centre;
              // this pays it back. Matches the tracking the animation ends on.
              style={{ textIndent: "0.38em" }}
            >
              {motto}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
