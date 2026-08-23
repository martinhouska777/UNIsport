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

  WHERE THEY STAND (owner, 2026-08-23: "put the photos more so you can see the
  whole thing closer to the text"). Beside the mark and the headline, tilted
  away from the middle, WHOLE — no edge crops them and no mask eats them, and
  they are small enough to finish well above the row of doors.

  They are anchored to the TEXT, not to the window: each stands a fixed
  distance out from the middle of the page (the .l-hero-phone rules in
  app/globals.css), so on a big monitor they travel outwards with the column
  of words rather than stranding themselves in the corners.

  Two earlier cuts, so they are not tried again: hanging them half off the
  side edges showed a vertical strip of somebody's screen and read as dirt on
  the page; melting them downwards into the doors hid the one thing that makes
  them read as a phone, which is the whole shape of one.

  THEY OPEN WHITE, whatever the machine's colour scheme says (owner,
  2026-08-23) — a white phone reads as an app against the dark page, a dark
  one reads as a smudge. The moment a visitor presses the light/dark switch
  further down, these follow it like every other phone: that is what
  `chosen` distinguishes. Only the intro overrides the default this way; the
  rest of the page still opens in the visitor's own scheme.

  Wide screens only (xl and up): below that the margins it fills do not exist.
  It sits inside HeroFade, so it leaves with everything else. The light/dark
  pill is NOT summoned for it (no data-phone-screens here): a switch has no
  business appearing over the front door for two decorations.
*/
const SHOTS = [
  { src: "/landing/01-gyms.webp", alt: "The Gyms screen of the app", side: "left" as const },
  { src: "/landing/02-match.webp", alt: "The Match screen of the app", side: "right" as const },
];

export default function HeroPhones() {
  const { mode, chosen } = usePhoneMode();
  // The visitor's choice if they made one; white if they have not.
  const shown = chosen ? mode : "light";

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
        <div key={s.src} className="l-hero-phone" data-side={s.side}>
          <Phone className="opacity-[0.82]">
            <div className="relative aspect-[900/1480] overflow-hidden bg-l-phone-screen">
              <Image
                src={shotSrc(s.src, shown)}
                alt={s.alt}
                fill
                sizes="(min-width: 1536px) 290px, 230px"
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
