// Tall strips for the panning beats:
//   cap-session-tall.png — a logged session (exercises, photos, note)
//   cap-profile-tall.png — the whole profile page
import puppeteer from "puppeteer-core";
import fs from "fs";

const COOKIE = fs.readFileSync("session-cookie.txt", "utf8").trim();
const BASE = "https://un-isport.vercel.app";

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

await page.setViewport({ width: 402, height: 661, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.goto(BASE + "/profile", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3200);

// 1) the profile itself, tall
await page.setViewport({ width: 402, height: 1600, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await wait(1500);
await page.screenshot({ path: "cap-profile-tall.png" });
console.log("profile tall captured");

// 2) back to phone height, open a day with a full gym session
await page.setViewport({ width: 402, height: 661, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await wait(1200);
const day = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button[aria-label]")].filter((x) =>
    / on day \d+$/.test(x.getAttribute("aria-label") || "")
  );
  // the richest one: most muscle groups listed
  const pick = b.sort(
    (p, q) => q.getAttribute("aria-label").split(",").length - p.getAttribute("aria-label").split(",").length
  )[0];
  if (pick) { pick.click(); return pick.getAttribute("aria-label"); }
  return null;
});
await wait(1500);
console.log("day sheet:", day);

// 3) tap the session row inside the day sheet
const row = await page.evaluate(() => {
  const cands = [...document.querySelectorAll("button,[role=button],div[class*=cursor-pointer]")].filter(
    (e) => /^(Gym|Running|Cardio)/.test(e.textContent.trim()) && e.textContent.trim().length < 60
  );
  const el = cands[cands.length - 1];
  if (el) { el.click(); return el.textContent.trim().slice(0, 40); }
  return null;
});
await wait(1800);
console.log("session row:", row);
await page.screenshot({ path: "cap-session-detail.png" });

// 4) tall strip of the open session
await page.setViewport({ width: 402, height: 1600, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await wait(1500);
await page.screenshot({ path: "cap-session-tall.png" });
console.log("session tall captured");

await browser.close();
