"use client";

/*
  THE TROPHY, WEARING THE SCHOOL'S CREST — the gold cup the owner picked
  (public/trophy.webp, cut out of its white background) with the university's
  crest laid on the bowl. The crest is the live UniversityCrest, so it follows
  the theme: Harvard's is crimson, and every other school gets its own with no
  new code (rule 2).

  The cup's gold is part of the picture (an asset, like the landing
  screenshots), not a colour in this component (rule 1).

  `size` is the trophy's HEIGHT in px; the width follows the picture (260:288).
*/
import UniversityCrest from "@/components/UniversityCrest";

export default function CrestTrophy({ size = 48 }: { size?: number }) {
  // Where the bowl is, as fractions of the picture. The cup sits a touch left
  // of centre because the picture has a margin all round (2026-09-16 — it used
  // to clip the right handle). The crest's middle is about a quarter of the way
  // down, and it is 30% of the height tall (a fifth was unreadable at 46px).
  const crest = Math.round(size * 0.3);
  return (
    <span
      className="relative inline-block flex-shrink-0"
      style={{ width: (size * 260) / 288, height: size }}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/trophy.webp" alt="" className="h-full w-full" draggable={false} />
      <span
        className="absolute flex -translate-x-1/2 -translate-y-1/2"
        style={{ left: "47.8%", top: "25.5%" }}
      >
        <UniversityCrest size={crest} />
      </span>
    </span>
  );
}
