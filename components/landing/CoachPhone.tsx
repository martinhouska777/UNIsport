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
       ~670. */
    <Phone className="w-full max-w-[210px] sm:max-w-[240px]">
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
