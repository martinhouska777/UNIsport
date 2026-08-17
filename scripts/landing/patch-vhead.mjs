// Renders the per-school varsity header patches — "<School> Rowing" line with
// its chevron, and the shield's initial — as transparent 900x200 overlays,
// in the same Chrome/fonts as the original capture. Harvard is rendered too,
// only to calibrate against the original; it is never applied.
import puppeteer from "puppeteer-core";
import fs from "fs";

const SCHOOLS = [
  { n: "Harvard",   p: "#a51c30" },
  { n: "Yale",      p: "#00356b" },
  { n: "Princeton", p: "#e77500" },
  { n: "Penn",      p: "#011f5b" },
  { n: "Brown",     p: "#4e3629" },
  { n: "Columbia",  p: "#6cace4" },
  { n: "Cornell",   p: "#b31b1b" },
  { n: "Dartmouth", p: "#00693e" },
];

const page1 = (name, color) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; padding:0; }
  body { width:900px; height:200px; background:transparent; position:relative;
         font-family:"Segoe UI",-apple-system,Roboto,sans-serif; }
  .cover { position:absolute; left:118px; top:57px; width:252px; height:34px; background:#f7f5f4; }
  .name  { position:absolute; left:124px; top:56px; font-size:25.5px; font-weight:400;
           color:#2e2a26; letter-spacing:0; white-space:nowrap; line-height:1.25; }
  .chev  { position:absolute; top:63px; left:-100px; }
  .badgecover { position:absolute; left:57px; top:46px; width:24px; height:31px; background:${color}; }
  .initial { position:absolute; left:57px; top:46px; width:24px; height:31px;
             display:flex; align-items:center; justify-content:center;
             font-family:Georgia,serif; font-weight:700; font-size:24px; color:#ffffff; }
</style></head><body>
  <div class="cover"></div>
  <div class="name" id="nm">${name} Rowing</div>
  <svg class="chev" id="ch" width="18" height="14" viewBox="0 0 18 14">
    <polyline points="3,4 9,10 15,4" fill="none" stroke="#55524c" stroke-width="2.6"
              stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
  <div class="badgecover"></div>
  <div class="initial">${name[0]}</div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--hide-scrollbars"],
});
const page = await browser.newPage();
await page.setViewport({ width: 900, height: 200, deviceScaleFactor: 1 });
fs.mkdirSync("patches", { recursive: true });
for (const s of SCHOOLS) {
  await page.setContent(page1(s.n, s.p), { waitUntil: "load" });
  // the chevron rides at a fixed gap after the measured end of the name
  await page.evaluate(() => {
    const nm = document.getElementById("nm");
    document.getElementById("ch").style.left =
      (124 + nm.getBoundingClientRect().width + 26) + "px";
  });
  await new Promise((r) => setTimeout(r, 80));
  await page.screenshot({ path: `patches/${s.n.toLowerCase()}.png`, omitBackground: true });
  console.log(s.n, "patch done");
}
await browser.close();
