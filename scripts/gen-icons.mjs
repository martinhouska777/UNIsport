// One-off generator for placeholder PWA icons (solid brand-neutral squares).
// Run with: node scripts/gen-icons.mjs
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const COLOR = { r: 0x2f, g: 0x3b, b: 0x52 }; // neutral brand --primary

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function makePng(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // compression, filter, interlace = 0

  const rowLen = size * 4 + 1;
  const raw = Buffer.alloc(rowLen * size);
  for (let y = 0; y < size; y++) {
    const o = y * rowLen;
    raw[o] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const p = o + 1 + x * 4;
      raw[p] = COLOR.r;
      raw[p + 1] = COLOR.g;
      raw[p + 2] = COLOR.b;
      raw[p + 3] = 255;
    }
  }

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, makePng(size));
  console.log(`wrote public/icons/icon-${size}.png`);
}
