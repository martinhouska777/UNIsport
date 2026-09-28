/*
  A REAL 3D PHONE for the Instagram posts, drawn by three.js in headless Chrome.

  The owner, 2026-09-27: "use 3D and stuff like that". The flat phone of the
  carousels (launch-carousel.mjs, the website's Phone.tsx) is a drawing; this
  one is a modelled device that can turn, lie down and throw a shadow:

  - a titanium body (a rounded slab with a rounded edge) with its buttons,
  - black glass on the front,
  - the SCREEN: the website's phone screen, so the same status row (9:41, the
    island, 5G), the app's capture WHOLE, then the gesture row. It glows by
    itself and is exempt from tone mapping, so the app's colours come out
    exactly as captured. The glass over it still catches the studio's light.

  A post is a page: CSS draws the ground and the words, a transparent WebGL
  canvas draws the phones (and their shadows) between them. Everything is laid
  out in pixels of the 1080 x 1440 post: `place()` turns "a phone this tall,
  centred here" into world units for the camera, so a layout reads like the
  flat carousels do.

  Chrome renders WebGL on this machine's GPU (Intel, D3D11, 8x MSAA). The page
  is shot at 2x and scaled down, which smooths every edge a second time.
  three.js comes from jsDelivr, pinned, so the repo gains no dependency.

  Used by scripts/social/styles-3d.mjs and scripts/social/grid-puzzle.mjs.
*/
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
const puppeteer = require("puppeteer-core");
const sharp = require("sharp");

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
export const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
export { sharp };

const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.180.0";

export const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,400..800;1,400..800&family=Geist+Mono:wght@400..600&display=block" rel="stylesheet">`;

/* a capture from mockups/social/screens/light, as a data URL */
export const screen = (name, dir = "mockups/social/screens/light") =>
  "data:image/png;base64," + readFileSync(path.join(ROOT, dir, name + ".png")).toString("base64");

/* THE DEVICE in millimetres. The screen is the website's (Phone.tsx): a status
   row of 0.1234 of its width above the capture, a gesture row of 0.0706
   below, so it is taller than an iPhone by the status row. Corners are
   concentric: body radius = screen radius + the black border. */
export const DEVICE = (() => {
  const sw = 66, capAspect = 2622 / 1206;
  const status = 0.1234 * sw, gesture = 0.0706 * sw;
  const sh = status + sw * capAspect + gesture;
  const border = 2.35;
  return { sw, sh, status, gesture, capAspect, border, bw: sw + 2 * border, bh: sh + 2 * border, bd: 8.25, sr: 8.6, br: 8.6 + border };
})();

/* the in-page renderer: window.render3d(spec) builds the scene, draws one
   frame and resolves when it is on the canvas */
const PAGE_JS = `
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const D = ${JSON.stringify(DEVICE)};
const rad = (d) => d * Math.PI / 180;

function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x1 - r, y0);
  s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false); s.lineTo(x1, y1 - r);
  s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false); s.lineTo(x0 + r, y1);
  s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false); s.lineTo(x0, y0 + r);
  s.absarc(x0 + r, y0 + r, r, Math.PI, 1.5 * Math.PI, false);
  return s;
}

/* the website's phone screen, drawn at the capture's own width */
async function display(src) {
  const img = new Image(); img.src = src; await img.decode();
  const W = img.naturalWidth, k = W / D.sw;
  const st = Math.round(D.status * k), ge = Math.round(D.gesture * k), capH = Math.round(W * img.naturalHeight / img.naturalWidth);
  const c = document.createElement("canvas"); c.width = W; c.height = st + capH + ge;
  const g = c.getContext("2d");
  g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
  g.drawImage(img, 0, st, W, capH);
  const cq = W / 94.44;                       /* Phone.tsx's cqw, in capture px */
  g.fillStyle = "#16150f"; g.textBaseline = "middle";
  g.font = "500 " + (3.33 * cq) + "px 'Geist Mono'";
  const mid = 3.33 * cq + 6.1 * cq / 2;
  g.fillText("9:41", 6.11 * cq + 1.6 * cq, mid);
  g.fillStyle = "#9b968c"; g.font = "500 " + (3.06 * cq) + "px 'Geist Mono'";
  const t = "5G"; g.fillText(t, W - 6.11 * cq - 1.6 * cq - g.measureText(t).width, mid);
  const iw = 23.3 * cq, ih = 6.1 * cq;                       /* the island */
  g.fillStyle = "#0b0b0c"; g.beginPath(); g.roundRect((W - iw) / 2, 3.33 * cq, iw, ih, ih / 2); g.fill();
  g.fillStyle = "#cfccc6"; const bw = W * 0.38, bh = 1.1 * cq;   /* the home bar */
  g.beginPath(); g.roundRect((W - bw) / 2, st + capH + (ge - bh) / 2, bw, bh, bh / 2); g.fill();
  return c;
}

const FRAMES = {
  silver:  { color: 0xd9dadc, roughness: 0.26 },
  natural: { color: 0xb9b4aa, roughness: 0.28 },
  black:   { color: 0x303033, roughness: 0.3 },
  clay:    { color: 0xf2f2f0, roughness: 0.55, metalness: 0.0 },
  navy:    { color: 0x3b4861, roughness: 0.3 },     /* the mark's two people, as anodised metal */
  blue:    { color: 0x3044cc, roughness: 0.3 },
};

/* What the screen's glass reflects: a soft sky over a dark floor, never the
   studio's light boxes. Those would blow a screen that faces them out to
   white; this caps the glare at 'glare' of white, so the app stays legible. */
let SCREEN_ENV = null;
function screenEnv(renderer) {
  if (SCREEN_ENV) return SCREEN_ENV;
  const c = document.createElement("canvas"); c.width = 512; c.height = 256;
  const g = c.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.42, "#a4a9b2"); gr.addColorStop(0.52, "#30333a"); gr.addColorStop(1, "#0c0d10");
  g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace;
  SCREEN_ENV = new THREE.PMREMGenerator(renderer).fromEquirectangular(t).texture;
  return SCREEN_ENV;
}

async function phone(renderer, p) {
  const f = FRAMES[p.frame || "silver"];
  const frameMat = new THREE.MeshPhysicalMaterial({ color: f.color, metalness: f.metalness ?? 1, roughness: f.roughness, clearcoat: 0.2, clearcoatRoughness: 0.2 });
  const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x040405, metalness: 0, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03 });
  const group = new THREE.Group();

  const bevT = 1.25, bevS = 1.1;
  const body = new THREE.ExtrudeGeometry(roundedRect(D.bw - 2 * bevS, D.bh - 2 * bevS, D.br - bevS),
    { depth: D.bd - 2 * bevT, bevelEnabled: true, bevelThickness: bevT, bevelSize: bevS, bevelSegments: 10, curveSegments: 72 });
  body.translate(0, 0, -(D.bd - 2 * bevT) / 2);
  const bodyMesh = new THREE.Mesh(body, [glassMat, frameMat]);
  bodyMesh.castShadow = true; bodyMesh.receiveShadow = false;
  group.add(bodyMesh);

  /* the buttons: action + volume on the left, side button + camera control on the right */
  const btn = (x, yTop, len) => {
    const g = new THREE.CapsuleGeometry(0.62, len - 1.24, 6, 18);
    const m = new THREE.Mesh(g, frameMat);
    m.scale.set(0.9, 1, 1.25);
    m.position.set(x, D.bh / 2 - yTop - len / 2, 0);
    m.castShadow = true; group.add(m);
  };
  const L = -D.bw / 2 - 0.12, R = D.bw / 2 + 0.12, u = D.bw / 100;
  btn(L, 26 * u, 7 * u); btn(L, 40 * u, 11 * u); btn(L, 54 * u, 11 * u);
  btn(R, 44 * u, 17 * u); btn(R, 112 * u, 10 * u);

  const can = await display(p.src);
  const tex = new THREE.CanvasTexture(can);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const sg = new THREE.ShapeGeometry(roundedRect(D.sw, D.sh, D.sr), 72);
  const pos = sg.attributes.position, uv = sg.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / D.sw + 0.5, pos.getY(i) / D.sh + 0.5);
  const scrMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, roughness: 0.05, metalness: 0,
    toneMapped: false, envMap: screenEnv(renderer), envMapIntensity: p.glare ?? 0.2 });
  const scr = new THREE.Mesh(sg, scrMat);
  scr.position.z = D.bd / 2 + 0.03;
  group.add(scr);

  const s = p.scale ?? 1;
  group.scale.setScalar(s);
  group.rotation.set(rad(p.rot?.[0] || 0), rad(p.rot?.[1] || 0), rad(p.rot?.[2] || 0), p.order || "YXZ");
  group.position.set(...(p.pos || [0, 0, 0]));
  return group;
}

/* THE MARK in 3D: the logo's two halves (mockups/logo/_icons.mjs, a 100-unit
   box) as two solid pieces. Each half is one closed outline, the stroke's
   centre line offset by 7 either side; the halves meet on the straight seam
   at x = 50. P() turns the SVG's y-down box into y-up units centred on it. */
function markShapes() {
  const P = (x, y) => [x - 50, 50 - y];
  const half = (m) => {           // m = 1 left person, -1 right (mirrored)
    const X = ([x, y]) => [x * m, y];
    const s = new THREE.Shape();
    const a = X(P(21, 34)), ctrlIn = X(P(35, 75)), endIn = X(P(50, 75)), seamB = X(P(50, 89)), ctrlOut = X(P(21, 89)), outB = X(P(21, 56));
    s.moveTo(...a);
    const c = X(P(28, 34));
    s.absarc(c[0], c[1], 7, m > 0 ? Math.PI : 0, m > 0 ? 0 : Math.PI, m > 0);
    s.lineTo(...X(P(35, 56)));
    s.quadraticCurveTo(...ctrlIn, ...endIn);
    s.lineTo(...seamB);
    s.quadraticCurveTo(...ctrlOut, ...outB);
    s.lineTo(...a);
    const h = new THREE.Shape(); const hc = X(P(28, 16));
    h.absarc(hc[0], hc[1], 8.5, 0, Math.PI * 2, false);
    return [s, h];
  };
  return { left: half(1), right: half(-1) };
}
function mark(o) {
  const g = new THREE.Group();
  const depth = o.depth ?? 12, bev = o.bevel ?? 1.6;
  const opts = { depth: depth - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelOffset: -bev, bevelSegments: 12, curveSegments: 96 };
  const mat = (c) => new THREE.MeshPhysicalMaterial({ color: c, roughness: o.roughness ?? 0.32, metalness: o.metalness ?? 0, clearcoat: o.clearcoat ?? 0.6, clearcoatRoughness: 0.18 });
  const { left, right } = markShapes();
  for (const [shapes, colour] of [[left, o.a], [right, o.b]]) {
    const geo = new THREE.ExtrudeGeometry(shapes, opts);
    geo.translate(0, 0, -(depth - 2 * bev) / 2);
    const m = new THREE.Mesh(geo, mat(colour));
    m.castShadow = true; m.receiveShadow = true; g.add(m);
  }
  return g;
}

/* A HEX DUMBBELL, the gym's own object: rubber hex heads, a chrome handle.
   Built along x, in millimetres; kg only sets the size of the heads. */
function dumbbell(o) {
  const g = new THREE.Group();
  const kg = o.kg ?? 10;
  const r = 52 + kg * 1.6, headL = 58 + kg * 1.8, handleL = 128, hr = 16;
  const rubber = new THREE.MeshPhysicalMaterial({ color: o.color ?? 0x1c1d20, roughness: 0.62, metalness: 0, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.3 });
  const chrome = new THREE.MeshPhysicalMaterial({ color: 0xe8e8ea, roughness: 0.16, metalness: 1 });
  /* a hex prism with softened edges: a 6-sided extrude with a small bevel */
  const hex = new THREE.Shape();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; const p = [Math.cos(a) * r, Math.sin(a) * r]; i ? hex.lineTo(...p) : hex.moveTo(...p); }
  hex.closePath();
  const hg = new THREE.ExtrudeGeometry(hex, { depth: headL - 8, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelOffset: -4, bevelSegments: 5 });
  hg.translate(0, 0, -(headL - 8) / 2); hg.rotateY(Math.PI / 2);
  for (const s of [-1, 1]) {
    const h = new THREE.Mesh(hg, rubber); h.position.x = s * (handleL / 2 + headL / 2); h.castShadow = h.receiveShadow = true; g.add(h);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(hr + 7, hr + 7, 12, 48), chrome);
    collar.rotation.z = Math.PI / 2; collar.position.x = s * (handleL / 2 - 6); collar.castShadow = true; g.add(collar);
  }
  /* the handle, knurled: fine grooves drawn into a bump texture */
  const kc = document.createElement("canvas"); kc.width = 512; kc.height = 64;
  const kx = kc.getContext("2d"); kx.fillStyle = "#808080"; kx.fillRect(0, 0, 512, 64);
  kx.strokeStyle = "#303030"; kx.lineWidth = 2;
  for (let i = -64; i < 576; i += 8) { kx.beginPath(); kx.moveTo(i, 0); kx.lineTo(i + 64, 64); kx.stroke(); kx.beginPath(); kx.moveTo(i + 64, 0); kx.lineTo(i, 64); kx.stroke(); }
  const kt = new THREE.CanvasTexture(kc); kt.wrapS = kt.wrapT = THREE.RepeatWrapping; kt.repeat.set(3, 1);
  const knurl = chrome.clone(); knurl.bumpMap = kt; knurl.bumpScale = 1.4; knurl.roughness = 0.3;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(hr, hr, handleL - 24, 64), knurl);
  handle.rotation.z = Math.PI / 2; handle.castShadow = true; g.add(handle);
  return g;
}

/* WORDS ON A SURFACE: a transparent plane with the lines drawn on it, so a
   headline can lie on the floor with the phone and foreshorten like it.
   Unlit, so its colours are the page's; a shadow plane drawn after it still
   darkens it where the phone's shadow falls. */
async function paint(o) {
  const cw = o.cw ?? 2048, ch = o.ch ?? 1024;
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const g = c.getContext("2d");
  for (const l of o.lines) {
    await document.fonts.load(l.font);
    g.font = l.font; g.fillStyle = l.color; g.textAlign = l.align ?? "left";
    if (l.track) g.letterSpacing = l.track;
    g.fillText(l.text, l.x ?? 0, l.y);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w, o.w * ch / cw),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, toneMapped: false, depthWrite: false }));
  m.renderOrder = 1;
  return m;
}

function place(obj, o) {
  obj.scale.setScalar(o.scale ?? 1);
  obj.rotation.set(rad(o.rot?.[0] || 0), rad(o.rot?.[1] || 0), rad(o.rot?.[2] || 0), o.order || "YXZ");
  obj.position.set(...(o.pos || [0, 0, 0]));
  return obj;
}

window.render3d = async (spec) => {
  await document.fonts.ready;
  await document.fonts.load("500 40px 'Geist Mono'");
  const W = spec.W, H = spec.H;
  const canvas = document.getElementById("gl");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(W, H, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = spec.exposure ?? 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = spec.env ?? 1;

  const cam = new THREE.PerspectiveCamera(spec.camera.fov, W / H, 10, 20000);
  cam.position.set(...spec.camera.pos);
  cam.up.set(...(spec.camera.up || [0, 1, 0]));
  cam.lookAt(...(spec.camera.target || [0, 0, 0]));

  const sun = new THREE.DirectionalLight(0xffffff, spec.sun?.intensity ?? 1.4);
  sun.position.set(...(spec.sun?.pos || [-300, 500, 700]));
  sun.target.position.set(...(spec.sun?.target || [0, 0, 0]));
  scene.add(sun, sun.target);
  sun.castShadow = true;
  const sb = spec.sun?.box ?? 400;
  Object.assign(sun.shadow.camera, { left: -sb, right: sb, top: sb, bottom: -sb, near: 1, far: spec.sun?.far ?? 12000 });
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.radius = spec.sun?.soft ?? 14;
  sun.shadow.blurSamples = 25;
  sun.shadow.bias = -0.0004;
  scene.add(new THREE.AmbientLight(0xffffff, spec.ambient ?? 0.25));

  for (const pl of spec.shadowPlanes || []) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(pl.size?.[0] ?? 4000, pl.size?.[1] ?? 4000),
      new THREE.ShadowMaterial({ opacity: pl.opacity ?? 0.22, color: pl.color ?? 0x0a1030 }));
    m.position.set(...pl.pos);
    m.rotation.set(rad(pl.rot?.[0] || 0), rad(pl.rot?.[1] || 0), rad(pl.rot?.[2] || 0));
    m.receiveShadow = true; m.renderOrder = 2; scene.add(m);
  }
  for (const p of spec.phones || []) scene.add(await phone(renderer, p));
  for (const o of spec.objects || []) {
    if (o.type === "mark") scene.add(place(mark(o), o));
    if (o.type === "dumbbell") scene.add(place(dumbbell(o), o));
    if (o.type === "paint") scene.add(place(await paint(o), { ...o, scale: 1 }));
  }
  if (spec.viewOffset) cam.setViewOffset(...spec.viewOffset);

  renderer.render(scene, cam);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return true;
};
window.__ready = true;
`;

/* the camera looks at the origin down -z; `place` puts a thing whose centre is
   at canvas pixel (cx, cy) on the z = 0 plane, `px` tall on the canvas */
export const camera = (W, H, fov = 22, dist = 900) => {
  const perPx = (2 * dist * Math.tan((fov * Math.PI) / 360)) / H;   // mm per canvas px at z = 0
  return {
    fov, dist, perPx,
    spec: { fov, pos: [0, 0, dist], target: [0, 0, 0] },
    at: (cx, cy, z = 0) => [(cx - W / 2) * perPx, (H / 2 - cy) * perPx, z],
    scaleFor: (px) => (px * perPx) / DEVICE.bh,
  };
};

/* for a camera that looks DOWN at the floor (the z = 0 plane): where the ray
   through canvas pixel (px, py) meets the floor, in world units */
export const floorAt = (cam, W, H, px, py) => {
  const sub = (a, b) => a.map((v, i) => v - b[i]), add = (a, b) => a.map((v, i) => v + b[i]);
  const mul = (a, k) => a.map((v) => v * k), norm = (a) => mul(a, 1 / Math.hypot(...a));
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const f = norm(sub(cam.target || [0, 0, 0], cam.pos)), r = norm(cross(f, cam.up || [0, 1, 0])), u = cross(r, f);
  const ty = Math.tan((cam.fov * Math.PI) / 360), tx = ty * W / H;
  const x = (px / W) * 2 - 1, y = 1 - (py / H) * 2;
  const d = add(f, add(mul(r, x * tx), mul(u, y * ty)));
  const t = -cam.pos[2] / d[2];
  return add(cam.pos, mul(d, t));
};

export const page = ({ W, H, css = "", body = "", scripts = "" }) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}
<script type="importmap">{"imports":{"three":"${THREE_URL}/build/three.module.js","three/addons/":"${THREE_URL}/examples/jsm/"}}</script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { position:relative; font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  #gl { position:absolute; left:0; top:0; width:${W}px; height:${H}px; z-index:2; }
  ${css}
</style></head><body>${body}<canvas id="gl"></canvas>
<script type="module">${PAGE_JS}</script>${scripts}</body></html>`;

export async function launch() {
  return puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-first-run", "--hide-scrollbars"] });
}

/* shoot one post: the page at 2x, then down to its own size */
export async function shoot(browser, { W, H, html, spec, out, dpr = 2 }) {
  const tab = await browser.newPage();
  await tab.setViewport({ width: W, height: H, deviceScaleFactor: dpr });
  tab.on("pageerror", (e) => console.log("  page error:", e.message));
  await tab.setContent(html, { waitUntil: "networkidle0", timeout: 90000 });
  await tab.waitForFunction("window.__ready === true", { timeout: 60000 });
  /* .fitw lines grow or shrink until they are exactly data-w wide */
  await tab.evaluate(async () => {
    await document.fonts.ready;
    for (const el of document.querySelectorAll(".fitw")) {
      const want = +el.dataset.w;
      for (let i = 0; i < 4; i++) {
        const fs = parseFloat(getComputedStyle(el).fontSize);
        el.style.fontSize = (fs * want / el.getBoundingClientRect().width) + "px";
      }
    }
  });
  await tab.evaluate((s) => window.render3d(s), { W, H, ...spec });
  const png = await tab.screenshot({ type: "png" });
  await tab.close();
  const img = sharp(png);
  await (dpr === 1 ? img : img.resize(W, H, { kernel: "lanczos3" })).png().toFile(out);
  return out;
}
