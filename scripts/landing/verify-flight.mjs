// Drives the two flights (story → closer) in real headless Chrome and measures:
// takeoff alignment, phone visibility throughout, swap timing, landing error,
// what plays after arrival. Screenshots at key moments.
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
await wait(2500); // let the closer frames load + prime

async function flyInto(closerId, storyId, label) {
  console.log(`\n=== ${label}: ${storyId} -> ${closerId} ===`);

  // 1. park on the story's last beat, like a reader who just finished it
  await page.evaluate((sid) => {
    document.documentElement.style.scrollBehavior = "auto";
    const ms = document.querySelectorAll(`#${sid} .marker`);
    const m = ms[ms.length - 1];
    window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - window.innerHeight / 2 + m.offsetHeight / 2);
  }, storyId);
  await wait(1200);

  // start sampling BEFORE we nudge the section into view
  await page.evaluate((cid) => {
    window.__samples = [];
    window.__t0 = performance.now();
    const tick = () => {
      const fl = document.getElementById("flight");
      const on = fl && fl.classList.contains("on");
      const s = { t: Math.round(performance.now() - window.__t0), on, y: Math.round(window.scrollY) };
      if (on) {
        const r = fl.querySelector(".phone").getBoundingClientRect();
        s.phone = { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2), w: Math.round(r.width), top: Math.round(r.top), bot: Math.round(r.bottom) };
        s.offscreen = r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth;
        const shots = fl.querySelectorAll(".shots .shot-frame, .shots > *");
        s.shotStates = [...fl.querySelectorAll(".shots > *")].map(e => ({ op: getComputedStyle(e).opacity, tr: e.style.translate || "" }));
      }
      const sec = document.getElementById(cid);
      s.secTop = Math.round(sec.getBoundingClientRect().top);
      window.__samples.push(s);
      if (window.__samples.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, closerId);

  // 2. one wheel-nudge worth of scroll: creep down until the section edge shows
  await page.evaluate(async (cid) => {
    const sec = document.getElementById(cid);
    for (let i = 0; i < 60; i++) {
      if (sec.getBoundingClientRect().top < innerHeight - 5) break;
      window.scrollBy(0, 120);
      await new Promise(r => setTimeout(r, 60));
    }
  }, closerId);

  // 3. let the flight play out
  await wait(2600);
  await page.screenshot({ path: `${SHOTS}/flight-${closerId}-landed.png` });

  // 4. landing report
  const rep = await page.evaluate((cid) => {
    const sec = document.getElementById(cid);
    const f = sec.querySelector("iframe");
    const d = f.contentDocument;
    const shell = d && d.querySelector(".__ph");
    const sr = shell && shell.getBoundingClientRect();
    const fr = f.getBoundingClientRect();
    const letter = d && d.querySelector(".__lt");
    const secR = sec.getBoundingClientRect();
    return {
      pinned: sec.classList.contains("pinned"),
      secTopNow: Math.round(secR.top),
      scrollY: Math.round(window.scrollY),
      shellHidden: shell ? shell.classList.contains("hide") : "(no shell)",
      shellRect: sr ? { x: Math.round(fr.left + sr.left + sr.width / 2), y: Math.round(fr.top + sr.top + sr.height / 2), w: Math.round(sr.width) } : null,
      letterPre: letter ? letter.classList.contains("pre") : "(none)",
      flightOn: document.getElementById("flight").classList.contains("on"),
      samples: window.__samples.length,
    };
  }, closerId);
  console.log("landed:", JSON.stringify(rep));

  // condensed flight trace
  const trace = await page.evaluate(() => {
    const s = window.__samples.filter(x => x.on);
    if (!s.length) return { flew: false };
    const first = s[0], last = s[s.length - 1];
    const off = s.filter(x => x.offscreen).length;
    const widths = s.map(x => x.phone.w);
    return {
      flew: true, frames: s.length,
      durMs: last.t - first.t,
      start: first.phone, end: last.phone,
      offscreenFrames: off,
      wMin: Math.min(...widths), wMax: Math.max(...widths),
      scrollTravel: last.y - first.y,
      mid: s[Math.floor(s.length / 2)],
    };
  });
  console.log("flight:", JSON.stringify(trace));
  return { rep, trace };
}

const colours = await flyInto("closer-colours", "story1", "Campus Colours");
// alignment: where the flight ended vs where the closer's phone is
if (colours.trace.flew && colours.rep.shellRect) {
  const dx = colours.trace.end.x - colours.rep.shellRect.x;
  const dy = colours.trace.end.y - colours.rep.shellRect.y;
  const dw = colours.trace.end.w - colours.rep.shellRect.w;
  console.log(`landing error: dx=${dx} dy=${dy} dw=${dw}`);
}

// oars state after the blades flight
const blades = await flyInto("closer-blades", "story2", "Blade Lock");
if (blades.trace.flew && blades.rep.shellRect) {
  const dx = blades.trace.end.x - blades.rep.shellRect.x;
  const dy = blades.trace.end.y - blades.rep.shellRect.y;
  const dw = blades.trace.end.w - blades.rep.shellRect.w;
  console.log(`landing error: dx=${dx} dy=${dy} dw=${dw}`);
}
await wait(2500);
const oars = await page.evaluate(() => {
  const f = document.querySelector("#closer-blades iframe");
  const d = f.contentDocument;
  const shell = d && d.querySelector(".__ph");
  if (!d) return "(no doc)";
  // oars: elements the page parked with translate/scale
  const parked = [...d.querySelectorAll("[data-oar], .__oar")].length;
  return { parked, hasShell: !!shell };
});
console.log("oars probe:", JSON.stringify(oars));
await page.screenshot({ path: `${SHOTS}/flight-blades-settled.png` });

await browser.close();
console.log("\ndone");
