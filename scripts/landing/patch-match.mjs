// Writes each school's OWN residences and gym onto the real Match capture.
//
// The intro's right-hand phone cycles the eight schools' colours, but the four
// people on it kept Harvard's houses — so Yale's phone read "Payne Whitney" on
// the left (patch-gyms.mjs) and "Mather" on the right. This wipes the four
// "<house> · <level>" sub-lines and the three "Hemenway Gymnasium" chips off a
// recoloured capture and composites a transparent overlay, rendered in Chrome,
// carrying that school's names in the same places, sizes and colours.
//
//   node patch-match.mjs           # writes public/landing/{,dark/}closers/match-*.webp
//                                  #    and mirrors the light set into recolored/
//   node patch-match.mjs --calib   # rebuilds HARVARD's own words and prints how far
//                                  #    each rebuilt line sits from the original
//
// Harvard is skipped in a normal run: its capture IS the real screen. The run is
// idempotent — every region is wiped back to the card's own background before
// anything is drawn — so it can follow recolor-shots.mjs as often as needed.
//
// Colours are SAMPLED from each file rather than written down, because the light
// and dark captures and all eight recolourings differ: the card's background,
// the sub-line's grey, and the chip's fill / border / ink all come off the pixels.
//
// Geometry, measured on public/landing/closers/match-harvard.webp (900×1480):
//   two columns, the right one +432px; a card's text starts at x=53, its chip
//   pills at x=50, and the card's inside ends at x=432. Row 1's sub-line ink is
//   rows 629..647 and its chips are 44px pills on a 52px pitch from row 671;
//   row 2's sub-line ink is rows 1232..1251 and its first chip is rows 1274..1318.
import fs from "fs";
import sharp from "sharp";
import puppeteer from "puppeteer-core";
import { SCHOOL_PEOPLE } from "./school-residences.mjs";

const CALIB = process.argv.includes("--calib");
const W = 900, H = 1480;
const COL_DX = 432;          // left column → right column
const CARD_INNER_RIGHT = 432; // the last x inside a left-column card
const PILL_H = 45;

/* Type sizes and offsets, tuned against Harvard's own words with --calib.
   `dy` is how far the box's top sits above the ink's first row. */
const SUB_FS = 25, SUB_DX = 2, SUB_DY = 5;
const CHIP_FS = 25, CHIP_PAD = 17, CHIP_BORDER = 2;

/* The four people, in the order they stand on the screen. `res` indexes into
   the school's `residences`; `level` is the person's, not the school's, so it
   stays. `chip` is the pill that says Hemenway Gymnasium — card 3 has none. */
const CARDS = [
  { side: 0, subTop: 629,  level: "Intermediate", res: 0, chip: { top: 723,  wipeW: 306 } },
  { side: 1, subTop: 629,  level: "Advanced",     res: 1, chip: { top: 723,  wipeW: 306 } },
  { side: 0, subTop: 1233, level: "Intermediate", res: 2, chip: null },
  { side: 1, subTop: 1232, level: "Intermediate", res: 3, chip: { top: 1274, wipeW: 306 } },
];
const textX = (side) => 53 + side * COL_DX;
const pillX = (side) => 50 + side * COL_DX;
const innerRight = (side) => CARD_INNER_RIGHT + side * COL_DX;

/* ── reading the pixels ─────────────────────────────────────────────── */

const rgb = (buf, info, x, y) => {
  const i = (y * info.width + x) * info.channels;
  return [buf[i], buf[i + 1], buf[i + 2]];
};
const hex = ([r, g, b]) => `rgb(${r},${g},${b})`;
const dist = (p, q) => Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) + Math.abs(p[2] - q[2]);

/** The pixel in a box that is furthest from `bg` — the ink, light on dark or dark on light. */
function inkColour(buf, info, bg, x0, y0, x1, y1) {
  let best = bg, bestD = -1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const p = rgb(buf, info, x, y), d = dist(p, bg);
      if (d > bestD) { bestD = d; best = p; }
    }
  return best;
}

/** The box of everything in a region that is not the background. */
function inkBox(buf, info, bg, x0, y0, x1, y1, tol = 26) {
  let a = Infinity, b = -1, t = Infinity, u = -1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (dist(rgb(buf, info, x, y), bg) > tol) {
        if (x < a) a = x; if (x > b) b = x; if (y < t) t = y; if (y > u) u = y;
      }
  return b < 0 ? null : { x0: a, y0: t, x1: b, y1: u };
}

/** Paint a box flat. */
function fill(buf, info, colour, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = (y * info.width + x) * info.channels;
      buf[i] = colour[0]; buf[i + 1] = colour[1]; buf[i + 2] = colour[2];
    }
}

/* ── the overlay ────────────────────────────────────────────────────── */

function overlayHtml(items) {
  const nodes = items.map((it) =>
    it.kind === "sub"
      ? `<div class="sub" style="left:${it.x}px;top:${it.y}px;color:${it.ink}">${it.text}</div>`
      : `<div class="chip" style="left:${it.x}px;top:${it.y}px;background:${it.fill};border-color:${it.border};color:${it.ink}">${it.text}</div>`
  ).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:${W}px; height:${H}px; background:transparent; position:relative;
           font-family:"Segoe UI",-apple-system,Roboto,sans-serif; }
    .sub  { position:absolute; font-size:${SUB_FS}px; line-height:1; white-space:nowrap; }
    .chip { position:absolute; height:${PILL_H}px; display:flex; align-items:center;
            padding:0 ${CHIP_PAD}px; border:${CHIP_BORDER}px solid; border-radius:999px;
            font-size:${CHIP_FS}px; line-height:1; white-space:nowrap; }
  </style></head><body>${nodes}</body></html>`;
}

/* ── one file ───────────────────────────────────────────────────────── */

async function patch(page, srcPath, people, { calib = false } = {}) {
  const src = sharp(fs.readFileSync(srcPath)); // read fully: sharp holds the file open on Windows
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });
  const before = calib ? Buffer.from(data) : null;
  const items = [];
  const warn = [];

  for (const c of CARDS) {
    const tx = textX(c.side), px = pillX(c.side), right = innerRight(c.side);

    // ── the sub-line: "<residence> · <level>" ──
    const cardBg = rgb(data, info, right - 12, c.subTop + 6); // blank, right of the words
    const subInk = inkColour(data, info, cardBg, tx, c.subTop, tx + 300, c.subTop + 20);
    fill(data, info, cardBg, tx - 6, c.subTop - 6, right, c.subTop + 23);
    items.push({ kind: "sub", x: tx - SUB_DX, y: c.subTop - SUB_DY, ink: hex(subInk),
                 text: `${people.residences[c.res]} · ${c.level}` });

    // ── the gym chip ──
    if (!c.chip) continue;
    const pillBg = rgb(data, info, right - 12, c.chip.top + 20);   // blank, right of the pill
    const pillFill = rgb(data, info, px + 40, c.chip.top + 8);
    const pillBorder = rgb(data, info, px + 40, c.chip.top + 1);
    const pillInk = inkColour(data, info, pillFill, px + 20, c.chip.top + 10, px + 240, c.chip.top + 34);
    fill(data, info, pillBg, px - 4, c.chip.top - 3, px + c.chip.wipeW, c.chip.top + PILL_H + 2);
    items.push({ kind: "chip", x: px, y: c.chip.top, fill: hex(pillFill),
                 border: hex(pillBorder), ink: hex(pillInk), text: people.gym });
  }

  await page.setContent(overlayHtml(items), { waitUntil: "load" });
  await new Promise((r) => setTimeout(r, 60));
  // a pill that runs past the card's edge would be clipped — say so, do not guess
  const widths = await page.evaluate(() =>
    [...document.querySelectorAll(".chip")].map((e) => e.getBoundingClientRect().width));
  items.filter((i) => i.kind === "chip").forEach((it, k) => {
    const end = it.x + widths[k];
    const limit = it.x < W / 2 ? CARD_INNER_RIGHT : CARD_INNER_RIGHT + COL_DX;
    if (end > limit) warn.push(`"${it.text}" runs ${Math.round(end - limit)}px past the card`);
  });
  const overlay = await page.screenshot({ omitBackground: true, type: "png" });

  const out = sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .composite([{ input: overlay, left: 0, top: 0 }]);
  return { out, warn, before, info };
}

/* ── run ────────────────────────────────────────────────────────────── */

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--hide-scrollbars", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

if (CALIB) {
  // Rebuild Harvard's OWN words over Harvard's own capture and report how far
  // each rebuilt line lands from the original. Nothing is written to public/.
  const harvard = SCHOOL_PEOPLE[0];
  const srcPath = "../../public/landing/closers/match-harvard.webp";
  const { out, before, info } = await patch(page, srcPath, harvard, { calib: true });
  const png = await out.png().toBuffer();
  await sharp(png).toFile("calib-match-harvard.png");
  const after = await sharp(png).raw().toBuffer();
  const afterInfo = { width: W, height: H, channels: info.channels === 4 ? 4 : 3 };
  const afterRaw = await sharp(png).removeAlpha().raw().toBuffer();
  const box = (buf, i, bg, x0, y0, x1, y1) => {
    const b = inkBox(buf, i, bg, x0, y0, x1, y1);
    return b ? `x ${b.x0}..${b.x1}  y ${b.y0}..${b.y1}` : "(nothing)";
  };
  const i3 = { width: W, height: H, channels: 3 };
  console.log("region                    original                    rebuilt");
  for (const c of CARDS) {
    const tx = textX(c.side), right = innerRight(c.side);
    const bg = rgb(before, info, right - 12, c.subTop + 6);
    console.log(`sub  card${CARDS.indexOf(c) + 1}   `,
      box(before, info, bg, tx - 8, c.subTop - 8, right, c.subTop + 26).padEnd(28),
      box(afterRaw, i3, bg, tx - 8, c.subTop - 8, right, c.subTop + 26));
    if (!c.chip) continue;
    const px = pillX(c.side);
    const pbg = rgb(before, info, right - 12, c.chip.top + 20);
    console.log(`chip card${CARDS.indexOf(c) + 1}   `,
      box(before, info, pbg, px - 6, c.chip.top - 6, right, c.chip.top + PILL_H + 6).padEnd(28),
      box(afterRaw, i3, pbg, px - 6, c.chip.top - 6, right, c.chip.top + PILL_H + 6));
  }
  console.log("\nwrote calib-match-harvard.png");
  void after; void afterInfo;
} else {
  for (const s of SCHOOL_PEOPLE) {
    if (s.key === "harvard") { console.log("Harvard — the real capture, left alone"); continue; }
    for (const [dir, mirror] of [
      ["../../public/landing/closers", `recolored/match-${s.key}.webp`],
      ["../../public/landing/dark/closers", null],
    ]) {
      const file = `${dir}/match-${s.key}.webp`;
      const { out, warn } = await patch(page, file, s);
      const buf = await out.webp({ quality: 82 }).toBuffer();
      fs.writeFileSync(file, buf);
      if (mirror) fs.writeFileSync(mirror, buf);
      warn.forEach((m) => console.warn(`  ! ${s.n} ${dir.includes("dark") ? "dark" : "light"}: ${m}`));
    }
    console.log(s.n, "done");
  }
}
await browser.close();
