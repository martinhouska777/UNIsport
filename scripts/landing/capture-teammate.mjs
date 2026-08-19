// Re-shoots the ONE frame the squad beat (V7) needs: a teammate's training
// month, opened from the varsity Roster.
//
//   node capture-teammate.mjs               # → public/landing/11-varsity-teammate.webp
//   node capture-teammate.mjs --mode dark   # → public/landing/dark/…
//
// Both modes must be run: the landing's light/dark pill asks for the dark twin
// by path (shotSrc in components/landing/PhoneMode.tsx) and has no fallback, so
// a beat with only a light frame is a broken image the moment anyone flips it.
//
// The frame that exists today is a DARK capture from the old shot day sitting
// in the LIGHT folder, which is why the beat has never shipped.
//
// Everything here matches capture-light.mjs: same canvas (402x661 @3x), same
// cookie transplant, same theme planted before the first load, same 900-wide
// webp out. The teammate is George Farkas — the same one the original shot
// used (scripts/landing/capture.mjs), so the screen is the one the beat's
// copy was written against.
//
// NOTE: the numbers on this screen are a LIVE month. Re-shooting on a
// different day moves the highlighted date and changes consistency / hours /
// extra sessions, so the beat's sub-line in lib/landingCopy.ts must be read
// off the new frame rather than assumed.
import puppeteer from "puppeteer-core";
import fs from "fs";
import sharp from "sharp";

const MODE = process.argv.includes("--mode") ? process.argv[process.argv.indexOf("--mode") + 1] : "light";
if (MODE !== "light" && MODE !== "dark") throw new Error("--mode light|dark");

const TEAMMATE = "George Farkas";
const NAME = "11-varsity-teammate";
const COOKIE = fs.readFileSync("session-cookie.txt", "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const W = 402, PHONE_H = 661, DSF = 3;
const OUT = MODE === "dark" ? "../../public/landing/dark/" : "../../public/landing/";
fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: PHONE_H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
await page.setUserAgent(
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
);
await browser.setCookie({
  name: "sb-wavxyrgtaotrhnyepyor-auth-token",
  value: COOKIE, domain: "un-isport.vercel.app", path: "/",
  secure: true, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600,
});
await page.evaluateOnNewDocument((mode) => {
  try { window.localStorage.setItem("uniThemeMode", mode); } catch {}
}, MODE);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

await page.goto(BASE + "/varsity/team", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3500);

// The roster is a list of rows; the name is a leaf node inside one of them.
const opened = await page.evaluate((who) => {
  const el = [...document.querySelectorAll("*")].find(
    (e) => e.textContent.trim() === who && e.children.length === 0,
  );
  if (!el) return false;
  el.closest("button,div")?.click();
  return true;
}, TEAMMATE);
if (!opened) {
  await browser.close();
  throw new Error(`could not find "${TEAMMATE}" in the roster — is the session live?`);
}
await wait(2200);

// Bring the training month to the top of the phone, the way the old frame had it.
await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find(
    (e) => /^TRAINING$/i.test(e.textContent.trim()),
  );
  if (el) el.scrollIntoView({ block: "start" });
});
await wait(900);

// What the screen actually says, so the beat's copy can be written off the
// frame instead of off the last one.
const numbers = await page.evaluate(() => {
  const txt = document.body.innerText.replace(/\s+/g, " ");
  const grab = (label) => {
    const m = txt.match(new RegExp(`([0-9][0-9a-z%: ]*?)\s*${label}`, "i"));
    return m ? m[1].trim() : "?";
  };
  return {
    consistency: grab("CONSISTENCY"),
    trained: grab("TRAINED"),
    extra: grab("EXTRA"),
    month: (txt.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December) 20\d\d\b/) || [])[0] || "?",
  };
});

await page.screenshot({ path: `cap-${NAME}.png` });
await sharp(`cap-${NAME}.png`).resize({ width: 900 }).webp({ quality: 86 }).toFile(OUT + NAME + ".webp");
fs.unlinkSync(`cap-${NAME}.png`);
console.log(`${OUT}${NAME}.webp  (${MODE})`);
console.log("on screen:", JSON.stringify(numbers));

await browser.close();
