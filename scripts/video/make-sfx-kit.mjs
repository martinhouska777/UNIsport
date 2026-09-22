/*
  Generates the UI sound kit for the intro reel — every sound synthesised from
  scratch, so there is no licence, no attribution and no hunting. Change a number
  here and re-run to change a sound.

  Run:  node scripts/video/make-sfx-kit.mjs
  Out:  mockups/video/sfx/*.wav   (gitignored with the rest of the media)

  Design notes are in C:\VideoEditing\TECHNIQUE.md. The short version:
    - every moment gets a LOW sound and a BRIGHT sound, never one sound alone
    - the keys are six different samples so no two neighbouring letters match
    - the whooshes come in three lengths/registers and are never reused
*/
import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

const SR = 48000;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const OUT = path.join(ROOT, "mockups/video/sfx");
mkdirSync(OUT, { recursive: true });

/* ---------- plumbing ---------- */

let seed = 20260922;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;

/* Chamberlin state-variable filter. fc may change every sample. */
function makeSVF() {
  let low = 0, band = 0;
  return (x, fc, Q) => {
    const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 2.6) / SR), q = 1 / Q;
    const high = x - low - q * band;
    band += f * high;
    low += f * band;
    return { low, band, high };
  };
}

const secs = (n) => new Float64Array(Math.round(n * SR));
/* raised-cosine attack, exponential decay */
const env = (i, n, attack, tau) => {
  const t = i / SR;
  const a = t < attack ? 0.5 - 0.5 * Math.cos(Math.PI * t / attack) : 1;
  return a * Math.exp(-t / tau);
};

function write(name, buf, peak = 0.9) {
  /* de-click the tail so nothing ends on a step */
  const fade = Math.min(Math.round(0.004 * SR), buf.length);
  for (let i = 0; i < fade; i++) buf[buf.length - 1 - i] *= i / fade;
  let max = 0; for (const v of buf) max = Math.max(max, Math.abs(v));
  const g = max > 0 ? peak / max : 1;
  const n = buf.length, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8);
  b.write("fmt ", 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(buf[i] * g * 32767))), 44 + i * 2);
  writeFileSync(path.join(OUT, name), b);
  console.log("  " + name.padEnd(18) + (n / SR).toFixed(3) + "s");
}

/* ---------- the sounds ---------- */

/* A key press = a bright noise tick (the keycap) + a short damped body (the board
   underneath). Six variants so neighbouring letters never sound identical. */
function key({ tick, body, bodyTau, len = 0.07, tickTau = 0.0035 }) {
  const buf = secs(len), f1 = makeSVF(), f2 = makeSVF();
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const nz = noise();
    const a = f1(nz, tick, 2.2).band * Math.exp(-t / tickTau);
    const b = f2(nz, tick * 2.4, 1.1).high * Math.exp(-t / (tickTau * 0.6)) * 0.35;
    const c = Math.sin(2 * Math.PI * body * t) * env(i, buf.length, 0.0006, bodyTau) * 0.55;
    const d = Math.sin(2 * Math.PI * body * 2.37 * t) * Math.exp(-t / (bodyTau * 0.55)) * 0.18;
    buf[i] = a + b + c + d;
  }
  return buf;
}

console.log("keys");
const KEYS = [
  { tick: 4200, body: 168, bodyTau: 0.017 },
  { tick: 3600, body: 194, bodyTau: 0.015 },
  { tick: 5100, body: 152, bodyTau: 0.019 },
  { tick: 4600, body: 210, bodyTau: 0.014 },
  { tick: 3900, body: 176, bodyTau: 0.018 },
  { tick: 5500, body: 143, bodyTau: 0.016 },
];
KEYS.forEach((k, i) => write(`key-${i + 1}.wav`, key(k), 0.82 + (i % 3) * 0.05));
/* the last press of a word lands heavier */
write("key-enter.wav", key({ tick: 2900, body: 112, bodyTau: 0.032, len: 0.12, tickTau: 0.005 }), 0.95);

/* A soft interface click: a short ping, almost no noise. */
console.log("clicks and taps");
{
  const buf = secs(0.05), f = makeSVF();
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    buf[i] = Math.sin(2 * Math.PI * 1180 * t) * env(i, buf.length, 0.0008, 0.009)
           + f(noise(), 2600, 3).band * Math.exp(-t / 0.0022) * 0.25;
  }
  write("click-ui.wav", buf, 0.7);
}

/* A finger on glass: damped noise, no high end, with a small thud under it. */
function tap(cut, thud, tau) {
  const buf = secs(0.16), f = makeSVF();
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    buf[i] = f(noise(), cut, 1.6).low * Math.exp(-t / tau)
           + Math.sin(2 * Math.PI * thud * t) * env(i, buf.length, 0.001, tau * 2.4) * 0.5;
  }
  return buf;
}
write("tap-1.wav", tap(2700, 96, 0.022), 0.85);
write("tap-2.wav", tap(2350, 88, 0.026), 0.8);

/* The two selection presses are the one place synthesis was rejected: the owner
   wants "exactly like a mouse click button", and a real mouse button is a pair of
   transients 126 ms apart (press down, release up) that is very hard to fake. So
   for tap-1/tap-2 only, a recording is imported over the synthesised ones.
   Source: Mixkit "mouse click close" — free for commercial use, no attribution.
   If the library isn't on this machine the synthesised taps above are kept. */
{
  const LIB = process.env.SFX_LIBRARY || "C:/VideoEditing/kits/mixkit-cc";
  const src = path.join(LIB, "click__mouse-click-close__1113.wav");
  if (existsSync(src)) {
    for (const [name, pitch, gain] of [["tap-1", 1.0, 1.0], ["tap-2", 0.97, 0.94]]) {
      const af = [`atrim=0:0.24`, "asetpts=PTS-STARTPTS",
        pitch !== 1 ? `asetrate=${Math.round(SR * pitch)},aresample=${SR}` : null,
        "afade=t=in:st=0:d=0.002", "afade=t=out:st=0.21:d=0.03",
        `volume=${gain}`, "loudnorm=I=-20:TP=-1.0:LRA=11"].filter(Boolean).join(",");
      execFileSync("ffmpeg", ["-y", "-v", "error", "-i", src, "-af", af,
        "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", path.join(OUT, name + ".wav")]);
      console.log(`  ${name}.wav`.padEnd(20) + "real mouse click (imported)");
    }
  } else {
    console.log("  (mouse click source not found; keeping the synthesised taps)");
  }
}

/* A whoosh: noise through a band-pass whose centre sweeps up and back down, under a
   smooth swell. The PEAK is what lands on the cut, not the start of the file. */
function whoosh(len, f0, f1, f2, Q, sub = 0) {
  const buf = secs(len), flt = makeSVF();
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR, p = i / buf.length;
    const fc = p < 0.5 ? f0 + (f1 - f0) * (p / 0.5) : f1 + (f2 - f1) * ((p - 0.5) / 0.5);
    const swell = Math.pow(Math.sin(Math.PI * p), 1.7);
    let v = flt(noise(), fc, Q).band * swell;
    if (sub) v += Math.sin(2 * Math.PI * (sub + 22 * Math.sin(Math.PI * p)) * t) * swell * 0.4;
    buf[i] = v;
  }
  return buf;
}
console.log("whooshes");
write("whoosh-low.wav", whoosh(1.40, 90, 430, 150, 0.9, 48), 0.9);
write("whoosh-mid.wav", whoosh(1.00, 320, 1500, 520, 1.1), 0.75);
write("whoosh-air.wav", whoosh(0.70, 1900, 6200, 2600, 1.4), 0.55);

/* A riser: the band-pass climbs and tightens, the level climbs with it, then it stops
   dead so whatever lands next has room. */
console.log("riser, note, bed");
{
  const len = 0.9, buf = secs(len), f = makeSVF();
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR, p = i / buf.length;
    const fc = 300 * Math.pow(5000 / 300, p), Q = 1 + 3 * p;
    buf[i] = (f(noise(), fc, Q).band + Math.sin(2 * Math.PI * (200 + 700 * p * p) * t) * 0.25)
           * Math.pow(p, 1.6);
  }
  for (let i = 0; i < Math.round(0.008 * SR); i++) buf[buf.length - 1 - i] *= i / (0.008 * SR);
  write("riser.wav", buf, 0.8);
}

/* The warm note for the moment the two halves meet: no transient at all, it arrives. */
{
  const buf = secs(1.8), f = makeSVF();
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR;
    const e = env(i, buf.length, 0.055, 0.45);
    const v = Math.sin(2 * Math.PI * 98 * t)
            + Math.sin(2 * Math.PI * 147 * t) * 0.35
            + Math.sin(2 * Math.PI * 196 * t) * 0.16;
    buf[i] = f(v * e, 900, 0.8).low;
  }
  write("note-warm.wav", buf, 0.85);
}

/* The bed: inaudible on its own, and the edit sounds broken without it. */
{
  const buf = secs(6), f = makeSVF(), f2 = makeSVF();
  for (let i = 0; i < buf.length; i++) {
    const t = i / SR, p = i / buf.length;
    const lfo = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.13 * t);
    buf[i] = (f(noise(), 460 + 120 * Math.sin(2 * Math.PI * 0.07 * t), 0.7).band * lfo
           + f2(noise(), 1800, 0.5).band * 0.25 * lfo
           + Math.sin(2 * Math.PI * 58 * t) * 0.08)
           * Math.min(1, p * 8) * Math.min(1, (1 - p) * 8);
  }
  write("bed-air.wav", buf, 0.5);
}

/* Placement anchors each sound on its transient, so the kit has to say where that
   is. Without this file the placement code assumes a swell peaking halfway, which
   is right for the synthesised whooshes and wrong for anything with a hard attack. */
{
  const anchors = {};
  for (const f of readdirSync(OUT)) {
    if (!f.endsWith(".wav")) continue;
    const raw = execFileSync("ffmpeg", ["-v", "error", "-i", path.join(OUT, f), "-ac", "1", "-ar", String(SR), "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
    const x = new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
    let p = 0, pi = 0;
    for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > p) { p = a; pi = i; } }
    anchors[f.slice(0, -4)] = +(pi / SR).toFixed(4);
  }
  /* the imported mouse click: anchor on the press, which its release can out-peak */
  if (anchors["tap-1"] !== undefined) { anchors["tap-1"] = 0.011; anchors["tap-2"] = 0.011; }
  writeFileSync(path.join(OUT, "anchors.json"), JSON.stringify(anchors, null, 1));
  console.log("  anchors.json      " + Object.keys(anchors).length + " sounds");
}

console.log("\nkit written to mockups/video/sfx");
