/*
  Short vertical clips (1080x1920, 30fps, ~6 s, silent), one feature each, to
  cut between the owner's talking-head takes. Same language as the launch reel
  in scripts/video/reel.mjs — near-black, one glow, the screen floating in 3D,
  italic type with the key word underlined — so a reel that alternates his face
  and these reads as one piece.

  Each clip: the screen arrives from deep behind (0.8 s), holds and drifts
  (so it can be trimmed anywhere), and rushes past the camera at the end. The
  headline is the post's headline (scripts/social/posts.mjs), so a feed post
  and its reel say the same words.

  Also cut from the reel, for bookends: clip-hook.mp4 (the "Never train alone
  again." open) and clip-end.mp4 (the mark drawing itself, the URL).

  Run: node scripts/social/clips.mjs           # all
       node scripts/social/clips.mjs match plan # just those
  Out: mockups/video/clip-<name>.mp4  (gitignored; rerun to rebuild)
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync, rmSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const W = 1080, H = 1920, RENDER_FPS = 60, OUT_FPS = 30, DUR = 6.0;
const LIFT = "#8ea4ff";

const CLIPS = [
  { name: "waitlist", img: "match", big: "Get in on day one.", key: "one", sub: "getunisport.com/waitlist" },
  { name: "match", img: "match", big: "Find training partners. Make friends.", key: "friends",
    sub: "Sorted by how well you fit: interests, concentration, level and hours." },
  { name: "why", img: "person", big: "Find your ideal training partner.", key: "ideal",
    sub: "Matched on interests, concentration, level, language and hometown." },
  { name: "plan", img: "chat", shift: 0.36, big: "Plan sessions easily in the chat.", key: "chat",
    sub: "Once they accept, it goes into both of your calendars." },
  { name: "profile", img: "profile", big: "See how you do in the leaderboards.", key: "leaderboards",
    sub: "Every session you log marks its day." },
  { name: "gyms", img: "gyms", big: "See every gym on your campus in one place.", key: "every",
    sub: "The equipment, the rating and how busy it is." },
];

const ONLY = process.argv.slice(2);
const wants = (n) => !ONLY.length || ONLY.includes(n);

const shot = (name) =>
  "data:image/png;base64," + readFileSync(path.join(ROOT, "mockups/social/screens/dark", name + ".png")).toString("base64");

const words = (big, key) => big.split(" ").map((w) => {
  const bare = w.replace(/[.,]/g, "");
  const hit = key && bare.toLowerCase() === key.toLowerCase();
  return `<span class="w${hit ? " k" : ""}">${w}${hit ? '<i class="ul"></i>' : ""}</span>`;
}).join(" ");

const html = (c) => {
  const src = shot(c.img);
  /* the card is 700 wide; the capture is 1206 wide, so a shift of the top is
     scaled the same way posts.mjs does it */
  const shift = c.shift ? Math.round(c.shift * 2622 * (700 / 1206)) : 0;
  return `<!doctype html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,500;0,700;0,800;1,700;1,800&display=swap" rel="stylesheet">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#000; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; }
  #stage { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#000;
           perspective:1500px; perspective-origin:50% 44%; }
  #amb { position:absolute; inset:0;
         background:radial-gradient(44% 28% at 50% 40%, rgba(40,58,150,.18) 0%, rgba(12,17,50,.07) 44%, rgba(0,0,0,0) 70%); }
  .beat { position:absolute; inset:0; transform-style:preserve-3d; }
  .card { position:absolute; left:50%; top:232px; width:700px; height:1151px; margin-left:-350px;
          border-radius:56px; overflow:hidden; background:#000;
          box-shadow:0 0 0 2px rgba(160,180,255,.22), 0 70px 150px rgba(0,0,0,.92); }
  .shot { position:absolute; left:0; top:${-shift}px; width:100%; filter:brightness(1.1) contrast(1.06) saturate(1.04); }
  .halo { position:absolute; left:50%; top:232px; width:700px; height:1151px; margin-left:-350px;
          object-fit:cover; object-position:50% 0; filter:blur(90px) saturate(.9); opacity:.26; z-index:-1; }
  .glowplate { position:absolute; left:50%; top:300px; width:900px; height:1000px; margin-left:-450px;
               background:radial-gradient(50% 50% at 50% 50%, rgba(66,92,215,.20), rgba(0,0,0,0) 70%);
               filter:blur(40px); z-index:-2; }
  .caps { position:absolute; left:74px; right:74px; top:1452px; text-align:center; }
  .big  { font-style:italic; font-weight:800; font-size:${c.big.length > 34 ? 60 : 67}px; line-height:1.1; letter-spacing:-.028em;
          text-wrap:balance; color:#fff; text-shadow:0 0 46px rgba(130,160,255,.5), 0 0 110px rgba(31,50,193,.4); }
  .big .w { display:inline-block; position:relative; }
  .big .k { color:${LIFT}; text-shadow:0 0 40px rgba(142,164,255,.85), 0 0 90px rgba(31,50,193,.6); }
  .big .ul { position:absolute; left:2%; bottom:-.13em; width:96%; height:7px; border-radius:6px;
             background:${LIFT}; box-shadow:0 0 26px ${LIFT}; transform-origin:0 50%; transform:scaleX(0); }
  .sub  { margin-top:26px; font-weight:500; font-size:34px; line-height:1.36; color:rgba(220,229,255,.88); }
</style></head><body><div id="stage">
  <div id="amb"></div>
  <div class="beat" id="beat"><div class="glowplate" id="plate"></div>
    <div class="card" id="card"><img class="shot" src="${src}"></div>
    <img class="halo" id="halo" src="${src}"></div>
  <div class="caps" id="caps"><div class="big">${words(c.big, c.key)}</div><div class="sub">${c.sub}</div></div>
</div>
<script>
  var DUR = ${DUR};
  var cl = function (x) { return x < 0 ? 0 : x > 1 ? 1 : x; };
  var outExpo = function (x) { x = cl(x); return x >= 1 ? 1 : 1 - Math.pow(2, -9 * x); };
  var outCubic = function (x) { return 1 - Math.pow(1 - cl(x), 3); };
  var inCubic = function (x) { return Math.pow(cl(x), 3); };
  window.frame = function (t) {
    var IN = 0.78, OUT = 0.5;
    var inP = outExpo(t / IN);
    var outP = inCubic((t - (DUR - OUT)) / OUT);
    var vis = cl(t / 0.26) * (1 - outP);
    var z = -1450 * (1 - inP) + 760 * outP;
    var ry = -26 + 17 * inP + 22 * outP + 9 * cl(t / DUR);
    var rx = 5 * (1 - inP) - 2 * cl(t / DUR);
    var ty = 60 * (1 - inP) - 26 * cl(t / DUR);
    var xf = "translate3d(0," + ty.toFixed(1) + "px," + z.toFixed(1) + "px) rotateY(" + ry.toFixed(2) + "deg) rotateX(" + rx.toFixed(2) + "deg)";
    document.getElementById("beat").style.opacity = String(vis);
    document.getElementById("card").style.transform = xf;
    var halo = document.getElementById("halo"); halo.style.transform = xf; halo.style.opacity = String(0.34 * vis);
    document.getElementById("plate").style.opacity = String(vis);
    document.getElementById("amb").style.opacity = String(0.22 + 0.5 * vis);
    var cap = document.getElementById("caps");
    cap.style.opacity = String(cl((t - 0.3) / 0.3) * (1 - cl(outP * 1.6)));
    var ws = cap.querySelectorAll(".w");
    for (var j = 0; j < ws.length; j++) {
      var wp = outExpo((t - 0.34 - j * 0.075) / 0.5);
      ws[j].style.opacity = String(cl((t - 0.34 - j * 0.075) / 0.3));
      ws[j].style.filter = "blur(" + (14 * (1 - wp)).toFixed(2) + "px)";
      ws[j].style.transform = "translate3d(0," + (34 * (1 - wp)).toFixed(1) + "px,0)";
    }
    var ul = cap.querySelector(".ul");
    if (ul) ul.style.transform = "scaleX(" + outCubic((t - 0.34 - ws.length * 0.075 - 0.1) / 0.45).toFixed(3) + ")";
  };
  window.frame(0);
</script></body></html>`;
};

const outDir = path.join(ROOT, "mockups/video");
mkdirSync(outDir, { recursive: true });

/* the same finishing pass as the reel: 60 -> 30 fps averaged (motion blur),
   a bloom, a touch of grain and a vignette */
const VF = [
  "tmix=frames=2:weights=1 1", "fps=" + OUT_FPS, "split=2[a][b]",
  "[b]curves=all='0/0 0.88/0 1/1',gblur=sigma=14:steps=2[bl]",
  "[a][bl]blend=all_mode=screen:all_opacity=0.20",
  "eq=saturation=0.98:contrast=1.09", "noise=alls=3:allf=t", "vignette=PI/4.6",
].join(",");

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });

for (const c of CLIPS) {
  if (!wants(c.name)) continue;
  const work = path.join(os.tmpdir(), "unisport-clip-" + c.name);
  rmSync(work, { recursive: true, force: true });
  mkdirSync(work, { recursive: true });
  await page.setContent(html(c), { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
    .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
  await page.evaluateHandle("document.fonts.ready");
  const frames = Math.round(DUR * RENDER_FPS);
  for (let f = 0; f < frames; f++) {
    await page.evaluate((tt) => window.frame(tt), f / RENDER_FPS);
    await page.screenshot({ path: path.join(work, String(f).padStart(5, "0") + ".png"), type: "png" });
  }
  const out = path.join(outDir, "clip-" + c.name + ".mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(RENDER_FPS), "-i", path.join(work, "%05d.png"),
    "-filter_complex", VF, "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
  rmSync(work, { recursive: true, force: true });
  console.log("  clip-" + c.name + ".mp4");
}
await browser.close();

/* bookends, cut out of the launch reel */
const reel = path.join(outDir, "unisport-reel.mp4");
if (existsSync(reel)) {
  const cut = (name, ss, t) => {
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(ss), "-t", String(t), "-i", reel,
      "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
      path.join(outDir, "clip-" + name + ".mp4")]);
    console.log("  clip-" + name + ".mp4  (from the reel)");
  };
  if (wants("hook")) cut("hook", 0, 2.6);
  if (wants("end")) cut("end", 18.1, 4.9);
} else {
  console.log("  (no mockups/video/unisport-reel.mp4 — run scripts/video/reel.mjs for the hook and end clips)");
}
console.log("\nwrote " + outDir);
