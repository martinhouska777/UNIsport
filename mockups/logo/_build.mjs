// Builds the four logo-direction artboards + canvas.json from one shared frame,
// so the four stay consistent. Run: node _build.mjs
import { readFileSync, writeFileSync } from "node:fs";
const head = readFileSync("_head.txt", "utf8");
const INK = "#141618", BLUE = "#1f32c1", NAVY = "#2f3b52", BG = "#f6feff", LINE = "#d7dfe5", T2 = "#4b4f53", T3 = "#7e8488";

// Marks: SVG using currentColor so the colour is one inline style on the <svg>.
const gate = (c, s) => `<svg viewBox="0 0 100 100" width="${s}" height="${s}" style="color: ${c}; display: block;"><rect x="12" y="8" width="76" height="13" rx="3" fill="currentColor"></rect><path d="M28 30 V58 A22 22 0 0 0 72 58 V30" fill="none" stroke="currentColor" stroke-width="14"></path></svg>`;
const partners = (c1, c2, s) => `<svg viewBox="0 0 100 100" width="${s}" height="${s}" style="display: block;"><path d="M27 16 V56 Q27 82 50 84" fill="none" stroke="${c1}" stroke-width="15" stroke-linecap="round"></path><path d="M73 16 V56 Q73 82 50 84" fill="none" stroke="${c2}" stroke-width="15" stroke-linecap="round"></path></svg>`;
const pennant = (c1, c2, s) => `<svg viewBox="0 0 100 100" width="${s}" height="${s}" style="display: block;"><polygon points="14,22 92,50 14,78" fill="${c1}"></polygon><polygon points="14,22 34,29.2 34,70.8 14,78" fill="${c2}"></polygon><rect x="8" y="14" width="6" height="72" rx="3" fill="${c1}"></rect></svg>`;
const mono = (c, s) => `<span style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: ${Math.round(s * 0.82)}px; line-height: 1; color: ${c}; margin-top: -${Math.round(s * 0.06)}px;">U</span>`;

const word = (size, sportColor = BLUE) => `<span style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: ${size}px; line-height: 1; letter-spacing: -0.02em; color: ${INK};">UNI<span style="color: ${sportColor};">sport</span></span>`;
const wordSans = (size) => `<span style="font-family: 'Plus Jakarta Sans', 'Segoe UI', sans-serif; font-weight: 800; font-size: ${size}px; line-height: 1; letter-spacing: -0.03em; color: ${INK};">UNI<span style="font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-weight: 400; letter-spacing: -0.02em; color: ${BLUE};">sport</span></span>`;

const tile = (inner, bg, label) => `<div style="display: flex; flex-direction: column; align-items: center; gap: 8px;"><div style="width: 96px; height: 96px; border-radius: 22px; background: ${bg}; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 2px rgba(20,22,24,0.08);">${inner}</div><span style="font-size: 11px; color: ${T3}; letter-spacing: 0.08em; text-transform: uppercase;">${label}</span></div>`;

const navbar = (markSmall, wordSmall) => `<div style="display: flex; flex-direction: column; align-items: flex-start; gap: 8px;"><div style="width: 300px; height: 56px; box-sizing: border-box; border: 1px solid ${LINE}; border-radius: 12px; background: ${BG}; display: flex; align-items: center; gap: 10px; padding: 0 16px;">${markSmall}${wordSmall}<span style="margin-left: auto; font-size: 12px; color: ${T2}; font-weight: 500;">Students</span><span style="font-size: 12px; color: ${T2}; font-weight: 500;">Varsity</span></div><span style="font-size: 11px; color: ${T3}; letter-spacing: 0.08em; text-transform: uppercase;">In the top bar</span></div>`;

function frame({ letter, name, axis, hero, lockup, tiles, bar, why, tradeoff }) {
  return head + `
<div style="width: 760px; height: 620px; box-sizing: border-box; padding: 36px 40px; background: ${BG}; display: flex; flex-direction: column; gap: 28px;">
  <div style="display: flex; align-items: baseline; gap: 14px;">
    <span style="font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: ${BLUE};">Direction ${letter}</span>
    <span style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em; color: ${INK};">${name}</span>
    <span style="font-size: 13px; color: ${T3};">${axis}</span>
  </div>
  <div style="display: flex; align-items: center; gap: 48px;">
    <div style="width: 220px; height: 220px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid ${LINE}; border-radius: 24px; background: #ffffff;">${hero}</div>
    <div style="display: flex; flex-direction: column; gap: 18px;">${lockup}</div>
  </div>
  <div style="display: flex; align-items: flex-end; gap: 28px;">${tiles}${bar}</div>
  <div style="display: flex; gap: 32px; border-top: 1px solid ${LINE}; padding-top: 16px;">
    <p style="margin: 0; flex: 1; font-size: 13px; line-height: 1.5; color: ${T2};"><strong style="color: ${INK};">Why.</strong> ${why}</p>
    <p style="margin: 0; flex: 1; font-size: 13px; line-height: 1.5; color: ${T2};"><strong style="color: ${INK};">Trade-off.</strong> ${tradeoff}</p>
  </div>
</div>
</x-dc>
</body>
</html>
`;
}

// A — Wordmark: the type IS the logo. Icon = italic serif U.
writeFileSync("DirectionA.dc.html", frame({
  letter: "A", name: "Wordmark", axis: "type only, what the landing already has, finished",
  hero: word(60),
  lockup: `<div style="display: flex; flex-direction: column; gap: 14px;">${word(56)}${wordSans(48)}</div><span style="font-size: 12px; color: ${T3};">Two spellings: all-serif (today) or a heavy sans UNI with the serif italic sport.</span>`,
  tiles: tile(mono("#ffffff", 96), NAVY, "App icon") + tile(mono(NAVY, 96), "#ffffff", "Light"),
  bar: navbar("", word(22)),
  why: "No symbol to learn. The name does the work, and the italic already feels like a college crest without drawing one.",
  tradeoff: "A single letter is a weak app icon among dozens of others, and the mark cannot stand without the word.",
}));

// B — Gate: U with a lintel = the three doors on the landing, and a rack.
writeFileSync("DirectionB.dc.html", frame({
  letter: "B", name: "Gate", axis: "geometric monogram",
  hero: gate(NAVY, 168),
  lockup: `<div style="display: flex; align-items: center; gap: 16px;">${gate(NAVY, 56)}${word(52)}</div><div style="display: flex; align-items: center; gap: 16px;">${gate(BLUE, 56)}${wordSans(46)}</div><span style="font-size: 12px; color: ${T3};">A U under a bar: a doorway (the landing's three doors) and a barbell on its rack.</span>`,
  tiles: tile(gate("#ffffff", 68), NAVY, "App icon") + tile(gate(NAVY, 68), "#ffffff", "Light"),
  bar: navbar(gate(NAVY, 26), word(22)),
  why: "One shape, two readings, both ours: a gate you walk through and a rack in a gym. Solid at 16 px, easy to stamp on a T-shirt.",
  tradeoff: "It is abstract; nobody will guess campus fitness from the mark alone until the word has taught them.",
}));

// C — Pennant: the college flag.
writeFileSync("DirectionC.dc.html", frame({
  letter: "C", name: "Pennant", axis: "campus iconography",
  hero: pennant(NAVY, BLUE, 176),
  lockup: `<div style="display: flex; align-items: center; gap: 14px;">${pennant(NAVY, BLUE, 60)}${word(52)}</div><div style="display: flex; align-items: center; gap: 14px;">${pennant(INK, BLUE, 60)}${wordSans(46)}</div><span style="font-size: 12px; color: ${T3};">The band at the hoist could take the school colour after login; before login it stays blue.</span>`,
  tiles: tile(pennant("#ffffff", "#9fb0ff", 70), NAVY, "App icon") + tile(pennant(NAVY, BLUE, 70), "#ffffff", "Light"),
  bar: navbar(pennant(NAVY, BLUE, 28), word(22)),
  why: "Every campus in the world has a pennant on a dorm wall. Says university before it says anything else, and the hoist band is a natural slot for a school colour.",
  tradeoff: "Says university more than fitness, and pennants are common in college-town branding, so it is less ownable.",
}));

// D — Partners: two strokes meet to form a U.
writeFileSync("DirectionD.dc.html", frame({
  letter: "D", name: "Partners", axis: "the product's idea, two people meeting",
  hero: partners(NAVY, BLUE, 176),
  lockup: `<div style="display: flex; align-items: center; gap: 14px;">${partners(NAVY, BLUE, 60)}${word(52)}</div><div style="display: flex; align-items: center; gap: 14px;">${partners(INK, INK, 60)}${wordSans(46)}</div><span style="font-size: 12px; color: ${T3};">Two strokes, two colours, one letter. In one colour it is simply a rounded U.</span>`,
  tiles: tile(partners("#ffffff", "#9fb0ff", 70), NAVY, "App icon") + tile(partners(NAVY, BLUE, 70), "#ffffff", "Light"),
  bar: navbar(partners(NAVY, BLUE, 28), word(22)),
  why: "The app's core promise is finding someone to train with. Two people join and the letter appears. Friendly, round, reads well at every size.",
  tradeoff: "Two-colour marks need care on busy backgrounds and in single-colour print, and the roundness is softer than a varsity team may want.",
}));

writeFileSync("canvas.json", JSON.stringify({
  artboards: [
    { file: "DirectionA.dc.html", x: 0, y: 0, w: 760, h: 620, title: "A - Wordmark" },
    { file: "DirectionB.dc.html", x: 860, y: 0, w: 760, h: 620, title: "B - Gate" },
    { file: "DirectionC.dc.html", x: 0, y: 760, w: 760, h: 620, title: "C - Pennant" },
    { file: "DirectionD.dc.html", x: 860, y: 760, w: 760, h: 620, title: "D - Partners" },
  ],
  annotations: [
    { id: "brief", x: 0, y: -170, w: 760, text: "UNIsport logo, round one. Four directions, each pushed on a different axis. Colours are the neutral brand only (landing blue, ink, app navy): a school's own colours never enter the logo, because every university shares it. Pick a direction, or a mix, and the next round refines that one." },
  ],
  launch: { view: "canvas" },
}, null, 2));
console.log("built");
