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
    } else {
      (out as Record<string, unknown>)[k] = v;
    }
  }
  return out;
}
