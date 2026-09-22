/*
  Sound for the intro (scripts/video/intro.mjs), light version.

  Real sound-effects from the ChatCut library, placed on the exact frames the
  picture uses. No baked music: the owner lays a trending track over it in
  Instagram, so the mix has to leave room and end clean.

  THE BANK. mockups/video/sfx-bank.mp3 is one 70 s audio export from the
  ChatCut project "UNIsport logo explorations", where each library sound was
  parked in its own 10 s slot (edit_item adds with fromFrame = slot * 300):
      0 s   Keyboard Typing Loop      (15.5 s of real keys)
     20 s   Deep Short Whoosh         (anchor at 20.0)
     30 s   Airy Short Whoosh         (anchor at 30.0)
     40 s   Simple Whoosh             (anchor at 40.0)
     50 s   Mouse Click               (anchor at 50.0)
     60 s   Vine Boom Impact          (anchor at 60.0)
     70 s   Sharp Bass Riser          (anchor at 70.0; the export clipped its tail)
  Why a bank: a library sound cannot be downloaded on its own, but an audio
  EXPORT of the timeline comes back as a plain S3 file. One export, seven sounds.

  Typing: every character gets its own 70 ms slice of the keyboard loop,
  cut from a seeded random spot, so the keys sound real and never repeat in a
  pattern. Times come from mockups/video/intro-times.json, written by
  intro.mjs — the same jitter the picture has.

  Run: node scripts/video/intro-sound.mjs
  In:  mockups/video/unisport-intro.mp4, sfx-bank.mp3, intro-times.json
       (optional) intro-bed-30s.mp3 for the second output
  Out: mockups/video/unisport-intro-reel.mp4  (SFX only — for Instagram)
       mockups/video/unisport-intro-bed.mp4   (SFX + the generated bed)
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

/* decode the bank to mono float PCM once */
const raw = execFileSync("ffmpeg", ["-v", "error", "-i", V("sfx-bank.mp3"), "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
const bank = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);

let seed = 5;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

/* copy bank[from, from+dur) to mix at time t, with short fades and a gain */
function put(t, from, dur, gain, fadeIn = 0.004, fadeOut = 0.03) {
  const s0 = Math.round(t * SR), b0 = Math.round(from * SR), n = Math.round(dur * SR);
  const fi = Math.round(fadeIn * SR), fo = Math.round(fadeOut * SR);
  for (let i = 0; i < n; i++) {
    const o = s0 + i, b = b0 + i;
    if (o < 0 || o >= N || b < 0 || b >= bank.length) continue;
    let g = gain;
    if (i < fi) g *= i / fi;
    if (i > n - fo) g *= (n - i) / fo;
    mix[o] += bank[b] * g;
  }
}

/* one key: a slice of the loop, from a random spot in its first 14 s */
function key(t, gain) { put(t, 0.3 + rnd() * 13.5, 0.07, gain, 0.002, 0.035); }

/* the library one-shots, by anchor. `pre` is how much before the anchor to include. */
const deep   = (t, g) => put(t - 0.5, 19.5, 1.3, g, 0.01, 0.2);
const airy   = (t, g) => put(t - 0.35, 29.65, 0.8, g, 0.01, 0.15);
const simple = (t, g) => put(t - 0.45, 39.55, 1.0, g, 0.01, 0.15);
const click  = (t, g) => put(t - 0.005, 49.995, 0.2, g, 0.001, 0.05);
const boom   = (t, g) => put(t - 0.05, 59.95, 2.4, g, 0.002, 0.6);
const riser  = (t, g) => put(t - 0.8, 69.3, 0.85, g, 0.05, 0.02);

/* a synthesised sub thump under the boom, so the connect has weight without the meme */
function thump(t, gain) {
  const s0 = Math.round(t * SR);
  for (let i = 0; i < SR * 0.9; i++) {
    const s = i / SR, f = 40 + 70 * Math.exp(-s * 20);
    const v = Math.sin(2 * Math.PI * f * s) * Math.exp(-s * 5.5);
    if (s0 + i < N) mix[s0 + i] += v * gain;
  }
}

/* ---- the schedule ---- */
click(T.cursor, 0.25);
for (const t of TIMES.prefix) key(t, 0.9);
for (const t of TIMES.sufA) key(t, 0.9);
for (const t of TIMES.del) key(t, 0.55);
for (const t of TIMES.sufB) key(t, 0.9);

airy(T.lift, 0.8);
simple(T.act, 0.55);
for (let i = 0; i < 3; i++) click(T.tiles + i * 0.12 + 0.18, 0.18);
click(T.tap1, 1.8); click(T.tap2, 1.8);
airy(T.actOut + 0.1, 0.6);

deep(T.slide + 0.35, 0.8);
for (const t of TIMES.match) key(t, 0.8);
riser(T.met, 0.7);
deep(T.met, 0.7);
boom(T.met, 0.35);
thump(T.met, 0.6);
simple(T.word, 0.45);

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

/* 1. SFX only — the Instagram file. Loud enough to sit under a music track added there. */
execFileSync("ffmpeg", [
  "-y", "-i", VID, "-i", sfx,
  "-filter_complex", "[1:a]aformat=channel_layouts=stereo,loudnorm=I=-18:TP=-1.5:LRA=9[a]",
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
  V("unisport-intro-reel.mp4"),
], { stdio: ["ignore", "ignore", "inherit"] });
console.log("wrote " + V("unisport-intro-reel.mp4"));

/* 2. SFX + the generated bed, for anywhere that is not Instagram */
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
