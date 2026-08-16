// Serves story.html the way the artifact host does: wrapped with a doctype and
// a utf-8 charset, so local testing is in standards mode like the real thing.
import http from "http";
import fs from "fs";
http.createServer((req, res) => {
  const body = fs.readFileSync("story.html", "utf8");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end("<!doctype html>\n<html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"></head><body>\n" + body + "\n</body></html>");
}).listen(8124, () => console.log("serving on 8124 with doctype"));
