/*
  The OLD hand-drawn shield (an H in bars). Everywhere else this was replaced
  by the drawn crest (components/UniversityCrest → lib/crests.ts, 2026-08-24);
  the ONE remaining wearer is the Varsity intro animation, which the owner is
  reviewing separately — when that adopts the crest, delete this file.
  Colors are theme variables (rule 1).
*/
export default function VarsityShield({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={(size * 22) / 26}
      height={size}
      viewBox="0 0 22 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M1,1 L21,1 L21,15 Q21,24 11,25 Q1,24 1,15 Z"
        fill="var(--primary)"
        stroke="var(--accent)"
        strokeWidth="1"
      />
      {/* Two white oar blades crossed over a bar */}
      <rect x="4" y="4" width="5" height="16" rx="1" fill="var(--primary-contrast)" />
      <rect x="4" y="11" width="14" height="4" rx="1" fill="var(--primary-contrast)" />
      <rect x="13" y="4" width="5" height="16" rx="1" fill="var(--primary-contrast)" />
    </svg>
  );
}
