/*
  Builds the REAL-sound kit for the intro reel from downloaded Mixkit sounds
  (Mixkit Free Sound Effects License: free, commercial use, no attribution).

  The source library lives OUTSIDE this repo, at C:\VideoEditing\kits\mixkit-cc,
  because it's shared with any other video. Set SFX_LIBRARY to point elsewhere.

  Each source is trimmed to its transient so the placement code can rely on it,
  and every sound records where its peak sits in `anchors.json` — a whoosh has to
  be placed so its PEAK lands on the cut, not its first sample.

  Run:  node scripts/video/make-sfx-kit-real.mjs
  Out:  mockups/video/sfx-real/*.wav + anchors.json
*/
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const LIB = process.env.SFX_LIBRARY || "C:/VideoEditing/kits/mixkit-cc";
const OUT = path.join(ROOT, "mockups/video/sfx-real");
mkdirSync(OUT, { recursive: true });

/* name → [source file, start, length, gain, pitch]  (pitch 1 = unchanged) */
const KIT = {
  "key-1":      ["keyboard__single-key-press-in-a-laptop__2541", 0.10, 0.13, 1.0, 1.00],
  "key-2":      ["keyboard__hard-single-key-press-in-a-laptop__2542", 0.10, 0.13, 0.9, 1.00],
  "key-3":      ["keyboard__single-key-type__2533", 0.00, 0.20, 1.0, 1.00],
  "key-4":      ["keyboard__single-key-press-in-a-laptop__2541", 0.10, 0.13, 1.0, 1.09],
  "key-5":      ["keyboard__hard-single-key-press-in-a-laptop__2542", 0.10, 0.13, 0.9, 0.93],
  "key-6":      ["keyboard__single-key-type__2533", 0.00, 0.20, 1.0, 1.13],
  "key-enter":  ["keyboard__hard-single-key-press-in-a-laptop__2542", 0.09, 0.18, 1.0, 0.85],
  "click-ui":   ["technology__interface-device-click__2577", 0.00, 0.14, 1.0, 1.00],
  "tap-1":      ["click__on-or-off-light-switch-tap__2585", 0.00, 0.16, 1.0, 1.00],
  "tap-2":      ["click__plastic-bubble-click__1124", 0.07, 0.15, 1.0, 0.95],
  "whoosh-air": ["transition__short-transition-sweep__175", 0.15, 0.45, 1.0, 1.00],
  "whoosh-mid": ["transition__fast-small-sweep-transition__166", 0.05, 0.68, 1.0, 1.00],
  "whoosh-low": ["whoosh__cinematic-tunnel-reverb-woosh__1486", 0.15, 2.10, 1.0, 1.00],
  "riser":      ["whoosh__cinematic-whoosh-fast-transition__1492", 0.10, 1.15, 1.0, 1.00],
  "note-warm":  ["transition__bass-rumble-hum__2297", 0.00, 2.20, 1.0, 1.00],
  "bed-air":    ["technology__futuristic-sci-fi-computer-ambience__2507", 0.30, 6.00, 1.0, 1.00],
};

const SR = 48000;
const anchors = {};

for (const [name, [src, ss, dur, gain, pitch]] of Object.entries(KIT)) {
  const inFile = path.join(LIB, src + ".wav");
  if (!existsSync(inFile)) { console.error(`missing source: ${src}.wav in ${LIB}`); continue; }
  const out = path.join(OUT, name + ".wav");
  const filters = [
    `atrim=${ss}:${ss + dur}`, "asetpts=PTS-STARTPTS",
    pitch !== 1 ? `asetrate=${Math.round(SR * pitch)},aresample=${SR}` : null,
    "afade=t=in:st=0:d=0.004",
    `afade=t=out:st=${Math.max(0, dur / pitch - 0.02)}:d=0.02`,
    `volume=${gain}`,
    "loudnorm=I=-20:TP=-1.0:LRA=11",
  ].filter(Boolean).join(",");
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", inFile, "-af", filters,
    "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", out]);

  /* find where the peak sits, so placement can anchor on it */
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", out, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
  let p = 0, pi = 0;
  for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > p) { p = a; pi = i; } }
  anchors[name] = +(pi / SR).toFixed(4);
  console.log(`  ${name.padEnd(12)} ${(x.length / SR).toFixed(2)}s  peak@${anchors[name].toFixed(2)}s   <- ${src}`);
}

writeFileSync(path.join(OUT, "anchors.json"), JSON.stringify(anchors, null, 1));
writeFileSync(path.join(OUT, "SOURCES.txt"),
  "Mixkit Free Sound Effects License — free for commercial use, no attribution required.\n" +
  "Source library: " + LIB + "\n\n" +
  Object.entries(KIT).map(([k, v]) => `${k.padEnd(12)} ${v[0]}  (from ${v[1]}s, ${v[2]}s${v[4] !== 1 ? `, pitch ${v[4]}` : ""})`).join("\n") + "\n");
console.log("\nreal kit written to mockups/video/sfx-real");
