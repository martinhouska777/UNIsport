// Renders a logo grid HTML to PNG at 2x, cropped to the #board element.
// Run: node render-logo-grid.mjs <input.html> <output.png>
import puppeteer from "puppeteer-core";
import { pathToFileURL } from "node:url";
import path from "node:path";

const [, , inFile, outFile] = process.argv;
if (!inFile || !outFile) { console.error("usage: node render-logo-grid.mjs <in.html> <out.png>"); process.exit(1); }

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1300, height: 1400, deviceScaleFactor: 2 });
await page.goto(pathToFileURL(path.resolve(inFile)).href, { waitUntil: "networkidle0" });
// Web fonts must be in before we shoot, or the wordmarks render in a fallback.
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 400));

const board = await page.$("#board");
if (!board) { console.error("no #board element"); await browser.close(); process.exit(1); }
await board.screenshot({ path: path.resolve(outFile) });

const box = await board.boundingBox();
console.log(`wrote ${outFile} — board ${Math.round(box.width)}x${Math.round(box.height)} css px @2x`);
await browser.close();
