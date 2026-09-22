/*
  Single-image Instagram posts (1080x1350) and stories (1080x1920): the app's
  real screen inside a phone, on white. One message each.

  2026-09-22, the owner on the first (black, glowing, logo-in-the-corner)
  version: "why is it black? make it look like a phone and make it white. Don't
  put the logo there." So: a white ground, a drawn device — bezel, island, side
  keys — with the LIGHT capture inside, the website's own headline above it in
  the website's own face (Instrument Serif, the accent word italic in the brand
  blue), and nothing else. No mark, no handle. The dark version is in git
  history (da2b39a) if it is ever wanted again.

  Every line is the landing page's wording (lib/landingCopy.ts,
  lib/waitlist.ts). Screens come from scripts/social/capture.mjs (light).
  Varsity screens are not here: they carry the squad's real names (SOCIAL.md
  §7B).

  Also the PHONES on their own — the device with each screen in it, whole,
  on a transparent ground — for the owner's videos: he drops one into CapCut
  over his footage or a white slide and moves it where he wants.

  Run: node scripts/social/posts.mjs            # everything
       node scripts/social/posts.mjs posts      # or: stories, phones
  Out: mockups/social/posts/*.png, mockups/social/stories/*.png,
       mockups/social/phones/<screen>.png (1080 x 2300, transparent)
*/
import puppeteer from "puppeteer-core";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");

/* Zone 1 neutral brand — app/globals.css. No school colour in brand material. */
const INK = "#141618";
const INK2 = "#3b3f47";
const BLUE = "#1f32c1";
const URL_WAITLIST = "getunisport.com/waitlist";

const shot = (name) =>
  "data:image/png;base64," + readFileSync(path.join(ROOT, "mockups/social/screens/light", name + ".png")).toString("base64");

/* The capture has NO status bar — a web app starts at the very top of the
   viewport — but a phone shows it under the clock and the battery. So the
   screen gets a status band the colour of its own top edge, and the island
   sits in that band instead of on the app's header. */
const topColour = async (name) => {
  const px = await sharp(path.join(ROOT, "mockups/social/screens/light", name + ".png"))
    .extract({ left: 4, top: 4, width: 1, height: 1 }).raw().toBuffer();
  return `rgb(${px[0]},${px[1]},${px[2]})`;
};

/* `big` is the headline, `key` the word set in italic blue, `sub` the line
   under it, `img` the screen. `shift` skips that much of the top of a screen
   (the chat is shot scrolled to its end; the plan card near the bottom IS the
   message). */
const MESSAGES = [
  { id: "01-waitlist", img: "match",
    big: "Get in on day one.", key: "one",
    sub: "UNIsport opens at Harvard first, to everyone on this list at once — so the first morning isn't an empty gym.",
    url: true },
  { id: "02-campus", img: "gyms",
    big: "Your campus. Your gym. Your people.", key: "people.",
    sub: "Find every gym on campus. Match with students verified by their .edu email. Plan the session in the chat. Log it together." },
  { id: "03-match", img: "match",
    big: "Find training partners. Make friends.", key: "friends",
    sub: "Browse sorts everyone by how well you fit with them, based on interests, concentration, experience and hours." },
  { id: "04-why", img: "person",
    big: "Find your ideal training partner.", key: "ideal",
    sub: "Get matched with people based on your interests, hobbies, concentrations, level, language, hometown or much more." },
  { id: "05-plan", img: "chat", shift: 0.36,
    big: "Plan sessions easily in the chat.", key: "chat",
    sub: "You send a card with the gym, the day and the time, and once the other one accepts it goes to both calendars." },
  { id: "06-profile", img: "profile",
    big: "See how you do in the leaderboards.", key: "leaderboards",
    sub: "Your profile counts the sessions you logged and the partners you trained with." },
  { id: "07-gyms", img: "gyms",
    big: "See every gym on your campus in one place.", key: "every",
    sub: "Explore what equipment each gym has, its rating and how busy it is." },
  { id: "08-founder", kind: "founder",
    big: "Why I built it.", key: "built",
    sub: "I often found myself in a situation where I didn't have somebody to go work out with.",
    by: "Martin Houska, founder" },
];

const BAND = {};
for (const f of readdirSync(path.join(ROOT, "mockups/social/screens/light"))) if (f.endsWith(".png")) BAND[f.slice(0, -4)] = await topColour(f.slice(0, -4));

/* the capture is 1206 px wide; at `w` px the skipped part is shift * height */
const shiftCss = (m, w) => m.shift ? `transform:translateY(-${Math.round(m.shift * 2622 * (w / 1206))}px)` : "";

const words = (big, key) => big.split(" ").map((w) => {
  const bare = w.replace(/[.,]/g, "");
  const hit = key && (w === key || bare.toLowerCase() === key.toLowerCase());
  return `<span class="w${hit ? " k" : ""}">${w}</span>`;
}).join(" ");

/* THE PHONE. A drawn device: a near-black bezel, the screen with its own
   corner radius inside it, the island, and the side keys. `w` is the outer
   width; everything else is in proportion to an iPhone 15 Pro. */
const phone = (m, w, extra = "") => {
  const bez = Math.round(w * 0.028);
  const r = Math.round(w * 0.16);
  const sw = w - 2 * bez;
  const band = Math.round(sw * 0.135);          // the status bar, 54 of 402 CSS px
  const fs = Math.round(sw * 0.042);
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

const css = (W, H) => `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; color:${INK}; }
  .slide { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#fff; }

  .head { position:absolute; left:84px; right:84px; }
  .big  { font-family:"Instrument Serif", Georgia, serif; font-weight:400; line-height:1.02; letter-spacing:-.012em; color:${INK}; text-wrap:balance; }
  .big .k { font-style:italic; color:${BLUE}; }
  .sub  { margin-top:26px; font-weight:500; line-height:1.4; color:${INK2}; }
  .url  { margin-top:30px; display:inline-block; font-weight:700; font-size:30px; letter-spacing:.005em; color:#fff;
          padding:18px 34px; border-radius:999px; background:${BLUE}; }
  .by   { margin-top:24px; font-weight:600; font-size:26px; letter-spacing:.01em; color:${BLUE}; }
  .quote .sub { font-style:italic; }

  .dev { position:absolute; left:50%; background:#0f1114;
         box-shadow:0 0 0 2px #2a2d33, 0 2px 0 3px rgba(255,255,255,.06) inset,
                    0 40px 90px rgba(20,22,24,.22), 0 12px 28px rgba(20,22,24,.14); }
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

  .photo { position:absolute; left:84px; right:84px; border-radius:40px; background:#ebf0f6;
           box-shadow:inset 0 0 0 2px #dee3e9; }
`;

/* 4:5 post — text on top, the phone below it, running off the bottom edge */
const post = (m) => {
  const H = 1350;
  if (m.kind === "founder") {
    return `<div class="slide">
      <div class="photo" style="top:84px;height:700px"></div>
      <div class="head quote" style="top:840px">
        <div class="big" style="font-size:96px">${words(m.big, m.key)}</div>
        <div class="sub" style="font-size:31px">“${m.sub}”</div>
        <div class="by">${m.by}</div></div></div>`;
  }
  const bigSize = m.big.length > 34 ? 84 : 96;
  const top = m.url ? 620 : 560;
  const w = 640;
  return `<div class="slide">
    <div class="head" style="top:96px">
      <div class="big" style="font-size:${bigSize}px">${words(m.big, m.key)}</div>
      <div class="sub" style="font-size:31px">${m.sub}</div>
      ${m.url ? `<div class="url">${URL_WAITLIST}</div>` : ""}</div>
    ${phone(m, w, `top:${top}px;margin-left:-${w / 2}px`)}</div>`;
};

/* 9:16 story — Instagram's own bars take the top 250 and bottom 340 px, so
   the words start under the first and the phone runs out under the second */
const story = (m) => {
  if (m.kind === "founder") {
    return `<div class="slide">
      <div class="photo" style="top:300px;height:820px"></div>
      <div class="head quote" style="top:1180px">
        <div class="big" style="font-size:96px">${words(m.big, m.key)}</div>
        <div class="sub" style="font-size:31px">“${m.sub}”</div>
        <div class="by">${m.by}</div></div></div>`;
  }
  const bigSize = m.big.length > 34 ? 88 : 100;
  const w = 720;
  return `<div class="slide">
    <div class="head" style="top:300px">
      <div class="big" style="font-size:${bigSize}px">${words(m.big, m.key)}</div>
      <div class="sub" style="font-size:32px">${m.sub}</div>
      ${m.url ? `<div class="url">${URL_WAITLIST}</div>` : ""}</div>
    ${phone(m, w, `top:${m.url ? 840 : 780}px;margin-left:-${w / 2}px`)}</div>`;
};

/* the phone alone, whole, transparent. No shift: in a video the whole screen
   is wanted, and he scrolls nothing. */
const PHONES = readdirSync(path.join(ROOT, "mockups/social/screens/light")).filter((f) => f.endsWith(".png"))
  .map((f) => f.slice(0, -4)).map((img) => ({ id: img, img }));
const alone = (m) => `<div class="slide" style="background:transparent">${phone(m, 960, "top:60px;margin-left:-480px")}</div>`;

const which = process.argv[2] || "all";
const JOBS = [];
if (which === "all" || which === "posts") JOBS.push({ dir: "mockups/social/posts", W: 1080, H: 1350, render: post });
if (which === "all" || which === "stories") JOBS.push({ dir: "mockups/social/stories", W: 1080, H: 1920, render: story });
if (which === "all" || which === "phones") JOBS.push({ dir: "mockups/social/phones", W: 1080, H: 2300, render: alone, list: PHONES, alpha: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
for (const job of JOBS) {
  const out = path.join(ROOT, job.dir);
  mkdirSync(out, { recursive: true });
  await page.setViewport({ width: job.W, height: job.H, deviceScaleFactor: 1 });
  for (const m of job.list || MESSAGES) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;1,500&display=swap" rel="stylesheet">
      <style>${css(job.W, job.H)}${job.alpha ? "html,body{background:transparent}" : ""}</style></head><body>${job.render(m)}</body></html>`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
      .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
    await page.evaluateHandle("document.fonts.ready");
    await page.screenshot({ path: path.join(out, m.id + ".png"), type: "png", omitBackground: !!job.alpha });
    console.log("  " + job.dir + "/" + m.id + ".png");
  }
}
await browser.close();
