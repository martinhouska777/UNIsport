// THE PER-SCHOOL SCREENS, SHOT FROM THE REAL APP — for the two closers' phones
// (Campus Colours: gyms-*, Blade Lock: vhome-*) and the intro's two backdrop
// phones (gyms-* and match-*). Writes public/landing/closers/{gyms,match,vhome}-<school>.webp.
//
//   node capture-schools.mjs                 # all eight schools, all three screens
//   node capture-schools.mjs --only=yale     # one school
//   node capture-schools.mjs --screen=match  # one screen, every school
//
// WHY THIS REPLACES recolor-shots.mjs + patch-gyms.mjs + patch-match.mjs + patch-vhead.mjs
// (owner, 2026-09-16: "make sure the screens are accurate to the real thing …
// use it for the static images as well and make the colors change accordingly").
// Those four shifted crimson pixels into each school's hue and then painted
// the school's gym names over the Harvard ones at hand-measured pixel rows —
// geometry that went stale with every redesign. The app itself is white-label:
// lib/themes.ts holds all eight schools' palettes, lib/gyms.ts their real gyms,
// and the Settings switcher's choice (localStorage "unisport.university") wins
// over the signed-in address (components/AppState.tsx). So this plants that
// key before each load and photographs the REAL screen: the school's colour on
// every token, its own gyms on the Gyms tab, "<School> Rowing" in the varsity
// bar (VarsityTopBar reads the university's shortName), its crest in its colour.
//
// The one thing the app cannot know is where the demo STUDENTS live — they are
// Harvard accounts in the database — so on the Match screen their houses and
// the "Malkin Athletic Center" chip are swapped in the DOM for the school's own
// residences and gym (school-residences.mjs, copied from lib/gyms.ts) just
// before the shot. Text nodes only; the layout reflows exactly as the app would
// for a real student in that house.
//
// The vhome closer capture stops ABOVE the tab bar (BladeLock and the intro
// draw VarsityTabBar over the bottom 12%), so it is shot on a tall viewport
// and cut to the top 1480 rows, the same cut recolor-shots.mjs made.
import puppeteer from "puppeteer-core";
import fs from "fs";
import sharp from "sharp";
import { SCHOOL_PEOPLE } from "./school-residences.mjs";

const COOKIE = fs.readFileSync("session-cookie.txt", "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const W = 402, PHONE_H = 661, TALL_H = 2000, DSF = 3;
const OUT = "../../public/landing/closers/";
fs.mkdirSync(OUT, { recursive: true });

const SCHOOLS = ["harvard", "yale", "princeton", "penn", "brown", "columbia", "cornell", "dartmouth"];
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const SCREEN = (process.argv.find((a) => a.startsWith("--screen=")) || "").slice(9);
const schools = ONLY ? SCHOOLS.filter((s) => s === ONLY) : SCHOOLS;
const wantScreen = (s) => !SCREEN || SCREEN === s;
if (!schools.length) throw new Error(`unknown school "${ONLY}"`);

/* What the Harvard demo students say on the Match screen today (02-match,
   2026-09-16): four houses in the "<year> · <house> · <style>" sub-lines and
   one gym chip. Swapped by position for each school's four residences + gym. */
const HARVARD_HOUSES = ["Quincy", "Lowell", "Weld", "Hollis"];
const HARVARD_GYM = "Malkin Athletic Center";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
await browser.setCookie({
  name: "sb-wavxyrgtaotrhnyepyor-auth-token",
  value: COOKIE, domain: "un-isport.vercel.app", path: "/",
  secure: true, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600,
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/*
  THE SHOT CLOCK. `SHOT_HOUR=16 node capture-schools.mjs` makes the page
  believe it is 4 PM today (real date, chosen hour), so a Gyms screen shot at
  night does not read "Closed · opens 7am" on every card. Nothing but the
  page's own clock changes — the same screen a student sees at 4 PM.
*/
async function setShotClock(page) {
  const hour = Number(process.env.SHOT_HOUR);
  if (!Number.isFinite(hour)) return;
  await page.evaluateOnNewDocument((h) => {
    const Real = Date;
    const now = new Real();
    const offset = new Real(now.getFullYear(), now.getMonth(), now.getDate(), h, 0, 0).getTime() - now.getTime();
    const Shot = function (...a) { return a.length ? new Real(...a) : new Real(Real.now() + offset); };
    Shot.prototype = Real.prototype;
    Shot.now = () => Real.now() + offset;
    Shot.parse = Real.parse;
    Shot.UTC = Real.UTC;
    window.Date = Shot;
  }, hour);
}

async function newPage(school) {
  const page = await browser.newPage();
  await page.setUserAgent(
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
  );
  await page.evaluateOnNewDocument((key) => {
    try {
      window.localStorage.setItem("uniThemeMode", "light");
      window.localStorage.setItem("unisport.university", key);
    } catch {}
  }, school);
  await setShotClock(page);
  await page.setViewport({ width: W, height: PHONE_H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
  return page;
}
const tall = (page) => page.setViewport({ width: W, height: TALL_H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });

/* The first-run tour opens over whatever loads in a fresh profile (see
   capture-light.mjs). Its Skip writes the seen-flag to localStorage, which the
   whole browser context then shares, so this runs once. */
async function dismissTour(page) {
  await page.goto(BASE + "/gyms", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(4000);
  const skipped = await page.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find((b) => /^(skip|close)$/i.test(b.textContent.trim()));
    if (el) { el.click(); return el.textContent.trim(); }
    return null;
  });
  console.log(skipped ? `tour dismissed (${skipped})` : "no tour");
  await wait(1200);
}

async function save(buf, file, crop) {
  let img = sharp(buf).resize({ width: 900 });
  if (crop) img = sharp(await img.png().toBuffer()).extract({ left: 0, top: 0, width: 900, height: crop });
  await img.webp({ quality: 86 }).toFile(OUT + file);
  console.log("  " + file);
}

let first = true;
const sheet = [];
for (const school of schools) {
  const page = await newPage(school);
  if (first) { await dismissTour(page); first = false; }
  console.log(school);

  if (wantScreen("gyms")) {
    await page.goto(BASE + "/gyms", { waitUntil: "networkidle2", timeout: 45000 });
    await wait(3500);
    const firstGym = await page.evaluate(() => document.body.innerText.match(/MAIN GYMS\s+([^\n]+)/)?.[1]);
    console.log("  first gym:", firstGym);
    await save(await page.screenshot(), `gyms-${school}.webp`);
  }

  if (wantScreen("match")) {
    await page.goto(BASE + "/match", { waitUntil: "networkidle2", timeout: 45000 });
    await wait(3500);
    if (school !== "harvard") {
      const sc = SCHOOL_PEOPLE.find((p) => p.key === school);
      const swapped = await page.evaluate((from, to, gymFrom, gymTo) => {
        let n = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        for (const node of nodes) {
          let t = node.nodeValue;
          if (!t || !t.trim()) continue;
          let changed = false;
          if (t.includes(gymFrom)) { t = t.split(gymFrom).join(gymTo); changed = true; }
          from.forEach((h, i) => {
            const re = new RegExp(`\\b${h}\\b`, "g");
            if (re.test(t)) { t = t.replace(re, to[i]); changed = true; }
          });
          if (changed) { node.nodeValue = t; n++; }
        }
        return n;
      }, HARVARD_HOUSES, sc.residences, HARVARD_GYM, sc.gym);
      console.log(`  match: ${swapped} text nodes swapped → ${sc.residences.join(", ")} · ${sc.gym}`);
      if (swapped < 4) console.warn("  !! fewer swaps than the four houses — the Match cards changed?");
      await wait(300);
    }
    await save(await page.screenshot(), `match-${school}.webp`);
  }

  if (wantScreen("vhome")) {
    await page.goto(BASE + "/varsity/home", { waitUntil: "networkidle2", timeout: 45000 });
    await wait(3500);
    const bar = await page.evaluate(() => document.body.innerText.match(/\n([A-Za-z]+ Rowing)\n/)?.[1]);
    console.log("  varsity bar:", bar);
    await tall(page);
    await wait(1800);
    await save(await page.screenshot(), `vhome-${school}.webp`, 1480);
  }

  sheet.push(school);
  await page.close();
}
await browser.close();

/* A review sheet: one row per screen, one column per school. */
const TW = 200, TH = Math.round(TW * 1480 / 900), PAD = 12, LABEL = 26;
const rows = ["gyms", "match", "vhome"].filter(wantScreen);
const SW = PAD + sheet.length * (TW + PAD), SH = LABEL + rows.length * (TH + PAD) + PAD;
const comps = [];
for (const [ri, row] of rows.entries()) {
  for (const [ci, school] of sheet.entries()) {
    const f = OUT + `${row}-${school}.webp`;
    if (!fs.existsSync(f)) continue;
    comps.push({ input: await sharp(f).resize(TW, TH).png().toBuffer(), left: PAD + ci * (TW + PAD), top: LABEL + ri * (TH + PAD) });
  }
}
const labels = sheet.map((s, ci) =>
  `<text x="${PAD + ci * (TW + PAD) + TW / 2}" y="18" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#ddd">${s}</text>`).join("");
comps.push({ input: Buffer.from(`<svg width="${SW}" height="${SH}" xmlns="http://www.w3.org/2000/svg">${labels}</svg>`), left: 0, top: 0 });
const sheetFile = process.env.SHEET_OUT || "review-schools.png";
await sharp({ create: { width: SW, height: SH, channels: 3, background: "#222" } }).composite(comps).png().toFile(sheetFile);
console.log("review sheet:", sheetFile);
