// Capture the Coach Console screens from the LOCAL dev server, seeded with
// demo data that matches the athlete story (Head of the Charles, week 6).
// Same canvas as the existing landing frames: 402x661 @3x = 1206x1983.
//
// NOTE: needs the temporary capture bypass in app/varsity/coach/layout.tsx
// (skip the auth gate) — see scripts/landing/README.md. Run: node capture-coach.mjs
import puppeteer from "puppeteer-core";

const OUT = process.env.OUT || ".";
const BASE = "http://localhost:3000";
const CHROME = process.env.CHROME || "/opt/pw-browsers/chromium";

/* ── Seed data ─────────────────────────────────────────────── */
const blocks = [
  {
    id: "fall-2026",
    name: "Fall 2026",
    start: "2026-07-13",
    end: "2026-10-18",
    status: "published",
    raceName: "Head of the Charles",
    raceDate: "2026-10-18",
  },
];

// sessionKey format: `${y}-${monthIndex}-${day}-${period}` (month 0-based).
const S = (cat, intensity, description, time, note) => ({
  category: cat,
  ...(intensity ? { intensity } : {}),
  description,
  time,
  ...(note ? { note } : {}),
});
const sessions = {};
const week = (mondayDay, monthIdx, spec) => {
  spec.forEach((day, i) => {
    const d = mondayDay + i;
    if (day.am) sessions[`2026-${monthIdx}-${d}-AM`] = day.am;
    if (day.pm) sessions[`2026-${monthIdx}-${d}-PM`] = day.pm;
  });
};
// Rotating weekly templates so every week of the block reads as planned.
const T1 = [
  { am: S("water", "UT2", "3×25' UT2", "7:00 AM"), pm: S("weights", null, "Lift 3 — squat + pull", "4:30 PM") },
  { am: S("water", "UT2", "90' UT2 row", "7:00 AM"), pm: S("erg", "UT1", "3×15' UT1, RP3s", "4:30 PM") },
  { am: S("water", "hard", "6×750m race pace", "7:00 AM", "Stern pairs focus — catches together"), pm: S("flex", null, "50 mins", "4:30 PM") },
  { am: S("water", "UT2", "4×20' UT2", "7:00 AM"), pm: S("weights", null, "Lift 4 — posterior chain", "4:30 PM") },
  { am: S("erg", "hard", "8×500m, 1:30 rest", "7:00 AM"), pm: S("off", null, "OFF", "4:30 PM") },
  { am: S("water", "UT1", "3×17' UT1", "7:00 AM"), pm: null },
  { am: S("off", null, "OFF", "7:00 AM"), pm: null },
];
const T2 = [
  { am: S("water", "UT2", "2×30' UT2", "7:00 AM"), pm: S("weights", null, "Lift 1 — squat + press", "4:30 PM") },
  { am: S("water", "UT2", "70' steady state", "7:00 AM"), pm: S("erg", "UT2", "4×20' UT2", "4:30 PM") },
  { am: S("water", "hard", "4×5' rate ladder", "7:00 AM"), pm: S("flex", null, "60 mins", "4:30 PM") },
  { am: S("water", "UT2", "3×25' UT2", "7:00 AM"), pm: S("weights", null, "Lift 2 — pull + core", "4:30 PM") },
  { am: S("erg", "UT1", "4×12' UT1", "7:00 AM"), pm: S("off", null, "OFF", "4:30 PM") },
  { am: S("water", "UT1", "6×8' UT1", "7:00 AM"), pm: null },
  { am: S("off", null, "OFF", "7:00 AM"), pm: null },
];
const T3 = [
  { am: S("water", "UT2", "3×25' UT2", "7:00 AM"), pm: S("weights", null, "Lift 5 — squat + pull", "4:30 PM") },
  { am: S("water", "UT1", "3×15' UT1, RP3s", "7:00 AM"), pm: S("erg", "UT2", "2×30' UT2", "4:30 PM") },
  { am: S("water", "hard", "6×750m race pace", "7:00 AM"), pm: S("flex", null, "50 mins", "4:30 PM") },
  { am: S("water", "UT2", "4×20' UT2", "7:00 AM"), pm: null },
  { am: S("erg", "hard", "2k test", "7:00 AM"), pm: S("off", null, "OFF", "4:30 PM") },
  { am: S("water", "UT2", "90' UT2 row", "7:00 AM"), pm: null },
  { am: S("off", null, "OFF", "7:00 AM"), pm: null },
];
// Every Monday of the 14-week block (Jul 13 → Oct 12), template rotating 2-1-3.
{
  const start = new Date(2026, 6, 13);
  const tmpl = [T2, T3, T1]; // week 6 (w=5) lands on T1 — the athlete story week
  for (let w = 0; w < 14; w++) {
    const mon = new Date(start.getTime() + w * 7 * 86400000);
    tmpl[w % 3].forEach((day, i) => {
      const d = new Date(mon.getTime() + i * 86400000);
      const key = (p) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${p}`;
      if (day.am) sessions[key("AM")] = day.am;
      if (day.pm) sessions[key("PM")] = day.pm;
    });
  }
}

// Lineup for Tue Aug 18 AM: 1V + 2V eights, published.
// John Brown sits 3 in the 1V — the athlete story's "You, 3 seat".
const seats = (ids) => ids.map((id, i) => ({ label: i === ids.length - 1 ? "S" : String(i + 1), athleteId: id }));
const lineupTueAM = {
  status: "published",
  boats: [
    {
      id: "boat-1v",
      badge: "8+",
      name: "1V",
      dock: "Newell",
      note: "Stern pairs focus",
      hasCox: true,
      coxId: "ellie-novak",
      seats: seats([
        "alex-carter", "ben-holt", "john-brown", "danny-fox",
        "erik-lund", "felix-hart", "george-mills", "chris-mercer",
      ]),
    },
    {
      id: "boat-2v",
      badge: "8+",
      name: "2V",
      dock: "Newell",
      note: "",
      hasCox: true,
      coxId: "maya-reyes",
      seats: seats([
        "ivan-petrov", "henry-oday", "kai-tanaka", "jake-summers",
        "marco-silva", "liam-walsh", "oscar-reed", "noah-berg",
      ]),
    },
  ],
};

const notes = {
  "john-brown": "Catch timing drifts late in pieces. Video Tuesday — fix it before the Charles.",
  "george-mills": "Great week. Keep the r18 work long and loose.",
  "danny-fox": "Ease the left shoulder in lifts — swap press for pull until cleared.",
  "henry-oday": "2k pacing: go out at 1:32, not 1:29. Trust the back half.",
};

const seed = {
  varsityPlanBlocks: JSON.stringify(blocks),
  varsityPlanSessions: JSON.stringify(sessions),
  "varsityLineup:2026-7-18-AM": JSON.stringify(lineupTueAM),
  ...Object.fromEntries(Object.entries(notes).map(([id, n]) => [`varsityCoachNote:${id}`, n])),
  uniThemeMode: "light", // white mode — the lit-screen look the landing page uses
};

/* ── Drive ─────────────────────────────────────────────────── */
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--disable-gpu", "--no-sandbox", "--no-first-run"],
});
const page = await browser.newPage();
await page.setViewport({ width: 402, height: 661, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.setUserAgent(
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36",
);
await page.evaluateOnNewDocument((data) => {
  for (const [k, v] of Object.entries(data)) localStorage.setItem(k, v);
}, seed);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function go(url, settle = 2500) {
  await page.goto(BASE + url, { waitUntil: "networkidle2", timeout: 60000 });
  await wait(settle);
}
async function shot(name) {
  // The Next dev badge lives in a <nextjs-portal>; it must not be in a frame.
  await page.evaluate(() => document.querySelector("nextjs-portal")?.remove());
  await page.screenshot({ path: `${OUT}/coach-${name}.png` });
  console.log("captured", name);
}
// Click the smallest element whose text matches — closest to the actual control.
async function clickText(re, extra = "") {
  const ok = await page.evaluate(
    (src, flags, extraSel) => {
      const rx = new RegExp(src, flags);
      const nodes = [...document.querySelectorAll(extraSel || "button,[role=button],a,div,span")]
        .filter((e) => rx.test(e.textContent || "") && (e.textContent || "").length < 400);
      if (!nodes.length) return false;
      const el = nodes.sort((a, b) => a.textContent.length - b.textContent.length)[0];
      (el.closest("button,[role=button],a") || el).click();
      return el.textContent.slice(0, 60);
    },
    re.source, re.flags, extra,
  );
  console.log("click", re, "→", ok);
  return ok;
}

// 1. Plan — the block list.
await go("/varsity/coach/plan", 4000);
await shot("blocks");

// 2. Into Fall 2026 → the weeks of the block.
await clickText(/Fall 2026/);
await wait(1500);
await shot("block");

// 3. Week 6 — the current training week, day by day.
await clickText(/Aug 17 – Aug 23/);
await wait(1500);
await shot("week");

// 4. A session opened — Wednesday's 6×750m race pace.
await clickText(/6×750m race pace/);
await wait(1500);
await shot("session");

// 5. Lineup — the practice picker.
await go("/varsity/coach/lineup", 3500);
await shot("lineup-picker");

// 6. Tuesday AM (published) → the boats.
await page.evaluate(() => {
  const cell = [...document.querySelectorAll("button,[role=button],div")]
    .filter((e) => /Published/.test(e.textContent || "") && (e.textContent || "").length < 40)
    .sort((a, b) => a.textContent.length - b.textContent.length)[0];
  (cell?.closest("button,[role=button]") || cell)?.click();
});
await wait(2500);
await shot("boats");

// 7. Notes — the roster.
await go("/varsity/coach/notes", 3500);
await shot("notes");

// 8. John Brown's technical note.
await page.evaluate(() => {
  const el = [...document.querySelectorAll("*")].find(
    (e) => e.children.length === 0 && e.textContent.trim() === "John Brown",
  );
  (el?.closest("button,[role=button],li,div") || el)?.click();
});
await wait(2000);
await shot("note");

// ── Tall pan strips (full inner scroll expanded, for data-from/to pans) ──
async function tallshot(name) {
  await page.evaluate(() => {
    document.querySelector("nextjs-portal")?.remove();
    const root = document.querySelector(".h-dvh");
    if (root) { root.style.height = "auto"; root.style.overflow = "visible"; }
    const main = document.querySelector("main");
    if (main) { main.style.overflow = "visible"; main.style.height = "auto"; }
    document.documentElement.style.height = "auto";
    document.body.style.height = "auto";
  });
  await wait(400);
  await page.screenshot({ path: `${OUT}/coach-${name}-tall.png`, fullPage: true });
  console.log("captured tall", name);
}

// Boats, cox to bow.
await go("/varsity/coach/lineup", 3000);
await page.evaluate(() => {
  const cell = [...document.querySelectorAll("button,[role=button],div")]
    .filter((e) => /Published/.test(e.textContent || "") && (e.textContent || "").length < 40)
    .sort((a, b) => a.textContent.length - b.textContent.length)[0];
  (cell?.closest("button,[role=button]") || cell)?.click();
});
await wait(2500);
await tallshot("boats");

// The week, Monday to Sunday.
await go("/varsity/coach/plan", 3000);
await clickText(/Fall 2026/);
await wait(1200);
await clickText(/Aug 17 – Aug 23/);
await wait(1200);
await tallshot("week");

await browser.close();
console.log("tall done");
