// Captures the Varsity screens from the live app at 3x phone resolution,
// reusing the session the owner opened in the Browser pane (cookie transplant —
// the token never leaves this machine). Viewport 402x661 @3x = 1206x1983, which
// matches the existing frames' canvas, so the crop pipeline is a no-op resize.
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
await page.setViewport({ width: 402, height: 661, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.setUserAgent(
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
);
await browser.setCookie({
  name: "sb-wavxyrgtaotrhnyepyor-auth-token",
  value: COOKIE,
  domain: "un-isport.vercel.app",
  path: "/",
  secure: true,
  sameSite: "Lax",
  expires: Math.floor(Date.now() / 1000) + 3600,
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function go(url, settle = 2500) {
  await page.goto(BASE + url, { waitUntil: "networkidle2", timeout: 45000 });
  await wait(settle);
}
async function shot(name) {
  await page.screenshot({ path: `cap-${name}.png` });
  console.log("captured", name);
}

// ── 1. Varsity home, top: block name, week strip ──
await go("/varsity/home", 3500);
await shot("varsity-home");

// ── 2. Home scrolled: today's sessions + race countdown (+ lineup card) ──
await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) => e.textContent.trim() === "NEXT RACE");
  if (el) el.scrollIntoView({ block: "center" });
  else window.scrollBy(0, 900);
});
await wait(800);
await shot("varsity-race");

// ── 2b. The lineup card on home, if present ──
const hasLineup = await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find((e) => e.textContent.trim() === "Your Lineup");
  if (el) { el.scrollIntoView({ block: "start" }); return true; }
  return false;
});
await wait(800);
if (hasLineup) await shot("varsity-lineup");
else console.log("no lineup card on home");

// ── 3. Log tab: today's prescribed sessions listed ──
await go("/varsity/log", 3000);
await shot("varsity-log-list");

// ── 3b. Open the first prescribed session → pre-filled sheet ──
const tapped = await page.evaluate(() => {
  const el = [...document.querySelectorAll("button,div[role=button],[class*=cursor-pointer]")].find((e) =>
    /90' UT2 row/.test(e.textContent) && e.textContent.length < 300
  );
  if (el) { el.click(); return true; }
  return false;
});
await wait(1500);
if (tapped) await shot("varsity-log-sheet");
else console.log("could not open log sheet");

// ── 4. Team roster ──
await go("/varsity/team", 3000);
await shot("varsity-team");

// ── 4b. Open a teammate → their training month ──
const opened = await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find(
    (e) => e.textContent.trim() === "George Farkas" && e.children.length === 0
  );
  if (el) { el.closest("button,div")?.click(); return true; }
  return false;
});
await wait(2000);
if (opened) {
  // scroll their profile to the training-month calendar if present
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("*")].find((e) => /TRAINING/i.test(e.textContent.trim()) && e.textContent.trim().length < 30);
    if (el) el.scrollIntoView({ block: "start" });
  });
  await wait(700);
  await shot("varsity-teammate");
} else console.log("could not open teammate");

await browser.close();
console.log("done");
