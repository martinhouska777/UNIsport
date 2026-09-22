"use client";

/*
  VARSITY MODE INTRO — a short title sequence played when you enter Varsity
  Mode. Two oars sweep in from the sides and cross in the middle; the crest then
  drops from the top onto the crossing point; the motto slides in under it; the
  whole overlay fades to reveal the Home screen. About 2.1 seconds, and a tap
  anywhere ends it early.

  WHEN IT PLAYS — EVERY time you cross into Varsity Mode, and every time you
  sign in. The owner's call: every time you change from student to varsity you
  get the animation, or when you log in — "I think it's pretty cool". There was
  a once-a-day ceiling on it for a while; it is gone.

  Two gates are left, and neither is about how often:
    • the OS "reduce motion" setting
    • already being in Varsity Mode THIS TAB (lib/varsity/mode.ts → markMode):
      a trip out to Settings and back is not an entrance, and neither is a
      reload — that is what makes this a switch rather than a mount.

  The oars are the landing page's oars (the Blade Lock closer's drawing) with
  the school's own blade — Harvard's crimson with the two white wedges — from
  lib/landingSchools.ts, drawn by OarMark (shared with the Varsity Mode mark,
  VarsityCrest). 250px tall here, and the REAL oar — dark loom and all. For two
  days (2026-09-19 → 21) it was drawn `bold`, crimson loom with a black line,
  so the X would read on the dark ground; the owner put the oars back to black
  on 2026-09-21 ("change the oars back to black") and moved the emphasis to the
  MOTTO instead — see the motto below. On 2026-09-22 the oars were sent to the
  BACKGROUND as well: they sweep in as they always did and then sit back to
  40%, so the crest and the motto are in front of them.
  The beat timings live with the keyframes in app/globals.css; the two timers
  below have to agree with them.
*/
import { useEffect, useState } from "react";
import UniversityCrest from "@/components/UniversityCrest";
import { useAppState } from "@/components/AppState";
import { getUniversity } from "@/lib/themes";
import OarMark from "@/components/varsity/OarMark";
import { inVarsityMode, markMode } from "@/lib/varsity/mode";
import { consumeSignIn } from "@/lib/loginIntro";

// The motto lands at ~1.6s (globals.css); hold it a beat, then fade.
const FADE_AT_MS = 1750;
const FADE_MS = 350;

export default function VarsityIntro() {
  const [leaving, setLeaving] = useState(false);
  // Decided once, at mount — the varsity layout only renders this on the client
  // (it waits for the app state), so reading the browser here is safe.
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
        {/* The two oars, as ONE group: they sweep in at full strength and then
            sit back to 40% as the crest lands (v-oar-settle, globals.css), so
            the crest and the motto stand in front of them rather than on top
            of them. On the light app the dark looms used to run straight
            through the red letters. */}
        <div className="v-oar-settle absolute inset-0">
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

        {/* The motto, sliding in under the crest — bold, 17px, in the SCHOOL'S
            COLOUR with a thin line round each letter (owner, 2026-09-21: "make
            the motto red text with black borders so it's better readable").

            THE LINE IS THE PAGE'S OWN COLOUR, not black (owner, 2026-09-22: on
            the light app "the red is not visible enough"). --background is
            near-black on the dark app, so that side is unchanged; on the light
            app it is the pale grey the intro stands on, which cuts the letters
            out of whatever is behind them instead of muddying red with black.
            Crimson is --primary, so another school's motto comes out in that
            school's colour, and no colour is written here either way. The line
            is drawn UNDER the fill (paint-order), so the letters keep their
            weight and it only shows at the edge. The words come from the
            university's data; a school with no motto has no line at all. */}
        {motto && (
          <div className="absolute inset-x-0 top-[196px] flex justify-center">
            <div
              className="v-motto-in whitespace-nowrap text-[17px] font-bold uppercase text-primary"
              // The trailing letter's spacing would push the word off-centre;
              // this pays it back. Matches the tracking the animation ends on.
              style={{
                textIndent: "0.38em",
                WebkitTextStroke: "1.5px var(--background)",
                paintOrder: "stroke fill",
              }}
            >
              {motto}
            </div>
          </div>
        )}
      </div>
    </button>
  );
}
