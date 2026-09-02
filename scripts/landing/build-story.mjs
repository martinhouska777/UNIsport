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
import sharp from "sharp";

const shots = JSON.parse(fs.readFileSync("shots.json", "utf8"));

/* The REAL screens for the closers' phones, in every school's colours —
   produced by recolor-shots.mjs from the same captures the stories use, so
   the flight lands on exactly the image it flew with. Downscaled here: the
   closer phone never renders wider than ~600 device pixels. */
const SCHOOL_KEYS = ["harvard", "yale", "princeton", "penn", "brown", "columbia", "cornell", "dartmouth"];
const realShots = { gyms: {}, vhome: {} };
for (const scr of Object.keys(realShots)) {
  for (const key of SCHOOL_KEYS) {
    const buf = await sharp(`recolored/${scr}-${key}.webp`).resize(720).webp({ quality: 80 }).toBuffer();
    realShots[scr][key] = "data:image/webp;base64," + buf.toString("base64");
  }
}

const story1 = [
  {
    key: "01-gyms", kicker: "01 · Gyms",
    head: "Find every gym on campus.",
    sub: "Opening hours, ratings, the equipment in each room, and how busy it is right now.",
    ann: [{ side: "right", top: 14, text: "Live ratings" }, { side: "left", top: 68, text: "House gyms too" }],
  },
  {
    key: "02-match", kicker: "02 · People", enter: "tab", tap: [37.5, 95.5],
    head: "Find training partners. Make friends.",
    sub: "Browse sorts everyone by how well you fit with them, based on interests, concentration, experience and hours. In Session you pick a time to train and plan directly with people who go at that time, or you post your time on the Buddy Board and see who is interested.",
    ann: [{ side: "right", top: 24, text: "Ranked by real fit" }],
  },
  {
    key: "03-why-you-match", kicker: "03 · Why you match", enter: "zoom", tap: [26, 54],
    head: "View their profile before you plan a session.",
    sub: "Their profile shows their house, their year and a short bio. Under it, Why you match lists what you have in common: the gym you both use, your shared interests, when your free time overlaps, the languages you speak and whether one of you wants a mentor.",
    ann: [{ side: "left", top: 56, text: "Facts, not guesses" }],
  },
  {
    key: "04-plan-a-session", kicker: "04 · Plan", enter: "push", tap: [68, 86.5], pointer: true,
    head: "Plan sessions easily in the chat.",
    sub: "You send a card with the gym, the day and the time, and once the other one accepts it goes to both calendars.",
    ann: [{ side: "right", top: 52, text: "One tap to accept" }],
  },
  {
    // One beat for the whole sheet now — sets at the top, photo and note at
    // the bottom. hold 0.2: it is read before it starts moving.
    key: "tall-logsheet", kicker: "05 · Log", pan: [0, 1], hold: 0.2, side: "left", enter: "push",
    head: "Log it as soon as you finish.",
    sub: "Record your sets and reps easily and attach a photo with your partner that will be stored in your memories.",
    ann: [{ side: "right", top: 26, text: "Set by set" }, { side: "left", top: 78, text: "Photo + note" }],
  },
  {
    // The profile's LOWER half: the session calendar, which the story had
    // never shown. No new capture — tall-profile already carries it.
    key: "tall-profile", kicker: "06 · Calendar", pan: [0.65, 1], hold: 0.15, side: "left", enter: "push", tap: [50, 95],
    head: "Check your month in the session calendar.",
    sub: "Every session you log marks its day and shows what you trained, so you can track your workouts week by week. Tap a day to open it again, and every photo you took is stored in Memories.",
    ann: [{ side: "left", top: 66, text: "Every day you trained" }],
  },
  {
    // The same sheet re-entered at the TOP: the name and the counts the
    // headline reads off, panning down to the leaderboard strip.
    key: "tall-profile", kicker: "07 · Rankings", pan: [0, 0.38], hold: 0.2, side: "left", enter: "dismiss", tap: [50, 95],
    head: "Track your statistics.", headEm: "See how you do in the leaderboards.",
    sub: "Your profile counts the sessions you logged and the partners you trained with. Take part in the college leaderboards and see how you rank on campus, how your house and your year are doing, and who has trained with the most partners.",
    ann: [{ side: "right", top: 60, text: "Where you rank" }],
  },
];

const story2 = [
  {
    // V1 carries the scroll all the way down to the lineup, so V2's headline
    // arrives with the boat almost centred rather than announcing it early.
    key: "tall-vhome", kicker: "V1 · Training plan", pan: [0, 0.5], hold: 0.45,
    head: "Training plan always at hand, always current.",
    sub: "The whole week is clear at a glance. Tap any day to read the workout in full and see the lineups.",
    ann: [{ side: "right", top: 18, text: "Week 7 of 15" }],
  },
  {
    key: "tall-vhome", kicker: "V2 · Lineups", pan: [0.5, 0.8], enter: "none",
    head: "Find your lineup in a second.",
    sub: "Never look through 40 names in an Excel sheet again. Your name pops right in a boat.",
    ann: [{ side: "left", top: 42, text: "You, 3 seat" }],
  },
  {
    // The race and the note used to be a beat each. On a home screen this short
    // they share one window, and no amount of scrolling separates them.
    // `to` past 1: the pan hits the very bottom mid-beat and rests there.
    key: "tall-vhome", kicker: "V3 · Coach's notes", pan: [0.74, 1.2], enter: "none",
    head: "Keep your focus up.",
    sub: "Countdown to the next race and coach's note on what to fix, always on your eyes.",
    ann: [{ side: "right", top: 52, text: "Counting down" }, { side: "left", top: 70, text: "Straight from the coach" }],
  },
  {
    key: "13-varsity-log-list", kicker: "V4 · Log", side: "left", enter: "sheet", tap: [50, 92.7],
    head: "Logging workouts has never been easier.",
    sub: "Log your workout straight from your training plan, scan your erg for instant extraction, add extra workouts.",
    ann: [{ side: "right", top: 16, text: "Your week, at a glance" }, { side: "left", top: 44, text: "Tap to log" }],
  },
  {
    // Logged a workout, so over to the Calendar tab, where it just landed.
    key: "14-varsity-calendar", kicker: "V5 · Calendar", side: "left", enter: "tab", tap: [30.8, 94],
    head: "Keep track of every session.",
    sub: "Each workout you log lands on the calendar by itself. The season builds into a history, with your statistics beside it.",
    ann: [{ side: "right", top: 34, text: "Session dots" }, { side: "left", top: 64, text: "Today" }],
  },
  {
    // The squad board sits between the calendar and the statistics (owner,
    // 2026-09-02). It is a sheet you pull up from the Workouts list, so it
    // arrives as one, off the calendar screen whose tab bar is where the ring
    // presses "Team". Driven capture: see capture-light.mjs.
    key: "15-varsity-board", kicker: "V6 · Squad board", side: "left", enter: "sheet", tap: [69.1, 93.2],
    head: "Every team piece, recorded.",
    sub: "You see how you improved since last time and where you stand in the rankings, with filters for split, time, watts and watts per kilo.",
    ann: [{ side: "right", top: 44, text: "Your place" }, { side: "right", top: 62, text: "Squad avg" }],
  },
  {
    // The board's own close X drops the sheet away and the season is there.
    key: "tall-vprofile", kicker: "V7 · Statistics", pan: [0.06, 0.42], side: "left", enter: "dismiss", tap: [92.4, 20.3],
    head: "See your statistics.",
    sub: "One screen counts your consistency, your hours and your personal bests over eight weeks.",
    ann: [{ side: "right", top: 40, text: "Eight weeks of work" }],
  },
];

/*
  THE COACH SECTION — the third door, after both stories.

  Not an animation and not a closer: it is plain layout, so it is emitted
  natively here rather than given a frame of its own. Ported from the "One
  Coach, Forty Athletes" design piece (kept in mockups/coaches/). That piece
  used Harvard crimson; this uses the page's own --gold, because the pre-login
  page carries no university colour and the console lives inside Varsity Mode.

  Copy is mirrored from lib/landingCopy.ts — the same sync obligation as the
  beats above, until ScrollStory reads its data from there.
*/
const coachSteps = [
  {
    key: "coach-1-create", step: "1 &middot; Create",
    head: "Start with the race.",
    body: "Name the block, set the dates, add the race you&#8217;re pointing at. The whole setup takes <b>one screen and under a minute</b>. The app works out the weeks and starts the countdown your athletes will see.",
    alt: "The new training block form: block name, from and to dates, and an optional goal race with its date",
  },
  {
    key: "coach-2-build", step: "2 &middot; Build",
    head: "Two taps per session.",
    body: "You pick the type, water or erg or weights, then the intensity. Then you tap one of the <b>five workouts this squad actually uses</b> and the session fills itself in. A full training week takes minutes, not an evening.",
    alt: "The session builder: type and intensity pickers, the five most-used workouts as tap-to-fill chips, and a Confirm session button",
  },
  {
    key: "coach-3-plan", step: "3 &middot; Plan",
    head: "Publish the week once.",
    body: "The season is one block of fourteen weeks, counting down to the race. It holds water, erg and weights for every AM and PM, colour-coded by intensity. <b>Publish, and it&#8217;s on every athlete&#8217;s phone.</b> No more screenshots of a spreadsheet in the group chat.",
    alt: "The Training Plan screen: week 6 of the Fall 2026 block, with colour-coded AM and PM sessions for every day",
  },
  {
    key: "coach-4-lineup", step: "4 &middot; Lineup",
    head: "Publish the boats.",
    body: "You seat the boat cox to bow. Port shows red and starboard green, straight from each rower&#8217;s profile, so <b>stroke on strokeside, seven on bowside</b>, the way the boat is actually rigged. One tap and the lineup is on every phone <b>the night before</b>, not shouted across the dock.",
    alt: "The Lineup screen: the 1V eight seated cox to bow, port seats in red and starboard seats in green",
  },
  {
    key: "coach-5-notes", step: "5 &middot; Notes",
    head: "Keep every athlete on track.",
    body: "You leave one short technical note per athlete. It sits on their Home, under their race countdown, until it&#8217;s fixed. Everyone else sees a green <b>&#8220;Good job&#8221;</b>. Forty athletes, one glance, no noise.",
    alt: "The Athlete Notes screen: the roster with a short technical note per athlete, and a green Good job for everyone without one",
  },
];

const coachFacts = [
  ["1 plan &rarr; 40 phones", "Publish once; every athlete&#8217;s Home updates itself."],
  ["Boats, the night before", "Lineups land on phones before anyone reaches the dock."],
  ["The spreadsheet, retired", "Plan, lineups and feedback live in one place, not a group chat."],
];

function renderCoach() {
  return `
<section class="coach" id="coach">
  <div class="coach-head">
    <div class="badge">UNIsport &middot; for coaches &amp; athletic departments</div>
    <p class="lead-in">And for the person who runs the squad &mdash;</p>
    <h2>The Coach&#8217;s <em>Console.</em></h2>
    <p class="sub">Students use the app. <b>Coaches run it.</b> Five screens take a coach from an empty season to a published lineup. The plan,
      the boats and the notes the varsity story above depends on are all built here.
      These are real screens from the console as it works today.</p>
  </div>

  <div class="coach-grid">
    ${coachSteps.map((s) => `
    <article class="coach-step">
      <div class="phone coach-phone">
        <div class="screen">
          <div class="statusbar"><span>9:41</span><i class="island"></i><span>5G</span></div>
          <!-- No loading="lazy": the bytes are already in this document as a data
               URI, so lazy buys no network saving and only delays the decode,
               which shows as a blank white phone as you scroll past. -->
          <img class="shot" src="${shots[s.key]}" alt="${s.alt}" decoding="async" />
          <div class="homebar"><i></i></div>
        </div>
      </div>
      <div>
        <div class="coach-stepno">${s.step}</div>
        <h3>${s.head}</h3>
        <p>${s.body}</p>
      </div>
    </article>`).join("")}
  </div>

  <p class="coach-bridge">Everything the console publishes is the story you just scrolled. The plan lands on their Home, their name goes in the boat, the note sits under their race.</p>
  <p class="coach-bridge-sub">A student who signs up brings one user. A coach who adopts brings the
    whole squad. That&#8217;s why the console exists &mdash; and why it&#8217;s already built.</p>

  <div class="coach-facts">
    ${coachFacts.map(([t, b]) => `<div class="coach-fact"><b>${t}</b><span>${b}</span></div>`).join("")}
  </div>
</section>`;
}

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
function closer(id, file, title, tabs, tabActive, flight) {
  const fl = flight || {};
  let doc = fs.readFileSync("../../webpage/" + file, "utf8");
  const noScroll = "<style>html,body{overflow:hidden!important}</style>";
  doc = doc.includes("</head>") ? doc.replace("</head>", noScroll + "</head>") : noScroll + doc;
  // srcdoc is an HTML attribute: & and " have to be escaped, nothing else.
  const esc = doc.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `
<section class="closer" id="${id}" data-tabs="${tabs}" data-tab-active="${tabActive}"${flight ? ' data-flight="1" data-from="' + fl.from + '" data-from-shot="' + fl.fromShot +
  '" data-to-shot="' + fl.toShot + '"' + (fl.swap === "slide" ? ' data-swap="slide"' : "") +
  (fl.oars ? ' data-oars="1"' : "") + (fl.txt ? ' data-txt="1"' : "") +
  (fl.real ? ' data-real="' + fl.real + '"' : "") : ""}>
  <div class="closer-stick">
    <iframe class="closer-frame" title="${title}" srcdoc="${esc}"></iframe>
  </div>
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
  .copy, .phone-col { transition: transform 0.9s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.4s ease; }
  .rail { transition: opacity 0.4s ease; }
  /* While the phone is in flight the story's words step aside — the phone is
     the one thing carrying over, so it gets the screen to itself. */
  .stage.gone .copy, .stage.gone .rail { opacity: 0; }
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

  /* ── The coach section: plain layout, gold accent, no choreography ── */
  .coach { position: relative; z-index: 1; --sa: var(--gold);
    max-width: 1160px; margin: 0 auto; padding: 96px 28px 30px; }
  .coach-head { display: flex; flex-direction: column; align-items: center; gap: 18px; text-align: center; }
  .coach-head .lead-in { font-family: var(--serif); font-size: clamp(19px, 3vw, 27px); color: var(--text-2); }
  .coach-head h2 {
    font-family: var(--serif); font-weight: 400;
    font-size: clamp(42px, 8vw, 88px); line-height: 0.99; letter-spacing: -0.02em;
    text-wrap: balance; max-width: 14ch;
  }
  .coach-head h2 em { font-style: italic; color: var(--sa); }
  .coach-head .sub {
    color: var(--text-2); font-size: clamp(16px, 2.2vw, 19px); line-height: 1.6;
    max-width: 52ch; text-wrap: balance;
  }
  .coach b { color: var(--text); font-weight: 600; }

  .coach-grid {
    display: flex; flex-wrap: wrap; justify-content: center;
    gap: 60px 44px; margin-top: 48px; align-items: flex-start;
  }
  .coach-step { flex: 0 1 300px; display: flex; flex-direction: column; align-items: center; gap: 22px; text-align: center; }
  /* The story's phone floats on a timer; this one is still — nothing here moves. */
  .coach-phone { width: min(300px, 80vw); animation: none; cursor: default; border-radius: 40px; padding: 9px; }
  .coach-phone .screen { border-radius: 32px; }
  .coach-phone .shot { position: static; width: 100%; height: auto; aspect-ratio: 900 / 1479; }
  .coach-stepno {
    font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em;
    text-transform: uppercase; color: var(--sa);
  }
  .coach-step h3 {
    font-family: var(--serif); font-weight: 400; margin-top: 6px;
    font-size: clamp(26px, 3vw, 34px); line-height: 1.08; letter-spacing: -0.015em; text-wrap: balance;
  }
  .coach-step p { color: var(--text-2); font-size: 15px; line-height: 1.65; max-width: 36ch; margin-top: 10px; }

  .coach-bridge {
    margin: 76px auto 0; max-width: 46ch; text-align: center;
    font-family: var(--serif); font-size: clamp(22px, 3.2vw, 32px);
    line-height: 1.3; letter-spacing: -0.01em; text-wrap: balance;
  }
  .coach-bridge-sub {
    margin: 14px auto 0; max-width: 52ch; text-align: center;
    color: var(--text-2); font-size: 15px; line-height: 1.65;
  }
  .coach-facts { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 56px; }
  .coach-fact {
    border: 1px solid var(--border); border-radius: 16px; background: var(--bg-elevated);
    padding: 22px 20px; text-align: center;
  }
  .coach-fact b {
    font-family: var(--serif); font-weight: 400; font-size: clamp(22px, 2.6vw, 28px);
    letter-spacing: -0.015em; display: block; text-wrap: balance;
  }
  .coach-fact span { color: var(--text-2); font-size: 13px; line-height: 1.55; display: block; margin-top: 7px; }
  @media (max-width: 900px) { .coach-facts { grid-template-columns: 1fr; } .coach { padding-top: 68px; } }

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
  .closer-stick { height: 100%; }
  .closer-frame { display: block; width: 100%; height: 100%; border: 0; transition: opacity 0.45s ease; }
  /* A narrow screen stacks their layout taller than one viewport; the script
     below grows the section to fit rather than clipping it. */
  .closer.tallfit { height: auto; }
  .closer.tallfit .closer-stick { height: auto; }
  .closer.tallfit .closer-frame { height: var(--fit); }
  /* Pinned: a little taller than one screen, so the first wheel-notches after
     landing hold the picture still while the choreography finishes — a small
     cushion, not the old extra screen of dead scrolling. */
  .closer.pinned { height: 135svh; }
  .closer.pinned .closer-stick { position: sticky; top: 0; height: 100svh; }

  /* The phone in flight belongs to the PAGE, not to either section — which is
     the only way it can be on screen continuously across the boundary. */
  .flight {
    position: fixed; left: 0; top: 0; z-index: 6; display: none;
    pointer-events: none; transform-origin: 0 0; will-change: transform;
  }
  .flight.on { display: block; }
  .flight .phone { animation: none; }
  .flight .shot { transition: opacity 0.16s linear; }

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

${closer("closer-colours", "UNIsport Campus Colours.html", "Your campus, your colours", "student", 0, {
  // the profile it was just reading → the Gyms list, swapped inside the pinch
  from: "story1", fromShot: ".shot-frame[data-i='6'] .shot", toShot: ".shot-frame[data-i='0'] .shot",
  // profile → Gyms is a tab switch (Gyms is the leftmost tab), so the screens
  // slide like the varsity cut instead of dissolving
  swap: "slide",
  // the words arrive from the right as the phone lands, and one nudge up
  // plays the whole film backwards
  txt: true,
  // the phone shows the REAL Gyms screen, recolored per school
  real: "gyms",
})}

<div class="statement" id="interlude">
  <p class="lead-in">And if you do sport for the university itself —</p>
  <h1>Varsity <em>Mode.</em></h1>
  <p class="sub">An extra mode for varsity athletes, designed specifically for each college sport.</p>
  <p class="sub">Now available for rowing</p>
  <div class="cue">Keep going</div>
</div>

${renderStory("story2", story2)}

${closer("closer-blades", "Blade Lock Light.html", "Every crew. One system.", "varsity", 0, {
  // the season statistics → back to Varsity Home, as a tab switch; then the
  // oars come out from behind it
  from: "story2", fromShot: ".shot-frame[data-i='5'] .shot", toShot: ".shot-frame[data-i='0'] .shot",
  swap: "slide", oars: true,
  // same cut as the student closer: words from the right, one nudge up reverses
  txt: true,
  // the phone shows the REAL Varsity Home, recolored and renamed per school
  real: "vhome",
})}

<div class="flight" id="flight" aria-hidden="true">
  <div class="phone">
    <div class="screen">
      <div class="statusbar"><span>9:41</span><i class="island"></i><span>5G</span></div>
      <div class="shots"></div>
      <div class="homebar"><i></i></div>
    </div>
  </div>
</div>

${renderCoach()}

<div class="cta">
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
/*
  ARRIVING AT A CLOSER.
  ----------------------------------------------------------------------------
  A closer is a separate document, but a same-origin one, so the page can reach
  in and choreograph it. Three things happen when the reader gets there:

    1. It STARTS FROM THE BEGINNING. Both pieces cycle through campuses/crews on
       their own timer from the moment they load, so by the time anyone scrolled
       down they were several schools in. The frame is reloaded on arrival, so
       the sequence opens on Harvard — the same crimson the phone was wearing a
       moment ago, which is what makes the changing colours read as a change.
    2. The PHONE ARRIVES. It slides in from where the story's phone had been and
       settles into its new position.
    3. The LETTER COMES OUT FROM BEHIND IT — the phone is lifted above the
       letter, so it really is hidden behind it until it swings clear.

  Everything is found by what it looks like, never by class name: the phone by
  its status-bar clock, the letter by being the biggest type on the page. A
  re-export from Claude Design keeps working as long as those hold.
*/
(function () {
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* The REAL screens, one per school, for the closers' phones — the same
     captures the stories fly in with, recolored (and, for the varsity
     header, renamed) per school by recolor-shots.mjs. */
  var REAL_SHOTS = ${JSON.stringify(realShots)};
  var SCHOOL_KEYS = ${JSON.stringify(SCHOOL_KEYS)};

  // The app's own bottom tab bar, which the design pieces don't draw.
  var TABS = {
    student: [
      ["Gyms", "M4 9h2v6H4zM18 9h2v6h-2zM6 11h12v2H6z"],
      ["Match", "M12 20s-7-4.5-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.5-7 9-7 9z"],
      ["Messages", "M4 5h16v10H8l-4 4z"],
      ["Profile", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6"],
    ],
    varsity: [
      ["Home", "M4 11l8-6 8 6v8h-5v-5H9v5H4z"],
      ["Calendar", "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"],
      ["", ""], // the centre action button
      ["Team", "M9 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 19c0-3 3-4.5 6-4.5S15 16 15 19M17 10a2.5 2.5 0 1 0 0-5M16 14c3 0 5 1.5 5 4"],
      ["Profile", "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c0-4 4-6 8-6s8 2 8 6"],
    ],
  };

  /* The real screen inside a closer's phone: the same statusbar / capture /
     gesture-bar sandwich the flying phone is built from, scaled to this
     phone's screen. Two stacked images, so a school change is a crossfade. */
  function buildRealShot(d, screen, shell, kind) {
    if (screen.querySelector(".__rs")) return;
    var w = screen.getBoundingClientRect().width || 300;
    var k = w / 338;   // the story phone's screen is the size reference
    var rs = d.createElement("div");
    rs.className = "__rs";
    rs.innerHTML =
      '<div class="__rsb" style="padding:' + (12 * k) + 'px ' + (22 * k) + 'px ' + (8 * k) + 'px;' +
        'font-family:ui-monospace,Consolas,monospace;font-size:' + (12 * k) + 'px">' +
        '<span>9:41</span><i class="__rsi" style="width:' + (84 * k) + 'px;height:' + (22 * k) + 'px"></i>' +
        '<span style="font-size:' + (11 * k) + 'px;color:#9b968c">5G</span></div>' +
      '<div class="__rsimg"><img class="on" alt=""><img alt=""></div>' +
      '<div class="__rhb" style="height:' + (24 * k) + 'px"><i style="width:38%;height:' + (4 * k) + 'px"></i></div>';
    screen.appendChild(rs);
    var imgs = rs.querySelectorAll("img");
    imgs[0].src = REAL_SHOTS[kind].harvard;
    imgs[1].src = REAL_SHOTS[kind].harvard;
    d.__realKind = kind;
    d.__realSchool = "harvard";
  }

  /* Which school the piece is showing right now — its logic instance (found
     once through the react internals, then remembered) carries the index:
     the wheel calls it active, the letter piece calls it idx. Mapped through
     the piece's OWN school list, so the order can never drift from ours. */
  function currentSchoolKey(d) {
    try {
      var L = d.__logicRef;
      if (!L) {
        var all = [].slice.call(d.querySelectorAll("*"));
        var root = null, key = null;
        for (var i = 0; i < all.length && !root; i++) {
          var ks = Object.getOwnPropertyNames(all[i]);
          for (var j = 0; j < ks.length; j++) {
            if (ks[j].indexOf("__reactContainer$") === 0) { root = all[i]; key = ks[j]; break; }
          }
        }
        if (!root) return null;
        var q = [root[key]], seen = 0;
        while (q.length && seen < 20000) {
          var fib = q.shift(); seen++;
          if (!fib) continue;
          var sn = fib.stateNode;
          if (sn && sn.logic && sn.logic.state &&
              (typeof sn.logic.state.active === "number" || typeof sn.logic.state.idx === "number")) {
            L = d.__logicRef = sn.logic;
            break;
          }
          if (fib.child) q.push(fib.child);
          if (fib.sibling) q.push(fib.sibling);
        }
        if (!L) return null;
      }
      var n = typeof L.state.active === "number" ? L.state.active : L.state.idx;
      var arr = L.schools || L.SCHOOLS;
      if (arr && arr[n] && arr[n].n) return String(arr[n].n).toLowerCase();
      return SCHOOL_KEYS[n] || null;
    } catch (e) { return null; }
  }

  function setRealShot(d, key, instant) {
    var rs = d.querySelector(".__rs");
    if (!rs || !REAL_SHOTS[d.__realKind] || d.__realSchool === key) return;
    d.__realSchool = key;
    var imgs = rs.querySelectorAll("img");
    var front = imgs[0].classList.contains("on") ? imgs[0] : imgs[1];
    var back = front === imgs[0] ? imgs[1] : imgs[0];
    if (instant) {
      front.src = REAL_SHOTS[d.__realKind][key];
      back.src = REAL_SHOTS[d.__realKind][key];
      return;
    }
    back.src = REAL_SHOTS[d.__realKind][key];
    back.classList.add("on");
    front.classList.remove("on");
  }

  function followSchool(d) {
    if (!d.__realKind) return;
    var key = currentSchoolKey(d);
    if (key && REAL_SHOTS[d.__realKind][key]) setRealShot(d, key, false);
  }

  function buildTabs(d, kind, active) {
    var items = TABS[kind];
    var bar = d.createElement("div");
    bar.className = "__tabs";
    bar.innerHTML = items.map(function (t, i) {
      if (!t[0]) return '<span class="__plus"><svg viewBox="0 0 24 24" style="width:48%;height:48%" ' +
        'fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg></span>';
      return '<span class="__tab' + (i === active ? " on" : "") + '">' +
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
        'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="' + t[1] + '"/></svg>' +
        "<b>" + t[0] + "</b></span>";
    }).join("");
    return bar;
  }

  function findPhone(d) {
    var win = d.defaultView;
    if (!win) return null;
    var clock = [].slice.call(d.querySelectorAll("*")).filter(function (e) {
      return e.children.length === 0 && e.textContent.trim() === "9:41";
    })[0];
    if (!clock) return null;
    var el = clock, shell = null;
    while (el && el !== d.body) {
      var cs = win.getComputedStyle(el), r = el.getBoundingClientRect();
      if (parseFloat(cs.borderTopLeftRadius) > 20 && r.width > 200) shell = el;
      el = el.parentElement;
    }
    return shell;
  }

  // The letter is simply the largest type in the document; the block that holds
  // it (letter + wordmark under it) is the nearest ancestor that is taller.
  function findLetter(d) {
    var win = d.defaultView;
    if (!win) return null;
    var best = null, size = 0;
    [].slice.call(d.querySelectorAll("span,div,h1,h2,p")).forEach(function (e) {
      if (e.children.length) return;
      var fs = parseFloat(win.getComputedStyle(e).fontSize) || 0;
      if (fs > size) { size = fs; best = e; }
    });
    if (!best || size < 90) return null;
    var block = best, h = best.getBoundingClientRect().height;
    for (var i = 0; i < 3 && block.parentElement; i++) {
      var p = block.parentElement;
      if (p.getBoundingClientRect().height > h + 25) { block = p; break; }
      block = p;
    }
    return block;
  }

  function prime(sec, f) {
    var d = f.contentDocument;
    if (!d || !d.body) return;
    /* Once per document. Two whenReady chains can both land here (the
       frame's load event, and an arrival that found the closer unprimed —
       a reload with the scroll restored at it); the second used to re-hide
       a phone the first had already revealed. */
    if (d.__primed) return;
    d.__primed = true;
    var kind = sec.getAttribute("data-tabs");
    var activeTab = +sec.getAttribute("data-tab-active");

    var st = d.createElement("style");
    st.textContent =
      '.__ph{position:relative;z-index:3;transition:transform .95s cubic-bezier(.2,.85,.25,1)}' +
      '.__ph.pre{transform:translateX(-110px) scale(1.16)}' +
      // While the page's own phone is flying in, theirs must not be there —
      // two phones in the same place is the whole thing we are avoiding.
      '.__ph.hide{visibility:hidden}' +
      // The oars are collapsed onto the phone and then let go. translate/scale
      // are their OWN properties, not transform: the app rewrites each oar's
      // inline transform on every cycle, and these compose with it instead of
      // being trampled by it.
      // transform stays in this list on purpose: the app animates the oars by
      // transform, and a transition rule that omitted it replaced theirs — which
      // is what made the rotation jump instead of sweeping.
      '.__oar{transition:transform .8s cubic-bezier(.65,0,.35,1),translate .8s cubic-bezier(.25,.9,.3,1),scale .8s cubic-bezier(.25,.9,.3,1),opacity .45s ease}' +
      '.__oar.pre{opacity:0}' +
      '.__lt{position:relative;z-index:1;transition:opacity .5s ease .5s,transform 1s cubic-bezier(.2,.85,.25,1) .5s}' +
      '.__lt.pre{opacity:0;transform:translateX(-215px) scale(.45)}' +
      // After a flight the letter and the words move as one: no waiting beat.
      // And going backwards it swings home the same way it came out — the
      // entrance curve reversed, opacity trailing so it fades in behind the
      // phone rather than in the open.
      '.__lt.now{transition:opacity .5s ease,transform 1s cubic-bezier(.2,.85,.25,1)}' +
      '.__lt.rev{transition:opacity .5s ease .5s,transform 1s cubic-bezier(.75,0,.8,.15)}' +
      // The closer's words: parked off to the right, so they can arrive
      // right-to-left as the phone sets down. translate, not transform — same
      // reason as the oars: nothing of theirs gets trampled.
      '.__hd{transition:translate .6s cubic-bezier(.25,.8,.3,1),opacity .45s ease}' +
      '.__hd.pre{translate:52vw 0;opacity:0}' +
      // The crew's name under the phone: held back until the oars are in place.
      '.__ft{transition:opacity .5s ease}' +
      '.__ft.pre{opacity:0}' +
      // The REAL screen, laid over the piece's drawn one: status bar, the
      // recolored capture, gesture bar — the same sandwich the flying phone
      // is made of, so the landing is pixel-for-pixel.
      '.__rs{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;background:#fff}' +
      '.__rs .__rsb{display:flex;justify-content:space-between;align-items:center;background:#fff;color:#16150f}' +
      '.__rs .__rsi{background:#161616;border:1px solid #222;border-radius:999px}' +
      '.__rs .__rsimg{position:relative;flex:1;overflow:hidden;background:#fff}' +
      '.__rs .__rsimg img{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;opacity:0;transition:opacity .45s ease}' +
      '.__rs .__rsimg img.on{opacity:1}' +
      '.__rs .__rhb{display:flex;align-items:center;justify-content:center;background:#fff}' +
      '.__rs .__rhb i{background:#cfccc6;border-radius:999px;display:block}' +
      '.__tabs{position:absolute;left:0;right:0;bottom:0;height:12%;display:flex;align-items:center;' +
      'justify-content:space-around;background:#fff;border-top:1px solid #e7e4df;padding-bottom:1.6%;z-index:5}' +
      '.__tab{display:flex;flex-direction:column;align-items:center;gap:2px;color:#9b968c;line-height:1}' +
      '.__tab b{font:600 6.5px/1 ui-sans-serif,system-ui,sans-serif;letter-spacing:.02em}' +
      '.__tab.on{color:var(--__accent,#a51c30)}' +
      // The blades carry a drop-shadow glow the piece re-applies on every
      // crew change — a prop write does not survive its re-renders, but a
      // stylesheet with !important outranks the inline style forever. Each
      // blade is a button labelled "<crew> Rowing"; nothing else matches.
      'button[aria-label$=" Rowing"]{filter:none!important}' +
      // The log button, to the REAL app's proportions: ~1/6 of the screen
      // wide, its centre riding the bar's top edge, a white halo under it.
      '.__plus{width:16%;aspect-ratio:1;border-radius:50%;background:var(--__accent,#a51c30);color:#fff;' +
      'display:flex;align-items:center;justify-content:center;margin-top:-8%;' +
      'box-shadow:0 0 0 5px rgba(255,255,255,.92),0 4px 10px rgba(0,0,0,.25)}';
    d.head.appendChild(st);

    var shell = findPhone(d);
    if (shell) {
      shell.classList.add("__ph");
      if (sec.getAttribute("data-flight") && !reduce) shell.classList.add("hide");
      else if (!reduce) shell.classList.add("pre");
      // the screen is the padded inner box; the bar belongs inside it
      var screen = shell.querySelector("*");
      if (screen) {
        var cs = d.defaultView.getComputedStyle(screen);
        if (cs.position === "static") screen.style.position = "relative";
        screen.style.overflow = "hidden";
        // the REAL screen covers the piece's drawn one; the Gyms capture
        // carries the app's own tab bar, so no bar is drawn over it
        var realKind = sec.getAttribute("data-real");
        if (realKind) buildRealShot(d, screen, shell, realKind);
        if (!screen.querySelector(".__tabs") && realKind !== "gyms") {
          screen.appendChild(buildTabs(d, kind, activeTab));
        }
      }
    }
    var letter = findLetter(d);
    if (letter) {
      letter.classList.add("__lt");
      if (!reduce) letter.classList.add("pre");
    }

    /* The closer's words: every outermost block of text standing fully above
       the phone. Found by geometry, like everything else in these documents —
       their class names are minified noise. */
    if (sec.getAttribute("data-txt") && shell && !reduce) {
      var pr = shell.getBoundingClientRect();
      var blocks = [].slice.call(d.body.querySelectorAll("*")).filter(function (e) {
        if (letter && (e === letter || letter.contains(e) || e.contains(letter))) return false;
        if (e === shell || shell.contains(e) || e.contains(shell)) return false;
        var r = e.getBoundingClientRect();
        return r.height > 0 && r.bottom <= pr.top + 2 && e.textContent && e.textContent.trim();
      });
      blocks.filter(function (e) {
        return !blocks.some(function (o) { return o !== e && o.contains(e); });
      }).forEach(function (e) { e.classList.add("__hd", "pre"); });
    }

    /* The crew's name under the phone (blades piece only): found the same
       way — outermost text standing fully below the phone — and held back
       until the oars are in their places. */
    if (sec.getAttribute("data-oars") && shell && !reduce) {
      var pb = shell.getBoundingClientRect().bottom;
      var fblocks = [].slice.call(d.body.querySelectorAll("*")).filter(function (e) {
        if (e === shell || shell.contains(e) || e.contains(shell)) return false;
        var r = e.getBoundingClientRect();
        return r.height > 0 && r.top >= pb - 2 && e.textContent && e.textContent.trim();
      });
      fblocks.filter(function (e) {
        return !fblocks.some(function (o) { return o !== e && o.contains(e); });
      }).forEach(function (e) { e.classList.add("__ft", "pre"); });
    }

    if (shell) parkOars(sec, d, shell);

    // The accent follows whichever school/crew is showing: the largest piece of
    // type that carries an actual colour (greys and near-whites are chrome).
    function accent() {
      var win = d.defaultView;
      if (!win) return;
      var best = "", size = 0;
      [].slice.call(d.querySelectorAll("span,div,b,em,h1,h2,p")).forEach(function (e) {
        if (e.children.length || !e.textContent.trim()) return;
        var cs = win.getComputedStyle(e);
        // No regex here: this whole script is emitted from a template literal,
        // which eats backslashes — a character class would arrive unescaped.
        var open = cs.color.indexOf("(");
        if (open < 0) return;
        var parts = cs.color.slice(open + 1).split(")")[0].split(",");
        var r = parseFloat(parts[0]), g = parseFloat(parts[1]), bl = parseFloat(parts[2]);
        if (isNaN(r) || isNaN(g) || isNaN(bl)) return;
        if (Math.max(r, g, bl) - Math.min(r, g, bl) < 40) return;
        var fs = parseFloat(cs.fontSize) || 0;
        if (fs > size) { size = fs; best = cs.color; }
      });
      if (best) d.documentElement.style.setProperty("--__accent", best);
    }
    accent();
    if (sec.__accentTimer) clearInterval(sec.__accentTimer);
    sec.__accentTimer = setInterval(function () { accent(); followSchool(d); }, 400);
  }

  /* Blade Lock's oars: every tall, narrow span holding an SVG that isn't part
     of the phone. Parked ON the phone, shrunk to nothing, so they can come back
     out from behind it. translate/scale are used rather than transform because
     the app rewrites each oar's inline transform on every change. */
  function parkOars(sec, d, shell) {
    if (!sec.getAttribute("data-oars") || reduce) return;
    var pr = shell.getBoundingClientRect();
    var pcx = pr.left + pr.width / 2, pcy = pr.top + pr.height / 2;
    [].slice.call(d.querySelectorAll("span")).forEach(function (o) {
      var kid = o.firstElementChild;
      if (!kid || kid.tagName.toLowerCase() !== "svg") return;
      var r = o.getBoundingClientRect();
      if (r.height < 90 || r.width > 130 || shell.contains(o)) return;
      o.classList.add("__oar", "pre");
      // remembered so the bundle can be formed without re-measuring later,
      // once they are already displaced
      o.__dx = pcx - (r.left + r.width / 2);
      o.__dy = pcy - (r.top + r.height / 2);
      o.style.translate = o.__dx + "px " + o.__dy + "px";
      o.style.scale = "0.3";
    });
  }

  /* Both pieces cycle on their own timer, and clicking one of their controls
     both jumps to that school AND stops that timer — so the page clicks the
     first one (Harvard) as the reader arrives, and then paces the rotation
     itself. That is what makes the sequence open on the crimson the phone was
     already wearing, every time. */
  function toHarvard(f) {
    var d = f.contentDocument;
    var btns = d ? [].slice.call(d.querySelectorAll("button")) : [];
    if (btns.length > 2) { btns[0].click(); return true; }
    return false;
  }
  function spin(sec, f, delay) {
    if (sec.__spin) { clearInterval(sec.__spin); sec.__spin = null; }
    if (reduce) return;
    sec.__spinStart = setTimeout(function () {
      var i = 0;
      sec.__spin = setInterval(function () {
        var d = f.contentDocument;
        var btns = d ? [].slice.call(d.querySelectorAll("button")) : [];
        if (!btns.length) { clearInterval(sec.__spin); return; }
        i = (i + 1) % btns.length;
        btns[i].click();
      }, 2400);
    }, delay || 0);
  }
  function rewind(sec, f) {
    if (sec.__spin) { clearInterval(sec.__spin); sec.__spin = null; }
    if (sec.__spinStart) { clearTimeout(sec.__spinStart); sec.__spinStart = null; }
    var d = f.contentDocument;
    if (!d) return;
    var lt = d.querySelector(".__lt"); if (lt && !reduce) { lt.classList.remove("now"); lt.classList.remove("rev"); lt.classList.add("pre"); }
    var shell = d.querySelector(".__ph");
    if (shell && sec.getAttribute("data-flight") && !reduce) shell.classList.add("hide");
    if (shell) parkOars(sec, d, shell);
    if (!reduce) [].slice.call(d.querySelectorAll(".__hd")).forEach(function (e) { e.classList.add("pre"); });
    if (!reduce) [].slice.call(d.querySelectorAll(".__ft")).forEach(function (e) { e.classList.add("pre"); });
    setRealShot(d, "harvard", true);   // back to the colour the flight wears
    // and the story gets its words back, wherever the reader left it
    var src = sec.getAttribute("data-from");
    var stg = src && document.querySelector("#" + src + " .stage");
    if (stg) stg.classList.remove("gone");
    sec.__flown = false;
  }

  function play(f) {
    var d = f.contentDocument;
    if (!d) return;
    [".__ph", ".__lt"].forEach(function (sel, i) {
      var el = d.querySelector(sel);
      if (el) setTimeout(function () { el.classList.remove("pre"); }, i * 260);
    });
  }

  /* Where each oar goes for the small formation: the WHOLE wheel compressed
     toward its own centre — the same circle, closer together (F), smaller
     (K) — stood behind the phone with Harvard's blade at the middle, peeking
     ~90px above it. The pose is MEASURED, not predicted: our scale composes
     with the wheel transform the app has already put on each oar. So:
     transitions off, stand each oar at translate 0 / scale K, read where
     that actually puts it, derive targets — then one correction round,
     because the piece styles its blades by depth and pushes whatever we ask
     for outward. All in one synchronous pass; nothing is painted. */
  function oarPose(d, shell, oars) {
    var K = 0.4, F = 0.3;
    var pr = shell.getBoundingClientRect();
    var pcx = pr.left + pr.width / 2;
    var saved = oars.map(function (o) {
      var s = { t: o.style.translate, k: o.style.scale, tr: o.style.transition };
      o.style.transition = "none";
      o.style.translate = "0px 0px";
      o.style.scale = String(K);
      return s;
    });
    var rects = oars.map(function (o) { return o.getBoundingClientRect(); });
    var wx = 0, wy = 0;
    rects.forEach(function (r) { wx += r.left + r.width / 2; wy += r.top + r.height / 2; });
    wx /= rects.length; wy /= rects.length;
    var minis = rects.map(function (r) {
      return { x: wx + (r.left + r.width / 2 - wx) * F,
               y: wy + (r.top + r.height / 2 - wy) * F,
               h: r.height };
    });
    var minTop = Infinity;
    minis.forEach(function (m) { minTop = Math.min(minTop, m.y - m.h / 2); });
    var dx0 = pcx - wx, dy0 = (pr.top - 90) - minTop;
    var want = minis.map(function (m) { return { x: m.x + dx0, y: m.y + dy0 }; });
    var targets = want.map(function (w, i) {
      var r = rects[i];
      return { x: w.x - (r.left + r.width / 2), y: w.y - (r.top + r.height / 2) };
    });
    oars.forEach(function (o, i) { o.style.translate = targets[i].x + "px " + targets[i].y + "px"; });
    oars.forEach(function (o, i) {
      var r = o.getBoundingClientRect();
      targets[i].x += want[i].x - (r.left + r.width / 2);
      targets[i].y += want[i].y - (r.top + r.height / 2);
    });
    oars.forEach(function (o, i) {          // back where they were, unpainted
      o.style.translate = saved[i].t;
      o.style.scale = saved[i].k;
      o.style.transition = saved[i].tr;
    });
    void d.body.offsetWidth;
    return targets;
  }

  // The oars, as drawn: hidden behind the phone; when it settles, just the
  // BLADES rise into view above it — close together, already in formation —
  // hold a beat, then spread out to their places in the arc.
  function playOars(f, delay) {
    var d = f.contentDocument;
    if (!d) return;
    var oars = [].slice.call(d.querySelectorAll(".__oar"));
    var shell = d.querySelector(".__ph");
    if (!oars.length || !shell) return;

    setTimeout(function () {
      var targets = oarPose(d, shell, oars);
      oars.forEach(function (o, i) {        // transitions on: rise to the pose
        o.style.transition = "";
        o.classList.remove("pre");
        o.style.translate = targets[i].x + "px " + targets[i].y + "px";
        o.style.scale = "0.4";
      });
    }, delay || 0);

    // The rise takes .8s; the formation then HOLDS for a beat — the drawing's
    // "oars start here" is a pose, not a waypoint — before spreading out.
    setTimeout(function () {
      // The wheel is released the moment the spread BEGINS: the blades glide
      // out — still small — onto a wheel already turning, and arrive into
      // motion instead of standing still and then lurching into it.
      unpin(f, 0);
      oars.forEach(function (o) {
        /* transform comes OUT of the transition list here: the wheel writes
           it every frame now, and a transition would trail it. translate and
           scale still glide the blade into its socket on the moving wheel. */
        o.style.transition = "translate .8s cubic-bezier(.25,.9,.3,1), scale .8s cubic-bezier(.25,.9,.3,1), opacity .45s ease";
        o.classList.remove("pre");
        o.style.translate = "";
        o.style.scale = "";
      });
      // The crew's name appears only once the oars are in their places…
      setTimeout(function () {
        [].slice.call(d.querySelectorAll(".__ft")).forEach(function (e) { e.classList.remove("pre"); });
      }, 850);
      // …and the oars are handed back entirely, our transition override with them.
      setTimeout(function () {
        oars.forEach(function (o) { o.classList.remove("__oar"); o.style.transition = ""; });
      }, 950);
    }, (delay || 0) + 1150);
  }

  /* The wheel of oars spins CONTINUOUSLY in the design piece; a click pins it
     on one crew. Arrival clicks Harvard so the phone and the centre blade
     agree — and once the oars are out, the pin is lifted through the piece's
     own state (reached via the react internals: the only other unpin it owns
     is an IntersectionObserver that would need the whole document hidden) and
     the wheel simply carries on turning, smoothly, the way it does on its
     own. No more pacing it with clicks — that is what jumped. */
  function wheelLogic(f) {
    try {
      var d = f.contentDocument;
      if (!d) return null;
      var all = [].slice.call(d.querySelectorAll("*"));
      var root = null, key = null;
      for (var i = 0; i < all.length && !root; i++) {
        var ks = Object.getOwnPropertyNames(all[i]);
        for (var j = 0; j < ks.length; j++) {
          if (ks[j].indexOf("__reactContainer$") === 0) { root = all[i]; key = ks[j]; break; }
        }
      }
      if (!root) return null;
      var q = [root[key]], seen = 0;
      while (q.length && seen < 20000) {
        var fib = q.shift(); seen++;
        if (!fib) continue;
        var sn = fib.stateNode;
        if (sn && sn.logic && ("rot" in sn.logic) && sn.logic.state &&
            typeof sn.logic.state.pinned === "boolean") return sn.logic;
        if (fib.child) q.push(fib.child);
        if (fib.sibling) q.push(fib.sibling);
      }
    } catch (e) {}
    return null;
  }
  function unpin(f, delay) {
    setTimeout(function () {
      var L = wheelLogic(f);
      if (L) L.setState({ pinned: false });
    }, delay || 0);
  }
  /* The oars, called back: the wheel is pinned where it stands, the blades
     gather off the arc into the small formation above the phone — the same
     pose they arrived in — and then sink down behind it. The spread, played
     backwards. */
  function gatherOars(sec, f) {
    var d = f.contentDocument;
    var shell = d && d.querySelector(".__ph");
    if (!shell) return;
    var pr = shell.getBoundingClientRect();
    var pcx = pr.left + pr.width / 2, pcy = pr.top + pr.height / 2;
    var oars = [];
    [].slice.call(d.querySelectorAll("span")).forEach(function (o) {
      var kid = o.firstElementChild;
      if (!kid || kid.tagName.toLowerCase() !== "svg") return;
      var r = o.getBoundingClientRect();
      if (r.height < 90 || r.width > 130 || shell.contains(o)) return;
      oars.push(o);
    });
    if (!oars.length) return;

    // hold the wheel still on whichever crew it is showing — the gather
    // needs a formation that stands where it was measured
    var L = wheelLogic(f);
    if (L && L.state && !L.state.pinned) {
      var btns = [].slice.call(d.querySelectorAll("button"));
      if (btns[L.state.active]) btns[L.state.active].click();
    }

    oars.forEach(function (o) {
      o.classList.add("__oar");
      // transform stays out of the list: the wheel still owns it
      o.style.transition = "translate .6s cubic-bezier(.25,.9,.3,1), scale .6s cubic-bezier(.25,.9,.3,1), opacity .45s ease";
    });
    var targets = oarPose(d, shell, oars);
    oars.forEach(function (o, i) {
      o.style.translate = targets[i].x + "px " + targets[i].y + "px";
      o.style.scale = "0.4";
    });
    // …and down behind the phone, fading as they go
    setTimeout(function () {
      oars.forEach(function (o) {
        var parts = (o.style.translate || "0px 0px").split(" ");
        var tx = parseFloat(parts[0]) || 0, ty = parseFloat(parts[1]) || 0;
        var r = o.getBoundingClientRect();
        o.style.translate = (tx + (pcx - (r.left + r.width / 2))) + "px " +
                            (ty + (pcy - (r.top + r.height / 2))) + "px";
        o.style.scale = "0.3";
        o.classList.add("pre");
      });
    }, 650);
  }

  /* THE WAY BACK, first act: everything the arrival brought out goes back in,
     the same way it came. The words leave to the right, the crew's name goes
     first; the letter swings home behind the phone, or the oars gather and
     sink. The page is held still for the length of it — the flight home
     takes over from here. */
  function retractCloser(sec, f, done) {
    var d = f.contentDocument;
    if (!d) { done(); return; }
    if (sec.__spin) { clearInterval(sec.__spin); sec.__spin = null; }
    if (sec.__spinStart) { clearTimeout(sec.__spinStart); sec.__spinStart = null; }

    [].slice.call(d.querySelectorAll(".__hd")).forEach(function (e) { e.classList.add("pre"); });
    [].slice.call(d.querySelectorAll(".__ft")).forEach(function (e) { e.classList.add("pre"); });

    var wait;
    if (sec.getAttribute("data-oars")) {
      wait = 1200;   // gather (650) + sink (550)
      gatherOars(sec, f);
    } else {
      wait = 1000;   // the letter's full swing home
      var lt = d.querySelector(".__lt");
      if (lt) { lt.classList.remove("now"); lt.classList.add("rev"); lt.classList.add("pre"); }
    }

    /* Wherever in the pin the reader is when they turn back — the cushion
       shows the same held picture everywhere — the page first glides to the
       nearest properly framed spot, then holds there for the length of the
       act. One animation, always from a clean frame. */
    var y0 = window.scrollY, holding = true, over = false;
    var secDocTop = y0 + sec.getBoundingClientRect().top;
    var pinEnd = secDocTop + Math.max(0, sec.offsetHeight - window.innerHeight);
    var yT = Math.max(secDocTop, Math.min(y0, pinEnd));
    var g0 = performance.now(), G = 240;
    function rel(ev) { if (ev && ev.type === "wheel" && ev.deltaY < 0) return; holding = false; }
    window.addEventListener("wheel", rel, { passive: true });
    window.addEventListener("touchmove", rel, { passive: true });
    window.addEventListener("keydown", rel);
    d.addEventListener("wheel", rel, { passive: true });   // the wheel is over the frame
    (function hold(now) {
      if (over || !holding) return;
      var g = Math.min(1, ((now || performance.now()) - g0) / G);
      var e = 1 - Math.pow(1 - g, 3);
      window.scrollTo(0, y0 + (yT - y0) * e);
      requestAnimationFrame(hold);
    })();
    setTimeout(function () {
      over = true;
      window.removeEventListener("wheel", rel);
      window.removeEventListener("touchmove", rel);
      window.removeEventListener("keydown", rel);
      d.removeEventListener("wheel", rel);
      done();
    }, wait);
  }

  // Just the letter — used after a flight, where the phone is already home.
  // .now drops the built-in waiting beat, so it moves WITH the words.
  function playLetter(f, delay) {
    var d = f.contentDocument;
    if (!d) return;
    var el = d.querySelector(".__lt");
    if (el) setTimeout(function () {
      el.classList.remove("rev");
      el.classList.add("now");
      el.classList.remove("pre");
    }, delay || 0);
  }

  // The closer's words, in from the right — at the same moment as the letter.
  function playText(f, delay) {
    var d = f.contentDocument;
    if (!d) return;
    [].slice.call(d.querySelectorAll(".__hd")).forEach(function (el) {
      setTimeout(function () { el.classList.remove("pre"); }, delay || 0);
    });
  }

  /* ── THE FLIGHT ──────────────────────────────────────────────────────────
     The story's phone and the closer's phone are two different phones in two
     different documents, which is why the old version cut. So neither is used
     for the move: a third phone, belonging to the page, takes off from exactly
     where the story's phone is, flies across the boundary, and lands exactly on
     the closer's phone — which has been invisible the whole time and is simply
     switched on underneath at the end.

     The path leaves downward and arrives downward (an S — down, right, down),
     and halfway it collapses almost to nothing before opening back out. The
     screen changes at that pinch, so it comes out of it showing Gyms.        */
  var flight = document.getElementById("flight");
  var flightPhone = flight && flight.querySelector(".phone");
  var flightShots = flight && flight.querySelector(".shots");

  function rectOfStoryPhone(id) {
    var p = document.querySelector("#" + id + " .phone");
    return p ? p.getBoundingClientRect() : null;
  }
  function rectOfCloserPhone(f) {
    var d = f.contentDocument;
    if (!d) return null;
    var shell = d.querySelector(".__ph") || findPhone(d);
    if (!shell) return null;
    var ir = f.getBoundingClientRect(), sr = shell.getBoundingClientRect();
    return { x: ir.left + sr.left + sr.width / 2, y: ir.top + sr.top + sr.height / 2, w: sr.width };
  }

  function runFlight(sec, f, done) {
    var src = sec.getAttribute("data-from") || "story1";
    var slide = sec.getAttribute("data-swap") === "slide";
    var start = rectOfStoryPhone(src), target = rectOfCloserPhone(f);
    if (!flight || !start || !target || start.width < 10) { done(); return; }

    // Take the story's own screens with it: cloned, so nothing is downloaded
    // or embedded twice, and the profile keeps the exact scroll it ended on.
    var fromShot = document.querySelector("#" + src + " " + sec.getAttribute("data-from-shot"));
    var toShot = document.querySelector("#" + src + " " + sec.getAttribute("data-to-shot"));
    if (!fromShot || !toShot) { done(); return; }
    flightShots.innerHTML = "";
    var a = fromShot.cloneNode(true), b = toShot.cloneNode(true);
    b.style.transform = "translateY(0px)";   // the new screen starts at its top
    a.style.opacity = "1";
    if (slide) {
      // Profile → Home is a tab switch: the old screen leaves to the right and
      // the new one comes in from the left. translate again, so the strip's own
      // transform (which does the vertical panning) survives.
      b.style.opacity = "1";
      a.style.transition = b.style.transition = "translate .5s cubic-bezier(.4,0,.2,1)";
      b.style.translate = "-110% 0";
    } else {
      b.style.opacity = "0";
    }
    flightShots.appendChild(a); flightShots.appendChild(b);

    flightPhone.style.width = start.width + "px";
    flight.classList.add("on");
    var box = flight.getBoundingClientRect();
    var w0 = box.width, h0 = box.height;

    // hide the story's phone: there is only ever one on screen
    var col = document.querySelector("#" + src + " .phone-col");
    if (col) col.style.visibility = "hidden";
    // …and its words step aside: the phone is the whole story now
    var stg = document.querySelector("#" + src + " .stage");
    if (stg) stg.classList.add("gone");
    sec.__flying = true;

    var A = { x: start.left + start.width / 2, y: start.top + start.height / 2, w: start.width };

    /* Where the closer's phone will be ONCE PINNED. Measured inside the frame,
       whose top is 0 at that point — so these are the viewport coordinates the
       phone has to land on, known before the section has even got there. */
    var idoc = f.contentDocument;
    var ishell = idoc && (idoc.querySelector(".__ph") || findPhone(idoc));
    var ir = ishell && ishell.getBoundingClientRect();
    var B = ir ? { x: ir.left + ir.width / 2, y: ir.top + ir.height / 2, w: ir.width }
               : { x: target.x, y: target.y, w: target.w };
    var t0 = performance.now(), DUR = 1500, swapped = false;

    /* Two kinds of move. The camera-follow (Blade Lock, below) walks the page
       behind the phone. The IN-PLACE CUT (data-txt) never shows the page
       moving at all: the world is held still and fades to black around the
       phone, the page is cut to the new section underneath while nothing but
       the phone is visible, and the phone then glides the short distance into
       its final place. The new section builds itself around it. */
    var still = !!sec.getAttribute("data-txt");
    var JUMP = 0.32, jumped = false;

    /* The move and the page arrive together. Triggered on its own the phone
       could land before the section had finished coming up, so the same easing
       that flies the phone also carries the page the rest of the way to the
       pinned position — "scroll a little and it does the whole thing".
       The moment the reader touches the wheel, the page is theirs again. */
    var scrollFrom = window.scrollY;
    var scrollTo = scrollFrom + sec.getBoundingClientRect().top;
    var driving = true;
    // A wheel in the SAME direction is the reader pushing the move along, not
    // asking for the page back — only the opposite direction releases it.
    // (Trackpads trail inertia events; without this, the gesture that starts
    // the flight would also cancel it.)
    function release(ev) { if (ev && ev.type === "wheel" && ev.deltaY > 0) return; driving = false; }
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);
    if (idoc) idoc.addEventListener("wheel", release, { passive: true });   // post-cut, the frame is under the wheel

    function step(now) {
      var t = Math.min(1, (now - t0) / DUR);
      var e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      var px, py, sc, prog;

      if (still) {
        /* THE IN-PLACE CUT. The page is HELD — no travel to watch. While the
           story fades around the phone, nothing moves; then the scroll is cut
           to the pinned closer in one jump (everything around the phone is
           black, so there is nothing to see it happen by), and the phone
           glides into its place in the new section. */
        if (!jumped && t >= JUMP) jumped = true;
        if (driving) window.scrollTo(0, jumped ? scrollTo : scrollFrom);
        var g = t < JUMP ? 0 : (t - JUMP) / (1 - JUMP);
        var ge = g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2;
        px = A.x + (B.x - A.x) * ge;
        py = A.y + (B.y - A.y) * ge + 12 * Math.sin(Math.PI * g);
        sc = (A.w + (B.w - A.w) * ge) / A.w;
        prog = g;
      } else {
        /* THE CAMERA FOLLOWS THE PHONE. The path is walked in PAGE space, from
           where the phone is now to where it has to land, and the scroll is then
           derived from it — so the page travels the whole distance behind a phone
           that stays in frame. The phone's own on-screen movement is the gentle
           arc between its two positions; everything else is the world moving. */
        var m = 1 - e;
        var aDocY = A.y + scrollFrom, bDocY = B.y + scrollTo;
        var amp = Math.max(220, Math.abs(bDocY - aDocY) * 0.35);
        var c1 = aDocY + amp, c2 = bDocY - amp;
        var docY = m*m*m*aDocY + 3*m*m*e*c1 + 3*m*e*e*c2 + e*e*e*bDocY;
        // on screen it drifts from where it was to where it lands, with a small
        // sag through the middle so the move still reads as a curve
        var vy = A.y + (B.y - A.y) * e + 34 * Math.sin(Math.PI * t);
        if (driving) window.scrollTo(0, docY - vy);
        px = A.x + (B.x - A.x) * e + 26 * Math.sin(Math.PI * t);
        py = vy;
        prog = t;
      }
      // size only ever eases between the two phones' real sizes — no shrinking
      if (sc === undefined) sc = (A.w + (B.w - A.w) * e) / A.w;
      flight.style.transform =
        "translate(" + (px - w0 * sc / 2) + "px," + (py - h0 * sc / 2) + "px) scale(" + sc + ")";
      if (!swapped && prog >= 0.5) {
        swapped = true;
        if (slide) { a.style.translate = "110% 0"; b.style.translate = "0 0"; }
        else { a.style.opacity = "0"; b.style.opacity = "1"; }
      }
      if (t < 1) requestAnimationFrame(step);
      else {
        if (driving) window.scrollTo(0, scrollTo);   // exactly on the pin
        var d = f.contentDocument;
        var shell = d && d.querySelector(".__ph");
        if (shell) shell.classList.remove("hide");   // theirs, exactly here, takes over
        flight.classList.remove("on");
        flight.style.transform = "";
        if (col) col.style.visibility = "";
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchmove", release);
        window.removeEventListener("keydown", release);
        if (idoc) idoc.removeEventListener("wheel", release);
        sec.__flying = false;
        sec.__flown = true;    // the way back starts from here
        done();
      }
    }
    requestAnimationFrame(step);
  }

  /* ── AND BACK AGAIN ──────────────────────────────────────────────────────
     One nudge up from the pinned closer plays the film backwards. The words
     leave to the right, the letter tucks in behind the phone, and the phone —
     the page's phone again — flies back up the way it came, the camera
     following, and sets down exactly where the story left it. The page lands
     with the closer just off the bottom of the screen, so scrolling down
     again simply plays the whole thing afresh. */
  function runFlightBack(sec, f, done) {
    var src = sec.getAttribute("data-from") || "story1";
    var slide = sec.getAttribute("data-swap") === "slide";
    var d = f.contentDocument;
    var shell = d && d.querySelector(".__ph");
    if (!flight || !shell || !rectOfStoryPhone(src)) { sec.__flying = false; done(); return; }
    sec.__flying = true;

    // the page's phone takes over from theirs, exactly where it stands
    var ir = f.getBoundingClientRect(), sr = shell.getBoundingClientRect();
    var A = { x: ir.left + sr.left + sr.width / 2, y: ir.top + sr.top + sr.height / 2, w: sr.width };
    shell.classList.add("hide");

    // the screens, the other way round: leave on the closer's, arrive on the
    // exact frame the story ended on (the clone keeps its scroll)
    var fromShot = document.querySelector("#" + src + " " + sec.getAttribute("data-to-shot"));
    var toShot = document.querySelector("#" + src + " " + sec.getAttribute("data-from-shot"));
    flightShots.innerHTML = "";
    var a = fromShot.cloneNode(true), b = toShot.cloneNode(true);
    a.style.opacity = "1";
    a.style.transform = "translateY(0px)";
    if (slide) {
      b.style.opacity = "1";
      a.style.transition = b.style.transition = "translate .5s cubic-bezier(.4,0,.2,1)";
      b.style.translate = "110% 0";
    } else {
      b.style.opacity = "0";
    }
    flightShots.appendChild(a); flightShots.appendChild(b);

    flightPhone.style.width = A.w + "px";
    flight.classList.add("on");
    var box = flight.getBoundingClientRect();
    var w0 = box.width, h0 = box.height;

    // two phones again, for a moment: the story's stays hidden until landing
    var col = document.querySelector("#" + src + " .phone-col");
    if (col) col.style.visibility = "hidden";
    var stg = document.querySelector("#" + src + " .stage");

    var scrollFrom = window.scrollY;
    var secDocTop = scrollFrom + sec.getBoundingClientRect().top;
    var scrollTo = Math.max(0, secDocTop - window.innerHeight - 2);
    var t0 = performance.now(), DUR = 1500, swapped = false;
    /* The same in-place cut, backwards: the closer empties around the held
       phone, the page is cut back above the closer while only the phone is
       visible, and the phone glides up to where the story's phone stands —
       measured live AFTER the cut, because its sticky stage settles with the
       scroll and the landing has to be exact. */
    var JUMP = 0.32, jumped = false;
    var driving = true;
    function release(ev) { if (ev && ev.type === "wheel" && ev.deltaY < 0) return; driving = false; }
    window.addEventListener("wheel", release, { passive: true });
    window.addEventListener("touchmove", release, { passive: true });
    window.addEventListener("keydown", release);
    d.addEventListener("wheel", release, { passive: true });   // over the frame, pre-cut

    function step(now) {
      var t = Math.min(1, (now - t0) / DUR);
      if (!jumped && t >= JUMP) jumped = true;
      if (driving) window.scrollTo(0, jumped ? scrollTo : scrollFrom);
      var g = t < JUMP ? 0 : (t - JUMP) / (1 - JUMP);
      var ge = g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2;
      var tr = jumped ? rectOfStoryPhone(src) : null;
      var B = tr ? { x: tr.left + tr.width / 2, y: tr.top + tr.height / 2, w: tr.width } : A;
      var px = A.x + (B.x - A.x) * ge;
      var vy = A.y + (B.y - A.y) * ge - 12 * Math.sin(Math.PI * g);
      var sc = (A.w + (B.w - A.w) * ge) / A.w;
      flight.style.transform =
        "translate(" + (px - w0 * sc / 2) + "px," + (vy - h0 * sc / 2) + "px) scale(" + sc + ")";
      if (!swapped && g >= 0.5) {
        swapped = true;
        if (slide) { a.style.translate = "-110% 0"; b.style.translate = "0 0"; }
        else { a.style.opacity = "0"; b.style.opacity = "1"; }
      }
      // the story's words come back with the landing, not after it
      if (g >= 0.7 && stg) stg.classList.remove("gone");
      if (t < 1) requestAnimationFrame(step);
      else {
        if (driving) window.scrollTo(0, scrollTo);
        if (col) col.style.visibility = "";   // theirs again, exactly here
        if (stg) stg.classList.remove("gone");
        flight.classList.remove("on");
        flight.style.transform = "";
        window.removeEventListener("wheel", release);
        window.removeEventListener("touchmove", release);
        window.removeEventListener("keydown", release);
        d.removeEventListener("wheel", release);
        sec.__flying = false;
        sec.__flown = false;
        done();
      }
    }
    requestAnimationFrame(step);
  }

  // Their app mounts a moment AFTER the frame's load event, so nothing can be
  // dressed up until it has actually drawn something.
  function whenReady(f, cb, tries) {
    var d = f.contentDocument;
    // The phone is the anchor and both pieces have one; a letter is optional
    // (Blade Lock has blades instead), so it must not gate the reveal.
    if (d && d.body && findPhone(d)) return cb(d);
    if ((tries || 0) > 60) return;
    setTimeout(function () { whenReady(f, cb, (tries || 0) + 1); }, 100);
  }

  [].slice.call(document.querySelectorAll(".closer")).forEach(function (sec) {
    var f = sec.querySelector("iframe");
    var armed = false;

    var flies = !!sec.getAttribute("data-flight") && !reduce;
    // Only the pinned, flown-into closer needs the extra screen of scroll, and
    // only where the two-column layout exists to fly across.
    if (flies && window.innerWidth >= 1024) sec.classList.add("pinned");

    f.addEventListener("load", function () {
      whenReady(f, function () { prime(sec, f); });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) {
          // Scrolled back above it: put it away, so coming back plays it again.
          if (e.boundingClientRect.top > 0 && armed) { armed = false; rewind(sec, f); }
          return;
        }
        if (armed) return;
        armed = true;

        /* Everything below needs a PRIMED closer. A reload that restores the
           scroll right here fires this observer before the piece has even
           mounted — running on the half-built document is what left the
           phone hidden with nobody to reveal it. So: not ready → prime
           first, arrive after. */
        var d0 = f.contentDocument;
        if (!d0 || !d0.querySelector(".__ph")) {
          whenReady(f, function () { prime(sec, f); arrive(); });
          return;
        }
        arrive();

        function arrive() {
        toHarvard(f);              // open on the colour the phone was wearing
        if (f.contentDocument) setRealShot(f.contentDocument, "harvard", true);
        var shell = f.contentDocument && f.contentDocument.querySelector(".__ph");
        if (shell) parkOars(sec, f.contentDocument, shell);   // fresh geometry

        /* The flight only makes sense when the reader actually CAME from the
           story — its phone near the screen to take off from. A reload that
           restores the scroll here, or a jump from elsewhere, reveals the
           closer in place instead of replaying a flight from nowhere. */
        var st = rectOfStoryPhone(sec.getAttribute("data-from") || "story1");
        var near = st && st.width > 10 &&
                   st.bottom > 120 && st.top < window.innerHeight - 120;

        if (flies && sec.classList.contains("pinned") && near) {
          runFlight(sec, f, function () {
            playText(f, 220);      // the words arrive with whatever comes out
            if (sec.getAttribute("data-oars")) {
              playOars(f, 240);    // peek, hold, then spread onto the turning wheel
            } else {
              playLetter(f, 220);
              spin(sec, f, 1700);  // …and only then does it start rotating
            }
          });
        } else {
          // No flight here (narrow screen, reduced motion, or the reader did
          // not come from the story) — but the phone may be hidden waiting
          // for one. Swap the hiding for the slide-in entrance, so it
          // arrives instead of just appearing.
          var sh = f.contentDocument && f.contentDocument.querySelector(".__ph");
          if (sh && sh.classList.contains("hide")) {
            sh.classList.add("pre");
            void sh.offsetWidth;
            sh.classList.remove("hide");
          }
          play(f);
          playText(f, 320);
          if (sec.getAttribute("data-oars")) {
            playOars(f, 700);      // after the phone's own entrance
          } else {
            spin(sec, f, 1500);
          }
        }
        }
      });
    }, { threshold: sec.getAttribute("data-flight") ? 0.02 : 0.3 });
    io.observe(sec);

    /* The way back: a nudge up ANYWHERE on the landed closer plays the film
       in reverse — first act puts everything back the way it came (gliding
       the frame to the pin first if the reader had drifted), then the flight
       home. Anywhere, because with smooth scrolling the wheel events arrive
       while the page is still deep in the cushion — a trigger that only
       listened at the pin's start simply never heard them. armed stays true
       until the reverse lands, so the observer above cannot replay the
       arrival mid-move. */
    if (flies && sec.getAttribute("data-txt")) {
      var onWheelUp = function (ev) {
        if (ev.deltaY >= 0 || !armed || !sec.__flown || sec.__flying) return;
        var r = sec.getBoundingClientRect(), mid = window.innerHeight / 2;
        if (r.top > mid || r.bottom < mid) return;   // it is not what is on screen
        sec.__flying = true;   // claimed from the first frame of the act
        retractCloser(sec, f, function () {
          runFlightBack(sec, f, function () { armed = false; });
        });
      };
      window.addEventListener("wheel", onWheelUp, { passive: true });
      /* CRUCIAL: the landed closer is a full-screen iframe — the reader's
         wheel is over IT, and wheel events do not cross document boundaries.
         The browser still chain-scrolls the page (which is how the closer
         could slide away), but a window-level listener never hears a thing.
         So the same trigger listens inside the closer's own document. */
      whenReady(f, function () {
        f.contentDocument.addEventListener("wheel", onWheelUp, { passive: true });
      });
    }
  });
})();
</script>
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
        var sec = f.closest(".closer");
        if (sec.classList.contains("pinned")) return;
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
