// Recolors the REAL app screenshots into each school's palette, for the
// closers' phones: every crimson-family pixel (chips, buttons, header
// accents, washes) is shifted to the school's colour; whites, greys, golds,
// greens and photos stay untouched. Writes recolored/{screen}-{school}.webp
// and a review sheet next to itself.
import sharp from "sharp";
import fs from "fs";

// The palettes come from the Claude Design closer itself (its per-school
// data): p is the school colour, sec the second colour its mock gives to the
// SECOND gym card's wash — Penn's blue-red-blue, Princeton's orange-grey.
const SCHOOLS = [
  { n: "Harvard",   p: "#a51c30", sec: "#9a751c" },
  { n: "Yale",      p: "#00356b", sec: "#6cace4" },
  { n: "Princeton", p: "#e77500", sec: "#8a8a8a" },
  { n: "Penn",      p: "#011f5b", sec: "#a51c30" },
  { n: "Brown",     p: "#4e3629", sec: "#b31b1b" },
  { n: "Columbia",  p: "#6cace4", sec: "#1d64ab" },
  { n: "Cornell",   p: "#b31b1b", sec: "#8a8a8a" },
  { n: "Dartmouth", p: "#00693e", sec: "#8a8a8a" },
];

const rgb2hsl = (r, g, b) => {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (mx === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
};
const hsl2rgb = (h, s, l) => {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  return [f(h + 1 / 3), f(h), f(h - 1 / 3)].map((v) => Math.round(v * 255));
};
const hex2hsl = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return rgb2hsl(n >> 16, (n >> 8) & 255, n & 255);
};

const BASE = hex2hsl("#a51c30");   // [~350, .71, .38]

// crimson-family test: hue within [330, 15] (wrapped), enough saturation to
// not be a grey, not blown-out white
const isCrimson = (h, s, l) => (h >= 328 || h <= 16) && s > 0.09 && l < 0.97 && l > 0.02;

function recolor(raw, w, hgt, ch, target, secTarget, secRows) {
  const [th, ts, tl] = target;
  const out = Buffer.from(raw);
  for (let i = 0; i < w * hgt * ch; i += ch) {
    const [h, s, l] = rgb2hsl(raw[i], raw[i + 1], raw[i + 2]);
    if (!isCrimson(h, s, l)) continue;
    // the second card's wash takes the school's SECOND colour, like the
    // design piece's own mock does — that is Penn's blue-red-blue
    const y = Math.floor(i / ch / w);
    const t = secTarget && secRows && y >= secRows[0] && y <= secRows[1] ? secTarget : target;
    // hue: carry the pixel's own deviation from base crimson over to the
    // target; saturation: rescale; lightness: pull toward the target's, by
    // as much as the pixel was saturated (solid chips move fully, pale
    // washes barely)
    const dh = ((h - BASE[0] + 540) % 360) - 180;
    const ns = Math.min(1, s * (t[1] / BASE[1]));
    const nl = Math.max(0.02, Math.min(0.98, l + (t[2] - BASE[2]) * Math.min(1, s / BASE[1]) * 0.9));
    const [r, g, b] = hsl2rgb(t[1] === 0 ? 0 : t[0] + dh, ns, nl);
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  return out;
}

/* Finds the second gym card's wash: the three pinkish bands down the middle
   of the screen, returned as the [top, bottom] rows of band two. */
function secondBand(raw, w, ch) {
  const runs = [];
  let cur = null;
  for (let y = 150; y < 1200; y++) {
    const i = (y * w + 450) * ch;
    const [h, s, l] = rgb2hsl(raw[i], raw[i + 1], raw[i + 2]);
    const pink = (h >= 328 || h <= 16) && s > 0.14 && l < 0.96;
    if (pink) { if (cur) cur[1] = y; else cur = [y, y]; }
    else if (cur && y - cur[1] > 30) { runs.push(cur); cur = null; }
  }
  if (cur) runs.push(cur);
  const bands = runs.filter((r) => r[1] - r[0] > 80);
  return bands.length >= 2 ? [bands[1][0] - 6, bands[1][1] + 6] : null;
}

fs.mkdirSync("recolored", { recursive: true });

const SCREENS = [
  { id: "gyms",  src: "../../public/landing/01-gyms.webp",   crop: null },
  { id: "vhome", src: "../../public/landing/tall-vhome.webp", crop: { left: 0, top: 0, width: 900, height: 1480 } },
];

const thumbs = [];
for (const sc of SCREENS) {
  let img = sharp(sc.src);
  if (sc.crop) img = img.extract(sc.crop);
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const band = sc.id === "gyms" ? secondBand(data, info.width, info.channels) : null;
  if (sc.id === "gyms") console.log("second card wash rows:", band);
  for (const s of SCHOOLS) {
    let out = s.n === "Harvard"
      ? data
      : recolor(data, info.width, info.height, info.channels, hex2hsl(s.p), hex2hsl(s.sec), band);
    let pipe = sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } });
    // the varsity header carries the crew's NAME baked in — patched per school
    if (sc.id === "vhome" && s.n !== "Harvard") {
      pipe = sharp(await pipe.png().toBuffer())
        .composite([{ input: `patches/${s.n.toLowerCase()}.png`, left: 0, top: 0 }]);
    }
    const file = `recolored/${sc.id}-${s.n.toLowerCase()}.webp`;
    await pipe.webp({ quality: 82 }).toFile(file);
    thumbs.push({ file, label: s.n, row: sc.id });
  }
  console.log(sc.id, "done");
}

// ── the review sheet: two rows of eight, labelled ──
const TW = 220, TH = Math.round(TW * 1480 / 900), PAD = 16, LABEL = 34;
const W = PAD + SCHOOLS.length * (TW + PAD);
const H = PAD + 2 * (TH + LABEL + PAD) + 30;
const comps = [];
let rowY = PAD + 30;
const svgText = [];
svgText.push(`<text x="${PAD}" y="${PAD + 12}" font-family="monospace" font-size="15" fill="#eee">THE REAL SCREENS, RECOLORED — top: student Gyms · bottom: varsity Home (top screen)</text>`);
for (const [ri, row] of ["gyms", "vhome"].entries()) {
  let x = PAD;
  for (const t of thumbs.filter((t) => t.row === row)) {
    comps.push({ input: await sharp(t.file).resize(TW, TH).png().toBuffer(), left: x, top: rowY + ri * (TH + LABEL + PAD) });
    if (ri === 0) svgText.push(`<text x="${x + TW / 2}" y="${rowY - 6}" text-anchor="middle" font-family="monospace" font-size="13" fill="#aaa">${t.label}</text>`);
    x += TW + PAD;
  }
}
comps.push({
  input: Buffer.from(`<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${svgText.join("")}</svg>`),
  left: 0, top: 0,
});
await sharp({ create: { width: W, height: H, channels: 3, background: "#111" } })
  .composite(comps)
  .png()
  .toFile("review-recolors.png");
console.log("review-recolors.png written");
