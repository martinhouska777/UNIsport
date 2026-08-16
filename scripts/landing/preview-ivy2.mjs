// Round 3: LIGHT mode — the app's own themeLight neutrals under each school's
// hues (Harvard red-on-white, Princeton black+orange on white, and the navy
// schools finally legible). Oars get black handles and the blade is re-traced
// from the poster: thin throat, straight top edge, tall rounded tip, deep
// bellied bottom curve.
import fs from "fs";
import puppeteer from "puppeteer-core";

// themeLight neutrals from lib/themes.ts.
const T = { bg: "#f6f6f7", surface: "#ffffff", surface2: "#edeef0", border: "#e0e1e5", text: "#15151a", muted: "#4e5462" };

// p = brand fill · ink = text-safe accent on white · s = secondary
const IVIES = [
  { n: "Harvard",   p: "#a51c30", ink: "#a51c30", s: "#9a751c", gyms: [["Malkin Athletic Center", "4.8 · 6am–11pm · 3 floors"], ["Hemenway Gymnasium", "4.4 · 6am–10pm · 2 floors"]] },
  { n: "Yale",      p: "#00356b", ink: "#00356b", s: "#286dc0", gyms: [["Payne Whitney Gymnasium", "4.7 · 6am–11pm · 9 floors"], ["Israel Fitness Center", "4.5 · 6am–10pm · PWG 5th fl"]] },
  { n: "Princeton", p: "#e77500", ink: "#c96500", s: "#15151a", gyms: [["Dillon Gymnasium", "4.6 · 6am–11pm · 2 floors"], ["Stephens Fitness Center", "4.7 · 6am–11pm · in Dillon"]] },
  { n: "Penn",      p: "#011f5b", ink: "#011f5b", s: "#990000", gyms: [["Pottruck Fitness Center", "4.6 · 6am–11pm · 4 floors"], ["Fox Fitness Center", "4.3 · 7am–10pm · 1 floor"]] },
  { n: "Brown",     p: "#4e3629", ink: "#4e3629", s: "#c00404", gyms: [["Nelson Fitness Center", "4.7 · 6am–11pm · 2 floors"], ["Olney-Margolies Center", "4.4 · 6am–10pm · 2 floors"]] },
  { n: "Columbia",  p: "#6cace4", ink: "#1d64ab", s: "#15315e", gyms: [["Dodge Fitness Center", "4.4 · 6am–11pm · 4 floors"], ["Levien Gymnasium", "4.3 · 7am–10pm · in Dodge"]] },
  { n: "Cornell",   p: "#b31b1b", ink: "#b31b1b", s: "#15151a", gyms: [["Helen Newman Fitness", "4.5 · 6am–11pm · 2 floors"], ["Noyes Fitness Center", "4.4 · 7am–11pm · 1 floor"]] },
  { n: "Dartmouth", p: "#00693e", ink: "#00693e", s: "#15151a", gyms: [["Alumni Gymnasium", "4.6 · 6am–11pm · 2 floors"], ["Zimmerman Fitness Center", "4.5 · 6am–10pm · in Alumni"]] },
];

/* ── The oar, re-traced from the poster ────────────────────────────────────
   Thin throat at the collar; top edge runs almost straight to a tall rounded
   tip; the bottom edge bellies downward and sweeps back up to the throat. */
const BLADE = "M270,30 L398,8 Q412,5.5 412.5,17 L412,58 Q412,70 399,68.5 C355,64 300,50 270,40 Z";

function oarSVG(club, idx, w = 430) {
  const clip = "iv" + idx;
  const kind = { Harvard: "flame", Yale: "band", Princeton: "diag", Penn: "chevTip", Brown: "topband", Columbia: "diagBlue", Cornell: "bumps", Dartmouth: "solid" }[club.n];
  let base = "#f5f3ef", overlay = "";
  if (kind === "flame")    { base = "#a51c30"; overlay = `<polygon points="413,26 413,70 340,70 402,44" fill="#f5f3ef"/>`; }
  if (kind === "band")     { base = "#f5f3ef"; overlay = `<polygon points="270,40 412,44 412,70 300,52" fill="#00356b"/>`; }
  if (kind === "diag")     { base = "#e77500"; overlay = `<polygon points="270,30 398,8 306,52 270,40" fill="#1a1a1a"/>`; }
  if (kind === "chevTip")  { base = "#011f5b"; overlay = `<polygon points="413,8 413,68 342,36" fill="#c50f1f"/>`; }
  if (kind === "topband")  { base = "#f5f3ef"; overlay = `<polygon points="270,30 398,8 412,10 412,36 270,41" fill="#4e3629"/>`; }
  if (kind === "diagBlue") { base = "#f5f3ef"; overlay = `<polygon points="270,30 390,9 328,64 282,45" fill="#6cace4"/>`; }
  if (kind === "bumps")    { base = "#f5f3ef"; overlay = `<circle cx="413" cy="24" r="17" fill="#e21833"/><circle cx="413" cy="54" r="17" fill="#e21833"/>`; }
  if (kind === "solid")    { base = "#00693e"; }
  return `<svg viewBox="0 0 436 78" width="${w}" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="${BLADE}"/></clipPath></defs>
    <!-- handle (black) · shaft · collar -->
    <rect x="18" y="33.5" width="40" height="11" rx="5.5" fill="#141414"/>
    <rect x="52" y="35.5" width="218" height="7" rx="3.5" fill="#efece7" stroke="#c9c5bd" stroke-width="1"/>
    <path d="${BLADE}" fill="${base}"/>
    <g clip-path="url(#${clip})">${overlay}</g>
    <path d="${BLADE}" fill="none" stroke="rgba(0,0,0,0.45)" stroke-width="1.2"/>
    <rect x="259" y="29" width="14" height="20" rx="3" fill="#101010"/>
  </svg>`;
}

/* ── Sheets ── */
const css = `
  * { margin:0; box-sizing:border-box; }
  body { background:${T.bg}; color:${T.text}; font-family:-apple-system,"Segoe UI",Roboto,sans-serif; padding:34px; }
  h2 { font-family:Georgia,serif; font-weight:400; font-size:30px; margin-bottom:6px; }
  .lede { color:${T.muted}; font-size:14px; margin-bottom:24px; max-width:72ch; }
  .oars { display:grid; grid-template-columns:1fr 1fr; gap:16px 36px; }
  .oar { display:flex; flex-direction:column; gap:5px; background:${T.surface}; border:1px solid ${T.border}; border-radius:14px; padding:18px 20px 12px; }
  .oar b { font-size:13px; }
  .grid8 { display:grid; grid-template-columns:repeat(4,1fr); gap:26px 18px; }
  .unit { display:flex; flex-direction:column; align-items:center; gap:8px; }
  .cap { font-family:ui-monospace,monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; }
  .phone { width:100%; max-width:232px; border:1px solid #d5d6da; background:#e9e9ec; border-radius:34px; padding:8px; box-shadow:0 10px 30px rgba(0,0,0,0.10); }
  .screen { border-radius:27px; overflow:hidden; background:${T.bg}; }
  .sb { display:flex; justify-content:space-between; align-items:center; padding:9px 16px 6px; font-family:ui-monospace,monospace; font-size:10px; color:${T.text}; }
  .sb em { font-style:normal; color:#9aa0ab; font-size:9px; }
  .island { width:66px; height:17px; border-radius:999px; background:#0c0c0d; }
  .hb { height:19px; display:flex; align-items:center; justify-content:center; background:${T.bg}; }
  .hb i { width:38%; height:3px; border-radius:999px; background:#1c1c1f; }
  .mock { aspect-ratio:900/1050; background:${T.bg}; padding:11px; display:flex; flex-direction:column; gap:8px; }

  .vt { display:flex; align-items:center; gap:6px; font-family:ui-monospace,monospace; font-size:7.5px; letter-spacing:.1em; font-weight:600; }
  .vt i { width:5px; height:5px; border-radius:50%; }
  .vt em { margin-left:auto; font-style:normal; color:#9aa0ab; }
  .day { font-family:ui-monospace,monospace; font-size:7px; letter-spacing:.12em; color:${T.muted}; text-transform:uppercase; }
  .who { font-family:Georgia,serif; font-size:19px; margin-top:1px; }
  .blk { font-family:ui-monospace,monospace; font-size:6.5px; letter-spacing:.1em; text-transform:uppercase; margin-top:2px; font-weight:600; }
  .wk { display:flex; gap:3px; margin-top:2px; }
  .wk b { flex:1; border-radius:4px; background:${T.surface}; border:1px solid ${T.border}; height:34px; display:flex; flex-direction:column; gap:2px; padding:3px; }
  .wk b i { display:block; height:5px; border-radius:2px; background:${T.surface2}; }
  .race { display:flex; align-items:center; justify-content:space-between; border-radius:10px; padding:9px 11px; }
  .race-n { font-size:10.5px; font-weight:600; }
  .race-d { font-size:8.5px; color:${T.muted}; margin-top:1px; }
  .cnt { text-align:right; }
  .cnt strong { font-size:20px; }
  .cnt span { display:block; font-family:ui-monospace,monospace; font-size:7px; letter-spacing:.12em; text-transform:uppercase; }
  .note { font-family:ui-monospace,monospace; font-size:7px; letter-spacing:.09em; text-transform:uppercase; border-radius:7px; padding:7px 9px; }

  .gt { font-family:Georgia,serif; font-size:19px; }
  .gsub { font-size:8px; margin-top:1px; font-weight:600; }
  .pills { display:flex; gap:4px; margin-top:2px; }
  .pills b { font-size:7.5px; padding:3px 8px; border-radius:999px; border:1px solid ${T.border}; color:${T.muted}; font-weight:500; background:${T.surface}; }
  .card { border:1px solid ${T.border}; border-radius:9px; overflow:hidden; background:${T.surface}; box-shadow:0 1px 3px rgba(0,0,0,0.05); }
  .photo { height:34px; position:relative; }
  .chip { position:absolute; top:5px; left:5px; font-family:ui-monospace,monospace; font-size:6px; letter-spacing:.1em; padding:2px 5px; border-radius:4px; background:rgba(255,255,255,.85); color:#333; font-weight:600; }
  .body { padding:6px 8px; display:flex; align-items:center; justify-content:space-between; gap:6px; }
  .body strong { display:block; font-size:9.5px; }
  .body span { font-size:7.5px; color:${T.muted}; }
  .view { font-size:7.5px; font-weight:600; padding:3px 9px; border-radius:999px; color:#fff; }
`;

function varsityMock(c) {
  const wk = [0, 1, 2, 3, 4, 5, 6].map((i) =>
    `<b>${i === 6 ? `<i style="background:color-mix(in srgb, ${c.p} 45%, ${T.surface2})"></i><i style="background:${T.surface2}"></i>` : `<i style="background:${T.surface2}"></i><i style="background:${T.surface2}"></i>`}</b>`).join("");
  return `<div class="unit"><div class="phone"><div class="screen">
    <div class="sb"><span>9:41</span><i class="island"></i><em>5G</em></div>
    <div class="mock">
      <div class="vt" style="color:${c.ink}"><i style="background:${c.ink}"></i>VARSITY · ${c.n.toUpperCase()} ROWING<em>Sun</em></div>
      <div><div class="day">Sunday · August 16</div><div class="who">John</div>
      <div class="blk" style="color:${c.ink}">Summer base → Head of the Charles</div></div>
      <div class="wk">${wk}</div>
      <div class="race" style="border:1px solid color-mix(in srgb, ${c.p} 45%, ${T.border});background:color-mix(in srgb, ${c.p} 8%, ${T.surface})">
        <div><div class="race-n">Head of the Charles</div><div class="race-d">October 18</div></div>
        <div class="cnt" style="color:${c.ink}"><strong>63</strong><span>days</span></div>
      </div>
      <div class="note" style="color:${T.muted};border:1px dashed #cfd1d6">Coach's note · work on this</div>
    </div>
    <div class="hb"><i></i></div>
  </div></div><div class="cap" style="color:${c.ink}">${c.n}</div></div>`;
}

function gymsMock(c) {
  return `<div class="unit"><div class="phone"><div class="screen">
    <div class="sb"><span>9:41</span><i class="island"></i><em>5G</em></div>
    <div class="mock">
      <div><div class="gt">Gyms</div><div class="gsub" style="color:${c.ink}">${c.n} · campus gyms</div></div>
      <div class="pills"><b style="background:${c.p};border-color:${c.p};color:#fff">All</b><b>Favourites</b><b>Main</b></div>
      ${c.gyms.map(([name, meta], i) => `
      <div class="card">
        <div class="photo" style="background:linear-gradient(135deg, color-mix(in srgb, ${i ? c.s : c.p} 55%, #ffffff), color-mix(in srgb, ${i ? c.s : c.p} 18%, #ffffff))"><span class="chip">MAIN GYM</span></div>
        <div class="body"><div><strong>${name}</strong><span>${meta}</span></div><span class="view" style="background:${c.p}${c.n === "Columbia" ? ";color:#0f2f52" : ""}">View</span></div>
      </div>`).join("")}
    </div>
    <div class="hb"><i></i></div>
  </div></div><div class="cap" style="color:${c.ink}">${c.n}</div></div>`;
}

const sheet1 = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <h2>The eight Ivy oars — light, black handles, poster blade shape</h2>
  <p class="lede">Thin throat at the collar, straight top edge, tall rounded tip, bellied bottom curve — traced from the reference poster. Black handle, pale shaft, black collar.</p>
  <div class="oars">
    ${IVIES.map((c, i) => `<div class="oar">${oarSVG(c, i)}<b>${c.n}</b></div>`).join("")}
  </div>
</body></html>`;

const sheet2 = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <h2>Varsity home — light mode, eight schools</h2>
  <p class="lede">The app's themeLight neutrals under each school's hues: Harvard red on white, Princeton orange and black on white, and Yale and Penn's navy finally legible.</p>
  <div class="grid8">${IVIES.map(varsityMock).join("")}</div>
  <h2 style="margin-top:38px">Gyms — light mode, real campus gyms</h2>
  <p class="lede">Payne Whitney, Dillon &amp; Stephens, Pottruck &amp; Fox, Nelson &amp; Olney-Margolies, Dodge &amp; Levien, Helen Newman &amp; Noyes, Alumni &amp; Zimmerman.</p>
  <div class="grid8">${IVIES.map(gymsMock).join("")}</div>
</body></html>`;

fs.writeFileSync("sheet-ivy-blades.html", sheet1);
fs.writeFileSync("sheet-ivy-apps.html", sheet2);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1150, height: 700, deviceScaleFactor: 2 });
await page.goto("file:///" + process.cwd().replace(/\\/g, "/") + "/sheet-ivy-blades.html", { waitUntil: "networkidle0" });
await page.screenshot({ path: "sheet-ivy-blades.png", fullPage: true });
await page.setViewport({ width: 1290, height: 700, deviceScaleFactor: 2 });
await page.goto("file:///" + process.cwd().replace(/\\/g, "/") + "/sheet-ivy-apps.html", { waitUntil: "networkidle0" });
await page.screenshot({ path: "sheet-ivy-apps.png", fullPage: true });
await browser.close();
console.log("light sheets rendered");
