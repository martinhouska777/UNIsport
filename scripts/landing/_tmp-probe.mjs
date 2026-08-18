import puppeteer from "puppeteer-core";
const browser = await puppeteer.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: "new", args: ["--disable-gpu", "--no-first-run"] });
const page = await browser.newPage();
page.setDefaultNavigationTimeout(180000);
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.goto(process.argv[2] || "http://localhost:3000/", { waitUntil: "domcontentloaded" });
await new Promise((r) => setTimeout(r, 8000));
console.log(JSON.stringify(await page.evaluate(() => {
  const q = (s) => [...document.querySelectorAll(s)].map((a) => { const r = a.getBoundingClientRect(); const cs = getComputedStyle(a); return { txt: a.innerText.trim().slice(0, 40), top: Math.round(r.top + scrollY), h: Math.round(r.height), display: cs.display, opacity: cs.opacity, vis: cs.visibility, bg: cs.backgroundColor, color: cs.color, sa: cs.getPropertyValue("--sa") }; });
  return { blade: q("#blade-lock a"), campus: q("#campus-colours a"), bladeKicker: q("#blade-lock .font-mono") };
}), null, 1));
await browser.close();
