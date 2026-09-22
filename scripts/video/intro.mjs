/*
  THE INTRO — an Instagram Reel, 1080x1920, 30 fps, ~14 s. Light version, v2.

  THE BRIEF (owner, 2026-09-22, revised twice the same day):
    White ground, brand blue ink, nothing else but the mark's navy. The
    headline types the way the landing page's own headline does: centred, a
    steady 38 ms a letter, a thin blinking caret (components/landing/
    StudentIntro.tsx, TYPE_MS and .l-caret). The camera is never still.
      1. "Never train alone again." types itself, centred, holds a beat, and
         lifts and blurs away. (An edit to "with the right people." was in
         cuts 3–4 and was cut by the owner.)
      2. "Choose your activity." Three activities — Gym · Running · Cardio —
         as plain labels with a BORDERED ICON TILE under each. A hand taps Gym,
         then Cardio; the tiles fill blue.
      3. "Find training partners." Two i-figures, navy and blue, slide in and
         stop a hand apart — and stay there a while.
      4. The label types "Match." Then, slowly, they close the gap and the
         curves fill in until they connect on the straight seam into the mark.
      5. "Match." goes. "UNIsport" types itself ABOVE the mark, in the real
         wordmark. Under the mark: "Live now at Harvard". No domain.
    Sound is a separate step (intro-sound.mjs): the reference reel's own tap
    and typing (high-passed out from under its music), library whooshes, no
    baked music, so a trending track can be laid on in Instagram.

  How it is made: Chrome stepped frame by frame through window.frame(t) at
  60 fps, tmix'd to 30 for motion blur. No bloom on white.

  Things that look like bugs if changed back:
    - every character exists in the DOM from frame one and is only hidden, the
      way the landing page does it, so a centred line never re-centres while
      typing and tmix never ghosts it.
    - the mark is the SHIPPED geometry (straight seam, butt caps, round leg
      tops) from components/landing/LogoMark.tsx.
    - element ids: the typed characters own the prefixes p/a/b/m/w. Nothing
      else may use them (the activity tiles once did and hid three letters).

  Typing times are written to mockups/video/intro-times.json so the sound
  lands on the same frames.

  Run: node scripts/video/intro.mjs            -> mockups/video/unisport-intro.mp4 (silent)
       node scripts/video/intro.mjs --still 7.2 -> one PNG, to check a moment
*/
import puppeteer from "puppeteer-core";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");

const W = 1080, H = 1920;
const RENDER_FPS = 60;
const OUT_FPS = 30;

const BLUE = "#1f32c1";
const NAVY = "#2f3b52";
const INK = "#141618";

const PREFIX = "Never train";
const SUF_A = "alone again";          // no full stop (owner)
const MATCH = "Match";                // no full stop (owner)
const FIND = "Find training partners";
const LIVE_A = "Live now at ", LIVE_B = "Harvard";   // Harvard in its crimson (owner)
const CRIMSON = "#A51C30";            // lib/themes.ts, Harvard primary — the one school colour in brand material, by the owner's call
const ACTS = ["Gym", "Running", "Cardio"];
const WORD = ["U", "N", "I", "s", "p", "o", "r", "t"];   // the I is drawn, not typed

/* the schedule, in seconds. ms = the landing page's TYPE_MS. */
/* No edit of the line any more (owner, 2026-09-22 night): the headline types,
   holds, lifts, and "Choose your activity." follows straight away. */
const T = {
  cursor: 0.15,
  typeA: 0.35, ms: 0.038,
  lift: 2.00,                                   // and the lift itself is quick now (0.3 s)
  act: 2.30, tiles: 2.55, hand: 2.85, tap1: 3.45, tap2: 4.15, actOut: 4.65,
  find: 4.90, slide: 5.00, apart: 6.05,
  matchType: 6.75, join: 7.05, met: 8.45,
  matchOut: 8.95, word: 9.25, msWord: 0.07,     // msWord = the stagger between falling letters
  live: 10.05,
  out: 11.20, end: 11.70,
};

const seq = (n, start, step) => Array.from({ length: n }, (_, i) => +(start + i * step).toFixed(4));
const TIMES = {
  prefix: seq(PREFIX.length, T.typeA, T.ms),
  sufA: seq(SUF_A.length, T.typeA + (PREFIX.length + 1) * T.ms, T.ms),
  match: seq(MATCH.length, T.matchType, T.ms),
  word: seq(WORD.length, T.word, T.msWord),
};
writeFileSync(path.join(ROOT, "mockups/video/intro-times.json"), JSON.stringify({ T, TIMES }, null, 1));

const chars = (s, id) => s.split("").map((c, i) =>
  `<span class="c" id="${id}${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");

const ICONS = {
  Gym: `<path d="M9 25v14M16 20v24M48 20v24M55 25v14M16 32h32"/>`,
  Running: `<circle cx="39" cy="13" r="5.5"/><path d="M35 22l-9 12 5 11-8 11M26 34l13 2 8 10M35 22l10 4 8-6M26 34l-11 6"/>`,
  Cardio: `<path d="M32 54C12 41 7 28 14 20c6-7 14-4 18 2 4-6 12-9 18-2 7 8 2 21-18 34z"/><path d="M17 34h8l4-7 6 15 4-8h7"/>`,
};
const icon = (name) => `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]}</svg>`;

/* the barbell I from components/landing/Wordmark.tsx, same box */
const barbellI = `<svg class="bi" viewBox="0 0 44.9 170" style="width:.2318em;height:.8743em;transform:translateY(.0771em);margin-left:.05em;margin-right:-.035em">
  <g transform="rotate(13.1 22.45 85)">
    <rect x="16.5" y="6" width="11.9" height="158" rx="1.4" fill="${INK}"/>
    <g fill="${BLUE}"><rect x="3.4" y="15" width="38.1" height="17.3" rx="3.8"/><rect x="3.4" y="137.7" width="38.1" height="17.3" rx="3.8"/></g>
  </g></svg>`;
const wordHtml = WORD.map((ch, i) =>
  `<span class="c${i >= 3 ? " s" : ""}" id="w${i}">${ch === "I" ? barbellI : ch}</span>`).join("");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; color:${BLUE}; }
  #stage { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  #cam { position:absolute; inset:0; transform-origin:50% 50%; will-change:transform; }

  /* the headline: centred like the landing page, untyped letters invisible but present */
  #line { position:absolute; left:40px; right:40px; top:790px; text-align:center;
          font-family:"Instrument Serif", serif; font-style:italic; font-size:112px; line-height:1.08; letter-spacing:-.012em; color:${BLUE};
          will-change:transform,opacity,filter; }
  #line .row { display:block; }
  .c { display:inline-block; visibility:hidden; }
  /* the landing's .l-caret: 0.055em wide, 0.74em tall, 1 s step blink */
  #cur { position:absolute; width:6px; height:83px; background:${BLUE}; opacity:0; will-change:transform,opacity; }

  #act { position:absolute; left:74px; right:74px; top:640px; text-align:center; font-weight:700; font-size:54px; letter-spacing:-.02em; color:${BLUE}; opacity:0; will-change:opacity,filter,transform; }
  #acts { position:absolute; left:0; right:0; top:790px; display:flex; justify-content:center; gap:70px; }
  .a { display:flex; flex-direction:column; align-items:center; gap:22px; opacity:0; will-change:opacity,filter,transform; }
  .a .lb { font-weight:700; font-size:42px; letter-spacing:-.01em; color:${BLUE}; }
  .a .tile { width:168px; height:168px; border-radius:36px; border:4px solid ${BLUE}; display:flex; align-items:center; justify-content:center; color:${BLUE};
             background:#fff; will-change:transform,background,color,box-shadow; }
  .a .tile svg { width:96px; height:96px; }
  #hand { position:absolute; left:0; top:0; width:120px; height:120px; opacity:0; will-change:transform,opacity; filter:drop-shadow(0 10px 18px rgba(20,24,40,.25)); }

  #find, #match { position:absolute; left:74px; right:74px; top:560px; text-align:center; font-weight:700; font-size:54px; letter-spacing:-.02em; color:${BLUE}; opacity:0; will-change:opacity,filter,transform; }
  #mark { position:absolute; left:50%; top:700px; width:520px; height:520px; margin-left:-260px; overflow:visible; opacity:0; will-change:opacity,transform; }
  /* the wordmark, typed, above the mark */
  /* the wordmark: its letters FALL IN from above, one after another (owner) */
  #word { position:absolute; left:0; right:0; top:470px; text-align:center; font-family:"Instrument Serif", serif; font-style:italic; font-size:140px; letter-spacing:-.02em; line-height:1; color:${INK}; }
  #word .c { visibility:visible; opacity:0; will-change:transform,opacity; }
  #word .s { color:${BLUE}; }
  #word .bi { display:inline-block; vertical-align:baseline; overflow:visible; }
  #live { position:absolute; left:0; right:0; top:1262px; text-align:center; font-weight:600; font-size:44px; letter-spacing:-.01em; color:${BLUE}; opacity:0; will-change:transform,opacity; }
  #fade { position:absolute; inset:0; background:#fff; opacity:0; }
</style></head><body><div id="stage"><div id="cam">

  <div id="line"><span class="row" id="row1">${chars(PREFIX, "p")}</span><span class="row" id="row2"><span id="sufA">${chars(SUF_A, "a")}</span></span></div>
  <div id="cur"></div>

  <div id="act">Choose your activity.</div>
  <div id="acts">${ACTS.map((a, i) => `<div class="a" id="act${i}"><div class="lb">${a}</div><div class="tile" id="t${i}">${icon(a)}</div></div>`).join("")}</div>
  <div id="hand"><svg viewBox="0 0 24 24" width="120" height="120"><path fill="${INK}" stroke="#fff" stroke-width=".5" stroke-linejoin="round"
    d="M9 2.2c-.9 0-1.6.7-1.6 1.6v8.9l-1.8-1.6c-.7-.6-1.8-.6-2.4.1-.6.7-.6 1.7 0 2.3l4.6 5.2c.9 1 2.2 1.6 3.6 1.6h3.7c2.4 0 4.3-1.9 4.3-4.3v-4.6c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6v-.7c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6v-.5c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6V3.8c0-.9-.7-1.6-1.6-1.6z"/></svg></div>

  <div id="find">${FIND}</div>
  <div id="match">${chars(MATCH, "m")}</div>
  <svg id="mark" viewBox="0 0 100 100">
    <g id="ga">
      <circle cx="28" cy="16" r="8.5" fill="${NAVY}"/>
      <circle cx="28" cy="34" r="7" fill="${NAVY}"/>
      <path id="pa" d="M28 34 V56 Q28 82 50 82 H51" fill="none" stroke="${NAVY}" stroke-width="14" stroke-linecap="butt"/>
    </g>
    <g id="gb">
      <circle cx="72" cy="16" r="8.5" fill="${BLUE}"/>
      <circle cx="72" cy="34" r="7" fill="${BLUE}"/>
      <path id="pb" d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${BLUE}" stroke-width="14" stroke-linecap="butt"/>
    </g>
  </svg>
  <div id="word">${wordHtml}</div>
  <div id="live">${LIVE_A}<span style="color:${CRIMSON}">${LIVE_B}</span></div>
</div><div id="fade"></div></div>
<script>
  var T = ${JSON.stringify(T)}, TM = ${JSON.stringify(TIMES)};
  var NP = ${PREFIX.length}, NA = ${SUF_A.length}, NM = ${MATCH.length}, NW = ${WORD.length};
  var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var outExpo = function (x) { x = cl(x); return x >= 1 ? 1 : 1 - Math.pow(2, -9 * x); };
  var outCubic = function (x) { return 1 - Math.pow(1 - cl(x), 3); };
  var inCubic = function (x) { return Math.pow(cl(x), 3); };
  var inOut = function (x) { x = cl(x); return x < .5 ? 4*x*x*x : 1 - Math.pow(-2*x+2,3)/2; };
  var outBack = function (x) { x = cl(x); var c = 1.5; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  var $ = function (id) { return document.getElementById(id); };
  var show = function (el, on) { el.style.visibility = on ? "visible" : "hidden"; };

  var pa = $("pa"), pb = $("pb");
  var LA = pa.getTotalLength(), LB = pb.getTotalLength();
  pa.style.strokeDasharray = LA; pb.style.strokeDasharray = LB;
  var stage = $("stage").getBoundingClientRect();

  /* a landing-style caret after the last visible char of a run; at the run's start when empty */
  function caretAt(cur, els, firstEl, yOff) {
    var last = null;
    for (var i = els.length - 1; i >= 0; i--) if (els[i].style.visibility === "visible") { last = els[i]; break; }
    var r = (last || firstEl).getBoundingClientRect();
    var x = last ? r.right - stage.left + 3 : r.left - stage.left - 2;
    cur.style.transform = "translate3d(" + x.toFixed(1) + "px," + (r.top - stage.top + yOff).toFixed(1) + "px,0)";
  }
  var blink = function (t) { return Math.floor(t * 2) % 2 === 0 ? 1 : 0; };   // 1 s, steps(1)

  window.frame = function (t) {
    /* ---- camera ---- */
    /* the camera (owner, 2026-09-22 night: "zoom in after choose your activity")
         typing:    a slow push, then a pull back as the line lifts
         activity:  a gentle push
         after it:  ZOOM IN — the camera drives into the two figures as they
                    arrive, keeps leaning in while they wait and close
         connect:   a punch, then it eases back out so the name above and
                    the line below sit comfortably in frame */
    /* still while the headline types (owner: no zoom in / out there); a gentle
       push through the activities; the zoom in after them; NO punch on the
       connect (owner); ease back out for the name */
    var cam = 1;
    cam += 0.04 * cl((t - T.act) / (T.actOut - T.act));
    cam += 0.14 * inOut((t - T.actOut) / (T.apart - T.actOut + 0.3));
    cam += 0.04 * cl((t - T.apart) / (T.met - T.apart));
    cam -= 0.22 * inOut((t - T.matchOut) / (T.live - T.matchOut + 0.4));
    $("cam").style.transform = "scale(" + cam.toFixed(4) + ")";

    /* ---- 1. the typed, edited line ---- */
    var i;
    var P = [], A = [];
    for (i = 0; i < NP; i++) { P.push($("p" + i)); show(P[i], t >= TM.prefix[i]); }
    for (i = 0; i < NA; i++) { A.push($("a" + i)); show(A[i], t >= TM.sufA[i]); }

    var cur = $("cur");
    var typing = t >= T.typeA && t <= TM.sufA[NA - 1] + T.ms;
    cur.style.opacity = String(cl((t - T.cursor) / 0.05) * (1 - cl((t - T.lift) / 0.2)) * (typing ? 1 : blink(t)));
    if (t < TM.sufA[0]) caretAt(cur, P, P[0], 14);
    else caretAt(cur, A, A[0], 14);

    var b = cl((t - T.lift) / 0.3);                     // quick (owner: "make it disappear faster")
    var lineEl = $("line");
    lineEl.style.opacity = String(1 - inCubic(b * 1.15));
    lineEl.style.filter = "blur(" + (18 * b).toFixed(1) + "px)";
    lineEl.style.transform = "translate3d(0," + (-50 * outCubic(b)).toFixed(1) + "px,0)";

    /* ---- 2. choose your activity ---- */
    var aOut = 1 - cl((t - T.actOut) / 0.35);
    var ai = outExpo((t - T.act) / 0.55);
    var act = $("act");
    act.style.opacity = String(cl((t - T.act) / 0.3) * aOut);
    act.style.filter = "blur(" + (12 * (1 - ai)).toFixed(1) + "px)";
    act.style.transform = "translate3d(0," + (26 * (1 - ai)).toFixed(1) + "px,0)";
    var picked = [t >= T.tap1, false, t >= T.tap2];
    for (i = 0; i < 3; i++) {
      var a = $("act" + i), tile = $("t" + i);
      var d0 = T.tiles + i * 0.12;
      var ci = outBack((t - d0) / 0.55);
      a.style.opacity = String(cl((t - d0) / 0.25) * aOut * ((t >= T.tap1 && !picked[i]) ? 0.45 : 1));
      a.style.filter = "blur(" + (10 * (1 - cl((t - d0) / 0.4))).toFixed(1) + "px)";
      a.style.transform = "translate3d(0," + (50 * (1 - ci)).toFixed(1) + "px,0)";
      var tapT = i === 0 ? T.tap1 : i === 2 ? T.tap2 : -99;
      var dip = tapT > 0 ? Math.sin(Math.PI * cl((t - tapT) / 0.22)) : 0;
      var sel = picked[i] ? outExpo((t - tapT) / 0.3) : 0;
      tile.style.transform = "scale(" + (1 - 0.1 * dip + 0.06 * Math.sin(Math.PI * cl((t - tapT - 0.1) / 0.45))).toFixed(3) + ")";
      tile.style.background = "rgba(31,50,193," + sel.toFixed(3) + ")";
      tile.style.color = sel > 0.5 ? "#fff" : "${BLUE}";
      var ring = tapT > 0 ? (1 - cl((t - tapT) / 0.5)) * cl((t - tapT) / 0.05) : 0;
      tile.style.boxShadow = "0 0 0 " + (22 * (1 - ring) * (ring > 0 ? 1 : 0)).toFixed(0) + "px rgba(31,50,193," + (0.35 * ring).toFixed(2) + ")";
    }
    var hand = $("hand");
    var r0 = $("t0").getBoundingClientRect(), r2 = $("t2").getBoundingClientRect();
    var g = { x: r0.left + r0.width * 0.55 - stage.left, y: r0.top + r0.height * 0.55 - stage.top };
    var k = { x: r2.left + r2.width * 0.55 - stage.left, y: r2.top + r2.height * 0.55 - stage.top };
    var hx, hy;
    if (t < T.tap1) { var m1 = outExpo((t - T.hand) / 0.6); hx = g.x + 280 * (1 - m1); hy = g.y + 480 * (1 - m1); }
    else if (t < T.tap2) { var m2 = inOut((t - T.tap1 - 0.15) / 0.5); hx = g.x + (k.x - g.x) * m2; hy = g.y - 60 * Math.sin(Math.PI * m2); }
    else { var m3 = outExpo((t - T.tap2 - 0.15) / 0.5); hx = k.x + 220 * m3; hy = k.y + 340 * m3; }
    var press = Math.max(t >= T.tap1 ? Math.sin(Math.PI * cl((t - T.tap1) / 0.22)) : 0, t >= T.tap2 ? Math.sin(Math.PI * cl((t - T.tap2) / 0.22)) : 0);
    hand.style.opacity = String(cl((t - T.hand) / 0.25) * aOut);
    hand.style.transform = "translate3d(" + (hx - 30).toFixed(1) + "px," + (hy - 10).toFixed(1) + "px,0) scale(" + (1 - 0.12 * press).toFixed(3) + ")";

    /* ---- 3 + 4. two i's wait, then Match, then they connect ---- */
    var fOut = 1 - cl((t - T.out) / 0.4);
    var fi = outExpo((t - T.find) / 0.5);
    var find = $("find");
    find.style.opacity = String(cl((t - T.find) / 0.3) * (1 - cl((t - (T.matchType - 0.25)) / 0.25)));
    find.style.filter = "blur(" + (12 * (1 - fi)).toFixed(1) + "px)";
    find.style.transform = "translate3d(0," + (26 * (1 - fi)).toFixed(1) + "px,0)";
    var match = $("match"), M = [];
    match.style.opacity = String(cl((t - T.matchType) / 0.05) * (1 - cl((t - T.matchOut) / 0.3)));
    for (i = 0; i < NM; i++) { M.push($("m" + i)); show(M[i], t >= TM.match[i]); }
    match.style.filter = "blur(" + (14 * cl((t - T.matchOut) / 0.3)).toFixed(1) + "px)";

    var mark = $("mark");
    mark.style.opacity = String(cl((t - T.slide) / 0.2) * fOut);
    var sl = outExpo((t - T.slide) / (T.apart - T.slide + 0.2));
    var dx = 120 * (1 - sl);
    var closeIn = inOut((t - T.join) / (T.met - T.join));               // the slow fill
    var gap = 10 * (1 - closeIn);
    $("ga").setAttribute("transform", "translate(" + (-(dx + gap)).toFixed(2) + " 0)");
    $("gb").setAttribute("transform", "translate(" + (dx + gap).toFixed(2) + " 0)");
    var legOnly = 22 / LA;
    var draw = legOnly + (1 - legOnly) * closeIn;
    pa.style.strokeDashoffset = (LA * (1 - draw)).toFixed(2);
    pb.style.strokeDashoffset = (LB * (1 - draw)).toFixed(2);
    /* no ring, no lift, no punch on the connect (owner): the curves simply meet */
    mark.style.filter = "blur(" + (3 * (1 - sl) * (t > T.slide && t < T.apart ? 1 : 0)).toFixed(1) + "px)";

    /* ---- 5. UNIsport falls in from above, letter by letter; Live now at Harvard below ---- */
    for (i = 0; i < NW; i++) {
      var w = $("w" + i);
      var fp = outCubic((t - TM.word[i]) / 0.55);
      w.style.opacity = String(cl((t - TM.word[i]) / 0.2) * fOut);
      w.style.transform = "translate3d(0," + (-150 * (1 - fp)).toFixed(1) + "px,0)";
    }
    var lP = outExpo((t - T.live) / 0.6);
    var live = $("live");
    live.style.opacity = String(cl((t - T.live) / 0.4) * fOut);
    live.style.transform = "translate3d(0," + (22 * (1 - lP)).toFixed(1) + "px,0)";

    $("fade").style.opacity = String(cl((t - T.out) / 0.45));
  };
  window.frame(0);
</script></body></html>`;

const work = path.join(os.tmpdir(), "unisport-intro-frames");
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

const only = process.argv[2] === "--still" ? Number(process.argv[3]) : null;
if (only !== null) {
  await page.evaluate((tt) => window.frame(tt), only);
  const still = path.join(ROOT, "mockups/video/intro-still-" + only.toFixed(2) + ".png");
  await page.screenshot({ path: still, type: "png" });
  await browser.close();
  console.log("wrote " + still);
  process.exit(0);
}
const frames = Math.round(T.end * RENDER_FPS);
for (let f = 0; f < frames; f++) {
  await page.evaluate((tt) => window.frame(tt), f / RENDER_FPS);
  await page.screenshot({ path: path.join(work, String(f).padStart(5, "0") + ".png"), type: "png" });
  if (f % 120 === 0) process.stdout.write("  frame " + f + "/" + frames + "\n");
}
await browser.close();

const out = path.join(ROOT, "mockups/video/unisport-intro.mp4");
mkdirSync(path.dirname(out), { recursive: true });
const VF = ["tmix=frames=2:weights=1 1", "fps=" + OUT_FPS, "eq=contrast=1.03", "noise=alls=2:allf=t"].join(",");
execFileSync("ffmpeg", [
  "-y", "-framerate", String(RENDER_FPS), "-i", path.join(work, "%05d.png"),
  "-vf", VF,
  "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", "14M", "-bufsize", "28M",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
], { stdio: ["ignore", "ignore", "inherit"] });
rmSync(work, { recursive: true, force: true });
console.log("\nwrote " + out + "  (" + T.end.toFixed(2) + "s)");
