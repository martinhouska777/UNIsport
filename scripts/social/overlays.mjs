/*
  Transparent PNG overlays (1080x1920) to lay over the owner's own talking-head
  footage in CapCut. Everything around his face, nothing of his face.

  Three kinds:
    tag-founder      a lower-third: the mark, his name, "founder, UNIsport"
    tag-handle       the handle, small, top right
    phone-<screen>   the real app screen floating bottom-right with its glow,
                     for the moments he is talking about that feature
    split-<screen>   the bottom half goes dark and holds the phone and the
                     feature's headline; the top half is clear for his face

  Same language as the posts and clips. Screens are the dark captures from
  scripts/social/capture.mjs.

  In CapCut: add the PNG as an overlay layer above the footage, full size, and
  fade it in and out. The tag sits above the caption line.

  Run: node scripts/social/overlays.mjs
  Out: mockups/social/overlays/*.png
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const W = 1080, H = 1920, LIFT = "#8ea4ff";

const MARK = (a, b) => `<svg viewBox="0 0 100 100" class="mark">
  <path d="M28 34 V56 Q28 82 50 82" fill="none" stroke="${a}" stroke-width="14" stroke-linecap="round"/>
  <path d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${b}" stroke-width="14" stroke-linecap="round"/>
  <circle cx="28" cy="16" r="8.5" fill="${a}"/><circle cx="72" cy="16" r="8.5" fill="${b}"/></svg>`;

const shot = (name) =>
  "data:image/png;base64," + readFileSync(path.join(ROOT, "mockups/social/screens/dark", name + ".png")).toString("base64");

const SCREENS = [
  { name: "match", big: "Find training partners. Make friends.", key: "friends" },
  { name: "person", big: "Find your ideal training partner.", key: "ideal" },
  { name: "chat", big: "Plan sessions easily in the chat.", key: "chat", shift: 0.36 },
  { name: "profile", big: "See how you do in the leaderboards.", key: "leaderboards" },
  { name: "gyms", big: "See every gym on your campus in one place.", key: "every" },
];

const words = (big, key) => big.split(" ").map((w) => {
  const bare = w.replace(/[.,]/g, "");
  const hit = key && bare.toLowerCase() === key.toLowerCase();
  return `<span class="w${hit ? " k" : ""}">${w}${hit ? '<i class="ul"></i>' : ""}</span>`;
}).join(" ");

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:transparent; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  .stage { position:relative; width:${W}px; height:${H}px; overflow:hidden; }

  .tag { position:absolute; left:64px; bottom:520px; display:flex; align-items:center; gap:22px;
         padding:22px 34px 22px 24px; border-radius:999px; background:rgba(0,0,0,.72);
         box-shadow:inset 0 0 0 2px rgba(160,180,255,.28), 0 20px 60px rgba(0,0,0,.5); }
  .tag .mark { width:64px; height:64px; overflow:visible; filter:drop-shadow(0 0 18px rgba(142,164,255,.6)); }
  .tag b { display:block; font-weight:800; font-size:34px; letter-spacing:-.02em; color:#fff; }
  .tag span { display:block; margin-top:4px; font-weight:600; font-size:24px; letter-spacing:.06em; text-transform:uppercase; color:${LIFT}; }

  .handle { position:absolute; right:64px; top:270px; padding:16px 28px; border-radius:999px;
            background:rgba(0,0,0,.66); box-shadow:inset 0 0 0 2px rgba(160,180,255,.28);
            font-weight:700; font-size:28px; letter-spacing:.02em; color:#fff; }

  .phone { position:absolute; border-radius:48px; overflow:hidden; background:#000;
           box-shadow:0 0 0 2px rgba(160,180,255,.3), 0 50px 120px rgba(0,0,0,.85), 0 0 90px rgba(142,164,255,.28); }
  .phone img { position:absolute; left:0; top:0; width:100%; filter:brightness(1.08) contrast(1.06); }

  .panel { position:absolute; left:0; right:0; bottom:0; height:980px;
           background:linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.92) 120px, #000 100%); }
  .amb { position:absolute; left:0; right:0; bottom:0; height:900px;
         background:radial-gradient(60% 50% at 50% 70%, rgba(46,66,170,.30), rgba(0,0,0,0) 70%); }
  .big { position:absolute; left:74px; right:74px; top:1030px; text-align:center;
         font-style:italic; font-weight:800; font-size:58px; line-height:1.1; letter-spacing:-.028em; text-wrap:balance;
         color:#fff; text-shadow:0 0 46px rgba(130,160,255,.5); }
  .big .w { display:inline-block; position:relative; }
  .big .k { color:${LIFT}; text-shadow:0 0 40px rgba(142,164,255,.85); }
  .big .ul { position:absolute; left:2%; bottom:-.13em; width:96%; height:6px; border-radius:6px; background:${LIFT}; box-shadow:0 0 22px ${LIFT}; }
`;

const shiftCss = (s, w) => s.shift ? `transform:translateY(-${Math.round(s.shift * 2622 * (w / 1206))}px)` : "";

const OVERLAYS = [
  { id: "tag-founder", body: `<div class="tag">${MARK("#ffffff", LIFT)}<div><b>Martin Houska</b><span>founder, UNIsport</span></div></div>` },
  { id: "tag-handle", body: `<div class="handle">@unisportapp</div>` },
  ...SCREENS.map((s) => ({ id: "phone-" + s.name,
    body: `<div class="phone" style="right:56px;top:880px;width:420px;height:700px"><img src="${shot(s.name)}" style="${shiftCss(s, 420)}"></div>` })),
  ...SCREENS.map((s) => ({ id: "split-" + s.name,
    body: `<div class="panel"></div><div class="amb"></div>
      <div class="big">${words(s.big, s.key)}</div>
      <div class="phone" style="left:50%;margin-left:-270px;top:1230px;width:540px;height:760px"><img src="${shot(s.name)}" style="${shiftCss(s, 540)}"></div>` })),
];

const out = path.join(ROOT, "mockups/social/overlays");
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
for (const o of OVERLAYS) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Plus+Jakarta+Sans:ital,wght@1,800&display=swap" rel="stylesheet">
    <style>${css}</style></head><body><div class="stage">${o.body}</div></body></html>`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
    .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
  await page.evaluateHandle("document.fonts.ready");
  await page.screenshot({ path: path.join(out, o.id + ".png"), type: "png", omitBackground: true });
  console.log("  " + o.id + ".png");
}
await browser.close();
console.log("\nwrote " + out);
