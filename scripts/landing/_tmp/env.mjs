import fs from "fs";
const txt = fs.readFileSync("C:/UNIsport/.env.local", "utf8");
export const env = Object.fromEntries(txt.split(/\r?\n/)
  .filter(l => l && !l.startsWith("#") && l.includes("="))
  .map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
