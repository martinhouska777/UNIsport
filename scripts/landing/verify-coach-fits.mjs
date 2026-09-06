// A COACH STEP FITS ON ONE SCREEN — the owner's rule, 2026-09-06: "chci aby se
// ten mobil i text vešli na stránku". Every step is a phone with its
// explanation under it, and both have to be readable at once, in THEIR window:
// about 1526x662 CSS pixels (a 1907x827 screenshot on a 125%-scaled display),
// with the 66px bar fixed over the top of it.
//
// Also checks that nothing changed on a normal desktop — the phone is still
// its full 240 from a window 781 tall up.
//
//   node verify-coach-fits.mjs                          # http://localhost:3000/
//   node verify-coach-fits.mjs http://localhost:3000/for/coaches
import puppeteer from "puppeteer-core";

const URL = process.argv[2] || "http://localhost:3000/";
const BAR = 66;   // the fixed top bar, which covers the top of every screen
const AIR = 24;   // and a little room, so a step is not wedged edge to edge
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

const read = async (w, h) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.goto(URL, { waitUntil: "networkidle2" });
  await wait(2200);
  return page.evaluate(() => {
    const steps = document.getElementById("coach-steps");
    if (!steps) return null;
    const arts = [...steps.querySelectorAll("article")];
    const hs = arts.map((a) => Math.round(a.getBoundingClientRect().height));
    const img = arts[0].querySelector("img").getBoundingClientRect();
    return { vh: innerHeight, tallest: Math.max(...hs), heights: hs, phoneW: Math.round(img.width) };
  });
};

// their window, and the sizes either side of it
for (const [w, h] of [[1526, 662], [1366, 600], [1280, 720], [1600, 760]]) {
  const r = await read(w, h);
  if (!r) { ok(`${w}x${h}: the coach steps are on this page`, false); continue; }
  const room = r.vh - BAR - AIR;
  ok(`${w}x${h}: the phone and its words fit on one screen`, r.tallest <= room, `(tallest step ${r.tallest}, room ${room}, phone ${r.phoneW})`);
}

// …and a normal desktop is untouched: the phone is still its full size
for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  const r = await read(w, h);
  ok(`${w}x${h}: the phone is still full size`, r.phoneW === 225, `(${r.phoneW})`);
  ok(`${w}x${h}: and still fits`, r.tallest <= r.vh - BAR - AIR, `(tallest ${r.tallest})`);
}

// the way in is an arrow, not a pill
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle2" });
await wait(1500);
const link = await page.evaluate(() => {
  const a = document.querySelector('#coaches a[href="#coach-steps"]');
  if (!a) return null;
  const cs = getComputedStyle(a);
  return { svg: !!a.querySelector("svg"), border: parseFloat(cs.borderTopWidth), bg: cs.backgroundColor, h: Math.round(a.getBoundingClientRect().height) };
});
if (link) {
  ok("the way in is an arrow, not a pill", link.svg && link.border === 0 && /rgba\(0, 0, 0, 0\)|transparent/.test(link.bg), JSON.stringify(link));
  ok("and it is still a 44px tap target", link.h >= 44, `(${link.h})`);
}

await browser.close();
console.log(fails ? `\ndone — ${fails} FAILED` : "\ndone — all green");
process.exit(fails ? 1 : 0);
