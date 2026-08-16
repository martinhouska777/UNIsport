// Opens a REAL Chrome window on the live app and waits for the owner to log in
// themselves; the moment a session exists it is written to session-cookie.txt
// (gitignored), which every capture script reads.
//
// The owner's password is never typed by, shown to, or stored by anything here —
// they type it into an ordinary browser window and the scripts reuse the session
// that comes out of it. The profile is kept in .chrome-profile so this is a
// once-in-a-while chore rather than an every-session one.
import puppeteer from "puppeteer-core";
import fs from "fs";
import path from "path";

const BASE = "https://un-isport.vercel.app";
const COOKIE = "sb-wavxyrgtaotrhnyepyor-auth-token";
const OUT = path.join(import.meta.dirname, "session-cookie.txt");
const PROFILE = path.join(import.meta.dirname, ".chrome-profile");

const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: false,
  defaultViewport: null,
  userDataDir: PROFILE,
  args: ["--no-first-run", "--window-size=520,900"],
});
const page = (await browser.pages())[0] ?? (await browser.newPage());
await page.goto(BASE + "/login", { waitUntil: "domcontentloaded", timeout: 45000 });

console.log("\n  A Chrome window is open on the UNIsport login page.");
console.log("  Log in as the demo account (martinhouska701@gmail.com).");
console.log("  This closes by itself the moment you are in.\n");

const deadline = Date.now() + 5 * 60 * 1000;
let value = null;
while (Date.now() < deadline) {
  const cookies = await browser.cookies();
  const hit = cookies.find((c) => c.name === COOKIE && c.value && c.value.length > 200);
  if (hit) { value = hit.value; break; }
  await new Promise((r) => setTimeout(r, 2000));
}

await browser.close();

if (!value) {
  console.error("No session after 5 minutes — nothing written.");
  process.exit(1);
}
fs.writeFileSync(OUT, value);
console.log(`Session saved (${value.length} chars). It is good for about an hour.`);
