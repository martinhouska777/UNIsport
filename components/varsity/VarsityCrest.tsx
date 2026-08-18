"use client";

/*
  The VARSITY MODE mark: two oars crossed behind the shield — the same emblem
  the entry animation assembles (VarsityIntro), frozen into one icon.

  The plain shield (VarsityShield) is the university's mark and now stands for
  the normal student app; this one, with the oars, stands for Varsity Mode.

  The oars are the real ones — the landing page's oar with the school's own
  blade (OarMark), the same drawing the intro sweeps in — not a coloured
  stand-in. The shield keeps its theme colours (primary = crimson, primary-
  contrast = white for the H, accent for the thin outline), so the mark
  re-skins with the theme and hardcodes nothing (rule 1); the blade colours
  are the school's, from data.
*/
import { useAppState } from "@/components/AppState";
import OarMark, { OAR_BOX } from "@/components/varsity/OarMark";

export default function VarsityCrest({ size = 28 }: { size?: number }) {
  const { universityKey } = useAppState();
  // One oar, blade at the top, the full 40 of the box; the two are rotated
  // ±36° about a point low in the box (20, 24) — the crossing sits behind the
  // shield's lower half — so each WHOLE blade stands clear above the shield's
  // shoulders and the handles come out below its base. Worked out, not
  // eyeballed: the blade is the top ~24% of the oar, so its foot is 15.4 from
  // the pivot; at 36° that lands at y≈11.5, x≈±9 — above and outside the
  // shield (top 14, half-width 7.5).
  const oarH = 40;
  const oarW = (OAR_BOX.w / OAR_BOX.h) * oarH;

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      {[-36, 36].map((deg) => (
        <g key={deg} transform={`rotate(${deg} 20 24)`}>
          <OarMark schoolKey={universityKey} x={20 - oarW / 2} y={-1} width={oarW} height={oarH} />
        </g>
      ))}

      {/* The shield, on the crossing point, a little smaller than it was so
          the blades have room. The first copy is a fat background-coloured
          outline that keeps the shafts from bleeding into the shield's edge
          at small sizes. */}
      <g transform="translate(12.4 14) scale(0.72)">
        <path
          d="M1,1 L21,1 L21,15 Q21,24 11,25 Q1,24 1,15 Z"
          fill="var(--background)"
          stroke="var(--background)"
          strokeWidth="3.5"
        />
        <path
          d="M1,1 L21,1 L21,15 Q21,24 11,25 Q1,24 1,15 Z"
          fill="var(--primary)"
          stroke="var(--accent)"
          strokeWidth="1.2"
        />
        {/* The H */}
        <rect x="4" y="4" width="5" height="16" rx="1" fill="var(--primary-contrast)" />
        <rect x="4" y="11" width="14" height="4" rx="1" fill="var(--primary-contrast)" />
        <rect x="13" y="4" width="5" height="16" rx="1" fill="var(--primary-contrast)" />
      </g>
    </svg>
  );
}
