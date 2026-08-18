/*
  ERG SCAN — the real test.
  ---------------------------------------------------------------------------
  Sends a photo of an erg monitor through the app's own scan endpoint
  (POST /api/varsity/erg-scan) exactly as the phone does — downscaled to a
  ≤1600px JPEG — and prints what came back, so the vision prompt can be judged
  against a real screen and tuned.

    node scripts/erg-scan-test.mjs <photo.jpg> [endpoint]

  endpoint defaults to http://localhost:3000 (the dev server, which needs
  ANTHROPIC_API_KEY in .env.local); pass https://un-isport.vercel.app to test
  the deployed one (which needs the key in Vercel's environment variables).

  Reads nothing but the photo; the key stays on the server side.
*/
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const [, , photoArg, endpointArg] = process.argv;
if (!photoArg) {
  console.error("usage: node scripts/erg-scan-test.mjs <photo.jpg|png|webp> [endpoint]");
  process.exit(2);
}
const endpoint = (endpointArg || "http://localhost:3000").replace(/\/$/, "");
const photo = path.resolve(photoArg);

// The same shrink the phone does (lib/varsity/ergScan.ts: long edge ≤ 1600,
// JPEG 0.85), so the model sees what it will see in production.
const jpeg = await sharp(photo)
  .rotate() // honour the phone's EXIF orientation
  .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
  .jpeg({ quality: 85 })
  .toBuffer();
const image = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
console.log(`${path.basename(photo)} → ${(jpeg.length / 1024).toFixed(0)} KB JPEG → ${endpoint}/api/varsity/erg-scan`);

const t0 = Date.now();
const res = await fetch(`${endpoint}/api/varsity/erg-scan`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ image }),
});
const ms = Date.now() - t0;
const json = await res.json().catch(() => ({}));

if (!res.ok) {
  const why =
    json.error === "unconfigured"
      ? "the server has no ANTHROPIC_API_KEY (add it to .env.local for the dev server, or to Vercel → Settings → Environment Variables for production, then redeploy)"
      : json.error === "scan_failed"
        ? "the model call failed — see the server log for the Anthropic error"
        : json.error === "bad_image"
          ? "the image was rejected before reaching the model"
          : json.error;
  console.error(`✗ HTTP ${res.status} after ${ms} ms — ${why}`);
  process.exit(1);
}

const r = json.result;
console.log(`✓ ${ms} ms — monitor ${r.monitor}, ${r.confident ? "confident" : "NOT confident"}`);
console.log(
  `  total: ${r.totalMinutes ?? "—"} min · ${r.totalMetres ?? "—"} m · split ${r.splitPer500 ?? "—"} · r${r.strokeRate ?? "—"} · ${r.avgWatts ?? "—"} W`,
);
if (r.intervals?.length) {
  console.log(`  ${r.intervals.length} intervals:`);
  for (const i of r.intervals) {
    console.log(
      `    ${(i.label ?? "").padEnd(6)} ${i.metres ?? "—"} m  ${i.time ?? "—"}  ${i.splitPer500 ?? "—"}  r${i.strokeRate ?? "—"}`,
    );
  }
} else {
  console.log("  no intervals (a plain summary screen, or none read)");
}
console.log("\nraw:", JSON.stringify(r));
