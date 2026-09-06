// Renders the social card (public/og.png, 1200×630) — what a pasted link
// shows in iMessage / WhatsApp / Slack / X. Real headless Chrome, so the
// same faces the page uses (Instrument Serif, Geist from Google Fonts) and
// the real Gyms capture inside the landing's phone. Re-run after changing
// the hero headline or the pill.
//
//   node make-og.mjs
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("../../public/og.png");
const shot = fs.readFileSync(path.resolve("../../public/landing/01-gyms.webp")).toString("base64");

// The landing's own tokens (app/globals.css → @theme static, l-*). Copied
// here because this file is plain Node; keep them in step by hand.
const T = { bg: "#0a0a0a", elevated: "#111111", line: "#2a2a2a", text: "#f5f5f5", text2: "#888888", accent: "#4a9eff", accentDim: "rgba(74,158,255,0.1)", accentSoft: "rgba(74,158,255,0.2)" };

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@400;500;600&family=Geist+Mono:wght@500&display=block" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0}
  html,body{width:1200px;height:630px;background:${T.bg};overflow:hidden}
  body{font-family:Geist,system-ui,sans-serif;color:${T.text};position:relative}
  .grid{position:absolute;inset:0;background-image:linear-gradient(${T.line}22 1px,transparent 1px),linear-gradient(90deg,${T.line}22 1px,transparent 1px);background-size:48px 48px}
  .glow{position:absolute;left:-200px;top:-200px;width:900px;height:900px;background:radial-gradient(circle,${T.accentDim} 0%,transparent 60%)}
  .wrap{position:absolute;inset:0;display:flex;align-items:center;padding:0 0 0 88px}
  .copy{width:660px}
  .mark{font-family:'Instrument Serif',serif;font-style:italic;font-size:34px;letter-spacing:-0.01em}
  .mark b{font-weight:400;color:${T.accent}}
  .pill{display:inline-flex;align-items:center;gap:9px;margin-top:38px;padding:8px 14px;border-radius:999px;border:1px solid ${T.accentSoft};background:${T.accentDim};color:${T.accent};font-family:'Geist Mono',monospace;font-size:14px;letter-spacing:.12em;text-transform:uppercase}
  .pill i{width:7px;height:7px;border-radius:50%;background:${T.accent};box-shadow:0 0 10px ${T.accent}}
  h1{font-family:'Instrument Serif',serif;font-weight:400;font-size:96px;line-height:.98;letter-spacing:-0.02em;margin-top:22px}
  h1 em{color:${T.accent}}
  p{margin-top:24px;font-size:22px;line-height:1.45;color:${T.text2};max-width:600px;letter-spacing:-0.01em}
  .phone{position:absolute;right:96px;top:70px;width:300px;border-radius:38px;border:1px solid ${T.line};background:${T.elevated};padding:8px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
  .screen{border-radius:30px;overflow:hidden;background:#fff}
  .bar{display:flex;align-items:center;justify-content:space-between;padding:10px 18px 6px;font-family:'Geist Mono',monospace;font-size:10px;color:#16150f;background:#fff}
  .island{width:70px;height:18px;border-radius:999px;background:#161616;border:1px solid #222}
  .screen img{display:block;width:100%;height:auto}
</style></head><body>
<div class="grid"></div><div class="glow"></div>
<div class="wrap"><div class="copy">
  <div class="mark">UNI<b>sport</b></div>
  <div class="pill"><i></i>Free for students</div>
  <h1>Your campus.<br>Your gym.<br><em>Your people.</em></h1>
  <p>Every gym on campus, training partners ranked by real fit, and a Varsity Mode for teams.</p>
</div></div>
<div class="phone"><div class="screen">
  <div class="bar"><span>9:41</span><span class="island"></span><span style="color:#9b968c">5G</span></div>
  <img src="data:image/webp;base64,${shot}" width="900" height="1480">
</div></div>
</body></html>`;

const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--disable-gpu", "--no-first-run"] });
const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
await page.setContent(html, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 500));
const png = await page.screenshot({ type: "png" });
await browser.close();
await sharp(png).resize({ width: 1200, height: 630 }).png({ compressionLevel: 9 }).toFile(OUT);
console.log("wrote", OUT, fs.statSync(OUT).size, "bytes");
