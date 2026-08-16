// Turns a raw capture into a landing frame:
//
//   node make-frames.mjs cap-vhome-tall.png ../../public/landing/tall-vhome.webp
//
// Two things this exists to remember:
//
//  1. sharp runs `extend` AFTER `resize` whatever order you call them in, so
//     padding and scaling can never share a pipeline. Nothing here pads, which
//     is the simplest way to keep that from biting.
//  2. A tall viewport pins the app's footer bar to the bottom of the window, so
//     every strip has a long blank gap between its last content and that bar.
//     The pan would scroll through it as an empty black phone, so the longest
//     blank run is cut out (a little of it is kept, as breathing room).
import sharp from "sharp";

const [src, out] = process.argv.slice(2);
if (!src || !out) {
  console.error("usage: node make-frames.mjs <capture.png> <out.webp> [width=900]");
  process.exit(1);
}
const WIDTH = Number(process.argv[4] || 900);
const KEEP = 28;   // px of the blank run to leave behind
const MIN_RUN = 70; // shorter gaps are real spacing, not dead air

const resized = await sharp(src).resize({ width: WIDTH }).png().toBuffer();
const { data, info } = await sharp(resized).greyscale().raw().toBuffer({ resolveWithObject: true });

// A row is blank when nothing on it varies — flat background, whatever its shade.
const blank = [];
for (let y = 0; y < info.height; y++) {
  let min = 255, max = 0;
  for (let x = 0; x < info.width; x += 3) {
    const v = data[y * info.width + x];
    if (v < min) min = v;
    if (v > max) max = v;
  }
  blank.push(max - min < 10);
}

let bestStart = -1, bestLen = 0, i = 0;
while (i < blank.length) {
  if (!blank[i]) { i++; continue; }
  let j = i;
  while (j < blank.length && blank[j]) j++;
  if (j - i > bestLen) { bestLen = j - i; bestStart = i; }
  i = j;
}

if (bestLen < MIN_RUN) {
  await sharp(resized).webp({ quality: 86 }).toFile(out);
  console.log(`${out}  ${info.width}x${info.height}  (no gap worth cutting)`);
} else {
  const topH = bestStart + KEEP;
  const botY = bestStart + bestLen;
  const botH = info.height - botY;
  const height = topH + botH;
  const top = await sharp(resized).extract({ left: 0, top: 0, width: info.width, height: topH }).png().toBuffer();
  const bottom = botH > 0
    ? await sharp(resized).extract({ left: 0, top: botY, width: info.width, height: botH }).png().toBuffer()
    : null;
  const layers = [{ input: top, top: 0, left: 0 }];
  if (bottom) layers.push({ input: bottom, top: topH, left: 0 });
  await sharp({ create: { width: info.width, height, channels: 3, background: "#000000" } })
    .composite(layers)
    .webp({ quality: 86 })
    .toFile(out);
  console.log(
    `${out}  ${info.width}x${height}  (cut ${bestLen - KEEP}px of dead air at y=${bestStart})`
  );
}
