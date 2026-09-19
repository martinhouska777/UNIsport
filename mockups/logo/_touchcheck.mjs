/*
  Does the barbell I touch the letters beside it?

  Judged in pixels, on the page as the browser really draws it, with the real
  webfont loaded. Two traps this had to get past:

    - An SVG foreignObject raster cannot fetch a webfont, so measuring there
      measures a fallback serif. The probe is a real element on the page.
    - A probe parked off-canvas is clipped to the viewport by an element
      screenshot, which then photographs whatever sits at 0,0 instead. The
      probe sits in normal flow, below the board.
    - Chrome's subpixel text antialiasing puts red and blue fringes on the
      edge of every black letter, and a red fringe looks exactly like the
      red bar. Hence --disable-lcd-text and the strict colour tests below.

  Run: node mockups/logo/_touchcheck.mjs [page.html] [--sweep]
*/
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const args = process.argv.slice(2);
const sweep = args.includes("--sweep");
const file = args.find((a) => !a.startsWith("--")) ?? "mockups/logo/round10-final.html";
const SET = 200;                       // the probe is set at 200px

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--disable-lcd-text", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 1 });

// Saturated red only, and near-black only: no antialiasing fringe qualifies.
const isBar = (r, g, b) => r > 200 && g < 60 && b < 60;
const isInk = (r, g, b) => r < 60 && g < 60 && b < 60;

async function measure(gl, gr) {
  // Passing no bearings means "measure whatever the page itself is set to",
  // which is the only reading that describes the real artwork.
  const q = (gl === null) ? "" : `?gl=${gl}&gr=${gr}`;
  const url = pathToFileURL(path.resolve(file)).href + q;
  await page.goto(url, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "1", { timeout: 15000 });
  const png = await (await page.$("#probe")).screenshot({ type: "png" });
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const px = (x, y) => { const i = (y * W + x) * C; return [data[i], data[i + 1], data[i + 2]]; };

  const bars = [];
  let ink = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = px(x, y);
    if (isBar(...p)) bars.push([x, y]);
    else if (isInk(...p)) ink++;
  }
  if (bars.length < 200 || ink < 2000) {
    throw new Error(`probe did not render — bar ${bars.length}, ink ${ink}`);
  }
  let minGap = Infinity;
  for (const [x, y] of bars) {
    for (let d = 1; d <= 14 && d < minGap; d++) {
      let hit = false;
      for (let dy = -d; dy <= d && !hit; dy++) for (let dx = -d; dx <= d && !hit; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (isInk(...px(nx, ny))) hit = true;
      }
      if (hit) { if (d < minGap) minGap = d; break; }
    }
  }
  return { bars: bars.length, ink, minGap, W, H };
}

const line = (gl, gr, m) => {
  const at = (s) => (m.minGap / SET * s).toFixed(2);
  const verdict = m.minGap <= 1 ? "TOUCHING"
    : m.minGap === Infinity ? "clear (>14px)"
    : `clear — ${m.minGap}px here, ${at(86)}px at 86px, ${at(24)}px at 24px, ${at(17)}px at 17px`;
  return `gl=${gl.toFixed(3)} gr=${gr.toFixed(3)}  bar=${m.bars} ink=${m.ink}  ${verdict}`;
};

if (sweep) {
  for (const [gl, gr] of [[-0.004, 0.042], [0.004, 0.05], [0.012, 0.058], [0.02, 0.07], [0.03, 0.085]]) {
    console.log(line(gl, gr, await measure(gl, gr)));
  }
} else {
  const m = await measure(null, null);
  const at = (v) => (m.minGap / SET * v).toFixed(2);
  console.log(m.minGap <= 1
    ? `page defaults: TOUCHING (bar ${m.bars}, ink ${m.ink})`
    : `page defaults: clear — ${m.minGap}px at ${SET}px  ->  ${at(86)}px at 86px, ${at(24)}px at 24px, ${at(17)}px at 17px`);
}
await browser.close();
