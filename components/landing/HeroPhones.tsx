"use client";

import Image from "next/image";
import Phone from "@/components/landing/Phone";
import { shotSrc, usePhoneMode } from "@/components/landing/PhoneMode";

/*
  THE INTRO'S BACKDROP — two app screens standing in the margins of the wide
  screen, half cropped by the edge and fading into the page.

  The owner's note (2026-08-23): on a laptop the intro's sides are empty, and
  what should fill them is "some phone screens same as I have down there". So
  these are exactly the screens from down there — the same frame (Phone), the
  same captures the first story opens on, and the same light/dark switch
  (PhoneMode) — parked behind the words instead of beside them.

  WHICH TWO, and why those: the headline is "Your campus. Your gym. Your
  people." — the left phone is the Gyms screen and the right is Match. The
  backdrop is the headline.

  It supersedes the older note that the intro carries no phone. That note said
  the real screenshots below replace a DRAWN one; these are the real
  screenshots, and they are backdrop, not exhibit.

  WHERE THEY STAND. High, in the two upper corners, tilted away from the
  middle — the widest empty band on a laptop, beside the mark and the
  headline. They then MELT DOWNWARDS (the mask), so they are gone by the row
  of doors instead of standing behind it. The first cut of this hung them
  half off the side edges and sliced them vertically; what you saw then was
  not a phone but a strip of somebody's screen, which read as dirt on the
  page. A backdrop has to be a whole object or nothing.

  Wide screens only (xl and up): below that the margins it fills do not exist.
  It sits inside HeroFade, so it leaves with everything else. The light/dark
  pill is NOT summoned for it (no data-phone-screens here): it follows the
  mode when a visitor sets one further down, but a switch has no business
  appearing over the front door for two half-hidden decorations.
*/
const SHOTS = [
  { src: "/landing/01-gyms.webp", alt: "The Gyms screen of the app", side: "left" as const },
  { src: "/landing/02-match.webp", alt: "The Match screen of the app", side: "right" as const },
];

export default function HeroPhones() {
  const { mode } = usePhoneMode();

  // Gone before the doors: full strength at the top, nothing by the bottom.
  const melt = "linear-gradient(to bottom, black 0%, black 30%, rgba(0,0,0,0.35) 62%, transparent 88%)";

  return (
    /* w-screen and centred on the intro's own centre, which is the page's:
       the phones belong to the SCREEN's corners, not to the 1160px column.
       -z-10 keeps them behind the words — the section is its own stacking
       context (z-[1]), so they cannot fall behind the page itself. */
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 hidden w-screen -translate-x-1/2 overflow-hidden xl:block"
    >
      {SHOTS.map((s) => (
        <div
          key={s.src}
          className={`absolute top-6 ${
            s.side === "left"
              ? "left-[1.5%] -rotate-[11deg]"
              : "right-[1.5%] top-14 rotate-[11deg]"
          }`}
          style={{ maskImage: melt, WebkitMaskImage: melt }}
        >
          <Phone className="w-[300px] opacity-70 2xl:w-[360px]">
            <div className="relative aspect-[900/1480] overflow-hidden bg-l-phone-screen">
              <Image
                src={shotSrc(s.src, mode)}
                alt={s.alt}
                fill
                sizes="(min-width: 1536px) 360px, 300px"
                quality={80}
                className="object-fill"
              />
            </div>
          </Phone>
        </div>
      ))}
    </div>
  );
}
