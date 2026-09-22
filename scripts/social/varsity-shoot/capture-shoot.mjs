/*
  THROWAWAY twin of scripts/social/capture.mjs for the Varsity/Coach reshoot.
  Shoots the copy at C:/Unisport-shoot (dev server on :3001, invented team +
  rowers baked in) and writes into the REAL repo's screens folder, so
  scripts/social/posts.mjs phones frames them like every other screen.
  Run (from C:/Unisport-shoot): node scripts/social/capture-shoot.mjs [names…]
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const REPO = "C:/Unisport";
const COOKIE = readFileSync(path.join(REPO, "scripts/landing/session-cookie.txt"), "utf8").trim();
const BASE = "http://localhost:3001";
const OUT = path.join(REPO, "mockups/social/screens/light");
mkdirSync(OUT, { recursive: true });

const W = 402, H = 874, DSF = 3;
const ONLY = process.argv.slice(2);
const wants = (n) => (ONLY.length ? ONLY.includes(n) : true);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* A Saturday with FIVE published boats (2026-8-19-AM in the app's zero-based
   month keys = Sat 19 Sep 2026) — the day the lineup screens are shot on. */
const DAY_ISO = "2026-09-19", DAY_KEY = "2026-8-19-AM";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
await browser.setCookie({ name: "sb-wavxyrgtaotrhnyepyor-auth-token", value: COOKIE, domain: "localhost", path: "/", secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600 });
await page.evaluateOnNewDocument(() => { try { window.localStorage.setItem("uniThemeMode", "light"); } catch {} });

const go = async (p, ms = 3500) => { await page.goto(BASE + p, { waitUntil: "networkidle2", timeout: 180000 }); await wait(ms); };
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + ".png") }); console.log("  " + name + ".png"); };
const clickText = (re) => page.evaluate((src) => {
  const rx = new RegExp(src, "i");
  const el = [...document.querySelectorAll("button,a,[role=button]")].find((e) => rx.test(e.textContent.trim()));
  if (el) { el.click(); return el.textContent.trim().slice(0, 40); }
  return null;
}, re.source);
const tap = async (finder) => { const at = await page.evaluate(finder); if (!at) return false; await page.touchscreen.tap(at.x, at.y); return true; };
const body = () => page.evaluate(() => document.body.innerText);

/* signed in? and did the rewrite take? — refuse to shoot otherwise */
await go("/varsity/home", 5000);
await clickText(/^(skip|close)$/); await wait(800);
const t = await body();
if (!/varsity mode/i.test(t)) { console.log("NOT SIGNED IN — run: node scripts/landing/save-cookie.mjs --fresh (in C:/Unisport)"); console.log(t.slice(0, 300)); await browser.close(); process.exit(2); }
if (/harvard|hubc/i.test(t)) { console.log("REAL NAMES STILL SHOWING:", t.match(/.*(harvard|hubc).*/i)[0]); await browser.close(); process.exit(3); }
console.log("signed in, team reads:", (t.match(/varsity mode\s*\n?\s*([^\n]+)/i) || [])[1]);

const SCREENS = {
  "varsity-home": async () => { await go("/varsity/home", 4500); },
  "varsity-lineups": async () => { await go(`/varsity/lineups?d=${DAY_ISO}`, 4500); },
  "varsity-roster": async () => { await go("/varsity/team/roster", 4500); },
  "varsity-log-sheet": async () => {
    await go("/varsity/calendar");
    const ok = await page.evaluate(() => { const b = document.querySelector('button[aria-label="Log a session"]'); if (!b) return false; b.click(); return true; });
    if (!ok) throw new Error("no (+) Log a session");
    await wait(2500);
  },
  "varsity-workouts": async () => { await go("/varsity/team", 4500); await clickText(/^workouts$/); await wait(2500); },
  "varsity-water": async () => {
    await go("/varsity/team", 4500); await clickText(/^workouts$/); await wait(2000);
    if (!(await clickText(/^water$/))) throw new Error("no Water tab");
    await wait(2500);
    await tap(() => {
      const btn = [...document.querySelectorAll("button")].find((b) => /piece/i.test(b.textContent) || /2x2 miles|2×2 miles/i.test(b.textContent));
      if (!btn) return null; btn.scrollIntoView({ block: "center" }); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    await wait(3000);
  },
  "coach-today": async () => { await go("/varsity/coach", 3000); await clickText(/^(skip|close)$/); await wait(1000); await clickText(/^today$/); await wait(3500); },
  "coach-plan": async () => { await go("/varsity/coach/plan", 4500); },
  "coach-lineup": async () => { await go(`/varsity/coach/lineup?practice=${DAY_KEY}`, 5000); },
  "coach-workouts": async () => { await go("/varsity/coach/workouts", 4500); },
  "coach-team": async () => { await go("/varsity/coach/team", 4500); },
  "coach-notes": async () => { await go("/varsity/coach/notes", 4500); },
  "varsity-log": async () => { await go("/varsity/log"); },
  "varsity-calendar": async () => { await go("/varsity/calendar"); },
  "varsity-team": async () => { await go("/varsity/team", 4500); },
  "varsity-board": async () => {
    await go("/varsity/team", 4500); await clickText(/^workouts$/); await wait(2500);
    const ok = await tap(() => {
      const leaf = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^2k test$/i.test(e.textContent.trim()));
      const btn = leaf && leaf.closest("button"); if (!btn) return null;
      btn.scrollIntoView({ block: "center" }); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!ok) throw new Error("no 2k test row");
    await wait(3500);
  },
  "varsity-stats": async () => {
    await go("/varsity/profile");
    const ok = await tap(() => {
      const btn = document.querySelector('button[aria-label="See the graph full screen"]'); if (!btn) return null;
      btn.scrollIntoView({ block: "center" }); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!ok) throw new Error("no full-screen button");
    await wait(3000);
  },
  "varsity-profile": async () => { await go("/varsity/profile"); },
};

const REAL = readFileSync("C:/Unisport/lib/varsity/coachLineup.ts", "utf8").match(/name: "([^"]+)"/g)
  .map((m) => m.slice(7, -1)).filter((n) => !/^(Eight|Coxed Four|Straight Four|Pair|Elias|Martin Houska)$/.test(n))
  .map((n) => n.split(" ").at(-1).replace(/[-']/g, "[-' ]?"));
const LEAK = new RegExp("(?<![A-Za-z])(harvard|hubc|palmer dixon|engstrom|hamlin|hosea|mississippi|" + REAL.join("|") + ")(?![A-Za-z])", "i");
const leaks = [];
for (const [name, run] of Object.entries(SCREENS)) {
  if (!wants(name)) continue;
  try {
    await run();
    const txt = await body();
    const hit = txt.match(LEAK);
    if (hit) leaks.push(name + ": " + hit[0]);
    await shot(name);
  } catch (e) { console.log("  " + name + ": FAILED — " + e.message); }
}
await browser.close();
console.log(leaks.length ? "\nLEAKS: " + leaks.join(" | ") : "\nno real names on any screen");
console.log("wrote " + OUT);
