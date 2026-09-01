// Re-shoots EVERY frame the scroll story uses, in the app's LIGHT mode (the
// default) or its DARK mode (`--mode dark`) — the app keys its palette off
// localStorage.uniThemeMode, which is planted before any page loads. Run
// db/seed_varsity_shotday.sql first (with the session clock in the owner's
// timezone) so Varsity Home has the four and the pair.
//
//   node capture-light.mjs               # → public/landing/        (light)
//   node capture-light.mjs --mode dark   # → public/landing/dark/   (dark)
//   node capture-light.mjs --only=match  # just that one frame, the rest untouched
//
// --only exists for the same reason recolor-shots.mjs has one: a frame here is
// NOT the end of the line. 01-gyms is composited on afterwards by patch-gyms.mjs
// and 02-match by patch-match.mjs, both against geometry MEASURED on the file
// that is there now. Re-shooting a frame nobody asked about silently throws
// that work away, so a run does exactly the frames it is asked for.
//
// The landing's light/dark switch (components/landing/PhoneMode.tsx) shows
// the dark folder's twin of each light frame; until this has been run in
// dark mode that folder holds stand-ins from dark-placeholders.mjs.
//
// Frames written:
//   stills  01-gyms, 02-match, 03-why-you-match (Ryan), 04-plan-a-session,
//           13-varsity-log-list, 15-varsity-board (driven: Team → Workouts → tap)
//   strips  tall-logsheet, tall-profile, tall-vhome, tall-vprofile
import puppeteer from "puppeteer-core";
import fs from "fs";
import sharp from "sharp";
import { execSync } from "node:child_process";

const MODE = process.argv.includes("--mode") ? process.argv[process.argv.indexOf("--mode") + 1] : "light";
if (MODE !== "light" && MODE !== "dark") throw new Error("--mode light|dark");
const COOKIE = fs.readFileSync("session-cookie.txt", "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const W = 402, PHONE_H = 661, DSF = 3;
const OUT = MODE === "dark" ? "../../public/landing/dark/" : "../../public/landing/";
fs.mkdirSync(OUT, { recursive: true });

/*
  Which frames this run is allowed to write. No --only = all of them, exactly
  as before. The name may be given with or without its number, so --only=match
  and --only=02-match are the same run — but it is an EXACT name either way.
  Substring matching was tried first and was wrong: "match" also selected
  03-why-you-match, and re-shot a frame nobody had asked about.
*/
const ONLY = (process.argv.find((a) => a.startsWith("--only=")) || "").slice(7);
const bare = (name) => name.replace(/^\d+-/, "");
const wants = (name) => !ONLY || name === ONLY || bare(name) === ONLY;
if (ONLY) console.log(`only: ${ONLY}`);

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
await page.evaluateOnNewDocument((mode) => {
  try { window.localStorage.setItem("uniThemeMode", mode); } catch {}
}, MODE);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/*
  THE FIRST-RUN TOUR HAS TO GO FIRST.

  A capture browser is a brand-new profile every time, so to the app this is
  always somebody's first visit and TourGate opens the 17-step walk over
  whatever loads — it dims the screen and holds it on the Gyms tab, so a run
  that navigates straight to /match photographs the tour on the wrong screen.
  That is exactly what 02-match came back as the first time.

  "Have they seen it?" is localStorage only (lib/tour.ts, `${tour.id}TourSeen:
  ${userId}`) and the id is not known until the app has booted, so this presses
  the walk's own Skip — which writes that flag itself and settles it for the
  rest of the run. Nothing on the account changes; the profile is thrown away.
*/
async function dismissTour() {
  await page.goto(BASE + "/gyms", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(4000);
  const skipped = await page.evaluate(() => {
    const el = [...document.querySelectorAll("button")].find(
      (b) => /^(skip|close)$/i.test(b.textContent.trim()),
    );
    if (el) { el.click(); return el.textContent.trim(); }
    return null;
  });
  console.log(skipped ? `tour dismissed (${skipped})` : "no tour");
  await wait(1500);
}
const phone = () => page.setViewport({ width: W, height: PHONE_H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
const tall = (h) => page.setViewport({ width: W, height: h, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });

async function still(name) {
  if (!wants(name)) return;
  await page.screenshot({ path: `cap-${name}.png` });
  await sharp(`cap-${name}.png`).resize({ width: 900 }).webp({ quality: 86 })
    .toFile(OUT + name + ".webp");
  console.log(name + ".webp");
}

/* ── student stills ─────────────────────────────────────────────────────── */
await phone();
await dismissTour();

if (wants("01-gyms")) {
  await page.goto(BASE + "/gyms", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(3500);
  await still("01-gyms");
}

if (wants("02-match")) {
  await page.goto(BASE + "/match", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(3500);
  await still("02-match");
}

// Ryan's profile — the person the whole thread follows.
if (wants("03-why-you-match")) {
  await page.goto(BASE + "/people/de11a014-0000-4000-8000-000000000014", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(3000);
  await still("03-why-you-match");
}

// The chat, opened from the Messages list so the read state is realistic.
if (wants("04-plan-a-session")) {
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
await still("04-plan-a-session");
}

/* ── the log sheet strip ────────────────────────────────────────────────── */
if (wants("tall-logsheet")) {
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
if (!edited) throw new Error("could not open the log sheet");
await tall(2000);
await wait(1600);
await page.screenshot({ path: "cap-logsheet-tall.png" });
}

/* ── the profile strip, cut under the calendar ──────────────────────────── */
let pm = { calendarBottom: null };
if (wants("tall-profile")) {
await phone();
await page.goto(BASE + "/profile", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3200);
await tall(2400);
await wait(1800);
pm = await page.evaluate(() => {
  const all = [...document.querySelectorAll("body *")];
  const cal = all.find((el) => el.children.length === 0 &&
    el.textContent.trim().toLowerCase().startsWith(
      new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toLowerCase()));
  let box = cal;
  while (box && !box.className?.toString?.().includes("border-b")) box = box.parentElement;
  return { calendarBottom: box ? Math.round(box.getBoundingClientRect().bottom + window.scrollY) : null };
});
console.log("calendar bottom:", pm.calendarBottom);
await page.screenshot({ path: "cap-profile-tall.png" });
}

/* ── varsity ────────────────────────────────────────────────────────────── */
if (wants("tall-vhome")) {
  await phone();
  await page.goto(BASE + "/varsity/home", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(3500);
  await tall(2000);
  await wait(1800);
  await page.screenshot({ path: "cap-vhome-tall.png" });
  console.log("vhome tall captured");
}

if (wants("13-varsity-log-list")) {
  await phone();
  await page.goto(BASE + "/varsity/log", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(3200);
  await still("13-varsity-log-list");
}

/*
  THE SQUAD BOARD — the one frame that is not a plain URL.

  It lives behind the Team tab's Workouts list, as a sheet you open by tapping
  a workout, so this drives the app: /varsity/team → the "Workouts" chip → the
  first "2k test" row. React's handler needs a real touch, not element.click()
  — a click() on that button does nothing and the sheet never opens — so it is
  scrolled into view and tapped through page.touchscreen.

  What comes back is a ranked board: YOUR place, the squad average against the
  top 8 / 16 / 24, and the list of names with splits and their change since the
  last time the piece was rowed.

  The numbers are the app's own worked EXAMPLE (lib/varsity/demoWorkouts.ts),
  derived from each rower's 2K PB, shown until a coach flags a real session.
  The list banner says so; the sheet does not, and the sheet is what is shot.
*/
if (wants("15-varsity-board")) {
  await phone();
  await page.goto(BASE + "/varsity/team", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(4500);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("button,a,[role=button]")].find((e) => /^workouts$/i.test(e.textContent.trim()));
    if (el) el.click();
  });
  await wait(2500);
  const at = await page.evaluate(() => {
    const leaf = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^2k test$/i.test(e.textContent.trim()));
    const btn = leaf && leaf.closest("button");
    if (!btn) return null;
    btn.scrollIntoView({ block: "center" });
    const r = btn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });
  if (!at) throw new Error("no 2k test row in the Workouts list");
  await wait(700);
  await page.touchscreen.tap(at.x, at.y);
  await wait(3500);
  const open = await page.evaluate(() => /ranked/i.test(document.body.innerText.slice(0, 4000)));
  if (!open) throw new Error("the board sheet did not open");
  await still("15-varsity-board");
}

if (wants("tall-vprofile")) {
  await phone();
  await page.goto(BASE + "/varsity/profile", { waitUntil: "networkidle2", timeout: 45000 });
  await wait(3200);
  await tall(2200);
  await wait(1800);
  await page.screenshot({ path: "cap-vprofile-tall.png" });
  console.log("vprofile tall captured");
}

await browser.close();

/* ── strips → frames ────────────────────────────────────────────────────── */
// A light page's "blank" is white, and make-frames detects blankness by
// variance, not shade, so the same cut works unchanged.
if (wants("tall-logsheet"))
  execSync(`node make-frames.mjs cap-logsheet-tall.png ${OUT}tall-logsheet.webp`, { stdio: "inherit" });
if (wants("tall-vhome"))
  execSync(`node make-frames.mjs cap-vhome-tall.png ${OUT}tall-vhome.webp`, { stdio: "inherit" });
if (wants("tall-vprofile"))
  execSync(`node make-frames.mjs cap-vprofile-tall.png ${OUT}tall-vprofile.webp`, { stdio: "inherit" });

if (wants("tall-profile")) {
  const resized = await sharp("cap-profile-tall.png").resize({ width: 900 }).png().toBuffer();
  const meta = await sharp(resized).metadata();
  const cutAt = Math.min(meta.height, Math.round((pm.calendarBottom + 10) * (900 / W)));
  await sharp(resized).extract({ left: 0, top: 0, width: 900, height: cutAt })
    .webp({ quality: 86 }).toFile(OUT + "tall-profile.webp");
  console.log(`tall-profile.webp  900x${cutAt}`);
}
