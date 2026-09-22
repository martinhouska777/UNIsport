/*
  Social profile pictures, drawn from the SAME mark as _icons.mjs.

  A profile picture is not an app icon. Two differences drive everything here:

    1. It is shown as a CIRCLE. The square icon centres the mark at 0.56 of the
       width, which is right when the corners are usable; inside a circle those
       corners are gone, so the mark is run larger (0.62) or it reads as a small
       thing floating in a big disc.
    2. It sits on a WHITE feed. The app icon's white ground was chosen knowing
       it can vanish into a pale wallpaper (_icons.mjs); on Instagram that is
       not a risk but a certainty — a white disc on a white feed has no edge.
       So the two coloured grounds below are offered as well. Owner picks.

  Colours are Zone 1 neutral brand only — a school's colours never enter the
  logo, because every university shares it.

  Run: node mockups/logo/_profile.mjs
*/
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(
  path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""),
  "../..",
);

const BLUE = "#1f32c1"; // brand blue, as in _icons.mjs
const NAVY = "#2f3b52"; // --primary
const PAGE = "#ebf0f6"; // --background, the Zone 1 page colour
// A lifted blue for the navy ground, made the way the theme system makes
// `primaryLive`: raised until it clears 3:1 on its own ground. #1f32c1 is far
// too close to NAVY in value to read against it.
const BLUE_LIFT = "#7d8df7";
const BLACK = "#000000";
// On pure black the brand blue is DIM — #1f32c1 clears only 2.3:1 against it,
// so the two halves stop reading as two people at feed size. These two are the
// same hue raised until they carry: "electric" keeps the brand's saturation
// (4.9:1), "lifted" is the same value as the navy ground's blue (7.0:1).
const BLUE_ELECTRIC = "#4d6bff";

// The mark, on a 100 x 100 box. `a` is the left person, `b` the right.
const mark = (a, b) => `
  <path d="M28 34 V56 Q28 82 50 82 H51" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="butt"/>
  <path d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="butt"/>
  <circle cx="28" cy="34" r="7" fill="${a}"/>
  <circle cx="72" cy="34" r="7" fill="${b}"/>
  <circle cx="28" cy="16" r="8.5" fill="${a}"/>
  <circle cx="72" cy="16" r="8.5" fill="${b}"/>`;

/* Square canvas, mark re-centred on its INK (x 21..79, y 7.5..89), not on its
   box — the same correction _icons.mjs makes. */
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

const SCALE = 0.62; // larger than the icon's 0.56, because the circle eats the corners

const OPTIONS = [
  { key: "a-white", label: "A — white", ground: "#ffffff", a: NAVY, b: BLUE },
  { key: "b-page",  label: "B — page blue-grey", ground: PAGE, a: NAVY, b: BLUE },
  { key: "c-navy",  label: "C — navy", ground: NAVY, a: "#ffffff", b: BLUE_LIFT },
  { key: "d-black-brand",    label: "D — black, brand blue", ground: BLACK, a: "#ffffff", b: BLUE },
  { key: "d-black-electric", label: "D — black, electric blue", ground: BLACK, a: "#ffffff", b: BLUE_ELECTRIC },
  { key: "d-black-lifted",   label: "D — black, lifted blue", ground: BLACK, a: "#ffffff", b: BLUE_LIFT },
];

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 1200, deviceScaleFactor: 1 });

const outDir = path.join(ROOT, "mockups/logo/profile");
mkdirSync(outDir, { recursive: true });

for (const opt of OPTIONS) {
  const svg = square(1080, { ...opt, scale: SCALE });
  await page.setContent(
    `<html><body style="margin:0;background:#fff">${svg}</body></html>`,
    { waitUntil: "load" },
  );
  const el = await page.$("svg");
  const shot = await el.screenshot({ omitBackground: true, type: "png" });
  const buf = await sharp(shot).ensureAlpha().png({ compressionLevel: 9 }).toBuffer();
  const out = path.join(outDir, `pfp-${opt.key}-1080.png`);
  writeFileSync(out, buf);
  console.log(`  ${path.relative(ROOT, out)}  1080x1080  ${buf.length} bytes`);
}

/* The contact sheet is the actual test: each option as a circle at the size
   Instagram really shows it — 176px on the profile, 40px in the feed and in
   comments — on the white the feed actually uses. */
const cells = OPTIONS.map((opt) => {
  const big = square(176, { ...opt, scale: SCALE });
  const small = square(40, { ...opt, scale: SCALE });
  return `<div class="cell">
    <div class="row">
      <div class="disc big">${big}</div>
      <div class="disc small">${small}</div>
      <div class="disc small">${small}</div>
    </div>
    <p>${opt.label} &nbsp;·&nbsp; ${opt.ground}</p>
  </div>`;
}).join("");

const sheet = `<html><body style="margin:0;background:#ffffff;font:14px/1.4 system-ui,sans-serif;color:#141618">
<div style="padding:40px 44px">
  <h1 style="font-size:19px;margin:0 0 6px">UNIsport profile picture — the grounds</h1>
  <p style="margin:0 0 30px;color:#4a4f58">Each shown as Instagram shows it: a circle at 176px (profile) and 40px (feed, comments), on the feed's white.</p>
  ${cells}
</div>
<style>
  .cell { margin-bottom: 34px; }
  .row { display:flex; align-items:center; gap:26px; }
  .disc { border-radius:50%; overflow:hidden; flex:none; box-shadow:0 0 0 1px rgba(20,22,24,0.10); }
  .disc svg { display:block; }
  .cell p { margin:12px 0 0; color:#4a4f58; }
</style>
</body></html>`;

await page.setContent(sheet, { waitUntil: "load" });
const body = await page.$("body > div");
const sheetBuf = await body.screenshot({ type: "png" });
const sheetOut = path.join(outDir, "contact-sheet.png");
writeFileSync(sheetOut, await sharp(sheetBuf).ensureAlpha().png({ compressionLevel: 9 }).toBuffer());
console.log(`  ${path.relative(ROOT, sheetOut)}`);

await browser.close();
