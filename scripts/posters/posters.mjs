/*
  CAMPUS POSTERS, the first round of looks (2026-11-07).

  11 x 17 in portrait, the biggest size Harvard Distribution takes (Office of
  Student Life rule), drawn at 100 px an inch and shot at 3x = 300 dpi. The
  words are the owner's (NO-SLOP 25). The QR is real and leads to the waitlist.

  Colours, logo and name come from the posts (scripts/social/launch-carousel.mjs):
  the neutral brand only, since a poster is Zone 1.

  Run: node scripts/posters/posters.mjs
  Out: mockups/posters/<look>.png (300 dpi) and mockups/posters/previews.html
*/
import puppeteer from "puppeteer-core";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const OUT = path.join(ROOT, "mockups/posters");
mkdirSync(OUT, { recursive: true });

const W = 1100, H = 1700, M = 88, DPI_SCALE = 3;
const URL_QR = "https://getunisport.com/waitlist";
const INK = "#141618", BLUE = "#1f32c1", NAVY = "#2f3b52";

/* the owner's words for the posters (2026-11-07): his question, then his
   "based on interests and making gym more fun"; the call is that the waitlist
   is open and the launch is next semester. The posts' "Search for training
   partners. Find new friends." was "really generic" on a poster, and "Get in
   early." with the Harvard line is cut. */
const HEAD = "Looking to find somebody to train with or", HEAD_EM = "meet new people?";
const LINE = "Find people based on your interests and make the gym more fun.";
const CALL = "Waitlist", CALL_EM = "open.";
const SUB = "We will be launching next semester.";

/* the logo as the app icon draws it on white (mockups/logo/_icons.mjs) */
const MARK_PATHS = `
  <path d="M28 34 V56 Q28 82 50 82 H51" fill="none" stroke="${NAVY}" stroke-width="14" stroke-linecap="butt"/>
  <path d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${BLUE}" stroke-width="14" stroke-linecap="butt"/>
  <circle cx="28" cy="34" r="7" fill="${NAVY}"/><circle cx="72" cy="34" r="7" fill="${BLUE}"/>
  <circle cx="28" cy="16" r="8.5" fill="${NAVY}"/><circle cx="72" cy="16" r="8.5" fill="${BLUE}"/>`;
const mark = (h, style = "") =>
  `<svg viewBox="19.5 7.5 61 81.5" height="${h}" style="display:block;${style}">${MARK_PATHS}</svg>`;

/* the name as the site writes it (components/landing/Wordmark.tsx) */
const BARBELL_I = (() => {
  const BOX_H = 170, CAP_TOP = 15, BASE = 155, CAP_H = 140, STEM = 11.9, STUB = 9;
  const PLATE_W = STEM * 3.2, PLATE_H = STEM * 1.45, BOX_W = PLATE_W * 1.18, CX = BOX_W / 2;
  const CAP_EM = 0.72, SLANT = 13.1;
  const HEIGHT_EM = (CAP_EM * BOX_H) / CAP_H, WIDTH_EM = (HEIGHT_EM * BOX_W) / BOX_H;
  const SHIFT_EM = ((BOX_H - BASE) / CAP_H) * CAP_EM;
  const plate = (y) => `<rect x="${(CX - PLATE_W / 2).toFixed(2)}" y="${y}" width="${PLATE_W.toFixed(2)}"
    height="${PLATE_H.toFixed(2)}" rx="${(PLATE_H * 0.22).toFixed(2)}" fill="${BLUE}"/>`;
  return `<svg viewBox="0 0 ${BOX_W.toFixed(2)} ${BOX_H}" width="${WIDTH_EM.toFixed(4)}em" height="${HEIGHT_EM.toFixed(4)}em"
    style="display:inline-block;vertical-align:baseline;transform:translateY(${SHIFT_EM.toFixed(4)}em);margin-left:.05em;margin-right:-.035em;overflow:visible">
    <g transform="rotate(${SLANT} ${CX.toFixed(2)} ${(CAP_TOP + BASE) / 2})">
      <rect x="${(CX - STEM / 2).toFixed(2)}" y="${CAP_TOP - STUB}" width="${STEM.toFixed(2)}" height="${CAP_H + STUB * 2}"
        rx="${(STEM * 0.12).toFixed(2)}" fill="${INK}"/>
      ${plate(CAP_TOP)}${plate((BASE - PLATE_H).toFixed(2))}
    </g></svg>`;
})();
const WORDMARK = `<span class="serif" style="font-style:italic;letter-spacing:-.025em">UN${BARBELL_I}<span style="color:${BLUE}">sport</span></span>`;
/* mark then name, the site's lockup */
const lockup = (size) => `<div style="display:flex;align-items:center;gap:${size * 0.28}px;font-size:${size}px;line-height:1">
  ${mark(size * 0.92)}${WORDMARK}</div>`;

/* a QR: filled in the page from data-url (qrcode-generator) */
const qr = (size, style = "") => `<div class="qr" data-size="${size}" style="width:${size}px;height:${size}px;${style}"></div>`;

/* ── the phone, the website's (components/landing/Phone.tsx), as on the posts ── */
const shell = (w) => {
  const cq = w / 100, rim = 0.83 * cq, bez = 1.95 * cq;
  const sw = w - 2 * (rim + bez) - 2;
  const status = (3.33 + 2.22 + 6.1) * cq, gesture = 6.67 * cq;
  return { cq, rim, bez, sw, status, gesture, inset: rim + bez + 1 };
};
const phoneHeight = (w, aspect) => {
  const s = shell(w);
  return Math.round(s.sw * aspect + s.status + s.gesture + 2 * s.inset);
};
const widthFor = (h, aspect) => {
  let w = 300;
  for (let i = 0; i < 30; i++) w *= h / phoneHeight(w, aspect);
  return Math.floor(w);
};
const phone = ({ src, aspect }, w, style = "") => {
  const s = shell(w), px = (v) => `${v.toFixed(2)}px`;
  return `<div class="ph" style="width:${w}px;${style}">
    <div class="rim" style="border-radius:${px(12.2 * s.cq)};padding:${px(s.rim)};--cq:${s.cq}px">
      <div class="bezel" style="border-radius:${px(11.37 * s.cq)};padding:${px(s.bez)}">
        <div class="screen" style="border-radius:${px(9.44 * s.cq)}">
          <div class="status" style="height:${px(s.status)};padding:${px(3.33 * s.cq)} ${px(6.11 * s.cq)} ${px(2.22 * s.cq)};font-size:${px(3.33 * s.cq)}">
            <span>9:41</span>
            <i class="island" style="height:${px(6.1 * s.cq)};width:${px(23.3 * s.cq)}"></i>
            <span class="net" style="font-size:${px(3.06 * s.cq)}">5G</span>
          </div>
          <img src="${src}" style="width:100%;height:${px(s.sw * aspect)};display:block">
          <div class="gesture" style="height:${px(s.gesture)}"><i style="height:${px(1.1 * s.cq)}"></i></div>
        </div>
      </div>
    </div>
  </div>`;
};
const b64 = (file) => "data:image/png;base64," + readFileSync(file).toString("base64");
const MATCH_FILE = path.join(ROOT, "mockups/social/screens/launch/match.png");
const matchMeta = await sharp(MATCH_FILE).metadata();
const MATCH = { src: b64(MATCH_FILE), aspect: matchMeta.height / matchMeta.width };

const em = (t) => `<em style="color:${BLUE}">${t}</em>`;

/* ── THE LOOKS ── */
const LOOKS = {
  /* A: the posts' look, the Match screen in a phone */
  phone: () => {
    const ptop = 430, ph = 800, pw = widthFor(ph, MATCH.aspect);
    const q = 330;
    return `
      <div style="position:absolute;left:${M}px;right:${M}px;top:${M - 10}px;text-align:center">
        <div class="serif" style="font-size:88px;line-height:1.02">${HEAD} ${em(HEAD_EM)}</div>
        <div class="sub" style="margin:26px auto 0;max-width:820px;font-size:32px;text-wrap:balance">${LINE}</div>
      </div>
      ${phone(MATCH, pw, `position:absolute;left:${(W - pw) / 2}px;top:${ptop}px`)}
      <div style="position:absolute;left:${M}px;right:${M}px;bottom:${M}px;display:flex;align-items:flex-end;justify-content:space-between;gap:48px">
        <div style="flex:1;min-width:0">
          ${lockup(58)}
          <div class="serif" style="margin-top:46px;font-size:96px;line-height:1">${CALL} ${em(CALL_EM)}</div>
          <div class="sub" style="margin-top:22px;font-size:29px">${SUB}</div>
        </div>
        ${qr(q, "flex:none;margin-right:-14px;margin-bottom:-14px")}
      </div>`;
  },

  /* B: words only, big, the blue stripe down the left edge */
  words: () => `
      <div style="position:absolute;left:0;top:0;bottom:0;width:34px;background:${BLUE}"></div>
      <div style="position:absolute;left:${M + 22}px;top:${M}px">${lockup(60)}</div>
      <div style="position:absolute;left:${M + 22}px;right:${M - 10}px;top:230px">
        <div class="serif" style="font-size:160px;line-height:.95;text-wrap:wrap">${HEAD} ${em(HEAD_EM)}</div>
        <div class="sub" style="margin-top:40px;max-width:800px;font-size:38px">${LINE}</div>
      </div>
      <div style="position:absolute;left:${M + 22}px;right:${M}px;bottom:${M}px;display:flex;align-items:flex-end;gap:52px">
        ${qr(360, "flex:none;margin-left:-14px;margin-bottom:-14px")}
        <div style="flex:1;min-width:0">
          <div class="serif" style="font-size:104px;line-height:1">${CALL} ${em(CALL_EM)}</div>
          <div class="sub" style="margin-top:22px;font-size:30px">${SUB}</div>
        </div>
      </div>`,

  /* C: the logo as the picture, the code between the two people */
  u: () => {
    /* 10.4 px a unit: the mouth of the U (x 35-65) is 312 px */
    const k = 10.4, mw = 61 * k, mh = 81.5 * k;
    const left = (W - mw) / 2, top = 84;
    /* the mouth, in poster px: the straight legs run y 34-56 */
    const qx = left + (35 - 19.5) * k, qy = top + (27.5 - 7.5) * k, qs = 30 * k;
    return `
      ${mark(mh, `position:absolute;left:${left}px;top:${top}px`)}
      ${qr(qs - 8, `position:absolute;left:${qx + 4}px;top:${qy + 4}px`)}
      <div style="position:absolute;left:${M}px;right:${M}px;top:${top + mh + 44}px;text-align:center">
        <div style="font-size:76px;line-height:1">${WORDMARK}</div>
        <div class="serif" style="margin-top:38px;font-size:62px;line-height:1.04">${HEAD} ${em(HEAD_EM)}</div>
        <div class="sub" style="margin:18px auto 0;max-width:760px;font-size:27px;text-wrap:balance">${LINE}</div>
      </div>
      <div style="position:absolute;left:${M}px;right:${M}px;bottom:${M}px;text-align:center">
        <div class="serif" style="font-size:72px;line-height:1">${CALL} ${em(CALL_EM)}</div>
        <div class="sub" style="margin-top:16px;font-size:27px">${SUB}</div>
      </div>`;
  },

  /* D: the campus tear-off, a code on every tab */
  tabs: () => {
    const n = 8, tabH = 460, tw = W / n, top = H - tabH, q = 118, qTop = 24;
    const nameMid = qTop + q + (tabH - qTop - q) / 2;
    const tabs = Array.from({ length: n }, (_, i) => `
      <div style="position:absolute;left:${i * tw}px;top:${top}px;width:${tw}px;height:${tabH}px;${i ? `border-left:3px dashed ${INK};` : ""}">
        ${qr(q, `position:absolute;left:${(tw - q) / 2}px;top:${qTop}px`)}
        <div style="position:absolute;left:50%;top:${nameMid}px;transform:translate(-50%,-50%) rotate(90deg);
                    width:max-content;white-space:nowrap;font-size:58px;line-height:1">${WORDMARK}</div>
      </div>`).join("");
    return `
      <div style="position:absolute;left:0;right:0;top:0;height:24px;background:${BLUE}"></div>
      <div style="position:absolute;left:${M}px;right:${M}px;top:24px;height:${top - 24}px;display:flex;flex-direction:column;
                  align-items:center;justify-content:center;text-align:center">
        ${mark(230)}
        <div class="serif" style="margin-top:52px;font-size:112px;line-height:.98">${HEAD} ${em(HEAD_EM)}</div>
        <div class="sub" style="margin-top:26px;max-width:820px;font-size:32px;text-wrap:balance">${LINE}</div>
        <div class="serif" style="margin-top:58px;font-size:90px;line-height:1">${CALL} ${em(CALL_EM)}</div>
        <div class="sub" style="margin-top:20px;font-size:30px">${SUB}</div>
      </div>
      <div style="position:absolute;left:0;right:0;top:${top}px;border-top:3px dashed ${INK}"></div>
      ${tabs}`;
  },
};
const NAMES = { phone: "A Phone", words: "B Words", u: "C The U", tabs: "D Tear-off" };

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; color:${INK}; }
  .poster { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  .serif { font-family:"Instrument Serif", Georgia, serif; font-weight:400; letter-spacing:-.012em; text-wrap:balance; }
  .serif em { font-style:italic; }
  .sub { font-weight:500; line-height:1.38; color:${INK}; text-wrap:pretty; }
  .qr svg { display:block; width:100%; height:100%; }
  .ph { position:absolute; }
  .rim { position:relative; border:1px solid #767b83;
         background:linear-gradient(135deg,#f5f6f8 0%,#c8ccd3 18%,#8f949c 50%,#c8ccd3 82%,#f5f6f8 100%);
         box-shadow: inset 0 0 0 calc(var(--cq) * .28) rgba(245,246,248,.7),
                     0 calc(var(--cq) * 1.6) calc(var(--cq) * 3.2) calc(var(--cq) * -1) rgba(16,22,44,.3),
                     0 calc(var(--cq) * 9) calc(var(--cq) * 18) calc(var(--cq) * -5) rgba(16,22,44,.2); }
  .rim::before, .rim::after { content:""; position:absolute; width:calc(var(--cq) * .95); background:#8f949c; }
  .rim::before { left:calc(var(--cq) * -.95 - 1px); top:calc(var(--cq) * 47); height:calc(var(--cq) * 11);
                 border-radius:calc(var(--cq) * .5) 0 0 calc(var(--cq) * .5);
                 box-shadow:0 calc(var(--cq) * -14) 0 #8f949c, 0 calc(var(--cq) * 14) 0 #8f949c; }
  .rim::after { right:calc(var(--cq) * -.95 - 1px); top:calc(var(--cq) * 50); height:calc(var(--cq) * 18);
                border-radius:0 calc(var(--cq) * .5) calc(var(--cq) * .5) 0; }
  .bezel { background:#050506; }
  .screen { overflow:hidden; background:#fff; }
  .status { display:flex; align-items:center; justify-content:space-between; line-height:1;
            font-family:"Geist Mono", ui-monospace, monospace; color:#16150f; background:#fff; }
  .status .net { color:#16150f; }
  .island { display:block; border-radius:999px; background:#161616; border:1px solid #222; }
  .gesture { display:flex; align-items:center; justify-content:center; background:#fff; }
  .gesture i { display:block; width:38%; border-radius:999px; background:#cfccc6; }
`;

/* square modules, ink on white, the 4-module quiet zone inside the box */
function fillQRs(url, ink) {
  for (const el of document.querySelectorAll(".qr")) {
    const q = qrcode(0, "M");
    q.addData(url); q.make();
    const n = q.getModuleCount(), z = 4, size = n + 2 * z;
    let d = "";
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c + z} ${r + z}h1v1h-1z`;
    el.innerHTML = `<svg viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="${ink}"/></svg>`;
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: DPI_SCALE });
const made = [];
for (const [key, draw] of Object.entries(LOOKS)) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@500;600;700&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js"></script>
    <style>${css}</style></head><body><div class="poster">${draw()}</div></body></html>`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(fillQRs, URL_QR, INK);
  await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
    .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
  await page.evaluateHandle("document.fonts.ready");
  const boxes = await page.evaluate(() => [...document.querySelectorAll(".qr")].map((el) => {
    const r = el.getBoundingClientRect();
    return [r.left, r.top, r.width, r.height];
  }));
  const file = path.join(OUT, `${key}.png`);
  await page.screenshot({ path: file, type: "png" });
  made.push({ key, file, boxes });
  console.log("  " + path.basename(file));
}

/* every QR must read: each code cut out with the poster around it, made
   small like a phone photo from a step back, then decoded with jsQR */
const check = await browser.newPage();
await check.setContent(`<script src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js"></script>`, { waitUntil: "load" });
for (const { key, file, boxes } of made) {
  const meta = await sharp(file).metadata();
  const results = [];
  for (const [x, y, w, h] of boxes) {
    const pad = 8, s = DPI_SCALE;
    const left = Math.max(0, Math.round((x - pad) * s)), top = Math.max(0, Math.round((y - pad) * s));
    const width = Math.min(meta.width - left, Math.round((w + 2 * pad) * s));
    const height = Math.min(meta.height - top, Math.round((h + 2 * pad) * s));
    const small = await sharp(file).extract({ left, top, width, height }).resize(Math.max(170, Math.round((w + 2 * pad) * 0.5))).png().toBuffer();
    results.push(await check.evaluate(async (src) => {
      const im = new Image(); im.src = src; await im.decode();
      const c = document.createElement("canvas"); c.width = im.width; c.height = im.height;
      const g = c.getContext("2d"); g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height);
      const r = jsQR(d.data, d.width, d.height);
      return r ? r.data : null;
    }, "data:image/png;base64," + small.toString("base64")));
  }
  const ok = results.filter((r) => r === URL_QR).length;
  console.log(`  ${key}: ${ok}/${results.length} codes read ${URL_QR}`);
}
await browser.close();

/* the page to look at them: the four side by side, each opens full size */
const cards = await Promise.all(made.map(async ({ key, file }) => {
  const jpg = await sharp(file).resize(1100).jpeg({ quality: 84 }).toBuffer();
  return `<figure><img src="data:image/jpeg;base64,${jpg.toString("base64")}" alt="${NAMES[key]}"><figcaption>${NAMES[key]}</figcaption></figure>`;
}));
writeFileSync(path.join(OUT, "previews.html"), `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>UNIsport posters</title>
<style>
  :root { --ink:${INK}; --blue:${BLUE}; --page:#eef1f5; }
  * { box-sizing:border-box; margin:0; }
  body { background:var(--page); color:var(--ink); font:600 18px/1.3 system-ui, -apple-system, "Segoe UI", sans-serif; }
  header { background:#fff; border-top:6px solid var(--blue); padding:18px 24px; font-size:22px; font-weight:700; }
  main { display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:24px; padding:24px; max-width:1800px; margin:0 auto; }
  figure { background:#fff; border:1px solid #d9dee6; border-radius:10px; overflow:hidden; }
  figure img { display:block; width:100%; height:auto; border-bottom:1px solid #d9dee6; cursor:zoom-in; }
  figcaption { padding:12px 16px; }
  dialog { border:0; padding:0; background:transparent; max-width:none; max-height:none; }
  dialog::backdrop { background:rgba(20,22,24,.85); }
  dialog img { display:block; max-height:96vh; max-width:96vw; }
  @media (max-width:1100px) { main { grid-template-columns:repeat(2, minmax(0, 1fr)); } }
  @media (max-width:560px) { main { grid-template-columns:1fr; padding:16px; gap:16px; } header { padding:16px; } }
</style></head><body>
<header>Posters, 11 x 17 in</header>
<main>${cards.join("\n")}</main>
<dialog id="big"><img alt=""></dialog>
<script>
  const big = document.getElementById("big");
  document.querySelectorAll("figure img").forEach((im) => im.addEventListener("click", () => {
    big.querySelector("img").src = im.src; big.showModal();
  }));
  big.addEventListener("click", () => big.close());
</script>
</body></html>`);
console.log("wrote " + OUT);
