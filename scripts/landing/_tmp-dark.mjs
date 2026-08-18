// screenshots with the phone-mode toggle set to dark; desktop + phone
import puppeteer from "puppeteer-core";
import fs from "node:fs";
const URL = process.argv[2] || "http://localhost:3000/";
const OUT = "C:/Users/marti/AppData/Local/Temp/claude/C--01business-UNIsport/5fe704a9-1ba4-4d9b-81d8-2bf0ee18e900/scratchpad/shots2";
fs.mkdirSync(OUT, { recursive: true });
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--disable-gpu", "--no-first-run"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const [tag, phone] of [["dd", false], ["dp", true]]) {
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(180000);
  if (phone) await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  else await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await wait(8000);
  await page.evaluate(() => (document.documentElement.style.scrollBehavior = "auto"));
  const shot = (n) => page.screenshot({ path: `${OUT}/${tag}-${n}.png` });
  // click dark
  await page.evaluate(() => document.querySelector('button[aria-label="Dark phone screens"]').click());
  await wait(1500);
  const state = await page.evaluate(() => ({ attr: document.querySelector("[data-phone-mode]")?.getAttribute("data-phone-mode"), firstSrc: document.querySelector("#story1 img")?.currentSrc?.slice(-60), screenBg: getComputedStyle(document.querySelector("#story1 .ls-shots")).backgroundColor, ls: localStorage.getItem("uniLandingPhoneMode") }));
  console.log(tag, JSON.stringify(state));
  await shot("00-top");
  for (const [sid, b] of [["story1", 0], ["story1", 4], ["story2", 3]]) {
    await page.evaluate((sid, b) => { const m = document.querySelector(`#${sid} .ls-marker[data-i="${b}"]`); window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2); }, sid, b);
    await wait(1500);
    await shot(`${sid}-${b}`);
  }
  for (const id of ["campus-colours", "blade-lock"]) {
    await page.evaluate((id) => { const el = document.getElementById(id); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + window.innerHeight * 0.4); }, id);
    await wait(3500);
    await shot(id);
  }
  await page.evaluate(() => { const el = document.getElementById("coaches"); window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY + 500); });
  await wait(3000);
  await shot("coach");
  // toggle back to light and confirm src flips
  await page.evaluate(() => document.querySelector('button[aria-label="Light phone screens"]').click());
  await wait(800);
  console.log(tag, "back:", await page.evaluate(() => document.querySelector("[data-phone-mode]")?.getAttribute("data-phone-mode")));
  await page.close();
}
await browser.close();
