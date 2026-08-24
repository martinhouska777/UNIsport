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
  text2: "#2c313c",
  text3: "#676d7a",
  muted: "#4f5563",
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
  /** The short everyday name — "Harvard" — for lines like "Harvard Rowing". */
  shortName: string;
  theme: ThemeTokens; // the default (dark) look
  themeLight?: ThemeTokens; // light-mode variant (same brand hues, inverted neutrals)
  // Words under the crest on the Varsity Mode intro. Optional on purpose: a
  // school without one simply doesn't get the line — no component change.
  motto?: string;
  /*
    What THIS campus calls its residential gyms — Harvard has houses, Yale has
    colleges, Brown just has dorms. Words are data like everything else here,
    so the Gyms tab reads natively at every school without a component change.
  */
  houseSection: string; // the list's section heading ("House gyms")
  houseNoun: string; // one gym's own label on its card ("House gym")
  housePill: string; // the filter pill's one word ("House")
};

/*
  THE NEUTRALS are the app's own and do not change per school — a theme is a
  school's HUES on the shared near-black (or near-white) chassis. Shared here
  so adding a school stays a four-colour decision, not a twenty-colour one.
*/
const darkNeutrals = {
  background: "#0b0b0c",
  surface: "#161616",
  surface2: "#1f1f1f",
  border: "#272727",
  text: "#f5f5f5",
  text2: "#cdcdcd",
  text3: "#828282", // the faintest grey that still clears 4.5:1 on a card
  muted: "#8d8d8d",
  success: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  overlayShadow: "0 -10px 30px rgba(0, 0, 0, 0.55)",
};

const lightNeutrals = {
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
  success: "#15803d",
  warn: "#b45309",
  danger: "#dc2626",
  overlayShadow: "0 -10px 30px rgba(15, 15, 25, 0.12)",
};

type Brand = { primary: string; primaryLive: string; primaryContrast: string; accent: string };

/** A university = a name, its words for the house gyms, and two brand quads. */
function ivy(
  opts: Omit<University, "theme" | "themeLight"> & { dark: Brand; light: Brand },
): University {
  const { dark, light, ...rest } = opts;
  return {
    ...rest,
    theme: { ...darkNeutrals, ...dark },
    themeLight: { ...lightNeutrals, ...light },
  };
}

/*
  Brand-hue rules, per mode (the numbers Harvard's hand-built theme set):
    • `primary` is the school colour EXACT — crests, badges, hairlines.
    • `primaryLive` is the tappable fill: lifted until it clears 3:1 on the
      near-black ground (or on white in the light theme), while
      `primaryContrast` — the label ON that fill — still clears ~4.5:1.
    • `accent` is the school's second colour, adjusted per mode the same way
      (Harvard's gold darkens on white, Yale's pale blue does too).
    • Princeton is the one school whose dark-mode labels are DARK: its orange
      is so light that white on it fails, which is also true of the real
      campus's own orange-and-black pairing.
    • Columbia's primary is a LIGHT blue, so like Princeton its labels are
      dark; its light theme leans on the darkened ink blue instead.
*/
export const universities: Record<string, University> = {
  harvard: ivy({
    key: "harvard",
    name: "Harvard University",
    shortName: "Harvard",
    motto: "Ex Nemo", // the rowing motto, per the product owner
    houseSection: "House gyms",
    houseNoun: "House gym",
    housePill: "House",
    dark: { primary: "#a51c30", primaryLive: "#c8203a", primaryContrast: "#ffffff", accent: "#d4a843" },
    light: { primary: "#a51c30", primaryLive: "#a51c30", primaryContrast: "#ffffff", accent: "#9a751c" },
  }),
  yale: ivy({
    key: "yale",
    name: "Yale University",
    shortName: "Yale",
    houseSection: "College gyms",
    houseNoun: "College gym",
    housePill: "College",
    dark: { primary: "#00356b", primaryLive: "#1e63b0", primaryContrast: "#ffffff", accent: "#93b7e4" },
    light: { primary: "#00356b", primaryLive: "#00356b", primaryContrast: "#ffffff", accent: "#17518f" },
  }),
  princeton: ivy({
    key: "princeton",
    name: "Princeton University",
    shortName: "Princeton",
    houseSection: "College gyms",
    houseNoun: "College gym",
    housePill: "College",
    dark: { primary: "#e77500", primaryLive: "#e77500", primaryContrast: "#221d17", accent: "#f5cf8f" },
    light: { primary: "#e77500", primaryLive: "#b35a00", primaryContrast: "#ffffff", accent: "#8a6a1c" },
  }),
  penn: ivy({
    key: "penn",
    name: "University of Pennsylvania",
    shortName: "Penn",
    houseSection: "College house gyms",
    houseNoun: "College house gym",
    housePill: "House",
    dark: { primary: "#011f5b", primaryLive: "#3061b8", primaryContrast: "#ffffff", accent: "#d0454f" },
    light: { primary: "#011f5b", primaryLive: "#011f5b", primaryContrast: "#ffffff", accent: "#9d1c28" },
  }),
  brown: ivy({
    key: "brown",
    name: "Brown University",
    shortName: "Brown",
    houseSection: "Dorm gyms",
    houseNoun: "Dorm gym",
    housePill: "Dorm",
    dark: { primary: "#6b4423", primaryLive: "#8a5a2f", primaryContrast: "#ffffff", accent: "#d1a54f" },
    light: { primary: "#4e3629", primaryLive: "#6b4423", primaryContrast: "#ffffff", accent: "#8a651c" },
  }),
  columbia: ivy({
    key: "columbia",
    name: "Columbia University",
    shortName: "Columbia",
    houseSection: "Residence gyms",
    houseNoun: "Residence gym",
    housePill: "Residence",
    dark: { primary: "#6cace4", primaryLive: "#6cace4", primaryContrast: "#0e2036", accent: "#e9eef5" },
    light: { primary: "#1d64ab", primaryLive: "#1d64ab", primaryContrast: "#ffffff", accent: "#35699f" },
  }),
  cornell: ivy({
    key: "cornell",
    name: "Cornell University",
    shortName: "Cornell",
    houseSection: "House gyms",
    houseNoun: "House gym",
    housePill: "House",
    dark: { primary: "#b31b1b", primaryLive: "#d32f2f", primaryContrast: "#ffffff", accent: "#e6d9bd" },
    light: { primary: "#b31b1b", primaryLive: "#b31b1b", primaryContrast: "#ffffff", accent: "#77653f" },
  }),
  dartmouth: ivy({
    key: "dartmouth",
    name: "Dartmouth College",
    shortName: "Dartmouth",
    houseSection: "House gyms",
    houseNoun: "House gym",
    housePill: "House",
    dark: { primary: "#00693e", primaryLive: "#0b8050", primaryContrast: "#ffffff", accent: "#a8d5bd" },
    light: { primary: "#00693e", primaryLive: "#00693e", primaryContrast: "#ffffff", accent: "#2f6b4e" },
  }),
};

export function getUniversity(key: string): University | undefined {
  return universities[key];
}
