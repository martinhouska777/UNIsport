import { readFileSync, writeFileSync } from "node:fs";
import { MAP } from "file:///C:/Unisport/scripts/social/varsity-shoot/fake-roster.mjs";
const real = readFileSync("C:/Unisport/lib/varsity/coachLineup.ts", "utf8");
const full = {};
for (const m of real.matchAll(/\{ id: "([^"]+)", initials: "[^"]*", name: "([^"]+)"/g)) {
  const [, id, name] = m; const e = MAP[id]; if (!e || name === e[0]) continue;
  full[name] = e[0];
}
full["Martin Houska"] = "Lucas Bennett"; full["Houska"] = "Bennett";
const f = "C:/Unisport-shoot/lib/supabase/shootMap.json";
const j = JSON.parse(readFileSync(f, "utf8")); j.full = full; writeFileSync(f, JSON.stringify(j, null, 1));
console.log(Object.keys(full).length, "full names");
// people: every real roster name with its fake, for matching result rows by surname
const people = [];
for (const m of real.matchAll(/\{ id: "([^"]+)", initials: "[^"]*", name: "([^"]+)"/g)) {
  const [, id, name] = m; const e = MAP[id]; if (!e) continue;
  people.push({ real: id === "martin-houska" ? "Martin Houska" : name, fake: e[0] });
}
const j2 = JSON.parse(readFileSync(f, "utf8")); j2.people = people; writeFileSync(f, JSON.stringify(j2, null, 1));
console.log(people.length, "people");
