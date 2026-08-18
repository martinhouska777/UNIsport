// Writes each school's OWN gyms onto the real Gyms capture.
//
// recolor-shots.mjs turns the Harvard Gyms screen into every school's colours,
// but the three cards still said Malkin, Murr, Hemenway. This takes each
// recolored/gyms-<school>.webp, wipes the Harvard text off the three cards
// (name and address sit on the card's colour wash — those rows are rebuilt
// column by column from the wash just above and below; the hours/rating/size
// line and the section label sit on white/ground — those are painted over) and
// composites a transparent overlay rendered in Chrome with the school's real
// gyms in the same places, sizes and colours. Harvard is left as it is (it IS
// the real capture); its overlay is rendered only for calibration.
//
//   node patch-gyms.mjs            # writes recolored/gyms-*.webp AND public/landing/closers/gyms-*.webp
//   node patch-gyms.mjs --calib    # also writes calib-gyms-harvard.png to compare against the original
//
// Geometry, measured on public/landing/01-gyms.webp (900×1480):
//   card k (0..2) — the wash band rows 258..452 (+340k); the name's glyphs
//   rows 352..376, address 400..419, the meta line 489..513; text left x=59;
//   the clock icon 59..99, hours text from 96, the star at 265, the count
//   grey at 300, the stairs icon 422..469, size text 470..; the View button
//   from x=730. Section label: row ~1288, x=29, mono uppercase.
import fs from "fs";
import sharp from "sharp";
import puppeteer from "puppeteer-core";
import { SCHOOL_GYMS } from "./school-gyms.mjs";

const CALIB = process.argv.includes("--calib");
const W = 900, H = 1480, PITCH = 340;
const OUT_DIRS = ["recolored", "../../public/landing/closers"];

/* The overlay: text only, transparent. Same font stack the varsity header
   patches used (Segoe UI stands in for the app's Geist at this scale). */
const clock = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3a3733" stroke-width="2.1"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const stairs = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3a3733" stroke-width="2.1"><path d="M3 20h5v-4h5v-4h5V8h3"/></svg>`;
function overlayHtml(s) {
  const cards = s.gyms.map(([name, addr, hours, rating, count, size], k) => {
    const y = PITCH * k;
    return `
    <div class="name" style="top:${341 + y}px">${name}</div>
    <div class="addr" style="top:${394 + y}px">${addr}</div>
    <div class="meta" style="top:${482 + y}px">
      ${clock}<span class="t">${hours}</span>
      <span class="gap"></span>
      <span class="star">★</span><span class="rt">${rating}</span><span class="cnt">(${count})</span>
      <span class="gap"></span>
      ${stairs}<span class="t">${size}</span>
    </div>`;
  }).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:${W}px; height:${H}px; background:transparent; position:relative;
           font-family:"Segoe UI",-apple-system,Roboto,sans-serif; }
    .name { position:absolute; left:59px; font-size:35px; font-weight:600; color:#0a0a0a; letter-spacing:-0.005em; line-height:1; white-space:nowrap; }
    .addr { position:absolute; left:59px; font-size:22px; font-weight:400; color:#5c5652; line-height:1; white-space:nowrap; }
    .meta { position:absolute; left:59px; height:36px; display:flex; align-items:center; gap:8px; font-size:26px; color:#2b2825; white-space:nowrap; }
    .meta .t { font-weight:500; }
    .meta .gap { width:16px; }
    .star { color:#9b7424; font-size:24px; margin-right:2px; }
    .rt { font-weight:700; color:#151310; margin-right:6px; }
    .cnt { color:#a2a2a2; }
    .sect { position:absolute; left:29px; top:1274px; font-family:ui-monospace,Consolas,monospace; font-size:21px; letter-spacing:0.14em; color:#373841; line-height:1; }
  </style></head><body>${cards}<div class="sect">${s.sub}</div></body></html>`;
}

/* Wipe the Harvard text off a recoloured capture. */
function wipe(buf, info) {
  const { width: w, channels: ch } = info;
  const at = (x, y) => (y * w + x) * ch;
  for (let k = 0; k < 3; k++) {
    const y0 = 342 + PITCH * k, y1 = 446 + PITCH * k; // the wash band holding name + address
    for (let x = 44; x < 724; x++) {
      const a = at(x, y0), b = at(x, y1);
      for (let y = y0 + 1; y < y1; y++) {
        const t = (y - y0) / (y1 - y0), i = at(x, y);
        for (let c = 0; c < 3; c++) buf[i + c] = Math.round(buf[a + c] + (buf[b + c] - buf[a + c]) * t);
      }
    }
    for (let y = 480 + PITCH * k; y < 522 + PITCH * k; y++)   // the meta line, on white
      for (let x = 44; x < 726; x++) { const i = at(x, y); buf[i] = buf[i + 1] = buf[i + 2] = 255; }
  }
  // the section label, on the ground colour just above it
  for (let x = 20; x < 420; x++) {
    const a = at(x, 1268);
    for (let y = 1270; y < 1304; y++) { const i = at(x, y); buf[i] = buf[a]; buf[i + 1] = buf[a + 1]; buf[i + 2] = buf[a + 2]; }
  }
}

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--hide-scrollbars", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

for (const s of SCHOOL_GYMS) {
  await page.setContent(overlayHtml(s), { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 60));
  const overlay = await page.screenshot({ omitBackground: true, type: "png" });
  if (s.key === "harvard") {
    if (CALIB) {
      const src = sharp("../../public/landing/01-gyms.webp");
      const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
      wipe(data, info);
      await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
        .composite([{ input: overlay, left: 0, top: 0 }]).png().toFile("calib-gyms-harvard.png");
      console.log("harvard calibration written");
    }
    continue; // the real capture stays as it is
  }
  // read into memory first: writing back over a file sharp still holds open fails on Windows
  const { data, info } = await sharp(fs.readFileSync(`recolored/gyms-${s.key}.webp`)).raw().toBuffer({ resolveWithObject: true });
  wipe(data, info);
  const out = await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .composite([{ input: overlay, left: 0, top: 0 }]).webp({ quality: 82 }).toBuffer();
  for (const d of OUT_DIRS) fs.writeFileSync(`${d}/gyms-${s.key}.webp`, out);
  console.log(s.n, "done");
}
await browser.close();
