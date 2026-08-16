// Verifies the scroll story in a real compositing browser: the Browser pane is
// hidden, so requestAnimationFrame never fires there and every measurement came
// back frozen at its load-time value.
import puppeteer from "puppeteer-core";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function report(label, storyId, beat) {
  await page.evaluate(
    (sid, b) => {
      document.documentElement.style.scrollBehavior = "auto";
      const m = document.querySelector(`#${sid} .marker[data-i="${b}"]`);
      const y = m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2;
      window.scrollTo(0, y);
    },
    storyId,
    beat
  );
  await wait(900);
  const out = await page.evaluate((sid) => {
    const st = document.querySelector(`#${sid} .stage`);
    const ph = document.querySelector(`#${sid} .phone`).getBoundingClientRect();
    const cp = document.querySelector(`#${sid} .copy`).getBoundingClientRect();
    const active = document.querySelector(`#${sid} .beat.active`);
    const shot = document.querySelector(`#${sid} .shot-frame.active .shot`);
    return {
      active: active?.dataset.i,
      headline: active?.querySelector("h2")?.innerText.slice(0, 38),
      flipped: st.classList.contains("flip"),
      phoneX: Math.round(ph.left + ph.width / 2),
      copyX: Math.round(cp.left + cp.width / 2),
      vw: window.innerWidth,
      pan: shot?.style.transform || "(still)",
      drift: document.querySelector(`#${sid} .phone-wrap`).style.transform,
    };
  }, storyId);
  console.log(label, JSON.stringify(out));
  return out;
}

// ── desktop ──
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto("http://localhost:8124/", { waitUntil: "networkidle2" });
await wait(1500);
console.log("compatMode:", await page.evaluate(() => document.compatMode));

await report("story1 beat0 ", "story1", 0);
await report("story1 beat4 ", "story1", 4);
await report("story1 beat5 ", "story1", 5);
await report("story1 beat6 ", "story1", 6);
await report("story2 beat0 ", "story2", 0);
await report("story2 beat1 ", "story2", 1);
await report("story2 beat2 ", "story2", 2);
await report("story2 beat4 ", "story2", 4);

// ── the opening hold: the first screen must sit still while it is read ──
async function atFraction(storyId, beat, f) {
  await page.evaluate((sid, b, frac) => {
    document.documentElement.style.scrollBehavior = "auto";
    const m = document.querySelector(`#${sid} .marker[data-i="${b}"]`);
    const top = m.getBoundingClientRect().top + window.scrollY;
    window.scrollTo(0, top - window.innerHeight + (m.offsetHeight + window.innerHeight) * frac);
  }, storyId, beat, f);
  await wait(700);
  return page.evaluate((sid) => document.querySelector(`#${sid} .shot-frame.active .shot`)?.style.transform || "(none)",
    storyId);
}
for (const f of [0.2, 0.4, 0.5, 0.7, 0.95]) {
  console.log(`story2 beat0 pan @${f}:`, await atFraction("story2", 0, f));
}

// screenshots of the two sides
await page.evaluate(() => {
  const m = document.querySelector('#story1 .marker[data-i="1"]');
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2);
});
await wait(1200);
await page.screenshot({ path: "shot-right.png" });

await page.evaluate(() => {
  const m = document.querySelector('#story1 .marker[data-i="5"]');
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2);
});
await wait(1400);
await page.screenshot({ path: "shot-left.png" });

await page.evaluate(() => {
  const m = document.querySelector('#story2 .marker[data-i="1"]');
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2);
});
await wait(1200);
await page.screenshot({ path: "shot-varsity.png" });

// ── click test: does tapping the phone advance? ──
const before = await page.evaluate(() => document.querySelector("#story2 .beat.active").dataset.i);
await page.evaluate(() => document.querySelector("#story2 .phone").click());
await wait(1500);
const after = await page.evaluate(() => document.querySelector("#story2 .beat.active").dataset.i);
console.log("phone click:", before, "->", after);

// ── dot test ──
await page.evaluate(() => document.querySelectorAll("#story2 .dot")[4].click());
await wait(1500);
console.log("dot click ->", await page.evaluate(() => document.querySelector("#story2 .beat.active").dataset.i));

// ── mobile ──
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.reload({ waitUntil: "networkidle2" });
await wait(1500);
const mob = await page.evaluate(() => {
  const ph = document.querySelector("#story1 .phone").getBoundingClientRect();
  const cp = document.querySelector("#story1 .copy").getBoundingClientRect();
  return {
    phoneW: Math.round(ph.width), phoneH: Math.round(ph.height),
    stack: Math.round(cp.height + ph.height), vh: window.innerHeight,
    horiz: document.body.scrollWidth > window.innerWidth,
  };
});
console.log("mobile:", JSON.stringify(mob));
await page.evaluate(() => {
  const m = document.querySelector('#story1 .marker[data-i="2"]');
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2);
});
await wait(1200);
await page.screenshot({ path: "shot-mobile.png" });

await browser.close();
console.log("done");
