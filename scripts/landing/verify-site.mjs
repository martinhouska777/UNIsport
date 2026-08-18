// Verifies the NATIVE scroll stories (components/landing/ScrollStory.tsx) in
// real headless Chrome — the sibling of verify.mjs, which checks the artifact.
// Same measurements: beats switch with the scroll, the phone flips sides at
// the pivot, pans travel, the opening hold holds, phone-click and dot-click
// navigate, and the mobile layout has no horizontal overflow.
//
//   node verify-site.mjs                      # http://localhost:3000/
//   node verify-site.mjs http://localhost:3000/   # once assembled
//
// Screenshots land next to this file (gitignored).
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:3000/";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
// a cold dev server takes a while to serve a phone-DPR page through the image optimiser
page.setDefaultNavigationTimeout(120000);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, label) => { console.log((ok ? "PASS " : "FAIL ") + label); if (!ok) fails++; };

async function report(label, storyId, beat) {
  await page.evaluate(
    (sid, b) => {
      document.documentElement.style.scrollBehavior = "auto";
      const m = document.querySelector(`#${sid} .ls-marker[data-i="${b}"]`);
      const y = m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2;
      window.scrollTo(0, y);
    },
    storyId,
    beat,
  );
  await wait(900);
  const out = await page.evaluate((sid) => {
    const st = document.querySelector(`#${sid} .ls-stage`);
    const ph = document.querySelector(`#${sid} [data-story-phone]`).getBoundingClientRect();
    const cp = document.querySelector(`#${sid} .ls-copy`).getBoundingClientRect();
    const beats = [...document.querySelectorAll(`#${sid} .ls-beat`)];
    const active = beats.findIndex((b) => b.classList.contains("ls-on"));
    const shot = document.querySelector(`#${sid} .ls-frame.ls-on .ls-shot`);
    return {
      active,
      headline: beats[active]?.querySelector("h2")?.innerText.slice(0, 38),
      flipped: st.classList.contains("ls-flip"),
      phoneX: Math.round(ph.left + ph.width / 2),
      copyX: Math.round(cp.left + cp.width / 2),
      vw: window.innerWidth,
      pan: shot?.style.transform || "(still)",
      drift: document.querySelector(`#${sid} .ls-phone-wrap`).style.transform,
    };
  }, storyId);
  console.log(label, JSON.stringify(out));
  return out;
}

// ── desktop ──
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle2" });
await wait(1500);
console.log("compatMode:", await page.evaluate(() => document.compatMode));

const s1b0 = await report("story1 beat0 ", "story1", 0);
const s1b4 = await report("story1 beat4 ", "story1", 4);
await report("story1 beat5 ", "story1", 5);
const s1b6 = await report("story1 beat6 ", "story1", 6);
const s2b0 = await report("story2 beat0 ", "story2", 0);
await report("story2 beat1 ", "story2", 1);
const s2b2 = await report("story2 beat2 ", "story2", 2);
const s2b4 = await report("story2 beat4 ", "story2", 4);

check(s1b0.active === 0 && s1b4.active === 4 && s1b6.active === 6 && s2b0.active === 0 && s2b4.active === 4, "beats follow the scroll");
check(!s1b0.flipped && s1b4.flipped && s1b6.flipped && !s2b0.flipped && !s2b2.flipped && s2b4.flipped, "the phone flips at the pivot");
check(s1b0.phoneX > s1b0.copyX && s1b4.phoneX < s1b4.copyX, "phone right, then left, of the words");
check(s1b4.pan !== "(still)" && s2b2.pan !== "(still)", "tall captures pan");

// ── the opening hold: the first screen must sit still while it is read ──
async function atFraction(storyId, beat, f) {
  await page.evaluate((sid, b, frac) => {
    document.documentElement.style.scrollBehavior = "auto";
    const m = document.querySelector(`#${sid} .ls-marker[data-i="${b}"]`);
    const top = m.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight + (m.offsetHeight + window.innerHeight) * frac);
  }, storyId, beat, f);
  await wait(700);
  return page.evaluate((sid) => document.querySelector(`#${sid} .ls-frame.ls-on .ls-shot`)?.style.transform || "(none)", storyId);
}
const holds = {};
for (const f of [0.2, 0.4, 0.5, 0.7, 0.95]) {
  holds[f] = await atFraction("story2", 0, f);
  console.log(`story2 beat0 pan @${f}:`, holds[f]);
}
const px = (t) => parseFloat((t.match(/-?[\d.]+/) || ["0"])[0]);
check(px(holds[0.2]) === 0 && px(holds[0.4]) === 0 && px(holds[0.7]) < px(holds[0.5]) && px(holds[0.95]) < px(holds[0.7]), "V1 holds, then pans");

// screenshots of the two sides
for (const [sid, b, name] of [["story1", 1, "site-right"], ["story1", 5, "site-left"], ["story2", 1, "site-varsity"]]) {
  await page.evaluate((s, i) => {
    const m = document.querySelector(`#${s} .ls-marker[data-i="${i}"]`);
    window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2);
  }, sid, b);
  await wait(1300);
  await page.screenshot({ path: `${name}.png` });
}

// ── click test: does tapping the phone advance? ──
const activeOf = (sid) => page.evaluate((s) => [...document.querySelectorAll(`#${s} .ls-beat`)].findIndex((b) => b.classList.contains("ls-on")), sid);
const before = await activeOf("story2");
await page.evaluate(() => document.querySelector("#story2 [data-story-phone]").click());
await wait(1500);
const after = await activeOf("story2");
console.log("phone click:", before, "->", after);
check(after === before + 1, "phone click advances");

// ── dot test ──
await page.evaluate(() => document.querySelectorAll("#story2 .ls-dot")[4].click());
await wait(1500);
const dotTo = await activeOf("story2");
console.log("dot click ->", dotTo);
check(dotTo === 4, "dot click navigates");

// ── mobile ──
// A fresh tab already at phone size, waiting for DOM-ready and a settle — not
// "load": the dev server's image optimiser can hold a phone-DPR page's load
// event for minutes, and nothing measured here needs the images.
await page.close();
const page2 = await browser.newPage();
page2.setDefaultNavigationTimeout(120000);
await page2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page2.goto(URL, { waitUntil: "domcontentloaded" });
await wait(6000);
const mob = await page2.evaluate(() => {
  const ph = document.querySelector("#story1 [data-story-phone]").getBoundingClientRect();
  const cp = document.querySelector("#story1 .ls-copy").getBoundingClientRect();
  return {
    phoneW: Math.round(ph.width), phoneH: Math.round(ph.height),
    stack: Math.round(cp.height + ph.height), vh: window.innerHeight,
    horiz: document.body.scrollWidth > window.innerWidth,
  };
});
console.log("mobile:", JSON.stringify(mob));
check(!mob.horiz && mob.stack < mob.vh, "mobile: no horizontal overflow, stack fits");
await page2.evaluate(() => {
  const m = document.querySelector('#story1 .ls-marker[data-i="2"]');
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2);
});
await wait(1200);
await page2.screenshot({ path: "site-mobile.png" });

await browser.close();
console.log(fails ? `done — ${fails} FAILED` : "done — all green");
process.exit(fails ? 1 : 0);
