"use client";

import { useId } from "react";
import { CREST_SHIELD_PATH, type School } from "@/lib/landingSchools";

/*
  THE SCHOOL'S CREST — the compact drawing from the "Campus Crests" design
  piece, rendered live from lib/landingSchools.ts data. A heater shield, an
  inset border, the school's letter in Playfair 900, and (for the four schools
  whose letter alone is ambiguous) one motif shape clipped to the shield.

  Colour is the caller's: the drawing uses only var(--crest-field) for the
  shield and var(--crest-mark) for everything on it, so the same crest sits on
  a dark page one way round and on the school's own button inverted (rule 1 —
  no colour lives in here). The paths carry .l-crest-part so the pair can
  cross-fade with the school cycle (globals.css).

  Decorative wherever it appears — the caller says what the school is in
  words — so it is aria-hidden.
*/
export default function SchoolCrest({ school, className = "" }: { school: School; className?: string }) {
  const clipId = useId();
  return (
    <svg viewBox="0 0 100 116" className={className} aria-hidden focusable="false">
      {school.crest.motif && (
        <defs>
          <clipPath id={clipId}>
            <path d={CREST_SHIELD_PATH} transform="translate(50,59) scale(0.88) translate(-50,-59)" />
          </clipPath>
        </defs>
      )}
      <path className="l-crest-part" d={CREST_SHIELD_PATH} fill="var(--crest-field)" />
      <path
        className="l-crest-part"
        d={CREST_SHIELD_PATH}
        fill="none"
        stroke="var(--crest-mark)"
        strokeWidth={4}
        transform="translate(50,59) scale(0.88) translate(-50,-59)"
      />
      {school.crest.motif && (
        <g clipPath={`url(#${clipId})`}>
          <path className="l-crest-part" d={school.crest.motif} fill="var(--crest-mark)" fillRule="evenodd" />
        </g>
      )}
      <text
        className="l-crest-part"
        x={50}
        y={school.crest.letterY}
        textAnchor="middle"
        fontSize={school.crest.fontSize}
        fontWeight={900}
        fontFamily="var(--font-playfair), Georgia, serif"
        fill="var(--crest-mark)"
      >
        {school.letter}
      </text>
    </svg>
  );
}
