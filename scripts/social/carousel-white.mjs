/*
  The STUDENT "how it works" carousel — 8 slides, 1080x1350, WHITE.

  Same device and same faces as scripts/social/posts.mjs (the owner's rule for
  posts, 2026-09-22: white ground, the real light screen inside a drawn phone,
  no logo). What is different from the single posts: a carousel is read in
  order, so each slide carries a kicker top-left (which screen), a counter
  top-right, one big line with ONE word in the brand blue, and a small line
  that quotes what is actually on that screen — a time, a name, a score —
  instead of describing the feature. Slide 1 and 8 are type only.

  Screens: mockups/social/screens/light (scripts/social/capture.mjs, signed in
  as the demo account, Jonas Keller).

  Run: node scripts/social/carousel-white.mjs
  Out: mockups/social/carousel-white/01.png … 08.png
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const OUT = path.join(ROOT, "mockups/social/carousel-white");
mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1350;
const INK = "#141618", INK2 = "#3b3f47", BLUE = "#1f32c1";
const URL_WAITLIST = "getunisport.com/waitlist";

const SLIDES = [
  /* Every line below is the website's own wording (lib/landingCopy.ts) — the
     owner's dictated copy, not new marketing text ("use words that I used
     before, I don't want slop there"). */
  { kind: "cover",
    big: "Never train alone again.", key: "alone",
    sub: "Find the gym. Find someone to go with. Free for students." },

  { kicker: "01 · Gyms", img: "gyms",
    big: "See every gym on your campus in one place.", key: "every",
    sub: "See when each gym is open, how busy it is right now, and photos from the people who train there." },

  { kicker: "02 · Match", img: "match",
    big: "Find training partners. Make friends.", key: "friends.",
    sub: "Browse sorts everyone by how well you fit with them, based on interests, concentration, experience and hours." },

  { kicker: "03 · Mentors", img: "person",
    big: "New to the gym or campus?", key: "New",
    sub: "Start with someone beside you. Get paired with an experienced student who has offered to help in the gym, or with an upperclassman in your concentration who can show you the ropes." },

  { kicker: "04 · Plan", img: "chat",
    big: "Plan sessions easily in the chat.", key: "chat.",
    sub: "You send a card with the gym, the day and the time, and once the other one accepts it goes to both calendars." },

  { kicker: "05 · Log", img: "profile",
    big: "Log the session without leaving the app.", key: "app.",
    sub: "Your profile counts every session you logged and the people you met. Every session you log marks its day." },

  { kicker: "06 · Leaderboards", img: "leaderboards",
    big: "See how you do in the leaderboards.", key: "leaderboards.",
    sub: "See how you, your house and your year rank on campus, and who has made the most friends." },

  { kind: "closer",
    big: "Your campus. Your gym. Your people.", key: "people.",
    sub: "UNIsport opens at Harvard first. Get an email when the app launches. Free for students.", url: true },
];

const shot = (name) =>
  "data:image/png;base64," + readFileSync(path.join(ROOT, "mockups/social/screens/light", name + ".png")).toString("base64");
const topColour = async (name) => {
  const px = await sharp(path.join(ROOT, "mockups/social/screens/light", name + ".png"))
    .extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer();
  return `rgb(${px[0]},${px[1]},${px[2]})`;
};
const BAND = {};
for (const s of SLIDES) if (s.img) BAND[s.img] = await topColour(s.img);

const shiftCss = (m, w) => m.shift ? `transform:translateY(-${Math.round(m.shift * 2622 * (w / 1206))}px)` : "";
const words = (big, key) => big.split(" ").map((w) => {
  const hit = key && (w === key || w.replace(/[.,“”"]/g, "").toLowerCase() === key.replace(/[.,“”"]/g, "").toLowerCase());
  return `<span class="w${hit ? " k" : ""}">${w}</span>`;
}).join(" ");

/* the device, as in posts.mjs */
const phone = (m, w, extra = "") => {
  const bez = Math.round(w * 0.028), r = Math.round(w * 0.16), sw = w - 2 * bez;
  const band = Math.round(sw * 0.135), fs = Math.round(sw * 0.042);
  return `<div class="dev" style="width:${w}px;border-radius:${r}px;padding:${bez}px;${extra}">
    <i class="key kl1" style="top:${Math.round(w * 0.27)}px"></i>
    <i class="key kl2" style="top:${Math.round(w * 0.40)}px"></i>
    <i class="key kl3" style="top:${Math.round(w * 0.56)}px"></i>
    <i class="key kr" style="top:${Math.round(w * 0.45)}px"></i>
    <div class="scr" style="border-radius:${r - bez}px;background:${BAND[m.img]}">
      <div class="bar" style="height:${band}px;font-size:${fs}px">
        <span class="clock">9:41</span>
        <span class="right"><i class="sig"><b></b><b></b><b></b><b></b></i><i class="bat"></i></span>
      </div>
      <div class="app" style="top:${band}px"><img src="${shot(m.img)}" style="${shiftCss(m, sw)}"></div>
      <b class="isl" style="width:${Math.round(sw * 0.31)}px;height:${Math.round(sw * 0.092)}px;top:${Math.round(sw * 0.03)}px"></b>
    </div></div>`;
};

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; color:${INK}; }
  .slide { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  .kicker { position:absolute; left:84px; top:84px; font-weight:700; font-size:26px; letter-spacing:.14em; text-transform:uppercase; color:${BLUE}; }
  .count  { position:absolute; right:84px; top:84px; font-weight:600; font-size:26px; letter-spacing:.06em; color:#9aa0a8; }
  .head { position:absolute; left:84px; right:84px; }
  .big  { font-family:"Instrument Serif", Georgia, serif; font-weight:400; line-height:1.02; letter-spacing:-.012em; color:${INK}; text-wrap:balance; }
  .big .k { font-style:italic; color:${BLUE}; }
  .sub  { margin-top:26px; font-weight:500; line-height:1.4; color:${INK2}; }
  .url  { margin-top:36px; display:inline-block; font-weight:700; font-size:30px; letter-spacing:.005em; color:#fff;
          padding:18px 34px; border-radius:999px; background:${BLUE}; }
  .dev { position:absolute; left:50%; background:#0f1114;
         box-shadow:0 0 0 2px #2a2d33, 0 2px 0 3px rgba(255,255,255,.06) inset, 0 40px 90px rgba(20,22,24,.22), 0 12px 28px rgba(20,22,24,.14); }
  .scr { position:relative; overflow:hidden; aspect-ratio:1206/2622; }
  .app { position:absolute; left:0; right:0; bottom:0; overflow:hidden; }
  .app img { position:absolute; left:0; top:0; width:100%; display:block; }
  .bar { position:absolute; left:0; right:0; top:0; display:flex; align-items:center; justify-content:space-between;
         padding:0 9% 0 10%; color:${INK}; font-weight:700; letter-spacing:-.01em; }
  .bar .right { display:flex; align-items:center; gap:.35em; }
  .sig { display:inline-flex; align-items:flex-end; gap:.09em; height:.8em; }
  .sig b { display:block; width:.2em; background:${INK}; border-radius:.05em; }
  .sig b:nth-child(1){height:30%} .sig b:nth-child(2){height:50%} .sig b:nth-child(3){height:72%} .sig b:nth-child(4){height:100%}
  .bat { position:relative; display:inline-block; width:1.5em; height:.75em; border:.1em solid ${INK}; border-radius:.22em; opacity:.95; }
  .bat::before { content:""; position:absolute; left:.1em; top:.1em; bottom:.1em; width:70%; background:${INK}; border-radius:.1em; }
  .bat::after { content:""; position:absolute; right:-.28em; top:.2em; width:.14em; height:.35em; background:${INK}; border-radius:0 .1em .1em 0; }
  .isl { position:absolute; left:50%; transform:translateX(-50%); border-radius:999px; background:#000; }
  .key { position:absolute; width:4px; background:#2a2d33; border-radius:2px; }
  .kl1 { left:-4px; height:5%; } .kl2, .kl3 { left:-4px; height:9%; } .kr { right:-4px; height:14%; }
  .col { position:absolute; left:84px; width:372px; top:50%; transform:translateY(-50%); }
  .col .sub { margin-top:22px; line-height:1.38; }
  .swipe { position:absolute; left:84px; bottom:84px; font-weight:600; font-size:26px; letter-spacing:.06em; color:#9aa0a8; }
`;

const render = (m, i) => {
  const n = `${i + 1}/${SLIDES.length}`;
  if (m.kind === "cover" || m.kind === "closer") {
    return `<div class="slide">
      <div class="count">${n}</div>
      <div class="head" style="top:50%;transform:translateY(-50%)">
        <div class="big" style="font-size:${m.big.length > 30 ? 108 : 124}px">${words(m.big, m.key)}</div>
        <div class="sub" style="font-size:34px">${m.sub}</div>
        ${m.url ? `<div class="url">${URL_WAITLIST}</div>` : ""}</div>
      ${m.kind === "cover" ? `<div class="swipe">SWIPE →</div>` : ""}</div>`;
  }
  /* the WHOLE phone, nothing cut: 500 wide is 1054 tall, centred on the right;
     the words take the column on the left */
  const w = 500, ph = Math.round((w - 2 * Math.round(w * 0.028)) * 2622 / 1206) + 2 * Math.round(w * 0.028);
  const bigSize = m.big.length > 36 ? 58 : 66;
  return `<div class="slide">
    <div class="kicker">${m.kicker}</div><div class="count">${n}</div>
    <div class="col">
      <div class="big" style="font-size:${bigSize}px">${words(m.big, m.key)}</div>
      <div class="sub" style="font-size:25px">${m.sub}</div></div>
    ${phone(m, w, `left:auto;right:84px;top:${Math.round((H - ph) / 2)}px`)}</div>`;
};

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
for (const [i, m] of SLIDES.entries()) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
    <style>${css}</style></head><body>${render(m, i)}</body></html>`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
    .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
  await page.evaluateHandle("document.fonts.ready");
  const file = String(i + 1).padStart(2, "0") + ".png";
  await page.screenshot({ path: path.join(OUT, file), type: "png" });
  console.log("  " + file);
}
await browser.close();
console.log("wrote " + OUT);
