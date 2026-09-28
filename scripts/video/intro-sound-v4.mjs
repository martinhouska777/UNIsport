/*
  Sound for the intro, version 4 (2026-09-27). The same sounds the owner picked in
  version 3 ("layered" in intro-sound-kit.mjs), re-mixed with what the sound-design
  tutorials taught (C:\VideoEditing\TECHNIQUE.md, the 2026-09-27 section), and
  optionally a music track underneath so the effects sit in the background.

  What changed from version 3, and why:
    - the typing was 15-20 dB louder than anything else in the film (measured
      -15 LUFS momentary against -31..-40 for the rest). It now sits with the rest.
    - no dynamic loudnorm on the mix any more: it flattened the order of loud and
      quiet. Levels are set here, and one fixed gain brings the finished mix to
      its target.
    - every whoosh goes through the soft chain: highs cut, pitched down, and a
      much quieter bright copy on top to keep a little air (Schiffer).
    - the lift into "Choose your activity" had three whooshes inside 0.3 s; now
      it has one, peaking as the new line arrives.
    - no whoosh under the two presses (a small move gets one sound).
    - the three tile clicks climb a semitone each.
    - the close: the two whooshes used to be sped up to fit, which pitched them
      UP. Now one whoosh is REVERSED so it swells from the moment the halves start
      closing and is cut as they touch. The owner's push stays under it, quieter.
    - the slide keeps its low end out, so the first bass arrives at the connect.
    - the letters of UNIsport climb half a semitone each as they land.
    - one shared short room reverb on all the effects, about 15% wet.
  Owner decisions kept: nothing before the typing; no ambience bed; the first
  mouse button on both presses; a whoosh as the line becomes "Choose your
  activity"; a push as the halves close, different from the slide; the connect
  tone; the soft letter clicks; no sound under "Live now at Harvard".

  Music (optional): mockups/video/music/<name>.mp3 plus <name>.grid.json from
  music-grid.mjs. The track is placed so a downbeat lands on the connect (T.met),
  fades in under the typing and fades out under "Live now at Harvard". The
  effects are mixed SFX_UNDER_MUSIC dB under the music.

  Version 5 (the default since the owner's pass on 2026-09-27) keeps only six of
  these sounds; see the schedule. `--v4` still builds version 4.

  Run:  node scripts/video/intro-sound-v4.mjs              -> unisport-intro-v5.mp4 (effects only)
        node scripts/video/intro-sound-v4.mjs --music a    -> unisport-intro-v5-music-a.mp4
        add --v4 for version 4 (unisport-intro-v4*.mp4)
        add --name v6 to put the same sound on a newer picture without writing over
        the v5 files (-> unisport-intro-v6.mp4): v6 is the bigger, shaded picture of
        2026-09-27 night, same times, so the same sound fits it frame for frame
*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const V = (f) => path.join(ROOT, "mockups/video", f);
const S = (f) => path.join(ROOT, "mockups/video/sfx-real", f);
const { T, TIMES } = JSON.parse(readFileSync(V("intro-times.json"), "utf8"));
const argAfter = (flag) => { const i = process.argv.indexOf(flag); return i > 0 ? process.argv[i + 1] : null; };
const MUSIC = argAfter("--music");

const SR = 48000;
const N = Math.round(T.end * SR);
const dB = (x) => 10 ** (x / 20);
const semis = (n) => 2 ** (n / 12);

/* finished loudness (integrated LUFS) */
const TARGET_SFX_ONLY = -21;       /* v4: sound all the way through */
const TARGET_SFX_ONLY_V5 = -30;    /* v5: six sparse sounds; keeps each one at or under its v4 level */
const TARGET_WITH_MUSIC = -16;
const SFX_UNDER_MUSIC = 9;
const REVERB_WET = 0.2; /* about -14 dB against the dry sound */

/* ---------- the kit, plus the processed copies this version uses ---------- */
const decode = (file, filter) => {
  const args = ["-v", "error", "-i", file];
  if (filter) args.push("-af", filter);
  args.push("-ac", "1", "-ar", String(SR), "-f", "f32le", "-");
  const raw = execFileSync("ffmpeg", args, { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
};
if (!existsSync(S("anchors.json"))) { console.error("run: node scripts/video/make-sfx-kit-real.mjs"); process.exit(1); }
const ANCHORS = JSON.parse(readFileSync(S("anchors.json"), "utf8"));
const SFX = {};
const load = (name, base = name, filter = null) => {
  SFX[name] = decode(S(base + ".wav"), filter);
  if (ANCHORS[name] === undefined) ANCHORS[name] = ANCHORS[base];
};
for (let k = 1; k <= 6; k++) load(`key-${k}`, `key-${k}`, "lowpass=f=3200");
load("key-enter", "key-enter", "lowpass=f=2800");
load("tile"); load("click-soft"); load("note-warm");
load("tap", "tap-1", "lowpass=f=5000");
load("whoosh-text~soft", "whoosh-text", "lowpass=f=3800");
load("whoosh-text");
load("whoosh-air~soft", "whoosh-air", "lowpass=f=3000");
load("whoosh-slide", "whoosh-low", "highpass=f=110,lowpass=f=4500");
load("whoosh-mid");
load("push~soft", "push-join", "lowpass=f=3500");
/* the swell into the connect: whoosh-low played backwards, so it builds INTO its
   peak instead of away from it */
load("swell", "whoosh-low", "areverse,lowpass=f=4000,highpass=f=50");
ANCHORS.swell = SFX.swell.length / SR - ANCHORS["whoosh-low"];

/* The tile sound. Owner, 2026-09-27: "do a different sound effect for the showing of
   the three things". Auditioned with --tile <name>; "select" is the v3-v5 sound.
   `steps` are the semitones of the three tiles: a small climb for noises, a rising
   chord for the pitched ones. Gains are matched by ear-level measurement so the
   auditions compare the sound, not the volume. */
const LIB = "C:/VideoEditing/kits";
const TILES = {
  select:  { gain: -20.5, steps: [0, 1, 2] },
  pop:     { file: `${LIB}/mixkit-cc/pop__dry-pop-up-notification-alert__2356.wav`, filter: "lowpass=f=5000", gain: -26.3, steps: [0, 1, 2] },
  light:   { file: `${LIB}/mixkit-cc/whoosh__explainer-video-pops-whoosh-light-pop__3005.wav`, filter: "lowpass=f=5500", gain: -25.7, steps: [0, 1, 2] },
  bubble:  { file: `${LIB}/mixkit-cc/click__plastic-bubble-click__1124.wav`, filter: "lowpass=f=4500", gain: -20, steps: [0, 1, 2] },
  glass:   { file: `${LIB}/kenney-cc0/kenney_interface-sounds/Audio/glass_001.ogg`, filter: "lowpass=f=6000", gain: -19, steps: [0, 2, 4] },
  drop:    { file: `${LIB}/kenney-cc0/kenney_interface-sounds/Audio/drop_002.ogg`, filter: "lowpass=f=5000", gain: -18, steps: [0, 2, 4] },
  marimba: { synth: true, gain: -31.5, steps: [0, 4, 7] },
};
/* Owner picked "light" (audition 2) on 2026-09-27; it is the v5 default. */
const TILE = argAfter("--tile") || "light";
if (!TILES[TILE]) { console.error(`--tile: one of ${Object.keys(TILES).join(", ")}`); process.exit(1); }
{
  const o = TILES[TILE];
  if (o.file) SFX["tile~pick"] = decode(o.file, `${o.filter},afade=t=out:st=0.25:d=0.1,atrim=0:0.35`);
  else if (o.synth) {
    /* a soft marimba: a sine at A5 with a quieter 4th partial, 2 ms attack, 180 ms ring */
    const len = Math.round(0.4 * SR), b = new Float32Array(len), f0 = 880;
    for (let i = 0; i < len; i++) {
      const t = i / SR, env = Math.min(1, t / 0.002) * Math.exp(-t / 0.18);
      b[i] = (Math.sin(2 * Math.PI * f0 * t) + 0.18 * Math.sin(2 * Math.PI * f0 * 3.93 * t) * Math.exp(-t / 0.03)) * env * 0.5;
    }
    SFX["tile~pick"] = b;
  } else SFX["tile~pick"] = SFX.tile;
  let pk = 0, pi = 0; SFX["tile~pick"].forEach((v, i) => { if (Math.abs(v) > pk) { pk = Math.abs(v); pi = i; } });
  /* bring every audition to the same peak before its gain, so the table compares like with like */
  if (TILE !== "select") SFX["tile~pick"] = SFX["tile~pick"].map((v) => v / pk * dB(-1));
  ANCHORS["tile~pick"] = pi / SR;
}

/* ---------- placing ---------- */
const mix = new Float32Array(N);
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/* place `name` so that it STARTS at t. rate < 1 = slower and lower. `from`/`len`
   pick a stretch of the source (seconds of source); the edges get short fades so
   nothing clicks. */
function at(name, t, gain, rate = 1, from = 0, len = null, fadeOut = 0) {
  const src = SFX[name];
  const s0 = Math.round(from * SR), s1 = len === null ? src.length : Math.min(src.length, s0 + Math.round(len * SR));
  const n = Math.floor((s1 - s0 - 1) / rate), o0 = Math.round(t * SR);
  const edge = Math.round(0.006 * SR), fo = Math.round(fadeOut * SR);
  for (let i = 0; i < n; i++) {
    const o = o0 + i; if (o < 0 || o >= N) continue;
    const p = s0 + i * rate, k = Math.floor(p), fr = p - k;
    let g = Math.min(1, (i + 1) / edge, (n - i) / edge);
    if (fo && n - i < fo) g *= Math.sin((Math.PI / 2) * (n - i) / fo);
    mix[o] += (src[k] * (1 - fr) + src[k + 1] * fr) * gain * g;
  }
}
/* place `name` so that its PEAK lands on t */
const peakAt = (name, t, gain, rate = 1) => at(name, t - ANCHORS[name] / rate, gain, rate);

/* typing: rotate six keys so no two neighbours match, +-1.5 dB, the run ends on the heavier key */
let lastKey = -1;
function typeRun(times, gain, enter) {
  times.forEach((t, i) => {
    if (enter && i === times.length - 1) { peakAt("key-enter", t, gain * dB(2)); return; }
    let k; do { k = 1 + Math.floor(rnd() * 6); } while (k === lastKey);
    lastKey = k;
    peakAt(`key-${k}`, t, gain * dB((rnd() - 0.5) * 3));
  });
}

/* ---------- the schedule ---------- */

/* Version 5 (owner, 2026-09-27): "skip all sound effects, they're distracting".
   What stays is exactly the owner's list, nothing else: the whoosh on the cut into
   "Choose your activity", the three tiles, the two clicks, the same whoosh on the
   next cut (and no second whoosh for the slide), nothing during "Match.", and one
   sound WHILE the halves are connecting that is gone the moment they connect. No
   typing, no connect tone, no letter clicks. `--v4` builds the fuller mix. */
const V4 = process.argv.includes("--v4");
if (!V4) {
  /* 2.0-2.3  the cut into "Choose your activity": one soft whoosh, peak on the new line */
  peakAt("whoosh-text~soft", T.act, dB(-13), 0.88);
  peakAt("whoosh-text", T.act, dB(-27));

  /* the three tiles land */
  for (let i = 0; i < 3; i++) peakAt("tile~pick", T.tiles + 0.18 + i * 0.12, dB(TILES[TILE].gain), semis(TILES[TILE].steps[i]));

  /* the two clicks: the first mouse button on both */
  peakAt("tap", T.tap1, dB(-15));
  peakAt("tap", T.tap2, dB(-15.5), semis(-0.5));

  /* 4.65-4.9  the next cut: the SAME whoosh again, peak as "Find training partners"
     arrives. The slide that follows gets nothing. */
  peakAt("whoosh-text~soft", T.find, dB(-13), 0.88);
  peakAt("whoosh-text", T.find, dB(-27));

  /* 6.45-7.75  while they connect: the owner's push, starting as they start closing
     and dying away to nothing exactly as they touch. Nothing at the touch itself. */
  {
    const close = T.met - T.join;
    at("push~soft", T.join, dB(-14), 1, 0, close, 0.45);
  }
}

if (V4) {
  
  /* 0.35-1.19  the headline types. Nothing before it (owner). */
  typeRun(TIMES.prefix, dB(-36), false);
  typeRun(TIMES.sufA, dB(-36), true);
  
  /* 2.0-2.3  the line lifts away and "Choose your activity" arrives: one whoosh, soft,
     slowed a little, its peak on the new line; a faint bright copy for air */
  peakAt("whoosh-text~soft", T.act, dB(-13), 0.88);
  peakAt("whoosh-text", T.act, dB(-27));
  
  /* the three tiles land: one click each, climbing a semitone */
  for (let i = 0; i < 3; i++) peakAt("tile", T.tiles + 0.18 + i * 0.12, dB(-20.5), semis(i));
  
  /* the two presses: the first mouse button on both (owner), the second a touch lower */
  peakAt("tap", T.tap1, dB(-15));
  peakAt("tap", T.tap2, dB(-15.5), semis(-0.5));
  
  /* 4.65  the activities leave */
  peakAt("whoosh-air~soft", T.actOut + 0.1, dB(-12), 0.9);
  
  /* 5.0-5.75  the two halves slide apart: the biggest move so far, but the low end
     is held back for the connect */
  peakAt("whoosh-slide", T.slide + 0.45, dB(-6), 0.92);
  peakAt("whoosh-mid", T.slide + 0.45, dB(-19), 1.4);
  
  /* 6.25  "Match." types */
  typeRun(TIMES.match, dB(-36), true);
  
  /* 6.45-7.75  they close and connect. The swell starts exactly as they start closing
     and is cut the instant they touch; the push sits under it; the connect tone is
     the release. */
  {
    const close = T.met - T.join, rate = 0.9;
    const end = ANCHORS.swell;            /* the swell's peak, in source seconds */
    const len = close * rate;             /* how much source fills the close */
    at("swell", T.join, dB(-26), rate, Math.max(0, end - len), Math.min(len, end));
    const pushLen = Math.min(SFX["push~soft"].length / SR, close);
    at("push~soft", T.join, dB(-27), 1, 0, pushLen);
  }
  peakAt("note-warm", T.met, dB(-6));
  
  /* 7.9  "Match." leaves, barely there */
  peakAt("whoosh-air~soft", T.matchOut, dB(-24), 0.9);
  
  /* 8.62-9.11  the letters of UNIsport land, climbing half a semitone each */
  TIMES.word.forEach((t, i) => peakAt("click-soft", t + 0.42, dB(-22), semis(i * 0.5)));
  
  /* 9.0  "Live now at Harvard": no sound of its own (owner) */
}

/* ---------- rendering ---------- */

const writeWav = (file, data, channels = 1) => {
  const frames = data.length / channels, buf = Buffer.alloc(44 + data.length * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + data.length * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4 * channels, 28); buf.writeUInt16LE(4 * channels, 32); buf.writeUInt16LE(32, 34);
  buf.write("data", 36); buf.writeUInt32LE(data.length * 4, 40);
  for (let i = 0; i < data.length; i++) buf.writeFloatLE(data[i], 44 + i * 4);
  writeFileSync(file, buf);
  return frames;
};

/* a small room: 0.7 s of decaying noise, different in each ear, darker as it dies */
function roomIR() {
  const len = Math.round(0.7 * SR), pre = Math.round(0.012 * SR), ir = new Float32Array(len * 2);
  let s = 11, lpL = 0, lpR = 0, energy = 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; };
  for (let i = pre; i < len; i++) {
    const t = (i - pre) / SR, env = Math.exp(-t / 0.1);
    const a = 0.35 + 0.5 * Math.exp(-t / 0.15); /* one-pole low-pass, closing as it decays */
    lpL += a * (r() - lpL); lpR += a * (r() - lpR);
    ir[i * 2] = lpL * env; ir[i * 2 + 1] = lpR * env;
    energy += (ir[i * 2] ** 2 + ir[i * 2 + 1] ** 2) / 2;
  }
  const k = 1 / Math.sqrt(energy);
  for (let i = 0; i < ir.length; i++) ir[i] *= k;
  return ir;
}

const tmp = (f) => path.join(os.tmpdir(), f);
/* integrated loudness and true peak; ffmpeg prints the summary on stderr */
function loudness(file) {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128=peak=true", "-f", "null", "-"],
    { encoding: "utf8", maxBuffer: 1 << 26 }).stderr;
  const sum = r.slice(r.lastIndexOf("Summary"));
  return { I: +/I:\s+(-?[\d.]+) LUFS/.exec(sum)[1], TP: +/Peak:\s+(-?[\d.]+) dBFS/.exec(sum)[1] };
}

/* 1. the effects, dry, plus the room */
const dryWav = tmp("v4-sfx-dry.wav"), irWav = tmp("v4-room.wav"), sfxWav = tmp("v4-sfx.wav");
writeWav(dryWav, mix);
writeWav(irWav, roomIR(), 2);
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", dryWav, "-i", irWav, "-filter_complex",
  `[0:a]aformat=channel_layouts=stereo,asplit[d][w];` +
  `[w][1:a]afir=irnorm=-1:gtype=none:wet=${REVERB_WET}[r];` +
  `[d][r]amix=inputs=2:normalize=0:duration=first[a]`,
  "-map", "[a]", "-c:a", "pcm_f32le", sfxWav]);

/* 2. the music, if any: a downbeat on the connect, in under the typing, out under "Live now" */
let mixWav = sfxWav, target = V4 ? TARGET_SFX_ONLY : TARGET_SFX_ONLY_V5, tag = "";
if (MUSIC) {
  const track = V(`music/${MUSIC}.mp3`), grid = JSON.parse(readFileSync(V(`music/${MUSIC}.grid.json`), "utf8"));
  /* Which downbeat goes on the connect. Best: the one where the track steps up into
     its full section ("variation on the cut", MUSIC.md), so the build before it sits
     under the close and the music arrives with the mark. If that step comes too
     early to leave room for the film before it, the first downbeat that does. */
  const barDb = (d) => {
    const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", d.toFixed(3), "-t", (grid.beat * 4).toFixed(3), "-i", track,
      "-ac", "1", "-ar", "22050", "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
    const a = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    let s = 0; for (const v of a) s += v * v;
    return 10 * Math.log10(s / a.length);
  };
  const bars = grid.downbeats.filter((d) => d < 30).map((d) => ({ d, db: barDb(d) }));
  const plateau = Math.max(...bars.map((b) => b.db));
  const step = bars.find((b, i) => i > 0 && b.db >= plateau - 1.5 && bars[i - 1].db < plateau - 3);
  const fits = (d) => d - T.met >= grid.firstSound;
  const D0 = step && fits(step.d) ? step.d : grid.downbeats.find(fits);
  /* A whole-track grid can drift by tens of ms from a small tempo error, which is
     more than a frame. Snap the chosen downbeat to the real attacks right around
     it: the median offset of the sharpest energy rise near each of the nearby beats. */
  const D = (() => {
    const from = D0 - 2.5, SRa = 22050, H = 64, W = 512;
    const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", from.toFixed(3), "-t", "5", "-i", track,
      "-ac", "1", "-ar", String(SRa), "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
    const a = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4), env = [];
    for (let i = 0; i + W < a.length; i += H) { let s = 0; for (let j = 0; j < W; j++) s += a[i + j] ** 2; env.push(Math.log10(s / W + 1e-9)); }
    const offs = grid.beats.filter((b) => Math.abs(b - D0) < 2).map((b) => {
      const c = ((b - from) * SRa - W) / H, w = Math.round(0.08 * SRa / H);
      let bi = Math.round(c), bv = -1;
      for (let i = Math.round(c) - w; i <= Math.round(c) + w; i++) { const r = env[i] - env[i - 1]; if (r > bv) { bv = r; bi = i; } }
      return (bi - c) * H / SRa;
    }).sort((p, q) => p - q);
    return D0 + offs[Math.floor(offs.length / 2)];
  })();
  const offset = D - T.met;       /* track time at video time 0 */
  const musWav = tmp(`v4-music-${MUSIC}.wav`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", offset.toFixed(4), "-t", T.end.toFixed(3), "-i", track,
    "-af", `aformat=channel_layouts=stereo,aresample=${SR},` +
      `afade=t=in:st=0:d=0.6:curve=qsin,afade=t=out:st=${T.live}:d=${(T.end - T.live).toFixed(3)}:curve=qsin`,
    "-c:a", "pcm_f32le", musWav]);
  const m = loudness(musWav), s = loudness(sfxWav);
  /* music to -19, effects SFX_UNDER_MUSIC under it */
  const mg = -19 - m.I, sg = -19 - SFX_UNDER_MUSIC - s.I;
  mixWav = tmp(`v4-mix-${MUSIC}.wav`);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", musWav, "-i", sfxWav, "-filter_complex",
    `[0:a]volume=${mg.toFixed(2)}dB[m];[1:a]volume=${sg.toFixed(2)}dB[s];[m][s]amix=inputs=2:normalize=0:duration=first[a]`,
    "-map", "[a]", "-c:a", "pcm_f32le", mixWav]);
  target = TARGET_WITH_MUSIC; tag = `-music-${MUSIC}`;
  console.log(`music ${MUSIC}: ${grid.bpm} BPM, downbeat ${D.toFixed(3)}s of the track on the connect (track starts at ${offset.toFixed(3)}s)`);
}

/* 3. one fixed gain to the target, a safety limiter at -2 dBFS (AAC adds a little on top), onto the picture */
const pre = loudness(mixWav);
const gain = target - pre.I;
const NAME = argAfter("--name") || (V4 ? "v4" : "v5");
const out = V(`unisport-intro-${NAME}${argAfter("--tile") && !V4 ? "-tile-" + TILE : ""}${tag}.mp4`);
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", V("unisport-intro.mp4"), "-i", mixWav, "-filter_complex",
  `[1:a]volume=${gain.toFixed(2)}dB,alimiter=limit=${dB(-2).toFixed(4)}:level=false:attack=2:release=40[a]`,
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", String(SR),
  "-shortest", "-movflags", "+faststart", out], { stdio: ["ignore", "ignore", "inherit"] });
const fin = loudness(out);
console.log(`wrote ${path.basename(out)}  ${fin.I} LUFS, true peak ${fin.TP} dBFS`);
