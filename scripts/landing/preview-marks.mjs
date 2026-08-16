// Four ways to build the school identity marks, all eight schools each — so we
// can pick one before wiring the student-mode section. None reproduces a real
// crest or wordmark: those are trademarks, and putting them on a commercial
// landing page implies a partnership that does not exist.
import fs from "fs";
import puppeteer from "puppeteer-core";

const P = { ground: "#0a0a0a", screen: "#f7f6f4", card: "#ffffff", border: "#e4e2de", text: "#15151a", muted: "#4e5462", gold: "#9a751c" };

const S = [
  { n: "Harvard",   short: "Harvard",   mono: "H",  p: "#a51c30", s: "#f5f3ef", t: "#9a751c", ink: "#a51c30" },
  { n: "Yale",      short: "Yale",      mono: "Y",  p: "#00356b", s: "#f5f3ef", t: "#286dc0", ink: "#00356b" },
  { n: "Princeton", short: "Princeton", mono: "P",  p: "#e77500", s: "#1a1a1a", t: "#1a1a1a", ink: "#c96500" },
  { n: "Penn",      short: "Penn",      mono: "U",  p: "#011f5b", s: "#990000", t: "#990000", ink: "#011f5b" },
  { n: "Brown",     short: "Brown",     mono: "B",  p: "#4e3629", s: "#c00404", t: "#c00404", ink: "#4e3629" },
  { n: "Columbia",  short: "Columbia",  mono: "C",  p: "#6cace4", s: "#15315e", t: "#15315e", ink: "#1d64ab" },
  { n: "Cornell",   short: "Cornell",   mono: "C",  p: "#b31b1b", s: "#f5f3ef", t: "#15151a", ink: "#b31b1b" },
  { n: "Dartmouth", short: "Dartmouth", mono: "D",  p: "#00693e", s: "#f5f3ef", t: "#15151a", ink: "#00693e" },
];

/* A — the app's own shield, recoloured. Already exists in the codebase
   (components/varsity/VarsityShield.tsx) and is drawn from theme variables. */
const shield = (c, size = 46) => `
<svg width="${(size * 22) / 26}" height="${size}" viewBox="0 0 22 26" fill="none">
  <path d="M1,1 L21,1 L21,15 Q21,24 11,25 Q1,24 1,15 Z" fill="${c.p}" stroke="${c.t}" stroke-width="1.3"/>
  <rect x="4" y="4" width="5" height="16" rx="1" fill="#fff"/>
  <rect x="4" y="11" width="14" height="4" rx="1" fill="#fff"/>
  <rect x="13" y="4" width="5" height="16" rx="1" fill="#fff"/>
</svg>`;

/* B — monogram roundel: the school's initial, set in the page's serif. */
const roundel = (c, size = 46) => `
<svg width="${size}" height="${size}" viewBox="0 0 46 46">
  <circle cx="23" cy="23" r="21.5" fill="${c.p}" stroke="${c.t}" stroke-width="1.4"/>
  <text x="23" y="31.5" text-anchor="middle" font-family="Georgia, serif" font-size="24"
        fill="${c.n === "Princeton" ? "#1a1a1a" : "#ffffff"}">${c.mono}</text>
</svg>`;

/* C — colour bars: the school's own colours, stacked. This is how a crew is
   read at distance and how a scarf is read on a street; no trademark art. */
const bars = (c, size = 46) => `
<svg width="${size}" height="${size}" viewBox="0 0 46 46">
  <rect x="2" y="2" width="42" height="42" rx="11" fill="${c.s === "#f5f3ef" ? "#f5f3ef" : c.s}"/>
  <path d="M2 13 h42 v10 h-42 z" fill="${c.p}"/>
  <path d="M2 29 h42 v10 h-42 z" fill="${c.p}"/>
  <rect x="2" y="2" width="42" height="42" rx="11" fill="none" stroke="rgba(0,0,0,0.18)" stroke-width="1"/>
</svg>`;

/* D — blade chip: the oar blade from the varsity animation, shrunk to a tile.
   Ties the two halves of the page together. */
const bladeChip = (c, size = 46) => {
  const kind = { Harvard: "flame", Yale: "band", Princeton: "diag", Penn: "chevTip", Brown: "topband", Columbia: "diagBlue", Cornell: "bumps", Dartmouth: "solid" }[c.n];
  let base = "#f5f3ef", ov = "";
  if (kind === "flame")    { base = "#a51c30"; ov = `<polygon points="40,16 40,38 16,38 34,26" fill="#f5f3ef"/>`; }
  if (kind === "band")     { base = "#f5f3ef"; ov = `<rect x="6" y="27" width="34" height="12" fill="#00356b"/>`; }
  if (kind === "diag")     { base = "#e77500"; ov = `<polygon points="6,8 40,8 12,32" fill="#1a1a1a"/>`; }
  if (kind === "chevTip")  { base = "#011f5b"; ov = `<polygon points="40,8 40,38 18,23" fill="#c50f1f"/>`; }
  if (kind === "topband")  { base = "#f5f3ef"; ov = `<rect x="6" y="7" width="34" height="12" fill="#4e3629"/>`; }
  if (kind === "diagBlue") { base = "#f5f3ef"; ov = `<polygon points="6,8 38,8 14,34" fill="#6cace4"/>`; }
  if (kind === "bumps")    { base = "#f5f3ef"; ov = `<circle cx="40" cy="17" r="9" fill="#e21833"/><circle cx="40" cy="31" r="9" fill="#e21833"/>`; }
  if (kind === "solid")    { base = "#00693e"; }
  return `<svg width="${size}" height="${size}" viewBox="0 0 46 46">
    <defs><clipPath id="bc-${c.n}"><rect x="6" y="7" width="34" height="32" rx="7"/></clipPath></defs>
    <rect x="6" y="7" width="34" height="32" rx="7" fill="${base}"/>
    <g clip-path="url(#bc-${c.n})">${ov}</g>
    <rect x="6" y="7" width="34" height="32" rx="7" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.1"/>
  </svg>`;
};

const ROWS = [
  { key: "A", name: "Shield", note: "Your own mark, recoloured. Already in the codebase, drawn from theme variables — ships as-is.", render: shield },
  { key: "B", name: "Monogram roundel", note: "Initial in the page serif. Warning: Princeton/Penn both P, Columbia/Cornell both C.", render: roundel },
  { key: "C", name: "Colour bars", note: "The school's own colours, stacked like a scarf or a blade band. No trademarked artwork at all.", render: bars },
  { key: "D", name: "Blade chip", note: "The oar blade from the Varsity animation, shrunk. Ties both halves of the page together.", render: bladeChip },
];

const css = `
  * { margin:0; box-sizing:border-box; }
  body { background:${P.ground}; color:#f5f5f5; font-family:-apple-system,"Segoe UI",Roboto,sans-serif; padding:34px; }
  h2 { font-family:Georgia,serif; font-weight:400; font-size:30px; margin-bottom:6px; }
  .lede { color:#8a8a8a; font-size:14px; margin-bottom:26px; max-width:76ch; }
  .row { margin-bottom:26px; background:#101012; border:1px solid #1e1e21; border-radius:16px; padding:20px 22px 18px; }
  .rh { display:flex; align-items:baseline; gap:10px; margin-bottom:4px; }
  .rk { font-family:ui-monospace,monospace; font-size:11px; letter-spacing:.18em; color:${P.gold}; }
  .rn { font-family:Georgia,serif; font-size:20px; }
  .rnote { color:#8a8a8a; font-size:12.5px; margin-bottom:16px; }
  .marks { display:grid; grid-template-columns:repeat(8,1fr); gap:14px; }
  .m { display:flex; flex-direction:column; align-items:center; gap:7px; }
  .m .lbl { font-family:ui-monospace,monospace; font-size:8.5px; letter-spacing:.1em; text-transform:uppercase; }
  .m .word { font-family:Georgia,serif; font-size:13px; }
  .strip { display:flex; align-items:center; gap:12px; margin-top:16px; padding-top:14px; border-top:1px solid #1e1e21; }
  .strip .sm { display:flex; align-items:center; gap:7px; opacity:.42; transition:opacity .3s; }
  .strip .sm.on { opacity:1; }
  .strip .sm span { font-family:ui-monospace,monospace; font-size:9px; letter-spacing:.1em; text-transform:uppercase; }
  .caption { color:#6a6a6a; font-size:11.5px; margin-top:10px; font-family:ui-monospace,monospace; letter-spacing:.04em; }
  .rec { border-color:${P.gold}; }
  .badge { display:inline-block; font-family:ui-monospace,monospace; font-size:9px; letter-spacing:.14em; color:#0a0a0a; background:${P.gold}; padding:3px 8px; border-radius:999px; margin-left:8px; }
`;

const rowHTML = (r) => `
<div class="row${r.key === "C" ? " rec" : ""}">
  <div class="rh"><span class="rk">${r.key}</span><span class="rn">${r.name}</span>${r.key === "C" ? '<span class="badge">RECOMMENDED</span>' : ""}</div>
  <div class="rnote">${r.note}</div>
  <div class="marks">
    ${S.map((c) => `<div class="m">${r.render(c)}<div class="lbl" style="color:${c.ink}">${c.short}</div></div>`).join("")}
  </div>
  <div class="strip">
    ${S.map((c, i) => `<div class="sm${i === 2 ? " on" : ""}">${r.render(c, 22)}<span style="color:${i === 2 ? c.ink : "#666"}">${c.short}</span></div>`).join("")}
  </div>
  <div class="caption">↑ at rail size, third one active — this is how it reads beside the phone</div>
</div>`;

const sheet = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <h2>School identity marks — four ways</h2>
  <p class="lede">Real crests and wordmarks are trademarks; reproducing them on a commercial page implies a partnership you don't have. Each option below gives the same "that's my school" recognition without borrowing any protected artwork. Every one animates the same way: the active mark lights up, the phone re-themes with it.</p>
  ${ROWS.map(rowHTML).join("")}
</body></html>`;

fs.writeFileSync("sheet-marks.html", sheet);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1150, height: 900, deviceScaleFactor: 2 });
await page.goto("file:///" + process.cwd().replace(/\\/g, "/") + "/sheet-marks.html", { waitUntil: "networkidle0" });
await page.screenshot({ path: "sheet-marks.png", fullPage: true });
await browser.close();
console.log("marks sheet rendered");
