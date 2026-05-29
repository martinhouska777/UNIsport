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
  theme: ThemeTokens;
};

export const universities: Record<string, University> = {
  harvard: {
    key: "harvard",
    name: "Harvard University",
    theme: {
      background: "#faf6f6",
      surface: "#ffffff",
      border: "#ecd9dd",
      text: "#1c1417",
      muted: "#7a6b6e",
      primary: "#a51c30", // Harvard crimson
      primaryContrast: "#ffffff",
      accent: "#d4a843", // Harvard gold
      success: "#16a34a",
      warn: "#d97706",
      danger: "#b91c1c",
    },
  },
};

export function getUniversity(key: string): University | undefined {
  return universities[key];
}
