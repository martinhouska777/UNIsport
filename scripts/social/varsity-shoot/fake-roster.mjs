// Rewrites the roster in the THROWAWAY copy (C:/Unisport-shoot) with invented names.
// ids are kept (lineups and logs reference them); only name + initials change.
import { readFileSync, writeFileSync } from "node:fs";
const FILE = "C:/Unisport-shoot/lib/varsity/coachLineup.ts";
// id -> [fake full name, race-sheet token(s) the real person appears under]
export const MAP = {
  "cate-frerichs": ["Nora Lindqvist", ["Cate"]],
  "micah-john": ["Theo Marsh", ["Micah"]],
  "iris-hennin": ["Maya Okonkwo", ["Iris"]],
  "nick-yoo": ["Jonah Reyes", ["Nick"]],
  "nat-toms": ["Ellie Baptiste", ["Nat"]],
  "abbi-park": ["Sofia Nakamura", ["Abbi"]],
  "helena-inzerillo": ["Greta Vollmer", ["Helena"]],
  "miller": ["Anya Petrov", ["Miller"]],
  "branco": ["Diego Salcedo", ["Branco"]],
  "grieser": ["Lena Hartwig", ["Grieser"]],
  "asante-kiio": ["Kofi Mensah", ["Kiio"]],
  "luca-vicino": ["Luca Ferrante", ["L Vicino"]],
  "marcus-chung": ["Daniel Okafor", ["Chung"]],
  "mason-cruz-abrams": ["Mason Delgado", ["Cruz Abrams", "Cruz-Abrams"]],
  "o-cruz-abrams": ["Oscar Delgado", []],
  "jack-dorney": ["Jack Whitfield", ["Dorney"]],
  "alexander-grundy": ["Alexander Brandt", ["Grundy"]],
  "george-farkas": ["George Kaplan", ["Farkas"]],
  "sam-gallaudet": ["Sam Ashworth", ["Gallaudet"]],
  "martin-houska": ["Martin Houska", []],
  "marco-gandola": ["Marco Bellini", ["Gandola", "Marco G"]],
  "apostolos-lykomitros": ["Nikos Alexiou", ["Lykomitros"]],
  "tyler-horler": ["Tyler Redmond", ["Horler"]],
  "teddy-plimpton": ["Teddy Hollis", ["Plimpton"]],
  "sam-davidson": ["Sam Ferris", ["Davidson"]],
  "jordan-dykema": ["Jordan Voss", ["Dykema"]],
  "jack-hansen-knarhoi": ["Jack Halvorsen", ["HK", "Hansen-Knarhoi"]],
  "owen-finnerty": ["Owen Callaghan", ["Finnerty"]],
  "marco-vicino": ["Marco Ferrante", ["M Vicino", "Vicino"]],
  "pierce-lapham": ["Pierce Langford", ["Lapham"]],
  "julian-paul": ["Julian Moreau", ["Paul"]],
  "ben-scott": ["Ben Sutter", ["Scott"]],
  "sam-woodgate": ["Sam Thornton", ["Woodgate", "Woody"]],
  "mike-thomas": ["Mike Novak", ["Thomas"]],
  "joseph-baker": ["Joseph Abara", ["Baker"]],
  "adam-cech": ["Adam Novotny", ["Cech"]],
  "alex-sanchez-fretz": ["Alex Sandoval", ["Sanchez-Fretz", "Sanchez Fretz"]],
  "leo-bessler": ["Leo Brenner", ["Bessler"]],
  "joshua-brangan": ["Joshua Corrigan", ["Brangan"]],
  "bob-rawlinson": ["Bob Ellery", ["Rawlinson"]],
  "ben-schnalke": ["Ben Steiner", ["Schnalke"]],
  "jack-sulger": ["Jack Pruitt", ["Sulger"]],
  "elam-hughes": ["Elam Foster", ["Hughes"]],
  "owen-marcovitz": ["Owen Feldstein", ["Marcovitz"]],
  "will-fowler": ["Will Garrity", ["Fowler"]],
  "kevin-weldon": ["Kevin Doyle", ["Weldon"]],
  "leyth-sousou": ["Leyth Haddad", ["Sousou"]],
  "cameron-beyki": ["Cameron Rashidi", ["Beyki"]],
  "max-morehead": ["Max Whitaker", ["Morehead"]],
  "george-burney": ["George Talbot", ["Burney"]],
  "alp-karadogan": ["Alp Yilmaz", ["Karadogan"]],
  "kynan-tallec-botos": ["Kynan Marchetti", ["Tallec-Botos", "Tallec Botos"]],
  "ryan-cornelius": ["Ryan Hessler", ["Cornelius"]],
  "charles-richards": ["Charles Whitmore", ["Richards"]],
  "cleugh": ["Ansel Byrne", ["Cleugh"]],
  "elias": ["Elias Wren", []],
  "obyrne": ["Cian Doherty", ["O'Byrne"]],
  "wu": ["Kevin Zhao", ["Wu"]],
  "rabinovitz": ["Sasha Roth", ["Rabinovitz"]],
  "wolskel": ["Piotr Wolanski", ["Wolskel"]],
  "hazen": ["Cole Hastings", ["Hazen"]],
  "saeed": ["Omar Farouk", ["Saeed"]],
  "schinnerl": ["Felix Auer", ["Schinnerl"]],
  "yu": ["Daniel Lim", ["Yu"]],
};
// Race-sheet token -> what it becomes. Coxes are labelled by first name, rowers by surname.
export const RACE = {};
for (const [id, [full, toks]] of Object.entries(MAP)) {
  const [first, ...rest] = full.split(" "); const last = rest.join(" ");
  for (const t of toks) {
    if (/^[A-Z][a-z]+$/.test(t) && /^(Cate|Micah|Iris|Nick|Nat|Abbi|Helena|Woody)$/.test(t)) RACE[t] = t === "Woody" ? last : first;
    else if (t === "L Vicino") RACE[t] = "L " + last;
    else if (t === "M Vicino") RACE[t] = "M " + last;
    else if (t === "Marco G") RACE[t] = "Marco " + last[0];
    else RACE[t] = last;
  }
}
if (process.argv[1].endsWith("fake-roster.mjs")) {
  let src = readFileSync(FILE, "utf8"); const used = new Set(); let n = 0;
  src = src.replace(/\{ id: "([^"]+)", initials: "[^"]*", name: "[^"]*"/g, (m, id) => {
    const e = MAP[id]; if (!e) throw new Error("no fake for " + id);
    const parts = e[0].split(" "); let ini = parts.map((p) => p[0]).join("");
    let k = 1; while (used.has(ini)) ini = parts[0][0] + parts.at(-1).slice(0, 1 + k++);
    used.add(ini); n++;
    return `{ id: "${id}", initials: "${ini}", name: "${e[0]}"`;
  });
  writeFileSync(FILE, src); console.log("renamed", n);
  writeFileSync("C:/Unisport-shoot/lib/supabase/shootMap.json", JSON.stringify({ race: RACE }, null, 1));
  console.log(Object.entries(RACE).map(([a, b]) => a + "→" + b).join(", "));
}
