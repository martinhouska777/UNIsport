"use client";

/*
  VARSITY MODE INTRO — a one-shot title sequence played when you enter Varsity
  Mode. Two oars sweep in from the sides and cross in the middle; the crest then
  drops from the top onto the crossing point; the whole overlay fades to reveal
  the Home screen.

  Plays ONLY on the switch into Varsity Mode from the normal app — not on every
  tab switch, and not when you come back from a mode-neutral screen such as
  Settings (which lives outside this layout, so returning re-mounts this).
  Which mode you are in is remembered in lib/varsity/mode.ts. Disabled entirely
  under prefers-reduced-motion.

  The oars are the landing page's oars (the Blade Lock closer's drawing): a
  dark handle, shaft and collar, and the school's own blade — Harvard's
  crimson with the two white wedges — from lib/landingSchools.ts, drawn by
  OarMark (shared with the Varsity Mode mark, VarsityCrest). 250px tall here.
*/
import { useEffect, useState } from "react";
import UniversityCrest from "@/components/UniversityCrest";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import OarMark from "@/components/varsity/OarMark";
import { inVarsityMode, markMode } from "@/lib/varsity/mode";
import { consumeSignIn } from "@/lib/loginIntro";

export default function VarsityIntro() {
  const [leaving, setLeaving] = useState(false);
  // Decided once, at mount — the varsity layout only renders this on the client
  // (it waits for the app state), so reading the browser here is safe. Two
  // reasons to skip it: the OS "reduce motion" setting, and already being in
  // Varsity Mode (a trip out to Settings and back is not an entrance).
  const [done, setDone] = useState(() => {
    if (typeof window === "undefined") return true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return inVarsityMode();
  });
  // The motto is the UNIVERSITY's, not Varsity Mode's, so it comes from the
  // same theme data every school will eventually have a row in (rule 2).
  const { universityKey } = useAppState();
  const motto = getUniversity(universityKey)?.motto;

  // We are in Varsity Mode from here on, however we got in. Kept out of the
  // state initializer above, which React may run twice in development.
  useEffect(() => {
    markMode("varsity");
    /*
      A rower who signs in and lands straight on the varsity side has now been
      greeted — by THIS sequence. Tear off the sign-in note so the student
      welcome doesn't play a second greeting later (lib/loginIntro.ts).
    */
    consumeSignIn();
  }, []);

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

        {/* Crest drops from the top onto the crossing point. The DRAWN crest
            (lib/crests.ts) wearing the theme pair — the same one the whole app
            wears, and at the same 92px/86px the frozen mark (VarsityCrest) uses,
            so the film ends on exactly the icon you keep seeing afterwards. */}
        <div className="absolute inset-x-0 top-[86px] flex justify-center">
          <div className="v-crest-drop">
            <UniversityCrest size={92} />
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
