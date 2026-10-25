/*
  Sound for the intro, version 6 (2026-10-24). The owner, on v5: "can you make it
  better with better sound effects surely we have some better sound effects now
  for the clicks and everything".

  The six moments are v5's, exactly the owner's list (intro-sound-v4.mjs): the
  whoosh on the cut into "Choose your activity", the three tiles, the two presses,
  the same whoosh on the cut into "Find training partners", and the push while
  the halves close, gone by the time they touch. Nothing else. What changes is
  the sound at each moment, and the level:

    - v5's mouse click is the brightest sound in the film (its energy sits around
      9.5 kHz), which is what makes it read as a hard, cheap tick.
    - v5 is very quiet. Measured momentary loudness: the presses peak at -37
      LUFS, the tiles at -30, the whooshes at -27, a normal Reel at about -10.
      On a phone the presses were close to silent. Every set below is brought to
      the same, audible level, so the sets compare by sound and not by volume.

  Each set is one sound family (the sound skill's rule 8). Only real recordings
  from the shared kits in C:\VideoEditing\kits (Mixkit licence and Kenney CC0,
  both free for commercial use with no credit), never synthesised (NO-SLOP 28).

  Run:  node scripts/video/intro-sound-v6.mjs <set>      (a, b, c, d, or all)
  Out:  mockups/video/unisport-intro-v6-<set>.mp4
*/
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const V = (f) => path.join(ROOT, "mockups/video", f);
const { T } = JSON.parse(readFileSync(V("intro-times.json"), "utf8"));
const LIB = "C:/VideoEditing/kits";
const MX = (f) => `${LIB}/mixkit-cc/${f}.wav`;
const KI = (f) => `${LIB}/kenney-cc0/kenney_interface-sounds/Audio/${f}.ogg`;

const SR = 48000;
const N = Math.round(T.end * SR);
const dB = (x) => 10 ** (x / 20);
const semis = (n) => 2 ** (n / 12);

/* How loud each kind of moment ends up, as momentary loudness (LUFS over 400 ms)
   in the finished file. The push and the whooshes carry the film, the presses
   are the visible cause and sit just under them, the tiles are small and sit
   under those. Every set is measured and corrected until it lands on these, so
   the sets differ only in their sounds. */
const TARGET = { push: -18, whoosh: -19 };
/* A click is too short for a 400 ms reading: pushing one to -21 LUFS drove its
   peak to -2 dBFS. The presses and tiles are set by their loudest 50 ms (RMS,
   dBFS) instead, and never peak above the cap (the sound skill: repeated pops
   peak around -10 dB). */
const SHORT = { tap: { rms: -21, peak: -8 }, tile: { rms: -23, peak: -10 } };
/* starting levels (RMS of a sound's loudest 100 ms, dBFS); corrected by measuring */
const START = { whoosh: -27, push: -26, tap: -28, tile: -31 };
const REVERB_WET = 0.2;
/* the soft whoosh (SOUND technique 18): highs cut, pitched down, a quieter bright twin on top */
const SOFT = { lowpass: 6000, rate: semis(-2), twin: -11 };

/* A sound: the file, an optional ffmpeg filter, which stretch of it to use
   (from/len, seconds), and where it is anchored: "max" = its loudest point
   (whooshes, so the peak lands on the cut), "hit" = its first strong transient
   (clicks and pops, so the press lands on the frame). */
const SETS = {
  /* soft glass: a rounded tock for the presses, glass pings climbing for the
     tiles, wide airy whooshes */
  a: {
    name: "soft glass",
    tap:    { file: MX("click__modern-click-box-check__1120"), anchor: "hit", steps: [0, -1] },
    tile:   { file: KI("glass_006"), anchor: "hit", steps: [0, 2, 4] },
    whoosh: { file: MX("whoosh__air-woosh__1489"), anchor: "max" },
    push:   { file: MX("whoosh__air-woosh__1489"), rate: 0.82 },
  },
  /* bubble pops: a soap-bubble press, round pops for the tiles, a quick air
     sweep. (The plastic bubble click was tried for the press: 4 ms long, so
     capped at a safe peak it was barely there.) */
  b: {
    name: "bubble pops",
    tap:    { file: MX("pop__soap-bubble-sound__2925"), from: 0.02, len: 0.25, anchor: "hit", steps: [0, -1] },
    tile:   { file: MX("pop__long-pop__2358"), from: 0, len: 0.3, anchor: "hit", steps: [0, 2, 4] },
    whoosh: { file: MX("swoosh__fast-air-sweep-transition__168"), anchor: "max" },
    push:   { file: MX("swoosh__cinematic-wind-swoosh__1471"), rate: 0.85 },
  },
  /* smooth tech: a soft select for the presses, plucks for the tiles, a low
     sweep, and a zoom that rises as they start closing and dies away into the touch */
  c: {
    name: "smooth tech",
    tap:    { file: KI("select_005"), anchor: "hit", steps: [0, -1] },
    tile:   { file: KI("pluck_002"), anchor: "hit", steps: [0, 2, 4] },
    whoosh: { file: MX("transition__fast-small-sweep-transition__166"), anchor: "max" },
    push:   { file: MX("technology__futuristic-zoom-move__2626") },
  },
  /* closest to v5: the light pop the owner picked for the tiles and his push,
     with a cleaner mouse click and a fuller wind whoosh */
  d: {
    name: "v5 cleaner",
    tap:    { file: MX("click__clear-mouse-clicks__2997"), filter: "lowpass=f=5500", from: 0, len: 0.22, anchor: "hit", steps: [0, -0.5] },
    tile:   { file: MX("whoosh__explainer-video-pops-whoosh-light-pop__3005"), filter: "lowpass=f=5500", anchor: "hit", steps: [0, 1, 2] },
    whoosh: { file: MX("swoosh__cinematic-wind-swoosh__1471"), anchor: "max" },
    push:   { file: MX("swoosh__speeding-swoosh__1484"), filter: "lowpass=f=3500" },
  },
};

/* ---------- loading ---------- */
const decode = (file, filter) => {
  const args = ["-v", "error", "-i", file];
  if (filter) args.push("-af", filter);
  args.push("-ac", "1", "-ar", String(SR), "-f", "f32le", "-");
  const raw = execFileSync("ffmpeg", args, { maxBuffer: 1 << 28 });
  return Float32Array.from(new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4));
};
/* 10 ms RMS envelope */
const envelope = (a) => {
  const W = 480, env = [];
  for (let i = 0; i + W <= a.length; i += W) { let s = 0; for (let j = 0; j < W; j++) s += a[i + j] ** 2; env.push(Math.sqrt(s / W)); }
  return env;
};
/* RMS of the loudest 100 ms, in dB */
const loudest100 = (a) => {
  const env = envelope(a); let best = 0;
  for (let i = 0; i + 10 <= env.length; i++) { let s = 0; for (let j = 0; j < 10; j++) s += env[i + j] ** 2; best = Math.max(best, s / 10); }
  return 10 * Math.log10(best + 1e-12);
};
function load(o, extra = "") {
  const filter = [o.filter, extra].filter(Boolean).join(",") || null;
  let a = decode(o.file, filter);
  if (o.from !== undefined) a = a.slice(Math.round(o.from * SR), o.len ? Math.round((o.from + o.len) * SR) : undefined);
  const env = envelope(a), mx = Math.max(...env);
  const i = o.anchor === "max" ? env.indexOf(mx) : env.findIndex((v) => v >= mx * 0.7);
  return { a, anchor: (i * 480 + 240) / SR };
}

/* keep `before`..`after` seconds around the anchor, faded in and out, so a long
   whoosh stays on its cut (v5's whooshes span about 0.7 s) and never runs over
   the tiles or the presses */
function around(s, before, after) {
  const s0 = Math.max(0, Math.round((s.anchor - before) * SR)), s1 = Math.min(s.a.length, Math.round((s.anchor + after) * SR));
  const a = s.a.slice(s0, s1), fi = Math.round(0.12 * SR), fo = Math.round(0.25 * SR);
  for (let i = 0; i < a.length; i++) a[i] *= Math.min(1, i / fi, (a.length - i) / fo);
  return { a, anchor: s.anchor - s0 / SR };
}

/* ---------- placing ---------- */
let mix;
/* place `s` so its anchor lands on t; rate < 1 = slower and lower; the gain
   brings its loudest 100 ms to `level` dB; optional fade-out ending at `until` */
function place(s, t, level, rate = 1, until = null, fade = 0) {
  const g = dB(level - loudest100(s.a));
  const o0 = Math.round((t - s.anchor / rate) * SR);
  const n = Math.floor((s.a.length - 1) / rate), edge = Math.round(0.006 * SR);
  const stop = until === null ? Infinity : Math.round(until * SR), fo = Math.round(fade * SR);
  for (let i = 0; i < n; i++) {
    const o = o0 + i; if (o < 0 || o >= N || o >= stop) continue;
    const p = i * rate, k = Math.floor(p), fr = p - k;
    let w = Math.min(1, (i + 1) / edge, (n - i) / edge);
    if (fo && stop - o < fo) w *= Math.sin((Math.PI / 2) * (stop - o) / fo);
    mix[o] += (s.a[k] * (1 - fr) + s.a[k + 1] * fr) * g * w;
  }
}

function build(set, ROLE) {
  mix = new Float32Array(N);
  const tap = load(set.tap), tile = load(set.tile);
  const whoosh = around(load(set.whoosh, `lowpass=f=${SOFT.lowpass}`), 0.27, 0.45), twin = around(load(set.whoosh), 0.27, 0.45);
  const push = load({ ...set.push, anchor: "start" });
  push.anchor = 0;

  /* the two cuts: the soft whoosh, its peak on the new line, the bright twin under it */
  for (const t of [T.act, T.find]) {
    place(whoosh, t, ROLE.whoosh, SOFT.rate);
    place(twin, t, ROLE.whoosh + SOFT.twin);
  }
  /* the three tiles land, climbing */
  for (let i = 0; i < 3; i++) place(tile, T.tiles + 0.18 + i * 0.12, ROLE.tile - i * 0.5, semis(set.tile.steps[i]));
  /* the two presses */
  place(tap, T.tap1, ROLE.tap, semis(set.tap.steps[0]));
  place(tap, T.tap2, ROLE.tap - 0.5, semis(set.tap.steps[1]));
  /* while they close: starts as they start closing, gone by the time they touch */
  place(push, T.join, ROLE.push, set.push.rate || 1, T.met, 0.45);
  return mix;
}

/* ---------- rendering (as v5: a small room, one fixed gain, onto the picture) ---------- */
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
  const len = Math.round(0.7 * SR), pre = Math.round(0.012 * SR), ir = new Float32Array(len * 2);
  let s = 11, lpL = 0, lpR = 0, energy = 0;
  const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 * 2 - 1; };
  for (let i = pre; i < len; i++) {
    const t = (i - pre) / SR, env = Math.exp(-t / 0.1), a = 0.35 + 0.5 * Math.exp(-t / 0.15);
    lpL += a * (r() - lpL); lpR += a * (r() - lpR);
    ir[i * 2] = lpL * env; ir[i * 2 + 1] = lpR * env;
    energy += (ir[i * 2] ** 2 + ir[i * 2 + 1] ** 2) / 2;
  }
  const k = 1 / Math.sqrt(energy);
  for (let i = 0; i < ir.length; i++) ir[i] *= k;
  return ir;
}
/* each moment's loudest momentary (400 ms) loudness. A reading at time t covers
   t-0.4..t, so each window starts once the moment before it has passed */
function moments(file) {
  const out = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af",
    "ebur128=metadata=1,ametadata=print:key=lavfi.r128.M:file=-", "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 }).stdout;
  const pts = []; let t = 0;
  for (const line of out.split("\n")) {
    const a = /pts_time:([\d.]+)/.exec(line); if (a) t = +a[1];
    const m = /lavfi\.r128\.M=(-?[\d.]+)/.exec(line); if (m) pts.push([t, +m[1]]);
  }
  const max = (a, b) => Math.max(...pts.filter(([x]) => x >= a && x < b).map(([, m]) => m));
  /* the presses and tiles: loudest 50 ms RMS and the sample peak, in dBFS */
  const a = decode(file);
  const short = (t0, t1) => {
    const s0 = Math.round(t0 * SR), s1 = Math.round(t1 * SR), W = 2400;
    let rms = 0, peak = 0;
    for (let i = s0; i < s1; i++) peak = Math.max(peak, Math.abs(a[i]));
    for (let i = s0; i + W < s1; i += 240) { let s = 0; for (let j = 0; j < W; j++) s += a[i + j] ** 2; rms = Math.max(rms, s / W); }
    return { rms: 10 * Math.log10(rms + 1e-12), peak: 20 * Math.log10(peak + 1e-12) };
  };
  return { whoosh: max(T.act - 0.1, T.act + 0.3), push: max(T.join + 0.15, T.met + 0.05),
           tile: short(T.tiles + 0.1, T.tiles + 0.5), tap: short(T.tap1 - 0.05, T.tap1 + 0.3), tap2: short(T.tap2 - 0.05, T.tap2 + 0.3) };
}

const tmp = (f) => path.join(os.tmpdir(), f);
const ir = tmp("v6-room.wav");
writeWav(ir, roomIR(), 2);
/* the effects with the room on them */
function render(set, key, ROLE) {
  const dry = tmp(`v6-${key}-dry.wav`), wet = tmp(`v6-${key}.wav`);
  writeWav(dry, build(set, ROLE));
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", dry, "-i", ir, "-filter_complex",
    `[0:a]aformat=channel_layouts=stereo,asplit[d][w];[w][1:a]afir=irnorm=-1:gtype=none:wet=${REVERB_WET}[r];` +
    `[d][r]amix=inputs=2:normalize=0:duration=first[a]`, "-map", "[a]", "-c:a", "pcm_f32le", wet]);
  return wet;
}

const which = process.argv[2] || "all";
const keys = which === "all" ? Object.keys(SETS) : [which];
for (const key of keys) {
  const set = SETS[key];
  if (!set) { console.error(`set: one of ${Object.keys(SETS).join(", ")}, all`); process.exit(1); }
  /* measure, correct each kind of moment towards its target, three times */
  const ROLE = { ...START };
  let wet;
  for (let pass = 0; pass < 3; pass++) {
    wet = render(set, key, ROLE);
    const m = moments(wet);
    for (const r of Object.keys(TARGET)) ROLE[r] += TARGET[r] - m[r];
    for (const r of Object.keys(SHORT)) ROLE[r] += Math.min(SHORT[r].rms - m[r].rms, SHORT[r].peak - m[r].peak);
  }
  wet = render(set, key, ROLE);
  const out = V(`unisport-intro-v6-${key}.mp4`);
  /* the room's tail is cut with the push: nothing is heard once the halves touch */
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", V("unisport-intro.mp4"), "-i", wet, "-filter_complex",
    `[1:a]afade=t=out:st=${T.met}:d=0.12,alimiter=limit=${dB(-2).toFixed(4)}:level=false:attack=2:release=40[a]`,
    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-ar", String(SR),
    "-shortest", "-movflags", "+faststart", out], { stdio: ["ignore", "ignore", "inherit"] });
  const m = moments(out);
  const f = (x) => `${x.rms.toFixed(1)}/${x.peak.toFixed(1)}`;
  console.log(`${key} ${set.name.padEnd(12)} whoosh ${m.whoosh.toFixed(1)} LUFS  push ${m.push.toFixed(1)} LUFS  ` +
    `tiles ${f(m.tile)}  presses ${f(m.tap)} ${f(m.tap2)} (rms/peak dBFS)  -> ${path.basename(out)}`);
}
