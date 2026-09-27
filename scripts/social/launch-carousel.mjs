/*
  THE LAUNCH CAROUSEL: the website's front door, retold for Instagram.
  DRAFT v1 for the owner (2026-09-27): "same as we have on the web page, but it
  should be represented on Instagram. The phone and the app, next to it the
  features, and some text."

  So it walks the page in the page's own order, 8 slides, 1080x1350 (4:5), white:
    1    the intro: "Your campus. Your gym. Your people." with Gyms standing
         behind Match, the way the intro stands them
    2-5  the four chapters of the student story (Match, Plan, Profile, Gyms):
         the phone on the right, the chapter's features beside it, each an
         icon, a name and one line, as the story lists them
    6    Campus Colours: the same Gyms screen in three schools' colours
    7    "The app": every feature in one list, with Upcoming under it
    8    the waitlist, in the waitlist page's own words

  EVERY WORD IS THE WEBSITE'S (lib/landingCopy.ts, lib/waitlist.ts). The rule
  since 2026-09-22: "use the tone from my website so it's not generic AI slop".
  Two things the site still promises are LEFT OUT because the app does not do
  them today: "How busy" under Gyms (cut from the app 2026-09-22) and "Your
  calendar: connect it to Google or Apple Calendar" under Plan (not built).

  The device is the website's phone (components/landing/Phone.tsx): metal rim,
  black bezel, a status-bar row, the app's capture WHOLE, a gesture-bar row. So
  nothing of the screen is cut, which the owner asked for ("want the whole phone
  screen there"). No logo, no handle (the owner's rule for posts).

  Screens: mockups/social/screens/light (scripts/social/capture.mjs, signed in as
  the demo account). Slide 6 uses the site's own per-school frames
  (public/landing/closers), the ones the intro and Campus Colours cycle through.

  Run: node scripts/social/launch-carousel.mjs
  Out: mockups/social/launch/01.png … 08.png, and sheet.png with all eight
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const OUT = path.join(ROOT, "mockups/social/launch");
mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1350, M = 84;
/* the landing page's own colours (app/globals.css, --color-l-*) */
const INK = "#141618", INK2 = "#4b4f53", INK3 = "#7e8488", BLUE = "#1f32c1";
const BLUE_DIM = "rgba(31,50,193,.08)", BLUE_SOFT = "rgba(31,50,193,.2)";
/* school colours (lib/landingSchools.ts); the intro's italic line and the glow
   behind its phones take the school on screen, the rest is the page's blue */
const SCHOOL = { harvard: "#a51c30", yale: "#00356b", dartmouth: "#00693e" };

/* lift() from lib/landingSchools.ts: raises a near-black navy to a glow you can see */
function lift(hex, floor = 0.44, desat = 0.9) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (l >= floor) return hex;
  const d = max - min;
  let sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60; if (h < 0) h += 360;
  }
  sat *= 1 - (floor - l) * desat;
  const c = (1 - Math.abs(2 * floor - 1)) * sat, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = floor - c / 2;
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const hx = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${hx(r1)}${hx(g1)}${hx(b1)}`;
}

/* the line icons beside the feature rows (components/landing/FeatureIcon.tsx) */
const ICON = {
  gym: "M6 7v10M18 7v10M2 10v4M22 10v4M6 12h12M4 9v6M20 9v6",
  partners: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-4 3-6 7-6s7 2 7 6M17 11a3 3 0 1 0-1-5.8M22 21c0-3-2-5-5-5",
  chat: "M4 5h16v11H9l-5 4z",
  log: "M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2",
  leaderboard: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  channels: "M10 3L8 21M16 3l-2 18M4 9h17M3 15h17",
  calendar: "M4 6h16v14H4zM4 10h16M8 14h.01M12 14h.01M16 14h.01M8 3v4M16 3v4",
  mentor: "M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3z",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
  board: "M4 4h16v12H8l-4 4zM8 8h8M8 12h5",
  star: "M12 3l2.8 5.8 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.3l1-6.2L3 9.7l6.2-.9z",
  memories: "M4 8h3l2-3h6l2 3h3v10H4zM12 11a3 3 0 1 0 0 6 3 3 0 0 0 0-6z",
  feed: "M4 3h16v9H4zM4 16h16M4 20h11",
};
const icon = (name, size) =>
  `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="${ICON[name]}"/></svg>`;

const SLIDES = [
  /* hero: badge, headline (lib/landingCopy.ts `hero`) */
  { kind: "hero", badge: "Free for students", lines: ["Your campus.", "Your gym."], em: "Your people." },

  /* the student story's chapters (`storyBeats`): kicker, head, points. The
     italic half of each head is this carousel's, the words are the site's. */
  { kind: "chapter", kicker: "01 · Match", head: "Find training partners.", em: "Make friends.", img: "match",
    points: [
      { icon: "partners", title: "Browse", text: "Everyone sorted by how well you fit: interests, concentration, level and hours." },
      { icon: "clock", title: "Find by time", text: "Pick when you want to train and see who goes then." },
      { icon: "board", title: "Buddy Board", text: "Post your session and see who wants to join." },
      { icon: "mentor", title: "Mentors", text: "Get help from an experienced student or an upperclassman in your concentration." },
    ] },
  { kind: "chapter", kicker: "02 · Plan", head: "Plan sessions easily", em: "in the chat.", img: "chat",
    points: [
      { icon: "chat", title: "Plan card", text: "Send the gym, the day and the time." },
      { icon: "calendar", title: "Both calendars", text: "Once they accept, it goes into both of your calendars." },
    ] },
  { kind: "chapter", kicker: "03 · Profile", head: "Track your statistics. See how you do", em: "in the leaderboards.", img: "profile",
    points: [
      { icon: "leaderboard", title: "Leaderboards", text: "See how you, your house and your year rank on campus." },
      { icon: "calendar", title: "Calendar", text: "Every session you log marks its day." },
      { icon: "memories", title: "Memories", text: "Photos from your sessions, saved to come back to." },
    ] },
  { kind: "chapter", kicker: "04 · Gyms", head: "See every gym on your campus", em: "in one place.", img: "gyms",
    points: [
      { icon: "memories", title: "Photos", text: "Added by the students who train there." },
      { icon: "star", title: "Ratings", text: "Know which gyms students rate best." },
    ] },

  /* Campus Colours (`closers.campus`) */
  { kind: "colours", head: "Your campus,", em: "your colours.", sub: "The app is customized to your university, gyms and colours.",
    schools: ["yale", "harvard", "dartmouth"] },

  /* the feature list beside Campus Colours (`studentFeatures`), titles only */
  { kind: "list", kicker: "The app",
    rows: [
      { icon: "gym", title: "Overview of all gyms on campus." },
      { icon: "partners", title: "Find your ideal training partner." },
      { icon: "mentor", title: "New to the gym or campus?" },
      { icon: "chat", title: "Plan a session easily in the chat." },
      { icon: "log", title: "Log the session without leaving the app." },
      { icon: "memories", title: "Build memories." },
      { icon: "leaderboard", title: "Leaderboards." },
      { icon: "channels", title: "Community channels." },
    ],
    coming: { kicker: "Upcoming", rows: [{ icon: "feed", title: "Feed." }] } },

  /* the waitlist page (lib/waitlist.ts): headline, body, and the bio link */
  { kind: "closer", head: "Get in on", em: "day one.", sub: "UNIsport opens at Harvard first. Get an email when the app launches.",
    url: "getunisport.com/waitlist" },
];

/* ── the screens ── */
const b64 = (file) => "data:image/png;base64," + readFileSync(file).toString("base64");
const CAP = {};   // name -> { src, aspect (h/w) }
for (const s of SLIDES) if (s.img && !CAP[s.img]) {
  const file = path.join(ROOT, "mockups/social/screens/light", s.img + ".png");
  const meta = await sharp(file).metadata();
  CAP[s.img] = { src: b64(file), aspect: meta.height / meta.width };
}
for (const s of SLIDES) if (s.kind === "hero") for (const n of ["gyms", "match"]) if (!CAP[n]) {
  const file = path.join(ROOT, "mockups/social/screens/light", n + ".png");
  const meta = await sharp(file).metadata();
  CAP[n] = { src: b64(file), aspect: meta.height / meta.width };
}
const FRAME = {}; // school -> the site's gyms frame (900x1480 webp), as png
for (const s of SLIDES) if (s.schools) for (const k of s.schools) {
  const buf = await sharp(path.join(ROOT, "public/landing/closers", `gyms-${k}.webp`)).png().toBuffer();
  FRAME[k] = { src: "data:image/png;base64," + buf.toString("base64"), aspect: 1480 / 900 };
}

/* THE DEVICE, the website's (components/landing/Phone.tsx), in px from its
   cqw: rim .83, bezel 1.95, screen radius 9.44, status row 3.33 top / 2.22
   bottom with a 6.1 x 23.3 island, gesture row 6.67 with a 38% bar. The
   capture fills the screen's width and its whole height shows. */
const shell = (w) => {
  const cq = w / 100, rim = 0.83 * cq, bez = 1.95 * cq;
  const sw = w - 2 * (rim + bez) - 2;
  const status = (3.33 + 2.22 + 6.1) * cq, gesture = 6.67 * cq;
  return { cq, rim, bez, sw, status, gesture };
};
const phoneHeight = (w, aspect) => {
  const s = shell(w);
  return Math.round(s.sw * aspect + s.status + s.gesture + 2 * (s.rim + s.bez) + 2);
};
/* the width at which a phone of this capture is exactly `h` tall */
const widthFor = (h, aspect) => {
  let w = 300;
  for (let i = 0; i < 30; i++) w *= h / phoneHeight(w, aspect);
  return Math.floor(w);
};
const phone = ({ src, aspect }, w, style = "", glow = null) => {
  const s = shell(w), px = (v) => `${v.toFixed(2)}px`;
  return `<div class="ph" style="width:${w}px;${style}">
    ${glow ? `<div class="glow" style="background:${glow}"></div>` : ""}
    <div class="rim" style="border-radius:${px(12.2 * s.cq)};padding:${px(s.rim)};--cq:${s.cq}px">
      <div class="bezel" style="border-radius:${px(11.37 * s.cq)};padding:${px(s.bez)}">
        <div class="screen" style="border-radius:${px(9.44 * s.cq)}">
          <div class="status" style="padding:${px(3.33 * s.cq)} ${px(6.11 * s.cq)} ${px(2.22 * s.cq)};font-size:${px(3.33 * s.cq)}">
            <span>9:41</span>
            <i class="island" style="height:${px(6.1 * s.cq)};width:${px(23.3 * s.cq)}"></i>
            <span class="net" style="font-size:${px(3.06 * s.cq)}">5G</span>
          </div>
          <img src="${src}" style="width:100%;height:${px(s.sw * aspect)};display:block">
          <div class="gesture" style="height:${px(s.gesture)}"><i style="height:${px(1.1 * s.cq)}"></i></div>
        </div>
      </div>
    </div>
  </div>`;
};

const head = (text, em, emColour = BLUE) =>
  `${text ? text + " " : ""}<em style="color:${emColour}">${em}</em>`;

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; color:${INK}; }
  .slide { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  .serif { font-family:"Instrument Serif", Georgia, serif; font-weight:400; letter-spacing:-.012em; line-height:1.02; text-wrap:balance; }
  .serif em { font-style:italic; }
  .mono { font-family:"Geist Mono", ui-monospace, monospace; font-weight:500; text-transform:uppercase; letter-spacing:.14em; }
  .kicker { position:absolute; left:${M}px; top:${M}px; font-size:24px; color:${BLUE}; }
  .badge { display:inline-flex; align-items:center; gap:14px; font-size:22px; color:${BLUE};
           padding:14px 26px; border-radius:999px; background:${BLUE_DIM}; border:1.5px solid ${BLUE_SOFT}; }
  .badge::before { content:""; width:10px; height:10px; border-radius:50%; background:${BLUE}; }

  /* the phone (Phone.tsx + .l-phone-rim) */
  .ph { position:absolute; }
  .ph .glow { position:absolute; left:50%; top:50%; width:106%; height:94%; transform:translate(-50%,-50%);
              border-radius:9999px; filter:blur(34px); opacity:.36; }
  .rim { position:relative; border:1px solid #767b83;
         background:linear-gradient(135deg,#f5f6f8 0%,#c8ccd3 18%,#8f949c 50%,#c8ccd3 82%,#f5f6f8 100%);
         box-shadow: inset 0 0 0 calc(var(--cq) * .28) rgba(245,246,248,.7),
                     0 calc(var(--cq) * 1.6) calc(var(--cq) * 3.2) calc(var(--cq) * -1) rgba(16,22,44,.3),
                     0 calc(var(--cq) * 9) calc(var(--cq) * 18) calc(var(--cq) * -5) rgba(16,22,44,.2); }
  .rim::before, .rim::after { content:""; position:absolute; width:calc(var(--cq) * .95); background:#8f949c; }
  .rim::before { left:calc(var(--cq) * -.95 - 1px); top:calc(var(--cq) * 47); height:calc(var(--cq) * 11);
                 border-radius:calc(var(--cq) * .5) 0 0 calc(var(--cq) * .5);
                 box-shadow:0 calc(var(--cq) * -14) 0 #8f949c, 0 calc(var(--cq) * 14) 0 #8f949c; }
  .rim::after { right:calc(var(--cq) * -.95 - 1px); top:calc(var(--cq) * 50); height:calc(var(--cq) * 18);
                border-radius:0 calc(var(--cq) * .5) calc(var(--cq) * .5) 0; }
  .bezel { background:#050506; }
  .screen { overflow:hidden; background:#fff; }
  .status { display:flex; align-items:center; justify-content:space-between; line-height:1;
            font-family:"Geist Mono", ui-monospace, monospace; color:#16150f; background:#fff; }
  .status .net { color:#9b968c; }
  .island { display:block; border-radius:999px; background:#161616; border:1px solid #222; }
  .gesture { display:flex; align-items:center; justify-content:center; background:#fff; }
  .gesture i { display:block; width:38%; border-radius:999px; background:#cfccc6; }

  /* chapter slides */
  .pts { position:absolute; left:${M}px; display:flex; flex-direction:column; gap:46px; }
  .pt { display:flex; gap:24px; align-items:flex-start; }
  .tile { flex:none; width:64px; height:64px; border-radius:18px; display:grid; place-items:center;
          background:${BLUE_DIM}; color:${BLUE}; }
  .pt b { display:block; font-weight:700; font-size:31px; letter-spacing:-.01em; color:${INK}; }
  .pt span { display:block; margin-top:8px; font-weight:500; font-size:26px; line-height:1.36; color:${INK2}; }

  /* the list */
  .rows { position:absolute; left:${M}px; right:${M}px; }
  .row { display:flex; align-items:center; gap:26px; padding:21px 0; border-bottom:1.5px solid #d7dfe5; }
  .row .tile { width:58px; height:58px; border-radius:16px; }
  .row .t { font-family:"Instrument Serif", Georgia, serif; font-size:46px; line-height:1.05; letter-spacing:-.01em; color:${INK}; }
  .row.soon .tile { background:none; border:2px dashed ${BLUE_SOFT}; color:${INK3}; }
  .sub-k { margin-top:42px; margin-bottom:4px; font-size:22px; color:${INK3}; }

  .sub { font-weight:500; line-height:1.4; color:${INK2}; }
  .url { display:inline-block; font-weight:700; font-size:34px; letter-spacing:.005em; color:#fff;
         padding:22px 40px; border-radius:999px; background:${BLUE}; }
`;

const render = (s) => {
  if (s.kind === "hero") {
    /* the intro's pair: Gyms behind, leaning out to the left; Match in front.
       The intro's three lines become two, so the pair can stand big and whole
       under them; three lines top left with the pair beside them ran the
       words into the phone. */
    const glow = lift(SCHOOL.harvard);
    const top = 440, h = H - top - 64;
    const wf = widthFor(h, CAP.match.aspect), wb = Math.round(wf * 0.93);
    const pair = wf + wb * 0.62;
    const frontLeft = Math.round((W - pair) / 2 + wb * 0.62) + 10;
    return `<div class="slide">
      <div style="position:absolute;left:${M}px;top:${M}px"><span class="badge mono">${s.badge}</span></div>
      <div class="serif" style="position:absolute;left:${M}px;right:${M}px;top:${M + 90}px;font-size:104px;line-height:.98">
        ${s.lines.join(" ")}<br><em style="color:${SCHOOL.harvard}">${s.em}</em></div>
      ${phone(CAP.gyms, wb, `left:${frontLeft - Math.round(wb * 0.62)}px;top:${top + 40}px;transform:rotate(-9deg)`, glow)}
      ${phone(CAP.match, wf, `left:${frontLeft}px;top:${top}px`, glow)}
    </div>`;
  }

  if (s.kind === "chapter") {
    /* the head across the top; the phone whole on the right, the features beside it */
    const top = 372, h = H - top - 64;
    const w = widthFor(h, CAP[s.img].aspect);
    const colW = W - 2 * M - w - 52;
    return `<div class="slide">
      <div class="kicker mono">${s.kicker}</div>
      <div class="serif" style="position:absolute;left:${M}px;right:${M}px;top:${M + 62}px;font-size:${s.head.length + s.em.length > 50 ? 68 : 80}px">${head(s.head, s.em)}</div>
      <div class="pts" style="top:${top + 10}px;width:${colW}px;height:${h - 20}px;justify-content:center">
        ${s.points.map((p) => `<div class="pt"><div class="tile">${icon(p.icon, 32)}</div><div><b>${p.title}</b><span>${p.text}</span></div></div>`).join("")}
      </div>
      ${phone(CAP[s.img], w, `left:${W - M - w}px;top:${top}px`)}
    </div>`;
  }

  if (s.kind === "colours") {
    /* one screen, three schools: the middle one in front */
    const top = 596, hf = H - top - 70;
    const wf = widthFor(hf, FRAME.harvard.aspect), wb = Math.round(wf * 0.86);
    const hb = phoneHeight(wb, FRAME.harvard.aspect);
    const cx = W / 2;
    const [l, c, r] = s.schools;
    return `<div class="slide">
      <div class="serif" style="position:absolute;left:${M}px;right:${M}px;top:${M + 10}px;font-size:118px">${s.head}<br>${head("", s.em)}</div>
      <div class="sub" style="position:absolute;left:${M}px;right:${M}px;top:${M + 290}px;font-size:32px">${s.sub}</div>
      ${phone(FRAME[l], wb, `left:${cx - wf / 2 - wb * 0.74}px;top:${top + (hf - hb) / 2 + 30}px;transform:rotate(-8deg)`, lift(SCHOOL[l]))}
      ${phone(FRAME[r], wb, `left:${cx + wf / 2 - wb * 0.26}px;top:${top + (hf - hb) / 2 + 30}px;transform:rotate(8deg)`, lift(SCHOOL[r]))}
      ${phone(FRAME[c], wf, `left:${cx - wf / 2}px;top:${top}px`, lift(SCHOOL[c]))}
    </div>`;
  }

  if (s.kind === "list") {
    const row = (r, soon) => `<div class="row${soon ? " soon" : ""}"><div class="tile">${icon(r.icon, 30)}</div><div class="t">${r.title}</div></div>`;
    return `<div class="slide">
      <div class="kicker mono">${s.kicker}</div>
      <div class="rows" style="top:${M + 70}px">
        ${s.rows.map((r) => row(r)).join("")}
        <div class="mono sub-k">${s.coming.kicker}</div>
        ${s.coming.rows.map((r) => row(r, true)).join("")}
      </div>
    </div>`;
  }

  /* closer */
  return `<div class="slide">
    <div style="position:absolute;left:${M}px;right:${M}px;top:50%;transform:translateY(-54%)">
      <div class="serif" style="font-size:150px">${s.head}<br>${head("", s.em)}</div>
      <div class="sub" style="margin-top:34px;font-size:36px;max-width:820px">${s.sub}</div>
      <div style="margin-top:52px"><span class="url">${s.url}</span></div>
    </div>
  </div>`;
};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const files = [];
for (const [i, s] of SLIDES.entries()) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@500;600;700&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
    <style>${css}</style></head><body>${render(s)}</body></html>`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
    .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
  await page.evaluateHandle("document.fonts.ready");
  const file = path.join(OUT, String(i + 1).padStart(2, "0") + ".png");
  await page.screenshot({ path: file, type: "png" });
  files.push(file);
  console.log("  " + path.basename(file));
}
await browser.close();

/* all eight in order, for looking at the whole thing at once */
const TW = 480, TH = Math.round(TW * H / W), GAP = 24, COLS = 4;
const tiles = await Promise.all(files.map((f) => sharp(f).resize(TW, TH).png().toBuffer()));
const rows = Math.ceil(files.length / COLS);
await sharp({ create: { width: COLS * TW + (COLS + 1) * GAP, height: rows * TH + (rows + 1) * GAP, channels: 3, background: "#e4e8ee" } })
  .composite(tiles.map((b, i) => ({ input: b, left: GAP + (i % COLS) * (TW + GAP), top: GAP + Math.floor(i / COLS) * (TH + GAP) })))
  .png().toFile(path.join(OUT, "sheet.png"));
console.log("wrote " + OUT);
