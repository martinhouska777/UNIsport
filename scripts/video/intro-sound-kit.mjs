/*
  Sound for the intro (scripts/video/intro.mjs), built from the generated kit in
  mockups/video/sfx (see make-sfx-kit.mjs). Replaces the old sfx-bank.mp3 approach,
  where every sound was sliced out of one file by timestamp.

  Three versions, so they can be compared side by side:
    quiet    only what the picture needs — keys, two taps, one whoosh, the note
    layered  the reference method: a bed throughout, three sounds per beat,
             three different whooshes, a riser into the moment they meet
    crisp    in between — brighter and drier, no bed, no riser

  Run:  node scripts/video/intro-sound-kit.mjs            (all three)
        node scripts/video/intro-sound-kit.mjs layered    (just one)
  Out:  mockups/video/unisport-intro-<version>.mp4
*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const V = (f) => path.join(ROOT, "mockups/video", f);
const KIT = process.argv.includes("--synth") ? "sfx" : "sfx-real";
const TAG = KIT === "sfx" ? "synth-" : "";
const S = (f) => path.join(ROOT, "mockups/video", KIT, f);
const { T, TIMES } = JSON.parse(readFileSync(V("intro-times.json"), "utf8"));

const SR = 48000;
const N = Math.round(T.end * SR);

const decode = (file) => {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
};

const NAMES = ["key-1", "key-2", "key-3", "key-4", "key-5", "key-6", "key-enter",
  "click-ui", "tap-1", "tap-2", "whoosh-low", "whoosh-mid", "whoosh-air",
  "riser", "note-warm", "bed-air"];
const SFX = {};
for (const n of NAMES) {
  if (!existsSync(S(n + ".wav"))) { console.error(`missing ${KIT}/${n}.wav — run: node scripts/video/make-sfx-kit${KIT === "sfx" ? "" : "-real"}.mjs`); process.exit(1); }
  SFX[n] = decode(S(n + ".wav"));
}
/* where each sound's transient sits; without a table, assume a swell peaking halfway */
const ANCHORS = existsSync(S("anchors.json")) ? JSON.parse(readFileSync(S("anchors.json"), "utf8")) : {};
const anchorOf = (name, rate) => (ANCHORS[name] !== undefined ? ANCHORS[name] / rate : (SFX[name].length / rate / SR) / 2);

function build(version) {
  const mix = new Float32Array(N);
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /* place a sound so that `t` is where it STARTS */
  function at(name, t, gain = 1, rate = 1) {
    const src = SFX[name], s0 = Math.round(t * SR);
    const n = Math.round(src.length / rate);
    for (let i = 0; i < n; i++) {
      const o = s0 + i; if (o < 0 || o >= N) continue;
      const p = i * rate, k = Math.floor(p), fr = p - k;
      if (k + 1 >= src.length) break;
      mix[o] += (src[k] * (1 - fr) + src[k + 1] * fr) * gain;
    }
  }
  /* place a sound so that its TRANSIENT lands on `t`, not its first sample */
  const peakAt = (name, t, gain = 1, rate = 1) => at(name, t - anchorOf(name, rate), gain, rate);

  /* the bed, looped with a crossfade, under the whole thing */
  function bed(gain) {
    const src = SFX["bed-air"], L = src.length, xf = Math.round(0.4 * SR);
    for (let i = 0; i < N; i++) {
      const p = i % (L - xf);
      let v = src[p];
      if (p < xf && i > L) v = v * (p / xf) + src[L - xf + p] * (1 - p / xf);
      const fade = Math.min(1, i / (SR * 0.8), (N - i) / (SR * 1.2));
      mix[i] += v * gain * fade;
    }
  }

  /* typing: rotate the six keys so no two neighbours match, vary the level,
     and land the last press of each run on the heavier key */
  let last = -1;
  function typeRun(times, gain, enter) {
    times.forEach((t, i) => {
      if (enter && i === times.length - 1) { at("key-enter", t, gain * 0.9); return; }
      let k; do { k = 1 + Math.floor(rnd() * 6); } while (k === last);
      last = k;
      at(`key-${k}`, t, gain * (0.8 + rnd() * 0.4));
    });
  }

  /* ---------------- the schedule ---------------- */

  if (version === "layered") bed(0.30);

  at("click-ui", T.cursor, 0.45);
  typeRun(TIMES.prefix, 0.55, false);
  typeRun(TIMES.sufA, 0.55, true);

  /* the activities lift in */
  if (version === "quiet") {
    peakAt("whoosh-air", T.lift, 0.30);
  } else {
    peakAt("whoosh-mid", T.lift, version === "layered" ? 0.34 : 0.40, 1.15);
    peakAt("whoosh-air", T.lift + 0.06, 0.22);
  }
  if (version !== "quiet") for (let i = 0; i < 3; i++) at("click-ui", T.tiles + 0.18 + i * 0.12, 0.26 - i * 0.04);

  /* the two taps */
  at("tap-1", T.tap1, 0.85);
  at("tap-2", T.tap2, 0.78);
  if (version === "layered") { peakAt("whoosh-air", T.tap1, 0.10); peakAt("whoosh-air", T.tap2, 0.09); }

  /* the activities leave */
  peakAt("whoosh-air", T.actOut + 0.1, version === "quiet" ? 0.20 : 0.28);

  /* the two i's slide apart — the biggest move in the film */
  peakAt("whoosh-low", T.slide + 0.45, version === "quiet" ? 0.55 : 0.70);
  if (version !== "quiet") peakAt("whoosh-mid", T.slide + 0.45, 0.22, 1.4);

  /* "Match." types */
  typeRun(TIMES.match, 0.50, true);

  /* the slow fill, then they meet */
  if (version === "layered") at("riser", T.met - 0.9, 0.16);
  at("note-warm", T.met, version === "quiet" ? 0.60 : 0.70);
  if (version !== "quiet") peakAt("whoosh-low", T.met + 0.1, 0.18, 1.8);

  peakAt("whoosh-air", T.matchOut, 0.22);

  /* the letters of UNIsport fall in and settle */
  TIMES.word.forEach((t, i) => at("click-ui", t + 0.42, 0.20 + (i % 2) * 0.04));

  /* "Live now at Harvard" */
  peakAt(version === "crisp" ? "whoosh-mid" : "whoosh-air", T.live, 0.26, 1.2);

  return mix;
}

function render(version) {
  const mix = build(version);
  let peak = 0; for (const v of mix) peak = Math.max(peak, Math.abs(v));
  const norm = peak > 0 ? 0.89 / peak : 1;
  const pcm = Buffer.alloc(44 + N * 2);
  pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write("WAVE", 8);
  pcm.write("fmt ", 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
  pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
  pcm.write("data", 36); pcm.writeUInt32LE(N * 2, 40);
  for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mix[i] * norm * 32767))), 44 + i * 2);
  const wav = path.join(os.tmpdir(), `intro-${version}.wav`);
  writeFileSync(wav, pcm);

  const out = V(`unisport-intro-${TAG}${version}.mp4`);
  execFileSync("ffmpeg", [
    "-y", "-i", V("unisport-intro.mp4"), "-i", wav,
    "-filter_complex", "[1:a]aformat=channel_layouts=stereo,loudnorm=I=-18:TP=-1.5:LRA=9[a]",
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
    "-shortest", "-movflags", "+faststart", out,
  ], { stdio: ["ignore", "ignore", "inherit"] });
  console.log("wrote " + path.basename(out));
}

const want = process.argv.slice(2).find((a) => !a.startsWith("--"));
for (const v of ["quiet", "crisp", "layered"]) if (!want || want === v) render(v);
