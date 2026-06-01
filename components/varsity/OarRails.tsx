/*
  Decorative "Harvard oar" rails down the left and right edges — the visual
  signature of Varsity Mode. Each rail is a crimson oar blade with a white
  chevron (the Harvard rowing blade) over a thin crimson shaft running the full
  height. Purely decorative: it sits behind the content and ignores clicks.

  Crimson = primary, white = primary-contrast (both theme tokens, rule 1).
*/
function Oar() {
  return (
    <div className="flex h-full flex-col items-center">
      {/* Oar blade: crimson with a white chevron */}
      <svg
        width="18"
        height="64"
        viewBox="0 0 18 64"
        fill="none"
        className="shrink-0"
        aria-hidden="true"
      >
        <rect x="3" y="2" width="12" height="46" rx="5" fill="var(--primary)" />
        <path
          d="M3 20 L9 30 L15 20 L15 27 L9 37 L3 27 Z"
          fill="var(--primary-contrast)"
        />
      </svg>
      {/* Oar shaft — faint, so the rails read as a crisp mark, not a pink wash */}
      <div className="w-[2px] flex-1 bg-text/10" />
    </div>
  );
}

export default function OarRails() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-y-2 left-1">
        <Oar />
      </div>
      <div className="absolute inset-y-2 right-1">
        <Oar />
      </div>
    </div>
  );
}
