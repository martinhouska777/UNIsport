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
  crimson with the two white wedges — from lib/landingSchools.ts, drawn by
  OarMark (shared with the Varsity Mode mark, VarsityCrest). 250px tall here.
*/
import { useEffect, useState } from "react";
import VarsityShield from "@/components/varsity/VarsityShield";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import OarMark from "@/components/varsity/OarMark";

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
              <OarMark schoolKey={universityKey} width={41} height={250} />
            </div>
          </div>
        </div>

        {/* Right oar: slides in from the right, mirrored angle → forms the X. */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="v-oar-in-right">
            <div className="origin-center rotate-[32deg]">
              <OarMark schoolKey={universityKey} width={41} height={250} />
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
