// PROVISIONAL dark twins for every capture the landing shows — until the real
// dark screens are shot from the app.
//
// The page's light/dark switch (components/landing/PhoneMode.tsx) expects,
// for each /landing/<x>.webp, a /landing/dark/<x>.webp. The real ones come
// from the app itself: `node capture-light.mjs --mode dark` (needs the owner's
// login — save-cookie.mjs), then the closers' recolour pass on the dark base
// (recolor-shots.mjs / patch-gyms.mjs). Until then this writes stand-ins
// derived from the light captures.
//
// How: the NEUTRAL parts of the screen — white ground, grey text, dark ink —
// are inverted (white → near-black, ink → white); every SATURATED pixel is
// kept exactly as it is, so crimson stays crimson, Yale stays blue, the
// emojis, stars and green ticks keep their colours (owner, 2026-08-18: "stick
// with the light mode crimson red and emojis normal colour"). Neutral pixels
// sitting inside a coloured area (the white label on a crimson button) are
// kept too, by reading the colour of their neighbourhood.
//
//   node dark-placeholders.mjs            # writes public/landing/dark/**
//
// Re-running overwrites; the real captures simply replace these files.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("../../public/landing");
const OUT = path.join(ROOT, "dark");

// Only what the site references (lib/landingCopy.ts beats + coach steps +
// the two closers). The old-shot-day files (05, 06, 08–12) are not used.
const stills = [
  "01-gyms", "02-match", "03-why-you-match", "04-plan-a-session",
  "tall-logsheet", "tall-profile", "tall-vhome", "13-varsity-log-list",
  "14-varsity-calendar", "tall-vprofile",
  "coach-1-create", "coach-2-build", "coach-3-plan", "coach-4-lineup", "coach-5-notes",
];
const closers = fs.readdirSync(path.join(ROOT, "closers")).filter((f) => f.endsWith(".webp"));

fs.mkdirSync(path.join(OUT, "closers"), { recursive: true });

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

// Separable box blur on a float map.
function boxBlur(src, W, H, R) {
  const tmp = new Float32Array(W * H), out = new Float32Array(W * H);
  const n = 2 * R + 1;
  for (let y = 0; y < H; y++) {
    let acc = 0;
    for (let x = -R; x <= R; x++) acc += src[y * W + Math.min(W - 1, Math.max(0, x))];
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / n;
      acc += src[y * W + Math.min(W - 1, x + R + 1)] - src[y * W + Math.max(0, x - R)];
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0;
    for (let y = -R; y <= R; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / n;
      acc += tmp[Math.min(H - 1, y + R + 1) * W + x] - tmp[Math.max(0, y - R) * W + x];
    }
  }
  return out;
}

async function twin(src, dst) {
  const base = sharp(src);
  const { data: o, info } = await base.clone().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data: n } = await base.clone().negate({ alpha: false }).modulate({ hue: 180 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const N = W * H;

  // 1. how coloured is each pixel (chroma) → 0..1 "keep" weight
  const sat = new Float32Array(N);
  for (let p = 0, i = 0; p < N; p++, i += C) {
    const r = o[i], g = o[i + 1], b = o[i + 2];
    const s = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    sat[p] = clamp01((s - 0.2) / 0.2);
  }
  // 2. how coloured is the neighbourhood (so white text on a crimson button
  //    stays white, while a white gap between two thin red strokes does not)
  const near = boxBlur(sat, W, H, Math.max(2, Math.round(W / 150)));

  const out = Buffer.alloc(N * C);
  for (let p = 0, i = 0; p < N; p++, i += C) {
    const k = Math.max(sat[p], smooth(0.3, 0.52, near[p]));
    out[i] = o[i] * k + n[i] * (1 - k);
    out[i + 1] = o[i + 1] * k + n[i + 1] * (1 - k);
    out[i + 2] = o[i + 2] * k + n[i + 2] * (1 - k);
    out[i + 3] = 255;
  }
  await sharp(out, { raw: { width: W, height: H, channels: C } }).webp({ quality: 86 }).toFile(dst);
  console.log(path.relative(ROOT, dst));
}

for (const nm of stills) await twin(path.join(ROOT, nm + ".webp"), path.join(OUT, nm + ".webp"));
for (const f of closers) await twin(path.join(ROOT, "closers", f), path.join(OUT, "closers", f));
console.log(`\n${stills.length + closers.length} provisional dark frames. Replace with real captures when possible.`);
