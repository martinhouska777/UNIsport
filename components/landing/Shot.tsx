"use client";

import { getImageProps, type ImageProps } from "next/image";
import type { Ref } from "react";
import { shotSrc, usePhoneMode, type PhoneMode } from "@/components/landing/PhoneMode";

/*
  ONE APP SCREEN, IN THE LOOK THE VISITOR WILL SEE — the image every phone on
  the landing draws through.

  Until 2026-09-10 each phone rendered a next/image whose src was chosen in
  React from the phone mode. The server does not know the visitor's colour
  scheme, so it always wrote the LIGHT path into the HTML; the browser's
  preload scanner fetched it before a line of JavaScript ran; then, on a
  machine set to dark, hydration resolved the mode and swapped every src to
  the dark twin — a second download of every screen on the page. On a phone
  in dark mode that was 30 images and ~2 MB before the first scroll, half of
  it thrown away (website review).

  LIGHT IS THE MAIN LOOK NOW (owner, 2026-09-14), so the machine no longer
  decides: until the visitor presses Dark, every screen is the light capture,
  which is also exactly what the server writes into the HTML — one set,
  downloaded once. (The <picture> that let a dark machine pick the dark twin
  at parse time went with that rule.) Two cases:
    • `mode` given — that look, whatever the visitor chose (the intro's
      backdrop phones, HeroPhones);
    • otherwise — the visitor's look: light, or dark once they chose it.

  The <img> is what callers get a ref to and what the flight clones; the
  <picture> is `display: contents`, so it adds no box of its own — the image
  is positioned by the frame around it exactly as before.
*/
type Props = Omit<ImageProps, "src" | "ref" | "placeholder" | "preload"> & {
  /** The LIGHT capture — `/landing/<x>.webp`. The dark twin is derived (shotSrc). */
  shot: string;
  /** Force one look, ignoring the visitor's choice. */
  mode?: PhoneMode;
  ref?: Ref<HTMLImageElement>;
};

export default function Shot({ shot, mode: forced, ref, ...rest }: Props) {
  const { mode } = usePhoneMode();
  const { props } = getImageProps({ ...rest, src: shotSrc(shot, forced ?? mode) });
  // eslint-disable-next-line @next/next/no-img-element -- these ARE next/image's own props
  return <img ref={ref} {...props} alt={props.alt} />;
}
