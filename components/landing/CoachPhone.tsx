"use client";

import Image from "next/image";
import Phone from "@/components/landing/Phone";
import { shotSrc, usePhoneMode } from "@/components/landing/PhoneMode";

/* The phone frame the coach captures sit in — the shared landing Phone, so a
   reader who scrolled through the stories meets a familiar object here. A
   client component only so it can follow the light/dark switch; the section
   around it stays server-rendered. */
export default function CoachPhone({ shot, alt, preload }: { shot: string; alt: string; preload?: boolean }) {
  const { mode } = usePhoneMode();
  return (
    /* SMALLER THAN THE STORY PHONES, on the owner's instruction 2026-09-04:
       "make the phones on the coaches console smaller so u can read the text
       and view the phone at the same time". At 300px a step was 718-820px
       tall on a 375-wide phone, so the screen and its explanation could never
       be on screen together. 210 (240 from sm up) puts the tallest step under
       ~670.

       AND IT FOLLOWS THE WINDOW'S HEIGHT (owner, 2026-09-06: "chci aby se ten
       mobil i text vešli na stránku"). 670px only fits a window taller than
       670 — theirs is about 660 CSS pixels (a 1907x827 screenshot on a
       125%-scaled display) with a 66px bar fixed over the top of it, so the
       last two lines of every explanation sat below the fold.

       Both numbers are measured off the rendered page, not guessed. A step is
       1.771 x the phone's width plus 250 (the headline, the longest
       explanation and the gaps); 356 is those 250 plus the 66px bar fixed over
       the top of the window and 40 of air. So: whatever height is left over,
       divided by 1.771, is the widest phone that still leaves every word on
       screen. It reaches the old 240 in a window 781 tall and stays there, so
       nothing changes on a normal desktop; the 140 floor keeps it sane in a
       window too short for any of this. */
    <Phone className="w-full max-w-[210px] sm:max-w-[clamp(140px,calc((100svh_-_356px)/1.771),240px)]">
      <Image
        src={shotSrc(`/landing/${shot}`, mode)}
        alt={alt}
        width={900}
        height={1479}
        preload={preload}
        sizes="(min-width: 640px) 240px, 210px"
        quality={90}
        className="block h-auto w-full"
      />
    </Phone>
  );
}
