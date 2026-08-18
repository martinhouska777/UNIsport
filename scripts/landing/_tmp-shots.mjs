// usage: node _tmp-shots.mjs <url> <tag> [phone]
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const URL = process.argv[2] || "http://localhost:3000/";
const TAG = process.argv[3] || "x";
const PHONE = process.argv[4] === "phone";
const OUT = "C:/Users/marti/AppData/Local/Temp/claude/C--01business-UNIsport/5fe704a9-1ba4-4d9b-81d8-2bf0ee18e900/scratchpad/shots2";
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--disable-gpu", "--no-first-run"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const page = await browser.newPage();
page.setDefaultNavigationTimeout(180000);
if (PHONE) await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "domcontentloaded" });
await wait(9000);
await page.evaluate(() => (document.documentElement.style.scrollBehavior = "auto"));
const shot = (n) => page.screenshot({ path: `${OUT}/${TAG}-${n}.png` });
await shot("00-top");
if (!PHONE) { await page.evaluate(() => window.scrollTo(0, 700)); await wait(600); await shot("01-hero2"); }
for (const id of ["campus-colours", "blade-lock"]) {
  await page.evaluate((id) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.4); }, id);
  await wait(3500);
  await shot(id);
  if (PHONE) { await page.evaluate(() => window.scrollBy(0, 700)); await wait(800); await shot(id + "-b"); }
}
await page.evaluate(() => { const el = document.getElementById("coaches"); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + el.offsetHeight - window.innerHeight); });
await wait(2500);
await shot("coach-end");
await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
await wait(1000);
await shot("99-bottom");
console.log("done");
await browser.close();
