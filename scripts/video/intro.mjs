/*
  The intro (1080x1920, 30fps, ~12 s): the first half of the reel the owner
  storyboarded on 2026-09-22, and nothing after it. No feature screens.

    1. a streak of light collapses into a cursor
    2. "Never train alone again." types itself, big, centred. No word burns.
    3. the cursor walks back over "alone again." and types "with the right
       people." — then the whole line burns off
    4. "Choose your activity." and three chips: Gym · Running · Cardio.
       A hand taps Gym, then Cardio.
    5. two figures, each an i (a dot and a stroke), slide in from the sides,
       stop a hand apart, then connect at the bottom and become the mark
    6. the wordmark under it, then the address

  Same pipeline as reel.mjs: Chrome stepped frame by frame through
  window.frame(t) at 60fps, tmix'd to 30 for motion blur, bloom in ffmpeg.

  Two things that look like bugs if changed back:
    - every character of the headline exists in the DOM from frame one and is
      only hidden; the second line is left-aligned under the first. Nothing is
      ever re-laid out, so tmix never averages two positions into a ghost.
    - the mark is the SHIPPED geometry (straight seam, butt caps, round leg
      tops) from components/landing/LogoMark.tsx. Change both or the film shows
      a logo the app does not.

  Run: node scripts/video/intro.mjs
  Out: mockups/video/unisport-intro.mp4  (silent; sound is added afterwards)
*/
import puppeteer from "puppeteer-core";
import { mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");

const W = 1080, H = 1920;
const RENDER_FPS = 60;
const OUT_FPS = 30;

const LIFT = "#8ea4ff";

/* the schedule, in seconds */
const T = {
  spark: 0.0,        // streak -> point
  cursor: 0.55,      // the point is now a cursor
  typeA: 0.75,       // "Never train alone again." starts
  rateA: 15,         // chars per second
  del: 2.95,         // backspacing starts
  rateDel: 22,
  typeB: 3.55,       // "with the right people." starts
  rateB: 17,
  burn: 5.15,        // the line burns off
  act: 5.55,         // "Choose your activity."
  chips: 5.85,       // chips arrive, staggered
  hand: 6.15,        // hand drifts in
  tap1: 6.75,        // Gym
  tap2: 7.45,        // Cardio
  actOut: 7.95,      // everything fades
  find: 8.25,        // "Find training partners"
  slide: 8.35,       // the two i's slide in
  apart: 9.15,       // ... and stop a hand apart
  join: 9.45,        // the curves draw and meet
  met: 9.95,         // flash on the seam
  word: 10.35,       // UNIsport
  url: 10.85,        // getunisport.com
  out: 11.75,        // fade
  end: 12.25,
};

const PREFIX = "Never train";
const SUF_A = "alone again.";
const SUF_B = "with the right people.";
const CHIPS = ["Gym", "Running", "Cardio"];

const chars = (s, id) => s.split("").map((c, i) =>
  `<span class="c" id="${id}${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");

/* The barbell I from components/landing/Wordmark.tsx, in the same box. */
const barbellI = `<svg class="bi" viewBox="0 0 44.9 170" style="width:.2318em;height:.8743em;transform:translateY(.0771em);margin-left:.05em;margin-right:-.035em">
  <g transform="rotate(13.1 22.45 85)">
    <rect x="16.5" y="6" width="11.9" height="158" rx="1.4" fill="#fff"/>
    <g fill="${LIFT}"><rect x="3.4" y="15" width="38.1" height="17.3" rx="3.8"/><rect x="3.4" y="137.7" width="38.1" height="17.3" rx="3.8"/></g>
  </g></svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  #stage { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  #amb { position:absolute; inset:0; will-change:opacity;
         background:radial-gradient(46% 30% at 50% 47%, rgba(40,58,150,.22) 0%, rgba(12,17,50,.08) 46%, rgba(0,0,0,0) 72%); }

  /* the cold open */
  #streak { position:absolute; left:50%; top:50%; width:900px; height:10px; margin:-5px 0 0 -450px; border-radius:6px;
            background:linear-gradient(90deg, rgba(142,164,255,0), #fff 50%, rgba(142,164,255,0));
            box-shadow:0 0 40px 10px rgba(142,164,255,.7); transform-origin:50% 50%; will-change:transform,opacity; }
  #spark { position:absolute; left:50%; top:50%; width:10px; height:10px; margin:-5px 0 0 -5px; border-radius:50%;
           background:#fff; box-shadow:0 0 70px 24px rgba(142,164,255,.9); will-change:transform,opacity; }

  /* the headline: a fixed box, lines left-aligned inside it, box centred */
  #line { position:absolute; left:92px; top:772px; width:900px; text-align:left;
          font-style:italic; font-weight:800; font-size:86px; line-height:1.14; letter-spacing:-.03em; color:#fff;
          will-change:transform,opacity,filter; }
  .c { display:inline-block; visibility:hidden; will-change:filter,text-shadow; }
  #sufB { display:none; }
  #cur { position:absolute; width:6px; height:84px; border-radius:3px; background:${LIFT};
         box-shadow:0 0 22px ${LIFT}, 0 0 60px rgba(142,164,255,.6); will-change:transform,opacity; opacity:0; }

  /* activity */
  #act { position:absolute; left:74px; right:74px; top:690px; text-align:center; font-weight:700; font-size:52px;
         letter-spacing:-.02em; color:#fff; text-shadow:0 0 40px rgba(130,160,255,.45); opacity:0; will-change:opacity,filter,transform; }
  #chips { position:absolute; left:0; right:0; top:830px; display:flex; justify-content:center; gap:26px; }
  .chip { padding:26px 52px; border-radius:999px; font-weight:700; font-size:44px; letter-spacing:-.01em; color:#fff;
          border:3px solid rgba(160,180,255,.45); background:rgba(20,28,70,.35);
          box-shadow:0 0 0 0 rgba(142,164,255,0); opacity:0; will-change:opacity,filter,transform,background,color,box-shadow; }
  #hand { position:absolute; left:0; top:0; width:120px; height:120px; opacity:0; will-change:transform,opacity;
          filter:drop-shadow(0 8px 20px rgba(0,0,0,.8)); }

  /* the two i's and the mark */
  #find { position:absolute; left:74px; right:74px; top:560px; text-align:center; font-weight:700; font-size:52px;
          letter-spacing:-.02em; color:#fff; text-shadow:0 0 40px rgba(130,160,255,.45); opacity:0; will-change:opacity,filter,transform; }
  #mark { position:absolute; left:50%; top:700px; width:520px; height:520px; margin-left:-260px; overflow:visible; opacity:0;
          will-change:opacity,filter; }
  #word { position:absolute; left:0; right:0; top:1240px; text-align:center; font-family:"Instrument Serif", serif; font-style:italic;
          font-size:150px; letter-spacing:-.02em; line-height:1; color:#fff; text-shadow:0 0 50px rgba(130,160,255,.5);
          opacity:0; will-change:transform,opacity; }
  #word .a { color:${LIFT}; }
  #word .bi { display:inline-block; vertical-align:baseline; overflow:visible; }
  #url { position:absolute; left:0; right:0; top:1420px; text-align:center; font-weight:600; font-size:38px; letter-spacing:.02em;
         color:rgba(200,212,255,.72); opacity:0; will-change:transform,opacity; }
  #fade { position:absolute; inset:0; background:#000; opacity:0; }
</style></head><body><div id="stage">
  <div id="amb"></div>
  <div id="streak"></div>
  <div id="spark"></div>

  <div id="line"><span id="pre">${chars(PREFIX, "p")}</span><br><span id="sufA">${chars(SUF_A, "a")}</span><span id="sufB">${chars(SUF_B, "b")}</span></div>
  <div id="cur"></div>

  <div id="act">Choose your activity.</div>
  <div id="chips">${CHIPS.map((c, i) => `<div class="chip" id="ch${i}">${c}</div>`).join("")}</div>
  <div id="hand"><svg viewBox="0 0 24 24" width="120" height="120"><path fill="#fff" stroke="#000" stroke-width=".6" stroke-linejoin="round"
    d="M9 2.2c-.9 0-1.6.7-1.6 1.6v8.9l-1.8-1.6c-.7-.6-1.8-.6-2.4.1-.6.7-.6 1.7 0 2.3l4.6 5.2c.9 1 2.2 1.6 3.6 1.6h3.7c2.4 0 4.3-1.9 4.3-4.3v-4.6c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6v-.7c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6v-.5c0-.9-.7-1.6-1.6-1.6s-1.6.7-1.6 1.6V3.8c0-.9-.7-1.6-1.6-1.6z"/></svg></div>

  <div id="find">Find training partners.</div>
  <svg id="mark" viewBox="0 0 100 100">
    <g id="ga">
      <circle cx="28" cy="16" r="8.5" fill="#fff"/>
      <circle cx="28" cy="34" r="7" fill="#fff"/>
      <path id="pa" d="M28 34 V56 Q28 82 50 82 H51" fill="none" stroke="#fff" stroke-width="14" stroke-linecap="butt"/>
    </g>
    <g id="gb">
      <circle cx="72" cy="16" r="8.5" fill="${LIFT}"/>
      <circle cx="72" cy="34" r="7" fill="${LIFT}"/>
      <path id="pb" d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${LIFT}" stroke-width="14" stroke-linecap="butt"/>
    </g>
    <circle id="flash" cx="50" cy="82" r="10" fill="#fff" opacity="0"/>
  </svg>
  <div id="word">UN${barbellI}<span class="a">sport</span></div>
  <div id="url">getunisport.com</div>
  <div id="fade"></div>
</div>
<script>
  var T = ${JSON.stringify(T)};
  var NP = ${PREFIX.length}, NA = ${SUF_A.length}, NB = ${SUF_B.length};
  var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var outExpo = function (x) { x = cl(x); return x >= 1 ? 1 : 1 - Math.pow(2, -9 * x); };
  var outCubic = function (x) { return 1 - Math.pow(1 - cl(x), 3); };
  var inCubic = function (x) { return Math.pow(cl(x), 3); };
  var outBack = function (x) { x = cl(x); var c = 1.4; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  var $ = function (id) { return document.getElementById(id); };

  var pa = $("pa"), pb = $("pb");
  var LA = pa.getTotalLength(), LB = pb.getTotalLength();
  pa.style.strokeDasharray = LA; pb.style.strokeDasharray = LB;

  var stage = $("stage").getBoundingClientRect();

  /* centre the headline box on its widest line, measured once; the lines stay
     left-aligned inside it so typing never moves what is already there */
  (function () {
    var sb = $("sufB"); sb.style.display = "inline";
    var wB = sb.getBoundingClientRect().width;
    sb.style.display = "none";
    $("line").style.left = Math.round((${W} - wB) / 2) + "px";
    stage = $("stage").getBoundingClientRect();
  })();

  /* a character that has just appeared is white-hot and cools to plain white */
  function heat(el, shown, t) {
    if (shown === null) { el.style.visibility = "hidden"; return; }
    el.style.visibility = "visible";
    var h = 1 - cl((t - shown) / 0.55);
    el.style.textShadow = "0 0 " + (14 + 46 * h).toFixed(1) + "px rgba(142,164,255," + (0.35 + 0.65 * h).toFixed(3) + ")";
    el.style.filter = "brightness(" + (1 + 0.9 * h).toFixed(3) + ")";
  }

  window.frame = function (t) {
    /* ---- 1. streak -> point ---- */
    var sp = outExpo(t / 0.5);
    var st = $("streak");
    st.style.opacity = String(cl(t / 0.08) * (1 - cl((t - 0.3) / 0.25)));
    st.style.transform = "translate3d(" + (-420 * (1 - sp)).toFixed(1) + "px," + (560 * (1 - sp)).toFixed(1) + "px,0) rotate(-38deg) scaleX(" + (0.2 + 1.2 * (1 - sp)).toFixed(3) + ")";
    var pt = $("spark");
    pt.style.opacity = String(cl((t - 0.2) / 0.15) * (1 - cl((t - T.cursor) / 0.2)));
    pt.style.transform = "scale(" + (0.6 + 2.4 * outExpo((t - 0.2) / 0.4) * (1 - cl((t - T.cursor) / 0.2))).toFixed(3) + ")";

    /* ---- 2 + 3. the typed, edited line ---- */
    var nP = 0, nA = 0, nB = 0, shownP = [], shownA = [], shownB = [];
    var i;
    // typing A: prefix then suffix A, one schedule
    for (i = 0; i < NP; i++) { var ta = T.typeA + i / T.rateA; shownP.push(t >= ta ? ta : null); }
    for (i = 0; i < NA; i++) { var tb = T.typeA + (NP + 1 + i) / T.rateA; shownA.push(t >= tb ? tb : null); }
    // deleting A from the end
    for (i = NA - 1; i >= 0; i--) { var td = T.del + (NA - 1 - i) / T.rateDel; if (t >= td) shownA[i] = null; }
    // typing B
    var phaseB = t >= T.typeB;
    for (i = 0; i < NB; i++) { var te = T.typeB + i / T.rateB; shownB.push(phaseB && t >= te ? te : null); }
    $("sufA").style.display = phaseB ? "none" : "inline";
    $("sufB").style.display = phaseB ? "inline" : "none";
    for (i = 0; i < NP; i++) heat($("p" + i), shownP[i], t);
    for (i = 0; i < NA; i++) heat($("a" + i), shownA[i], t);
    for (i = 0; i < NB; i++) heat($("b" + i), shownB[i], t);

    // the cursor sits after the last visible character
    var last = null, anyLine2 = false;
    for (i = NB - 1; i >= 0; i--) if (shownB[i] !== null) { last = $("b" + i); anyLine2 = true; break; }
    if (!last) for (i = NA - 1; i >= 0; i--) if (shownA[i] !== null && !phaseB) { last = $("a" + i); anyLine2 = true; break; }
    if (!last) for (i = NP - 1; i >= 0; i--) if (shownP[i] !== null) { last = $("p" + i); break; }
    var cur = $("cur");
    var typingDone = t > T.typeA + (NP + 1 + NA) / T.rateA && t < T.del;
    var typingDoneB = t > T.typeB + NB / T.rateB;
    var blink = (typingDone || typingDoneB) ? (Math.floor(t * 2.6) % 2 === 0 ? 1 : 0.15) : 1;
    var curVis = cl((t - T.cursor) / 0.2) * (1 - cl((t - T.burn) / 0.25)) * blink;
    cur.style.opacity = String(curVis);
    if (t >= T.cursor) {
      var r = last ? last.getBoundingClientRect() : null;
      var line = $("line").getBoundingClientRect();
      var cx, cy;
      if (r) { cx = r.right - stage.left + 8; cy = r.top - stage.top + 8; }
      else if (t >= T.del && phaseB === false && !last) { cx = line.left - stage.left; cy = line.top - stage.top + 98 + 8; }
      else { cx = line.left - stage.left; cy = line.top - stage.top + 8; }
      // the point of light lands where the cursor will be
      var land = outExpo((t - T.cursor) / 0.25);
      cur.style.transform = "translate3d(" + cx.toFixed(1) + "px," + cy.toFixed(1) + "px,0) scaleY(" + (0.3 + 0.7 * land).toFixed(3) + ")";
    }

    // the burn
    var b = cl((t - T.burn) / 0.42);
    var ln = $("line");
    ln.style.opacity = String(1 - inCubic(b));
    ln.style.filter = "blur(" + (26 * b).toFixed(1) + "px) brightness(" + (1 + 1.8 * b).toFixed(2) + ")";
    ln.style.transform = "translate3d(" + (140 * b * b).toFixed(1) + "px,0,0) scaleX(" + (1 + 0.5 * b).toFixed(3) + ")";

    /* ---- 4. choose your activity ---- */
    var aOut = 1 - cl((t - T.actOut) / 0.32);
    var ai = outExpo((t - T.act) / 0.5);
    var act = $("act");
    act.style.opacity = String(cl((t - T.act) / 0.3) * aOut);
    act.style.filter = "blur(" + (16 * (1 - ai)).toFixed(1) + "px)";
    act.style.transform = "translate3d(0," + (30 * (1 - ai)).toFixed(1) + "px,0)";
    var picked = [t >= T.tap1, false, t >= T.tap2];
    for (i = 0; i < 3; i++) {
      var ch = $("ch" + i);
      var ci = outBack((t - T.chips - i * 0.1) / 0.5);
      var tapT = i === 0 ? T.tap1 : i === 2 ? T.tap2 : -99;
      var dip = tapT > 0 ? Math.sin(Math.PI * cl((t - tapT) / 0.22)) : 0;
      var sel = picked[i] ? outExpo((t - tapT) / 0.35) : 0;
      var dim = (t >= T.tap1 && !picked[i]) ? 0.45 : 1;
      ch.style.opacity = String(cl((t - T.chips - i * 0.1) / 0.25) * aOut * dim);
      ch.style.filter = "blur(" + (14 * (1 - cl((t - T.chips - i * 0.1) / 0.4))).toFixed(1) + "px)";
      ch.style.transform = "translate3d(0," + (60 * (1 - ci)).toFixed(1) + "px,0) scale(" + (1 - 0.1 * dip).toFixed(3) + ")";
      ch.style.background = "rgba(" + Math.round(20 + (142 - 20) * sel) + "," + Math.round(28 + (164 - 28) * sel) + "," + Math.round(70 + (255 - 70) * sel) + "," + (0.35 + 0.65 * sel).toFixed(3) + ")";
      ch.style.color = sel > 0.5 ? "#050818" : "#fff";
      var ring = tapT > 0 ? (1 - cl((t - tapT) / 0.5)) * cl((t - tapT) / 0.05) : 0;
      ch.style.boxShadow = "0 0 " + (60 * ring).toFixed(0) + "px " + (18 * ring).toFixed(0) + "px rgba(142,164,255," + (0.8 * ring).toFixed(2) + "), 0 0 " + (40 * sel).toFixed(0) + "px rgba(142,164,255," + (0.6 * sel).toFixed(2) + ")";
    }
    // the hand: drifts to Gym, taps, drifts to Cardio, taps, leaves
    var hand = $("hand");
    var c0 = $("ch0").getBoundingClientRect(), c2 = $("ch2").getBoundingClientRect();
    var g = { x: c0.left + c0.width * 0.55 - stage.left, y: c0.top + c0.height * 0.6 - stage.top };
    var k = { x: c2.left + c2.width * 0.55 - stage.left, y: c2.top + c2.height * 0.6 - stage.top };
    var hx, hy;
    if (t < T.tap1) { var m1 = outExpo((t - T.hand) / 0.6); hx = g.x + 260 * (1 - m1); hy = g.y + 420 * (1 - m1); }
    else if (t < T.tap2) { var m2 = outExpo((t - T.tap1 - 0.15) / 0.5); hx = g.x + (k.x - g.x) * m2; hy = g.y + (k.y - g.y) * m2 - 40 * Math.sin(Math.PI * m2); }
    else { var m3 = outExpo((t - T.tap2 - 0.15) / 0.5); hx = k.x + 200 * m3; hy = k.y + 300 * m3; }
    var press = Math.max(t >= T.tap1 ? Math.sin(Math.PI * cl((t - T.tap1) / 0.22)) : 0, t >= T.tap2 ? Math.sin(Math.PI * cl((t - T.tap2) / 0.22)) : 0);
    hand.style.opacity = String(cl((t - T.hand) / 0.25) * aOut);
    hand.style.transform = "translate3d(" + (hx - 30).toFixed(1) + "px," + (hy - 10).toFixed(1) + "px,0) scale(" + (1 - 0.12 * press).toFixed(3) + ")";

    /* ---- 5. two i's meet ---- */
    var fOut = 1 - cl((t - T.out) / 0.4);
    var fi = outExpo((t - T.find) / 0.5);
    var find = $("find");
    find.style.opacity = String(cl((t - T.find) / 0.3) * fOut * (1 - cl((t - T.word) / 0.35)));
    find.style.filter = "blur(" + (16 * (1 - fi)).toFixed(1) + "px)";
    find.style.transform = "translate3d(0," + (30 * (1 - fi)).toFixed(1) + "px,0)";

    var mark = $("mark");
    mark.style.opacity = String(cl((t - T.slide) / 0.2) * fOut);
    var sl = outExpo((t - T.slide) / (T.apart - T.slide + 0.15));
    var dx = 110 * (1 - sl);                       // svg units off screen
    $("ga").setAttribute("transform", "translate(" + (-dx).toFixed(2) + " 0)");
    $("gb").setAttribute("transform", "translate(" + dx.toFixed(2) + " 0)");
    // legs: the straight part is there on arrival; the curve draws to the seam
    var legOnly = 22 / LA;                          // 34..56 of the path
    var draw = legOnly + (1 - legOnly) * outCubic((t - T.join) / (T.met - T.join));
    pa.style.strokeDashoffset = (LA * (1 - draw)).toFixed(2);
    pb.style.strokeDashoffset = (LB * (1 - draw * (LB / LA) / (LB / LA))).toFixed(2);
    var fl = t >= T.met ? (1 - cl((t - T.met) / 0.55)) : 0;
    $("flash").setAttribute("opacity", String(0.95 * fl));
    $("flash").setAttribute("r", String(10 + 30 * (1 - fl) * (fl > 0 ? 1 : 0)));
    var glow = 26 + 60 * fl + 10 * Math.sin(t * 3);
    mark.style.filter = "drop-shadow(0 0 " + glow.toFixed(0) + "px rgba(142,164,255," + (0.5 + 0.5 * fl).toFixed(2) + ")) brightness(" + (1 + 0.8 * fl).toFixed(2) + ")";
    // motion blur on the slide is what tmix gives us; a little extra blur while fast
    var speed = Math.abs(1 - sl) * (t > T.slide && t < T.apart ? 1 : 0);
    mark.style.filter += " blur(" + (3 * speed).toFixed(1) + "px)";

    /* ---- 6. the wordmark ---- */
    var wP = outExpo((t - T.word) / 0.6);
    var word = $("word");
    word.style.opacity = String(cl((t - T.word) / 0.4) * fOut);
    word.style.transform = "translate3d(0," + (40 * (1 - wP)).toFixed(1) + "px,0)";
    var uP = outExpo((t - T.url) / 0.6);
    var url = $("url");
    url.style.opacity = String(cl((t - T.url) / 0.4) * fOut);
    url.style.transform = "translate3d(0," + (26 * (1 - uP)).toFixed(1) + "px,0)";

    $("amb").style.opacity = String(0.35 + 0.35 * cl((t - T.slide) / 1) + 0.4 * fl);
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
const frames = Math.round(T.end * RENDER_FPS);
if (only !== null) {
  await page.evaluate((tt) => window.frame(tt), only);
  const still = path.join(ROOT, "mockups/video/intro-still-" + only.toFixed(2) + ".png");
  await page.screenshot({ path: still, type: "png" });
  await browser.close();
  console.log("wrote " + still);
  process.exit(0);
}
for (let f = 0; f < frames; f++) {
  await page.evaluate((tt) => window.frame(tt), f / RENDER_FPS);
  await page.screenshot({ path: path.join(work, String(f).padStart(5, "0") + ".png"), type: "png" });
  if (f % 120 === 0) process.stdout.write("  frame " + f + "/" + frames + "\n");
}
await browser.close();

const out = path.join(ROOT, "mockups/video/unisport-intro.mp4");
mkdirSync(path.dirname(out), { recursive: true });

const VF = [
  "tmix=frames=2:weights=1 1",
  "fps=" + OUT_FPS,
  "split=2[a][b]",
  "[b]curves=all='0/0 0.88/0 1/1',gblur=sigma=14:steps=2[bl]",
  "[a][bl]blend=all_mode=screen:all_opacity=0.22",
  "eq=saturation=0.98:contrast=1.09",
  "noise=alls=3:allf=t",
  "vignette=PI/4.6",
].join(",");

execFileSync("ffmpeg", [
  "-y", "-framerate", String(RENDER_FPS), "-i", path.join(work, "%05d.png"),
  "-filter_complex", VF,
  "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-maxrate", "12M", "-bufsize", "24M",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", out,
], { stdio: "inherit" });

rmSync(work, { recursive: true, force: true });
console.log("\nwrote " + out + "  (" + T.end.toFixed(2) + "s)");
