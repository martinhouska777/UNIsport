/*
  Sound for the intro (scripts/video/intro.mjs).

  Two layers:
    - the bed: a generated track (ChatCut, mureka-9, "Intro bed") that came
      back as sparse cinematic swells with long tails. It is spliced so one
      swell sits under the spark at 0.0 and the next under the moment the two
      figures connect (T.met). The tail between them is near-silent, so the
      splice is inaudible.
    - the small sounds, synthesised here as PCM so they land on the exact
      frame the picture does: a rising whoosh into the cursor, a click per
      typed character (and a softer one per deleted one), a downward whoosh
      for the burn, three ticks as the chips arrive, two UI taps, a whoosh for
      the slide, one low impact on the seam, a tick for the wordmark.

  Times are copied from intro.mjs's T. Change one, change both.

  Run: node scripts/video/intro-sound.mjs
  In:  mockups/video/unisport-intro.mp4, mockups/video/intro-bed-30s.mp3
  Out: mockups/video/unisport-intro-sound.mp4
*/
import { writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const VID = path.join(ROOT, "mockups/video/unisport-intro.mp4");
const BED = path.join(ROOT, "mockups/video/intro-bed-30s.mp3");
const OUT = path.join(ROOT, "mockups/video/unisport-intro-sound.mp4");

const T = {
  cursor: 0.55, typeA: 0.75, rateA: 15, del: 2.95, rateDel: 22, typeB: 3.55, rateB: 17,
  burn: 5.15, chips: 5.85, tap1: 6.75, tap2: 7.45, slide: 8.35, apart: 9.15, met: 9.95,
  word: 10.35, url: 10.85, out: 11.75, end: 12.25,
};
const NP = "Never train".length, NA = "alone again.".length, NB = "with the right people.".length;

/* where the bed's swells are (measured off its waveform) */
const SWELL_1 = 0.0, SWELL_2 = 14.3;

const SR = 48000;
const N = Math.round(T.end * SR);
const buf = new Float32Array(N);

let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 - 0.5; };

/* add a sound at time t; gen(i, n) returns a sample for index i of n */
function place(t, dur, gain, gen) {
  const s0 = Math.round(t * SR), n = Math.round(dur * SR);
  for (let i = 0; i < n && s0 + i < N; i++) buf[s0 + i] += gain * gen(i, n);
}

/* one-pole lowpass over white noise, cutoff sweeping from f0 to f1 */
function whoosh(t, dur, gain, f0, f1, shape = (x) => Math.sin(Math.PI * x)) {
  let y = 0;
  place(t, dur, gain, (i, n) => {
    const x = i / n;
    const f = f0 * Math.pow(f1 / f0, x);
    const a = 1 - Math.exp(-2 * Math.PI * f / SR);
    y += a * (rnd() * 2 - y);
    return y * shape(x) * 3;
  });
}

/* a typing click: a 4 ms burst of filtered noise with a tiny pitched body */
function click(t, gain) {
  const p = 1 + rnd() * 0.3;
  let y = 0;
  place(t, 0.035, gain, (i, n) => {
    const x = i / n;
    const a = 1 - Math.exp(-2 * Math.PI * 3200 * p / SR);
    y += a * (rnd() * 2 - y);
    const env = Math.exp(-x * 14);
    return (y * 2.2 + 0.4 * Math.sin(2 * Math.PI * 1900 * p * i / SR)) * env;
  });
}

/* a UI tap: short sine blip with a click on top */
function tap(t, gain, f = 1250) {
  place(t, 0.09, gain, (i, n) => {
    const x = i / n;
    return (Math.sin(2 * Math.PI * f * i / SR) * 0.7 + rnd() * 0.6 * Math.exp(-x * 40)) * Math.exp(-x * 9);
  });
}

/* a tick: like a tap but tiny and high */
const tick = (t, gain) => tap(t, gain, 2400);

/* the impact: a low sine with a fast pitch drop, plus a bright transient */
function impact(t, gain) {
  place(t, 1.4, gain, (i, n) => {
    const x = i / n, s = i / SR;
    const f = 42 + 90 * Math.exp(-s * 18);
    const low = Math.sin(2 * Math.PI * f * s) * Math.exp(-x * 4.5);
    const hit = rnd() * 2 * Math.exp(-s * 60);
    return low * 0.9 + hit * 0.5;
  });
}

/* ---- the schedule ---- */
whoosh(0.0, 0.62, 0.55, 250, 7000, (x) => Math.pow(Math.sin(Math.PI * x), 1.4));
tick(T.cursor, 0.35);

for (let i = 0; i < NP; i++) click(T.typeA + i / T.rateA, 0.5);
for (let i = 0; i < NA; i++) click(T.typeA + (NP + 1 + i) / T.rateA, 0.5);
for (let i = 0; i < NA; i++) click(T.del + i / T.rateDel, 0.32);
for (let i = 0; i < NB; i++) click(T.typeB + i / T.rateB, 0.5);

whoosh(T.burn, 0.5, 0.5, 6000, 180, (x) => Math.pow(Math.sin(Math.PI * x), 1.2));

tick(T.chips, 0.3); tick(T.chips + 0.1, 0.3); tick(T.chips + 0.2, 0.3);
tap(T.tap1, 0.75); tap(T.tap2, 0.75);

whoosh(T.slide, T.apart - T.slide + 0.1, 0.45, 300, 4500, (x) => Math.pow(Math.sin(Math.PI * x), 1.6));
impact(T.met, 0.95);
tick(T.word, 0.3);

/* write a 16-bit WAV */
let peak = 0; for (const v of buf) peak = Math.max(peak, Math.abs(v));
const norm = peak > 0 ? 0.9 / peak : 1;
const pcm = Buffer.alloc(44 + N * 2);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write("WAVE", 8);
pcm.write("fmt ", 12); pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32); pcm.writeUInt16LE(16, 34);
pcm.write("data", 36); pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * norm * 32767))), 44 + i * 2);
const sfx = path.join(os.tmpdir(), "intro-sfx.wav");
writeFileSync(sfx, pcm);

/* the bed: swell 1 under the spark, swell 2 under the seam; fade out with the picture */
const cut = T.met;                       // splice where the tail is near-silent
const filter = [
  `[1:a]atrim=${SWELL_1}:${SWELL_1 + cut},asetpts=PTS-STARTPTS[m1]`,
  `[1:a]atrim=${SWELL_2}:${SWELL_2 + (T.end - cut)},asetpts=PTS-STARTPTS[m2]`,
  `[m1][m2]concat=n=2:v=0:a=1,afade=t=out:st=${T.out - 0.2}:d=${T.end - T.out + 0.2},volume=0.55[bed]`,
  `[2:a]aformat=channel_layouts=stereo,volume=0.9[fx]`,
  `[bed][fx]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=9[a]`,
].join(";");

execFileSync("ffmpeg", [
  "-y", "-i", VID, "-i", BED, "-i", sfx,
  "-filter_complex", filter, "-map", "0:v", "-map", "[a]",
  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart", OUT,
], { stdio: ["ignore", "ignore", "inherit"] });
console.log("wrote " + OUT);
