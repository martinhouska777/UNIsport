// Renders the social card (public/og.png, 1200×630) — what a pasted link
// shows in iMessage / WhatsApp / Slack / X, and the picture Google puts beside
// a search result.
//
// It is a SCREENSHOT OF THE REAL LANDING, not a drawing of it. Until
// 2026-10-11 this file drew its own card in the landing's first, dark look —
// and when the landing went light the card stayed dark, so every shared link
// showed a website that no longer existed (owner: "it shows you the preview of
// the old website, which we don't have anymore"). A screenshot can't drift.
//
// Re-run after the landing's first screen changes, then commit public/og.png:
//
//   node scripts/landing/make-og.mjs                       # the live site
//   node scripts/landing/make-og.mjs http://localhost:3000 # a local build
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../public/og.png");
const SITE = process.argv[2] ?? "https://getunisport.com";

// The page is laid out at 1600×840 (the card's own 1.9 : 1, so the hero sits
// as it does on a laptop), then cut to the first screen without the top bar
// and the side margins: headline, the three doors, the phones and the shields.
const VIEW = { width: 1600, height: 840 };
const CLIP = { x: 150, y: 105, width: 1300, height: 682 };

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
// One CSS pixel = one pixel, so CLIP is in the screenshot's own pixels. The
// 1300-wide cut is shrunk to 1200, so it is still sharp.
await page.setViewport({ ...VIEW, deviceScaleFactor: 1 });
// Light, and still: the school cycle and the entrance motion hold their first
// frame, so the card is Harvard's crimson every time it is made.
await page.emulateMediaFeatures([
  { name: "prefers-reduced-motion", value: "reduce" },
  { name: "prefers-color-scheme", value: "light" },
]);
await page.goto(SITE, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
// The two phones hold one screen per school, stacked, and only the shown one
// fades in once it has loaded — they arrive late, and were
// shot blank without this. Wait until both phones show a loaded screen.
await page.waitForFunction(
  () => {
    const shown = [...document.images].filter(
      (img) =>
        img.complete && img.naturalWidth > 0 && getComputedStyle(img).opacity === "1",
    );
    const has = (name) => shown.some((img) => (img.currentSrc || img.src).includes(name));
    return has("closers%2Fgyms-") && has("closers%2Fmatch-");
  },
  { timeout: 30_000 },
);
await new Promise((r) => setTimeout(r, 2500));
// The whole window, cut afterwards: asking Chrome for a `clip` re-lays the page
// out for the shot, and the tilted back phone then came out blank.
const png = await page.screenshot({ type: "png" });
await browser.close();

await sharp(png)
  .extract({ left: CLIP.x, top: CLIP.y, width: CLIP.width, height: CLIP.height })
  .resize({ width: 1200, height: 630 })
  .png({ compressionLevel: 9 })
  .toFile(OUT);
console.log("wrote", OUT, fs.statSync(OUT).size, "bytes from", SITE);
