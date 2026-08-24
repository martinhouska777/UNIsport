"use client";

/*
  THE SCHOOL WELCOME — a one-shot title sequence played on the far side of a
  sign-in, the first time a screen of the STUDENT app appears.

  The shield fades in wearing the university's own colour, its inset border
  follows, and the school's letter then rises up from inside the shield and
  seats itself in the middle. The school's name lands underneath, and the whole
  overlay dissolves into whatever screen it was covering.

  Why it exists: everything before the sign-in is Zone 1, which is neutral by
  rule 2 — the same dark grey and product blue for every student in the world.
  Everything after it is one university. This is the seam between the two, so
  the change of colour arrives as a moment rather than as a repaint you catch
  out of the corner of your eye.

  The drawing is the SAME crest data as everywhere else (lib/crests.ts) — the
  shared shield path, the school's letter and its measured seat — just assembled
  in parts so each part can arrive on its own. Colour is the theme's: the shield
  takes --primary-live rather than --primary because it sits on the bare
  background here, where a school like Yale's exact navy would all but vanish
  (lib/themes.ts explains that pair).

  TWO things bring it on, and they are the same thing twice: arriving on the
  student side from OUTSIDE it.
    • a sign-in (lib/loginIntro.ts) — the way in from Zone 1;
    • a switch back from Varsity Mode (lib/varsity/mode.ts) — the way in from
      the other half of the app. Its sibling VarsityIntro greets the trip in
      the opposite direction with the same crest over crossed oars, so the two
      modes now answer each other.
  Neither a reopened session nor a walk out to Settings and back is an arrival,
  and neither replays it. A tap dismisses it; prefers-reduced-motion skips it.

  Marking the mode is THIS component's job, not the shell's — the same as on
  the varsity side. The shell marked it the moment it mounted, which is before
  the app state is even known, so the mark was already "student" by the time
  this could look at where it had come from and the switch was invisible.
*/
import { useEffect, useId, useState } from "react";
import { useAppState } from "@/components/AppState";
import { CREST_SHIELD_PATH, crestFor } from "@/lib/crests";
import { getUniversity } from "@/lib/themes";
import { consumeSignIn, peekSignIn } from "@/lib/loginIntro";
import { inVarsityMode, markMode } from "@/lib/varsity/mode";

/** The crest's height on screen, in px. The width follows the 100:116 drawing. */
const CREST_HEIGHT = 104;

export default function SchoolIntro({
  /*
    Called once there is nothing in the way any more — either the sequence has
    finished, or there was never one to play. The app shell holds the tour back
    until then, so the walk doesn't start its first step behind an opaque
    crest and point at things nobody can see.
  */
  onFinished,
}: {
  onFinished?: () => void;
} = {}) {
  const { universityKey } = useAppState();
  const crest = crestFor(universityKey);
  const university = getUniversity(universityKey);

  const [leaving, setLeaving] = useState(false);
  /*
    Decided once, at mount — the screens that mount this all wait for the app
    state first, so this only ever runs on the client. Two reasons to skip: the
    OS "reduce motion" setting, and no sign-in to greet. The note is only PEEKED
    at here; tearing it off is the effect's job, because React runs state
    initializers twice in development and the second run would find nothing.
  */
  const [done, setDone] = useState(() => {
    if (typeof window === "undefined") return true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
    return !(peekSignIn() || inVarsityMode());
  });

  /*
    We are on the student side from here on, however we got here — and this
    arrival has now been greeted, however it went, including the case where the
    greeting was to hold still because motion is turned off.
  */
  useEffect(() => {
    markMode("student");
    consumeSignIn();
  }, []);

  // Whatever is waiting on the welcome can start: it is over, or never was.
  useEffect(() => {
    if (done) onFinished?.();
  }, [done, onFinished]);

  useEffect(() => {
    if (done) return;
    // The name lands at ~1.6s; hold it a beat before dissolving.
    const fade = setTimeout(() => setLeaving(true), 2100);
    const end = setTimeout(() => setDone(true), 2600);
    return () => {
      clearTimeout(fade);
      clearTimeout(end);
    };
  }, [done]);

  const shieldClip = useId();
  const innerClip = useId();

  if (done) return null;

  return (
    <div
      aria-hidden="true"
      onClick={() => setLeaving(true)}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background transition-opacity duration-500 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <svg
        viewBox="0 0 100 116"
        width={(CREST_HEIGHT * 100) / 116}
        height={CREST_HEIGHT}
        aria-hidden
        focusable="false"
      >
        <defs>
          {/* The letter is clipped to the shield so it can rise from BEHIND the
              bottom edge rather than sliding in over the background. */}
          <clipPath id={shieldClip}>
            <path d={CREST_SHIELD_PATH} />
          </clipPath>
          {crest.motif && (
            <clipPath id={innerClip}>
              <path
                d={CREST_SHIELD_PATH}
                transform="translate(50,59) scale(0.88) translate(-50,-59)"
              />
            </clipPath>
          )}
        </defs>

        <path className="s-shield-in" d={CREST_SHIELD_PATH} fill="var(--primary-live)" />
        <path
          className="s-border-in"
          d={CREST_SHIELD_PATH}
          fill="none"
          stroke="var(--primary-contrast)"
          strokeWidth={4}
          transform="translate(50,59) scale(0.88) translate(-50,-59)"
        />
        {crest.motif && (
          <g clipPath={`url(#${innerClip})`}>
            <path
              className="s-border-in"
              d={crest.motif}
              fill="var(--primary-contrast)"
              fillRule="evenodd"
            />
          </g>
        )}
        <g clipPath={`url(#${shieldClip})`}>
          <text
            className="s-letter-rise"
            x={50}
            y={crest.letterY}
            textAnchor="middle"
            fontSize={crest.fontSize}
            fontWeight={900}
            fontFamily="var(--font-playfair), Georgia, serif"
            fill="var(--primary-contrast)"
          >
            {crest.letter}
          </text>
        </g>
      </svg>

      {university && (
        <div className="s-name-in text-[15px] font-medium text-text">{university.name}</div>
      )}
    </div>
  );
}
