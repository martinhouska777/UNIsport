/*
  The vertical launch reel (1080x1920, 30fps), in the dark motion-graphics
  language the owner picked from reference reels (2026-09-22).

  What that language is, and how each part is made here:
    - near-black ground, one blue glow as the only light  -> radial gradient
    - the UI floating in 3D, flying past camera           -> CSS perspective
    - everything emits light                              -> blurred copy of
      the screen behind itself, plus a real bloom pass in ffmpeg
    - motion blur                                         -> rendered at 60fps
      and averaged down to 30 with tmix
    - kinetic type, key word underlined in the accent     -> per-word reveal

  Why it is drawn rather than generated: AI video models do not preserve a UI.
  Hand one a screenshot of the app and the buttons morph and the text melts.
  Drawing it keeps the type sharp and costs nothing.

  The screens are REAL dark captures from public/landing/dark/. The schools
  beat cycles all eight Ivy themes, which is both the white-label story and the
  reason the reel does not read as one university's app.

  Chrome is stepped frame by frame through `window.frame(t)` rather than left
  to animate on its own — a headless page throttles rAF, which is how you
  silently lose frames.

  Colours are the brand neutrals from app/globals.css. No school colour ever
  enters brand material; every university shares the mark.

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

const W = 1080, H = 1920;
const RENDER_FPS = 60;   // rendered high so frames can be averaged into blur
const OUT_FPS = 30;

/* Brand — app/globals.css */
const BLUE = "#1f32c1";
const LIFT = "#8ea4ff";   // the blue, lifted enough to glow on black

/* The mark, on a 100 x 100 box: a U split down the middle, each half a person.
   Same geometry as mockups/logo/_icons.mjs — change it there and here together. */
const MARK_A = "M28 34 V56 Q28 82 50 82";
const MARK_B = "M72 34 V56 Q72 82 50 82";

const SCHOOLS = ["harvard", "yale", "princeton", "penn", "brown", "columbia", "cornell", "dartmouth"];

/* at = when the scene starts, dur = how long it is on screen. Scenes overlap
   slightly: one rushes past the camera as the next arrives from behind it. */
const SCENES = [
  { kind: "hook", at: 0.00, dur: 2.70,
    big: "Never train alone again.", key: "alone" },

  { kind: "card", at: 2.45, dur: 4.20, img: "dark/02-match.webp",
    big: "Sorted by how well you fit.", key: "fit", type: true,
    sub: "Interests, concentration, gym and hours." },

  { kind: "card", at: 6.35, dur: 3.95, img: "dark/04-plan-a-session.webp",
    big: "Plan it in the chat.", key: "chat",
    sub: "They accept once, and it is in both calendars." },

  { kind: "card", at: 10.00, dur: 4.25, img: "dark/tall-profile.webp", pan: true,
    big: "See where you rank.", key: "rank",
    sub: "Every session you log marks its day." },

  { kind: "cycle", at: 13.95, dur: 4.40,
    big: "Eight campuses. Each its own.", key: "Eight",
    sub: "Your .edu decides which one you see." },

  { kind: "end", at: 18.10, dur: 4.90 },
];

const TOTAL = SCENES[SCENES.length - 1].at + SCENES[SCENES.length - 1].dur;

const uri = (rel) =>
  "data:image/webp;base64," + readFileSync(path.join(ROOT, "public/landing", rel)).toString("base64");

/* Each card carries a blurred, brightened copy of its own screen behind it.
   That is where the light in this style comes from — the content, not a lamp. */
const cardHtml = (s, i) => {
  if (s.kind === "cycle") {
    const imgs = SCHOOLS.map((n, k) =>
      `<img class="shot cyc" id="cy${i}_${k}" src="${uri("dark/closers/match-" + n + ".webp")}">`).join("");
    return `<div class="beat" id="s${i}"><div class="glowplate" id="g${i}"></div>
      <div class="card" id="c${i}">${imgs}</div></div>`;
  }
  const src = uri(s.img);
  return `<div class="beat" id="s${i}"><div class="glowplate" id="g${i}"></div>
    <div class="card" id="c${i}"><img class="shot${s.pan ? " tall" : ""}" id="im${i}" src="${src}"></div>
    <img class="halo" id="h${i}" src="${src}"></div>`;
};

/* Words are separate spans so they can arrive one at a time, out of focus and
   then sharp. The keyed word is the accent colour with a line drawn under it. */
const words = (big, key) => big.split(" ").map((w) => {
  const bare = w.replace(/[.,]/g, "");
  const hit = key && bare.toLowerCase() === key.toLowerCase();
  return `<span class="w${hit ? " k" : ""}">${w}${hit ? '<i class="ul"></i>' : ""}</span>`;
}).join(" ");

const capHtml = (s, i) => s.big
  ? `<div class="caps" id="p${i}"><div class="big">${words(s.big, s.key)}</div>${
      s.sub ? `<div class="sub"><span id="t${i}">${s.sub}</span>${s.type ? '<b class="cur" id="cu' + i + '"></b>' : ""}</div>` : ""
    }</div>`
  : "";

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,500;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }

  #stage { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#000;
           perspective:1500px; perspective-origin:50% 44%; }
  #amb { position:absolute; inset:0; will-change:opacity;
         background:radial-gradient(52% 34% at 50% 40%, rgba(60,86,220,.50) 0%, rgba(20,28,80,.18) 42%, rgba(0,0,0,0) 72%); }

  .beat { position:absolute; inset:0; transform-style:preserve-3d; will-change:opacity; }

  .card { position:absolute; left:50%; top:232px; width:700px; height:1151px; margin-left:-350px;
          border-radius:46px; overflow:hidden; background:#000;
          box-shadow:0 0 0 2px rgba(150,170,255,.16), 0 60px 120px rgba(0,0,0,.8);
          will-change:transform; }
  .shot { position:absolute; left:0; top:0; width:100%; height:100%; object-fit:cover; object-position:50% 0; }
  .shot.tall { height:auto; will-change:transform; }
  .cyc { opacity:0; }

  /* the screen, blurred and brightened behind itself: the light source */
  .halo { position:absolute; left:50%; top:232px; width:700px; height:1151px; margin-left:-350px;
          object-fit:cover; object-position:50% 0;
          filter:blur(66px) saturate(2.6) brightness(1.5); opacity:.62; z-index:-1;
          will-change:transform,opacity; }
  .glowplate { position:absolute; left:50%; top:300px; width:900px; height:1000px; margin-left:-450px;
               background:radial-gradient(50% 50% at 50% 50%, rgba(80,110,255,.42), rgba(0,0,0,0) 70%);
               filter:blur(40px); z-index:-2; will-change:opacity,transform; }

  .caps { position:absolute; left:74px; right:74px; top:1452px; text-align:center; will-change:opacity; }
  .big  { font-style:italic; font-weight:800; font-size:76px; line-height:1.08; letter-spacing:-.028em;
          color:#fff; text-shadow:0 0 46px rgba(130,160,255,.5), 0 0 110px rgba(31,50,193,.4); }
  .big .w { display:inline-block; position:relative; will-change:transform,opacity,filter; }
  .big .k { color:${LIFT}; text-shadow:0 0 40px rgba(142,164,255,.85), 0 0 90px rgba(31,50,193,.6); }
  .big .ul { position:absolute; left:2%; bottom:-.13em; width:96%; height:7px; border-radius:6px;
             background:${LIFT}; box-shadow:0 0 26px ${LIFT}; transform-origin:0 50%;
             transform:scaleX(0); will-change:transform; }
  .sub  { margin-top:26px; font-weight:500; font-size:34px; line-height:1.36; letter-spacing:-.004em;
          color:rgba(214,224,255,.74); }
  .cur  { display:inline-block; width:3px; height:.98em; margin-left:6px; vertical-align:-.13em;
          background:${LIFT}; box-shadow:0 0 16px ${LIFT}; }

  #end { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center;
         justify-content:center; will-change:opacity; }
  #end svg { width:400px; height:400px; overflow:visible;
             filter:drop-shadow(0 0 40px rgba(142,164,255,.6)); }
  #word { margin-top:40px; font-weight:800; font-size:96px; letter-spacing:-.035em; color:#fff;
          text-shadow:0 0 50px rgba(130,160,255,.55); will-change:transform,opacity; }
  #url  { margin-top:22px; font-weight:600; font-size:37px; letter-spacing:.02em;
          color:rgba(200,212,255,.7); will-change:transform,opacity; }
  #spark { position:absolute; left:50%; top:50%; width:8px; height:8px; margin:-4px 0 0 -4px;
           border-radius:50%; background:#fff; box-shadow:0 0 60px 20px rgba(142,164,255,.9);
           will-change:transform,opacity; }
</style></head><body><div id="stage">
  <div id="amb"></div>
  <div id="spark"></div>
  ${SCENES.map((s, i) => (s.kind === "card" || s.kind === "cycle") ? cardHtml(s, i) : "").join("")}
  ${SCENES.map((s, i) => capHtml(s, i)).join("")}
  <div id="end">
    <svg viewBox="0 0 100 100">
      <path id="pa" d="${MARK_A}" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round"/>
      <path id="pb" d="${MARK_B}" fill="none" stroke="${LIFT}" stroke-width="14" stroke-linecap="round"/>
      <circle id="da" cx="28" cy="16" r="8.5" fill="#ffffff"/>
      <circle id="db" cx="72" cy="16" r="8.5" fill="${LIFT}"/>
    </svg>
    <div id="word">UNIsport</div>
    <div id="url">getunisport.com</div>
  </div>
</div>
<script>
  var SCENES = ${JSON.stringify(SCENES.map((s) => ({ kind: s.kind, at: s.at, dur: s.dur, big: s.big || "", sub: s.sub || "", type: !!s.type, pan: !!s.pan })))};
  var NS = ${SCHOOLS.length};

  var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var outExpo = function (x) { x = cl(x); return x >= 1 ? 1 : 1 - Math.pow(2, -9 * x); };
  var outCubic = function (x) { return 1 - Math.pow(1 - cl(x), 3); };
  var inCubic = function (x) { return Math.pow(cl(x), 3); };

  var pa = document.getElementById("pa"), pb = document.getElementById("pb");
  var LA = pa.getTotalLength(), LB = pb.getTotalLength();
  pa.style.strokeDasharray = LA; pb.style.strokeDasharray = LB;

  /* tall screens pan: how far the image can travel inside the card */
  var travel = {};
  for (var i = 0; i < SCENES.length; i++) {
    if (SCENES[i].pan) {
      var im = document.getElementById("im" + i);
      travel[i] = Math.max(0, im.naturalHeight * (700 / im.naturalWidth) - 1151);
    }
  }

  window.frame = function (t) {
    var ambLift = 0;

    for (var i = 0; i < SCENES.length; i++) {
      var s = SCENES[i];
      var local = t - s.at;
      var live = local > -0.6 && local < s.dur + 0.4;
      var cap = document.getElementById("p" + i);
      var beat = document.getElementById("s" + i);

      if (!live) {
        if (beat) beat.style.opacity = 0;
        if (cap) cap.style.opacity = 0;
        continue;
      }

      /* how far in, and how far into leaving */
      var IN = 0.78, OUT = 0.5;
      var inP = outExpo(local / IN);
      var outP = inCubic((local - (s.dur - OUT)) / OUT);
      var vis = cl(local / 0.26) * (1 - outP);

      if (beat) {
        beat.style.opacity = String(vis);

        /* arrives from deep behind, leaves by rushing past the camera */
        var z = -1450 * (1 - inP) + 760 * outP;
        var ry = -26 + 17 * inP + 22 * outP + 9 * cl(local / s.dur);
        var rx = 5 * (1 - inP) - 2 * cl(local / s.dur);
        var ty = 60 * (1 - inP) - 26 * cl(local / s.dur);
        var xf = "translate3d(0," + ty.toFixed(1) + "px," + z.toFixed(1) + "px) rotateY(" +
                 ry.toFixed(2) + "deg) rotateX(" + rx.toFixed(2) + "deg)";

        var card = document.getElementById("c" + i);
        var halo = document.getElementById("h" + i);
        var plate = document.getElementById("g" + i);
        if (card) card.style.transform = xf;
        if (halo) { halo.style.transform = xf; halo.style.opacity = String(0.62 * vis); }
        if (plate) plate.style.opacity = String(vis);
        ambLift = Math.max(ambLift, vis);

        if (s.pan) {
          var im = document.getElementById("im" + i);
          im.style.transform = "translateY(" + (-(travel[i] || 0) * outCubic(local / s.dur)).toFixed(1) + "px)";
        }

        if (s.kind === "cycle") {
          /* one school per slot, hard cuts with a light pulse on each change */
          var span = (s.dur - 0.9) / NS;
          var k = Math.min(NS - 1, Math.max(0, Math.floor((local - 0.45) / span)));
          for (var q = 0; q < NS; q++) {
            document.getElementById("cy" + i + "_" + q).style.opacity = q === k ? 1 : 0;
          }
          var into = ((local - 0.45) / span) % 1;
          if (plate) plate.style.opacity = String(vis * (1 + 0.9 * (1 - cl(into * 6))));
        }
      }

      if (cap) {
        cap.style.opacity = String(cl((local - 0.3) / 0.3) * (1 - cl(outP * 1.6)));
        var ws = cap.querySelectorAll(".w");
        for (var j = 0; j < ws.length; j++) {
          var wp = outExpo((local - 0.34 - j * 0.075) / 0.5);
          ws[j].style.opacity = String(cl((local - 0.34 - j * 0.075) / 0.3));
          ws[j].style.filter = "blur(" + (14 * (1 - wp)).toFixed(2) + "px)";
          ws[j].style.transform = "translate3d(0," + (34 * (1 - wp)).toFixed(1) + "px,0)";
        }
        var ul = cap.querySelector(".ul");
        if (ul) {
          var d = outCubic((local - 0.34 - ws.length * 0.075 - 0.1) / 0.45);
          ul.style.transform = "scaleX(" + d.toFixed(3) + ")";
        }
        if (s.type && s.sub) {
          /* the second line types itself, the way the reference reels do */
          var span2 = document.getElementById("t" + i);
          var n = Math.round(cl((local - 0.85) / 1.5) * s.sub.length);
          span2.textContent = s.sub.slice(0, n);
          var cu = document.getElementById("cu" + i);
          if (cu) cu.style.opacity = (Math.floor(t * 2.4) % 2 === 0 || n < s.sub.length) ? "1" : "0";
        }
      }
    }

    document.getElementById("amb").style.opacity = String(0.35 + 0.65 * ambLift);

    /* the cold open: one point of light before any words */
    var sp = document.getElementById("spark");
    var sg = outExpo(t / 0.5);
    sp.style.opacity = String(cl(t / 0.12) * (1 - cl((t - 0.5) / 0.55)));
    sp.style.transform = "translate3d(0,-300px,0) scale(" + (0.4 + 7 * sg).toFixed(2) + ")";

    /* end card: two people arrive, then they become the mark */
    var endS = SCENES[SCENES.length - 1];
    var e = t - endS.at;
    var end = document.getElementById("end");
    end.style.opacity = String(cl(e / 0.5));

    var arrive = outExpo(e / 0.75);
    document.getElementById("da").setAttribute("cx", (28 - 48 * (1 - arrive)).toFixed(2));
    document.getElementById("db").setAttribute("cx", (72 + 48 * (1 - arrive)).toFixed(2));

    var draw = outCubic((e - 0.55) / 0.9);
    pa.style.strokeDashoffset = (LA * (1 - draw)).toFixed(2);
    pb.style.strokeDashoffset = (LB * (1 - draw)).toFixed(2);

    var wP = outExpo((e - 1.35) / 0.65);
    var word = document.getElementById("word");
    word.style.opacity = String(cl((e - 1.35) / 0.5));
    word.style.transform = "translate3d(0," + (38 * (1 - wP)).toFixed(1) + "px,0)";

    var uP = outExpo((e - 1.8) / 0.65);
    var url = document.getElementById("url");
    url.style.opacity = String(cl((e - 1.8) / 0.5));
    url.style.transform = "translate3d(0," + (26 * (1 - uP)).toFixed(1) + "px,0)";
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

const frames = Math.round(TOTAL * RENDER_FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((tt) => window.frame(tt), f / RENDER_FPS);
  await page.screenshot({ path: path.join(work, String(f).padStart(5, "0") + ".png"), type: "png" });
  if (f % 150 === 0) process.stdout.write("  frame " + f + "/" + frames + "\n");
}
await browser.close();

const out = path.join(ROOT, "mockups/video/unisport-reel.mp4");
mkdirSync(path.dirname(out), { recursive: true });

/* tmix averages consecutive 60fps frames into one 30fps frame -> motion blur.
   Then a bloom pass: keep only the brights, blur them wide, screen them back
   over the picture, so every lit edge spills the way it does in the reference.
   Grain and a vignette stop the black from looking like flat digital black. */
const VF = [
  "tmix=frames=2:weights=1 1",
  "fps=" + OUT_FPS,
  "split=2[a][b]",
  "[b]curves=all='0/0 0.68/0 1/1',gblur=sigma=24:steps=2[bl]",
  "[a][bl]blend=all_mode=screen:all_opacity=0.52",
  "eq=saturation=1.1:contrast=1.05",
  "noise=alls=5:allf=t",
  "vignette=PI/4.6",
].join(",");

execFileSync("ffmpeg", [
  "-y", "-framerate", String(RENDER_FPS), "-i", path.join(work, "%05d.png"),
  "-filter_complex", VF,
  "-c:v", "libx264", "-preset", "slow", "-crf", "17",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
console.log("\nwrote " + out + "  (" + TOTAL.toFixed(1) + "s)");
