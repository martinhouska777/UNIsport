/*
  Builds every icon file the app ships, from one drawing of the mark.

  The mark: a U split down the middle, so each half is one person — own leg,
  own head. Neutral brand colours only (rule: a school's colours never enter
  the logo, because every university shares it).

  A white ground and the mark in its two colours (owner, 2026-09-19). That is
  what lets the split read: one person navy, one blue, which is the whole idea
  of the mark. Both sit above 9:1 on white, so it survives 16 px.

  The cost of a white icon is that it can vanish into a pale home-screen
  wallpaper, where a coloured ground would hold its edge. That is the trade
  the owner chose.

  icon-512 is declared "maskable" in app/manifest.ts, so Android may crop it
  to a circle: its mark is held inside the safe zone. The favicon and the
  Apple touch icon are never cropped that hard, so they can run larger.

  Run: node mockups/logo/_icons.mjs
*/
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");

const BLUE = "#1f32c1";
const INK = "#141618";
const NAVY = "#2f3b52";

// The mark, on a 100 x 100 box. `a` is the left person, `b` the right.
const mark = (a, b) => `
  <path d="M28 34 V56 Q28 82 50 82 H51" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="butt"/>
  <path d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="butt"/>
  <circle cx="28" cy="34" r="7" fill="${a}"/>
  <circle cx="72" cy="34" r="7" fill="${b}"/>
  <circle cx="28" cy="16" r="8.5" fill="${a}"/>
  <circle cx="72" cy="16" r="8.5" fill="${b}"/>`;

/* A square icon: solid ground, mark centred at `scale` of the width.
   The mark's own box is 100 wide but its ink runs roughly x 21..79,
   y 7.5..89, so it is re-centred on its ink, not on its box. */
function square(px, { ground, a, b, scale }) {
  const inkW = 58, inkH = 81.5, inkCx = 50, inkCy = 48.25;
  const s = (px * scale) / Math.max(inkW, inkH);
  const tx = px / 2 - inkCx * s;
  const ty = px / 2 - inkCy * s;
  return `<svg width="${px}" height="${px}" viewBox="0 0 ${px} ${px}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${px}" height="${px}" fill="${ground}"/>
    <g transform="translate(${tx.toFixed(3)} ${ty.toFixed(3)}) scale(${s.toFixed(5)})">${mark(a, b)}</g>
  </svg>`;
}

const ON_WHITE = { ground: "#ffffff", a: NAVY, b: BLUE };

const JOBS = [
  { file: "public/icons/icon-192.png", px: 192, scale: 0.56, ...ON_WHITE },
  { file: "public/icons/icon-512.png", px: 512, scale: 0.56, ...ON_WHITE },
  { file: "public/icons/apple-touch-icon.png", px: 180, scale: 0.68, ...ON_WHITE },
  // favicon slices — never masked, so the mark can run larger
  { file: null, px: 16, scale: 0.78, ...ON_WHITE },
  { file: null, px: 32, scale: 0.78, ...ON_WHITE },
  { file: null, px: 48, scale: 0.78, ...ON_WHITE },
];

/* Chrome writes an opaque screenshot as a 3-channel PNG. Next's ICO decoder
   only accepts RGBA inside an .ico and fails the whole build otherwise —
   which is exactly how the first version of this file broke production. Force
   the alpha channel on every slice so the format is never in question. */
const toRGBA = (buf) => sharp(buf).ensureAlpha().png({ compressionLevel: 9 }).toBuffer();

/* ICO is a tiny container: a header, one 16-byte directory entry per image,
   then the images themselves. Every browser in use reads PNG inside ICO, so
   we embed the PNGs we already rendered rather than encoding BMP by hand. */
function ico(pngs) {
  const count = pngs.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // 1 = icon
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  pngs.forEach(({ px, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(px >= 256 ? 0 : px, o);       // width  (0 means 256)
    dir.writeUInt8(px >= 256 ? 0 : px, o + 1);   // height
    dir.writeUInt8(0, o + 2);                    // palette size
    dir.writeUInt8(0, o + 3);                    // reserved
    dir.writeUInt16LE(1, o + 4);                 // colour planes
    dir.writeUInt16LE(32, o + 6);                // bits per pixel
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...pngs.map((p) => p.data)]);
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 800, height: 800, deviceScaleFactor: 1 });

const icoParts = [];
for (const job of JOBS) {
  const svg = square(job.px, job);
  await page.setContent(
    `<html><body style="margin:0;background:#fff">${svg}</body></html>`,
    { waitUntil: "load" }
  );
  const el = await page.$("svg");
  const shot = await el.screenshot({ omitBackground: true, type: "png" });
  const buf = await toRGBA(shot);
  if (job.file) {
    const out = path.join(ROOT, job.file);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, buf);
    console.log(`  ${job.file}  ${job.px}x${job.px}  ${buf.length} bytes`);
  } else {
    icoParts.push({ px: job.px, data: buf });
  }
}
const icoPath = path.join(ROOT, "app/favicon.ico");
const icoBuf = ico(icoParts);
writeFileSync(icoPath, icoBuf);
console.log(`  app/favicon.ico  16+32+48  ${icoBuf.length} bytes`);

await browser.close();
