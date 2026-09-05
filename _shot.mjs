import puppeteer from "puppeteer-core";
const [OUT="_shot", W=1900, H=860, URL="http://localhost:3000/", SEL="#campus-colours"] = process.argv.slice(2);
const browser = await puppeteer.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: "new",
  args: ["--disable-gpu","--no-first-run","--hide-scrollbars"],
});
const page = await browser.newPage();
page.setDefaultNavigationTimeout(120000);
await page.setViewport({ width: Number(W), height: Number(H), deviceScaleFactor: 1 });
await page.goto(URL, { waitUntil: "networkidle0", timeout: 120000 });
await page.evaluate(() => document.fonts.ready);
const info = await page.evaluate((sel) => {
  document.documentElement.style.scrollBehavior = "auto";
  const el = document.querySelector(sel);
  const y = el.getBoundingClientRect().top + window.scrollY;
  window.scrollTo(0, y);
  return { top: y };
}, SEL);
await new Promise(r=>setTimeout(r,2500));
await page.screenshot({ path: `${OUT}.png` });
const m = await page.evaluate((sel) => {
  const s = document.querySelector(sel);
  const g = (q) => { const e = s.querySelector(q); if (!e) return null; const b = e.getBoundingClientRect();
    return { w: Math.round(b.width), h: Math.round(b.height), top: Math.round(b.top), fs: getComputedStyle(e).fontSize }; };
  return { phone: g("[data-closer-phone]"), h2: g("h2"), letter: g(".lc-letter"), stick: g(".lc-stick"), vh: window.innerHeight };
}, SEL);
console.log(JSON.stringify(m, null, 1));
await browser.close();
