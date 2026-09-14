/*
  THE DESIGN LAB'S FONT SHELF (app/lab — dev only).

  Every face the owner can try on the landing, with the exact Google Fonts
  CSS2 request for it. The request strings matter: Google answers a single
  400 for the WHOLE link when a family is asked for an axis it does not have
  (Bebas Neue has no italic, Instrument Serif has one weight), so each entry
  carries only the axes that family really ships. One <link> per family is
  injected into the framed page; nothing here is loaded by the site itself.

  `id` is what the lab's URL and settings box carry — keep ids stable.
*/

export type LabFontGroup = "serif" | "display" | "sans" | "mono";

export type LabFont = {
  id: string;
  name: string;
  group: LabFontGroup;
  /** Google Fonts `family=` value, URL-encoded (+ for spaces). null = not loaded (system). */
  spec: string | null;
  /** Generic fallback the CSS stack ends with. */
  fallback: "serif" | "sans-serif" | "monospace";
};

export const LAB_FONTS: LabFont[] = [
  // ——— system, no download ———
  { id: "system", name: "System sans (today's body)", group: "sans", spec: null, fallback: "sans-serif" },
  { id: "system-serif", name: "System serif", group: "serif", spec: null, fallback: "serif" },
  // ——— serifs ———
  { id: "instrument-serif", name: "Instrument Serif (today's display)", group: "serif", spec: "Instrument+Serif:ital@0;1", fallback: "serif" },
  { id: "playfair", name: "Playfair Display", group: "serif", spec: "Playfair+Display:ital,wght@0,400..900;1,400..900", fallback: "serif" },
  { id: "fraunces", name: "Fraunces", group: "serif", spec: "Fraunces:ital,wght@0,100..900;1,100..900", fallback: "serif" },
  { id: "dm-serif", name: "DM Serif Display", group: "serif", spec: "DM+Serif+Display:ital@0;1", fallback: "serif" },
  { id: "cormorant", name: "Cormorant Garamond", group: "serif", spec: "Cormorant+Garamond:ital,wght@0,300..700;1,300..700", fallback: "serif" },
  { id: "libre-caslon", name: "Libre Caslon Text", group: "serif", spec: "Libre+Caslon+Text:ital,wght@0,400;0,700;1,400", fallback: "serif" },
  { id: "newsreader", name: "Newsreader", group: "serif", spec: "Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800", fallback: "serif" },
  { id: "bodoni", name: "Bodoni Moda", group: "serif", spec: "Bodoni+Moda:ital,opsz,wght@0,6..96,400..900;1,6..96,400..900", fallback: "serif" },
  { id: "eb-garamond", name: "EB Garamond", group: "serif", spec: "EB+Garamond:ital,wght@0,400..800;1,400..800", fallback: "serif" },
  { id: "lora", name: "Lora", group: "serif", spec: "Lora:ital,wght@0,400..700;1,400..700", fallback: "serif" },
  { id: "crimson-pro", name: "Crimson Pro", group: "serif", spec: "Crimson+Pro:ital,wght@0,200..900;1,200..900", fallback: "serif" },
  { id: "ibm-plex-serif", name: "IBM Plex Serif", group: "serif", spec: "IBM+Plex+Serif:ital,wght@0,100..700;1,100..700", fallback: "serif" },
  { id: "young-serif", name: "Young Serif", group: "serif", spec: "Young+Serif", fallback: "serif" },
  { id: "gloock", name: "Gloock", group: "serif", spec: "Gloock", fallback: "serif" },
  // ——— display / poster sans ———
  { id: "bricolage", name: "Bricolage Grotesque", group: "display", spec: "Bricolage+Grotesque:opsz,wght@12..96,200..800", fallback: "sans-serif" },
  { id: "space-grotesk", name: "Space Grotesk", group: "display", spec: "Space+Grotesk:wght@300..700", fallback: "sans-serif" },
  { id: "syne", name: "Syne", group: "display", spec: "Syne:wght@400..800", fallback: "sans-serif" },
  { id: "unbounded", name: "Unbounded", group: "display", spec: "Unbounded:wght@200..900", fallback: "sans-serif" },
  { id: "archivo-black", name: "Archivo Black", group: "display", spec: "Archivo+Black", fallback: "sans-serif" },
  { id: "archivo", name: "Archivo", group: "display", spec: "Archivo:ital,wght@0,100..900;1,100..900", fallback: "sans-serif" },
  { id: "barlow-condensed", name: "Barlow Condensed", group: "display", spec: "Barlow+Condensed:ital,wght@0,400;0,600;0,700;1,400", fallback: "sans-serif" },
  { id: "bebas", name: "Bebas Neue", group: "display", spec: "Bebas+Neue", fallback: "sans-serif" },
  { id: "anton", name: "Anton", group: "display", spec: "Anton", fallback: "sans-serif" },
  { id: "oswald", name: "Oswald", group: "display", spec: "Oswald:wght@200..700", fallback: "sans-serif" },
  { id: "funnel", name: "Funnel Display", group: "display", spec: "Funnel+Display:wght@300..800", fallback: "sans-serif" },
  { id: "inter-tight", name: "Inter Tight", group: "display", spec: "Inter+Tight:ital,wght@0,100..900;1,100..900", fallback: "sans-serif" },
  { id: "sora", name: "Sora", group: "display", spec: "Sora:wght@100..800", fallback: "sans-serif" },
  { id: "outfit", name: "Outfit", group: "display", spec: "Outfit:wght@100..900", fallback: "sans-serif" },
  // ——— text sans ———
  { id: "inter", name: "Inter", group: "sans", spec: "Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900", fallback: "sans-serif" },
  { id: "jakarta", name: "Plus Jakarta Sans (the app's face)", group: "sans", spec: "Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800", fallback: "sans-serif" },
  { id: "manrope", name: "Manrope", group: "sans", spec: "Manrope:wght@200..800", fallback: "sans-serif" },
  { id: "dm-sans", name: "DM Sans", group: "sans", spec: "DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000", fallback: "sans-serif" },
  { id: "geist", name: "Geist", group: "sans", spec: "Geist:wght@100..900", fallback: "sans-serif" },
  { id: "instrument-sans", name: "Instrument Sans", group: "sans", spec: "Instrument+Sans:ital,wght@0,400..700;1,400..700", fallback: "sans-serif" },
  { id: "schibsted", name: "Schibsted Grotesk", group: "sans", spec: "Schibsted+Grotesk:ital,wght@0,400..900;1,400..900", fallback: "sans-serif" },
  { id: "familjen", name: "Familjen Grotesk", group: "sans", spec: "Familjen+Grotesk:ital,wght@0,400..700;1,400..700", fallback: "sans-serif" },
  { id: "host-grotesk", name: "Host Grotesk", group: "sans", spec: "Host+Grotesk:ital,wght@0,300..800;1,300..800", fallback: "sans-serif" },
  { id: "ibm-plex-sans", name: "IBM Plex Sans", group: "sans", spec: "IBM+Plex+Sans:ital,wght@0,100..700;1,100..700", fallback: "sans-serif" },
  { id: "work-sans", name: "Work Sans", group: "sans", spec: "Work+Sans:ital,wght@0,100..900;1,100..900", fallback: "sans-serif" },
  { id: "public-sans", name: "Public Sans", group: "sans", spec: "Public+Sans:ital,wght@0,100..900;1,100..900", fallback: "sans-serif" },
  { id: "figtree", name: "Figtree", group: "sans", spec: "Figtree:ital,wght@0,300..900;1,300..900", fallback: "sans-serif" },
  { id: "onest", name: "Onest", group: "sans", spec: "Onest:wght@100..900", fallback: "sans-serif" },
  { id: "albert", name: "Albert Sans", group: "sans", spec: "Albert+Sans:ital,wght@0,100..900;1,100..900", fallback: "sans-serif" },
  { id: "karla", name: "Karla", group: "sans", spec: "Karla:ital,wght@0,200..800;1,200..800", fallback: "sans-serif" },
  { id: "rubik", name: "Rubik", group: "sans", spec: "Rubik:ital,wght@0,300..900;1,300..900", fallback: "sans-serif" },
  { id: "atkinson", name: "Atkinson Hyperlegible", group: "sans", spec: "Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700", fallback: "sans-serif" },
  { id: "source-sans", name: "Source Sans 3", group: "sans", spec: "Source+Sans+3:ital,wght@0,200..900;1,200..900", fallback: "sans-serif" },
  // ——— mono (the kickers) ———
  { id: "geist-mono", name: "Geist Mono (today's kickers)", group: "mono", spec: "Geist+Mono:wght@100..900", fallback: "monospace" },
  { id: "jetbrains", name: "JetBrains Mono", group: "mono", spec: "JetBrains+Mono:ital,wght@0,100..800;1,100..800", fallback: "monospace" },
  { id: "ibm-plex-mono", name: "IBM Plex Mono", group: "mono", spec: "IBM+Plex+Mono:ital,wght@0,100..700;1,100..700", fallback: "monospace" },
  { id: "space-mono", name: "Space Mono", group: "mono", spec: "Space+Mono:ital,wght@0,400;0,700;1,400;1,700", fallback: "monospace" },
  { id: "dm-mono", name: "DM Mono", group: "mono", spec: "DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500", fallback: "monospace" },
  { id: "fira-code", name: "Fira Code", group: "mono", spec: "Fira+Code:wght@300..700", fallback: "monospace" },
  { id: "roboto-mono", name: "Roboto Mono", group: "mono", spec: "Roboto+Mono:ital,wght@0,100..700;1,100..700", fallback: "monospace" },
  { id: "courier-prime", name: "Courier Prime", group: "mono", spec: "Courier+Prime:ital,wght@0,400;0,700;1,400;1,700", fallback: "monospace" },
  { id: "azeret", name: "Azeret Mono", group: "mono", spec: "Azeret+Mono:ital,wght@0,100..900;1,100..900", fallback: "monospace" },
];

export const LAB_FONT_GROUPS: { group: LabFontGroup; label: string }[] = [
  { group: "serif", label: "Serifs" },
  { group: "display", label: "Display sans" },
  { group: "sans", label: "Text sans" },
  { group: "mono", label: "Mono" },
];

export function labFont(id: string): LabFont {
  return LAB_FONTS.find((f) => f.id === id) ?? LAB_FONTS[0];
}

/** The CSS family stack for a shelf entry. */
export function labFontStack(f: LabFont): string {
  if (!f.spec) {
    if (f.fallback === "serif") return "Georgia, 'Times New Roman', serif";
    if (f.fallback === "monospace") return "ui-monospace, Menlo, Consolas, monospace";
    return "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
  }
  return `"${f.spec.split(":")[0].replace(/\+/g, " ")}", ${f.fallback}`;
}

export function labFontHref(f: LabFont): string | null {
  return f.spec ? `https://fonts.googleapis.com/css2?family=${f.spec}&display=swap` : null;
}
