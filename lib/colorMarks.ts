/*
  A COLOUR AS A SMALL MARK — a dot, a stripe, a bar, a legend swatch.
  ---------------------------------------------------------------------------
  The coach's spreadsheet colours (lib/varsity/home.ts kindColor, the squad's
  own picks in Training settings) are chosen to be SOLID blocks: bright lime
  for UT2, yellow for UT1. As a 10px dot or a 4px stripe on a white card the
  same colours all but vanish — UT1 yellow measured 1.07:1, UT2 lime 1.33:1
  (launch audit, 2026-09-27). So wherever a colour is drawn SMALL, it goes
  through this: a colour that would not clear 3:1 against a white card is
  taken toward black, step by step, until it does. Anything already visible is
  returned untouched, and solid blocks keep the colour exactly as picked.

  One answer for both themes on purpose: a colour that just clears 3:1 on white
  is about 6:1 on the near-black card, so the darker mark still reads there.
  Colours that are not hex (a theme var(--…)) are returned as they are — the
  theme already chose them to read.
*/

const CARD = [250, 252, 254]; // lib/themes.ts lightNeutrals.surface

function parseHex(c: string): [number, number, number] | null {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((x) => x + x).join("") : m[1];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance([r, g, b]: number[]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

const contrastOnCard = (rgb: number[]) => (luminance(CARD) + 0.05) / (luminance(rgb) + 0.05);

const cache = new Map<string, string>();

/** The colour to draw a small mark in: itself if it reads on a white card, else darker until it does. */
export function markColor(color: string | null | undefined): string | undefined {
  if (!color) return color ?? undefined;
  const hit = cache.get(color);
  if (hit) return hit;
  const rgb = parseHex(color);
  if (!rgb || contrastOnCard(rgb) >= 3) {
    cache.set(color, color);
    return color;
  }
  let out = rgb;
  for (let k = 0.05; k <= 0.9; k += 0.05) {
    out = rgb.map((v) => Math.round(v * (1 - k))) as [number, number, number];
    if (contrastOnCard(out) >= 3) break;
  }
  const hex = `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  cache.set(color, hex);
  return hex;
}
