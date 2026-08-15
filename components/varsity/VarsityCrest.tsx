/*
  The VARSITY MODE mark: two oars crossed behind the shield — the same emblem
  the entry animation assembles (VarsityIntro), frozen into one icon.

  The plain shield (VarsityShield) is the university's mark and now stands for
  the normal student app; this one, with the oars, stands for Varsity Mode.

  Colors are theme variables (accent = Harvard gold for the oars, primary =
  crimson for the shield, primary-contrast = white for the H), so it re-skins
  with the theme and hardcodes nothing (rule 1).
*/
export default function VarsityCrest({ size = 28 }: { size?: number }) {
  // One upright oar — blade at the top, shaft below. Drawn once, then rotated
  // both ways around the middle to make the X.
  const Oar = ({ deg }: { deg: number }) => (
    <g transform={`rotate(${deg} 20 20)`}>
      <rect x="18.6" y="11" width="2.8" height="27" rx="1.4" fill="var(--accent)" />
      <rect x="16.2" y="2" width="7.6" height="11.5" rx="3.2" fill="var(--accent)" />
    </g>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <Oar deg={-32} />
      <Oar deg={32} />

      {/* The shield, lifted onto the crossing point. The first copy is a fat
          background-colored outline that keeps the gold oars from bleeding
          into the shield's gold edge at small sizes. */}
      <g transform="translate(10.5 9.6) scale(0.86)">
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
