// Drives the varsity transition in real headless Chrome: the in-place cut,
// the blades peeking out from behind the phone in formation, the spread, the
// CONTINUOUS smooth wheel afterwards, and the reverse.
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

// reach the wheel's logic instance inside the closer's iframe
const wheel = () => page.evaluate(() => {
  const d = document.querySelector("#closer-blades iframe").contentDocument;
  const all = [...d.querySelectorAll("*")];
  const root = all.find(n => Object.getOwnPropertyNames(n).some(k => k.startsWith("__reactContainer$")));
  if (!root) return null;
  const key = Object.getOwnPropertyNames(root).find(k => k.startsWith("__reactContainer$"));
  let q = [root[key]], seen = 0;
  while (q.length && seen < 20000) {
    const f = q.shift(); seen++;
    if (!f) continue;
    const sn = f.stateNode;
    if (sn && sn.logic && "rot" in sn.logic) return { rot: sn.logic.rot, pinned: sn.logic.state.pinned, active: sn.logic.state.active };
    if (f.child) q.push(f.child);
    if (f.sibling) q.push(f.sibling);
  }
  return null;
});

const oars = () => page.evaluate(() => {
  const sec = document.getElementById("closer-blades");
  const f = sec.querySelector("iframe");
  const d = f.contentDocument;
  const shell = d && d.querySelector(".__ph");
  const pr = shell ? shell.getBoundingClientRect() : null;
  const os = d ? [...d.querySelectorAll(".__oar")] : [];
  const info = os.map(o => {
    const r = o.getBoundingClientRect();
    const dim = o.querySelector("[data-dim]");
    return {
      top: Math.round(r.top), x: Math.round(r.left + r.width / 2),
      pre: o.classList.contains("pre"),
      faint: dim ? parseFloat(getComputedStyle(dim).opacity) > 0.15 : false,
    };
  });
  return {
    secTop: Math.round(sec.getBoundingClientRect().top),
    shellHidden: shell ? shell.classList.contains("hide") : "?",
    tagged: os.length,
    bright: info.filter(o => !o.faint),
    faint: info.filter(o => o.faint),
    phoneTop: pr ? Math.round(pr.top) : null,
    phoneCx: pr ? Math.round(pr.left + pr.width / 2) : null,
    heads: d ? [...d.querySelectorAll(".__hd")].map(e => e.classList.contains("pre")) : [],
    ftHidden: d ? [...d.querySelectorAll(".__ft")].map(e => e.classList.contains("pre")) : [],
  };
});

// ── park at the end of story2, then nudge in ──
await page.evaluate(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const ms = document.querySelectorAll("#story2 .marker");
  const m = ms[ms.length - 1];
  window.scrollTo(0, m.getBoundingClientRect().top + window.scrollY - innerHeight / 2 + m.offsetHeight / 2);
});
await wait(1200);
await page.evaluate(async () => {
  const sec = document.getElementById("closer-blades");
  for (let i = 0; i < 60; i++) {
    if (sec.getBoundingClientRect().top < innerHeight - 5) break;
    window.scrollBy(0, 120);
    await new Promise(r => setTimeout(r, 60));
  }
});

// wait for the actual landing (flight on → off), then time from there:
// peek rise 240→1040ms after land, holds to 1390; spread settled ~2200;
// handback 2340; unpin 2600.
await page.waitForFunction(() => document.getElementById("flight").classList.contains("on"), { timeout: 8000 });
await page.waitForFunction(() => !document.getElementById("flight").classList.contains("on"), { timeout: 8000 });
await wait(1150);
const peek = await oars();
const wPinned = await wheel();   // during the choreography: pinned on Harvard
console.log("peek:      ", JSON.stringify(peek));
console.log("pinned:    ", JSON.stringify(wPinned));
await page.screenshot({ path: `${SHOTS}/bl-1-peek.png` });

await wait(1250);   // land+2450: spread settled, handed back, unpin not yet
const spread = await page.evaluate(() => {
  // the __oar class may already be handed back; find the oars the same way
  // parkOars does — tall narrow spans holding an svg
  const d = document.querySelector("#closer-blades iframe").contentDocument;
  const shell = d.querySelector(".__ph");
  const xs = [...d.querySelectorAll("span")].filter(o => {
    const kid = o.firstElementChild;
    if (!kid || kid.tagName.toLowerCase() !== "svg") return false;
    const r = o.getBoundingClientRect();
    return !(r.height < 90 || r.width > 130 || shell.contains(o));
  }).map(o => Math.round(o.getBoundingClientRect().left + o.getBoundingClientRect().width / 2));
  return { xs, heads: [...d.querySelectorAll(".__hd")].map(e => e.classList.contains("pre")),
           ftHidden: [...d.querySelectorAll(".__ft")].map(e => e.classList.contains("pre")) };
});
console.log("spread:    ", JSON.stringify(spread));
await page.screenshot({ path: `${SHOTS}/bl-2-spread.png` });

// then released into continuous spin
await wait(700);   // past unpin
const w1 = await wheel();
await wait(800);
const w2 = await wheel();
await wait(800);
const w3 = await wheel();
console.log("wheel:     ", JSON.stringify({ w1, w2, w3 }));
const glowing = await page.evaluate(() => {
  const d = document.querySelector("#closer-blades iframe").contentDocument;
  const shell = d.querySelector(".__ph");
  let n = 0;
  [...d.querySelectorAll("span")].forEach(o => {
    const kid = o.firstElementChild;
    if (!kid || kid.tagName.toLowerCase() !== "svg") return;
    const r = o.getBoundingClientRect();
    if (r.height < 90 || r.width > 130 || shell.contains(o)) return;
    [...o.querySelectorAll("*"), o].forEach(e => {
      if ((getComputedStyle(e).filter || "").includes("drop-shadow")) n++;
    });
  });
  return n;
});
console.log("glowing:   ", glowing);
await page.screenshot({ path: `${SHOTS}/bl-3-spinning.png` });

// ── one wheel nudge up: first act (label out, words out, oars gather and
// sink), then the flight — ~1200 + 1500ms in all. Dispatched INSIDE the
// closer iframe: that is where a real cursor is. ──
await page.evaluate(() => {
  const d = document.querySelector("#closer-blades iframe").contentDocument;
  d.dispatchEvent(new d.defaultView.WheelEvent("wheel", { deltaY: -120, bubbles: true }));
});
await wait(3600);
const back = await page.evaluate(() => {
  const sec = document.getElementById("closer-blades");
  const d = sec.querySelector("iframe").contentDocument;
  const shell = d.querySelector(".__ph");
  const stg = document.querySelector("#story2 .stage");
  return {
    secTop: Math.round(sec.getBoundingClientRect().top),
    flightOn: document.getElementById("flight").classList.contains("on"),
    shellHidden: shell.classList.contains("hide"),
    oarsParked: [...d.querySelectorAll(".__oar")].filter(o => o.classList.contains("pre")).length,
    oarsTagged: d.querySelectorAll(".__oar").length,
    storyWordsBack: !stg.classList.contains("gone"),
    phoneBack: document.querySelector("#story2 .phone-col").style.visibility !== "hidden",
  };
});
console.log("back:      ", JSON.stringify(back));
await page.screenshot({ path: `${SHOTS}/bl-4-back.png` });

// ── and in again: replay ──
await page.evaluate(async () => {
  const sec = document.getElementById("closer-blades");
  for (let i = 0; i < 60; i++) {
    if (sec.getBoundingClientRect().top < innerHeight - 5) break;
    window.scrollBy(0, 120);
    await new Promise(r => setTimeout(r, 60));
  }
});
await wait(3600);
const again = await oars();
const wAgain = await wheel();
console.log("again:     ", JSON.stringify({ secTop: again.secTop, brightOut: again.bright.filter(o => !o.pre).length, tagged: again.tagged, active: wAgain && wAgain.active, pinned: wAgain && wAgain.pinned }));
await page.screenshot({ path: `${SHOTS}/bl-5-landed-again.png` });

const ok = (name, cond) => console.log((cond ? "PASS " : "FAIL ") + name);
const rank = (a) => a.map(x => a.slice().sort((p, q) => p - q).indexOf(x));
const all = peek.bright.concat(peek.faint);
const arc = peek.bright;   // the bright side is the visible top of the circle
const arcTops = arc.map(o => o.top);
const centre = arc.reduce((m, o) => Math.abs(o.x - peek.phoneCx) < Math.abs(m.x - peek.phoneCx) ? o : m);
const sorted = arc.slice().sort((a, b) => a.x - b.x);
ok("the whole wheel is there at the peek", all.length === 8 && all.every(o => !o.pre));
ok("Harvard's blade centred and proudest", Math.abs(centre.x - peek.phoneCx) < 20 && centre.top === Math.min(...arcTops));
ok("the circle is drawn in close (within phone-ish width)", all.every(o => Math.abs(o.x - peek.phoneCx) < 160));
ok("the visible arc keeps its curve, symmetric", sorted.every((o, i) => Math.abs(o.top - sorted[sorted.length - 1 - i].top) < 8));
ok("crew name held back at the peek", peek.ftHidden.length > 0 && peek.ftHidden.every(h => h));
const peekXs = all.map(o => o.x);
ok("spread reaches the arc (wider than the peek)", Math.max(...spread.xs) - Math.min(...spread.xs) > (Math.max(...peekXs) - Math.min(...peekXs)) * 2);
ok("crew name appears once the oars are in place", spread.ftHidden.length > 0 && spread.ftHidden.every(h => !h));
ok("words arrived", peek.heads.length > 0 && spread.heads.every(p => !p));
ok("wheel pinned on Harvard through the choreography", wPinned && wPinned.pinned && wPinned.active === 0);
ok("wheel released and turning continuously", w1 && w3 && !w3.pinned && Math.abs(w3.rot - w2.rot) > 8 && Math.abs(w2.rot - w1.rot) > 8);
ok("no glow on the blades", glowing === 0);
ok("reverse: oars tucked away, back at the story", back.secTop >= 899 && back.oarsParked === back.oarsTagged && back.oarsTagged > 0 && back.shellHidden && back.storyWordsBack && back.phoneBack);
ok("replays afresh", again.secTop === 0 && again.bright.length > 0 && again.bright.every(o => !o.pre));

await browser.close();
console.log("done");
