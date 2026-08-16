// Builds story.html — both scroll animations, with real screenshots embedded.
//
// Two kinds of beat:
//   • a still frame (900x1479), cross-faded in
//   • a PAN beat, where one tall capture of a real screen scrolls inside the
//     phone as you scroll the page. Consecutive pan beats sharing an image
//     continue the same scroll, so several headlines can ride one long screen.
//     `pan: [from, to]` are fractions of the image's travel.
//     `hold: 0…1` keeps the image still for that share of the beat before the
//     pan starts — the opening frame of each story needs a moment to be read
//     before anything moves.
import fs from "fs";

const shots = JSON.parse(fs.readFileSync("shots.json", "utf8"));

const story1 = [
  {
    key: "01-gyms", kicker: "01 · The gyms",
    head: "Every gym on campus. One list.",
    sub: "Opening hours, how busy it is right now, and the house gyms nobody has a map of.",
    ann: [{ side: "right", top: 14, text: "Live ratings" }, { side: "left", top: 68, text: "House gyms too" }],
  },
  {
    key: "02-match", kicker: "02 · The people",
    head: "Then it finds your people.",
    sub: "Sorted by how well you actually fit — same gym, same hours, same level.",
    ann: [{ side: "right", top: 24, text: "Ranked by real fit" }],
  },
  {
    key: "03-why-you-match", kicker: "03 · The reasons",
    head: "And it tells you why.",
    sub: "Every reason is a real fact from both profiles. No black box.",
    ann: [{ side: "left", top: 56, text: "Facts, not guesses" }],
  },
  {
    key: "04-plan-a-session", kicker: "04 · The plan",
    head: "Make the plan in the chat.",
    sub: "One tap proposes a session. One tap accepts. It's on both your calendars.",
    ann: [{ side: "right", top: 52, text: "One tap to accept" }],
  },
  {
    key: "tall-logsheet", kicker: "05 · The log", pan: [0, 0.75], side: "left",
    head: "Afterwards, log it together.",
    sub: "Every set, every rep — and the partner carried straight over from the plan.",
    ann: [{ side: "right", top: 30, text: "Set by set" }],
  },
  {
    key: "tall-logsheet", kicker: "06 · The record", pan: [0.75, 1], side: "left",
    head: "A photo and a note, while it's fresh.",
    sub: "Who you trained with, how it went, and a picture if you took one — a training log you'll still want to read in four years.",
    ann: [{ side: "left", top: 50, text: "Photo + note" }],
  },
  {
    key: "07-your-profile", kicker: "07 · The proof", side: "left",
    head: "28 sessions. 6 partners.", headEm: "Never train alone.",
    sub: "",
    ann: [{ side: "right", top: 34, text: "The receipts" }],
  },
];

const story2 = [
  {
    key: "tall-vhome", kicker: "V1 · The plan", pan: [0, 0.27], hold: 0.45,
    head: "The coach's plan, on every phone.",
    sub: "Water, erg, weights — the week your coach actually built. Not a screenshot of a spreadsheet.",
    ann: [{ side: "right", top: 18, text: "Week 6 of 15" }],
  },
  {
    key: "tall-vhome", kicker: "V2 · The boat", pan: [0.27, 0.68],
    head: "Your name, in the boat.",
    sub: "The lineup your coach published, seat by seat, the night before you row it — the four in the morning, the pair after lunch.",
    ann: [{ side: "left", top: 42, text: "You, 3 seat" }],
  },
  {
    // The race and the note used to be a beat each. On a home screen this short
    // they share one window, and no amount of scrolling separates them.
    key: "tall-vhome", kicker: "V3 · The race", pan: [0.68, 1],
    head: "The next race, and what to fix before it.",
    sub: "Head of the Charles, 63 days out — and one note from your coach sitting under it until you've sorted it.",
    ann: [{ side: "right", top: 34, text: "Counting down" }, { side: "left", top: 62, text: "Straight from the coach" }],
  },
  {
    key: "13-varsity-log-list", kicker: "V4 · The week", side: "left",
    head: "Log straight off the plan.",
    sub: "Your whole week across the top — every session the coach set, waiting to be logged.",
    ann: [{ side: "right", top: 16, text: "Your week, at a glance" }, { side: "left", top: 44, text: "Tap to log" }],
  },
  {
    key: "tall-vprofile", kicker: "V5 · The season", pan: [0.06, 0.42], side: "left",
    head: "129 km this week.",
    sub: "Metres rowed, week by week, all season — consistency you can actually see.",
    ann: [{ side: "right", top: 40, text: "Eight weeks of work" }],
  },
];

/*
  BLADE LOCK — the closing hero. Twelve real university blade liveries on a
  perspective arc; the one locked in the centre re-themes the phone to that
  club. Liveries from Wikipedia's list of rowing blades + the Harvard Gazette
  blade guide (Harvard = crimson flame tip on white; Washington famously plain
  white; Princeton split orange/black; Cal gold chevron; Cornell red tip …).
*/
const CLUBS = [
  { n: "Harvard",    p: "#A51C30", s: "#f5f5f5", blade: { base: "#f2ede4", type: "flame",    c: "#A51C30" } },
  { n: "Yale",       p: "#00356B", s: "#f5f5f5", blade: { base: "#00356B", type: "split",    c: "#f5f5f5" } },
  { n: "Princeton",  p: "#F58025", s: "#111111", blade: { base: "#F58025", type: "split",    c: "#141414" } },
  { n: "Washington", p: "#4B2E83", s: "#B7A57A", blade: { base: "#f2f2f2", type: "solid" } },
  { n: "California", p: "#003262", s: "#FDB515", blade: { base: "#003262", type: "chevron",  c: "#FDB515" } },
  { n: "Cornell",    p: "#B31B1B", s: "#f5f5f5", blade: { base: "#f2f2f2", type: "tip",      c: "#B31B1B" } },
  { n: "Brown",      p: "#4E3629", s: "#f5f5f5", blade: { base: "#f2f2f2", type: "diagonal", c: "#4E3629" } },
  { n: "Columbia",   p: "#6CACE4", s: "#f5f5f5", blade: { base: "#6CACE4", type: "diagonal", c: "#f5f5f5" } },
  { n: "Dartmouth",  p: "#00693E", s: "#f5f5f5", blade: { base: "#00693E", type: "diagonal", c: "#f5f5f5" } },
  { n: "Penn",       p: "#011F5B", s: "#990000", blade: { base: "#011F5B", type: "split",    c: "#990000" } },
  { n: "Syracuse",   p: "#F76900", s: "#000E54", blade: { base: "#F76900", type: "chevron",  c: "#000E54" } },
  { n: "Wisconsin",  p: "#C5050C", s: "#f5f5f5", blade: { base: "#C5050C", type: "solid" } },
];

// One hatchet blade + shaft. The livery is clipped to the blade shape.
function bladeSVG(club, idx) {
  const b = club.blade;
  const clip = "bl-clip-" + idx;
  let overlay = "";
  if (b.type === "flame")    overlay = `<polygon points="6,2 58,2 32,44" fill="${b.c}" clip-path="url(#${clip})"/>`;
  if (b.type === "split")    overlay = `<rect x="32" y="0" width="32" height="70" fill="${b.c}" clip-path="url(#${clip})"/>`;
  if (b.type === "tip")      overlay = `<rect x="0" y="0" width="64" height="22" fill="${b.c}" clip-path="url(#${clip})"/>`;
  if (b.type === "chevron")  overlay = `<polygon points="0,18 32,34 64,18 64,34 32,50 0,34" fill="${b.c}" clip-path="url(#${clip})"/>`;
  if (b.type === "diagonal") overlay = `<polygon points="0,0 64,0 64,30 0,14" fill="${b.c}" clip-path="url(#${clip})"/>`;
  return `<svg viewBox="0 0 64 104" width="64" height="104" aria-hidden="true">
    <defs><clipPath id="${clip}"><path d="M14,3 Q32,-3 50,3 Q60,9 59,30 L56,58 Q55,66 46,66 L18,66 Q9,66 8,58 L5,30 Q4,9 14,3 Z"/></clipPath></defs>
    <path d="M14,3 Q32,-3 50,3 Q60,9 59,30 L56,58 Q55,66 46,66 L18,66 Q9,66 8,58 L5,30 Q4,9 14,3 Z" fill="${b.base}"/>
    ${overlay}
    <path d="M14,3 Q32,-3 50,3 Q60,9 59,30 L56,58 Q55,66 46,66 L18,66 Q9,66 8,58 L5,30 Q4,9 14,3 Z" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
    <rect x="29" y="64" width="6" height="40" rx="3" fill="#3a3a3a"/>
  </svg>`;
}

function renderBladeHero() {
  const blades = CLUBS.map((c, i) =>
    `<button class="blade" data-i="${i}" aria-label="${c.n} Rowing">${bladeSVG(c, i)}</button>`).join("");
  return `
<div class="statement" id="bladehero" style="--up:${CLUBS[0].p};--us:${CLUBS[0].s}">
  <p class="lead-in">One boathouse at a time —</p>
  <h1>Every crew. <em>One system.</em></h1>
  <p class="sub">Built for Harvard rowing. Ready for every boathouse after it — in its own colours, read straight off the blade.</p>
  <div class="blade-arc">${blades}</div>
  <div class="blade-club" id="bladeClub">Harvard Rowing</div>
  <div class="phone bl-phone">
    <div class="screen">
      <div class="statusbar"><span>9:41</span><i class="island"></i><span>5G</span></div>
      <div class="bl-mock">
        <div class="bl-top"><i></i><span id="bladeTeam">HARVARD ROWING</span><em>Fri · AM</em></div>
        <div class="bl-greet">
          <div class="bl-kick">Week 6 of 15 · Summer base</div>
          <div class="bl-name">Varsity Home</div>
        </div>
        <div class="bl-week">
          <b></b><b></b><b></b><b class="on"></b><b></b><b></b><b></b>
        </div>
        <div class="bl-race">
          <div><div class="bl-race-n">Head of the Charles</div><div class="bl-race-d">October 18</div></div>
          <div class="bl-count"><strong>63</strong><span>days</span></div>
        </div>
        <div class="bl-note">Coach's note · work on this</div>
      </div>
      <div class="homebar"><i></i></div>
    </div>
  </div>
</div>`;
}

function renderStory(id, beats) {
  const copy = beats.map((b, i) => `
      <div class="beat${i === 0 ? " active" : ""}" data-i="${i}">
        <div class="kicker">${b.kicker}</div>
        <h2>${b.head}${b.headEm ? ` <em>${b.headEm}</em>` : ""}</h2>
        ${b.sub ? `<p>${b.sub}</p>` : ""}
      </div>`).join("");

  // one <img> per beat; pan beats get the tall class and their travel range
  const imgs = beats.map((b, i) => {
    const pan = b.pan
      ? ` data-from="${b.pan[0]}" data-to="${b.pan[1]}" data-hold="${b.hold || 0}"`
      : "";
    return `<img class="shot${b.pan ? " tall" : ""}${i === 0 ? " active" : ""}" data-i="${i}"${pan} src="${shots[b.key]}" alt="" decoding="async" />`;
  }).join("\n");

  const anns = beats.map((b, i) => b.ann.map((a) => `
        <div class="ann ann-${a.side}${i === 0 ? " active" : ""}" data-i="${i}" style="top:${a.top}%">
          ${a.side === "left" ? `<span class="ann-text">${a.text}</span><span class="ann-line"></span>` : `<span class="ann-line"></span><span class="ann-text">${a.text}</span>`}
        </div>`).join("")).join("");

  const dots = beats.map((_, i) => `<span class="dot${i === 0 ? " active" : ""}" data-i="${i}"></span>`).join("");
  const markers = beats.map((b, i) => `<div class="marker${b.pan ? " pan" : ""}" data-i="${i}" data-side="${b.side || "right"}"></div>`).join("");

  return `
<div class="story" id="${id}">
  <div class="stage">
    <div class="rail">${dots}</div>
    <div class="copy">${copy}
    </div>
    <div class="phone-col">
      <div class="phone-wrap">
        <div class="phone">
          <div class="screen">
            <div class="statusbar"><span>9:41</span><i class="island"></i><span>5G</span></div>
            <div class="shots">
${imgs}
            </div>
            <div class="homebar"><i></i></div>
          </div>
        </div>
        ${anns}
      </div>
    </div>
  </div>
  <div class="markers">${markers}</div>
</div>`;
}

const html = `<title>Never Train Alone</title>
<style>
  :root {
    --bg: #0a0a0a; --bg-elevated: #111111;
    --border: #1f1f1f; --border-2: #2a2a2a;
    --text: #f5f5f5; --text-2: #888888; --text-3: #555555;
    --blue: #4a9eff; --gold: #e0c896;
    --serif: "Instrument Serif", Georgia, "Times New Roman", serif;
    --mono: ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;
  }
  * { margin: 0; box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    background: var(--bg); color: var(--text);
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased; overflow-x: clip;
  }
  body::before {
    content: ""; position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  .statement {
    position: relative; z-index: 1; min-height: 92svh;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    text-align: center; padding: 48px 24px 24px; gap: 22px;
  }
  .badge {
    display: inline-flex; align-items: center; gap: 8px;
    border: 1px solid color-mix(in srgb, var(--sa) 30%, transparent);
    background: color-mix(in srgb, var(--sa) 10%, transparent);
    color: var(--sa); border-radius: 999px; padding: 6px 14px;
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
  }
  .badge i {
    width: 6px; height: 6px; border-radius: 50%; background: var(--sa);
    box-shadow: 0 0 8px var(--sa); animation: pulse 2s infinite;
  }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
  .statement h1 {
    font-family: var(--serif); font-weight: 400;
    font-size: clamp(52px, 11vw, 118px); line-height: 0.98; letter-spacing: -0.02em;
    text-wrap: balance; max-width: 12ch;
  }
  .statement h1 em, .statement .lead-in em { font-style: italic; color: var(--sa); }
  .statement .lead-in {
    font-family: var(--serif); font-size: clamp(20px, 3.4vw, 30px); color: var(--text-2);
    letter-spacing: -0.01em;
  }
  .statement .sub {
    color: var(--text-2); font-size: clamp(16px, 2.4vw, 19px); line-height: 1.55;
    max-width: 36ch; letter-spacing: -0.01em; text-wrap: balance;
  }
  .cue {
    margin-top: 26px; color: var(--text-3); font-family: var(--mono);
    font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .cue::after {
    content: ""; width: 1px; height: 44px;
    background: linear-gradient(var(--text-3), transparent);
    animation: cue 1.8s ease-in-out infinite;
  }
  @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes cue { 0%,100%{transform:translateY(0);opacity:.7} 50%{transform:translateY(8px);opacity:1} }

  .story { position: relative; z-index: 1; }
  .stage {
    position: sticky; top: 0; height: 100svh; overflow: hidden;
    display: grid; grid-template-columns: 1fr 1fr; align-items: center;
    max-width: 1200px; margin: 0 auto; padding: 0 48px; gap: 40px;
  }
  .markers { position: relative; margin-top: -100svh; }
  .marker { height: 100svh; }
  .marker.pan { height: 150svh; }
  /* The opening beat of each story is the one nobody has read yet — it gets
     roughly two screens of scroll before the second headline takes over. */
  .marker:first-child { height: 165svh; }
  .marker:last-child { height: 130svh; }

  .copy { position: relative; min-height: 300px; }
  .beat {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    justify-content: center; gap: 16px;
    opacity: 0; transform: translateY(18px); pointer-events: none;
    transition: opacity 0.45s ease, transform 0.45s ease;
  }
  .beat.active { opacity: 1; transform: none; }
  .kicker {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--sa);
  }
  .beat h2 {
    font-family: var(--serif); font-weight: 400;
    font-size: clamp(34px, 4.6vw, 56px); line-height: 1.04; letter-spacing: -0.015em;
    text-wrap: balance;
  }
  .beat h2 em { font-style: italic; color: var(--sa); display: block; margin-top: 6px; }
  .beat p { color: var(--text-2); font-size: 17px; line-height: 1.6; max-width: 40ch; letter-spacing: -0.01em; }

  .rail {
    position: absolute; left: 16px; top: 50%; transform: translateY(-50%);
    display: flex; flex-direction: column; gap: 10px;
  }
  .dot { cursor: pointer; width: 5px; height: 5px; border-radius: 50%; background: var(--border-2); transition: background .3s, height .3s, width .3s; }
  .dot.active { background: var(--sa); height: 18px; border-radius: 3px; }
  .dot:hover { background: var(--text-2); }
  .dot:focus-visible, .phone:focus-visible { outline: 2px solid var(--sa); outline-offset: 6px; }

  /* The phone crosses the page once per story, at the narrative pivot. Slow
     (0.9s) and eased, so it reads as one deliberate move rather than motion. */
  .copy, .phone-col { transition: transform 0.9s cubic-bezier(0.65, 0, 0.35, 1); }
  .stage.flip .phone-col { transform: translateX(calc(-100% - 40px)); }
  .stage.flip .copy      { transform: translateX(calc(100% + 40px)); }
  .phone-col { display: flex; justify-content: center; }
  .phone-wrap { will-change: transform; }
  .phone-wrap { position: relative; }
  .phone {
    cursor: pointer; width: min(360px, 48svh, 86vw);
    border: 1px solid var(--border-2); background: var(--bg-elevated);
    border-radius: 44px; padding: 10px;
    box-shadow: 0 40px 80px rgba(0,0,0,0.55);
    animation: float 7s ease-in-out infinite;
  }
  .screen { position: relative; border-radius: 34px; overflow: hidden; background: #000; }
  .statusbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 22px 8px; font-family: var(--mono); font-size: 12px;
    color: var(--text); background: #000;
  }
  .statusbar span:last-child { color: var(--text-3); font-size: 11px; }
  /* The dynamic-island pill and the gesture bar: the black bands above and
     below the app content that make the frame read as a real phone. */
  .island { width: 84px; height: 22px; border-radius: 999px; background: #161616; border: 1px solid #222; }
  .homebar { height: 24px; display: flex; align-items: center; justify-content: center; background: #000; }
  .homebar i { width: 38%; height: 4px; border-radius: 999px; background: #2e2e2e; }
  .shots { position: relative; aspect-ratio: 900 / 1479; overflow: hidden; }
  .shot {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block;
    opacity: 0; transition: opacity 0.55s ease;
  }
  .shot.tall { height: auto; will-change: transform; }
  .shot.active { opacity: 1; }

  .ann {
    position: absolute; display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.1em;
    text-transform: uppercase; color: var(--text-2); white-space: nowrap;
    opacity: 0; transition: opacity 0.45s ease 0.15s;
  }
  .ann.active { opacity: 1; }
  .ann-left  { right: calc(100% + 10px); }
  /* After the phone crosses, mirror the pointers and move the rail to the far
     edge, or they end up stacked on top of each other. */
  .stage.flip .ann-left  { right: auto; left: calc(100% + 10px); flex-direction: row-reverse; }
  .stage.flip .ann-right { left: auto; right: calc(100% + 10px); flex-direction: row-reverse; }
  .stage.flip .rail { left: auto; right: 16px; }
  .ann-right { left: calc(100% + 10px); }
  .ann-line { width: 32px; height: 1px; }
  .ann-left  .ann-line { background: linear-gradient(to left, var(--border-2), transparent); }
  .ann-right .ann-line { background: linear-gradient(to right, var(--border-2), transparent); }

  #hero, #story1 { --sa: var(--blue); }
  #interlude, #story2 { --sa: var(--gold); }
  #interlude { background: #0d0c0a; min-height: 100svh; }

  .cta {
    position: relative; z-index: 1; min-height: 70svh;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    gap: 20px; text-align: center; padding: 60px 24px 90px; --sa: var(--blue);
  }
  .cta h2 {
    font-family: var(--serif); font-weight: 400;
    font-size: clamp(36px, 6vw, 64px); letter-spacing: -0.015em; line-height: 1.05;
    text-wrap: balance; max-width: 16ch;
  }
  .cta h2 em { font-style: italic; color: var(--sa); }
  .cta p { color: var(--text-2); font-size: 16px; max-width: 40ch; line-height: 1.6; }
  .cta a {
    display: inline-flex; align-items: center; gap: 8px; margin-top: 10px;
    background: var(--sa); color: #0a0a0a; text-decoration: none;
    border-radius: 999px; padding: 15px 30px; font-size: 15px; font-weight: 600;
    letter-spacing: -0.01em; transition: transform 0.2s ease;
  }
  .cta a:hover, .cta a:focus-visible { transform: translateY(-2px); }
  .cta a:focus-visible { outline: 2px solid var(--text); outline-offset: 3px; }
  .cta .note { color: var(--text-3); font-size: 13px; margin-top: 6px; }

  .proto {
    position: fixed; bottom: 12px; left: 50%; transform: translateX(-50%); z-index: 2;
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-3);
    background: rgba(10,10,10,0.7); padding: 4px 12px; border-radius: 999px;
    border: 1px solid var(--border); backdrop-filter: blur(6px);
  }

  /* ── Blade Lock hero ── */
  /* Compact: headline, arc, club name and phone all have to fit one screen. */
  #bladehero { --sa: var(--gold); min-height: 100svh; gap: 7px; padding: 16px 24px 14px; justify-content: center; }
  #bladehero h1 { font-size: clamp(30px, 4.4vw, 50px); max-width: 18ch; }
  #bladehero .lead-in { font-size: clamp(15px, 2vw, 20px); }
  #bladehero .sub { font-size: clamp(12px, 1.4vw, 15px); max-width: 52ch; }
  .blade-arc {
    display: flex; align-items: flex-start; justify-content: center;
    height: clamp(74px, 10svh, 104px); margin-top: 0; position: relative; width: 100%;
    max-width: 900px; pointer-events: none;
  }
  .blade {
    position: absolute; left: 50%; top: 0; margin-left: -32px;
    background: none; border: 0; padding: 0; cursor: pointer; pointer-events: auto;
    transition: transform 0.8s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.8s ease, filter 0.8s ease;
    transform-origin: 50% 20%;
  }
  .blade:focus-visible { outline: 2px solid var(--up); outline-offset: 4px; border-radius: 8px; }
  .blade.lock { filter: drop-shadow(0 0 18px color-mix(in srgb, var(--up) 55%, transparent)); }
  .blade-club { margin-top: 18px;
    font-family: var(--mono); font-size: 12px; letter-spacing: 0.18em;
    text-transform: uppercase; color: var(--up); transition: color 0.6s ease;
  }
  .bl-phone { cursor: default; animation: none; width: min(198px, 20svh, 52vw); margin-top: 0; }
  .bl-mock { aspect-ratio: 900 / 900; background: #0c0c0c; padding: 14px; display: flex; flex-direction: column; gap: 12px; transition: background 0.6s ease; }
  .bl-top { display: flex; align-items: center; gap: 8px; font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em; color: var(--up); transition: color 0.6s ease; }
  .bl-top i { width: 7px; height: 7px; border-radius: 50%; background: var(--up); box-shadow: 0 0 8px var(--up); transition: background 0.6s ease; }
  .bl-top em { margin-left: auto; font-style: normal; color: var(--text-3); }
  .bl-greet { margin-top: 4px; }
  .bl-kick { font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--us); transition: color 0.6s ease; }
  .bl-name { font-family: var(--serif); font-size: 21px; color: var(--text); margin-top: 4px; }
  .bl-week { display: flex; gap: 5px; }
  .bl-week b { flex: 1; height: 34px; border-radius: 6px; background: #181818; border: 1px solid #222; }
  .bl-week b.on { background: color-mix(in srgb, var(--up) 30%, #181818); border-color: var(--up); transition: background 0.6s ease, border-color 0.6s ease; }
  .bl-race {
    display: flex; align-items: center; justify-content: space-between;
    border: 1px solid color-mix(in srgb, var(--up) 45%, transparent);
    background: color-mix(in srgb, var(--up) 12%, transparent);
    border-radius: 12px; padding: 12px 14px; transition: border-color 0.6s ease, background 0.6s ease;
  }
  .bl-race-n { font-size: 13px; font-weight: 600; color: var(--text); }
  .bl-race-d { font-size: 11px; color: var(--text-2); margin-top: 2px; }
  .bl-count { text-align: right; color: var(--up); transition: color 0.6s ease; }
  .bl-count strong { font-size: 26px; font-weight: 700; }
  .bl-count span { display: block; font-family: var(--mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; }
  .bl-note {
    font-family: var(--mono); font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase;
    color: var(--text-3); border: 1px dashed #2a2a2a; border-radius: 8px; padding: 9px 12px;
  }

  @media (max-width: 1023px) {
    .stage {
      grid-template-columns: 1fr; grid-template-rows: auto 1fr;
      padding: 12px 20px 20px; gap: 6px; align-items: start;
    }
    .copy { min-height: 148px; }
    .beat { justify-content: flex-end; gap: 8px; text-align: center; align-items: center; }
    .beat h2 { font-size: clamp(27px, 7.4vw, 36px); }
    .beat p { font-size: 14px; line-height: 1.5; max-width: 34ch; }
    .kicker { font-size: 10px; }
    .phone-col { align-items: start; height: 100%; padding-top: 10px; }
    .phone { width: min(84vw, (100svh - 230px) * 0.55); }
    .ann { display: none; }
    /* The phone crossing the page is a two-column move. In one column it just
       drives the phone off the side of the screen, so the flip is off here. */
    .stage.flip .phone-col, .stage.flip .copy { transform: none; }
    .rail { top: auto; bottom: -6px; position: absolute; left: 50%; transform: translateX(-50%); flex-direction: row; }
    .stage.flip .rail { left: 50%; right: auto; }
    .dot.active { height: 5px; width: 18px; }
    .marker:first-child { height: 120svh; }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .beat, .shot, .ann, .dot { transition: none; }
    .cue::after, .badge i, .phone { animation: none; }
  }
</style>

<div class="statement" id="hero">
  <div class="badge"><i></i>UNIsport &middot; the campus fitness app</div>
  <h1>Never train <em>alone.</em></h1>
  <p class="sub">Every gym on campus, the people worth training with, and the plan that actually gets you both there.</p>
  <div class="cue">Scroll</div>
</div>

${renderStory("story1", story1)}

<div class="statement" id="interlude">
  <p class="lead-in">And if you train for the university itself —</p>
  <h1>Varsity <em>Mode.</em></h1>
  <p class="sub">The app your squad has been running out of a group chat.</p>
  <div class="cue">Keep going</div>
</div>

${renderStory("story2", story2)}

${renderBladeHero()}

<div class="cta">
  <h2>One app per university. <em>Yours next.</em></h2>
  <p>Live now at one university. New campuses are onboarded one at a time — colours, gyms and houses included.</p>
  <a href="https://un-isport.vercel.app/join" target="_blank" rel="noopener">Bring it to your university</a>
  <div class="note">Prototype — scroll timing and copy under review.</div>
</div>

<div class="proto">Scroll-story prototype · both animations</div>

<script>
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stories = Array.prototype.slice.call(document.querySelectorAll(".story")).map(function (story) {
    return {
      el: story,
      stage: story.querySelector(".stage"),
      wrap: story.querySelector(".phone-wrap"),
      beats: Array.prototype.slice.call(story.querySelectorAll(".beat")),
      shots: Array.prototype.slice.call(story.querySelectorAll(".shot")),
      anns: Array.prototype.slice.call(story.querySelectorAll(".ann")),
      dots: Array.prototype.slice.call(story.querySelectorAll(".dot")),
      markers: Array.prototype.slice.call(story.querySelectorAll(".marker")),
      current: -1,
    };
  });

  function setActive(s, i) {
    if (i === s.current || i < 0) return;
    s.current = i;
    var side = s.markers[i] ? s.markers[i].getAttribute("data-side") : "right";
    s.stage.classList.toggle("flip", side === "left");
    [s.beats, s.shots, s.anns, s.dots].forEach(function (els) {
      els.forEach(function (el) {
        el.classList.toggle("active", +el.getAttribute("data-i") === i);
      });
    });
  }

  // Which beat owns the middle of the screen. Plain geometry rather than an
  // IntersectionObserver: the markers are pulled under a sticky stage with a
  // negative margin, and observers were not reporting them reliably there.
  function frame() {
    var mid = window.innerHeight / 2;
    stories.forEach(function (s) {
      var best = -1;
      for (var i = 0; i < s.markers.length; i++) {
        var r = s.markers[i].getBoundingClientRect();
        if (r.top <= mid && r.bottom > mid) { best = i; break; }
      }
      if (best === -1) {
        var box = s.el.getBoundingClientRect();
        if (box.bottom <= mid) best = s.markers.length - 1;
        else if (box.top >= mid) best = 0;
      }
      setActive(s, best);

      if (reduce) return;

      // A slow drift over the whole story — deliberately a different speed from
      // the per-beat text, so the two never read as the same movement.
      var b = s.el.getBoundingClientRect();
      var q = (window.innerHeight - b.top) / (window.innerHeight + b.height);
      q = Math.max(0, Math.min(1, q));
      if (s.wrap) {
        s.wrap.style.transform =
          "translateY(" + (14 - q * 28).toFixed(1) + "px) rotate(" + (1.1 - q * 2.2).toFixed(2) + "deg)";
      }

      // Tall captures scroll inside the phone.
      s.shots.forEach(function (img, i) {
        if (!img.classList.contains("tall")) return;
        var m = s.markers[i];
        if (!m) return;
        var mr = m.getBoundingClientRect();
        var p = (window.innerHeight - mr.top) / (window.innerHeight + mr.height);
        p = Math.max(0, Math.min(1, p));
        // A hold is a dead zone at the START of the beat: the screen sits still
        // long enough to be read, then the remaining scroll does the whole pan.
        var hold = parseFloat(img.getAttribute("data-hold")) || 0;
        if (hold > 0 && hold < 1) p = p <= hold ? 0 : (p - hold) / (1 - hold);
        var from = parseFloat(img.getAttribute("data-from")) || 0;
        var to = parseFloat(img.getAttribute("data-to")) || 1;
        var frac = from + (to - from) * p;
        var travel = img.offsetHeight - img.parentNode.offsetHeight;
        if (travel > 0) img.style.transform = "translateY(" + -(frac * travel).toFixed(1) + "px)";
      });
    });
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () { frame(); ticking = false; });
  }
  // Listen in the capture phase on document: if any ancestor ends up being the
  // scrolling box (a stray overflow on body will do it), scroll events fire
  // there and never reach window.
  document.addEventListener("scroll", onScroll, { passive: true, capture: true });
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  window.addEventListener("load", frame);
  frame();

  // ── Interaction ──────────────────────────────────────────────────────────
  // Scroll the page so a given beat sits in the middle. Everything else follows
  // from that, so navigation and scrolling can never disagree.
  function goTo(s, i) {
    var m = s.markers[i];
    if (!m) return;
    var r = m.getBoundingClientRect();
    var y = window.scrollY + r.top + r.height / 2 - window.innerHeight / 2;
    window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  }

  stories.forEach(function (s) {
    // Dots jump to their beat.
    s.dots.forEach(function (dot, i) {
      dot.setAttribute("role", "button");
      dot.setAttribute("tabindex", "0");
      dot.setAttribute("aria-label", "Go to step " + (i + 1));
      dot.addEventListener("click", function () { goTo(s, i); });
      dot.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goTo(s, i); }
      });
    });

    // Tapping the phone advances a beat — and wraps at the end, so it never
    // becomes a dead control.
    var phone = s.el.querySelector(".phone");
    if (phone) {
      phone.setAttribute("role", "button");
      phone.setAttribute("tabindex", "0");
      phone.setAttribute("aria-label", "Next step");
      var advance = function () { goTo(s, (s.current + 1) % s.markers.length); };
      phone.addEventListener("click", advance);
      phone.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); advance(); }
        if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); advance(); }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          goTo(s, (s.current - 1 + s.markers.length) % s.markers.length);
        }
      });
    }
  });
})();
</script>
<script>
(function () {
  var hero = document.getElementById('bladehero');
  if (!hero) return;
  var blades = Array.prototype.slice.call(hero.querySelectorAll('.blade'));
  var club = document.getElementById('bladeClub');
  var team = document.getElementById('bladeTeam');
  var CLUBS = ${JSON.stringify(CLUBS.map(c => ({ n: c.n, p: c.p, s: c.s })))};
  var N = blades.length, active = 0, timer = null;
  function place() {
    blades.forEach(function (b, i) {
      var off = i - active;
      if (off > N / 2) off -= N;
      if (off < -N / 2) off += N;
      var x = off * 74, y = Math.abs(off) * 13, r = off * 8;
      var sc = off === 0 ? 1.28 : Math.max(0.62, 1 - Math.abs(off) * 0.11);
      b.style.transform = 'translate(' + x + 'px,' + y + 'px) rotate(' + r + 'deg) scale(' + sc + ')';
      b.style.opacity = Math.abs(off) > 4 ? 0 : String(1 - Math.abs(off) * 0.16);
      b.style.zIndex = String(100 - Math.abs(off));
      b.classList.toggle('lock', off === 0);
    });
    var c = CLUBS[active];
    hero.style.setProperty('--up', c.p);
    hero.style.setProperty('--us', c.s);
    club.textContent = c.n + ' Rowing';
    team.textContent = c.n.toUpperCase() + ' ROWING';
  }
  function next() { active = (active + 1) % N; place(); }
  function start() { stop(); timer = setInterval(next, 2600); }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }
  blades.forEach(function (b, i) {
    b.addEventListener('click', function () { active = i; place(); start(); });
  });
  place();
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) start();
})();
</script>
`;

fs.writeFileSync("story.html", html);
console.log("story.html", (fs.statSync("story.html").size / 1024).toFixed(0) + "KB");
