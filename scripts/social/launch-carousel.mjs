/*
  THE LAUNCH CAROUSEL: the website's front door, retold for Instagram.
  v2 (2026-09-27). The owner, on v1: "make it how you think it would look best,
  and no AI slop". So v2 takes out everything that reads as a template: the
  glow behind the phones, the pastel icon tiles and the four-bullet lists.
  Each feature slide now says ONE thing and proves it with the app itself:
  the piece of the screen the sentence is about is lifted out of the phone
  and shown bigger beside it (the "Why you match" list, the plan in the chat,
  your place on the leaderboard), because a phone at Instagram size is too
  small to read, and a real sentence from the app is what makes it not slop.

  8 slides, 1080x1350 (4:5), white:
    1    the intro: "Your campus. Your gym. Your people." with Gyms standing
         behind Match, the way the intro stands them
    2-6  Gyms, Match, Why you match, Plan, Profile: a headline, one line, the
         phone whole on the right and its card lifted out on the left
    7    Campus Colours: the same Gyms screen in three schools' colours
    8    the waitlist, in the waitlist page's own words

  EVERY WORD IS THE WEBSITE'S (lib/landingCopy.ts, lib/waitlist.ts), the rule
  since 2026-09-22 ("use the tone from my website so it's not generic AI
  slop"). Left out on purpose, because the app does not do them today: "How
  busy" (cut 2026-09-22), "Connect it to Google or Apple Calendar" (not built),
  and the hero's "students verified by their .edu email" (sign-up asks for a
  .edu address but does not check it yet: db/auth_autoconfirm.sql).

  The device is the website's phone (components/landing/Phone.tsx): metal rim,
  black bezel, a status-bar row, the app's capture WHOLE, a gesture-bar row.
  No logo, no handle (the owner's rule for posts).

  Screens: mockups/social/screens/launch/<name>.png + .json when they exist
  (scripts/social/capture-launch.mjs, fresh, with every card's box), else
  mockups/social/screens/light (capture.mjs) with the boxes measured below.
  Slide 7 uses the site's own per-school frames (public/landing/closers).

  Run: node scripts/social/launch-carousel.mjs
  Out: mockups/social/launch/01.png … 08.png, and sheet.png with all eight
*/
import puppeteer from "puppeteer-core";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const OUT = path.join(ROOT, "mockups/social/launch");
mkdirSync(OUT, { recursive: true });

/* 3:4, Instagram's full-height post since May 2025: the profile grid shows
   3:4 since January 2025, so a 3:4 cover is not cropped there, and the extra
   90px is height for the phones. Posted from the Instagram app, not through a
   scheduler: Meta's publishing API still takes 4:5 at most. */
const W = 1080, H = 1440, M = 84;
/* the landing page's own colours (app/globals.css, --color-l-*) */
const INK = "#141618", INK2 = "#4b4f53", BLUE = "#1f32c1";
const BLUE_DIM = "rgba(31,50,193,.08)", BLUE_SOFT = "rgba(31,50,193,.2)";
/* the intro's italic line takes the school on its phones (lib/landingSchools.ts) */
const CRIMSON = "#a51c30";

const SLIDES = [
  /* hero: badge, headline (`hero`) */
  { kind: "hero", badge: "Free for students", lines: ["Your campus.", "Your gym."], em: "Your people." },

  /* `storyBeats`, `studentFeatures` and `hero.body`, word for word; the italic
     half of each head is this carousel's, the words are the site's.
     In the student story's order (Match, Plan, Profile, Gyms), which also
     puts the strongest slide second: Instagram often shows a carousel a
     second time starting at slide 2 to someone who scrolled past it
     (Mosseri, 2024), so slide 2 has to hook on its own. */
  { kind: "feature", kicker: "01 · Match", head: "Find training partners.", em: "Make friends.",
    sub: "Everyone sorted by how well you fit: interests, concentration, level and hours.",
    img: "match", pops: [{ card: /Leah Goldberg/, w: 480 }] },
  { kind: "feature", kicker: "02 · Why you match", head: "Find your ideal", em: "training partner.",
    sub: "Get matched with people based on your interests, hobbies, concentrations, level, language, hometown or much more.",
    img: "person", pops: [{ card: /why you match/i, w: 700 }] },
  { kind: "feature", kicker: "03 · Plan", head: "Plan the session", em: "in the chat.",
    sub: "Once they accept, it goes into both of your calendars.",
    img: "chat", pops: [{ card: /session plan/i, w: 720, at: "middle" }] },
  { kind: "feature", kicker: "04 · Profile", head: "Track your statistics.", em: "See how you do in the leaderboards.",
    sub: "Your profile counts the sessions you logged and the partners you trained with.",
    img: "profile", pops: [{ card: /workouts/i, w: 640 }, { card: /leaderboards/i, w: 700 }] },
  { kind: "feature", kicker: "05 · Gyms", head: "See every gym on your campus", em: "in one place.",
    img: "gyms", pops: [{ card: /Malkin Athletic Center/, w: 700 }, { card: /Adams/, w: 700 }] },

  /* Campus Colours (`closers.campus`) */
  { kind: "colours", head: "Your campus,", em: "your colours.", sub: "The app is customized to your university, gyms and colours.",
    schools: ["yale", "harvard", "dartmouth"] },

  /* the waitlist page (lib/waitlist.ts): headline, body, and the bio link */
  { kind: "closer", head: "Get in on", em: "day one.", sub: "UNIsport opens at Harvard first. Get an email when the app launches.",
    url: "getunisport.com/waitlist" },
];

/* ── the screens ── */
const FRESH = path.join(ROOT, "mockups/social/screens/launch");
const OLD = path.join(ROOT, "mockups/social/screens/light");
/* The cards on the older captures (1206 x 2622): x, y, w, h and the corner,
   in capture pixels, read off each card's 3px border by scanning the PNG's
   pixels. Only used when there is no fresh capture with its own .json. */
const MEASURED = {
  gyms: [
    { text: "Malkin Athletic Center 39 Holyoke Street Open now · closes 11pm", x: 36, y: 399, w: 1134, h: 400, radius: 48 },
    { text: "Adams Open 24/7", x: 36, y: 1798, w: 1134, h: 332, radius: 48 },
  ],
  match: [{ text: "Strong fit LG Leah Goldberg Sr · Eliot · Lifts View profile", x: 36, y: 318, w: 555, h: 789, radius: 48 }],
  person: [{ text: "Why you match You both lift", x: 42, y: 858, w: 1122, h: 627, radius: 48 }],
  chat: [{ text: "Session plan Gym Thu, Sep 17 · 8:00 AM Malkin Athletic Center Accept Decline", x: 108, y: 1581, w: 990, h: 525, radius: 48 }],
  profile: [
    /* the header is a band, not a card: cut round the photo, the name and the three counts */
    { text: "Jonas Keller 40 Workouts 6 Partners 13 Followers", x: 0, y: 166, w: 1206, h: 296, radius: 48 },
    { text: "Leaderboards 5th Adams #44 Campus Log", x: 42, y: 822, w: 1122, h: 225, radius: 48 },
  ],
};
const b64 = (file) => "data:image/png;base64," + readFileSync(file).toString("base64");
const SCREEN = {};
const load = async (name) => {
  if (SCREEN[name]) return SCREEN[name];
  const fresh = existsSync(path.join(FRESH, name + ".png"));
  const file = path.join(fresh ? FRESH : OLD, name + ".png");
  const meta = await sharp(file).metadata();
  const cards = fresh && existsSync(path.join(FRESH, name + ".json"))
    ? JSON.parse(readFileSync(path.join(FRESH, name + ".json"), "utf8")) : MEASURED[name] || [];
  return (SCREEN[name] = { src: b64(file), w: meta.width, aspect: meta.height / meta.width, cards, fresh });
};
/* the smallest card whose text matches: the piece itself, not the page around it */
const cardOf = (scr, re) => {
  const hits = scr.cards.filter((c) => re.test(c.text)).sort((a, b) => a.w * a.h - b.w * b.h);
  if (!hits.length) throw new Error("no card matching " + re);
  return hits[0];
};
for (const s of SLIDES) if (s.img) await load(s.img);
await load("gyms"); await load("match");
const FRAME = {}; // school -> the site's gyms frame (900x1480 webp)
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
  return { cq, rim, bez, sw, status, gesture, inset: rim + bez + 1 };
};
const phoneHeight = (w, aspect) => {
  const s = shell(w);
  return Math.round(s.sw * aspect + s.status + s.gesture + 2 * s.inset);
};
const widthFor = (h, aspect) => {
  let w = 300;
  for (let i = 0; i < 30; i++) w *= h / phoneHeight(w, aspect);
  return Math.floor(w);
};
/* where a capture pixel lands on the canvas, for a phone at (left, top) */
const onPhone = (w, left, top, cx, cy, capW) => {
  const s = shell(w), k = s.sw / capW;
  return { x: left + s.inset + cx * k, y: top + s.inset + s.status + cy * k, k };
};
const phone = ({ src, aspect }, w, style = "") => {
  const s = shell(w), px = (v) => `${v.toFixed(2)}px`;
  return `<div class="ph" style="width:${w}px;${style}">
    <div class="rim" style="border-radius:${px(12.2 * s.cq)};padding:${px(s.rim)};--cq:${s.cq}px">
      <div class="bezel" style="border-radius:${px(11.37 * s.cq)};padding:${px(s.bez)}">
        <div class="screen" style="border-radius:${px(9.44 * s.cq)}">
          <div class="status" style="height:${px(s.status)};padding:${px(3.33 * s.cq)} ${px(6.11 * s.cq)} ${px(2.22 * s.cq)};font-size:${px(3.33 * s.cq)}">
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
/* a card lifted out of the screen: the same pixels, bigger, on its own shadow.
   Cut 3 capture px inside its edge so no page colour shows at the corners. */
const pop = (scr, c, width, left, top) => {
  const inset = 3, cw = c.w - 2 * inset, ch = c.h - 2 * inset, k = width / cw;
  return `<div class="pop" style="left:${left}px;top:${top}px;width:${width}px;height:${Math.round(ch * k)}px;border-radius:${Math.round((c.radius - inset) * k)}px">
    <img src="${scr.src}" style="width:${Math.round(scr.w * k)}px;transform:translate(${-Math.round((c.x + inset) * k)}px,${-Math.round((c.y + inset) * k)}px)">
  </div>`;
};

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; color:${INK}; }
  .slide { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  .serif { font-family:"Instrument Serif", Georgia, serif; font-weight:400; letter-spacing:-.012em; line-height:1; text-wrap:balance; }
  .serif em { font-style:italic; }
  .mono { font-family:"Geist Mono", ui-monospace, monospace; font-weight:500; text-transform:uppercase; letter-spacing:.14em; }
  .kicker { position:absolute; left:${M}px; top:${M}px; font-size:24px; color:${BLUE}; }
  .badge { display:inline-flex; align-items:center; gap:14px; font-size:22px; color:${BLUE};
           padding:14px 26px; border-radius:999px; background:${BLUE_DIM}; border:1.5px solid ${BLUE_SOFT}; }
  .badge::before { content:""; width:10px; height:10px; border-radius:50%; background:${BLUE}; }
  .sub { font-weight:500; line-height:1.4; color:${INK2}; text-wrap:pretty; }

  /* the phone (Phone.tsx + .l-phone-rim) */
  .ph { position:absolute; }
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

  /* the card lifted out of the screen */
  .pop { position:absolute; overflow:hidden; background:#fff;
         box-shadow: 0 0 0 1px rgba(16,22,44,.07), 0 3px 8px rgba(16,22,44,.08),
                     0 24px 48px -12px rgba(16,22,44,.28), 0 60px 100px -40px rgba(16,22,44,.3); }
  .pop img { position:absolute; left:0; top:0; display:block; }

  .url { display:inline-block; font-weight:700; font-size:34px; letter-spacing:.005em; color:#fff;
         padding:22px 40px; border-radius:999px; background:${BLUE}; }
`;

const em = (text, colour = BLUE) => `<em style="color:${colour}">${text}</em>`;

const render = (s) => {
  if (s.kind === "hero") {
    /* the intro's pair: Gyms behind, leaning out to the left; Match in front.
       The intro's three lines become two, so the pair can stand big and whole
       under them; three lines top left with the pair beside them ran the
       words into the phone. */
    const top = 424, h = H - top - 52;
    const wf = widthFor(h, SCREEN.match.aspect), wb = Math.round(wf * 0.93);
    const pair = wf + wb * 0.62;
    const frontLeft = Math.round((W - pair) / 2 + wb * 0.62) + 10;
    return `<div class="slide">
      <div style="position:absolute;left:${M}px;top:${M}px"><span class="badge mono">${s.badge}</span></div>
      <div class="serif" style="position:absolute;left:${M}px;right:${M}px;top:${M + 90}px;font-size:104px;line-height:.98">
        ${s.lines.join(" ")}<br>${em(s.em, CRIMSON)}</div>
      ${phone(SCREEN.gyms, wb, `left:${frontLeft - Math.round(wb * 0.62)}px;top:${top + 40}px;transform:rotate(-9deg)`)}
      ${phone(SCREEN.match, wf, `left:${frontLeft}px;top:${top}px`)}
    </div>`;
  }

  if (s.kind === "feature") {
    /* the head across the top; the phone whole on the right; each card lifted
       out on the left, over the phone's edge, at the height it sits on the
       phone (or in the middle of the free space, `at: "middle"`). The final
       top is set in the page once the line above it has wrapped: see place(). */
    const scr = SCREEN[s.img];
    const ptop = 356, ph = H - ptop - 60;
    const pw = widthFor(ph, scr.aspect), pleft = W - M - pw;
    const subW = pleft - M - 56;
    const pops = s.pops.map((p) => {
      const c = cardOf(scr, p.card);
      const src = onPhone(pw, pleft, ptop, c.x, c.y + c.h / 2, scr.w);
      const h = Math.round((c.h - 6) * p.w / (c.w - 6));
      return pop(scr, c, p.w, M, 0).replace('class="pop"',
        `class="pop" data-aligned="${Math.round(src.y - h / 2)}" data-at="${p.at || "source"}"`);
    });
    return `<div class="slide" data-floor="${ptop + 24}">
      <div class="kicker mono">${s.kicker}</div>
      <div class="serif fit" style="position:absolute;left:${M}px;right:${M}px;top:${M + 58}px;font-size:92px">${s.head} ${em(s.em)}</div>
      ${s.sub ? `<div class="sub" style="position:absolute;left:${M}px;top:${ptop}px;width:${subW}px;font-size:29px">${s.sub}</div>` : ""}
      ${phone(scr, pw, `left:${pleft}px;top:${ptop}px`)}
      ${pops.join("")}
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
      <div class="serif" style="position:absolute;left:${M}px;right:${M}px;top:${M + 10}px;font-size:118px">${s.head}<br>${em(s.em)}</div>
      <div class="sub" style="position:absolute;left:${M}px;right:${M}px;top:${M + 290}px;font-size:32px">${s.sub}</div>
      ${phone(FRAME[l], wb, `left:${cx - wf / 2 - wb * 0.74}px;top:${top + (hf - hb) / 2 + 30}px;transform:rotate(-8deg)`)}
      ${phone(FRAME[r], wb, `left:${cx + wf / 2 - wb * 0.26}px;top:${top + (hf - hb) / 2 + 30}px;transform:rotate(8deg)`)}
      ${phone(FRAME[c], wf, `left:${cx - wf / 2}px;top:${top}px`)}
    </div>`;
  }

  /* closer */
  return `<div class="slide">
    <div style="position:absolute;left:${M}px;right:${M}px;top:50%;transform:translateY(-54%)">
      <div class="serif" style="font-size:150px">${s.head}<br>${em(s.em)}</div>
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
  /* a head never takes a third line: step the size down until it fits in two */
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(".fit")) {
      let size = parseFloat(el.style.fontSize);
      while (size > 60 && el.getBoundingClientRect().height > size * 2.1) el.style.fontSize = (size -= 2) + "px";
    }
  });
  /* place(): the lifted cards go below the line under the head, in order, never
     on top of each other, never past the bottom margin */
  await page.evaluate((H, M) => {
    for (const slide of document.querySelectorAll(".slide[data-floor]")) {
      const sub = slide.querySelector(".sub");
      const floor = sub ? sub.getBoundingClientRect().bottom + 52 : +slide.dataset.floor;
      const ceil = H - M;
      let prev = floor - 32;
      for (const p of slide.querySelectorAll(".pop")) {
        const h = p.offsetHeight;
        let top = p.dataset.at === "middle" ? (floor + ceil - h) / 2 : +p.dataset.aligned;
        top = Math.min(Math.max(top, prev + 32, floor), ceil - h);
        p.style.top = Math.round(top) + "px";
        prev = top + h;
      }
    }
  }, H, M);
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
