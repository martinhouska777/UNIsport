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
  text2: string; // secondary — body copy that isn't the headline
  text3: string; // faint — timestamps, unit labels, decorative captions
  muted: string; // labels and column headings
  primary: string;
  /*
    The fill for anything you can TAP. A brand colour is picked to look right,
    not to clear a contrast ratio, and Harvard crimson on a near-black screen
    measures 2.6:1 against the background — under the 3:1 a control needs to
    read as a raised object at all. So each theme lifts its own crimson here,
    and `primary` stays exact for crests, badges and hairlines.
  */
  primaryLive: string;
  primaryContrast: string;
  accent: string;
  success: string;
  warn: string;
  danger: string;
  /*
    Elevation, for things floating ABOVE the page — bottom sheets, overlays.
    Cards never get a shadow; they use a lighter surface instead. Per-theme,
    because a shadow over near-black needs far more weight than one over white.
  */
  overlayShadow: string;
};

// Zone 1 (pre-login) neutral brand. Mirrors the :root defaults in globals.css.
// No university colors are allowed here.
export const neutralTheme: ThemeTokens = {
  background: "#f6f6f7",
  surface: "#ffffff",
  surface2: "#eeeef0",
  border: "#e4e4e7",
  text: "#1c1c1f",
  text2: "#33363d",
  text3: "#7c8290",
  muted: "#6b7280",
  primary: "#2f3b52",
  primaryLive: "#2f3b52", // already clears 3:1 on a light ground
  primaryContrast: "#ffffff",
  accent: "#64748b",
  success: "#16a34a",
  warn: "#d97706",
  danger: "#dc2626",
  overlayShadow: "0 -10px 30px rgba(15, 15, 25, 0.12)",
};

export type University = {
  key: string;
  name: string;
  theme: ThemeTokens; // the default (dark) look
  themeLight?: ThemeTokens; // light-mode variant (same brand hues, inverted neutrals)
  // Words under the crest on the Varsity Mode intro. Optional on purpose: a
  // school without one simply doesn't get the line — no component change.
  motto?: string;
};

export const universities: Record<string, University> = {
  harvard: {
    key: "harvard",
    name: "Harvard University",
    motto: "Ex Nemo", // the rowing motto, per the product owner
    // Dark theme: crimson primary + gold accent on a near-black background.
    theme: {
      background: "#0b0b0c",
      surface: "#161616",
      surface2: "#1f1f1f",
      border: "#272727",
      text: "#f5f5f5",
      text2: "#cdcdcd",
      text3: "#757575", // the faintest grey that still clears 4.5:1 on a card
      muted: "#8d8d8d",
      primary: "#a51c30", // Harvard crimson
      primaryLive: "#c8203a", // crimson lifted to 3.5:1 for button fills
      primaryContrast: "#ffffff",
      accent: "#d4a843", // Harvard gold
      success: "#22c55e",
      warn: "#f59e0b",
      danger: "#ef4444",
      overlayShadow: "0 -10px 30px rgba(0, 0, 0, 0.55)",
    },
    // Light theme: the neutrals flipped (near-black -> near-white), brand hues
    // kept; the gold accent darkened so it reads on white.
    themeLight: {
      background: "#f6f6f7",
      surface: "#ffffff",
      surface2: "#edeef0",
      border: "#e0e1e5",
      text: "#15151a",
      // Darkened from #606673: secondary text is used at 9–11px all over the
      // app, and the old value only just cleared 4.5:1 on white — it failed
      // outright on any tinted surface. This clears 7:1 on the background.
      muted: "#4e5462",
      text2: "#2c313c",
      text3: "#676d7a",
      primary: "#a51c30",
      primaryLive: "#a51c30", // crimson already clears 3:1 on a white ground
      primaryContrast: "#ffffff",
      accent: "#9a751c",
      success: "#15803d",
      warn: "#b45309",
      danger: "#dc2626",
      overlayShadow: "0 -10px 30px rgba(15, 15, 25, 0.12)",
    },
  },
};

export function getUniversity(key: string): University | undefined {
  return universities[key];
}
