/*
  Finds a music track's beat grid, so the picture's big moments can land on beats
  instead of wherever the track happens to be (C:\VideoEditing\MUSIC.md, section 3).

  No Python audio libraries on this machine, so this is the plain version of what
  librosa does: a spectral-flux onset envelope, an autocorrelation for the tempo,
  a comb search for the beat phase, and the bar phase from where the low end hits.
  Generated library music keeps a steady tempo, so a regular grid is enough.

  Run:  node scripts/video/music-grid.mjs <track.mp3> [fromSec] [toSec]
  Out:  <track>.grid.json next to the track — { bpm, beat, firstSound, beats[], downbeats[] }
*/
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const [file, fromArg = "0", toArg = "60"] = process.argv.slice(2);
if (!file) { console.error("usage: node music-grid.mjs <track> [fromSec] [toSec]"); process.exit(1); }
const FROM = +fromArg, TO = +toArg;
const SR = 22050, N = 1024, HOP = 256, FPS = SR / HOP;

const raw = execFileSync("ffmpeg", ["-v", "error", "-ss", String(FROM), "-t", String(TO - FROM), "-i", file,
  "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 29 });
const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);

/* radix-2 FFT, in place */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k];
        const vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci;
        const vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi;
        re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}

/* onset envelopes: full-band and low-band (< ~200 Hz) log spectral flux */
const frames = Math.floor((x.length - N) / HOP);
const win = Float32Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
const LOW = Math.round(200 / (SR / N));
let prev = null;
const flux = new Float32Array(frames), fluxLow = new Float32Array(frames), rms = new Float32Array(frames);
for (let f = 0; f < frames; f++) {
  const re = new Float64Array(N), im = new Float64Array(N);
  let e = 0;
  for (let i = 0; i < N; i++) { const v = x[f * HOP + i]; re[i] = v * win[i]; e += v * v; }
  rms[f] = Math.sqrt(e / N);
  fft(re, im);
  const mag = new Float32Array(N / 2);
  for (let k = 0; k < N / 2; k++) mag[k] = Math.log1p(100 * Math.hypot(re[k], im[k]));
  if (prev) {
    let s = 0, sl = 0;
    for (let k = 1; k < N / 2; k++) { const d = mag[k] - prev[k]; if (d > 0) { s += d; if (k <= LOW) sl += d; } }
    flux[f] = s; fluxLow[f] = sl;
  }
  prev = mag;
}
/* remove the slow trend so only the hits are left */
const detrend = (a) => {
  const out = new Float32Array(a.length), w = Math.round(FPS * 0.5);
  for (let i = 0; i < a.length; i++) {
    let s = 0, c = 0; for (let j = Math.max(0, i - w); j < Math.min(a.length, i + w); j++) { s += a[j]; c++; }
    out[i] = Math.max(0, a[i] - s / c);
  }
  return out;
};
const on = detrend(flux), onLow = detrend(fluxLow);

/* where the track actually starts sounding */
const peakRms = rms.reduce((m, v) => Math.max(m, v), 0);
let firstFrame = rms.findIndex((v) => v > peakRms * 0.05);
if (firstFrame < 0) firstFrame = 0;

/* tempo: autocorrelation over 70-170 BPM, weighted towards ~110 so octave errors lose */
let best = { score: -1, lag: 0 };
for (let bpm = 70; bpm <= 170; bpm += 0.1) {
  const lag = FPS * 60 / bpm;
  let s = 0;
  for (let i = 0; i + lag * 4 < on.length; i++) {
    const j = i + lag, j0 = Math.floor(j), fr = j - j0;
    s += on[i] * (on[j0] * (1 - fr) + on[j0 + 1] * fr);
  }
  const w = Math.exp(-0.5 * (Math.log2(bpm / 110) / 0.6) ** 2);
  if (s * w > best.score) best = { score: s * w, lag, bpm };
}
const P = best.lag;

/* beat phase: the offset whose comb catches the most onset energy */
const interp = (a, t) => { const i = Math.floor(t), f = t - i; return i + 1 < a.length ? a[i] * (1 - f) + a[i + 1] * f : 0; };
let phase = 0, ps = -1;
for (let p = 0; p < P; p += 0.25) {
  let s = 0; for (let t = p; t < on.length; t += P) s += interp(on, t);
  if (s > ps) { ps = s; phase = p; }
}
const beatFrames = []; for (let t = phase; t < on.length; t += P) beatFrames.push(t);

/* bar phase: which of every four beats carries the most low end */
let barPhase = 0, bs = -1;
for (let q = 0; q < 4; q++) {
  let s = 0; for (let i = q; i < beatFrames.length; i += 4) s += interp(onLow, beatFrames[i]) * 2 + interp(on, beatFrames[i]);
  if (s > bs) { bs = s; barPhase = q; }
}
const toSec = (f) => +(FROM + (f * HOP + N / 2) / SR).toFixed(4);

/* The flux frames are 46 ms wide, too coarse to put a beat on a frame of video.
   Snap the whole grid onto the real attacks: at a 3 ms hop, find the sharpest
   energy rise within 80 ms of every beat, and shift the grid by the median. */
const FH = 64, FW = 512, env = [];
for (let i = 0; i + FW < x.length; i += FH) { let s = 0; for (let j = 0; j < FW; j++) s += x[i + j] ** 2; env.push(Math.log10(s / FW + 1e-9)); }
const rise = env.map((v, i) => (i ? Math.max(0, v - env[i - 1]) : 0));
const offsets = beatFrames.map((f) => {
  const c = (f * HOP + N / 2 - FW) / FH, w = Math.round(0.08 * SR / FH); /* a rise shows when the attack enters the window's leading edge */
  let bi = Math.round(c), bv = -1;
  for (let i = Math.max(0, Math.round(c) - w); i <= Math.min(rise.length - 1, Math.round(c) + w); i++) if (rise[i] > bv) { bv = rise[i]; bi = i; }
  return (bi - c) * FH / SR;
}).sort((p, q) => p - q);
const shift = offsets[Math.floor(offsets.length / 2)] || 0;
const beats = beatFrames.map((f) => +(toSec(f) + shift).toFixed(4));
const downbeats = beats.filter((_, i) => i % 4 === barPhase);
const out = {
  file, bpm: +best.bpm.toFixed(2), beat: +(60 / best.bpm).toFixed(5),
  firstSound: toSec(firstFrame), beats, downbeats,
};
const jsonPath = file.replace(/\.[^.]+$/, "") + ".grid.json";
writeFileSync(jsonPath, JSON.stringify(out, null, 1));
console.log(`${file}: ${out.bpm} BPM, first sound ${out.firstSound}s, first downbeats ${downbeats.slice(0, 6).join(", ")}`);
