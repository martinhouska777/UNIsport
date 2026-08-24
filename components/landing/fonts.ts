import { Instrument_Serif, Playfair_Display } from "next/font/google";

// Display serif used ONLY on the landing (Zone 1 marketing front-door).
// Loaded here so it stays scoped to the landing and out of the app shell.
export const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});

// The crest letter's face. The Campus Crests design piece drew every letter
// in Playfair Display 900 — at 18px on a button the black weight IS the
// crest's legibility, and Instrument Serif has no bold cut. One weight, one
// subset, landing-scoped like the serif above.
export const playfair = Playfair_Display({
  weight: "900",
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
