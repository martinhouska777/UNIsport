/*
  The screens for the LAUNCH carousel (scripts/social/launch-carousel.mjs),
  shot from the live app as the demo account, the same way capture.mjs does it
  (402 x 874 CSS px @3x, light), plus two things capture.mjs does not do:

  1. THE CARDS. Every arrow in the carousel lands on a point of its capture
     (the Plan button, Accept, + Log, the leaderboard card), so each shot also
     writes <name>.json: every card on the screen (an element with a rounded
     corner and a surface of its own) with its box in PNG pixels and the start
     of its text. After a reshoot, read the new points off it rather than
     off the PNG with a ruler.

  2. OTHER SCHOOLS. The app is white-label; the Settings switcher's choice
     (localStorage "unisport.university") wins over the signed-in address, so
     planting it before a load shows that school's REAL gyms in its colours
     (the trick scripts/landing/capture-schools.mjs is built on). Since
     2026-09-20 the live app is pinned to Harvard (LIVE_UNIVERSITY in
     lib/themes.ts), so the three schools come from a throwaway local copy
     with the pin set to null (the worktree recipe in
     scripts/social/varsity-shoot/README.md, step 1, on port 3001):
       node scripts/social/capture-launch.mjs --base http://localhost:3001 gyms-yale gyms-princeton gyms-dartmouth

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
const at = process.argv.indexOf("--base");
const BASE = at > 0 ? process.argv[at + 1] : "https://un-isport.vercel.app";
const HOST = new URL(BASE).hostname;
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
  value: COOKIE, domain: HOST, path: "/",
  secure: BASE.startsWith("https"), sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600,
});
await page.evaluateOnNewDocument(() => {
  try { window.localStorage.setItem("uniThemeMode", "light"); } catch {}
});

/* THE CHAT ENDS ON A PLAN ARJUN SENT THAT YOU HAVE JUST ACCEPTED (owner,
   2026-10-22: "for the messages show something when you just accepted from
   other guy and say it goes to both of your calendars"). The demo thread has
   no plan from him that is still ahead, so his line and his plan, accepted,
   are added to dm_thread's answer in this browser only, before the app reads
   it. The card is the app's own; nothing is written anywhere. */
await page.evaluateOnNewDocument(() => {
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const res = await real(input, init);
    const url = String(input instanceof Request ? input.url : input); // Next passes URL objects
    if (!url.includes("/rpc/dm_thread") || !res.ok) return res;
    const rows = await res.clone().json();
    const said = rows.find((r) => r.sender_name === "Arjun Mehta" && r.kind !== "plan");
    const plan = rows.find((r) => r.kind === "plan");
    if (!said || !plan) return res;
    const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
    const tomorrow4pm = new Date();
    tomorrow4pm.setDate(tomorrow4pm.getDate() + 1);
    tomorrow4pm.setHours(16, 0, 0, 0);
    const add = [
      { ...said, id: "shoot-said", body: "Chest tomorrow at 4?", created_at: ago(6) },
      { ...plan, id: "shoot-plan", sender_id: said.sender_id, sender_name: said.sender_name, created_at: ago(5),
        plan_id: "shoot-plan", plan_activity: "gym", plan_place: "Murr Center",
        plan_scheduled_at: tomorrow4pm.toISOString(), plan_status: "accepted",
        plan_proposer_answer: null, plan_recipient_answer: null },
    ];
    const headers = new Headers(res.headers);
    headers.delete("content-length");
    headers.delete("content-encoding");
    return new Response(JSON.stringify([...rows, ...add]), { status: res.status, statusText: res.statusText, headers });
  };
});

/* THE PROFILE YOU OPEN FROM MATCH HAS A HISTORY. Ethan Hale is a made-up
   person (db/shoot_names.sql) with nothing logged, so his row read 0 Workouts,
   0 Following, 0 Partners on the "Find your ideal training partner" slide
   (NO-SLOP 22: demo data looks real). On somebody else's profile the three
   counts are answered in this browser only; nothing is written. */
await page.evaluateOnNewDocument(() => {
  const real = window.fetch.bind(window);
  const FAKE = { workout_count: 52, partner_count: 8, follow_counts: [{ followers: 41, following: 37 }] };
  window.fetch = async (input, init) => {
    const url = String(input instanceof Request ? input.url : input);
    const rpc = Object.keys(FAKE).find((k) => url.includes("/rpc/" + k));
    if (!rpc || !location.pathname.startsWith("/people/")) return real(input, init);
    return new Response(JSON.stringify(FAKE[rpc]), { status: 200, headers: { "content-type": "application/json" } });
  };
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
  /* "Take a quick tour?" comes back for every new school, and its Skip can
     land on Match: press it, and load the page again if it moved */
  if (await clickText(/^skip$/)) {
    await wait(1500);
    if (!page.url().includes(p.split("?")[0])) {
      await page.goto(BASE + p, { waitUntil: "networkidle2", timeout: 60000 });
      await wait(ms);
    }
  }
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

/* scroll whatever scrolls the element whose text matches, until that
   element's top is `y` CSS px from the top of the screen */
const scrollTo = async (re, y) => {
  const ok = await page.evaluate((src, y) => {
    const rx = new RegExp(src, "i");
    const el = [...document.querySelectorAll("h2,h3,h4,p,div,span,label")].find((e) => rx.test(e.textContent.trim()));
    if (!el) return false;
    let box = el.parentElement;
    while (box && !(box.scrollHeight > box.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(box).overflowY))) box = box.parentElement;
    (box || document.scrollingElement).scrollBy(0, el.getBoundingClientRect().top - y);
    return true;
  }, re.source, y);
  if (!ok) throw new Error("nothing matches " + re);
  await wait(900);
};

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
  /* back to the newest week with three logged days: the demo account's
     sessions are weeks old by now (on 22 Oct: 28 Sep to 4 Oct) */
  profile: async () => {
    await go("/profile");
    for (let i = 0; i < 10; i++) {
      const logged = await page.evaluate(() => [...document.querySelectorAll("button,div")]
        .filter((el) => /^[MTWFS]\s+\d{1,2}\s+\S/.test(el.innerText.trim()) && el.innerText.trim().split(/\s+/).length <= 4)
        .filter((el, _, all) => !all.some((o) => o !== el && el.contains(o))).length);
      if (logged >= 3) return;
      await page.evaluate(() => document.querySelector('button[aria-label="Previous week"]')?.click());
      await wait(1800);
    }
    throw new Error("no week with three logged days");
  },
  /* the profile again, scrolled to When you're both free with the two weeks
     open ("Compare our calendars") */
  "person-calendars": async () => {
    await SCREENS.person();
    if (!(await clickText(/^compare our calendars$/))) throw new Error("no Compare our calendars");
    await wait(900);
    await scrollTo(/^when you.re both free$/i, 150);
  },
  /* Match, Sessions: the board, with Post and Search by time on it */
  board: async () => {
    await go("/match");
    if (!(await clickText(/^sessions$/))) throw new Error("no Sessions tab");
    await wait(3000);
  },
  /* + Log on the Profile: the sheet as it opens. Nothing is saved. */
  log: async () => {
    await SCREENS.profile();
    if (!(await clickText(/^\+?\s*log$/))) throw new Error("no + Log");
    await wait(1800);
    /* two muscle groups picked, and the Photos tile above Save session */
    for (const m of [/^chest$/, /^triceps$/]) { await clickText(m); await wait(300); }
    await scrollTo(/^photos$/i, 600);
  },
  memories: async () => { await go("/memories"); },
  /* the honor code is signed in this browser only (localStorage, keyed by
     the account's id, which the tour's own flag already carries) */
  leaderboards: async () => {
    await go("/leaderboards");
    const signed = await page.evaluate(() => {
      const k = Object.keys(localStorage).find((x) => /:[0-9a-f]{8}-[0-9a-f-]{27}$/.test(x));
      if (!k) return false;
      localStorage.setItem("leagueHonorCode:" + k.split(":").pop(), "1");
      return true;
    });
    if (!signed) throw new Error("no account id in this browser");
    await go("/leaderboards");
  },
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
/* a load past the hour swaps the session for a new one and spends the old
   refresh token, so the file gets what the app left in this browser */
const kept = (await browser.cookies()).find((c) => c.name === "sb-wavxyrgtaotrhnyepyor-auth-token");
if (kept && kept.value !== COOKIE) {
  writeFileSync(path.join(ROOT, "scripts/landing/session-cookie.txt"), kept.value);
  console.log("  session renewed in session-cookie.txt");
}
await browser.close();
console.log("\nwrote " + OUT);
