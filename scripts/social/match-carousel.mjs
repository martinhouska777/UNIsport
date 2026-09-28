/*
  THE MATCHING CAROUSEL — what makes UNIsport different, in the PAIR look.

  The owner, 2026-09-27, picking from the five looks (styles-3d.mjs): "White
  background, please. The last one: finding a real training partner, maybe
  with smart matching based on interests and stuff like that, explaining the
  most important part: why is the differentiation."

  So: the pair (two black phones side by side, straight) on pure white, and the carousel is the one thing
  no other gym app does — the match is made on who you are, not only on when
  and where you train, and the app says why. Every line is the site's own:

    1  Sport is better with friends.  + the student door's line
       (lib/landingCopy.ts, the Student door) — two phones: the list, a match
    2  Why you match — the reasons, word for word from the screen beside them
    3  the owner's own sentence from "Why I built it" (aboutWhy): the match
       system "not accessible anywhere else"
    4  Find training partners. Make friends. + how Browse sorts (S1)
    5  Get in on day one. + the waitlist's line and the bio link (lib/waitlist.ts)

  No arrows: the words say what the screens show.

  Run: node scripts/social/match-carousel.mjs
  Out: mockups/social/match/01..05.png + sheet.png
*/
import { mkdirSync } from "node:fs";
import path from "node:path";
import { ROOT, page, launch, shoot, camera, screen, sharp } from "./phone3d.mjs";

const OUT = path.join(ROOT, "mockups/social/match");
mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1440, M = 84;
const INK = "#141618", INK2 = "#4b4f53", BLUE = "#1f32c1", BLUE_DIM = "#e9ecfb";

const COPY = {
  badge: "Free for students",                                                    // hero.badge
  door: ["Sport is better", "with friends."],                                  // the Student door, split at its full stop
  doorSub: "Match with people who train like you and share your interests.",
  why: "Why you match",                                                          // the screen's own heading
  /* four of the six reasons on the Why-you-match screen (person.png), as it
     writes them; the gym line names a real building, so it stays in the phone */
  reasons: ["You both lift", "You’re both concentrating in Computer Science", "One of you offers to mentor, the other wants it", "You train at similar times of day"],
  whyKicker: "Why I built it",                                                   // aboutWhy.headline + headlineEm
  quote: ["By creating a match system based on interests, hobbies, concentration, languages, hometowns, experience level and much more that are ",
          "not accessible anywhere else", ", I hope students will find not only somebody to train with, but also make great friendships or establish contacts for the future."],
  name: "Martin Houska",                                                         // about.body
  browse: "Browse",                                                              // S1's point
  s1: ["Find training partners.", "Make friends."],                            // S1 head
  s1Sub: "Browse sorts everyone by how well you fit with them, based on interests, concentration, experience and hours.",
  close: ["Get in on", "day one."],                                            // waitlist.headline
  closeSub: "UNIsport opens at Harvard first. Get an email when the app launches.",
  url: "getunisport.com/waitlist",
};

const SCR = {};
const src = (n) => (SCR[n] ??= screen(n));

const css = `
  body { background:#fff; color:${INK}; }
  .abs { position:absolute; }
  .mono { font-family:"Geist Mono", ui-monospace, monospace; font-weight:500; text-transform:uppercase; letter-spacing:.16em; font-size:22px; color:${BLUE}; }
  .serif { font-family:"Instrument Serif", Georgia, serif; font-weight:400; letter-spacing:-.015em; line-height:.95; }
  .serif em { font-style:italic; color:${BLUE}; }
  .sub { font-weight:500; line-height:1.42; color:${INK2}; text-wrap:balance; }
  .c { left:0; right:0; text-align:center; }
  .reasons { list-style:none; }
  .reasons li { display:flex; gap:22px; align-items:flex-start; margin-bottom:40px; }
  .reasons svg { flex:none; margin-top:6px; }
  .reasons span { font-family:"Instrument Serif", Georgia, serif; font-size:50px; line-height:1.02; letter-spacing:-.01em; text-wrap:balance; }
  .quote { font-family:"Instrument Serif", Georgia, serif; font-size:70px; line-height:1.08; letter-spacing:-.01em; text-wrap:pretty; }
  .quote em { font-style:italic; color:${BLUE}; }
  .mark { font-family:"Instrument Serif", Georgia, serif; font-size:260px; line-height:1; color:${BLUE}; }
  .name { font-weight:700; font-size:28px; letter-spacing:-.005em; }
  .url { display:inline-block; font-weight:700; font-size:34px; color:#fff; padding:22px 40px; border-radius:999px; background:${BLUE}; }
`;
const tick = `<svg width="46" height="46" viewBox="0 0 46 46"><circle cx="23" cy="23" r="23" fill="${BLUE_DIM}"/><path d="M14 23.5l6 6 12-13" fill="none" stroke="${BLUE}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* THE PAIR: two black phones side by side, STRAIGHT. The owner, 2026-09-27,
   after two cuts that turned and leaned them: "just make the phone straight,
   that's best, so they look realistic". So no turn and no lean, face on to
   the camera, and as big as the frame allows: the screen's own words have
   to be readable (his note on the first cut). The 3D shows only where it is
   real — the metal edge in perspective and the shadow behind. */
const cam = camera(W, H, 22, 1100);
/* light from almost straight ahead: each shadow sits close behind its phone
   instead of running down to the bottom edge like a pedestal */
const sun = { pos: [0, 260, 1500], soft: 24, box: 520 };
const wall = [{ pos: [0, 0, -120], opacity: 0.13 }];
const pair = (l, r, cy, h, gap = 64) => {
  const off = (h * 0.438) / 2 + gap / 2;            // 0.438 = the body's width / height
  return [
    { src: src(l), frame: "black", pos: cam.at(W / 2 - off, cy), scale: cam.scaleFor(h) },
    { src: src(r), frame: "black", pos: cam.at(W / 2 + off, cy), scale: cam.scaleFor(h) },
  ];
};
const head = (k, a, b) => `
  <div class="abs mono c" style="top:84px">${k}</div>
  <div class="abs serif c" style="top:122px;font-size:88px">${a}<br><em>${b}</em></div>`;

const SLIDES = [
  { html: head(COPY.badge, ...COPY.door) +
      `<div class="abs sub c" style="top:306px;font-size:26px">${COPY.doorSub}</div>`,
    spec: { phones: pair("match", "person", 872, 984) } },

  { html: `<div class="abs mono" style="left:${M}px;top:94px">${COPY.why}</div>
      <ul class="abs reasons" style="left:${M}px;top:176px;width:440px">${COPY.reasons.map((r) => `<li>${tick}<span>${r}</span></li>`).join("")}</ul>`,
    /* the whole phone inside the frame, straight, so its own list reads */
    spec: { phones: [{ src: src("person"), frame: "black", pos: cam.at(780, 742), scale: cam.scaleFor(1140) }] } },

  { html: `<div class="abs mono" style="left:${M}px;top:94px">${COPY.whyKicker}</div>
      <div class="abs mark" style="left:${M - 8}px;top:190px">“</div>
      <div class="abs quote" style="left:${M}px;top:400px;width:${W - 2 * M}px">${COPY.quote[0]}<em>${COPY.quote[1]}</em>${COPY.quote[2]}</div>
      <div class="abs name" style="left:${M}px;bottom:96px">${COPY.name}</div>`,
    spec: {} },

  { html: head(COPY.browse, ...COPY.s1) +
      `<div class="abs sub c" style="top:306px;font-size:26px;padding:0 150px">${COPY.s1Sub}</div>`,
    spec: { phones: pair("match", "chat", 892, 956) } },

  { html: `<div class="abs serif c" style="top:470px;font-size:132px">${COPY.close[0]}<br><em>${COPY.close[1]}</em></div>
      <div class="abs sub c" style="top:760px;font-size:30px;padding:0 200px">${COPY.closeSub}</div>
      <div class="abs c" style="top:920px"><span class="url">${COPY.url}</span></div>`,
    spec: {} },
];

const browser = await launch();
const files = [];
for (const [i, s] of SLIDES.entries()) {
  const out = path.join(OUT, String(i + 1).padStart(2, "0") + ".png");
  await shoot(browser, { W, H, out, html: page({ W, H, css, body: s.html }),
    spec: { camera: cam.spec, sun, shadowPlanes: wall, ...s.spec } });
  files.push(out);
  console.log("  " + path.relative(ROOT, out));
}
await browser.close();

const tw = 432, th = 576, gap = 20;
const tiles = await Promise.all(files.map(async (f, i) => ({ input: await sharp(f).resize(tw, th).toBuffer(), left: gap + i * (tw + gap), top: gap })));
await sharp({ create: { width: files.length * (tw + gap) + gap, height: th + 2 * gap, channels: 3, background: "#d7d9dd" } })
  .composite(tiles).png().toFile(path.join(OUT, "sheet.png"));
console.log("  mockups/social/match/sheet.png");
