"use client";

/*
  VARSITY MODE INTRO — a short title sequence played when you enter Varsity
  Mode. Two oars sweep in from the sides and cross in the middle; the crest then
  drops from the top onto the crossing point; the motto slides in under it; the
  whole overlay fades to reveal the Home screen. About 1.7 seconds, and a tap
  anywhere ends it early.

  WHEN IT PLAYS — three gates, any one of which skips it:
    • the OS "reduce motion" setting
    • already being in Varsity Mode this tab (lib/varsity/mode.ts → markMode):
      a trip out to Settings and back is not an entrance
    • having already played TODAY (markIntroShown): an installed PWA is a fresh
      tab every morning, so "once per switch" used to mean every single day
  Once a day is the ceiling: a rower checking whether he's in a boat at 5:12am
  has seen the oars before.

  The oars are the landing page's oars (the Blade Lock closer's drawing): a
  dark handle, shaft and collar, and the school's own blade — Harvard's
  crimson with the two white wedges — from lib/landingSchools.ts, drawn by
  OarMark (shared with the Varsity Mode mark, VarsityCrest). 250px tall here.
  The beat timings live with the keyframes in app/globals.css; the two timers
  below have to agree with them.
*/
import { useEffect, useState } from "react";
import UniversityCrest from "@/components/UniversityCrest";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import OarMark from "@/components/varsity/OarMark";
import { inVarsityMode, introShownToday, markIntroShown, markMode } from "@/lib/varsity/mode";
import { consumeSignIn } from "@/lib/loginIntro";

// The motto lands at ~1.25s (globals.css); hold it a beat, then fade.
const FADE_AT_MS = 1350;
const FADE_MS = 350;

export default function VarsityIntro() {
  const [leaving, setLeaving] = useState(false);
  // Decided once, at mount — the varsity layout only renders this on the client
  // (it waits for the app state), so reading the browser here is safe.
  const [done, setDone] = useState(() => {
    if (typeof window === "undefined") return true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return inVarsityMode() || introShownToday();
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

  // Playing → that's today's showing, whether it runs to the end or is tapped away.
  useEffect(() => {
    if (done) return;
    markIntroShown();
    const fade = setTimeout(() => setLeaving(true), FADE_AT_MS);
    const end = setTimeout(() => setDone(true), FADE_AT_MS + FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, [done]);

  // Any tap ends it: fade now, unmount when the fade is through.
  const skip = () => {
    if (leaving) return;
    setLeaving(true);
    setTimeout(() => setDone(true), FADE_MS);
  };

  if (done) return null;

  return (
    /*
      A BUTTON, not a decoration: the whole overlay is the skip control, so it
      is reachable by a tap, a key and a screen reader alike — the old version
      was aria-hidden, which made it 2.8 seconds of nothing for anyone not
      looking at it.
    */
    <button
      type="button"
      onClick={skip}
      aria-label="Skip intro"
      className={`absolute inset-0 z-50 flex cursor-default items-center justify-center bg-background transition-opacity duration-[350ms] ${
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
    </button>
  );
}
