/*
  Shoots the app's screens for social posts — DARK mode, a real phone size,
  straight PNGs with nothing composited on top.

  Why a separate script from scripts/landing/capture-light.mjs: the landing
  frames are cut, patched and recoloured for the scroll story, and a run there
  can silently throw that work away. Social wants the plain screen, at a taller
  phone (402 x 874 CSS px, the iPhone 15 Pro), so it has its own list and its
  own folder.

  Needs a signed-in session: run scripts/landing/save-cookie.mjs first (the
  owner logs in to a Chrome window; the session lands in a gitignored file and
  is never read by an assistant).

  Run: node scripts/social/capture.mjs            # every screen
       node scripts/social/capture.mjs match feed # just those
  Out: mockups/social/screens/dark/<name>.png     (1206 x 2622)
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const COOKIE = readFileSync(path.join(ROOT, "scripts/landing/session-cookie.txt"), "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const OUT = path.join(ROOT, "mockups/social/screens/dark");
mkdirSync(OUT, { recursive: true });

const W = 402, H = 874, DSF = 3;
const ONLY = process.argv.slice(2);
const wants = (n) => ONLY.length ? ONLY.includes(n) : !n.startsWith("varsity-");
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
  try { window.localStorage.setItem("uniThemeMode", "dark"); } catch {}
});
/* No clock override here. capture-schools.mjs pins the page to 4 PM so gyms
   read "Open now"; run in the early afternoon that puts the clock AHEAD of the
   session's expiry, the client refreshes a token that is not stale, and every
   screen comes back as the public page. Shoot in opening hours instead. */
const go = async (p, ms = 3500) => {
  await page.goto(BASE + p, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(ms);
};
const shot = async (name) => {
  await page.screenshot({ path: path.join(OUT, name + ".png") });
  console.log("  " + name + ".png");
};
const clickText = (re) => page.evaluate((src) => {
  const rx = new RegExp(src, "i");
  const el = [...document.querySelectorAll("button,a,[role=button]")].find((e) => rx.test(e.textContent.trim()));
  if (el) { el.click(); return el.textContent.trim().slice(0, 40); }
  return null;
}, re.source);
const tap = async (finder) => {
  const at = await page.evaluate(finder);
  if (!at) return false;
  await page.touchscreen.tap(at.x, at.y);
  return true;
};

/* the first-run tour opens over whatever loads first: press its own Skip */
await go("/gyms", 4000);
const skipped = await clickText(/^(skip|close)$/);
console.log(skipped ? "tour dismissed" : "no tour");
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
  messages: async () => { await go("/messages"); },
  profile: async () => { await go("/profile"); },
  /* /leaderboards opens on the Honor Code the first time an account visits;
     the board itself needs "I agree" pressed once on the real account */
  leaderboards: async () => { await go("/leaderboards"); },
  memories: async () => { await go("/memories"); },
  /* VARSITY SCREENS ARE OPT-IN (name them on the command line). They carry
     "Harvard Rowing", the shield and the squad's REAL names and splits — none
     of it can go on a public account or into this PUBLIC repo (SOCIAL.md §7B).
     They exist here for the day a demo team with invented rowers is seeded. */
  "varsity-home": async () => { await go("/varsity/home", 4500); },
  "varsity-log": async () => { await go("/varsity/log"); },
  "varsity-calendar": async () => { await go("/varsity/calendar"); },
  "varsity-team": async () => { await go("/varsity/team", 4500); },
  "varsity-board": async () => {
    await go("/varsity/team", 4500);
    await clickText(/^workouts$/);
    await wait(2500);
    const ok = await tap(() => {
      const leaf = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^2k test$/i.test(e.textContent.trim()));
      const btn = leaf && leaf.closest("button");
      if (!btn) return null;
      btn.scrollIntoView({ block: "center" });
      const r = btn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!ok) throw new Error("no 2k test row");
    await wait(3500);
  },
  "varsity-stats": async () => {
    await go("/varsity/profile");
    const ok = await tap(() => {
      const btn = document.querySelector('button[aria-label="See the graph full screen"]');
      if (!btn) return null;
      btn.scrollIntoView({ block: "center" });
      const r = btn.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!ok) throw new Error("no full-screen button");
    await wait(3000);
  },
  "varsity-profile": async () => { await go("/varsity/profile"); },
};

for (const [name, run] of Object.entries(SCREENS)) {
  if (!wants(name)) continue;
  try { await run(); await shot(name); }
  catch (e) { console.log("  " + name + ": FAILED — " + e.message); }
}
await browser.close();
console.log("\nwrote " + OUT);
