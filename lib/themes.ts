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
    Per-theme, because a shadow over near-black needs far more weight than one
    over white.
  */
  overlayShadow: string;
  /*
    The card lift (2026-09-14). Cards used to be flat — a lighter surface and
    a solid 1px border. The owner picked a look where a card sits a hair above
    the page instead: a very soft shadow plus a border at ~55% opacity, so the
    edge reads as a tone rather than a drawn line. Applied once, in
    globals.css, to the app's card idiom (`rounded-xl border bg-surface`).
  */
  cardShadow: string;
  /*
    INK — the surface of the one strip on a card that you PRESS (the foot of a
    gym card, with the chevron). It is `surface2` taken about 20% darker, so
    the strip reads as the pressable part without becoming a black bar: the
    owner tried true black on 2026-09-14 and called it too much.

    It is a token rather than a hex because "a step darker" is a different
    colour in each mode, and because a school with its own neutrals should get
    its own strip for free. `inkContrast` is whatever reads ON it — dark ink on
    the light strip, near-white on the dark one.
  */
  ink: string;
  inkContrast: string;
  /*
    How far the school's own colours are pulled TOWARD `inkContrast` when they
    sit on the strip. The direction takes care of itself: on the light strip
    that darkens crimson and the status greens, on the dark strip it lightens
    them. Only the amount differs, because the dark strip is the further of the
    two from the colours the palette was drawn for.
  */
  inkLift: string;
};

// Zone 1 (pre-login) neutral brand. Mirrors the :root defaults in globals.css.
// No university colors are allowed here.
export const neutralTheme: ThemeTokens = {
  background: "#ebf0f6",
  surface: "#fafcfe",
  surface2: "#dee3e9",
  border: "rgba(203, 207, 213, 0.55)",
  text: "#141618",
  text2: "#3b3f47",
  text3: "#676d76",
  muted: "#4a4f58",
  primary: "#2f3b52",
  primaryLive: "#2f3b52", // already clears 3:1 on a light ground
  primaryContrast: "#ffffff",
  accent: "#64748b",
  success: "#16a34a",
  warn: "#d97706",
  danger: "#dc2626",
  overlayShadow: "0 -10px 30px rgba(15, 15, 25, 0.12)",
  cardShadow: "0 1px 2px rgba(20, 22, 24, 0.05), 0 4px 14px rgba(20, 22, 24, 0.04)",
  ink: "#b2b6ba",
  inkContrast: "#141618",
  inkLift: "48%",
};

export type University = {
  key: string;
  name: string;
  /** The short everyday name — "Harvard" — for lines like "Harvard Rowing". */
  shortName: string;
  /*
    The email addresses that MEAN this school. Signing in with an address at
    one of these is what tells the app which university you are at — nobody is
    ever asked to pick from a list. Matched on the END of the domain, so
    "harvard.edu" also accepts "college.harvard.edu". Adding a school = adding
    a line here, exactly like its colours.
  */
  domains: string[];
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
  mainSection?: string; // the heading over the campus-wide gyms (default "Main gyms")
  houseNoun: string; // one gym's own label on its card ("House gym")
  housePill: string; // the filter pill's one word ("House")
  /*
    The school's identity palette for the Gyms tab: the main gym cards take
    turns through it, top to bottom (Princeton orange, black, orange). The
    same two colours as the school's rowing blade on the landing. Optional:
    without it every card is washed in `primary`.
  */
  gymCardColors?: string[];
  /*
    Where the campus's clock is. The log reminder fires "at your usual training
    time", and a server has no idea what 5 pm means without this. Optional:
    every school so far is on the US east coast (DEFAULT_TIMEZONE); a campus
    elsewhere sets its own.
  */
  timezone?: string;
};

export const DEFAULT_TIMEZONE = "America/New_York";

/** The IANA timezone a university runs on. */
export function universityTimezone(key: string | null | undefined): string {
  return (key && universities[key]?.timezone) || DEFAULT_TIMEZONE;
}

/*
  THE NEUTRALS are the app's own and do not change per school — a theme is a
  school's HUES on the shared chassis. Shared here so adding a school stays a
  four-colour decision, not a twenty-colour one. Varsity Mode wears the same
  chassis (lib/varsity/theme.ts), so the two halves of the app match.

  THE CHASSIS ITSELF (2026-09-14). The owner chose these in the Colour Lab
  after five drawn directions: not the old white-and-grey, but a cool
  blue-cast set — oklch hue 256°, a light tint (25/100), page-to-card
  contrast 50/100. The page is a pale blue-grey and the cards are almost
  white, so a card reads as lifted without a hard edge; the border is the
  same grey at 55% opacity (see ThemeTokens.cardShadow). The text ladder was
  re-derived on the same hue so every step still clears its contrast floor
  (muted >= 7:1 on the page, text3 >= 4.5:1 on a card) — the Lab's own muted
  was too light for 9–11px labels and was darkened here.
*/
export const darkNeutrals = {
  background: "#090b0e",
  surface: "#171a1d",
  surface2: "#232529",
  border: "rgba(47, 50, 53, 0.55)",
  text: "#edeef0",
  text2: "#c3c4c6",
  text3: "#808489", // the faintest grey that still clears 4.5:1 on a card
  muted: "#8a8d92",
  success: "#22c55e",
  warn: "#f59e0b",
  danger: "#ef4444",
  overlayShadow: "0 -10px 30px rgba(0, 0, 0, 0.55)",
  cardShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
  // Darker than the card it sits under (#171a1d) and a hair above the page
  // (#090b0e), so the foot reads as recessed rather than as more card. The
  // owner asked for the dark side specifically to go darker (2026-09-14)
  // after keeping the light one where it was.
  ink: "#0e1013",
  inkContrast: "#edeef0",
  inkLift: "40%",
};

export const lightNeutrals = {
  background: "#ebf0f6",
  surface: "#fafcfe",
  surface2: "#dee3e9",
  border: "rgba(203, 207, 213, 0.55)",
  text: "#141618",
  // Secondary text is used at 9–11px all over the app, so `muted` clears 7:1
  // on the page background, not just 4.5:1.
  muted: "#4a4f58",
  text2: "#3b3f47",
  text3: "#676d76",
  success: "#15803d",
  warn: "#b45309",
  danger: "#dc2626",
  overlayShadow: "0 -10px 30px rgba(15, 15, 25, 0.12)",
  cardShadow: "0 1px 2px rgba(20, 22, 24, 0.05), 0 4px 14px rgba(20, 22, 24, 0.04)",
  ink: "#b2b6ba",
  inkContrast: "#141618",
  inkLift: "48%",
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
    domains: ["harvard.edu"],
    motto: "Ex Nemo", // the rowing motto, per the product owner
    houseSection: "House gyms",
    houseNoun: "House gym",
    housePill: "House",
    gymCardColors: ["#a51c30", "#ffffff"],
    dark: { primary: "#a51c30", primaryLive: "#c8203a", primaryContrast: "#ffffff", accent: "#d4a843" },
    light: { primary: "#a51c30", primaryLive: "#a51c30", primaryContrast: "#ffffff", accent: "#9a751c" },
  }),
  yale: ivy({
    key: "yale",
    name: "Yale University",
    shortName: "Yale",
    domains: ["yale.edu"],
    houseSection: "College gyms",
    houseNoun: "College gym",
    housePill: "College",
    gymCardColors: ["#00356b", "#ffffff"],
    dark: { primary: "#00356b", primaryLive: "#1e63b0", primaryContrast: "#ffffff", accent: "#93b7e4" },
    light: { primary: "#00356b", primaryLive: "#00356b", primaryContrast: "#ffffff", accent: "#17518f" },
  }),
  princeton: ivy({
    key: "princeton",
    name: "Princeton University",
    shortName: "Princeton",
    domains: ["princeton.edu"],
    houseSection: "College gyms",
    houseNoun: "College gym",
    housePill: "College",
    gymCardColors: ["#e77500", "#1a1a1a"],
    dark: { primary: "#e77500", primaryLive: "#e77500", primaryContrast: "#221d17", accent: "#f5cf8f" },
    light: { primary: "#e77500", primaryLive: "#b35a00", primaryContrast: "#ffffff", accent: "#8a6a1c" },
  }),
  penn: ivy({
    key: "penn",
    name: "University of Pennsylvania",
    shortName: "Penn",
    domains: ["upenn.edu"],
    houseSection: "College house gyms",
    houseNoun: "College house gym",
    housePill: "House",
    gymCardColors: ["#011f5b", "#d0101f"],
    dark: { primary: "#011f5b", primaryLive: "#3061b8", primaryContrast: "#ffffff", accent: "#d0454f" },
    light: { primary: "#011f5b", primaryLive: "#011f5b", primaryContrast: "#ffffff", accent: "#9d1c28" },
  }),
  brown: ivy({
    key: "brown",
    name: "Brown University",
    shortName: "Brown",
    domains: ["brown.edu"],
    houseSection: "Dorm gyms",
    houseNoun: "Dorm gym",
    housePill: "Dorm",
    gymCardColors: ["#4e3629", "#ffffff"],
    dark: { primary: "#6b4423", primaryLive: "#8a5a2f", primaryContrast: "#ffffff", accent: "#d1a54f" },
    light: { primary: "#4e3629", primaryLive: "#6b4423", primaryContrast: "#ffffff", accent: "#8a651c" },
  }),
  columbia: ivy({
    key: "columbia",
    name: "Columbia University",
    shortName: "Columbia",
    domains: ["columbia.edu"],
    houseSection: "Residence gyms",
    houseNoun: "Residence gym",
    housePill: "Residence",
    gymCardColors: ["#6cace4", "#ffffff"],
    dark: { primary: "#6cace4", primaryLive: "#6cace4", primaryContrast: "#0e2036", accent: "#e9eef5" },
    light: { primary: "#1d64ab", primaryLive: "#1d64ab", primaryContrast: "#ffffff", accent: "#35699f" },
  }),
  cornell: ivy({
    key: "cornell",
    name: "Cornell University",
    shortName: "Cornell",
    domains: ["cornell.edu"],
    houseSection: "House gyms",
    houseNoun: "House gym",
    housePill: "House",
    gymCardColors: ["#b31b1b", "#ffffff"],
    dark: { primary: "#b31b1b", primaryLive: "#d32f2f", primaryContrast: "#ffffff", accent: "#e6d9bd" },
    light: { primary: "#b31b1b", primaryLive: "#b31b1b", primaryContrast: "#ffffff", accent: "#77653f" },
  }),
  dartmouth: ivy({
    key: "dartmouth",
    name: "Dartmouth College",
    shortName: "Dartmouth",
    domains: ["dartmouth.edu"],
    houseSection: "House gyms",
    houseNoun: "House gym",
    housePill: "House",
    gymCardColors: ["#00693e", "#ffffff"],
    dark: { primary: "#00693e", primaryLive: "#0b8050", primaryContrast: "#ffffff", accent: "#a8d5bd" },
    light: { primary: "#00693e", primaryLive: "#00693e", primaryContrast: "#ffffff", accent: "#2f6b4e" },
  }),
};

/*
  THE ONE SCHOOL THE APP RUNS AS — the whole white-label system, pinned.

  Every other Ivy above stays exactly where it is: its colours, crest, gyms and
  words for the residential gyms are all still here, and the landing page still
  shows them off. They are simply not reachable from inside the app any more.

  Until now three different things could put you at another school: the demo
  roll for an unrecognised address (lib/demoSchool.ts), the University switcher
  in Settings, and the address you signed in with. With this set, all three
  answer "harvard" and nothing in the app can change it — the app is Harvard
  every time, for everyone.

  Going live at a second campus later is a ONE-LINE edit here: set this back to
  `null` and the per-account behaviour returns exactly as it was, switcher and
  all. That is the point of keeping the data rather than deleting it.
*/
export const LIVE_UNIVERSITY: string | null = "harvard";

export function getUniversity(key: string): University | undefined {
  return universities[key];
}
