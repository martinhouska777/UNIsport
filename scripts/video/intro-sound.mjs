/*
  Sound for the intro (scripts/video/intro.mjs), light v2.

  Placed on the exact frames the picture uses; no baked music, so the owner
  can lay a trending track over it in Instagram.

  WHERE THE SOUNDS COME FROM
    - ref-keys.wav / ref-tap.wav: the owner asked for the reference reel's own
      typing and tap. In that reel they sit under a music bed, so they were
      lifted with a high-pass filter (1.4 kHz for the keys, 500 Hz for the
      tap) from mockups of the reference (Downloads/WhatsApp Video ... 2.09.07
      PM.mp4, 5.35–6.05 s and 7.995–8.115 s). Every typed character plays a
      random 55 ms slice of the keys file, so no pattern repeats.
    - sfx-bank.mp3: seven ChatCut LIBRARY sounds parked one per 10 s slot and
      exported as one file (see the slot table below). Used for the whooshes,
      the riser and the low hit.
  If ref-keys.wav is missing, the keyboard loop from the bank is used instead.

  THE BANK slots (anchor = the sound's transient):
      0 s  Keyboard Typing Loop (15.5 s)   20 s Deep Short Whoosh
     30 s  Airy Short Whoosh               40 s Simple Whoosh
     50 s  Mouse Click                     60 s Vine Boom Impact
     70 s  Sharp Bass Riser (tail clipped by the export)

  Run: node scripts/video/intro-sound.mjs
  Out: mockups/video/unisport-intro-reel.mp4 (SFX only — for Instagram)
       mockups/video/unisport-intro-bed.mp4  (SFX + the generated bed)
*/
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const V = (f) => path.join(ROOT, "mockups/video", f);
const { T, TIMES } = JSON.parse(readFileSync(V("intro-times.json"), "utf8"));

const SR = 48000;
const N = Math.round(T.end * SR);
const mix = new Float32Array(N);

const decode = (file) => {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
};
const bank = decode(V("sfx-bank.mp3"));
const keys = existsSync(V("ref-keys.wav")) ? decode(V("ref-keys.wav")) : null;
const tapS = existsSync(V("ref-tap.wav")) ? decode(V("ref-tap.wav")) : null;

let seed = 5;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

function put(src, t, from, dur, gain, fadeIn = 0.004, fadeOut = 0.03) {
  const s0 = Math.round(t * SR), b0 = Math.round(from * SR), n = Math.round(dur * SR);
  const fi = Math.round(fadeIn * SR), fo = Math.round(fadeOut * SR);
  for (let i = 0; i < n; i++) {
    const o = s0 + i, b = b0 + i;
    if (o < 0 || o >= N || b < 0 || b >= src.length) continue;
    let g = gain;
    if (i < fi) g *= i / fi;
    if (i > n - fo) g *= (n - i) / fo;
    mix[o] += src[b] * g;
  }
}

/* one key */
/* The keys are the library's real keyboard recording. The reference reel's
   own keys were tried (ref-keys.wav) and rejected by the owner: under its
   music they can only be lifted with a high-pass filter, and that thins them
   into a hiss. `keys` is kept only as an opt-in via USE_REF_KEYS=1. */
function key(t, gain) {
  if (keys && process.env.USE_REF_KEYS) put(keys, t, 0.02 + rnd() * (keys.length / SR - 0.1), 0.055, gain * 3.2, 0.002, 0.03);
  else put(bank, t, 0.3 + rnd() * 13.5, 0.07, gain, 0.002, 0.035);
}
/* the tap: the reference's own, or the library click */
function tap(t, gain) {
  if (tapS) put(tapS, t, 0, tapS.length / SR, gain * 2.6, 0.001, 0.04);
  else put(bank, t - 0.005, 49.995, 0.2, gain, 0.001, 0.05);
}
const deep   = (t, g) => put(bank, t - 0.5, 19.5, 1.3, g, 0.01, 0.2);
const airy   = (t, g) => put(bank, t - 0.35, 29.65, 0.8, g, 0.01, 0.15);
const simple = (t, g) => put(bank, t - 0.45, 39.55, 1.0, g, 0.01, 0.15);
const click  = (t, g) => put(bank, t - 0.005, 49.995, 0.2, g, 0.001, 0.05);
const boom   = (t, g) => put(bank, t - 0.05, 59.95, 2.4, g, 0.002, 0.6);
const riser  = (t, g) => put(bank, t - 0.8, 69.3, 0.85, g, 0.05, 0.02);
function thump(t, gain) {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < SR * 0.9; i++) {
    const s = i / SR, f = 40 + 70 * Math.exp(-s * 20);
    if (s0 + i < N) mix[s0 + i] += Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 5.5) * gain;
  }
}
/* a long, quiet air under the slow fill: the deep whoosh stretched by playing it slower */
function drone(t, dur, gain) {
  const s0 = Math.round(t * SR), n = Math.round(dur * SR), b0 = Math.round(19.55 * SR), len = Math.round(1.1 * SR);
  for (let i = 0; i < n; i++) {
    const o = s0 + i; if (o >= N) break;
    const p = (i / n) * len; const k = Math.floor(p), fr = p - k;
    const v = bank[b0 + k] * (1 - fr) + bank[b0 + k + 1] * fr;
    const env = Math.sin(Math.PI * (i / n));
    mix[o] += v * gain * env;
  }
}

/* ---- the schedule ---- */
click(T.cursor, 0.2);
for (const t of TIMES.prefix) key(t, 0.85);
for (const t of TIMES.sufA) key(t, 0.85);

airy(T.lift, 0.8);
simple(T.act, 0.5);
for (let i = 0; i < 3; i++) click(T.tiles + i * 0.12 + 0.18, 0.16);
tap(T.tap1, 1.0); tap(T.tap2, 1.0);
airy(T.actOut + 0.1, 0.55);

deep(T.slide + 0.4, 0.75);
for (const t of TIMES.match) key(t, 0.8);
/* the connect is quiet now (owner: no effect there): the air under the fill,
   one soft low note as they meet, nothing sharp */
drone(T.join, T.met - T.join, 0.5);
thump(T.met, 0.4);
airy(T.matchOut, 0.35);
/* the letters fall in; each lands with a soft click as it settles */
for (const t of TIMES.word) click(t + 0.42, 0.22);
simple(T.live, 0.35);

/* write a 16-bit WAV */
let peak = 0; for (const v of mix) peak = Math.max(peak, Math.abs(v));
const norm = peak > 0 ? 0.89 / peak : 1;
const pcm = Buffer.alloc(44 + N * 2);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write("WAVE", 8);
pcm.write("fmt ", 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write("data", 36); pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(mix[i] * norm * 32767))), 44 + i * 2);
const sfx = path.join(os.tmpdir(), "intro-sfx.wav");
writeFileSync(sfx, pcm);

const VID = V("unisport-intro.mp4");
execFileSync("ffmpeg", [
  "-y", "-i", VID, "-i", sfx,
  "-filter_complex", "[1:a]aformat=channel_layouts=stereo,loudnorm=I=-18:TP=-1.5:LRA=9[a]",
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
  V("unisport-intro-reel.mp4"),
], { stdio: ["ignore", "ignore", "inherit"] });
console.log("wrote " + V("unisport-intro-reel.mp4"));

if (existsSync(V("intro-bed-30s.mp3"))) {
  const SWELL_2 = 14.3, cut = T.met;
  const filter = [
    `[2:a]atrim=0:${cut},asetpts=PTS-STARTPTS[m1]`,
    `[2:a]atrim=${SWELL_2}:${SWELL_2 + (T.end - cut)},asetpts=PTS-STARTPTS[m2]`,
    `[m1][m2]concat=n=2:v=0:a=1,afade=t=out:st=${T.out - 0.2}:d=${T.end - T.out + 0.2},volume=0.5[bed]`,
    `[1:a]aformat=channel_layouts=stereo[fx]`,
    `[bed][fx]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[a]`,
  ].join(";");
  execFileSync("ffmpeg", [
    "-y", "-i", VID, "-i", sfx, "-i", V("intro-bed-30s.mp3"),
    "-filter_complex", filter, "-map", "0:v", "-map", "[a]",
    "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
    V("unisport-intro-bed.mp4"),
  ], { stdio: ["ignore", "ignore", "inherit"] });
  console.log("wrote " + V("unisport-intro-bed.mp4"));
}
