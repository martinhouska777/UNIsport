/*
  THROWAWAY (lives only in the C:/Unisport-shoot copy). Shoots Varsity Mode for
  the Instagram post as Westbrook Rowing. A persistent scratch profile keeps the
  rotated session between runs, so the saved cookie is spent only once.
  Run: node scripts/social/shoot-varsity.mjs [names…]
*/
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const REPO = "C:/Unisport";
const COOKIE_FILE = path.join(REPO, "scripts/landing/session-cookie.txt");
const NAME = "sb-wavxyrgtaotrhnyepyor-auth-token";
const BASE = "http://localhost:3001";
const OUT = path.join(REPO, "mockups/social/screens/light");
const PROFILE = path.join(os.tmpdir(), "unisport-shoot-profile");
mkdirSync(OUT, { recursive: true });

const W = 402, H = 874, DSF = 3;
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const wants = (n) => (ONLY.length ? ONLY.some((o) => n === o || (o.endsWith("*") && n.startsWith(o.slice(0, -1)))) : true);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const firstRun = !existsSync(PROFILE);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  userDataDir: PROFILE,
  args: ["--disable-gpu", "--no-first-run", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1");
await page.setViewport({ width: W, height: H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
if (firstRun) {
  const value = readFileSync(COOKIE_FILE, "utf8").trim();
  await browser.setCookie({ name: NAME, value, domain: "localhost", path: "/", secure: false, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 30 * 86400 });
}
await page.evaluateOnNewDocument(() => { try { window.localStorage.setItem("uniThemeMode", "light"); } catch {} });
await page.emulateTimezone("America/New_York");
await page.setBypassServiceWorker(true);
await page.setCacheEnabled(false);
page.on("console", (m) => { if (m.text().startsWith("SHOOTWEEKS")) console.log("  " + m.text().slice(0, 600)); });
/* CLOCK=2026-10-22T06:30:00-04:00 sets the page's "now" to that moment, so a
   week with a full plan reads as this week everywhere (Home, Log, Calendar). */
if (process.env.CLOCK) {
  const offset = new Date(process.env.CLOCK).getTime() - Date.now();
  await page.evaluateOnNewDocument((off) => {
    const R = Date;
    class D extends R {
      constructor(...a) { if (a.length === 0) super(R.now() + off); else super(...a); }
      static now() { return R.now() + off; }
    }
    D.parse = R.parse; D.UTC = R.UTC;
    window.Date = D;
  }, offset);
  console.log("clock set to", process.env.CLOCK);
}

const go = async (p, ms = 2500) => {
  await page.goto(BASE + p, { waitUntil: "domcontentloaded", timeout: 180000 });
  await page.waitForFunction(() => document.body.innerText.trim().length > 80 && !document.querySelector(".animate-spin"), { timeout: 90000 }).catch(() => console.log("  (still loading after 90 s)"));
  await wait(ms);
};
const shot = async (name) => { await page.screenshot({ path: path.join(OUT, name + ".png") }); console.log("  " + name + ".png"); };
const clickText = (re) => page.evaluate((src) => {
  const rx = new RegExp(src, "i");
  const el = [...document.querySelectorAll("button,a,[role=button]")].find((e) => rx.test(e.textContent.trim()));
  if (el) { el.click(); return el.textContent.trim().slice(0, 40); }
  return null;
}, re.source);
const tap = async (finder, arg) => { const at = await page.evaluate(finder, arg); if (!at) return false; await page.touchscreen.tap(at.x, at.y); return true; };
const body = () => page.evaluate(() => document.body.innerText);
const saveCookie = async () => {
  const c = (await browser.cookies()).filter((x) => x.name === NAME || x.name.startsWith(NAME + "."));
  console.log("  session cookies:", c.map((x) => x.name).join(", ") || "none");
};

await go("/varsity/home", 6000);
await clickText(/^(skip|close|not now)$/); await wait(800);
const t = await body();
if (!/varsity|training|lineup/i.test(t) || /log in|sign in/i.test(t.slice(0, 400))) {
  console.log("NOT SIGNED IN"); console.log(t.slice(0, 400)); await saveCookie(); await browser.close(); process.exit(2);
}
console.log("signed in. top of home:", t.slice(0, 200).replace(/\n+/g, " | "));
await saveCookie();

const DAYS = (process.env.DAYS || "").split(",").filter(Boolean);
const SCREENS = {
  "varsity-home": async () => { await go("/varsity/home", 4500); },
  "varsity-log": async () => { await go("/varsity/log", 4500); },
  "varsity-calendar": async () => { await go("/varsity/calendar", 4500); },
  "varsity-team": async () => { await go("/varsity/team", 4500); },
  "varsity-profile": async () => { await go("/varsity/profile", 4500); },
  "varsity-lineups": async () => { await go("/varsity/lineups", 4500); },
  "varsity-home-boat": async () => {
    await go("/varsity/home", 4500);
    const ok = await tap(() => {
      const leaf = [...document.querySelectorAll("*")].find((e) => e.children.length <= 1 && /^your boat$/i.test(e.textContent.trim()));
      if (!leaf) return null; leaf.scrollIntoView({ block: "center" }); const r = leaf.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!ok) throw new Error("no Your boat");
    await wait(2500);
    await page.evaluate(() => {
      const you = [...document.querySelectorAll("*")].find((e) => e.children.length === 0 && /^you$/i.test(e.textContent.trim()));
      if (you) you.scrollIntoView({ block: "center" });
    });
    await wait(1200);
  },
  "varsity-log-erg": async () => {
    await go("/varsity/log", 4500);
    const ok = await tap((src) => {
      const rx = new RegExp(src, "i");
      const card = [...document.querySelectorAll("button,a,[role=button],div")].filter((e) => rx.test(e.textContent) && /log/i.test(e.textContent)).sort((a, b) => a.textContent.length - b.textContent.length)[0];
      const btn = card && ([...card.querySelectorAll("button")].find((b) => /^log$/i.test(b.textContent.trim())) || card);
      if (!btn) return null; btn.scrollIntoView({ block: "center" }); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, process.env.LOGTAP || "erg");
    if (!ok) throw new Error("no session to tap");
    await wait(2500);
  },
  "varsity-board": async () => {
    await go("/varsity/team", 4500);
    const re = process.env.WORKOUT || "8×500m|8x500m";
    const ok = await tap((src) => {
      const rx = new RegExp(src, "i");
      const btn = [...document.querySelectorAll("button,a")].find((b) => rx.test(b.textContent));
      if (!btn) return null; btn.scrollIntoView({ block: "center" }); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }, re);
    if (!ok) throw new Error("no workout row " + re);
    await wait(3500);
  },
  "varsity-stats": async () => {
    await go("/varsity/profile", 4500);
    const ok = await tap(() => {
      const btn = document.querySelector('button[aria-label="See the graph full screen"]') || [...document.querySelectorAll("button")].find((b) => /full screen/i.test(b.getAttribute("aria-label") || ""));
      if (!btn) return null; btn.scrollIntoView({ block: "center" }); const r = btn.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (!ok) throw new Error("no full-screen button");
    await wait(3000);
  },
  "varsity-winter": async () => { await go("/varsity/profile/winter-points", 4500); },
};
for (const d of DAYS) {
  SCREENS["varsity-home-" + d] = async () => { await go("/varsity/home?d=" + d, 3500); };
  SCREENS["varsity-lineups-" + d] = async () => { await go("/varsity/lineups?d=" + d, 3500); };
}

const REAL = readFileSync(path.join(REPO, "lib/varsity/coachLineup.ts"), "utf8").match(/name: "([^"]+)"/g)
  .map((m) => m.slice(7, -1)).filter((n) => !/^(Eight|Coxed Four|Straight Four|Pair|Elias)$/.test(n))
  .map((n) => n.split(" ").at(-1).replace(/[-']/g, "[-' ]?"));
const LEAK = new RegExp("(?<![A-Za-z])(harvard|hubc|houska|palmer dixon|engstrom|hamlin|hosea|mississippi|newell|" + REAL.join("|") + ")(?![A-Za-z])", "gi");
const leaks = [];
const dump = process.argv.includes("--text");
for (const [name, run] of Object.entries(SCREENS)) {
  if (!wants(name)) continue;
  try {
    await run();
    await clickText(/^(skip|close|not now)$/);
    const txt = await body();
    const hits = [...new Set(txt.match(LEAK) || [])];
    if (hits.length) leaks.push(name + ": " + hits.join(", "));
    if (dump) console.log("----- " + name + "\n" + txt.slice(0, 1500));
    await shot(name);
  } catch (e) { console.log("  " + name + ": FAILED " + e.message); }
}
await saveCookie();
await browser.close();
console.log(leaks.length ? "\nLEAKS: " + leaks.join(" | ") : "\nno real names on any screen");
