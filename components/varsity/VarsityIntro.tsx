"use client";

/*
  VARSITY MODE INTRO — a one-shot title sequence played when you enter Varsity
  Mode. Two oars sweep in from the sides and cross in the middle; the crest then
  drops from the top onto the crossing point; the whole overlay fades to reveal
  the Home screen.

  Plays on layout mount (i.e. on entering Varsity Mode or a page reload), not on
  every tab switch. Disabled entirely under prefers-reduced-motion.

  SWAP POINT: <IntroOar /> below is a placeholder vector oar. To use a real oar
  image, replace its <svg> with <img src="/varsity/oar.png" .../> — the slide +
  cross motion lives on the wrappers and stays exactly the same.
*/
import { useEffect, useState } from "react";
import VarsityShield from "@/components/varsity/VarsityShield";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";

// Placeholder oar: blade at the top, long shaft below. Colors are theme tokens
// (crimson primary, white contrast) so it re-skins with the theme (rule 1).
function IntroOar() {
  return (
    <svg
      width="30"
      height="250"
      viewBox="0 0 30 250"
      fill="none"
      aria-hidden="true"
    >
      {/* shaft */}
      <rect x="12.5" y="62" width="5" height="186" rx="2.5" fill="var(--primary)" />
      {/* blade */}
      <rect x="3" y="2" width="24" height="68" rx="10" fill="var(--primary)" />
      {/* white chevron on the blade */}
      <path
        d="M6 26 L15 38 L24 26 L24 34 L15 46 L6 34 Z"
        fill="var(--primary-contrast)"
      />
    </svg>
  );
}

export default function VarsityIntro() {
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState(false);
  // The motto is the UNIVERSITY's, not Varsity Mode's, so it comes from the
  // same theme data every school will eventually have a row in (rule 2).
  const { universityKey } = useAppState();
  const motto = getUniversity(universityKey)?.motto;

  useEffect(() => {
    // Respect the OS "reduce motion" setting: skip the intro outright.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDone(true);
      return;
    }
    // The motto lands at ~1.95s; hold it a beat before fading the whole thing.
    const fade = setTimeout(() => setLeaving(true), 2250); // start fade-out
    const end = setTimeout(() => setDone(true), 2800); // unmount after fade
    return () => {
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, []);

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
              <IntroOar />
            </div>
          </div>
        </div>

        {/* Right oar: slides in from the right, mirrored angle → forms the X. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="v-oar-in-right">
            <div className="origin-center rotate-[32deg]">
              <IntroOar />
            </div>
          </div>
        </div>

        {/* Crest drops from the top onto the crossing point. */}
        <div className="absolute inset-x-0 top-[86px] flex justify-center">
          <div className="v-crest-drop">
            <VarsityShield size={92} />
          </div>
        </div>

        {/* The motto, sliding in under the crest. `text` is the token that
            flips with the background — off-white on the dark theme, near-black
            on the light one — so the words read either way without either
            colour being written here. The words themselves come from the
            university's data; a school with no motto has no line at all. */}
        {motto && (
          <div className="absolute inset-x-0 top-[196px] flex justify-center">
            <div
              className="v-motto-in whitespace-nowrap text-[15px] font-semibold uppercase text-text"
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
