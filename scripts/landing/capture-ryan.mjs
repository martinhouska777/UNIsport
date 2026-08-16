// Re-shoots the three frames that carry the training partner's name, after the
// demo thread/log/plan moved from Elena to Ryan O'Neill:
//   04-plan-a-session.webp — the chat (a still)
//   tall-logsheet.webp     — the Log Session sheet opened on the squat session
//   tall-profile.webp      — the profile, cut just under the session calendar
//
// NOTE deliberately absent: the varsity home strip. It rides the SHOT DAY seed
// (db/seed_varsity_shotday.sql), which writes TODAY's lineup — re-shooting it
// on a different day than the seed run gives a home screen with no boats.
import puppeteer from "puppeteer-core";
import fs from "fs";
import sharp from "sharp";

const COOKIE = fs.readFileSync("session-cookie.txt", "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const W = 402, PHONE_H = 661, DSF = 3;
const OUT = "../../public/landing/";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
await page.setUserAgent(
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
);
await browser.setCookie({
  name: "sb-wavxyrgtaotrhnyepyor-auth-token",
  value: COOKIE, domain: "un-isport.vercel.app", path: "/",
  secure: true, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600,
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const phone = () => page.setViewport({ width: W, height: PHONE_H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
const tall = (h) => page.setViewport({ width: W, height: h, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });

/* ── 1. The chat with Ryan (04) ─────────────────────────────────────────── */
await phone();
await page.goto(BASE + "/messages", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3000);
const thread = await page.evaluate(() => {
  const el = [...document.querySelectorAll("a,button,[role=button]")].find((e) =>
    /ryan o'neill/i.test(e.textContent));
  if (el) { el.click(); return true; }
  return false;
});
if (!thread) throw new Error("no Ryan thread on the Messages list");
await wait(2500);
await page.screenshot({ path: "cap-ryan-chat.png" });
await sharp("cap-ryan-chat.png").resize({ width: 900 }).webp({ quality: 86 })
  .toFile(OUT + "04-plan-a-session.webp");
console.log("04-plan-a-session.webp re-shot");

/* ── 2. The log sheet (tall-logsheet) ───────────────────────────────────── */
// The squat session with Ryan is the "Legs, Calves" day — found by its label,
// not by computed date: the seed's now() is UTC, so the date shifts with the
// hour the seed was run, and the owner's own stray logs share nearby days.
await page.goto(BASE + "/profile", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3200);
const day = await page.evaluate(() => {
  const pick = [...document.querySelectorAll("button[aria-label]")].find((x) =>
    /^Legs, Calves on day \d+$/.test(x.getAttribute("aria-label") || ""));
  if (pick) { pick.click(); return pick.getAttribute("aria-label"); }
  return null;
});
await wait(1500);
console.log("day sheet:", day);
await page.evaluate(() => {
  // The day can hold more than one session; the beat wants the full squat
  // workout, so prefer the row that mentions Legs, else the wordiest one.
  const cands = [...document.querySelectorAll("button,[role=button],div[class*=cursor-pointer]")].filter(
    (e) => /^(Gym|Running|Cardio)/.test(e.textContent.trim()) && e.textContent.trim().length < 60);
  const pick = cands.find((e) => /legs/i.test(e.textContent)) ||
    cands.sort((a, b) => b.textContent.trim().length - a.textContent.trim().length)[0];
  pick?.click();
});
await wait(1600);
const edited = await page.evaluate(() => {
  const el = [...document.querySelectorAll("button")].find((b) => /edit session/i.test(b.textContent.trim()));
  if (el) { el.click(); return true; }
  return false;
});
console.log("edit sheet opened:", edited);
if (!edited) throw new Error("could not open the log sheet");
const partner = await page.evaluate(() =>
  [...document.querySelectorAll("*")].some((e) => e.children.length === 0 && /Ryan O'Neill/.test(e.textContent)));
console.log("partner shows Ryan:", partner);
await tall(2000);
await wait(1600);
await page.screenshot({ path: "cap-logsheet-tall.png" });

/* ── 3. The profile strip (tall-profile) ────────────────────────────────── */
await phone();
await page.goto(BASE + "/profile", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3200);
await tall(2400);
await wait(1800);
const m = await page.evaluate(() => {
  const all = [...document.querySelectorAll("body *")];
  const cal = all.find((el) => el.children.length === 0 &&
    el.textContent.trim().toLowerCase().startsWith(
      new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toLowerCase()));
  let box = cal;
  while (box && !box.className?.toString?.().includes("border-b")) box = box.parentElement;
  return { calendarBottom: box ? Math.round(box.getBoundingClientRect().bottom + window.scrollY) : null };
});
console.log("calendar bottom (css px):", m.calendarBottom);
await page.screenshot({ path: "cap-profile-tall.png" });
await browser.close();

/* ── frames from the captures ───────────────────────────────────────────── */
// logsheet: resize, then cut the dead air (same recipe as make-frames.mjs)
const { execSync } = await import("node:child_process");
execSync(`node make-frames.mjs cap-logsheet-tall.png ${OUT}tall-logsheet.webp`, { stdio: "inherit" });

// profile: resize and cut just under the calendar
const resized = await sharp("cap-profile-tall.png").resize({ width: 900 }).png().toBuffer();
const meta = await sharp(resized).metadata();
const cutAt = Math.min(meta.height, Math.round((m.calendarBottom + 10) * (900 / W)));
await sharp(resized).extract({ left: 0, top: 0, width: 900, height: cutAt })
  .webp({ quality: 86 }).toFile(OUT + "tall-profile.webp");
console.log(`tall-profile.webp  900x${cutAt}`);
