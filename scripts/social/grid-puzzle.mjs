/*
  THE NINE-POST GRID: nine posts that make ONE picture on the profile, the logo.

  The owner, 2026-09-27: "we can do the thing where nine posts make one
  picture ... I would do it with the logo". The profile grid shows three
  across, and since 2025 every thumbnail there is 3:4 — so nine 1080 x 1440
  posts, three by three, are one 3240 x 4320 picture.

  The picture is the mark, in 3D: its two halves (two people, one navy and
  one blue) as two solid pieces standing off a pale wall, meeting on the
  straight seam. It is placed so the grid cuts it well:
    - each head sits in the middle of a top corner post,
    - each leg runs down its own side column,
    - the seam lands in the middle of the bottom-centre post,
    - the middle column is the inside of the U, and carries the headline,
      one line per post, so each of those three posts reads on its own:
      "Your campus." / "Your gym." / "Your people." (hero.headline).
  The thin white lines Instagram draws between posts cut the mark like a
  window; nothing depends on the posts touching.

  Each post is its own render of the SAME scene (the camera's view offset
  picks its ninth), at 2x, so the pieces meet exactly.

  POSTING ORDER. The newest post shows top-left, so post-1 is the bottom-right
  piece and post-9 the top-left one: upload post-1.png first and post-9.png
  last. After that, posts have to go up in threes or the picture shears.

  Two grounds: light (navy + blue, the app icon's colours) and dark (white +
  electric blue on black, the profile picture's).

  Run: node scripts/social/grid-puzzle.mjs [light|dark]
  Out: mockups/social/grid/<ground>/post-1..9.png, full.png, preview.png
*/
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, page, launch, shoot, camera, sharp } from "./phone3d.mjs";

const TW = 1080, TH = 1440, FW = TW * 3, FH = TH * 3;

/* the mark on its 100-unit box (mockups/logo/_icons.mjs): 49 px a unit puts
   its ink (x 21..79, y 7.5..89) in the middle of the whole picture */
const U = 49, OX = FW / 2 - 50 * U, OY = FH / 2 - 48.25 * U;   // the box's origin, in px
const DEPTH = 10;                                            // units, front to back

const GROUNDS = {
  light: {
    bg: "radial-gradient(90% 70% at 42% 38%, #f8f9fb 0%, #eceef2 60%, #e2e5ea 100%)",
    a: 0x172240, b: 0x1426b8, ink: "#141618", em: "#1f32c1", shadow: 0.2, exposure: 0.9, env: 0.55,
  },
  dark: {
    bg: "radial-gradient(90% 70% at 42% 38%, #1a1b20 0%, #0e0f12 60%, #08080a 100%)",
    a: 0xe9eaee, b: 0x3a57ee, ink: "#f4f5f7", em: "#7d8df7", shadow: 0.55, exposure: 0.82, env: 0.7,
  },
};

/* the middle column's words, one line per post, clear of the U's inside */
const WORDS = [
  { text: "Your campus.", y: 720 },
  { text: "Your gym.", y: TH + 720 },
  { text: "Your people.", y: 2 * TH + 250, em: true },
];

const cam = camera(FW, FH, 18, 3200);
const scale = U * cam.perPx;

const html = (g, col, row) => page({
  W: TW, H: TH,
  css: `
    .full { position:absolute; left:${-col * TW}px; top:${-row * TH}px; width:${FW}px; height:${FH}px; background:${g.bg}; }
    .w { position:absolute; left:${TW}px; width:${TW}px; text-align:center; font-family:"Instrument Serif", Georgia, serif;
         font-size:184px; line-height:1; letter-spacing:-.015em; color:${g.ink}; transform:translateY(-50%); }
    .w.em { font-style:italic; color:${g.em}; }`,
  body: `<div class="full">${WORDS.map((w) => `<div class="w${w.em ? " em" : ""}" style="top:${w.y}px">${w.text}</div>`).join("")}</div>`,
});

const spec = (g, col, row) => ({
  camera: cam.spec,
  viewOffset: [FW, FH, col * TW, row * TH, TW, TH],
  exposure: g.exposure, env: g.env,
  /* light from high on the left and nearly in front: the shadow drops a
     little down and right of each piece, never a slab across the next post */
  sun: { pos: [-700, 1100, 3400], soft: 44, box: 1500 },
  /* the front face sits on z = 0, where cam.at() is exact */
  objects: [{ type: "mark", a: g.a, b: g.b, pos: cam.at(50 * U + OX, 50 * U + OY, -(DEPTH / 2) * scale), scale,
    depth: DEPTH, bevel: 1.3, roughness: 0.46, clearcoat: 0.08 }],
  shadowPlanes: [{ pos: [0, 0, -DEPTH * scale - 25], opacity: g.shadow }],
});

const only = process.argv.slice(2);
const browser = await launch();
for (const [name, g] of Object.entries(GROUNDS)) {
  if (only.length && !only.includes(name)) continue;
  const dir = path.join(ROOT, "mockups/social/grid", name);
  mkdirSync(dir, { recursive: true });
  const pieces = [];
  for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) {
    const n = 9 - (row * 3 + col);                // post-1 = bottom right, post-9 = top left
    const out = path.join(dir, `post-${n}.png`);
    await shoot(browser, { W: TW, H: TH, html: html(g, col, row), spec: spec(g, col, row), out });
    pieces.push({ input: out, left: col * TW, top: row * TH, col, row });
  }
  await sharp({ create: { width: FW, height: FH, channels: 3, background: "#fff" } })
    .composite(pieces.map(({ input, left, top }) => ({ input, left, top }))).png().toFile(path.join(dir, "full.png"));
  /* how the profile shows it: three across, a thin white line between */
  const pw = 390, ph = 520, gap = 4;
  const small = await Promise.all(pieces.map(async (p) => ({
    input: await sharp(p.input).resize(pw, ph).toBuffer(), left: p.col * (pw + gap), top: p.row * (ph + gap) })));
  await sharp({ create: { width: 3 * pw + 2 * gap, height: 3 * ph + 2 * gap, channels: 3, background: "#fff" } })
    .composite(small).png().toFile(path.join(dir, "preview.png"));

  /* THE PROFILE, as someone opening it would see it: a plain sketch of the
     page (not Instagram's own drawing), the real picture and the nine posts,
     inside the 3D phone. Counts other than the nine posts are left as dashes
     and the bio as grey bars, because neither is known here. */
  const b64 = (f) => "data:image/png;base64," + readFileSync(f).toString("base64");
  const pfp = b64(path.join(ROOT, "mockups/logo/profile/pfp-d-black-electric-1080.png"));
  const tiles = pieces.map((p) => b64(p.input));
  const tab = await browser.newPage();
  await tab.setViewport({ width: 402, height: 874, deviceScaleFactor: 3 });
  await tab.setContent(`<!doctype html><html><head><style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { width:402px; height:874px; overflow:hidden; background:#fff; color:#0c0d10; font-family:"Segoe UI", system-ui, sans-serif; }
    .bar { height:52px; display:flex; align-items:center; justify-content:space-between; padding:0 16px; }
    .bar b { font-size:20px; font-weight:700; letter-spacing:-.01em; }
    .bar .ic { display:flex; gap:20px; } .bar .ic i { width:22px; height:22px; border:2px solid #0c0d10; border-radius:6px; display:block; }
    .head { display:flex; align-items:center; gap:22px; padding:6px 16px 0; }
    .av { width:86px; height:86px; border-radius:50%; display:block; }
    .st { flex:1; display:flex; justify-content:space-around; text-align:center; }
    .st b { display:block; font-size:17px; font-weight:700; } .st span { font-size:13px; color:#3a3d44; }
    .name { padding:12px 16px 0; font-size:14px; font-weight:700; }
    .bio { padding:6px 16px 0; } .bio i { display:block; height:9px; border-radius:5px; background:#e3e5e9; margin-top:7px; }
    .btns { display:flex; gap:6px; padding:16px 16px 0; } .btns span { flex:1; height:32px; border-radius:8px; background:#eef0f3; font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
    .tabs { display:flex; margin-top:18px; border-bottom:1px solid #eceef1; } .tabs span { flex:1; height:42px; display:flex; align-items:center; justify-content:center; }
    .tabs span.on { border-bottom:1.5px solid #0c0d10; } .tabs i { width:20px; height:20px; border:2px solid #9aa0a8; border-radius:4px; display:block; } .tabs .on i { border-color:#0c0d10; }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.5px; }
    .grid img { width:100%; aspect-ratio:3/4; display:block; object-fit:cover; }
  </style></head><body>
    <div class="bar"><b>unisportapp</b><span class="ic"><i></i><i></i></span></div>
    <div class="head"><img class="av" src="${pfp}"><div class="st"><div><b>9</b><span>posts</span></div><div><b>–</b><span>followers</span></div><div><b>–</b><span>following</span></div></div></div>
    <div class="name">UNIsport</div>
    <div class="bio"><i style="width:86%"></i><i style="width:58%"></i></div>
    <div class="btns"><span>Edit profile</span><span>Share profile</span></div>
    <div class="tabs"><span class="on"><i></i></span><span><i></i></span><span><i></i></span></div>
    <div class="grid">${tiles.map((t) => `<img src="${t}">`).join("")}</div>
  </body></html>`, { waitUntil: "load" });
  const screenFile = path.join(dir, "profile-screen.png");
  await tab.screenshot({ path: screenFile });
  await tab.close();
  const pc = camera(TW, TH, 22, 1100);
  await shoot(browser, { W: TW, H: TH, out: path.join(dir, "profile.png"),
    html: page({ W: TW, H: TH, css: "body{background:linear-gradient(180deg,#f7f8fa 0%,#eceef2 58%,#e1e4e9 100%)}" }),
    spec: { camera: pc.spec, sun: { pos: [-520, 760, 900], soft: 20, box: 460 },
      phones: [{ src: b64(screenFile), pos: pc.at(540, 720), rot: [2, -12, 0], scale: pc.scaleFor(1290), frame: "silver" }],
      shadowPlanes: [{ pos: [0, 0, -100], opacity: 0.2 }] } });
  console.log("  mockups/social/grid/" + name + "/  post-1..9, full, preview, profile");
}
await browser.close();
