/*
  The screens for the LAUNCH carousel (scripts/social/launch-carousel.mjs),
  shot from the live app as the demo account, the same way capture.mjs does it
  (402 x 874 CSS px @3x, light), plus two things capture.mjs does not do:

  1. THE CARDS. Every slide lifts one real piece of its screen out of the phone
     and shows it bigger beside it (the "Why you match" list, the plan in the
     chat, a gym, the leaderboard card). So each shot also writes
     <name>.json: every card on the screen (an element with a rounded corner
     and a surface of its own) with its box in PNG pixels and the start of its
     text. The carousel picks its card from there by text, so a restyle moves
     the crop with it instead of breaking a hand-measured rectangle.

  2. OTHER SCHOOLS. The app is white-label; the Settings switcher's choice
     (localStorage "unisport.university") wins over the signed-in address, so
     planting it before a load shows that school's REAL gyms in its colours
     (the trick scripts/landing/capture-schools.mjs is built on).

  Needs a fresh session: node scripts/landing/save-cookie.mjs --fresh (the
  owner logs in to the Chrome window himself). Use it within the hour.

  Run: node scripts/social/capture-launch.mjs
  Out: mockups/social/screens/launch/<name>.png + <name>.json
*/
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const COOKIE = readFileSync(path.join(ROOT, "scripts/landing/session-cookie.txt"), "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const OUT = path.join(ROOT, "mockups/social/screens/launch");
mkdirSync(OUT, { recursive: true });

const W = 402, H = 874, DSF = 3;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setUserAgent(
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
);
await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
await browser.setCookie({
  name: "sb-wavxyrgtaotrhnyepyor-auth-token",
  value: COOKIE, domain: "un-isport.vercel.app", path: "/",
  secure: true, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600,
});
await page.evaluateOnNewDocument(() => {
  try { window.localStorage.setItem("uniThemeMode", "light"); } catch {}
});

/* the school for the next load (null = the account's own). Set on the app's
   own origin before the load, where the app reads it. */
let school = null;
const go = async (p, ms = 3500) => {
  if (page.url().startsWith(BASE)) await page.evaluate((s) => {
    if (s) localStorage.setItem("unisport.university", s); else localStorage.removeItem("unisport.university");
  }, school);
  await page.goto(BASE + p, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(ms);
  const url = page.url();
  if (!url.includes(p.split("?")[0])) throw new Error("landed on " + url + " (session gone?)");
};
const clickText = (re) => page.evaluate((src) => {
  const rx = new RegExp(src, "i");
  const el = [...document.querySelectorAll("button,a,[role=button]")].find((e) => rx.test(e.textContent.trim()));
  if (el) { el.click(); return el.textContent.trim().slice(0, 40); }
  return null;
}, re.source);

/* every card on screen: rounded, with its own surface, not the whole page */
const cards = () => page.evaluate((dsf) => {
  const out = [];
  for (const el of document.querySelectorAll("body *")) {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width < 90 || r.height < 36 || r.width > innerWidth - 4 && r.height > innerHeight * 0.9) continue;
    if (r.bottom <= 0 || r.top >= innerHeight) continue;
    const radius = parseFloat(cs.borderTopLeftRadius) || 0;
    const surface = cs.backgroundColor !== "rgba(0, 0, 0, 0)" || cs.boxShadow !== "none" || parseFloat(cs.borderTopWidth) > 0;
    if (radius < 10 || !surface) continue;
    const text = el.innerText.replace(/\s+/g, " ").trim().slice(0, 140);
    if (!text) continue;
    out.push({
      text, radius: Math.round(radius * dsf),
      x: Math.round(r.left * dsf), y: Math.round(r.top * dsf),
      w: Math.round(r.width * dsf), h: Math.round(r.height * dsf),
    });
  }
  return out;
}, DSF);

const shoot = async (name) => {
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  writeFileSync(path.join(OUT, name + ".json"), JSON.stringify(await cards(), null, 1));
  console.log("  " + name);
};

/* the first-run tour opens over whatever loads first: press its own Skip */
await go("/gyms", 4000);
console.log((await clickText(/^(skip|close)$/)) ? "tour dismissed" : "no tour");
await wait(1200);

const SCREENS = {
  gyms: async () => { await go("/gyms"); },
  match: async () => { await go("/match"); },
  person: async () => {
    await go("/match");
    if (!(await clickText(/^view profile$/))) throw new Error("no View profile");
    await wait(3000);
  },
  chat: async () => {
    await go("/messages", 3000);
    if (!(await clickText(/arjun mehta/))) throw new Error("no Arjun Mehta thread");
    await wait(2800);
  },
  /* one week back: the demo account's sessions are in the week before this one */
  profile: async () => {
    await go("/profile");
    await page.evaluate(() => document.querySelector('button[aria-label="Previous week"]')?.click());
    await wait(2000);
  },
  leaderboards: async () => { await go("/leaderboards"); },
  "gyms-yale": async () => { school = "yale"; await go("/gyms"); },
  "gyms-princeton": async () => { school = "princeton"; await go("/gyms"); },
  "gyms-dartmouth": async () => { school = "dartmouth"; await go("/gyms"); },
};

const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));
for (const [name, run] of Object.entries(SCREENS)) {
  if (ONLY.length && !ONLY.includes(name)) continue;
  school = null;
  try { await run(); await shoot(name); }
  catch (e) { console.log("  " + name + ": FAILED — " + e.message); }
}
await browser.close();
console.log("\nwrote " + OUT);
