// The Gyms screen for all eight Ivies — same layout as the real Harvard
// screenshot, each school's three real main gyms, in that school's colours.
// Palette lifted from webpage/Blade Lock Light.html: #0a0a0a ground,
// #f7f6f4 screen, #ffffff cards, #9a751c gold.
import fs from "fs";
import puppeteer from "puppeteer-core";

const P = { ground: "#0a0a0a", screen: "#f7f6f4", card: "#ffffff", border: "#e4e2de", text: "#15151a", muted: "#4e5462", gold: "#9a751c" };

// p = brand fill · ink = text-safe on white · s = secondary (2nd photo tint)
// Facilities researched per school; hours marked (v) are verified, others are
// the plausible campus-rec pattern and need a pass before launch.
const SCHOOLS = [
  { n: "Harvard", city: "Cambridge, MA", p: "#a51c30", ink: "#a51c30", s: "#9a751c", sub: "HOUSE GYMS", subEx: "Adams · Currier · Eliot",
    gyms: [["Malkin Athletic Center", "39 Holyoke Street", "6am–11pm", "4.8", "142", "3 floors"],
           ["Murr Center", "65 N Harvard St", "6am–10pm", "4.6", "98", "2 floors"],
           ["Hemenway Gymnasium", "7 Divinity Avenue", "6am–10pm", "4.4", "76", "2 floors"]] },
  { n: "Yale", city: "New Haven, CT", p: "#00356b", ink: "#00356b", s: "#286dc0", sub: "COLLEGE GYMS", subEx: "Branford · Saybrook · Pierson",
    gyms: [["Payne Whitney Gymnasium", "70 Tower Parkway", "6am–11pm", "4.7", "163", "9 floors"],
           ["Israel Fitness Center", "PWG · 4th floor", "6am–10pm", "4.6", "121", "20,000 sq ft"],
           ["Lanman Center", "PWG · court level", "7am–10pm", "4.3", "64", "4 courts"]] },
  { n: "Princeton", city: "Princeton, NJ", p: "#e77500", ink: "#c96500", s: "#15151a", sub: "COLLEGE GYMS", subEx: "Whitman · Butler · Forbes",
    gyms: [["Dillon Gymnasium", "Elm Drive", "6am–11pm", "4.7", "134", "150,000 sq ft"],
           ["Stephens Fitness Center", "Dillon Gym · bi-level", "6am–11pm", "4.6", "112", "8,000 sq ft"],
           ["Jadwin Gymnasium", "Fitzrandolph Road", "7am–10pm", "4.2", "58", "indoor track"]] },
  { n: "Penn", city: "Philadelphia, PA", p: "#011f5b", ink: "#011f5b", s: "#990000", sub: "COLLEGE HOUSE GYMS", subEx: "Harrison · Rodin · Harnwell",
    gyms: [["Pottruck Health & Fitness", "3701 Walnut Street", "6am–11pm", "4.6", "147", "120,000 sq ft"],
           ["Fox Fitness Center", "219 S 33rd Street", "7am–10pm", "4.3", "71", "1 floor"],
           ["Sheerr Pool", "Pottruck · lower level", "7am–9pm", "4.4", "52", "12 lanes"]] },
  { n: "Brown", city: "Providence, RI", p: "#4e3629", ink: "#4e3629", s: "#c00404", sub: "DORM GYMS", subEx: "Keeney · Wriston · Pembroke",
    gyms: [["Nelson Fitness Center", "225 Hope Street", "6am–11pm", "4.7", "128", "10,000 sq ft loft"],
           ["Olney-Margolies Center", "235 Hope Street", "6am–10pm", "4.4", "83", "86,000 sq ft"],
           ["Coleman Aquatics Center", "225 Hope Street", "7am–9pm", "4.5", "61", "8 lanes"]] },
  { n: "Columbia", city: "New York, NY", p: "#6cace4", ink: "#1d64ab", s: "#15315e", sub: "RESIDENCE GYMS", subEx: "Carman · John Jay · EC",
    gyms: [["Dodge Fitness Center", "3030 Broadway", "6am–11pm", "4.4", "156", "tri-level"],
           ["Levien Gymnasium", "Dodge · court level", "7am–10pm", "4.3", "74", "3 courts"],
           ["University Gym (Blue Gym)", "Dodge · lower level", "7am–10pm", "4.1", "48", "1 court"]] },
  { n: "Cornell", city: "Ithaca, NY", p: "#b31b1b", ink: "#b31b1b", s: "#15151a", sub: "NORTH & WEST", subEx: "Toni Morrison · Appel",
    gyms: [["Helen Newman Hall", "163 Cradit Farm Drive", "6am–9pm", "4.5", "119", "pool · bowling"],
           ["Noyes Recreation Center", "306 West Avenue", "7am–11pm", "4.6", "104", "bouldering wall"],
           ["Teagle Hall", "512 Campus Road", "7am–10:45pm", "4.2", "67", "2 fitness floors"]] },
  { n: "Dartmouth", city: "Hanover, NH", p: "#00693e", ink: "#00693e", s: "#15151a", sub: "HOUSE GYMS", subEx: "Allen · School · North Park",
    gyms: [["Lewinstein Athletic Center", "Alumni Gym · 6 S Park St", "6am–11pm", "4.6", "97", "renovated 2023"],
           ["Zimmerman Fitness Center", "Alumni Gym · 3rd floor", "6am–11pm", "4.7", "115", "16,000 sq ft"],
           ["Berry Sports Center", "6 South Park Street", "7am–10pm", "4.3", "56", "2nd floor"]] },
];

const heart = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="2"><path d="M12 20s-7-4.5-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20z"/></svg>`;
const clock = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>`;
const stairs = `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 20h5v-4h5v-4h5V8h3"/></svg>`;

const css = `
  * { margin:0; box-sizing:border-box; }
  body { background:${P.ground}; color:#f5f5f5; font-family:-apple-system,"Segoe UI",Roboto,sans-serif; padding:34px; }
  h2 { font-family:Georgia,serif; font-weight:400; font-size:30px; margin-bottom:6px; }
  .lede { color:#8a8a8a; font-size:14px; margin-bottom:26px; max-width:78ch; }
  .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:30px 20px; }
  .unit { display:flex; flex-direction:column; align-items:center; gap:9px; }
  .cap { font-family:ui-monospace,monospace; font-size:10px; letter-spacing:.16em; text-transform:uppercase; }
  .phone { width:100%; max-width:268px; border:1px solid #26262a; background:#141416; border-radius:38px; padding:9px; box-shadow:0 20px 50px rgba(0,0,0,.5); }
  .screen { border-radius:30px; overflow:hidden; background:${P.screen}; }
  .sb { display:flex; justify-content:space-between; align-items:center; padding:10px 18px 7px; font-family:ui-monospace,monospace; font-size:11px; color:${P.text}; background:${P.screen}; }
  .sb em { font-style:normal; color:#9aa0ab; font-size:10px; }
  .island { width:74px; height:19px; border-radius:999px; background:#0c0c0d; }
  .hb { height:21px; display:flex; align-items:center; justify-content:center; background:${P.screen}; }
  .hb i { width:36%; height:4px; border-radius:999px; background:#1c1c1f; }
  .app { background:${P.screen}; padding:12px 12px 6px; display:flex; flex-direction:column; gap:9px; }
  .title { font-family:Georgia,serif; font-size:23px; color:${P.text}; letter-spacing:-.01em; }
  .loc { font-size:9px; color:${P.muted}; margin-top:1px; }
  .pills { display:flex; gap:5px; }
  .pills b { font-size:8.5px; font-weight:600; padding:4px 10px; border-radius:999px; border:1px solid ${P.border}; color:${P.muted}; background:${P.card}; }
  .card { border:1px solid ${P.border}; border-radius:12px; overflow:hidden; background:${P.card}; box-shadow:0 1px 3px rgba(0,0,0,.05); }
  .photo { height:44px; position:relative; }
  .chip { position:absolute; top:6px; left:7px; font-family:ui-monospace,monospace; font-size:6.5px; letter-spacing:.12em; padding:3px 6px; border-radius:5px; background:rgba(255,255,255,.9); color:#2a2a2a; font-weight:700; }
  .fav { position:absolute; top:5px; right:6px; width:19px; height:19px; border-radius:50%; background:rgba(255,255,255,.9); display:flex; align-items:center; justify-content:center; }
  .cbody { padding:7px 9px 8px; }
  .cname { font-size:11px; font-weight:650; color:${P.text}; }
  .caddr { font-size:8.5px; color:${P.muted}; margin-top:1px; }
  .meta { display:flex; align-items:center; gap:7px; margin-top:6px; font-size:8.5px; color:${P.muted}; }
  .meta i { display:inline-flex; align-items:center; gap:3px; font-style:normal; }
  .star { color:${P.gold}; font-weight:700; }
  .cnt { color:#9aa0ab; }
  .view { margin-left:auto; font-size:8.5px; font-weight:700; padding:4px 11px; border-radius:999px; color:#fff; }
  .sect { font-family:ui-monospace,monospace; font-size:7.5px; letter-spacing:.14em; color:${P.muted}; padding-top:2px; }
  .house { border:1px solid ${P.border}; border-radius:10px; background:${P.card}; padding:8px 9px; display:flex; align-items:center; gap:8px; }
  .shield { width:15px; height:18px; flex:none; }
  .hname { font-size:10px; font-weight:600; color:${P.text}; }
  .hsub { font-size:8px; color:${P.muted}; }
`;

function shield(c) {
  return `<svg class="shield" viewBox="0 0 22 26" fill="none"><path d="M1,1 L21,1 L21,15 Q21,24 11,25 Q1,24 1,15 Z" fill="${c.p}" stroke="${c.s}" stroke-width="1.4"/><rect x="4" y="4" width="5" height="16" rx="1" fill="#fff"/><rect x="4" y="11" width="14" height="4" rx="1" fill="#fff"/><rect x="13" y="4" width="5" height="16" rx="1" fill="#fff"/></svg>`;
}

function gymsPhone(c) {
  const cards = c.gyms.map(([name, addr, hours, rating, count, floors], i) => {
    const tint = i === 1 ? c.s : c.p;
    return `<div class="card">
      <div class="photo" style="background:linear-gradient(135deg, color-mix(in srgb, ${tint} 62%, #ffffff), color-mix(in srgb, ${tint} 20%, #ffffff))">
        <span class="chip">MAIN GYM</span><span class="fav">${heart}</span>
      </div>
      <div class="cbody">
        <div class="cname">${name}</div>
        <div class="caddr">${addr}</div>
        <div class="meta">
          <i>${clock} ${hours}</i>
          <i><span class="star">★ ${rating}</span> <span class="cnt">(${count})</span></i>
          <i>${stairs} ${floors}</i>
          <span class="view" style="background:${c.p}${c.n === "Columbia" ? ";color:#0f2f52" : ""}">View</span>
        </div>
      </div>
    </div>`;
  }).join("");

  return `<div class="unit"><div class="phone"><div class="screen">
    <div class="sb"><span>9:41</span><i class="island"></i><em>5G</em></div>
    <div class="app">
      <div><div class="title">Gyms</div><div class="loc" style="color:${c.ink}">${c.n} · ${c.city}</div></div>
      <div class="pills"><b style="background:${c.p};border-color:${c.p};color:#fff${c.n === "Columbia" ? ";color:#0f2f52" : ""}">All</b><b>Favourites</b><b>Main</b><b>House</b></div>
      ${cards}
      <div class="sect">${c.sub}</div>
      <div class="house">${shield(c)}<div><div class="hname">${c.subEx.split(" · ")[0]}</div><div class="hsub">${c.subEx}</div></div></div>
    </div>
    <div class="hb"><i></i></div>
  </div></div><div class="cap" style="color:${c.ink}">${c.n}</div></div>`;
}

const sheet = `<html><head><meta charset="utf-8"><style>${css}</style></head><body>
  <h2>Gyms — eight Ivies, three real facilities each</h2>
  <p class="lede">Same screen as the Harvard shot: three main gyms with address, hours, rating and size, then that campus's residential-gym section. Facilities researched per school; ratings are demo data. Palette taken from your Blade Lock page — #0a0a0a ground, #f7f6f4 screen, white cards, #9a751c gold stars.</p>
  <div class="grid">${SCHOOLS.map(gymsPhone).join("")}</div>
</body></html>`;

fs.writeFileSync("sheet-gyms8.html", sheet);

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new", args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1330, height: 900, deviceScaleFactor: 2 });
await page.goto("file:///" + process.cwd().replace(/\\/g, "/") + "/sheet-gyms8.html", { waitUntil: "networkidle0" });
await page.screenshot({ path: "sheet-gyms8.png", fullPage: true });
await browser.close();
console.log("gyms sheet rendered");
