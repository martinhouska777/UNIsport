// Screenshots the RUNNING page (npm run dev must be up) into a PNG, so a
// change to the landing can be looked at rather than reasoned about. Real
// headless Chrome, the same one make-og.mjs drives.
//
//   node scripts/landing/shot.mjs out.png [width] [height] [url] [scrollY]
//   PHONE_MODE=light node scripts/landing/shot.mjs out.png 1440 900
//
// PHONE_MODE (light|dark) presets the landing's phone-screen switch, which
// otherwise follows the machine's own colour scheme.
import puppeteer from "puppeteer-core";

const OUT = process.argv[2];
const W = Number(process.argv[3] || 1440);
const H = Number(process.argv[4] || 900);
const URL = process.argv[5] || "http://localhost:3000/";
const SCROLL = Number(process.argv[6] || 0);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run", "--hide-scrollbars"],
});
const page = await browser.newPage();
const MODE = process.env.PHONE_MODE;
if (MODE) await page.evaluateOnNewDocument((m) => { try { localStorage.setItem("uniLandingPhoneMode", m); } catch {} }, MODE);
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
if (SCROLL) {
  await page.evaluate((y) => window.scrollTo(0, y), SCROLL);
  await new Promise((r) => setTimeout(r, 700));
}
// WAIT_MS holds before the shot — the intro's backdrop cycles through the
// schools, so this is how you photograph a school other than the first.
await new Promise((r) => setTimeout(r, Number(process.env.WAIT_MS || 600)));
await page.screenshot({ path: OUT });
await browser.close();
console.log("wrote", OUT);
