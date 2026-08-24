"use client";

import type { CSSProperties } from "react";
import SchoolCrest from "@/components/SchoolCrest";
import { crestFor } from "@/lib/crests";
import { useAppState } from "@/components/AppState";

/*
  THE UNIVERSITY'S CREST, in the app (Zone 2) — the drawn crest from
  lib/crests.ts, wearing the THEME's pair: the shield in --primary, the
  border/motif/letter in --primary-contrast. That is the same rule as every
  other Zone 2 surface (rule 1), so the mark re-skins with the university and
  in light/dark without knowing anything about either.

  This replaced VarsityShield (the old hand-drawn shield with a hardcoded H)
  everywhere except the Varsity intro animation, which the owner is reviewing
  separately and still shows the old drawing.

  `size` is the crest's HEIGHT in px; the width follows the 100:116 drawing.
*/
export default function UniversityCrest({ size = 26 }: { size?: number }) {
  const { universityKey } = useAppState();
  return (
    <SchoolCrest
      crest={crestFor(universityKey)}
      width={(size * 100) / 116}
      height={size}
      style={
        {
          "--crest-field": "var(--primary)",
          "--crest-mark": "var(--primary-contrast)",
        } as CSSProperties
      }
    />
  );
}
