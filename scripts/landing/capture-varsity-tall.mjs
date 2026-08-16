// Tall strips for Varsity: the whole home screen (plan → lineup → next race →
// coach's note) as one pan, plus the athlete's own statistics page.
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

async function tall(path, file, h = 2400) {
  await page.setViewport({ width: 402, height: 661, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(BASE + path, { waitUntil: "networkidle2", timeout: 45000 });
  await wait(3200);
  await page.setViewport({ width: 402, height: h, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await wait(1800);
  const docH = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: file });
  console.log(file, "docHeight", docH);
}

await tall("/varsity/home", "cap-vhome-tall.png", 2200);
await tall("/varsity/profile", "cap-vprofile-tall.png", 2200);
await tall("/varsity/calendar", "cap-vcalendar-tall.png", 1600);

await browser.close();
