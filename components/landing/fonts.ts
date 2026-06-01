import { Instrument_Serif } from "next/font/google";

// Display serif used ONLY on the landing (Zone 1 marketing front-door).
// Loaded here so it stays scoped to the landing and out of the app shell.
export const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  display: "swap",
});
