// PROVISIONAL dark twins for every capture the landing shows — until the real
// dark screens are shot from the app.
//
// The page's light/dark switch (components/landing/PhoneMode.tsx) expects,
// for each /landing/<x>.webp, a /landing/dark/<x>.webp. The real ones come
// from the app itself: `node capture-light.mjs --mode dark` (needs the owner's
// login — save-cookie.mjs), then the closers' recolour pass on the dark base
// (recolor-shots.mjs / patch-gyms.mjs). Until then this writes stand-ins
// derived from the light captures: luminance inverted, hue rotated back so
// reds stay red and blues stay blue. They READ as a dark mode; they are not
// the app's dark theme (its crimson stays crimson; here it goes salmon).
//
//   node dark-placeholders.mjs            # writes public/landing/dark/**
//
// Re-running overwrites; the real captures simply replace these files.
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("../../public/landing");
const OUT = path.join(ROOT, "dark");

// Only what the site references (lib/landingCopy.ts beats + coach steps +
// the two closers). The old-shot-day files (05, 06, 08–12) are not used.
const stills = [
  "01-gyms", "02-match", "03-why-you-match", "04-plan-a-session",
  "tall-logsheet", "tall-profile", "tall-vhome", "13-varsity-log-list",
  "14-varsity-calendar", "tall-vprofile",
  "coach-1-create", "coach-2-build", "coach-3-plan", "coach-4-lineup", "coach-5-notes",
];
const closers = fs.readdirSync(path.join(ROOT, "closers")).filter((f) => f.endsWith(".webp"));

fs.mkdirSync(path.join(OUT, "closers"), { recursive: true });

async function twin(src, dst) {
  await sharp(src).negate({ alpha: false }).modulate({ hue: 180 }).webp({ quality: 86 }).toFile(dst);
  console.log(path.relative(ROOT, dst));
}
for (const n of stills) await twin(path.join(ROOT, n + ".webp"), path.join(OUT, n + ".webp"));
for (const f of closers) await twin(path.join(ROOT, "closers", f), path.join(OUT, "closers", f));
console.log(`\n${stills.length + closers.length} provisional dark frames. Replace with real captures when possible.`);
