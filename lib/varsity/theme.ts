/*
  VARSITY MODE — THEME DATA (isolated from the normal app)
  ------------------------------------------------------------------
  Varsity Mode is its own section of the app with its own look. Like every
  theme in this project (see lib/themes.ts), it is just DATA: a set of color
  values written into CSS variables at runtime by <ThemeProvider>. Components
  never hardcode these hex values — they only use the tokens (bg-primary,
  text-accent, …). That keeps rule 1 (colors come from variables only) intact.

  Harvard crimson as primary, Harvard gold as accent. The crimson + white
  "oar" branding on the side rails comes from `primary` + `primaryContrast`.

  Until 2026-09-14 Varsity Mode had its OWN chassis — a warmer near-black with
  a warm text cast — so it felt like a different building. The owner chose to
  unify: both halves of the app now share the neutrals in lib/themes.ts, and
  Varsity Mode is told apart by crimson, gold, the crossed-oars crest and its
  own layout, not by a different grey.
*/
import { darkNeutrals, lightNeutrals, type ThemeTokens, type University } from "@/lib/themes";

export const varsityTheme: ThemeTokens = {
  ...darkNeutrals,
  primary: "#a51c30", // Harvard crimson (oar blade)
  primaryLive: "#c8203a", // the same crimson, lifted so button fills read as raised
  primaryContrast: "#ffffff", // white (oar chevron)
  accent: "#d4a843", // Harvard gold
};

// Light-mode variant of Varsity Mode: same crimson + gold branding on the
// shared light chassis; gold darkened so it reads on a light ground.
export const varsityLightTheme: ThemeTokens = {
  ...lightNeutrals,
  primary: "#a51c30",
  primaryLive: "#a51c30",
  primaryContrast: "#ffffff",
  accent: "#9a751c",
};

/*
  VARSITY MODE, AT ANOTHER SCHOOL. The two palettes above are the shared
  chassis wearing Harvard's hues. When the university switches (Settings),
  only the four brand hues change. Components keep using tokens, so nothing
  but this mapping knows.
*/
const BRAND = ["primary", "primaryLive", "primaryContrast", "accent"] as const;

function wear(chassis: ThemeTokens, school: ThemeTokens | undefined): ThemeTokens {
  if (!school) return chassis;
  const out = { ...chassis };
  for (const k of BRAND) out[k] = school[k];
  return out;
}

export function varsityThemeFor(u: University | undefined): { dark: ThemeTokens; light: ThemeTokens } {
  return {
    dark: wear(varsityTheme, u?.theme),
    light: wear(varsityLightTheme, u?.themeLight),
  };
}

// Where Varsity Mode opens to, and where its bottom-nav tabs live.
export const VARSITY_HOME = "/varsity/home";
