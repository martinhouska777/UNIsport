/*
  Sound for the intro, version 7 (2026-10-24). The owner, on the v6 sets: "I want
  some sound from some reel that we put in ... I want a mouse-clicking sound, and
  I want the three things, like the popping sound. Just a normal popping sound
  where they pop up the three things. Then I want it at the end for the letters,
  and that's all I want for sound."

  Both sounds are cut from reel 01 in C:\VideoEditing\references\reels, the
  sound-design breakdown of the AI-prompt reel this intro copies. It plays the
  reel's effects with silence between them, so they come out whole, with no
  music under them (unlike the 2026-09-22 lift from the posted reel, which had to
  be high-passed out from under its song):
    - the mouse click: its cursor click on the arrow, 1.783-1.935 s
    - the pop: the five pops as its menu pops up, 2.92-4.15 s, about 0.1 s each

  Placed: the click on both presses, a pop on each of the three tiles, a pop on
  each letter of UNIsport as it lands. Nothing else: no whooshes, no push.
  The pops rotate through the reel's five so no two neighbours are the same,
  at their own pitch ("just a normal popping sound").

  Run:  node scripts/video/intro-sound-v7.mjs
  Out:  mockups/video/unisport-intro-v7.mp4
*/
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const V = (f) => path.join(ROOT, "mockups/video", f);
const { T, TIMES } = JSON.parse(readFileSync(V("intro-times.json"), "utf8"));
const REEL = "C:/VideoEditing/references/reels/01-ai-prompt-reel-timeline-visible.mp4";

const SR = 48000;
const N = Math.round(T.end * SR);
const dB = (x) => 10 ** (x / 20);

/* how loud each sound is: its loudest 50 ms (RMS, dBFS) and a peak it never
   passes. The letters are eight quick pops, so a little under the tiles. */
const LEVEL = { click: { rms: -21, peak: -8 }, tile: { rms: -23, peak: -10 }, letter: { rms: -25, peak: -12 } };
const REVERB_WET = 0.12;

/* ---------- the two sounds, cut from the reel ---------- */
const reel = (() => {
  const raw = execFileSync("ffmpeg", ["-v", "error", "-i", REEL, "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
})();
/* `from`..`to` seconds of the reel, short fades so nothing clicks at the edges;
   anchored on the first strong transient */
function cut(from, to) {
  const a = reel.slice(Math.round(from * SR), Math.round(to * SR));
  const fi = Math.round(0.002 * SR), fo = Math.round(0.008 * SR);
  for (let i = 0; i < a.length; i++) a[i] *= Math.min(1, i / fi, (a.length - i) / fo);
  let pk = 0; for (const v of a) pk = Math.max(pk, Math.abs(v));
  const hit = a.findIndex((v) => Math.abs(v) >= pk * 0.7);
  return { a, anchor: hit / SR };
}
const CLICK = cut(1.783, 1.935);
const POPS = [[2.918, 3.03], [3.114, 3.215], [3.398, 3.5], [3.681, 3.783], [4.048, 4.148]].map(([f, t]) => cut(f, t));

/* loudest 50 ms RMS and the peak, in dB */
function measure(a) {
  const W = 2400; let rms = 0, peak = 0;
  for (const v of a) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i + W <= a.length; i += 120) { let s = 0; for (let j = 0; j < W; j++) s += a[i + j] ** 2; rms = Math.max(rms, s / W); }
  if (a.length < W) { let s = 0; for (const v of a) s += v * v; rms = s / W; }
  return { rms: 10 * Math.log10(rms + 1e-12), peak: 20 * Math.log10(peak + 1e-12) };
}

/* ---------- placing ---------- */
const mix = new Float32Array(N);
/* `s` with its transient on t, brought to `level` */
function place(s, t, level) {
  const m = measure(s.a), g = dB(Math.min(level.rms - m.rms, level.peak - m.peak));
  const o0 = Math.round((t - s.anchor) * SR);
  for (let i = 0; i < s.a.length; i++) { const o = o0 + i; if (o >= 0 && o < N) mix[o] += s.a[i] * g; }
}

/* the two presses */
place(CLICK, T.tap1, LEVEL.click);
place(CLICK, T.tap2, LEVEL.click);
/* the three tiles pop up (the same moments v5's tiles used) */
for (let i = 0; i < 3; i++) place(POPS[i], T.tiles + 0.18 + i * 0.12, LEVEL.tile);
/* each letter of UNIsport pops as it lands (it falls for 0.55 s; settled at about +0.42) */
TIMES.word.forEach((t, i) => place(POPS[(i + 3) % POPS.length], t + 0.42, LEVEL.letter));

/* ---------- rendering: a little room, onto the picture ---------- */
const writeWav = (file, data, channels = 1) => {
  const buf = Buffer.alloc(44 + data.length * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + data.length * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(3, 20); buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4 * channels, 28); buf.writeUInt16LE(4 * channels, 32); buf.writeUInt16LE(32, 34);
  buf.write("data", 36); buf.writeUInt32LE(data.length * 4, 40);
  for (let i = 0; i < data.length; i++) buf.writeFloatLE(data[i], 44 + i * 4);
  writeFileSync(file, buf);
};
function roomIR() {
  const len = Math.round(0.5 * SR), pre = Math.round(0.01 * SR), ir = new Float32Array(len * 2);
  let s = 11, lpL = 0, lpR = 0, energy = 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; };
  for (let i = pre; i < len; i++) {
    const t = (i - pre) / SR, env = Math.exp(-t / 0.08), a = 0.35 + 0.5 * Math.exp(-t / 0.12);
    lpL += a * (r() - lpL); lpR += a * (r() - lpR);
    ir[i * 2] = lpL * env; ir[i * 2 + 1] = lpR * env;
    energy += (ir[i * 2] ** 2 + ir[i * 2 + 1] ** 2) / 2;
  }
  const k = 1 / Math.sqrt(energy);
  for (let i = 0; i < ir.length; i++) ir[i] *= k;
  return ir;
}
const tmp = (f) => path.join(os.tmpdir(), f);
const dry = tmp("v7-dry.wav"), ir = tmp("v7-room.wav"), wet = tmp("v7.wav");
writeWav(dry, mix);
writeWav(ir, roomIR(), 2);
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", dry, "-i", ir, "-filter_complex",
  `[0:a]aformat=channel_layouts=stereo,asplit[d][w];[w][1:a]afir=irnorm=-1:gtype=none:wet=${REVERB_WET}[r];` +
  `[d][r]amix=inputs=2:normalize=0:duration=first[a]`, "-map", "[a]", "-c:a", "pcm_f32le", wet]);
const out = V("unisport-intro-v7.mp4");
execFileSync("ffmpeg", ["-y", "-v", "error", "-i", V("unisport-intro.mp4"), "-i", wet, "-filter_complex",
  `[1:a]alimiter=limit=${dB(-2).toFixed(4)}:level=false:attack=2:release=40[a]`,
  "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", String(SR),
  "-shortest", "-movflags", "+faststart", out], { stdio: ["ignore", "ignore", "inherit"] });
console.log(`wrote ${path.basename(out)}  click ${(CLICK.a.length / SR * 1000).toFixed(0)} ms, pops ${POPS.map((p) => (p.a.length / SR * 1000).toFixed(0)).join("/")} ms`);
