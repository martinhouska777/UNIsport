// Renders the TEAM INVITE link card (public/og-team.png, 1200×630) — what a
// pasted /join/<code> link shows in WhatsApp / iMessage: UNIsport, the team's
// mark (the oars crossed behind the shield) and "Join Harvard Rowing".
//
// Like make-og.mjs it is a SCREENSHOT of the real page, not a drawing: the
// invite page itself, signed out, with the parts a preview can't use taken out
// (the back arrow and the two buttons — nobody can tap a picture) and the rest
// shown larger. Owner, 2026-10-11: "Put there the Harvard shield with the oars."
//
// It needs a LIVE invite code (an expired one shows "This link doesn't work"):
//
//   node scripts/landing/make-og-team.mjs <CODE>
//   node scripts/landing/make-og-team.mjs <CODE> http://localhost:3000
//
// One picture for every invite while the app is pinned to Harvard
// (LIVE_UNIVERSITY in lib/themes.ts). A second school's team needs its own.
// After re-making it, bump `teamInviteImage`'s ?v= in app/join/[code]/layout.tsx.
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, "../../public/og-team.png");
const CODE = process.argv[2];
const SITE = process.argv[3] ?? "https://getunisport.com";
if (!CODE) {
  console.error("Usage: node scripts/landing/make-og-team.mjs <live invite code> [site]");
  process.exit(1);
}

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
await page.goto(`${SITE}/join/${CODE}`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await page.waitForFunction(() => /Join /.test(document.querySelector("h1")?.textContent ?? ""), {
  timeout: 20_000,
});

await page.evaluate(() => {
  // Everything you'd tap goes — except the UNIsport name, which is a link too.
  for (const el of document.querySelectorAll("a, button")) {
    if (!/UNI/.test(el.textContent ?? "")) el.style.display = "none";
  }
  // The column stands in the middle of the card at nearly twice its size.
  const column = document.querySelector("h1")?.parentElement;
  if (column) {
    column.style.zoom = "1.75";
  }
});
await new Promise((r) => setTimeout(r, 1500));

const png = await page.screenshot({ type: "png" });
await browser.close();
await sharp(png).resize({ width: 1200, height: 630 }).png({ compressionLevel: 9 }).toFile(OUT);
console.log("wrote", OUT, fs.statSync(OUT).size, "bytes from", `${SITE}/join/${CODE}`);
