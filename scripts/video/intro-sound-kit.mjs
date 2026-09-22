/*
  Sound for the intro (scripts/video/intro.mjs), built from the generated kit in
  mockups/video/sfx (see make-sfx-kit.mjs). Replaces the old sfx-bank.mp3 approach,
  where every sound was sliced out of one file by timestamp.

  Four versions, so they can be compared side by side:
    smooth   quiet and soft: nothing stacked, nothing sharp, half the level
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
const KIT = process.argv.includes("--synth") ? "sfx"
          : process.argv.includes("--soft") ? "sfx-soft" : "sfx-real";
const TAG = KIT === "sfx" ? "synth-" : KIT === "sfx-soft" ? "soft-" : "";
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
/* click-soft is newer than the synthesised kit, so fall back to click-ui if absent */
const OPTIONAL = ["click-soft", "whoosh-text", "tile", "push-join"];
const SFX = {};
for (const n of NAMES) {
  if (!existsSync(S(n + ".wav"))) { console.error(`missing ${KIT}/${n}.wav — run: node scripts/video/make-sfx-kit${KIT === "sfx" ? "" : "-real"}.mjs`); process.exit(1); }
  SFX[n] = decode(S(n + ".wav"));
}
for (const n of OPTIONAL) if (existsSync(S(n + ".wav"))) SFX[n] = decode(S(n + ".wav"));
const SOFT_CLICK = SFX["click-soft"] ? "click-soft" : "click-ui";
const pick = (name, fallback) => (SFX[name] ? name : fallback);
/* Owner: "make the whoosh less loud". Every whoosh, sweep and push in every
   version is scaled by this one number, so it can be dialled in one place. */
const WH = 0.6;
/* where each sound's transient sits; without a table, assume a swell peaking halfway */
const ANCHORS = existsSync(S("anchors.json")) ? JSON.parse(readFileSync(S("anchors.json"), "utf8")) : {};
const anchorOf = (name, rate) => (ANCHORS[name] !== undefined ? ANCHORS[name] / rate : (SFX[name].length / rate / SR) / 2);

function build(version) {
  const mix = new Float32Array(N);
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  /* place a sound so that `t` is where it STARTS */
  function at(name, t, gain = 1, rate = 1, fadeFrom = null) {
    const src = SFX[name], s0 = Math.round(t * SR);
    const n = Math.round(src.length / rate);
    /* fadeFrom: seconds into the sound where it should start dying away, so a long
       tail can be kept out of the next moment */
    const f0 = fadeFrom === null ? n : Math.round(fadeFrom * SR);
    for (let i = 0; i < n; i++) {
      const o = s0 + i; if (o < 0 || o >= N) continue;
      const p = i * rate, k = Math.floor(p), fr = p - k;
      if (k + 1 >= src.length) break;
      const g = i <= f0 ? 1 : Math.max(0, 1 - (i - f0) / (n - f0));
      mix[o] += (src[k] * (1 - fr) + src[k + 1] * fr) * gain * g * g;
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

  /* "smooth" is its own schedule: nothing sharp, nothing stacked, everything
     under half the level of the others. The owner asked for quiet, not punchy. */
  if (version === "smooth") {
    bed(0.14);
    at("click-ui", T.cursor, 0.22);
    typeRun(TIMES.prefix, 0.30, false);
    typeRun(TIMES.sufA, 0.30, true);
    peakAt("whoosh-air", T.lift, 0.20 * WH);
    at("tap-1", T.tap1, 0.42);
    at("tap-2", T.tap2, 0.38);
    peakAt("whoosh-air", T.actOut + 0.1, 0.14 * WH);
    peakAt("whoosh-low", T.slide + 0.45, 0.40 * WH);
    typeRun(TIMES.match, 0.28, true);
    at("note-warm", T.met, 0.44);
    peakAt("whoosh-air", T.matchOut, 0.12 * WH);
    TIMES.word.forEach((t) => at("click-ui", t + 0.42, 0.10));
    peakAt("whoosh-air", T.live, 0.14 * WH);
    return mix;
  }

  /* The owner picked this one, with three notes: no background (that ambience bed
     was audible as a separate sound interfering under the film), softer letters at
     the end, and less aggressive throughout. So: no bed, the rounded click-soft on
     the letters, and every level pulled back. */
  const G = version === "layered" ? 0.72 : 1;

  /* Owner: cut the first sound — every version now opens on the typing. */
  typeRun(TIMES.prefix, 0.55 * (version === "layered" ? 0.95 : 1), false);
  typeRun(TIMES.sufA, 0.55 * (version === "layered" ? 0.95 : 1), true);

  /* Owner: a whoosh as the line becomes "Choose your activity" */
  if (version === "layered") peakAt(pick("whoosh-text", "whoosh-air"), T.act, 0.34 * G * WH);

  /* the activities lift in */
  if (version === "quiet") {
    peakAt("whoosh-air", T.lift, 0.30 * WH);
  } else {
    peakAt("whoosh-mid", T.lift, (version === "layered" ? 0.34 : 0.40) * G * WH, 1.15);
    peakAt("whoosh-air", T.lift + 0.06, 0.22 * G * WH);
  }
  if (version !== "quiet") for (let i = 0; i < 3; i++)
    at(version === "layered" ? pick("tile", "click-ui") : "click-ui",
       T.tiles + 0.18 + i * 0.12, (0.30 - i * 0.05) * G);

  /* the two taps */
  /* anchored on the transient: this click's peak sits 0.10 s into the file, so
     placing it by its start would land it after the finger has already pressed */
  peakAt("tap-1", T.tap1, 0.85 * G);
  peakAt("tap-2", T.tap2, 0.78 * G);
  if (version === "layered") { peakAt("whoosh-air", T.tap1, 0.10 * WH); peakAt("whoosh-air", T.tap2, 0.09 * WH); }

  /* the activities leave */
  peakAt("whoosh-air", T.actOut + 0.1, (version === "quiet" ? 0.20 : 0.28) * G * WH);

  /* the two i's slide apart — the biggest move in the film */
  peakAt("whoosh-low", T.slide + 0.45, (version === "quiet" ? 0.55 : 0.70) * G * WH);
  if (version !== "quiet") peakAt("whoosh-mid", T.slide + 0.45, 0.22 * G * WH, 1.4);

  /* "Match." types */
  typeRun(TIMES.match, 0.50 * (version === "layered" ? 0.95 : 1), true);

  /* the slow fill, then they meet */
  /* Owner: a push again as they come closer together, but a different one from
     the slide. This swells across the whole join and peaks as they meet. */
  if (version === "layered") {
    const close = T.met - T.join, nm = pick("push-join", "riser");
    at(nm, T.join, 0.40 * G * WH, (SFX[nm].length / SR) / close);
  }
  /* This is a bass rumble, and left alone its 2.2 s tail drones underneath the
     UNIsport letters — that is the sound the owner heard interfering. Fade it out
     from 0.5 s in so it is gone before the letters land. */
  at("note-warm", T.met, (version === "quiet" ? 0.60 : 0.70) * G, 1,
     version === "layered" ? 0.5 : null);
  /* Owner: "start the sound when it starts combining". Not anchored on the
     connect at all any more — it BEGINS the moment the two halves start closing
     (T.join) and is stretched so it runs out exactly as they touch (T.met). It
     scores the whole movement instead of punctuating its end. */
  if (version !== "quiet") {
    const close = T.met - T.join;
    at("whoosh-low", T.join, 0.20 * G * WH, (SFX["whoosh-low"].length / SR) / close);
  }

  peakAt("whoosh-air", T.matchOut, 0.22 * G * WH);

  /* the letters of UNIsport fall in and settle */
  TIMES.word.forEach((t, i) => at(version === "layered" ? SOFT_CLICK : "click-ui",
    t + 0.42, (version === "layered" ? 0.13 : 0.20 + (i % 2) * 0.04) * (version === "layered" ? 1 : 1)));

  /* "Live now at Harvard" */
  peakAt(version === "crisp" ? "whoosh-mid" : "whoosh-air", T.live, 0.26 * G * WH, 1.2);

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
for (const v of ["smooth", "quiet", "crisp", "layered"]) if (!want || want === v) render(v);
