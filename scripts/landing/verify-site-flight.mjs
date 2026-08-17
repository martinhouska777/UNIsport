// Verifies the NATIVE flights (components/landing/StoryCloser.tsx) in real
// headless Chrome — the sibling of verify-flight.mjs + verify-reverse.mjs for
// the artifact. Both closers: the phone must fly, never leave the screen, and
// land exactly on the closer's own phone (dx=0 dy=0 dw=0). Then the student
// transition there AND back: words fade, the closer builds itself, one wheel
// nudge up reverses it all, down again replays afresh, and a reload at the
// closer reveals in place with no flight.
//
//   node verify-site-flight.mjs                    # http://localhost:3000/landing-preview
//   node verify-site-flight.mjs http://localhost:3000/
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:3000/landing-preview";
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const ok = (name, cond) => { console.log((cond ? "PASS " : "FAIL ") + name); if (!cond) fails++; };
page.on("pageerror", (e) => console.log("pageerror:", e.message));

await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle2" });
await wait(2000);

const parkAtEnd = (sid) => page.evaluate((s) => {
  document.documentElement.style.scrollBehavior = "auto";
  const ms = document.querySelectorAll(`#${s} .ls-marker`);
  const m = ms[ms.length - 1];
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - innerHeight / 2 + m.offsetHeight / 2);
}, sid);
const nudgeIn = (cid) => page.evaluate(async (c) => {
  const sec = document.getElementById(c);
  for (let i = 0; i < 60; i++) {
    if (sec.getBoundingClientRect().top < innerHeight - 5) break;
    window.scrollBy(0, 120);
    await new Promise((r) => setTimeout(r, 60));
  }
}, cid);

async function flyInto(closerId, storyId, label) {
  console.log(`\n=== ${label}: ${storyId} -> ${closerId} ===`);
  await parkAtEnd(storyId);
  await wait(1200);
  await page.evaluate((sid, cid) => {
    window.__samples = [];
    window.__t0 = performance.now();
    const tick = () => {
      const fl = document.querySelector(`[data-flight="${sid}"]`);
      const on = fl && fl.style.display !== "none";
      const s = { t: Math.round(performance.now() - window.__t0), on, y: Math.round(window.scrollY) };
      if (on) {
        const r = fl.firstElementChild.getBoundingClientRect();
        s.phone = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), top: Math.round(r.top), bot: Math.round(r.bottom) };
        s.offscreen = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
        s.shotStates = [...fl.querySelectorAll(".ls-shots > *")].map((e) => ({ op: getComputedStyle(e).opacity, tr: e.style.translate || "" }));
      }
      s.secTop = Math.round(document.getElementById(cid).getBoundingClientRect().top);
      window.__samples.push(s);
      if (window.__samples.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, storyId, closerId);
  await nudgeIn(closerId);
  await wait(2600);
  await page.screenshot({ path: `site-flight-${closerId}-landed.png` });
  const rep = await page.evaluate((cid, sid) => {
    const sec = document.getElementById(cid);
    const shell = sec.querySelector("[data-closer-phone]");
    const sr = shell.getBoundingClientRect();
    return {
      pinned: sec.classList.contains("lc-pinned"),
      secTopNow: Math.round(sec.getBoundingClientRect().top),
      scrollY: Math.round(window.scrollY),
      shellHidden: shell.classList.contains("lc-hide"),
      shellRect: { x: Math.round(sr.left + sr.width / 2), y: Math.round(sr.top + sr.height / 2), w: Math.round(sr.width) },
      flightOn: document.querySelector(`[data-flight="${sid}"]`).style.display !== "none",
      samples: window.__samples.length,
    };
  }, closerId, storyId);
  console.log("landed:", JSON.stringify(rep));
  const trace = await page.evaluate(() => {
    const s = window.__samples.filter((x) => x.on);
    if (!s.length) return { flew: false };
    const first = s[0], last = s[s.length - 1];
    const widths = s.map((x) => x.phone.w);
    return {
      flew: true, frames: s.length, durMs: last.t - first.t, start: first.phone, end: last.phone,
      offscreenFrames: s.filter((x) => x.offscreen).length,
      wMin: Math.min(...widths), wMax: Math.max(...widths), scrollTravel: last.y - first.y,
      mid: s[Math.floor(s.length / 2)],
    };
  });
  console.log("flight:", JSON.stringify(trace));
  if (trace.flew) {
    const dx = trace.end.x - rep.shellRect.x, dy = trace.end.y - rep.shellRect.y, dw = trace.end.w - rep.shellRect.w;
    console.log(`landing error: dx=${dx} dy=${dy} dw=${dw}`);
    ok(`${label}: flew, never off screen`, trace.offscreenFrames === 0);
    ok(`${label}: landed pinned, phone revealed`, rep.pinned && rep.secTopNow === 0 && !rep.shellHidden && !rep.flightOn);
    ok(`${label}: landing error 0/0/0`, Math.abs(dx) <= 1 && Math.abs(dy) <= 1 && dw === 0);
  } else {
    ok(`${label}: flew`, false);
  }
  return { rep, trace };
}

await flyInto("campus-colours", "story1", "Campus Colours");
await flyInto("blade-lock", "story2", "Blade Lock");
await wait(2500);
const oars = await page.evaluate(() => {
  const btns = [...document.querySelectorAll('#blade-lock button[aria-label$=" Rowing"]')];
  const front = btns.map((b) => ({ n: b.getAttribute("aria-label"), z: +b.style.zIndex, op: +b.style.opacity, tr: b.style.transform }))
    .sort((a, c) => c.z - a.z)[0];
  const label = document.querySelector("#blade-lock .lc-label");
  return { front, labelPre: label.classList.contains("lc-pre"), labelOpacity: getComputedStyle(label).opacity };
});
console.log("oars after landing:", JSON.stringify(oars));
ok("Blade Lock: oars spread (front oar full-size, visible), name shown", oars.front.op > 0.9 && /scale\(1\.0/.test(oars.front.tr) && !oars.labelPre);
await page.screenshot({ path: "site-flight-blades-settled.png" });

// ── the student transition there AND back ──
console.log("\n=== reverse: story1 <-> campus-colours ===");
const state = () => page.evaluate(() => {
  const sec = document.getElementById("campus-colours");
  const shell = sec.querySelector("[data-closer-phone]");
  const lt = sec.querySelector(".lc-letter");
  const hd = sec.querySelector(".lc-words");
  const stg = document.querySelector("#story1 .ls-stage");
  const col = document.querySelector("#story1 .ls-phone-col");
  return {
    y: Math.round(scrollY),
    secTop: Math.round(sec.getBoundingClientRect().top),
    flightOn: document.querySelector('[data-flight="story1"]').style.display !== "none",
    shellHidden: shell.classList.contains("lc-hide"),
    letter: [...lt.classList].filter((c) => c.startsWith("lc-") && c !== "lc-letter").join(" ") || "in",
    headsParked: hd.classList.contains("lc-pre"),
    headsX: Math.round(hd.getBoundingClientRect().left),
    storyWordsGone: stg.classList.contains("ls-gone"),
    storyPhoneHidden: col.style.visibility === "hidden",
    copyOpacity: getComputedStyle(stg.querySelector(".ls-copy")).opacity,
  };
});
// a fresh page, like the artifact's reverse suite: a closer that was scrolled
// PAST downward stays armed until it is scrolled back above (as designed)
await page.reload({ waitUntil: "networkidle2" });
await wait(2000);
await parkAtEnd("story1");
await wait(1200);
console.log("at story end:   ", JSON.stringify(await state()));
await nudgeIn("campus-colours");
await wait(700);
const mid = await state();
console.log("mid-flight:     ", JSON.stringify(mid));
await wait(2200);
const landed = await state();
console.log("landed:         ", JSON.stringify(landed));
await page.evaluate(() => window.dispatchEvent(new WheelEvent("wheel", { deltaY: -120, bubbles: true })));
await wait(1300);
console.log("mid-reverse:    ", JSON.stringify(await state()));
await page.screenshot({ path: "site-rev-midreverse.png" });
await wait(1900);
const back = await state();
console.log("back at story:  ", JSON.stringify(back));
await page.screenshot({ path: "site-rev-back.png" });
await nudgeIn("campus-colours");
await wait(2900);
const again = await state();
console.log("landed again:   ", JSON.stringify(again));

// reload at the closer: reveal in place, no flight
const restoreY = await page.evaluate(() => {
  const sec = document.getElementById("campus-colours");
  return sec.getBoundingClientRect().top + window.scrollY + 60;
});
await page.reload({ waitUntil: "networkidle2" });
await wait(2000);
await page.evaluate((y) => { document.documentElement.style.scrollBehavior = "auto"; window.scrollTo(0, y); }, restoreY);
await wait(2500);
const restored = await page.evaluate(() => ({
  flightOn: document.querySelector('[data-flight="story1"]').style.display !== "none",
  shellVisible: !document.querySelector("#campus-colours [data-closer-phone]").classList.contains("lc-hide"),
  y: Math.round(scrollY),
}));
console.log("restored:       ", JSON.stringify(restored));

ok("story words faded during flight", mid.storyWordsGone);
ok("flight ran", mid.flightOn);
ok("landed pinned on the closer", landed.secTop === 0 && !landed.flightOn);
ok("closer words arrived (not parked)", !landed.headsParked);
ok("letter out", landed.letter.indexOf("lc-pre") === -1);
ok("reverse landed above the closer", back.secTop >= 899 && !back.flightOn);
ok("story words back", !back.storyWordsGone && back.copyOpacity === "1");
ok("story phone back", !back.storyPhoneHidden);
ok("closer re-parked after reverse", back.shellHidden === true && back.headsParked);
ok("replays afresh", again.secTop === 0 && !again.headsParked && again.letter.indexOf("lc-pre") === -1);
ok("reload at the closer reveals in place, no flight", !restored.flightOn && restored.shellVisible && Math.abs(restored.y - restoreY) < 400);

await browser.close();
console.log(fails ? `\ndone — ${fails} FAILED` : "\ndone — all green");
process.exit(fails ? 1 : 0);
