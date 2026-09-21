"use client";

import type { CSSProperties } from "react";
import SchoolCrest from "@/components/SchoolCrest";
import { crestFor } from "@/lib/crests";
import { useAppState } from "@/components/AppState";
import { OAR_ART_BOLD } from "@/lib/landingSchools";

/*
  THE UNIVERSITY'S CREST, in the app (Zone 2) — the drawn crest from
  lib/crests.ts, wearing the THEME's pair: the shield in --primary, the
  border/motif/letter in --primary-contrast. That is the same rule as every
  other Zone 2 surface (rule 1), so the mark re-skins with the university and
  in light/dark without knowing anything about either.

  This replaced VarsityShield (the old hand-drawn shield with a hardcoded H)
  everywhere, the Varsity intro animation included — that file is gone.

  `size` is the crest's HEIGHT in px; the width follows the 100:116 drawing.

  `bold` adds a black line round the shield — the same black the bold oar
  takes from lib/landingSchools.ts (OAR_ART_BOLD.line, data, so no colour is
  written here). It is for the Varsity intro only, where the owner wanted the
  emblem to stand out more against the ground ("red with black edges",
  2026-09-21); everywhere else the crest is the plain theme pair.
*/
export default function UniversityCrest({ size = 26, bold = false }: { size?: number; bold?: boolean }) {
  const { universityKey } = useAppState();
  return (
    <SchoolCrest
      crest={crestFor(universityKey)}
      width={(size * 100) / 116}
      height={size}
      edged={bold}
      style={
        {
          "--crest-field": "var(--primary)",
          "--crest-mark": "var(--primary-contrast)",
          "--crest-edge": OAR_ART_BOLD.line,
        } as CSSProperties
      }
    />
  );
}
