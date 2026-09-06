// THE WAY BACK — the reverse of verify-site-flight.mjs, and the suite that
// keeps 2026-09-06 fixed. Scrolling back UP out of a landed closer used to
// bounce the page down 85px, freeze it for 1.3s, cut 900px and blink the
// phone out of existence. Two things are checked here, per closer:
//
//   1. BRISK SCROLL UP — real wheel notches through CDP, one sample a frame.
//      The page must never travel DOWN while the reader pushes up, and it may
//      not be held still for longer than the closer's own way out.
//   2. ONE NUDGE, HANDS OFF — the phone must actually fly home: a travelled
//      path, never off screen, landing on the story's own phone.
//
//   node verify-site-reverse.mjs                       # http://localhost:3000/
//   node verify-site-reverse.mjs http://localhost:3000/for/students
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:3000/";
// Bare 127.0.0.1 makes Next refuse its own HMR socket as cross-origin and the
// app router never hydrates — map the name instead. (scripts/landing/README.md)
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run", "--host-resolver-rules=MAP localhost 127.0.0.1"],
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
let fails = 0;
const ok = (name, cond, detail = "") => {
  console.log((cond ? "PASS " : "FAIL ") + name + (detail ? "  " + detail : ""));
  if (!cond) fails++;
};
const cdp = await page.target().createCDPSession();
const notch = (dy) => cdp.send("Input.dispatchMouseEvent", { type: "mouseWheel", x: 700, y: 450, deltaX: 0, deltaY: dy, pointerType: "mouse" });

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

/* Park at the end of the story, then walk down into the closer and let the
   flight land. */
async function landOn(closerId, storyId) {
  await page.goto(URL, { waitUntil: "networkidle2" });
  await wait(2500);
  await page.evaluate((s) => {
    document.documentElement.style.scrollBehavior = "auto";
    const ms = document.querySelectorAll(`#${s} .ls-marker`);
    const m = ms[ms.length - 1];
    window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - innerHeight / 2 + m.offsetHeight / 2);
  }, storyId);
  await wait(1200);
  await page.evaluate(async (c) => {
    const sec = document.getElementById(c);
    for (let i = 0; i < 60; i++) {
      if (sec.getBoundingClientRect().top < innerHeight - 5) break;
      window.scrollBy(0, 120);
      await new Promise((r) => setTimeout(r, 60));
    }
  }, closerId);
  await wait(3200);
  return page.evaluate((c) => ({ y: Math.round(scrollY), secTop: Math.round(document.getElementById(c).getBoundingClientRect().top) }), closerId);
}

const sampler = (closerId, storyId) => page.evaluate((c, s) => {
  window.__s = [];
  window.__t0 = performance.now();
  const tick = () => {
    const fl = document.querySelector(`[data-flight="${s}"]`);
    const on = fl && fl.style.display !== "none";
    const e = { t: Math.round(performance.now() - window.__t0), y: Math.round(scrollY), on };
    if (on) {
      const r = fl.firstElementChild.getBoundingClientRect();
      e.p = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width) };
      e.off = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
    }
    window.__s.push(e);
    if (window.__s.length < 500) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}, closerId, storyId);

/* 1 — a brisk scroll up: no reversal, no long freeze. */
async function briskUp(closerId, storyId, label) {
  console.log(`\n=== ${label}: a brisk scroll up ===`);
  console.log("landed:", JSON.stringify(await landOn(closerId, storyId)));
  await sampler(closerId, storyId);
  for (let i = 0; i < 30; i++) { await notch(-100); await wait(45); }
  await wait(1500);
  const r = await page.evaluate(() => {
    const s = window.__s;
    let rev = 0, revPx = 0, up = 0;
    // the longest run of frames where the page did not move, measured only
    // while the reader was still pushing (the tail after the last notch is
    // the page standing still because nobody is scrolling it)
    let hold = 0, held = 0, heldAt = 0;
    for (let i = 1; i < s.length; i++) {
      const d = s[i].y - s[i - 1].y;
      if (d > 0) { rev++; revPx += d; }
      if (d < 0) { up += -d; hold = 0; }
      else if (s[i].t < 2400) { hold += s[i].t - s[i - 1].t; if (hold > held) { held = hold; heldAt = s[i].t; } }
    }
    return { reversals: rev, reversalPx: revPx, upPx: up, heldMs: held, heldUntil: heldAt, frames: s.length };
  });
  console.log(JSON.stringify(r));
  ok(`${label}: the page never goes down while the reader pushes up`, r.reversals === 0, `(${r.reversals} frames, ${r.reversalPx}px)`);
  ok(`${label}: held still no longer than the way out`, r.heldMs <= 650, `(${r.heldMs}ms)`);
  ok(`${label}: the reader gets out`, r.upPx > 2000, `(${r.upPx}px)`);
}

/* 2 — one nudge, hands off: the phone flies home and lands on the story's. */
async function glideHome(closerId, storyId, label) {
  console.log(`\n=== ${label}: one nudge, hands off ===`);
  await landOn(closerId, storyId);
  await sampler(closerId, storyId);
  await notch(-100);
  await wait(3000);
  const r = await page.evaluate((s) => {
    const g = window.__s.filter((x) => x.on && x.p.x > 0);
    // the first sampled frame can catch the flight the instant it is switched
    // on and before its own rAF has placed it — this sampler is registered
    // first, so it runs first. Nothing has been painted yet; skip it.
    const g2 = g.slice(1);
    const col = document.querySelector(`#${s} .ls-phone-col`);
    const ph = col.querySelector(".ls-phone-wrap")?.firstElementChild || col.firstElementChild;
    const pr = ph.getBoundingClientRect();
    const last = g2[g2.length - 1];
    return {
      frames: g2.length,
      span: g2.length ? g2[g2.length - 1].t - g2[0].t : 0,
      travelX: g2.length ? Math.abs(last.p.x - g2[0].p.x) : 0,
      offscreen: g2.filter((x) => x.off).length,
      landing: last ? { dx: Math.round(last.p.x - (pr.left + pr.width / 2)), dy: Math.round(last.p.y - (pr.top + pr.height / 2)), dw: Math.round(last.p.w - pr.width) } : null,
    };
  }, storyId);
  console.log(JSON.stringify(r));
  ok(`${label}: the phone actually flies home`, r.travelX > 200, `(${r.travelX}px across)`);
  ok(`${label}: never off screen`, r.frames > 10 && r.offscreen === 0);
  ok(`${label}: lands on the story's own phone`, !!r.landing && Math.abs(r.landing.dx) <= 2 && Math.abs(r.landing.dy) <= 2 && r.landing.dw === 0, JSON.stringify(r.landing));
}

/* 3 — turning around inside the glide. The page is the reader's from the cut,
   so half a second is enough to scroll straight back into the closer — and the
   observer will not report it, because from where it sits the section never
   left the screen. The closer must be whole, not stripped. */
async function turnBack(closerId, storyId, label) {
  console.log(`
=== ${label}: turning around inside the glide ===`);
  await landOn(closerId, storyId);
  await notch(-100);
  await wait(420); // past the closer's way out and the cut, into the glide
  for (let i = 0; i < 14; i++) { await notch(120); await wait(18); }
  await wait(2500);
  const r = await page.evaluate((c) => {
    const sec = document.getElementById(c);
    const shell = sec.querySelector("[data-closer-phone]");
    const words = sec.querySelector(".lc-words");
    return {
      onScreen: sec.getBoundingClientRect().top < innerHeight - 120 && sec.getBoundingClientRect().bottom > 120,
      phoneHidden: shell.classList.contains("lc-hide"),
      wordsParked: words.classList.contains("lc-pre"),
      phoneOpacity: getComputedStyle(shell).visibility,
    };
  }, closerId);
  console.log(JSON.stringify(r));
  ok(`${label}: the reader is back in the closer`, r.onScreen);
  ok(`${label}: and it is whole, not stripped`, !r.phoneHidden && !r.wordsParked);
}

await page.goto(URL, { waitUntil: "networkidle2" });
const has = await page.evaluate(() => ({ s1: !!document.getElementById("story1"), s2: !!document.getElementById("story2") }));
console.log("stories on the page:", JSON.stringify(has));
if (has.s1) {
  await briskUp("campus-colours", "story1", "Campus Colours");
  await glideHome("campus-colours", "story1", "Campus Colours");
  await turnBack("campus-colours", "story1", "Campus Colours");
}
if (has.s2) {
  await briskUp("blade-lock", "story2", "Blade Lock");
  await glideHome("blade-lock", "story2", "Blade Lock");
  await turnBack("blade-lock", "story2", "Blade Lock");
}

await browser.close();
console.log(fails ? `\ndone — ${fails} FAILED` : "\ndone — all green");
process.exit(fails ? 1 : 0);
