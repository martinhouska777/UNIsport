/*
  THEME DATA (white-label core)
  ------------------------------------------------------------------
  A theme is just a set of color values. Zone 2 applies one university's
  theme at runtime by writing these values into CSS variables.

  To add a new university later, add ONE entry to `universities` below.
  No new components, no new code paths. Eventually these rows come from
  the database (Supabase) instead of this file.
*/

export type ThemeTokens = {
  background: string;
  surface: string;
  surface2: string; // one step more elevated than surface (inputs, pills, rows)
  border: string;
  text: string;
  muted: string;
  primary: string;
  primaryContrast: string;
  accent: string;
  success: string;
  warn: string;
  danger: string;
};

// Zone 1 (pre-login) neutral brand. Mirrors the :root defaults in globals.css.
// No university colors are allowed here.
export const neutralTheme: ThemeTokens = {
  background: "#f6f6f7",
  surface: "#ffffff",
  surface2: "#eeeef0",
  border: "#e4e4e7",
  text: "#1c1c1f",
  muted: "#6b7280",
  primary: "#2f3b52",
  primaryContrast: "#ffffff",
  accent: "#64748b",
  success: "#16a34a",
  warn: "#d97706",
  danger: "#dc2626",
};

export type University = {
  key: string;
  name: string;
  theme: ThemeTokens; // the default (dark) look
  themeLight?: ThemeTokens; // light-mode variant (same brand hues, inverted neutrals)
};

export const universities: Record<string, University> = {
  harvard: {
    key: "harvard",
    name: "Harvard University",
    // Dark theme: crimson primary + gold accent on a near-black background.
    theme: {
      background: "#0b0b0c",
      surface: "#161616",
      surface2: "#1f1f1f",
      border: "#272727",
      text: "#f5f5f5",
      muted: "#8d8d8d",
      primary: "#a51c30", // Harvard crimson
      primaryContrast: "#ffffff",
      accent: "#d4a843", // Harvard gold
      success: "#22c55e",
      warn: "#f59e0b",
      danger: "#ef4444",
    },
    // Light theme: the neutrals flipped (near-black -> near-white), brand hues
    // kept; the gold accent darkened so it reads on white.
    themeLight: {
      background: "#f6f6f7",
      surface: "#ffffff",
      surface2: "#edeef0",
      border: "#e0e1e5",
      text: "#15151a",
      muted: "#606673",
      primary: "#a51c30",
      primaryContrast: "#ffffff",
      accent: "#9a751c",
      success: "#15803d",
      warn: "#b45309",
      danger: "#dc2626",
    },
  },
};

export function getUniversity(key: string): University | undefined {
  return universities[key];
}
