// Drives the student transition there AND back in real headless Chrome:
// down-flight (words fade, camera follows, words+letter arrive together),
// one wheel-nudge up (full reverse), then down again (replays afresh).
import puppeteer from "puppeteer-core";

const SHOTS = "C:/Users/marti/AppData/Local/Temp/claude/C--01business-UNIsport/e81d862a-97c8-477a-8ab8-f8d859cc1bc8/scratchpad";

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto("http://localhost:8124/", { waitUntil: "networkidle2" });
await wait(2500);

const state = () => page.evaluate(() => {
  const sec = document.getElementById("closer-colours");
  const f = sec.querySelector("iframe");
  const d = f.contentDocument;
  const shell = d && d.querySelector(".__ph");
  const lt = d && d.querySelector(".__lt");
  const hd = d ? [...d.querySelectorAll(".__hd")] : [];
  const stg = document.querySelector("#story1 .stage");
  const col = document.querySelector("#story1 .phone-col");
  return {
    y: Math.round(scrollY),
    secTop: Math.round(sec.getBoundingClientRect().top),
    flightOn: document.getElementById("flight").classList.contains("on"),
    shellHidden: shell ? shell.classList.contains("hide") : "?",
    letter: lt ? lt.className.replace("__lt", "").trim() : "(none)",
    heads: hd.length,
    headsParked: hd.filter(e => e.classList.contains("pre")).length,
    storyWordsGone: stg.classList.contains("gone"),
    storyPhoneHidden: col.style.visibility === "hidden",
    copyOpacity: getComputedStyle(stg.querySelector(".copy")).opacity,
  };
});

// ── park at the end of story1, like a reader ──
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const ms = document.querySelectorAll("#story1 .marker");
  const m = ms[ms.length - 1];
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - innerHeight / 2 + m.offsetHeight / 2);
});
await wait(1200);
console.log("at story end:   ", JSON.stringify(await state()));

// ── nudge down until the closer's edge shows; the flight takes it from there ──
await page.evaluate(async () => {
  const sec = document.getElementById("closer-colours");
  for (let i = 0; i < 60; i++) {
    if (sec.getBoundingClientRect().top < innerHeight - 5) break;
    window.scrollBy(0, 120);
    await new Promise(r => setTimeout(r, 60));
  }
});
await wait(700);
const mid = await state();
console.log("mid-flight:     ", JSON.stringify(mid));
await wait(2200);
const landed = await state();
console.log("landed:         ", JSON.stringify(landed));
await page.screenshot({ path: `${SHOTS}/rev-1-landed.png` });

// words really in place? measure the headline block's position
const headsIn = await page.evaluate(() => {
  const d = document.querySelector("#closer-colours iframe").contentDocument;
  return [...d.querySelectorAll(".__hd")].map(e => ({
    pre: e.classList.contains("pre"),
    x: Math.round(e.getBoundingClientRect().left),
    op: getComputedStyle(e).opacity,
    text: e.textContent.trim().slice(0, 30),
  }));
});
console.log("closer words:   ", JSON.stringify(headsIn));

// ── ONE wheel nudge up → the whole film in reverse ──
await page.evaluate(() => window.dispatchEvent(new WheelEvent("wheel", { deltaY: -120, bubbles: true })));
await wait(700);
console.log("mid-reverse:    ", JSON.stringify(await state()));
await page.screenshot({ path: `${SHOTS}/rev-2-midreverse.png` });
await wait(1600);
const back = await state();
console.log("back at story:  ", JSON.stringify(back));
await page.screenshot({ path: `${SHOTS}/rev-3-back.png` });

// ── and down again: it must replay afresh ──
await page.evaluate(async () => {
  const sec = document.getElementById("closer-colours");
  for (let i = 0; i < 60; i++) {
    if (sec.getBoundingClientRect().top < innerHeight - 5) break;
    window.scrollBy(0, 120);
    await new Promise(r => setTimeout(r, 60));
  }
});
await wait(2900);
const again = await state();
console.log("landed again:   ", JSON.stringify(again));
await page.screenshot({ path: `${SHOTS}/rev-4-landed-again.png` });

// ── verdicts ──
const ok = (name, cond) => console.log((cond ? "PASS " : "FAIL ") + name);
ok("story words faded during flight", mid.storyWordsGone && mid.copyOpacity === "0" || mid.storyWordsGone);
ok("flight ran", mid.flightOn);
ok("landed pinned on the closer", landed.secTop === 0 && !landed.flightOn);
ok("closer words arrived (not parked)", landed.heads > 0 && landed.headsParked === 0);
ok("letter out", landed.letter.indexOf("pre") === -1);
ok("reverse landed above the closer", back.secTop >= 899 && !back.flightOn);
ok("story words back", !back.storyWordsGone && back.copyOpacity === "1");
ok("story phone back", !back.storyPhoneHidden);
ok("closer re-parked after reverse", back.shellHidden === true && back.headsParked === back.heads);
ok("replays afresh", again.secTop === 0 && again.headsParked === 0 && again.letter.indexOf("pre") === -1);

await browser.close();
console.log("done");
