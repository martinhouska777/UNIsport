// The two strips the scroll animations pan down, re-shot together:
//
//   cap-vhome-tall.png   — Varsity Home on a SHOT DAY (db/seed_varsity_shotday.sql):
//                          plan → a four + a pair → next race → coach's note.
//   cap-logsheet-tall.png — the student Log Session sheet, opened on a real
//                          session, so the sets, the partner, the add-photo
//                          option and the note are all on one strip.
//
// It also prints where each section sits inside the strip (as a fraction of the
// image's travel), which is exactly what build-story.mjs wants for `pan:`.
// Retuning the beats by hand after a re-shoot was the slowest part of the job.
import puppeteer from "puppeteer-core";
import fs from "fs";

const COOKIE = fs.readFileSync("session-cookie.txt", "utf8").trim();
const BASE = "https://un-isport.vercel.app";
const W = 402, PHONE_H = 661, TALL_H = 2000, DSF = 3;

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu", "--no-first-run"],
});
const page = await browser.newPage();
await page.setUserAgent(
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
);
await browser.setCookie({
  name: "sb-wavxyrgtaotrhnyepyor-auth-token",
  value: COOKIE, domain: "un-isport.vercel.app", path: "/",
  secure: true, sameSite: "Lax", expires: Math.floor(Date.now() / 1000) + 3600,
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const phone = () => page.setViewport({ width: W, height: PHONE_H, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });
const tall = (h = TALL_H) => page.setViewport({ width: W, height: h, deviceScaleFactor: DSF, isMobile: true, hasTouch: true });

// Where a piece of text sits down the strip. The pan moves the image by
// (imageHeight - windowHeight), so a section's fraction of that travel is what
// `pan: [from, to]` takes.
async function marks(labels) {
  return page.evaluate((labels) => {
    const out = {};
    const all = [...document.querySelectorAll("body *")];
    for (const label of labels) {
      const hit = all.find(
        (el) => el.children.length === 0 &&
          el.textContent.trim().toLowerCase().startsWith(label.toLowerCase())
      );
      if (hit) out[label] = Math.round(hit.getBoundingClientRect().top + window.scrollY);
    }
    out.__docHeight = document.documentElement.scrollHeight;
    out.__winHeight = window.innerHeight;
    return out;
  }, labels);
}

function report(name, m) {
  // travel = what actually scrolls past inside the phone frame
  const travel = m.__docHeight - (PHONE_H);
  console.log(`\n${name}  doc=${m.__docHeight}px  → fractions of travel (${travel}px):`);
  for (const [k, v] of Object.entries(m)) {
    if (k.startsWith("__")) continue;
    console.log(`  ${(Math.max(0, Math.min(1, v / travel))).toFixed(3)}  ${k}  (y=${v})`);
  }
}

/* ── 1. Varsity Home ────────────────────────────────────────────────────── */
await phone();
await page.goto(BASE + "/varsity/home", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3500);
await tall(2000);
await wait(1800);
const vm = await marks(["Training plan", "Today's sessions", "Your lineup", "Next race", "Coach's note"]);
await page.screenshot({ path: "cap-vhome-tall.png" });
report("vhome", vm);

/* ── 2. The student log sheet ───────────────────────────────────────────── */
await phone();
await page.goto(BASE + "/profile", { waitUntil: "networkidle2", timeout: 45000 });
await wait(3500);

// A specific day, not the richest one: the beat promises a training partner
// carried over from the plan, and only some sessions have one. The 15th is a
// four-exercise gym session with Elena Vásquez and a note on it.
const LOG_DAY = 15;
const day = await page.evaluate((wanted) => {
  const b = [...document.querySelectorAll("button[aria-label]")].filter((x) =>
    / on day \d+$/.test(x.getAttribute("aria-label") || "")
  );
  const pick =
    b.find((x) => x.getAttribute("aria-label").endsWith(` on day ${wanted}`)) ??
    b.sort(
      (p, q) => q.getAttribute("aria-label").split(",").length - p.getAttribute("aria-label").split(",").length
    )[0];
  if (pick) { pick.click(); return pick.getAttribute("aria-label"); }
  return null;
}, LOG_DAY);
await wait(1500);
console.log("day sheet:", day);

const row = await page.evaluate(() => {
  const cands = [...document.querySelectorAll("button,[role=button],div[class*=cursor-pointer]")].filter(
    (e) => /^(Gym|Running|Cardio)/.test(e.textContent.trim()) && e.textContent.trim().length < 60
  );
  const el = cands[cands.length - 1];
  if (el) { el.click(); return el.textContent.trim().slice(0, 40); }
  return null;
});
await wait(1600);
console.log("session row:", row);

// … and into the editor, which is the screen that carries the photo option.
const edited = await page.evaluate(() => {
  const el = [...document.querySelectorAll("button")].find((b) =>
    /edit session/i.test(b.textContent.trim())
  );
  if (el) { el.click(); return true; }
  return false;
});
await wait(1600);
console.log("edit sheet opened:", edited);

await tall(2000);
await wait(1600);
const lm = await marks(["Date", "Gym", "Exercises", "Partner", "Photos", "Note"]);
await page.screenshot({ path: "cap-logsheet-tall.png" });
report("logsheet", lm);

await browser.close();
