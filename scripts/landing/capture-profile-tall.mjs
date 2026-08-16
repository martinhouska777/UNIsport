// The student profile as one tall strip for the closing pan of story 1:
// header → stats → upcoming → the Leaderboards row → the session calendar.
// The strip is CUT just under the calendar — the beat's promise ends there, so
// the pan should too (Training/Records/Photos would just be dead scroll).
//
// Prints the same pan-fraction report as capture-shotday.mjs, computed against
// the cut height, so the beat's numbers come straight off this output.
import puppeteer from "puppeteer-core";
import fs from "fs";
import sharp from "sharp";

const COOKIE = fs.readFileSync("session-cookie.txt", "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const W = 402, PHONE_H = 661, DSF = 3;

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

await page.setViewport({ width: W, height: PHONE_H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
await page.goto(BASE + "/profile", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3500);
await page.setViewport({ width: W, height: 2400, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
await wait(1800);

// Where things sit, and where the calendar ends (the cut line).
const m = await page.evaluate(() => {
  const all = [...document.querySelectorAll("body *")];
  const find = (txt) =>
    all.find((el) => el.children.length === 0 && el.textContent.trim().toLowerCase().startsWith(txt));
  const lb = find("leaderboards");
  const cal = find(new Date().toLocaleString("en-US", { month: "long", year: "numeric" }).toLowerCase());
  // the calendar section is the bordered block the month label lives in
  let calBox = cal;
  while (calBox && !calBox.className?.toString?.().includes("border-b")) calBox = calBox.parentElement;
  const y = (el) => el ? Math.round(el.getBoundingClientRect().top + window.scrollY) : null;
  return {
    leaderboards: y(lb),
    calendarTop: y(cal),
    calendarBottom: calBox ? Math.round(calBox.getBoundingClientRect().bottom + window.scrollY) : null,
  };
});
console.log("marks (CSS px):", JSON.stringify(m));

await page.screenshot({ path: "cap-profile-tall.png" });
await browser.close();

// Resize to 900 wide and cut just under the calendar.
const resized = await sharp("cap-profile-tall.png").resize({ width: 900 }).png().toBuffer();
const meta = await sharp(resized).metadata();
const scale = 900 / W;                       // CSS px → frame px
const cutAt = Math.min(meta.height, Math.round((m.calendarBottom + 10) * scale));
await sharp(resized)
  .extract({ left: 0, top: 0, width: 900, height: cutAt })
  .webp({ quality: 86 })
  .toFile("../../public/landing/tall-profile.webp");

const travel = cutAt - 1479;                 // what pans past inside the phone
console.log(`tall-profile.webp  900x${cutAt}  travel ${travel}px`);
for (const [k, v] of Object.entries(m)) {
  if (v == null) continue;
  console.log(`  ${Math.max(0, Math.min(1, (v * scale) / travel)).toFixed(3)}  ${k}`);
}
