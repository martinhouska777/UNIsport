/*
  Builds the vertical launch reel (1080x1920, 30fps) as a real video file.

  Why it is drawn rather than generated: AI video models do not preserve a UI —
  hand one a screenshot of the app and the buttons morph and the text melts.
  Every app screen here is a REAL capture from `public/landing/`, and every bit
  of motion is drawn, so the type stays sharp at any size.

  How it renders: the page below exposes `window.frame(t)`, which positions
  everything for time `t`. Chrome is stepped through one frame at a time and
  screenshotted, so nothing depends on real-time animation keeping up — a
  headless page throttles rAF, which is exactly how you lose frames.

  Colours are the Zone 1 neutrals from `app/globals.css` (no school colour ever
  enters brand material — every university shares it), same as the logo script.

  Run: node scripts/video/reel.mjs
  Out: mockups/video/unisport-reel.mp4
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");

const W = 1080, H = 1920, FPS = 30;

/* Brand neutrals — app/globals.css */
const NAVY = "#2f3b52";
const DEEP = "#1e2635";
const BLUE = "#1f32c1";
const PAPER = "#ebf0f6";

/* The mark, on a 100 x 100 box: a U split down the middle, each half a person.
   Same geometry as mockups/logo/_icons.mjs — change it there and here together. */
const MARK_A = "M28 34 V56 Q28 82 50 82";
const MARK_B = "M72 34 V56 Q72 82 50 82";

const BEATS = [
  {
    img: "02-match.webp",
    big: "Never train alone again.",
    sub: "Matched on your interests, concentration, gym and hours.",
  },
  {
    img: "04-plan-a-session.webp",
    big: "Plan it in the chat.",
    sub: "They accept once, and it lands in both calendars.",
  },
  {
    img: "05-profile.webp",
    big: "See where you rank.",
    sub: "Every session you log marks its day.",
  },
  {
    img: "01-gyms.webp",
    big: "Every gym on campus.",
    sub: "The equipment, the rating, and how busy it is.",
  },
];

const DUR = 4.9;   // how long one beat is on screen
const OVER = 0.4;  // how long the outgoing and incoming beats overlap
const STEP = DUR - OVER;
const END_AT = BEATS.length * STEP;      // the end card starts here
const END_DUR = 4.6;
const TOTAL = END_AT + END_DUR;

const dataUri = (f) =>
  "data:image/webp;base64," + readFileSync(path.join(ROOT, "public/landing", f)).toString("base64");

const shots = BEATS.map((b) => dataUri(b.img));

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:${DEEP}; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  #stage { position:relative; width:${W}px; height:${H}px; overflow:hidden;
           background:radial-gradient(120% 80% at 50% 18%, ${NAVY} 0%, ${DEEP} 70%); }

  .beat { position:absolute; inset:0; will-change:transform,opacity; }
  .phone { position:absolute; left:50%; top:206px; width:748px; height:1230px;
           margin-left:-374px; border-radius:52px; overflow:hidden;
           background:${PAPER};
           box-shadow:0 46px 90px rgba(0,0,0,.46), 0 0 0 9px rgba(255,255,255,.07); }
  .phone img { display:block; width:100%; height:100%; object-fit:cover;
               transform-origin:50% 42%; will-change:transform; }

  .caps { position:absolute; left:80px; right:80px; top:1512px; text-align:center;
          will-change:transform,opacity; }
  .big  { font-weight:800; font-size:74px; line-height:1.06; letter-spacing:-.025em;
          color:#fff; }
  .sub  { margin-top:22px; font-weight:500; font-size:35px; line-height:1.34;
          letter-spacing:-.005em; color:rgba(255,255,255,.72); }

  #end { position:absolute; inset:0; display:flex; flex-direction:column;
         align-items:center; justify-content:center; will-change:opacity; }
  #end svg { width:430px; height:430px; overflow:visible; }
  #word { margin-top:34px; font-weight:800; font-size:92px; letter-spacing:-.03em; color:#fff;
          will-change:transform,opacity; }
  #url  { margin-top:20px; font-weight:600; font-size:38px; letter-spacing:.01em;
          color:rgba(255,255,255,.66); will-change:transform,opacity; }
</style></head><body><div id="stage">
  ${BEATS.map((b, i) => `<div class="beat" id="b${i}"><div class="phone"><img id="i${i}" src="${shots[i]}"></div></div>`).join("")}
  ${BEATS.map((b, i) => `<div class="caps" id="c${i}"><div class="big">${b.big}</div><div class="sub">${b.sub}</div></div>`).join("")}
  <div id="end">
    <svg viewBox="0 0 100 100">
      <path id="pa" d="${MARK_A}" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/>
      <path id="pb" d="${MARK_B}" fill="none" stroke="${BLUE}" stroke-width="14" stroke-linecap="round"/>
      <circle id="da" cx="28" cy="16" r="8.5" fill="#ffffff"/>
      <circle id="db" cx="72" cy="16" r="8.5" fill="${BLUE}"/>
    </svg>
    <div id="word">UNIsport</div>
    <div id="url">getunisport.com</div>
  </div>
</div>
<script>
  const N = ${BEATS.length}, DUR = ${DUR}, OVER = ${OVER}, STEP = ${STEP};
  const END_AT = ${END_AT};

  const cl = (x) => x < 0 ? 0 : x > 1 ? 1 : x;
  const outCubic = (x) => 1 - Math.pow(1 - cl(x), 3);
  const outExpo  = (x) => cl(x) >= 1 ? 1 : 1 - Math.pow(2, -9 * cl(x));
  const inCubic  = (x) => Math.pow(cl(x), 3);

  const pa = document.getElementById("pa"), pb = document.getElementById("pb");
  const LA = pa.getTotalLength(), LB = pb.getTotalLength();
  pa.style.strokeDasharray = LA; pb.style.strokeDasharray = LB;

  window.frame = function (t) {
    for (let i = 0; i < N; i++) {
      const s = i * STEP;
      const local = t - s;
      const beat = document.getElementById("b" + i);
      const img  = document.getElementById("i" + i);
      const cap  = document.getElementById("c" + i);

      if (local < -0.5 || local > DUR + 0.2) { beat.style.opacity = 0; cap.style.opacity = 0; continue; }

      /* in: rises from below and settles. out: keeps rising and fades. */
      const inP  = outExpo(local / 0.55);
      const outP = inCubic((local - (DUR - OVER)) / OVER);
      const y    = 250 * (1 - inP) - 190 * outP;
      const sc   = (0.93 + 0.07 * inP) * (1 - 0.05 * outP);

      beat.style.opacity = String(cl(local / 0.28) * (1 - outP));
      beat.style.transform = "translate3d(0," + y.toFixed(2) + "px,0) scale(" + sc.toFixed(4) + ")";

      /* the still breathes, so a screenshot does not look like a screenshot */
      const k = cl(local / DUR);
      img.style.transform = "scale(" + (1.0 + 0.036 * k).toFixed(4) + ") translateY(" + (-12 * k).toFixed(2) + "px)";

      const cIn = outExpo((local - 0.34) / 0.5);
      cap.style.opacity = String(cl((local - 0.34) / 0.34) * (1 - outP));
      cap.style.transform = "translate3d(0," + (30 * (1 - cIn)).toFixed(2) + "px,0) scale(" + (0.965 + 0.035 * cIn).toFixed(4) + ")";
    }

    /* end card: two people arrive, then they become the mark */
    const e = t - END_AT;
    const end = document.getElementById("end");
    end.style.opacity = String(cl(e / 0.45));

    const arrive = outExpo(e / 0.7);
    const da = document.getElementById("da"), db = document.getElementById("db");
    da.setAttribute("cx", (28 - 46 * (1 - arrive)).toFixed(2));
    db.setAttribute("cx", (72 + 46 * (1 - arrive)).toFixed(2));

    const draw = outCubic((e - 0.5) / 0.85);
    pa.style.strokeDashoffset = (LA * (1 - draw)).toFixed(2);
    pb.style.strokeDashoffset = (LB * (1 - draw)).toFixed(2);

    const wP = outExpo((e - 1.25) / 0.6);
    const word = document.getElementById("word");
    word.style.opacity = String(cl((e - 1.25) / 0.45));
    word.style.transform = "translate3d(0," + (34 * (1 - wP)).toFixed(2) + "px,0)";

    const uP = outExpo((e - 1.65) / 0.6);
    const url = document.getElementById("url");
    url.style.opacity = String(cl((e - 1.65) / 0.45));
    url.style.transform = "translate3d(0," + (24 * (1 - uP)).toFixed(2) + "px,0)";
  };
  window.frame(0);
</script></body></html>`;

const work = path.join(os.tmpdir(), "unisport-reel-frames");
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: "networkidle0" });
await page.evaluateHandle("document.fonts.ready");

const frames = Math.round(TOTAL * FPS);
for (let f = 0; f < frames; f++) {
  const t = f / FPS;
  await page.evaluate((tt) => window.frame(tt), t);
  await page.screenshot({ path: path.join(work, String(f).padStart(5, "0") + ".png"), type: "png" });
  if (f % 90 === 0) process.stdout.write("  frame " + f + "/" + frames + "\n");
}
await browser.close();

const out = path.join(ROOT, "mockups/video/unisport-reel.mp4");
mkdirSync(path.dirname(out), { recursive: true });
execFileSync("ffmpeg", [
  "-y", "-framerate", String(FPS), "-i", path.join(work, "%05d.png"),
  "-c:v", "libx264", "-preset", "slow", "-crf", "17",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
console.log("\nwrote " + out + "  (" + TOTAL.toFixed(1) + "s, " + frames + " frames)");
