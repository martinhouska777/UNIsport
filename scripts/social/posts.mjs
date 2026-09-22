/*
  Single-image Instagram posts (1080x1350) and stories (1080x1920), one message
  each, in the dark look the owner picked for the reel and the carousel.

  Every line is the landing page's own wording (lib/landingCopy.ts and
  lib/waitlist.ts), not new copy: the site was reviewed word by word, the posts
  inherit that. The screens are the REAL dark captures from
  scripts/social/capture.mjs — nothing generated.

  Two rules from SOCIAL.md §7B carried in here:
    - no Varsity screens: the captures carry "Harvard Rowing", the shield and
      the squad's real names, none of which can go on a public account;
    - the student screens show the Harvard campus (its gyms, its colour), which
      is a fact about where the app opens first, not a claim of endorsement.

  The founder post is a TEMPLATE: a photo slot for the owner's own picture,
  which is added in the phone. Nothing else on it changes.

  Run: node scripts/social/posts.mjs            # everything
       node scripts/social/posts.mjs posts      # or: stories
  Out: mockups/social/posts/*.png, mockups/social/stories/*.png
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const LIFT = "#8ea4ff";
const HANDLE = "@unisportapp";
const URL_WAITLIST = "getunisport.com/waitlist";

const MARK = (a, b) => `<svg viewBox="0 0 100 100" class="mark">
  <path d="M28 34 V56 Q28 82 50 82" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="round"/>
  <path d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="28" cy="16" r="8.5" fill="${a}"/><circle cx="72" cy="16" r="8.5" fill="${b}"/></svg>`;

const shot = (name) =>
  "data:image/png;base64," + readFileSync(path.join(ROOT, "mockups/social/screens/dark", name + ".png")).toString("base64");

/* One message each. `big` is the headline, `key` the word that carries the
   accent, `sub` the supporting line, `img` the screen. */
const MESSAGES = [
  { id: "01-waitlist", img: "match", kicker: "The waitlist",
    big: "Get in on day one.", key: "one",
    sub: "UNIsport opens at Harvard first, to everyone on this list at once — so the first morning isn't an empty gym.",
    url: true },
  { id: "02-campus", img: "gyms", kicker: "UNIsport",
    big: "Your campus. Your gym. Your people.", key: "people",
    sub: "Find every gym on campus. Match with students verified by their .edu email. Plan the session in the chat. Log it together." },
  { id: "03-match", img: "match", kicker: "Match",
    big: "Find training partners. Make friends.", key: "friends",
    sub: "Browse sorts everyone by how well you fit with them, based on interests, concentration, experience and hours." },
  { id: "04-why", img: "person", kicker: "Why you match",
    big: "Find your ideal training partner.", key: "ideal",
    sub: "Get matched with people based on your interests, hobbies, concentrations, level, language, hometown or much more." },
  /* shift: how much of the top of the screen to skip. The chat is shot
     scrolled to its end, and the plan card near the bottom IS the message. */
  { id: "05-plan", img: "chat", kicker: "Plan", shift: 0.36,
    big: "Plan sessions easily in the chat.", key: "chat",
    sub: "You send a card with the gym, the day and the time, and once the other one accepts it goes to both calendars." },
  { id: "06-profile", img: "profile", kicker: "Profile",
    big: "See how you do in the leaderboards.", key: "leaderboards",
    sub: "Your profile counts the sessions you logged and the partners you trained with." },
  { id: "07-gyms", img: "gyms", kicker: "Gyms",
    big: "See every gym on your campus in one place.", key: "every",
    sub: "Explore what equipment each gym has, its rating and how busy it is." },
  { id: "08-founder", kind: "founder", kicker: "Who's behind this",
    big: "Why I built it.", key: "built",
    sub: "I often found myself in a situation where I didn't have somebody to go work out with.",
    by: "Martin Houska, founder" },
];

/* the capture is 1206 px wide; at `w` px the skipped part is shift * height */
const shiftCss = (m, w) => m.shift ? `transform:translateY(-${Math.round(m.shift * 2622 * (w / 1206))}px)` : "";

const words = (big, key) => big.split(" ").map((w) => {
  const bare = w.replace(/[.,]/g, "");
  const hit = key && bare.toLowerCase() === key.toLowerCase();
  return `<span class="w${hit ? " k" : ""}">${w}${hit ? '<i class="ul"></i>' : ""}</span>`;
}).join(" ");

const css = (W, H) => `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  .slide { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  .amb { position:absolute; inset:0;
         background:radial-gradient(62% 40% at 50% 30%, rgba(46,66,170,.30) 0%, rgba(12,17,50,.10) 45%, rgba(0,0,0,0) 72%); }

  .top { position:absolute; left:84px; right:84px; top:84px; display:flex; align-items:center; justify-content:space-between; }
  .brand { display:flex; align-items:center; gap:18px; }
  .brand .mark { width:64px; height:64px; overflow:visible; filter:drop-shadow(0 0 22px rgba(142,164,255,.5)); }
  .brand b { font-weight:800; font-size:34px; letter-spacing:-.03em; color:#fff; }
  .handle { font-weight:600; font-size:26px; letter-spacing:.02em; color:rgba(220,229,255,.5); }

  .head { position:absolute; left:84px; right:84px; }
  .kick { font-weight:700; font-size:25px; letter-spacing:.2em; text-transform:uppercase; color:${LIFT}; opacity:.85; margin-bottom:26px; }
  .big  { font-style:italic; font-weight:800; line-height:1.08; letter-spacing:-.03em; color:#fff; text-wrap:balance;
          text-shadow:0 0 44px rgba(130,160,255,.42); }
  .big .w { display:inline-block; position:relative; }
  .big .k { color:${LIFT}; text-shadow:0 0 38px rgba(142,164,255,.8); }
  .big .ul { position:absolute; left:2%; bottom:-.14em; width:96%; height:.09em; border-radius:6px; background:${LIFT}; box-shadow:0 0 24px ${LIFT}; }
  .sub  { margin-top:28px; font-weight:500; line-height:1.38; color:rgba(220,229,255,.82); }
  .url  { margin-top:30px; display:inline-block; font-weight:700; font-size:31px; letter-spacing:.01em; color:#fff;
          padding:18px 34px; border-radius:999px; background:rgba(142,164,255,.14);
          box-shadow:inset 0 0 0 2px rgba(142,164,255,.55), 0 0 40px rgba(142,164,255,.25); }

  .phone { position:absolute; left:50%; border-radius:54px; overflow:hidden; background:#000;
           box-shadow:0 0 0 2px rgba(160,180,255,.22), 0 60px 130px rgba(0,0,0,.92); }
  .phone img { position:absolute; left:0; top:0; width:100%; filter:brightness(1.08) contrast(1.06); }
  .phone img.shift { top:auto; }
  .halo { position:absolute; left:50%; filter:blur(90px) saturate(.9); opacity:.26; }
  .halo img { width:100%; }

  /* the founder post: a slot the owner's own photo goes into, in the phone */
  .photo { position:absolute; left:84px; right:84px; border-radius:44px;
           background:linear-gradient(180deg, rgba(142,164,255,.10), rgba(142,164,255,.03));
           box-shadow:inset 0 0 0 2px rgba(160,180,255,.28), 0 40px 100px rgba(0,0,0,.8); overflow:hidden; }
  .photo::after { content:""; position:absolute; inset:0; border-radius:44px;
           background:radial-gradient(60% 50% at 50% 40%, rgba(142,164,255,.16), transparent 70%); }
  .by { margin-top:26px; font-weight:600; font-size:27px; letter-spacing:.02em; color:${LIFT}; }
  .quote .sub { font-style:italic; }

  /* stories: the top 250 px and the bottom 340 px are Instagram's own bars, so
     nothing that matters sits there; the link sticker goes over the phone. */
`;

const brand = () => `<div class="top"><div class="brand">${MARK("#ffffff", LIFT)}<b>UNIsport</b></div><div class="handle">${HANDLE}</div></div>`;

/* 4:5 post */
const post = (m) => {
  const W = 1080, H = 1350;
  if (m.kind === "founder") {
    return `<div class="slide"><div class="amb"></div>${brand()}
      <div class="photo" style="top:210px;height:620px"></div>
      <div class="head quote" style="top:880px">
        <div class="kick">${m.kicker}</div>
        <div class="big" style="font-size:78px">${words(m.big, m.key)}</div>
        <div class="sub" style="font-size:31px">“${m.sub}”</div>
        <div class="by">${m.by}</div></div></div>`;
  }
  const src = shot(m.img);
  const bigSize = m.big.length > 34 ? 66 : 76;
  const top = m.url ? 680 : 640;
  return `<div class="slide"><div class="amb"></div>${brand()}
    <div class="head" style="top:214px"><div class="kick">${m.kicker}</div>
      <div class="big" style="font-size:${bigSize}px">${words(m.big, m.key)}</div>
      <div class="sub" style="font-size:31px">${m.sub}</div>
      ${m.url ? `<div class="url">${URL_WAITLIST}</div>` : ""}</div>
    <div class="halo" style="top:${top}px;margin-left:-310px;width:620px;height:${H - top}px"><img src="${src}"></div>
    <div class="phone" style="top:${top}px;margin-left:-310px;width:620px;height:${H - top + 60}px"><img src="${src}" style="${shiftCss(m, 620)}"></div></div>`;
};

/* 9:16 story */
const story = (m) => {
  const W = 1080, H = 1920;
  if (m.kind === "founder") {
    return `<div class="slide"><div class="amb"></div>
      <div style="position:absolute;left:84px;right:84px;top:250px">${brand().replace('class="top"', 'class="top" style="position:static"')}</div>
      <div class="photo" style="top:370px;height:760px"></div>
      <div class="head quote" style="top:1180px">
        <div class="kick">${m.kicker}</div>
        <div class="big" style="font-size:78px">${words(m.big, m.key)}</div>
        <div class="sub" style="font-size:31px">“${m.sub}”</div>
        <div class="by">${m.by}</div></div></div>`;
  }
  const src = shot(m.img);
  const bigSize = m.big.length > 34 ? 68 : 80;
  return `<div class="slide"><div class="amb"></div>
    <div style="position:absolute;left:84px;right:84px;top:250px">${brand().replace('class="top"', 'class="top" style="position:static"')}</div>
    <div class="head" style="top:370px"><div class="kick">${m.kicker}</div>
      <div class="big" style="font-size:${bigSize}px">${words(m.big, m.key)}</div>
      <div class="sub" style="font-size:31px">${m.sub}</div>
      ${m.url ? `<div class="url">${URL_WAITLIST}</div>` : ""}</div>
    <div class="halo" style="top:820px;margin-left:-300px;width:600px;height:740px"><img src="${src}"></div>
    <div class="phone" style="top:820px;margin-left:-300px;width:600px;height:${H - 820 + 60}px"><img src="${src}" style="${shiftCss(m, 600)}"></div></div>`;
};

const which = process.argv[2] || "all";
const JOBS = [];
if (which === "all" || which === "posts") JOBS.push({ dir: "mockups/social/posts", W: 1080, H: 1350, render: post });
if (which === "all" || which === "stories") JOBS.push({ dir: "mockups/social/stories", W: 1080, H: 1920, render: story });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
for (const job of JOBS) {
  const out = path.join(ROOT, job.dir);
  mkdirSync(out, { recursive: true });
  await page.setViewport({ width: job.W, height: job.H, deviceScaleFactor: 1 });
  for (const m of MESSAGES) {
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,500;0,600;0,700;0,800;1,500;1,700;1,800&display=swap" rel="stylesheet">
      <style>${css(job.W, job.H)}</style></head><body>${job.render(m)}</body></html>`, { waitUntil: "load", timeout: 60000 });
    await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
      .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
    await page.evaluateHandle("document.fonts.ready");
    await page.screenshot({ path: path.join(out, m.id + ".png"), type: "png" });
    console.log("  " + job.dir + "/" + m.id + ".png");
  }
}
await browser.close();
