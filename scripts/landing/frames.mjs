// Photographs an ENTRANCE, frame by frame. The page's animations are paused
// and rewound to a given moment, so a still can be taken of a thing that is
// over in a second — otherwise every screenshot shows the end state.
//
//   node scripts/landing/frames.mjs out-prefix 1900 860 http://localhost:3000/ 200,450,800,1400
import puppeteer from "puppeteer-core";

const [OUT, W = 1900, H = 860, URL = "http://localhost:3000/", TIMES = "200,500,900,1600"] = process.argv.slice(2);
const times = TIMES.split(",").map(Number);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: Number(W), height: Number(H), deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  try { localStorage.setItem("uniLandingPhoneMode", "light"); } catch {}
});
await page.goto(URL, { waitUntil: "networkidle0", timeout: 60000 });
await page.evaluate(() => document.fonts.ready);
for (const t of times) {
  await page.evaluate((ms) => {
    document.getAnimations().forEach((a) => {
      a.pause();
      try { a.currentTime = ms; } catch {}
    });
  }, t);
  await new Promise((r) => setTimeout(r, 120));
  await page.screenshot({ path: `${OUT}-${t}.png` });
  console.log("wrote", `${OUT}-${t}.png`);
}
await browser.close();
