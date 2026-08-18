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
    <Phone className="w-full max-w-[300px]">
      <Image
        src={shotSrc(`/landing/${shot}`, mode)}
        alt={alt}
        width={900}
        height={1479}
        preload={preload}
        sizes="(max-width: 640px) 80vw, 300px"
        className="block h-auto w-full"
      />
    </Phone>
  );
}
