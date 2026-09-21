"use client";

import { useId, type CSSProperties } from "react";
import { CREST_SHIELD_PATH, type CrestSpec } from "@/lib/crests";

/*
  THE SCHOOL'S CREST, drawn — the compact cut from the "Campus Crests" design
  piece, rendered live from lib/crests.ts data. A heater shield, an inset
  border, the school's letter in Playfair 900, and (for the four schools whose
  letter alone is ambiguous) one motif shape clipped to the shield.

  Colour is the caller's: the drawing uses only var(--crest-field) for the
  shield and var(--crest-mark) for everything on it (rule 1 — no colour lives
  in here). The landing's button sets the pair from the school's accent pair
  inverted; the app sets it from the theme (see UniversityCrest). The paths
  carry .l-crest-part so the pair can cross-fade where the school cycles
  (globals.css).

  `x`/`y` exist for nesting this crest INSIDE another SVG (VarsityCrest puts
  it over the crossed oars); standalone callers size it with className or
  width/height.

  Decorative wherever it appears — the caller says what the school is in
  words — so it is aria-hidden.
*/
export default function SchoolCrest({
  crest,
  className = "",
  style,
  x,
  y,
  width,
  height,
}: {
  crest: CrestSpec;
  className?: string;
  style?: CSSProperties;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}) {
  const clipId = useId();
  return (
    <svg
      viewBox="0 0 100 116"
      className={className}
      style={style}
      x={x}
      y={y}
      width={width}
      height={height}
      aria-hidden
      focusable="false"
    >
      {crest.motif && (
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
      {crest.motif && (
        <g clipPath={`url(#${clipId})`}>
          <path className="l-crest-part" d={crest.motif} fill="var(--crest-mark)" fillRule="evenodd" />
        </g>
      )}
      <text
        className="l-crest-part"
        x={50}
        y={crest.letterY}
        textAnchor="middle"
        fontSize={crest.fontSize}
        fontWeight={900}
        fontFamily="var(--font-playfair), Georgia, serif"
        fill="var(--crest-mark)"
      >
        {crest.letter}
      </text>
    </svg>
  );
}
