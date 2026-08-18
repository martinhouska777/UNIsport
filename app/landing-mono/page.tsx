import type { CSSProperties } from "react";
import LandingPage from "@/components/landing/LandingPage";

/*
  SCRATCH ROUTE — palette "B" from the 2026-08-18 review, for the owner to
  look at and decide. Delete once decided; nothing links here.

  The idea: the page's whole argument is "your campus, your colours", and it
  wraps that in a fixed blue that three of the eight schools already own —
  on Campus Colours the feature list turns Yale-blue-beside-Yale-blue. Here
  the chrome goes monochrome (the student accent becomes the text white) so
  the ONLY saturated colour on the page is the school colour inside the
  closers and screenshots — and the one deliberate exception, the warm gold
  of Varsity Mode and the console, which no Ivy owns.

  It is the same page: LandingPage untouched, five token values overridden on
  a wrapper (the tokens are `@theme static`, so every l-* utility reads them
  through var()). If it is chosen, the five values move into globals.css and
  this file is deleted; if not, this file is deleted.
*/
const mono = {
  "--color-l-accent": "#f5f5f5",
  "--color-l-accent-dim": "rgba(245, 245, 245, 0.06)",
  "--color-l-accent-soft": "rgba(245, 245, 245, 0.18)",
} as CSSProperties;

export default function LandingMono() {
  return (
    <div className="contents" style={mono}>
      <LandingPage />
    </div>
  );
}
