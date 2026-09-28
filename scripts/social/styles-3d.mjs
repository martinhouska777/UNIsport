/*
  FIVE LOOKS FOR THE POSTS, each with a real 3D phone (scripts/social/phone3d.mjs).

  The owner, 2026-09-27: "give me some designs that look nice and cool, but
  also are not AI slop, are not obvious ... try different styles, like 5
  styles. Look at maybe Hevy or Strava ... use 3D". And about the arrows of the
  launch carousel: "do not say 'message', so you don't need to point there" —
  so none of these points at a button; the phone is simply shown well.

  Every look carries the SAME two slides, so the looks can be compared and
  not the words:
    A  the cover — the hero's headline and its pill (lib/landingCopy.ts)
    B  one feature — "Find your ideal training partner." and its line from
       the site's feature list, on the Why-you-match screen
  All words are the website's, verbatim. No logo, no handle.

    1 STUDIO   one phone turned in a seamless grey studio, the site's serif
    2 POSTER   the brand blue, the headline in heavy capitals, a phone
               floating over it and throwing its shadow onto the colour
    3 TUMBLE   three phones thrown in the air, each at its own angle (the way
               Ladder's App Store pictures do it)
    4 FLOOR    a flat lay: the phone on a concrete floor beside a hex
               dumbbell, the headline lying on the floor with them
    5 PAIR     two phones leaning apart from a shared foot, their frames in
               the mark's two colours (navy and blue): the logo's two people

  Run: node scripts/social/styles-3d.mjs [look ...]
  Out: mockups/social/styles/<look>-a.png, <look>-b.png, sheet.png
*/
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT, page, launch, shoot, camera, floorAt, screen, sharp } from "./phone3d.mjs";

const OUT = path.join(ROOT, "mockups/social/styles");
mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1440, M = 84;
const INK = "#141618", INK2 = "#4b4f53", BLUE = "#1f32c1";

/* the site's words (lib/landingCopy.ts) */
const COPY = {
  badge: "Free for students",                                   // hero.badge
  head: ["Your campus.", "Your gym.", "Your people."],          // hero.headline
  kickerB: "01 · Match",                                         // storyBeats S1
  headB: ["Find your ideal", "training partner."],             // studentFeatures, row 2
  subB: "Get matched with people based on your interests, hobbies, concentrations, level, language, hometown or much more.",
};

const SCR = {};
const src = (n) => (SCR[n] ??= screen(n));

const base = `
  .abs { position:absolute; }
  .mono { font-family:"Geist Mono", ui-monospace, monospace; font-weight:500; text-transform:uppercase; letter-spacing:.16em; }
  .serif { font-family:"Instrument Serif", Georgia, serif; font-weight:400; letter-spacing:-.015em; line-height:.95; }
  .serif em { font-style:italic; }
  .caps { font-weight:800; text-transform:uppercase; letter-spacing:-.035em; line-height:.84; white-space:nowrap; }
  .fitw { display:inline-block; white-space:nowrap; }
  .sub { font-weight:500; line-height:1.42; text-wrap:pretty; }
`;
const em = (t, c = BLUE) => `<em style="color:${c}">${t}</em>`;
/* a fine grain, for the concrete */
const noise = (a = 0.05) => `url("data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${a} 0'/></filter><rect width='300' height='300' filter='url(#n)'/></svg>`)}")`;

/* the kicker and a two-line serif headline, top left (or centred) */
const top = (k, a, b, { centre = false, size = 96 } = {}) => {
  const pos = centre ? "left:0;right:0;text-align:center" : `left:${M}px`;
  return `
    <div class="abs mono" style="${pos};top:94px;font-size:22px;color:${BLUE}">${k}</div>
    <div class="abs serif" style="${centre ? pos : `left:${M - 3}px`};top:136px;font-size:${size}px;color:${INK}">${a}<br>${em(b)}</div>`;
};
const headA = [COPY.badge, COPY.head[0] + " " + COPY.head[1], COPY.head[2]];
const headB = [COPY.kickerB, COPY.headB[0], COPY.headB[1]];

/* ─────────────── 1 STUDIO ─────────────── */
const studio = (slide) => {
  const cam = camera(W, H, 22, 1100);
  const bg = `body{background:linear-gradient(180deg,#f7f8fa 0%,#eceef2 58%,#e1e4e9 100%)}`;
  const sun = { pos: [-520, 760, 900], soft: 20, box: 460 };
  const wall = [{ pos: [0, 0, -100], opacity: 0.2 }];
  if (slide === "a") return {
    html: page({ W, H, css: base + bg, body: top(...headA) }),
    spec: { camera: cam.spec, sun, shadowPlanes: wall,
      phones: [{ src: src("match"), pos: cam.at(612, 884), rot: [3, -21, -1.5], scale: cam.scaleFor(1000), frame: "silver" }] },
  };
  return {
    html: page({ W, H, css: base + bg, body: top(...headB) +
      `<div class="abs sub" style="left:700px;top:1010px;width:300px;font-size:26px;color:${INK2}">${COPY.subB}</div>` }),
    spec: { camera: cam.spec, sun, shadowPlanes: wall,
      phones: [{ src: src("person"), pos: cam.at(396, 884), rot: [3, 21, 1.5], scale: cam.scaleFor(1000), frame: "silver" }] },
  };
};

/* ─────────────── 2 POSTER ─────────────── */
const poster = (slide) => {
  const cam = camera(W, H, 24, 1000);
  const bg = `body{background:${BLUE}} .caps{color:#fff}`;
  const sun = { pos: [-420, 620, 900], soft: 16, box: 460 };
  const floor = [{ pos: [0, 0, -40], opacity: 0.42, color: 0x050a3a }];
  /* each line exactly as wide as the frame, so the block is justified */
  const lines = (ls) => `<div class="abs" style="left:52px;top:60px">${ls.map((l) =>
    `<div class="caps"><span class="fitw" data-w="${W - 104}">${l}</span></div>`).join(`<div style="height:14px"></div>`)}</div>`;
  if (slide === "a") return {
    html: page({ W, H, css: base + bg, body: lines(COPY.head) +
      `<div class="abs mono" style="left:56px;bottom:60px;font-size:22px;color:rgba(255,255,255,.72)">${COPY.badge}</div>` }),
    spec: { camera: cam.spec, sun, shadowPlanes: floor,
      phones: [{ src: src("match"), pos: cam.at(640, 965, 40), rot: [-10, 20, -12], scale: cam.scaleFor(780), frame: "blue" }] },
  };
  return {
    html: page({ W, H, css: base + bg, body: lines(["Find your", "ideal training", "partner."]) +
      `<div class="abs sub" style="left:56px;bottom:58px;width:300px;font-size:24px;color:rgba(255,255,255,.82)">${COPY.subB}</div>` }),
    spec: { camera: cam.spec, sun, shadowPlanes: floor,
      phones: [{ src: src("person"), pos: cam.at(660, 990, 40), rot: [-10, -20, 11], scale: cam.scaleFor(800), frame: "blue" }] },
  };
};

/* ─────────────── 3 TUMBLE ─────────────── */
const tumble = (slide) => {
  const cam = camera(W, H, 30, 900);
  const bg = `body{background:linear-gradient(180deg,#ffffff 0%,#f1f3f6 100%)}`;
  /* light from almost straight ahead, so each phone's shadow falls close
     behind it on the wall instead of sliding off as a grey block */
  const sun = { pos: [-160, 380, 1200], soft: 26, box: 600 };
  const wall = [{ pos: [0, 0, -300], opacity: 0.1 }];
  /* each phone at its own angle, as if thrown (Ladder's App Store pictures do
     this), far enough apart that none covers another */
  const ph = (n, cx, cy, z, h, rot = [7, -28, 0]) => ({ src: src(n), frame: "silver", rot, pos: cam.at(cx, cy, z), scale: cam.scaleFor(h) });
  if (slide === "a") return {
    html: page({ W, H, css: base + bg, body: top(...headA) }),
    spec: { camera: cam.spec, sun, shadowPlanes: wall,
      phones: [ph("match", 236, 1000, 60, 600, [14, 30, 12]), ph("person", 548, 760, -80, 600, [-6, -10, -7]), ph("chat", 862, 1040, 20, 600, [16, -32, 13])] },
  };
  return {
    html: page({ W, H, css: base + bg, body: top(...headB) +
      `<div class="abs sub" style="left:${M}px;top:352px;width:500px;font-size:25px;color:${INK2}">${COPY.subB}</div>` }),
    spec: { camera: cam.spec, sun, shadowPlanes: wall,
      phones: [ph("match", 820, 800, -120, 640, [10, -30, 10]), ph("person", 430, 990, 40, 680, [-4, 20, -7])] },
  };
};

/* ─────────────── 4 FLOOR ─────────────── */
const floor = (slide) => {
  /* the camera stands south of the phone and looks down about 26 degrees
     off overhead; the floor is the z = 0 plane, placed by canvas pixel */
  const cs = { fov: 30, pos: [0, -300, 620], target: [0, 0, 0] };
  const at = (px, py) => floorAt(cs, W, H, px, py);
  const bg = `body{background:#e5e2dc ${noise(0.07)}}`;
  const sun = { pos: [-360, 420, 900], soft: 7, box: 460 };
  const shadow = [{ pos: [0, 0, 0.2], opacity: 0.36, color: 0x14110c }];
  const serif = (px) => `400 ${px}px 'Instrument Serif'`, italic = (px) => `italic 400 ${px}px 'Instrument Serif'`;
  /* the words lie in a band across the bottom, as wide as the frame there */
  const words = (k, a, b) => {
    const l = at(M, 1300), r = at(W - M, 1300), c = at(W / 2, 1200);
    return { type: "paint", w: r[0] - l[0], pos: [c[0], c[1], 0.1], cw: 2048, ch: 620, lines: [
      { text: k.toUpperCase(), font: "500 50px 'Geist Mono'", color: BLUE, x: 6, y: 70, track: "8px" },
      { text: a, font: serif(206), color: INK, x: 0, y: 290 },
      { text: b, font: italic(206), color: BLUE, x: 0, y: 480 } ] };
  };
  /* a hex dumbbell rests on one of its flats, 0.866 of its radius up */
  const bell = (px, py, deg) => { const p = at(px, py); return { type: "dumbbell", kg: 8, scale: 0.78, pos: [p[0], p[1], 0.866 * (52 + 12.8) * 0.78], rot: [0, 0, deg], order: "XYZ" }; };
  const ph = (n, px, py, deg) => { const p = at(px, py); return { src: src(n), pos: [p[0], p[1], 4.15], rot: [0, 0, deg], order: "XYZ", frame: "black", glare: 0.07 }; };
  if (slide === "a") return {
    html: page({ W, H, css: base + bg }),
    spec: { camera: cs, sun, shadowPlanes: shadow,
      phones: [ph("match", 470, 560, 6)],
      objects: [bell(1010, 560, 84), words(...headA)] },
  };
  return {
    html: page({ W, H, css: base + bg }),
    spec: { camera: cs, sun, shadowPlanes: shadow,
      phones: [ph("person", 610, 560, -6)],
      objects: [bell(70, 560, 96), words(...headB)] },
  };
};

/* ─────────────── 5 PAIR ─────────────── */
const pair = (slide) => {
  const cam = camera(W, H, 22, 1100);
  const bg = `body{background:linear-gradient(180deg,#ffffff 0%,#ffffff 60%,#eef0f4 100%)}`;
  const sun = { pos: [0, 760, 900], soft: 18, box: 480 };
  const wall = [{ pos: [0, 0, -120], opacity: 0.16 }];
  /* the two lean apart from a shared foot, like the mark's two halves */
  const two = (l, r) => [
    { src: src(l), frame: "navy", rot: [2, 18, 4], pos: cam.at(334, 930), scale: cam.scaleFor(830) },
    { src: src(r), frame: "blue", rot: [2, -18, -4], pos: cam.at(746, 930), scale: cam.scaleFor(830) },
  ];
  if (slide === "a") return {
    html: page({ W, H, css: base + bg, body: top(...headA, { centre: true }) }),
    spec: { camera: cam.spec, sun, shadowPlanes: wall, phones: two("match", "chat") },
  };
  return {
    html: page({ W, H, css: base + bg, body: top(...headB, { centre: true }) }),
    spec: { camera: cam.spec, sun, shadowPlanes: wall, phones: two("match", "person") },
  };
};

const LOOKS = { studio, poster, tumble, floor, pair };

const only = process.argv.slice(2);
const browser = await launch();
for (const [name, build] of Object.entries(LOOKS)) {
  if (only.length && !only.includes(name)) continue;
  for (const slide of ["a", "b"]) {
    const { html, spec } = build(slide);
    const out = path.join(OUT, `${name}-${slide}.png`);
    await shoot(browser, { W, H, html, spec, out });
    console.log("  " + path.relative(ROOT, out));
  }
}
await browser.close();

/* the contact sheet: one look per row, A then B */
if (!only.length) {
  const tw = 540, th = 720, gap = 24;
  const names = Object.keys(LOOKS);
  const tiles = [];
  for (const [r, n] of names.entries()) for (const [c, s] of ["a", "b"].entries())
    tiles.push({ input: await sharp(path.join(OUT, `${n}-${s}.png`)).resize(tw, th).toBuffer(), left: gap + c * (tw + gap), top: gap + r * (th + gap) });
  await sharp({ create: { width: 2 * tw + 3 * gap, height: names.length * (th + gap) + gap, channels: 3, background: "#d7d9dd" } })
    .composite(tiles).png().toFile(path.join(OUT, "sheet.png"));
  console.log("  mockups/social/styles/sheet.png");
}
