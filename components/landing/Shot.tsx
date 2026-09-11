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

  The browser can make that choice itself, at parse time, if it is given both:
  a <picture> with the dark twin behind `(prefers-color-scheme: dark)` and the
  light capture as the <img>. Both sets of candidates come from next/image's
  own getImageProps, so the sizes, widths and quality are exactly what <Image>
  would have produced. The page then downloads ONE set, the right one, from
  the first byte — and the chrome around it follows the same rule in CSS
  (`[data-phone-mode="system"]`, globals.css).

  Three cases:
    • no choice made (the default, and what the server renders) — the
      <picture>; the machine decides;
    • the visitor pressed the switch — a plain <img> in the chosen look, the
      same markup on every render after;
    • `mode` given — a plain <img> in that look whatever the machine or the
      visitor says. The intro's backdrop phones open white (HeroPhones).

  The <img> is what callers get a ref to and what the flight clones; the
  <picture> is `display: contents`, so it adds no box of its own — the image
  is positioned by the frame around it exactly as before.
*/
type Props = Omit<ImageProps, "src" | "ref" | "placeholder" | "preload"> & {
  /** The LIGHT capture — `/landing/<x>.webp`. The dark twin is derived (shotSrc). */
  shot: string;
  /** Force one look, ignoring the visitor's scheme and their choice. */
  mode?: PhoneMode;
  ref?: Ref<HTMLImageElement>;
};

export default function Shot({ shot, mode: forced, ref, ...rest }: Props) {
  const { mode, chosen } = usePhoneMode();
  const explicit = forced ?? (chosen ? mode : null);
  if (explicit) {
    const { props } = getImageProps({ ...rest, src: shotSrc(shot, explicit) });
    // eslint-disable-next-line @next/next/no-img-element -- these ARE next/image's own props
    return <img ref={ref} {...props} alt={props.alt} />;
  }
  const light = getImageProps({ ...rest, src: shot }).props;
  const dark = getImageProps({ ...rest, src: shotSrc(shot, "dark") }).props;
  return (
    <picture className="contents">
      <source media="(prefers-color-scheme: dark)" srcSet={dark.srcSet} sizes={dark.sizes} />
      <img ref={ref} {...light} alt={light.alt} />
    </picture>
  );
}
