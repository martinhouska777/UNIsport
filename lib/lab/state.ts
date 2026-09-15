/*
  THE DESIGN LAB'S SETTINGS (app/lab — dev only).

  One flat object holds every dial. It travels in two forms the owner can
  paste back into chat: the page's URL hash (`#light=96&hue=80&…`) and the
  same string in the settings box. Keys are short and STABLE — a saved string
  from last week must still open.

  Colours here are DATA (rule 1's content-colour exception), the same way the
  app's Colour Lab kept its presets: the lab writes them into the framed page
  as CSS variables; no component ever sees a hex.
*/

export type LabRadius = "pill" | "12" | "6" | "0";
export type LabWidth = "full" | "1280" | "820" | "390";

export type LabState = {
  // ——— ground: the page's neutrals, derived from four dials ———
  /** 0 = today's near-black … 100 = white. */
  light: number;
  /** oklch hue of the neutral tint, 0..360. */
  hue: number;
  /** How coloured the neutrals are, 0..100 (0 = pure grey). */
  tint: number;
  /** How far the elevated / surface / line steps sit from the page, 0..100. */
  step: number;
  /** How far the secondary greys sit from the main text, 0..100. */
  textc: number;
  /**
   * The SECOND background — the title cards, Contact, and (half-way toward
   * it) the pills and feature rows. "" = derived from the page by `step`;
   * a hex = its own colour, which is how the page/block PAIRS below work.
   */
  surface: string;
  // ——— the two brand accents ———
  accent: string; // student blue today
  varsity: string; // varsity gold today
  // ——— type ———
  display: string; // font id — the headlines
  body: string; // font id — everything else
  kicker: string; // font id, or "body" — the small labels
  dweight: number; // 300..900
  /** Display letter-spacing in thousandths of an em, -80..80. */
  dtrack: number;
  /** The emphasised word in the headlines ("alone again.", "Varsity Mode.") in italic. */
  ditalic: boolean;
  dupper: boolean;
  kupper: boolean;
  // ——— effects ———
  /** Grid overlay strength, 0..3 (1 = as designed). */
  grid: number;
  /** Glow strength, 0..2 (1 = as designed). */
  glow: number;
  // ——— shape ———
  radius: LabRadius;
  // ——— preview only, not part of the design ———
  width: LabWidth;
};

/** Today's landing, dial for dial. Reset goes here. */
export const LAB_TODAY: LabState = {
  light: 2,
  hue: 0,
  tint: 0,
  step: 48,
  textc: 50,
  surface: "",
  accent: "#4a9eff",
  varsity: "#e0c896",
  display: "instrument-serif",
  body: "system",
  kicker: "geist-mono",
  dweight: 400,
  dtrack: -20,
  ditalic: true,
  dupper: false,
  kupper: true,
  grid: 1,
  glow: 1,
  radius: "pill",
  width: "full",
};

export type LabPreset = { id: string; name: string; note: string; state: Partial<LabState> };

/*
  Starting points, not answers. Each one leaves the "2024 dark-mode SaaS"
  look in a different direction so the owner can feel the range before
  turning dials. Names are stable; add, don't rename.
*/
export const LAB_PRESETS: LabPreset[] = [
  { id: "today", name: "Today", note: "the page as it ships", state: {} },
  {
    id: "paper",
    name: "Paper",
    note: "white page, ink blue, a soft serif",
    state: { light: 96, hue: 80, tint: 12, step: 45, textc: 45, accent: "#1f3fbf", varsity: "#8a6a1f", display: "fraunces", dweight: 500, dtrack: -25, body: "inter", kicker: "jetbrains", grid: 0, glow: 0.4, radius: "6" },
  },
  {
    id: "bone",
    name: "Bone",
    note: "warm off-white, quiet, editorial",
    state: { light: 91, hue: 70, tint: 22, step: 40, textc: 50, accent: "#233a5e", varsity: "#7a5a22", display: "newsreader", dweight: 500, dtrack: -15, body: "instrument-sans", kicker: "body", kupper: false, grid: 0, glow: 0, radius: "pill" },
  },
  {
    id: "graphite",
    name: "Graphite",
    note: "dark but not black, a cool grey",
    state: { light: 20, hue: 250, tint: 15, step: 55, textc: 50, accent: "#8ab8ff", varsity: "#e6c98a", display: "bricolage", dweight: 600, dtrack: -30, ditalic: false, body: "inter-tight", kicker: "geist-mono", grid: 1, glow: 0.6, radius: "12" },
  },
  {
    id: "ink",
    name: "Ink",
    note: "navy black, cream accent, a bookish serif",
    state: { light: 8, hue: 260, tint: 30, step: 60, textc: 50, accent: "#e9e2cf", varsity: "#d8b45c", display: "playfair", dweight: 500, dtrack: -10, body: "manrope", kicker: "ibm-plex-mono", grid: 0.5, glow: 1.2, radius: "pill" },
  },
  {
    id: "poster",
    name: "Poster",
    note: "flat white, black type, one hot colour, square",
    state: { light: 100, hue: 0, tint: 0, step: 70, textc: 60, accent: "#ff3b1f", varsity: "#111111", display: "archivo-black", dweight: 400, dtrack: -10, ditalic: false, dupper: true, body: "space-grotesk", kicker: "body", kupper: true, grid: 0, glow: 0, radius: "0" },
  },
  {
    id: "studio",
    name: "Studio",
    note: "warm grey, green accent, a light Garamond",
    state: { light: 87, hue: 60, tint: 10, step: 45, textc: 50, accent: "#2b6b52", varsity: "#9a5b2e", display: "cormorant", dweight: 500, dtrack: -5, body: "karla", kicker: "dm-mono", grid: 1.5, glow: 0.3, radius: "12" },
  },
  {
    id: "midnight",
    name: "Midnight",
    note: "deep blue-black, mint and amber, a wide display face",
    state: { light: 4, hue: 240, tint: 40, step: 70, textc: 40, accent: "#7cf0c8", varsity: "#ffd37a", display: "unbounded", dweight: 500, dtrack: -20, ditalic: false, body: "geist", kicker: "geist-mono", grid: 2, glow: 1.5, radius: "pill" },
  },
];

/*
  BACKGROUNDS (owner, 2026-09-14: "i care most about background styles … i
  want to explore some white options as well … like normal apps use"). Each
  one sets ONLY the ground dials and the two accents — the type, effects and
  shape the owner has dialled in stay. The accents ride along because a light
  page needs darker ink than a black one; they are a fitting pair, not a rule.
  Roughly the grounds real products sit on today: from pure white through the
  warm off-whites and the soft greys to slate, navy and OLED black.
*/
export const LAB_GROUNDS: LabPreset[] = [
  { id: "white", name: "White", note: "pure white, the Apple / Linear light look", state: { light: 100, hue: 0, tint: 0, step: 40, textc: 50, accent: "#2563eb", varsity: "#b45309" } },
  { id: "cloud", name: "Cloud", note: "cool off-white, the Notion / Stripe grey-white", state: { light: 97, hue: 250, tint: 8, step: 45, textc: 50, accent: "#3b5bdb", varsity: "#b7791f" } },
  { id: "paper-g", name: "Paper", note: "warm off-white, like a page", state: { light: 97, hue: 75, tint: 12, step: 45, textc: 48, accent: "#1d4ed8", varsity: "#92400e" } },
  { id: "linen", name: "Linen", note: "warmer, a touch of cream", state: { light: 94, hue: 70, tint: 22, step: 45, textc: 48, accent: "#1e3a8a", varsity: "#8a5a1b" } },
  { id: "fog", name: "Fog", note: "light grey, the Figma / GitHub canvas", state: { light: 93, hue: 250, tint: 6, step: 55, textc: 50, accent: "#2f4fd6", varsity: "#a16207" } },
  { id: "mist", name: "Mist", note: "pale blue-grey, airy", state: { light: 94, hue: 240, tint: 20, step: 50, textc: 50, accent: "#1e40af", varsity: "#9a6b1e" } },
  { id: "sand", name: "Sand", note: "warm beige, editorial", state: { light: 90, hue: 75, tint: 28, step: 45, textc: 50, accent: "#1f3f8f", varsity: "#7c4a12" } },
  { id: "stone-g", name: "Stone", note: "grey-beige, the app's Stone direction", state: { light: 87, hue: 70, tint: 15, step: 50, textc: 50, accent: "#233f7a", varsity: "#6b4a12" } },
  { id: "slate", name: "Slate", note: "dark blue-grey, not black", state: { light: 22, hue: 255, tint: 25, step: 55, textc: 50, accent: "#7dd3fc", varsity: "#fcd34d" } },
  { id: "graphite-g", name: "Graphite", note: "neutral dark grey, the zinc look", state: { light: 12, hue: 260, tint: 6, step: 55, textc: 50, accent: "#8ab8ff", varsity: "#e6c98a" } },
  { id: "charcoal", name: "Charcoal", note: "warm dark grey, Spotify-ish", state: { light: 18, hue: 60, tint: 5, step: 50, textc: 50, accent: "#6ea8ff", varsity: "#e0c896" } },
  { id: "navy", name: "Navy", note: "deep blue-black", state: { light: 10, hue: 258, tint: 45, step: 65, textc: 50, accent: "#93c5fd", varsity: "#fbbf24" } },
  { id: "espresso", name: "Espresso", note: "warm brown-black", state: { light: 9, hue: 45, tint: 25, step: 60, textc: 50, accent: "#f0b98a", varsity: "#e8d5a3" } },
  { id: "forest", name: "Forest", note: "deep green-black", state: { light: 9, hue: 155, tint: 20, step: 60, textc: 50, accent: "#9ae6b4", varsity: "#f6d365" } },
  { id: "black", name: "Black", note: "true OLED black, below today's", state: { light: 0, hue: 0, tint: 0, step: 60, textc: 50, accent: "#4a9eff", varsity: "#e0c896" } },
];

/*
  PAIRS (owner, 2026-09-14, after the single backgrounds: "combos … the page
  will have different background color combinations … now we have like black
  and grey that's all"). A pair is the PAGE colour and the colour of the blocks
  that sit on it (title cards, Contact; pills and feature rows land half-way
  between). Same polarity within a pair — the text colour is one for the whole
  page, so a dark block on a light page would carry dark text; that would need
  per-block text tokens and is not built. Ground + surface + accents only.
*/
export const LAB_COMBOS: LabPreset[] = [
  { id: "white-fog", name: "White · Fog", note: "white page, light-grey blocks — the classic SaaS pair", state: { light: 100, hue: 0, tint: 0, step: 40, textc: 50, surface: "#f2f3f5", accent: "#2563eb", varsity: "#b45309" } },
  { id: "fog-white", name: "Fog · White", note: "grey page, white blocks — what the app does", state: { light: 94, hue: 250, tint: 6, step: 45, textc: 50, surface: "#ffffff", accent: "#2f4fd6", varsity: "#a16207" } },
  { id: "cream-white", name: "Cream · White", note: "warm cream page, white blocks", state: { light: 95, hue: 75, tint: 20, step: 45, textc: 48, surface: "#ffffff", accent: "#1d4ed8", varsity: "#92400e" } },
  { id: "paper-sand", name: "Paper · Sand", note: "off-white page, sand blocks", state: { light: 97, hue: 75, tint: 12, step: 45, textc: 48, surface: "#efe8db", accent: "#1e3a8a", varsity: "#8a5a1b" } },
  { id: "mist-white", name: "Mist · White", note: "pale blue page, white blocks", state: { light: 94, hue: 240, tint: 20, step: 50, textc: 50, surface: "#ffffff", accent: "#1e40af", varsity: "#9a6b1e" } },
  { id: "blush-white", name: "Blush · White", note: "faint pink-grey page, white blocks", state: { light: 95, hue: 20, tint: 14, step: 45, textc: 50, surface: "#ffffff", accent: "#9f1239", varsity: "#8a5a1b" } },
  { id: "sage-cream", name: "Sage · Cream", note: "greenish-grey page, cream blocks", state: { light: 92, hue: 150, tint: 12, step: 45, textc: 50, surface: "#f9f7f0", accent: "#166534", varsity: "#92400e" } },
  { id: "stone-ivory", name: "Stone · Ivory", note: "grey-beige page, ivory blocks", state: { light: 87, hue: 70, tint: 15, step: 50, textc: 50, surface: "#f8f6f1", accent: "#233f7a", varsity: "#6b4a12" } },
  { id: "black-charcoal", name: "Black · Charcoal", note: "today's black with clearly lighter blocks", state: { light: 2, hue: 0, tint: 0, step: 48, textc: 50, surface: "#1c1c1e", accent: "#4a9eff", varsity: "#e0c896" } },
  { id: "charcoal-graphite", name: "Charcoal · Graphite", note: "Apple dark mode's two greys", state: { light: 15, hue: 260, tint: 4, step: 50, textc: 50, surface: "#2c2c2e", accent: "#6ea8ff", varsity: "#e0c896" } },
  { id: "graphite-black", name: "Graphite · Black", note: "grey page, blocks DARKER than the page", state: { light: 14, hue: 260, tint: 4, step: 50, textc: 50, surface: "#0a0a0a", accent: "#8ab8ff", varsity: "#e6c98a" } },
  { id: "navy-slate", name: "Navy · Slate", note: "blue-black page, slate blocks", state: { light: 9, hue: 258, tint: 45, step: 60, textc: 50, surface: "#172033", accent: "#93c5fd", varsity: "#fbbf24" } },
  { id: "slate-steel", name: "Slate · Steel", note: "lighter dark: blue-grey page, steel blocks", state: { light: 24, hue: 255, tint: 25, step: 55, textc: 50, surface: "#2c3748", accent: "#7dd3fc", varsity: "#fcd34d" } },
  { id: "espresso-mocha", name: "Espresso · Mocha", note: "brown-black page, mocha blocks", state: { light: 8, hue: 45, tint: 25, step: 60, textc: 50, surface: "#26201a", accent: "#f0b98a", varsity: "#e8d5a3" } },
  { id: "forest-moss", name: "Forest · Moss", note: "green-black page, moss blocks", state: { light: 8, hue: 155, tint: 20, step: 60, textc: 50, surface: "#182419", accent: "#9ae6b4", varsity: "#f6d365" } },
  { id: "ink-plum", name: "Ink · Plum", note: "violet-black page, plum blocks", state: { light: 8, hue: 300, tint: 25, step: 60, textc: 50, surface: "#201a2c", accent: "#c4b5fd", varsity: "#fcd34d" } },
];

/*
  TYPE PAIRINGS (owner, 2026-09-14: asked for good headline + body fonts, then
  "in the webpage" — as clicks, not advice). Type dials only: the ground,
  accents, effects and shape stay. Each pairing sets weight, tracking, italic
  and case too, because a face only works at its own settings — a sans with
  the serif's italic emphasis is the very thing that reads as generic.
*/
export const LAB_TYPE_PAIRS: LabPreset[] = [
  { id: "fraunces-inter", name: "Fraunces + Inter", note: "warm, editorial — try it first, on Paper / Cream / Bone", state: { display: "fraunces", body: "inter", kicker: "jetbrains", dweight: 500, dtrack: -25, ditalic: true, dupper: false, kupper: true } },
  { id: "bricolage-instrument", name: "Bricolage + Instrument Sans", note: "modern, a bit sporty — the other one to try first", state: { display: "bricolage", body: "instrument-sans", kicker: "body", dweight: 700, dtrack: -30, ditalic: false, dupper: false, kupper: false } },
  { id: "newsreader-instrument", name: "Newsreader + Instrument Sans", note: "quiet newspaper — Fog · White, Stone · Ivory", state: { display: "newsreader", body: "instrument-sans", kicker: "ibm-plex-mono", dweight: 500, dtrack: -15, ditalic: true, dupper: false, kupper: true } },
  { id: "playfair-manrope", name: "Playfair + Manrope", note: "classic, rhymes with the crests — Ink, Navy · Slate", state: { display: "playfair", body: "manrope", kicker: "dm-mono", dweight: 500, dtrack: -10, ditalic: true, dupper: false, kupper: true } },
  { id: "barlow-inter", name: "Barlow Condensed + Inter", note: "athletic poster caps — turn the glow off", state: { display: "barlow-condensed", body: "inter", kicker: "body", dweight: 600, dtrack: 10, ditalic: false, dupper: true, kupper: true } },
  { id: "jakarta-jakarta", name: "Jakarta for both", note: "one family, the app's face — site and app become one thing", state: { display: "jakarta", body: "jakarta", kicker: "body", dweight: 700, dtrack: -30, ditalic: false, dupper: false, kupper: false } },
  { id: "today-type", name: "Today's type", note: "Instrument Serif, system body, Geist Mono kickers", state: { display: "instrument-serif", body: "system", kicker: "geist-mono", dweight: 400, dtrack: -20, ditalic: true, dupper: false, kupper: true } },
];

// ——— the URL-hash / settings-box codec ———

const KEYS = Object.keys(LAB_TODAY) as (keyof LabState)[];

export function encodeLab(s: LabState): string {
  return KEYS.filter((k) => k !== "width")
    .map((k) => {
      const v = s[k];
      const str = typeof v === "boolean" ? (v ? "1" : "0") : typeof v === "string" ? v.replace(/^#/, "") : String(v);
      return `${k}=${str}`;
    })
    .join("&");
}

export function decodeLab(hash: string, base: LabState = LAB_TODAY): LabState {
  const out: LabState = { ...base };
  const src = hash.replace(/^#/, "");
  if (!src) return out;
  for (const part of src.split("&")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i) as keyof LabState;
    const v = decodeURIComponent(part.slice(i + 1));
    if (!(k in LAB_TODAY)) continue;
    const cur = LAB_TODAY[k];
    if (typeof cur === "number") {
      const n = Number(v);
      if (Number.isFinite(n)) (out as Record<string, unknown>)[k] = n;
    } else if (typeof cur === "boolean") {
      (out as Record<string, unknown>)[k] = v === "1" || v === "true";
    } else if (k === "accent" || k === "varsity") {
      if (/^[0-9a-f]{6}$/i.test(v)) (out as Record<string, unknown>)[k] = `#${v.toLowerCase()}`;
    } else if (k === "surface") {
      out.surface = /^[0-9a-f]{6}$/i.test(v) ? `#${v.toLowerCase()}` : "";
    } else {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}
