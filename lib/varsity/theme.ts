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
  text2: "#cfc9c0", // the same warm cast as `text`, one step down
  text3: "#85817a",
  muted: "#8a8a8a",
  primary: "#a51c30", // Harvard crimson (oar blade)
  primaryLive: "#c8203a", // the same crimson, lifted so button fills read as raised
  primaryContrast: "#ffffff", // white (oar chevron)
  accent: "#d4a843", // Harvard gold
  success: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  overlayShadow: "0 -10px 30px rgba(0, 0, 0, 0.6)",
};

// Light-mode variant of Varsity Mode: same crimson + gold branding, neutrals
// flipped to a near-white base; gold darkened so it reads on white.
export const varsityLightTheme: ThemeTokens = {
  background: "#f7f6f4",
  surface: "#ffffff",
  surface2: "#efedea",
  border: "#e3e0db",
  text: "#16140f",
  text2: "#2f2b24",
  text3: "#726d63",
  muted: "#5f5b53",
  primary: "#a51c30",
  primaryLive: "#a51c30",
  primaryContrast: "#ffffff",
  accent: "#9a751c",
  success: "#15803d",
  warn: "#b45309",
  danger: "#dc2626",
  overlayShadow: "0 -10px 30px rgba(15, 15, 25, 0.12)",
};

// Where Varsity Mode opens to, and where its bottom-nav tabs live.
export const VARSITY_HOME = "/varsity/home";
