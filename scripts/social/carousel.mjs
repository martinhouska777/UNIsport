/*
  Builds an Instagram carousel (1080x1350, 4:5) as PNG slides.

  Same visual language as the reel in scripts/video/reel.mjs — near-black,
  one glow as the only light, italic kinetic type with the key word underlined
  in the accent blue. A carousel is read, not watched, so the motion is gone
  and the type is doing the work: kicker, one line, one supporting line, and
  the real screen underneath bleeding off the bottom edge.

  The screens are REAL dark captures from public/landing/dark/. Nothing here is
  generated; AI models do not preserve a UI.

  The schools slide shows all eight Ivy themes. That is the white-label story,
  and it stops the set reading as one university's app (SOCIAL.md 7B: never
  imply Harvard uses UNIsport).

  Run: node scripts/social/carousel.mjs
  Out: mockups/social/carousel/01.png … 07.png
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");

const W = 1080, H = 1350;

/* Brand — app/globals.css */
const LIFT = "#8ea4ff";   // the brand blue, lifted enough to glow on black

/* The mark, on a 100 x 100 box: a U split down the middle, each half a person.
   Same geometry as mockups/logo/_icons.mjs — change it there and here together. */
const MARK = (a, b) => `<svg viewBox="0 0 100 100" class="mark">
  <path d="M28 34 V56 Q28 82 50 82" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="round"/>
  <path d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="28" cy="16" r="8.5" fill="${a}"/><circle cx="72" cy="16" r="8.5" fill="${b}"/></svg>`;

const SCHOOLS = [
  ["harvard", "Harvard"], ["yale", "Yale"], ["princeton", "Princeton"], ["penn", "Penn"],
  ["brown", "Brown"], ["columbia", "Columbia"], ["cornell", "Cornell"], ["dartmouth", "Dartmouth"],
];

const uri = (rel) =>
  "data:image/webp;base64," + readFileSync(path.join(ROOT, "public/landing", rel)).toString("base64");

const SLIDES = [
  { kind: "cover",
    big: "Never train alone again.", key: "alone",
    sub: "The app that finds you someone to train with at college." },

  { kind: "shot", kicker: "01  Match", img: "dark/02-match.webp",
    big: "Sorted by how well you fit.", key: "fit",
    sub: "Interests, concentration, gym and hours, not just who happens to be free." },

  { kind: "shot", kicker: "02  Plan", img: "dark/04-plan-a-session.webp",
    big: "Plan it in the chat.", key: "chat",
    sub: "They accept once, and it is in both of your calendars." },

  { kind: "shot", kicker: "03  Profile", img: "dark/tall-profile.webp",
    big: "See where you rank.", key: "rank",
    sub: "Every session you log marks its day, and counts on the campus board." },

  { kind: "shot", kicker: "04  Gyms", img: "dark/01-gyms.webp",
    big: "Every gym on campus.", key: "Every",
    sub: "The equipment, the rating, and how busy it is right now." },

  { kind: "grid", kicker: "05  Your campus",
    big: "Eight campuses. Each its own.", key: "Eight",
    sub: "Your .edu decides which one you see." },

  { kind: "cta" },
];

/* Words are separate spans so the keyed one can carry the accent colour and
   the drawn underline, exactly as in the reel. */
const words = (big, key) => big.split(" ").map((w) => {
  const bare = w.replace(/[.,]/g, "");
  const hit = key && bare.toLowerCase() === key.toLowerCase();
  return `<span class="w${hit ? " k" : ""}">${w}${hit ? '<i class="ul"></i>' : ""}</span>`;
}).join(" ");

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  .slide { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  .amb { position:absolute; inset:0;
         background:radial-gradient(62% 40% at 50% 26%, rgba(46,66,170,.30) 0%, rgba(12,17,50,.10) 45%, rgba(0,0,0,0) 72%); }

  .head { position:absolute; left:84px; right:84px; top:96px; }
  .kick { font-weight:700; font-size:25px; letter-spacing:.2em; text-transform:uppercase;
          color:${LIFT}; opacity:.85; margin-bottom:26px; }
  .big  { font-style:italic; font-weight:800; font-size:70px; line-height:1.08; letter-spacing:-.03em;
          color:#fff; text-wrap:balance; text-shadow:0 0 44px rgba(130,160,255,.42); }
  .big .w { display:inline-block; position:relative; }
  .big .k { color:${LIFT}; text-shadow:0 0 38px rgba(142,164,255,.8); }
  .big .ul { position:absolute; left:2%; bottom:-.14em; width:96%; height:7px; border-radius:6px;
             background:${LIFT}; box-shadow:0 0 24px ${LIFT}; }
  .sub  { margin-top:26px; font-weight:500; font-size:31px; line-height:1.38; letter-spacing:-.004em;
          color:rgba(220,229,255,.82); max-width:880px; }

  /* the real screen, bleeding off the bottom edge: the header of each screen
     is the part that says what it is, so the top is what must be visible */
  .phone { position:absolute; left:50%; margin-left:-310px; width:620px; height:1020px;
           border-radius:44px; overflow:hidden; background:#000;
           box-shadow:0 0 0 2px rgba(160,180,255,.22), 0 60px 130px rgba(0,0,0,.92); }
  .phone img { position:absolute; left:0; top:0; width:100%;
               filter:brightness(1.12) contrast(1.08); }
  .halo { position:absolute; left:50%; margin-left:-310px; width:620px; height:1020px;
          filter:blur(90px) saturate(.9); opacity:.26; }
  .halo img { width:100%; }

  .grid { position:absolute; left:84px; right:84px; top:618px;
          display:grid; grid-template-columns:repeat(4,1fr); gap:26px; }
  /* cropped to the top of each screen: the header and the first cards are
     where a school's colour actually shows, and two full phones would not fit */
  .cell img { width:100%; height:300px; object-fit:cover; object-position:50% 0;
              border-radius:18px; display:block;
              box-shadow:0 0 0 1.5px rgba(160,180,255,.22), 0 20px 44px rgba(0,0,0,.8);
              filter:brightness(1.12) contrast(1.06); }
  .cell span { display:block; margin-top:14px; text-align:center; font-weight:600; font-size:23px;
               color:rgba(220,229,255,.78); }

  .mark { width:100%; height:100%; overflow:visible;
          filter:drop-shadow(0 0 34px rgba(142,164,255,.55)); }
  .centre { position:absolute; inset:0; display:flex; flex-direction:column;
            align-items:center; justify-content:center; text-align:center; }
  .cmark { width:260px; height:260px; }
  .wordmark { margin-top:34px; font-weight:800; font-size:86px; letter-spacing:-.035em; color:#fff;
              text-shadow:0 0 46px rgba(130,160,255,.5); }
  .url { margin-top:18px; font-weight:600; font-size:34px; letter-spacing:.02em; color:${LIFT}; }
  .edu { margin-top:52px; font-weight:500; font-size:29px; color:rgba(220,229,255,.7); }

  .covermark { position:absolute; left:84px; top:92px; width:96px; height:96px; }
  .swipe { position:absolute; left:0; right:0; bottom:74px; text-align:center;
           font-weight:700; font-size:27px; letter-spacing:.2em; text-transform:uppercase;
           color:rgba(220,229,255,.55); }
  .pager { position:absolute; right:84px; top:104px; font-weight:700; font-size:26px;
           letter-spacing:.14em; color:rgba(220,229,255,.42); }
`;

const body = (s, i, n) => {
  if (s.kind === "cover") {
    /* The cover is the only slide that has to earn the swipe, so it carries a
       screen too — type alone left half the frame empty in the feed. */
    const src = uri("dark/02-match.webp");
    return `<div class="slide"><div class="amb"></div>
      <div class="covermark">${MARK("#ffffff", LIFT)}</div>
      <div class="head" style="top:258px">
        <div class="big" style="font-size:92px">${words(s.big, s.key)}</div>
        <div class="sub" style="font-size:34px;margin-top:34px">${s.sub}</div>
        <div class="swipe" style="position:static;text-align:left;margin-top:36px">Swipe →</div>
      </div>
      <div class="halo" style="top:800px"><img src="${src}"></div>
      <div class="phone" style="top:800px"><img src="${src}"></div></div>`;
  }
  if (s.kind === "cta") {
    return `<div class="slide"><div class="amb"></div><div class="centre">
      <div class="cmark">${MARK("#ffffff", LIFT)}</div>
      <div class="wordmark">UNIsport</div>
      <div class="url">getunisport.com</div>
      <div class="edu">Sign in with your .edu</div>
    </div></div>`;
  }
  if (s.kind === "grid") {
    const cells = SCHOOLS.map(([slug, name]) =>
      `<div class="cell"><img src="${uri("dark/closers/match-" + slug + ".webp")}"><span>${name}</span></div>`).join("");
    return `<div class="slide"><div class="amb"></div>
      <div class="pager">${i + 1}/${n}</div>
      <div class="head"><div class="kick">${s.kicker}</div>
        <div class="big">${words(s.big, s.key)}</div>
        <div class="sub">${s.sub}</div></div>
      <div class="grid">${cells}</div></div>`;
  }
  const src = uri(s.img);
  return `<div class="slide"><div class="amb"></div>
    <div class="pager">${i + 1}/${n}</div>
    <div class="head"><div class="kick">${s.kicker}</div>
      <div class="big">${words(s.big, s.key)}</div>
      <div class="sub">${s.sub}</div></div>
    <div class="halo" style="top:560px"><img src="${src}"></div>
    <div class="phone" style="top:560px"><img src="${src}"></div></div>`;
};

const out = path.join(ROOT, "mockups/social/carousel");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

for (let i = 0; i < SLIDES.length; i++) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet">
    <style>${css}</style></head><body>${body(SLIDES[i], i, SLIDES.length)}</body></html>`,
    { waitUntil: "load", timeout: 60000 });
  /* networkidle0 stalls here: the font stylesheet keeps a socket warm across
     repeated setContent calls. Wait on the two things that actually matter. */
  await page.evaluate(() => Promise.all(
    Array.from(document.images).filter((im) => !im.complete)
      .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))
  ));
  await page.evaluateHandle("document.fonts.ready");
  await page.screenshot({ path: path.join(out, String(i + 1).padStart(2, "0") + ".png"), type: "png" });
  console.log("  slide " + (i + 1) + "/" + SLIDES.length);
}
await browser.close();
console.log("\nwrote " + out);
