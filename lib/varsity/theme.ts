/*
  VARSITY MODE — THEME DATA (isolated from the normal app)
  ------------------------------------------------------------------
  Varsity Mode is its own section of the app with its own look. Like every
  theme in this project (see lib/themes.ts), it is just DATA: a set of color
  values written into CSS variables at runtime by <ThemeProvider>. Components
  never hardcode these hex values — they only use the tokens (bg-primary,
  text-accent, …). That keeps rule 1 (colors come from variables only) intact.

  This palette matches the Harvard rowing mockups and stays in the same dark
  family as the gym app's Harvard theme: near-black surfaces, Harvard crimson
  as primary, Harvard gold as accent. The crimson + white "oar" branding on the
  side rails comes from `primary` + `primaryContrast` (white).
*/
import type { ThemeTokens } from "@/lib/themes";

export const varsityTheme: ThemeTokens = {
  background: "#080808",
  surface: "#111111",
  surface2: "#161616",
  border: "#1f1f1f",
  text: "#f0ebe3",
  muted: "#8a8a8a",
  primary: "#9e1b2e", // Harvard crimson (oar blade) — deep, not pink
  primaryContrast: "#ffffff", // white (oar chevron)
  accent: "#d4a843", // Harvard gold
  success: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
};

// Light-mode variant of Varsity Mode: same crimson + gold branding, neutrals
// flipped to a near-white base. The crimson is pushed DEEPER (more black in it)
// so it never reads as washed-out pink on white, and the text is near-black so
// the light screens stay high-contrast.
export const varsityLightTheme: ThemeTokens = {
  background: "#f4f3f1",
  surface: "#ffffff",
  surface2: "#eae8e4",
  border: "#dcd8d2",
  text: "#14120e",
  muted: "#5c574e",
  primary: "#911627", // deeper crimson for white backgrounds
  primaryContrast: "#ffffff",
  accent: "#8a6816",
  success: "#15803d",
  warn: "#b45309",
  danger: "#c81e2c",
};

// Where Varsity Mode opens to, and where its bottom-nav tabs live.
export const VARSITY_HOME = "/varsity/home";
