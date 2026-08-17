// Rebuilds the slim upload copy from story.html by recompressing every
// embedded image (55% size, quality 58) — replaces the old approach of
// carrying the slim images over by position, which broke whenever the
// image count changed.
import fs from "fs";
import sharp from "sharp";

const RE = /data:image\/webp;base64,([A-Za-z0-9+/=]+)/g;
const src = fs.readFileSync("story.html", "utf8");

const parts = [];
let last = 0, m, n = 0;
const jobs = [];
while ((m = RE.exec(src))) {
  parts.push(src.slice(last, m.index));
  const buf = Buffer.from(m[1], "base64");
  const slot = parts.push(null) - 1;
  jobs.push(
    sharp(buf)
      .metadata()
      .then((meta) => sharp(buf).resize(Math.round(meta.width * 0.55)).webp({ quality: 58 }).toBuffer())
      .then((out) => { parts[slot] = "data:image/webp;base64," + out.toString("base64"); })
  );
  last = m.index + m[0].length;
  n++;
}
parts.push(src.slice(last));
await Promise.all(jobs);
const out = parts.join("");
fs.writeFileSync("../../webpage/Scroll Animations (slim).html", out);
fs.writeFileSync("../../webpage/Scroll Animations.html", src);
console.log("full copy synced;", n, "images recompressed for slim,",
  Math.round(out.length / 1024) + "KB (full " + Math.round(src.length / 1024) + "KB)");
