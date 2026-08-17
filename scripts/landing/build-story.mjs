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
//
// Beats also say HOW they arrive, so a cut reads as something the user did
// rather than a slide change. `enter`:
//   "push"    — drilled in: the new screen slides in from the right, the old
//               one drifts left behind it (iOS navigation).
//   "tab"     — switched tab: the same slide, no parallax on the old screen.
//   "sheet"   — a sheet rises from the bottom over the screen behind it.
//   "dismiss" — the sheet drops back down, revealing what was underneath.
//   "none"    — same screen continuing (consecutive pans of one strip).
//   omitted   — the old crossfade.
// `tap: [x%, y%]` pulses a ring on the OUTGOING screen first, then the motion
// follows, so cause and effect are in the right order. Coordinates are measured
// off the live app, not guessed.
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
    key: "02-match", kicker: "02 · The people", enter: "tab", tap: [37.5, 95.5],
    head: "Then it finds your people.",
    sub: "Sorted by how well you actually fit — same gym, same hours, same level.",
    ann: [{ side: "right", top: 24, text: "Ranked by real fit" }],
  },
  {
    key: "03-why-you-match", kicker: "03 · The reasons", enter: "zoom", tap: [26, 54],
    head: "And it tells you why.",
    sub: "Every reason is a real fact from both profiles. No black box.",
    ann: [{ side: "left", top: 56, text: "Facts, not guesses" }],
  },
  {
    key: "04-plan-a-session", kicker: "04 · The plan", enter: "push", tap: [68, 86.5], pointer: true,
    head: "Make the plan in the chat.",
    sub: "One tap proposes a session. One tap accepts. It's on both your calendars.",
    ann: [{ side: "right", top: 52, text: "One tap to accept" }],
  },
  {
    // hold 0.25: the sheet is at its very top the moment the beat appears,
    // then the whole scroll happens on screen instead of starting mid-page.
    key: "tall-logsheet", kicker: "05 · The log", pan: [0, 0.75], hold: 0.25, side: "left", enter: "push",
    head: "Afterwards, log it together.",
    sub: "Every set, every rep — and the partner carried straight over from the plan.",
    ann: [{ side: "right", top: 30, text: "Set by set" }],
  },
  {
    key: "tall-logsheet", kicker: "06 · The record", pan: [0.75, 1], side: "left", enter: "none",
    head: "A photo and a note, while it's fresh.",
    sub: "Who you trained with, how it went, and a picture if you took one — a training log you'll still want to read in four years.",
    ann: [{ side: "left", top: 50, text: "Photo + note" }],
  },
  {
    // The profile scrolls from the name down to the leaderboard ranks and comes
    // to rest on the session calendar — the month is the closing image.
    key: "tall-profile", kicker: "07 · The proof", pan: [0, 1.3], hold: 0.2, side: "left", enter: "dismiss", tap: [50, 95],
    head: "29 sessions. 6 partners.", headEm: "Never train alone.",
    sub: "",
    ann: [{ side: "right", top: 30, text: "Leaderboards" }, { side: "left", top: 76, text: "Every day you trained" }],
  },
];

const story2 = [
  {
    // V1 carries the scroll all the way down to the lineup, so V2's headline
    // arrives with the boat almost centred rather than announcing it early.
    key: "tall-vhome", kicker: "V1 · The plan", pan: [0, 0.5], hold: 0.45,
    head: "The coach's plan, on every phone.",
    sub: "Water, erg, weights — the week your coach actually built. Not a screenshot of a spreadsheet.",
    ann: [{ side: "right", top: 18, text: "Week 6 of 15" }],
  },
  {
    key: "tall-vhome", kicker: "V2 · The boat", pan: [0.5, 0.8], enter: "none",
    head: "Your name, in the boat.",
    sub: "The lineup your coach published, seat by seat, the night before you row it — the four in the morning, the pair after lunch.",
    ann: [{ side: "left", top: 42, text: "You, 3 seat" }],
  },
  {
    // The race and the note used to be a beat each. On a home screen this short
    // they share one window, and no amount of scrolling separates them.
    // `to` past 1: the pan hits the very bottom mid-beat and rests there.
    key: "tall-vhome", kicker: "V3 · The race", pan: [0.74, 1.2], enter: "none",
    head: "The next race, and what to fix before it.",
    sub: "Head of the Charles, 63 days out — and one note from your coach sitting under it until you've sorted it.",
    ann: [{ side: "right", top: 52, text: "Counting down" }, { side: "left", top: 70, text: "Straight from the coach" }],
  },
  {
    key: "13-varsity-log-list", kicker: "V4 · The week", side: "left", enter: "sheet", tap: [50, 92.7],
    head: "Log straight off the plan.",
    sub: "Your whole week across the top — every session the coach set, waiting to be logged.",
    ann: [{ side: "right", top: 16, text: "Your week, at a glance" }, { side: "left", top: 44, text: "Tap to log" }],
  },
  {
    // Logged a workout → over to the Calendar tab, where it just landed.
    key: "14-varsity-calendar", kicker: "V5 · The calendar", side: "left", enter: "tab", tap: [30.8, 94],
    head: "Keep track of every session.",
    sub: "Each workout you log lands on the calendar by itself — your season's training history, paired with live statistics.",
    ann: [{ side: "right", top: 34, text: "Session dots" }, { side: "left", top: 64, text: "Today" }],
  },
  {
    key: "tall-vprofile", kicker: "V6 · The season", pan: [0.06, 0.42], side: "left", enter: "tab", tap: [88.4, 93.3],
    head: "129 km this week.",
    sub: "Metres rowed, week by week, all season — consistency you can actually see.",
    ann: [{ side: "right", top: 40, text: "Eight weeks of work" }],
  },
];

/*
  THE CLOSERS — the two Claude Design pieces in webpage/.

  They are not HTML pages that can be pasted in: each is a BUNDLED app, ~130KB
  of JavaScript that mounts itself into document.body and owns the document
  (their CSS starts with `* { margin: 0 }` and styles `body` directly). Spliced
  into this page they would flatten the sticky stages and the phone would stop
  tracking the scroll.

  So each gets its own document, in a full-screen frame: their code runs
  untouched, nothing leaks either way, and re-exporting from Claude Design is a
  drop-in — replace the file in webpage/ and rebuild. The frames are told not
  to scroll, so a wheel over one keeps scrolling THIS page.
*/
function closer(id, file, title) {
  let doc = fs.readFileSync("../../webpage/" + file, "utf8");
  const noScroll = "<style>html,body{overflow:hidden!important}</style>";
  doc = doc.includes("</head>") ? doc.replace("</head>", noScroll + "</head>") : noScroll + doc;
  // srcdoc is an HTML attribute: & and " have to be escaped, nothing else.
  const esc = doc.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `
<section class="closer" id="${id}">
  <iframe class="closer-frame" title="${title}" srcdoc="${esc}"></iframe>
</section>`;
}

function renderStory(id, beats) {
  const copy = beats.map((b, i) => `
      <div class="beat${i === 0 ? " active" : ""}" data-i="${i}">
        <div class="kicker">${b.kicker}</div>
        <h2>${b.head}${b.headEm ? ` <em>${b.headEm}</em>` : ""}</h2>
        ${b.sub ? `<p>${b.sub}</p>` : ""}
      </div>`).join("");

  // One <img> per beat, each in its own frame. The FRAME carries the entrance
  // (slide / rise / drop); the IMG carries the pan. Two elements, because a
  // single transform can't be driven by two things at once.
  const imgs = beats.map((b, i) => {
    const pan = b.pan
      ? ` data-from="${b.pan[0]}" data-to="${b.pan[1]}" data-hold="${b.hold || 0}"`
      : "";
    return `<div class="shot-frame${i === 0 ? " active" : ""}" data-i="${i}" data-enter="${b.enter || "fade"}">
                <img class="shot${b.pan ? " tall" : ""}" data-i="${i}"${pan} src="${shots[b.key]}" alt="" decoding="async" />
              </div>`;
  }).join("\n");

  // The tap that caused each arrival, drawn over the screen you are leaving —
  // and, where asked for, the arrow that walks in and presses the button.
  const taps = beats.map((b, i) => {
    if (!b.tap) return "";
    const ring = `<span class="tap" data-i="${i}" style="left:${b.tap[0]}%;top:${b.tap[1]}%"></span>`;
    const arrow = b.pointer
      ? `<span class="pointer" data-i="${i}" style="left:${b.tap[0]}%;top:${b.tap[1]}%">
           <svg viewBox="0 0 24 24" width="22" height="22"><path d="M5 2 L19 12.5 L12.6 13.8 L16 21 L13.2 22.2 L9.9 15.1 L5.4 19.6 Z" fill="#fff" stroke="#000" stroke-width="1.2" stroke-linejoin="round"/></svg>
         </span>`
      : "";
    return ring + arrow;
  }).join("");

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
              ${taps}
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
<script>
  // Theme first, before any styles apply: default DARK — the black page is
  // what makes the light phone screens read as lit screens. Light is opt-in
  // through the switch, and remembered per browser.
  (function () {
    var t;
    try { t = localStorage.getItem("storyTheme"); } catch (e) {}
    if (t === "light") document.documentElement.classList.add("light");
  })();
</script>
<style>
  :root {
    --bg: #0a0a0a; --bg-elevated: #111111;
    --border: #1f1f1f; --border-2: #2a2a2a;
    --text: #f5f5f5; --text-2: #888888; --text-3: #555555;
    --blue: #4a9eff; --gold: #e0c896;
    --bg-warm: #0d0c0a;
    --grid: rgba(255,255,255,0.015);
    --phone-shadow: rgba(0,0,0,0.55);
    --pill-bg: rgba(10,10,10,0.7);
    --serif: "Instrument Serif", Georgia, "Times New Roman", serif;
    --mono: ui-monospace, "SF Mono", "Cascadia Mono", Consolas, monospace;
  }
  /* The light palette: same page, neutrals flipped, accents darkened so the
     kickers and italics keep their contrast on white. */
  html.light {
    --bg: #faf9f7; --bg-elevated: #ffffff;
    --border: #e7e4df; --border-2: #d6d2cb;
    --text: #16150f; --text-2: #5c584f; --text-3: #9b968c;
    --blue: #1a63c4; --gold: #8a6d20;
    --bg-warm: #f4f1ea;
    --grid: rgba(0,0,0,0.03);
    --phone-shadow: rgba(20,16,8,0.2);
    --pill-bg: rgba(255,255,255,0.75);
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
      linear-gradient(var(--grid) 1px, transparent 1px),
      linear-gradient(90deg, var(--grid) 1px, transparent 1px);
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
    border: 1px solid #2a2a2a; background: #101010;
    border-radius: 44px; padding: 10px;
    box-shadow: 0 40px 80px var(--phone-shadow);
    animation: float 7s ease-in-out infinite;
  }
  .screen { position: relative; border-radius: 34px; overflow: hidden; background: #fff; }
  .statusbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 12px 22px 8px; font-family: var(--mono); font-size: 12px;
    color: #16150f; background: #fff;
  }
  .statusbar span:last-child { color: #9b968c; font-size: 11px; }
  /* The dynamic-island pill and the gesture bar: the black bands above and
     below the app content that make the frame read as a real phone. */
  .island { width: 84px; height: 22px; border-radius: 999px; background: #161616; border: 1px solid #222; }
  .homebar { height: 24px; display: flex; align-items: center; justify-content: center; background: #fff; }
  .homebar i { width: 38%; height: 4px; border-radius: 999px; background: #cfccc6; }
  .shots { position: relative; aspect-ratio: 900 / 1479; overflow: hidden; background: #fff; }
  /*
    Each screen sits in its own frame. Only two frames are ever visible: the one
    arriving and the one it is replacing, which is kept on screen underneath for
    the length of the move — otherwise a slide reveals the black phone behind it
    instead of the screen you came from.
  */
  .shot-frame {
    position: absolute; inset: 0; overflow: hidden; opacity: 0; z-index: 0;
    transition: opacity 0.5s ease, transform 0.62s cubic-bezier(0.32, 0.72, 0, 1);
    will-change: transform;
  }
  .shot-frame.active { opacity: 1; z-index: 2; transform: none; }
  .shot-frame.leaving { opacity: 1; z-index: 1; }
  .shot { position: absolute; top: 0; left: 0; width: 100%; height: 100%; display: block; }
  .shot.tall { height: auto; will-change: transform; }

  /* Arriving. A frame is parked in its start position until it goes .active. */
  .shot-frame[data-enter="push"]:not(.active):not(.leaving),
  .shot-frame[data-enter="tab"]:not(.active):not(.leaving)  { transform: translateX(100%); opacity: 1; }
  .shot-frame[data-enter="sheet"]:not(.active):not(.leaving) { transform: translateY(100%); opacity: 1; }
  /* An arriving zoom target starts slightly small and settles to full size. */
  .shot-frame[data-enter="zoom"]:not(.active):not(.leaving)  { transform: scale(0.92); }
  /* "none" is a continuation of the same screen: no motion, no fade. */
  .shot-frame[data-enter="none"] { transition: none; }

  /* Leaving. Where the old screen goes depends on what replaced it. */
  .shot-frame.leaving[data-out="push"]    { transform: translateX(-22%); filter: brightness(0.82); }
  .shot-frame.leaving[data-out="tab"]     { transform: translateX(-100%); }
  .shot-frame.leaving[data-out="sheet"]   { transform: scale(0.94); filter: brightness(0.78); }
  .shot-frame.leaving[data-out="none"]    { transition: none; opacity: 0; }
  .shot-frame.leaving[data-out="fade"]    { opacity: 0; }
  /* The sheet drops away OVER the screen it reveals. */
  .shot-frame.leaving[data-out="dismiss"] { transform: translateY(102%); z-index: 3; }
  /* The whoosh: the old screen magnifies into the tapped button and dissolves. */
  .shot-frame.leaving[data-out="zoom"] {
    transform: scale(2.35); opacity: 0; z-index: 3;
    transform-origin: var(--ox, 50%) var(--oy, 50%);
    transition: transform 0.72s cubic-bezier(0.5, 0, 0.15, 1), opacity 0.5s ease 0.18s;
  }

  /* Scrolling back up: no directional replay, just a quick honest crossfade. */
  .shots.rev .shot-frame { transition: opacity 0.4s ease; transform: none; filter: none; }
  .shots.rev .shot-frame:not(.active) { opacity: 0; }

  /* The tap that caused it: a ring, on the screen being left, before it moves. */
  .tap {
    position: absolute; z-index: 4; width: 34px; height: 34px; margin: -17px 0 0 -17px;
    border-radius: 50%; border: 2px solid rgba(22,21,15,0.75);
    background: rgba(22,21,15,0.12); opacity: 0; pointer-events: none;
  }
  .tap.fire { animation: tap-ring 0.5s ease-out; }
  @keyframes tap-ring {
    0%   { opacity: 0;   transform: scale(0.45); }
    28%  { opacity: 0.95; transform: scale(0.8); }
    100% { opacity: 0;   transform: scale(1.7); }
  }

  /* The arrow that walks to a button and presses it. Tip sits on the target. */
  .pointer {
    position: absolute; z-index: 4; width: 22px; height: 22px; margin: -2px 0 0 -2px;
    opacity: 0; pointer-events: none;
  }
  .pointer svg { display: block; filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6)); }
  .pointer.fire { animation: pointer-walk 0.95s cubic-bezier(0.3, 0, 0.2, 1); }
  @keyframes pointer-walk {
    0%   { opacity: 0; transform: translate(90px, 120px); }
    30%  { opacity: 1; }
    58%  { transform: translate(0, 0) scale(1); }
    70%  { transform: translate(0, 0) scale(0.8); }   /* the press */
    82%  { transform: translate(0, 0) scale(1); }
    100% { opacity: 0; transform: translate(0, 0); }
  }

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
  #interlude { background: var(--bg-warm); min-height: 100svh; }

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

  /* Light / dark switch — one button, swaps the page palette. */
  .mode {
    position: fixed; top: 14px; right: 14px; z-index: 5;
    width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--border-2); background: var(--pill-bg);
    color: var(--text-2); backdrop-filter: blur(6px);
    transition: color 0.2s ease, border-color 0.2s ease;
  }
  .mode:hover, .mode:focus-visible { color: var(--text); border-color: var(--text-3); }
  .mode:focus-visible { outline: 2px solid var(--sa, var(--blue)); outline-offset: 3px; }
  /* The icon shows where the button takes you: sun in the dark, moon in the light. */
  .mode svg { display: block; }
  .mode .moon { display: none; }
  html.light .mode .sun { display: none; }
  html.light .mode .moon { display: block; }

  /* A closer is a whole screen of its own: the reader stops scrolling and reads. */
  .closer { position: relative; z-index: 1; width: 100%; height: 100svh; background: var(--bg); }
  .closer-frame { display: block; width: 100%; height: 100%; border: 0; }
  /* A narrow screen stacks their layout taller than one viewport; the script
     below grows the section to fit rather than clipping it. */
  .closer.tallfit { height: auto; }
  .closer.tallfit .closer-frame { height: var(--fit); }

  .proto {
    position: fixed; bottom: 12px; left: 14px; z-index: 2;
    font-family: var(--mono); font-size: 10px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--text-3);
    background: var(--pill-bg); padding: 4px 12px; border-radius: 999px;
    border: 1px solid var(--border); backdrop-filter: blur(6px);
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
    /* Not enough width for a prototype label and a phone at the same time. */
    .proto { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .beat, .shot, .shot-frame, .ann, .dot { transition: none; }
    .cue::after, .badge i, .phone, .tap, .pointer { animation: none; }
    /* No motion: every cut is a plain show/hide. */
    .shot-frame:not(.active) { opacity: 0; transform: none; }
  }
</style>

<div class="statement" id="hero">
  <div class="badge"><i></i>UNIsport &middot; the campus fitness app</div>
  <h1>Never train <em>alone.</em></h1>
  <p class="sub">Every gym on campus, the people worth training with, and the plan that actually gets you both there.</p>
  <div class="cue">Scroll</div>
</div>

${renderStory("story1", story1)}

${closer("closer-colours", "UNIsport Campus Colours.html", "Your campus, your colours")}

<div class="statement" id="interlude">
  <p class="lead-in">And if you train for the university itself —</p>
  <h1>Varsity <em>Mode.</em></h1>
  <p class="sub">The app your squad has been running out of a group chat.</p>
  <div class="cue">Keep going</div>
</div>

${renderStory("story2", story2)}

${closer("closer-blades", "Blade Lock Light.html", "Every crew. One system.")}

<div class="cta">
  <h2>One app per university. <em>Yours next.</em></h2>
  <p>Live now at one university. New campuses are onboarded one at a time — colours, gyms and houses included.</p>
  <a href="https://un-isport.vercel.app/join" target="_blank" rel="noopener">Bring it to your university</a>
  <div class="note">Prototype — scroll timing and copy under review.</div>
</div>

<button class="mode" id="modeToggle" aria-label="Switch between light and dark mode">
  <svg class="sun" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7"/>
  </svg>
  <svg class="moon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20.4 14.2A8.6 8.6 0 0 1 9.8 3.6a8.6 8.6 0 1 0 10.6 10.6Z"/>
  </svg>
</button>
<script>
  // Each closer is its own document, so it can be measured: if what it renders
  // is taller than one screen (phones stack it), the section grows to fit
  // instead of cutting the phone in half. Capped, because their layout uses
  // viewport units — growing the frame grows the content, and an uncapped loop
  // would chase itself forever.
  (function () {
    var frames = [].slice.call(document.querySelectorAll(".closer-frame"));
    function fit() {
      frames.forEach(function (f) {
        var sec = f.parentNode;
        sec.classList.remove("tallfit");
        f.style.height = "";
        var d = f.contentDocument;
        if (!d || !d.body) return;
        var need = Math.max(d.body.scrollHeight, d.documentElement.scrollHeight);
        var cap = Math.round(window.innerHeight * 2);
        if (need > f.clientHeight + 8) {
          sec.classList.add("tallfit");
          sec.style.setProperty("--fit", Math.min(need + 8, cap) + "px");
        }
      });
    }
    frames.forEach(function (f) { f.addEventListener("load", fit); });
    window.addEventListener("load", fit);
    window.addEventListener("resize", fit);
    setTimeout(fit, 600);
    setTimeout(fit, 2000);
  })();
</script>
<script>
  document.getElementById("modeToggle").addEventListener("click", function () {
    var light = document.documentElement.classList.toggle("light");
    try { localStorage.setItem("storyTheme", light ? "light" : "dark"); } catch (e) {}
  });
</script>

<div class="proto">Scroll-story prototype · both animations</div>

<script>
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var stories = Array.prototype.slice.call(document.querySelectorAll(".story")).map(function (story) {
    return {
      el: story,
      stage: story.querySelector(".stage"),
      wrap: story.querySelector(".phone-wrap"),
      shotsBox: story.querySelector(".shots"),
      beats: Array.prototype.slice.call(story.querySelectorAll(".beat")),
      frames: Array.prototype.slice.call(story.querySelectorAll(".shot-frame")),
      shots: Array.prototype.slice.call(story.querySelectorAll(".shot")),
      taps: Array.prototype.slice.call(story.querySelectorAll(".tap")),
      pointers: Array.prototype.slice.call(story.querySelectorAll(".pointer")),
      anns: Array.prototype.slice.call(story.querySelectorAll(".ann")),
      dots: Array.prototype.slice.call(story.querySelectorAll(".dot")),
      markers: Array.prototype.slice.call(story.querySelectorAll(".marker")),
      current: -1,
      pending: null,   // a scheduled switch, waiting for its tap to play out
      cleanup: null,   // timer that resets a .leaving frame after its move
    };
  });

  function replay(el) {
    if (!el) return;
    el.classList.remove("fire");
    void el.offsetWidth; // restart the animation from zero
    el.classList.add("fire");
  }

  // The actual class flip: new frame in, old frame plays its exit.
  // "shown" tracks what is on screen; "current" tracks where the scroll is.
  // They differ only for the few hundred ms while a tap is playing out.
  function commit(s, i, prev, fwd) {
    s.shown = i;
    var side = s.markers[i] ? s.markers[i].getAttribute("data-side") : "right";
    s.stage.classList.toggle("flip", side === "left");
    s.shotsBox.classList.toggle("rev", !fwd);

    if (s.cleanup) { clearTimeout(s.cleanup); s.cleanup = null; }
    var enter = s.frames[i] ? s.frames[i].getAttribute("data-enter") : "fade";
    s.frames.forEach(function (f) {
      var fi = +f.getAttribute("data-i");
      // Everyone not in this move snaps to their parking spot with the
      // transition off — otherwise a stray frame (a cancelled exit, or a
      // parked frame whose position just changed with the rev toggle) slides
      // visibly across the screen on its way there.
      if (fi !== i && fi !== prev) {
        f.style.transition = "none";
        f.classList.remove("leaving", "active");
        f.removeAttribute("data-out");
        void f.offsetWidth;
        f.style.transition = "";
        return;
      }
      f.classList.toggle("active", fi === i);
      if (fi === prev && prev !== i && prev !== -1) {
        f.classList.add("leaving");
        f.setAttribute("data-out", fwd ? enter : "fade");
        if (enter === "zoom" && s.pendingTap) {
          f.style.setProperty("--ox", s.pendingTap[0] + "%");
          f.style.setProperty("--oy", s.pendingTap[1] + "%");
        }
      } else {
        f.classList.remove("leaving");
        f.removeAttribute("data-out");
      }
    });
    s.cleanup = setTimeout(function () {
      s.frames.forEach(function (f) {
        if (!f.classList.contains("leaving")) return;
        f.style.transition = "none";
        f.classList.remove("leaving");
        f.removeAttribute("data-out");
        void f.offsetWidth;
        f.style.transition = "";
      });
    }, 900);

    [s.beats, s.anns, s.dots].forEach(function (els) {
      els.forEach(function (el) {
        el.classList.toggle("active", +el.getAttribute("data-i") === i);
      });
    });
  }

  function setActive(s, i) {
    if (i === s.current || i < 0) return;
    s.current = i;
    var prev = s.shown === undefined ? -1 : s.shown;
    var fwd = i > prev;
    if (s.pending) { clearTimeout(s.pending); s.pending = null; }
    if (i === prev) return; // scrolled back to what is already on screen

    // Moving forward into the NEXT beat with a recorded tap: play the tap on
    // the screen we are leaving first, then make the move. Backwards, or when
    // several beats fly by in one scroll, skip the theatre and just switch.
    var tap = fwd && prev !== -1 && i === prev + 1 && !reduce
      ? s.taps.filter(function (t) { return +t.getAttribute("data-i") === i; })[0]
      : null;
    var pointer = tap
      ? s.pointers.filter(function (p) { return +p.getAttribute("data-i") === i; })[0]
      : null;

    if (!tap) { s.pendingTap = null; commit(s, i, prev, fwd); return; }

    s.pendingTap = [parseFloat(tap.style.left), parseFloat(tap.style.top)];
    var delay;
    if (pointer) { replay(pointer); setTimeout(function () { replay(tap); }, 520); delay = 900; }
    else { replay(tap); delay = 300; }
    s.pending = setTimeout(function () { s.pending = null; commit(s, i, prev, fwd); }, delay);
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
        // Vertical only — a rotation here read as the phone being tilted.
        s.wrap.style.transform = "translateY(" + (14 - q * 28).toFixed(1) + "px)";
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
        // data-to past 1 means: reach the bottom early, then rest there.
        var frac = Math.min(1, from + (to - from) * p);
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
`;

fs.writeFileSync("story.html", html);
console.log("story.html", (fs.statSync("story.html").size / 1024).toFixed(0) + "KB");
