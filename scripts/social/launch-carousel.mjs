/*
  THE LAUNCH CAROUSEL: the website's front door, retold for Instagram.

  v3 (2026-09-27). The owner, on v2 (cards lifted out over the phone): "I don't
  like it. Make it maybe like phone in middle and features on side pointing on
  it with arrow". So every slide is one phone, WHOLE and uncovered, in the
  middle, and the features stand on either side of it, each with an arrow to
  the exact thing on the screen it is about: the People and Sessions tabs, the
  Mentor fit chip, the Plan button, Accept, + Log, the leaderboard card.

  8 slides, 1080x1440 (3:4), white:
    1    the intro: "Your campus. Your gym. Your people." and the hero's four
         actions, each pointing at its tab (Gyms, Match, Messages, Profile)
    2-6  Match, Why you match, Plan, Profile, Gyms: the story's chapters, the
         chapter's features around the phone
    7    Campus Colours: the same Gyms screen in three schools' colours
    8    the waitlist, in the waitlist page's own words

  EVERY WORD IS THE WEBSITE'S (lib/landingCopy.ts, lib/waitlist.ts), the rule
  since 2026-09-22 ("use the tone from my website so it's not generic AI
  slop"), or the app's own name for the thing the arrow points at, with a
  verb where it reads more naturally (2026-10-22). Left out on purpose, because
  the app does not do them today: "How busy" (cut 2026-09-22), "Connect it to
  Google or Apple Calendar" (not built), and "students verified by their .edu
  email" (sign-up asks for a .edu address but does not check it yet:
  db/auth_autoconfirm.sql).

  Instagram's own advice that shaped it: 3:4 is the full-height post (the
  profile grid shows 3:4 since January 2025, so the cover is not cropped), and
  Instagram often shows a carousel a second time starting at slide 2 to
  someone who scrolled past (Mosseri, 2024), so Match, the strongest slide,
  is second. Post it from the Instagram app: Meta's API, which schedulers use,
  still takes 4:5 at most.

  The device is the website's phone (components/landing/Phone.tsx): metal rim,
  black bezel, a status-bar row, the app's capture WHOLE, a gesture-bar row.
  No logo, no handle (the owner's rule for posts), except on the two posts'
  closer, which carries the mark (2026-10-29).

  Screens: mockups/social/screens/launch (scripts/social/capture-launch.mjs,
  signed in as the demo account; reshot 22 Oct 2026). Every arrow's target is
  a point on that capture, in its own pixels (1206 x 2622), read off the PNG
  over a grid and checked against the card boxes in <name>.json: a reshoot
  that moves a button means re-reading its point. Slide 7 is the same Gyms
  screen in three schools, shot from a local copy with the Harvard pin off
  (see capture-launch.mjs).

  No small label above a headline (owner, 2026-10-22: "smaž to match nahoře
  ... ten malý text"): the chapter slides open on the headline itself. The
  cover's badge has no dot in front (2026-10-11, no "·" anywhere).

  TWO MORE POSTS in the same look (owner, 2026-10-22: "extensive carousel on
  match first, so the basic screen, then click a profile to compare
  calendars, then the sessions ... post workout or search by time in one,
  then message with plan workout. This would be one post. Then second will
  be profile with log workouts, calendar etc., then log workouts to earn
  points and memories, and then the leaderboards"):
    post-match    Match, a profile (its calendars a label), Sessions, the
                  plan in the chat, the waitlist. The both-weeks slide was
                  cut (2026-10-22: "cut 3 and just describe calendar on
                  second image with arrow").
    post-profile  Profile, the Log sheet (points and a photo), Leaderboards,
                  the waitlist
  Since 2026-10-24 every word on them is the owner's own (POST_CLOSER).
  Memories is the Log sheet's photo tile: the demo account has no photos,
  and an empty screen is never shown.

  Run: node scripts/social/launch-carousel.mjs [launch|post-match|post-profile]
  Out: mockups/social/<set>/01.png …, and sheet.png with all of them
*/
import puppeteer from "puppeteer-core";
import { readFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\//, ""), "../..");
const SET = process.argv[2] || "launch";
const OUT = path.join(ROOT, "mockups/social", SET);
mkdirSync(OUT, { recursive: true });

const W = 1080, H = 1440, M = 84;
/* the landing page's own colours (app/globals.css, --color-l-*) */
const INK = "#141618", INK2 = "#4b4f53", BLUE = "#1f32c1";
const BLUE_DIM = "rgba(31,50,193,.08)", BLUE_SOFT = "rgba(31,50,193,.2)";
/* the intro's italic line takes the school on its phones (lib/landingSchools.ts) */
const CRIMSON = "#a51c30";

/* THE LABELS. `at` is the point the arrow lands on, in the capture's pixels,
   `side` which side of the phone the label stands on. Titles are the site's
   feature names or the app's own word on the button, with a verb added where
   it sounds more natural: "Send a message", "Plan a session", "Build
   memories" (owner, 2026-10-22: "actually name is close as it is jsut add
   verb there"; a full rename in the site's voice was tried the same day and
   reverted). The lines under them are the site's, word for word. */
/* the owner's own lines for Match and the mentors (2026-10-23: "find new
   people based on interest, concentration, training times, stuff like
   that", "get help from a more experienced student about lifting, or
   advising about your concentration from an upperclassman"), on both
   carousels that show them */
const FIND_PEOPLE = "Meet new people based on your interests, concentration, training times and more.";
const MENTOR = "Get help with lifting from a more experienced student, or advice on your concentration from an upperclassman.";

const LAUNCH = [
  /* hero: badge, headline, and `hero.body` cut into its four actions: the
     people for "Match", the Gyms, Messages and Profile tabs for the rest. On
     the right the inner tab's label stands higher, so the two arrows fan into
     the bar without crossing. "Match with students verified by their .edu
     email" loses its second half: nothing verifies the address yet. (A row of
     the four under the phone, arrows up into the bar, was tried: the phone
     had to shrink to make room, and lost.) */
  { kind: "hero", img: "match", badge: "Free for students", head: "Your campus. Your gym.", em: "Your people.",
    labels: [
      { side: "L", title: "Match with students.", at: [243, 432] },
      { side: "L", title: "Find every gym on campus.", at: [160, 2458] },
      { side: "R", title: "Plan the session in the chat.", at: [791, 2424] },
      { side: "R", title: "Log it together and participate in your college leaderboards.", at: [1036, 2458] },
    ] },

  /* the student story's chapters (`storyBeats`) and their points */
  { kind: "feature", img: "match", head: "Find training partners.", em: "Make friends.",
    labels: [
      { side: "L", title: "Browse", text: FIND_PEOPLE, at: [44, 97] },
      { side: "R", title: "Buddy Board", text: "Post your session and see who wants to join.", at: [1166, 97] },
      { side: "L", title: "Find a mentor", text: MENTOR, at: [236, 1435] },
    ] },
  { kind: "feature", img: "person", head: "Find your ideal", em: "training partner.",
    /* no line to the Message button (owner, 2026-09-27: "don't say
       'message', so you don't need to point there"): a button that says
       what it does gets no label */
    labels: [
      { side: "L", title: "See why you match", text: "Get matched with people based on your interests, hobbies, concentrations, level, language, hometown or much more.", at: [44, 676] },
    ] },
  /* the chat ends on a plan Arjun sent that you have just accepted
     (capture-launch.mjs), and Both calendars points at its "You're on". No
     Plan card label: the card says its gym, day and time itself (owner,
     2026-10-22: "dont put the plan card text that is easy") */
  { kind: "feature", img: "chat", head: "Plan sessions easily", em: "in the chat.",
    labels: [
      { side: "R", title: "Plan a session", text: "Simply tap the calendar button in the chat and set up a time.", at: [1166, 84] },
      /* no name over it, the sentence alone (owner, 2026-10-23: "don't name
         it 'Both Calendars.' Just write there: once you accept the session,
         it goes into both your calendars") */
      { side: "L", text: "Once you accept the session, it goes into both of your calendars.", at: [109, 1836] },
    ] },
  { kind: "feature", img: "profile", head: "Track your statistics.", em: "See how you do in the leaderboards.",
    labels: [
      { side: "L", title: "Check the leaderboards", text: "See how you, your house and your year rank on campus.", at: [42, 757] },
      { side: "R", title: "Log a session", text: "Pick the exercises and record the sets, reps and weight. No separate app needed.", at: [1132, 758] },
      { side: "L", title: "Calendar", text: "Every session you log marks its day.", at: [42, 1240] },
      { side: "R", title: "Build memories", text: "Photos from your sessions, saved to come back to.", at: [1164, 1496] },
    ] },
  /* the Gyms chapter's own points (Photos, Ratings, How busy) are not on the
     list screen, so these are the list's own words */
  { kind: "feature", img: "gyms", head: "See every gym on your campus", em: "in one place.",
    labels: [
      { side: "L", title: "Main gyms", at: [36, 547] },
      { side: "R", title: "Save favourites", at: [1020, 536], rise: 70 },
      { side: "L", title: "House gyms", at: [36, 1536] },
    ] },

  /* Campus Colours (`closers.campus`) */
  { kind: "colours", head: "Your campus,", em: "your colours.", sub: "The app is customized to your university, gyms and colours.",
    schools: ["yale", "harvard", "dartmouth"] },

  /* the waitlist page (lib/waitlist.ts): headline, body, and the bio link */
  { kind: "closer", head: "Get in on", em: "day one.", sub: "UNIsport opens at Harvard first. Get an email when the app launches.",
    url: "getunisport.com/waitlist" },
];
const CLOSER = LAUNCH[LAUNCH.length - 1];

/* THE TWO POSTS' WORDS ARE THE OWNER'S, every headline and label, written
   2026-10-24 ("can you change the text for this?"). Only the punctuation is
   ours: a full stop on each headline and line, a capital where a line starts
   under its name, and "Plan a sessions" read as "Plan a session". The arrows'
   points did not move.
   The closer carries the logo over "Get in early." (owner, 2026-10-29: "put the
   logo there in the last thing and like get in early"). The launch carousel is
   already posted and keeps its closer. */
const POST_CLOSER = { kind: "closer", logo: true, head: "Get in", em: "early.",
  sub: "UNIsport is launching at Harvard University first. Sign up to get an email when the app goes live.",
  url: CLOSER.url };

/* THE MATCH POST: the walk through Match, tap by tap */
const POST_MATCH = [
  /* Browse on the People and Sessions switch, Search similarities on the
     interests you share with Ethan */
  { kind: "feature", img: "match", head: "Search for training partners.", em: "Find new friends.",
    labels: [
      { side: "L", title: "Search similarities", text: "Connect with new people based on mutual interests, academic focus, training schedules, and more.", at: [68, 854] },
      { side: "R", title: "Browse", text: "See people and sessions.", at: [1167, 99] },
      { side: "L", title: "Look for a mentor", text: "Get help with your lifts from someone with a little more experience in the gym.", at: [236, 1435] },
    ] },
  { kind: "feature", img: "person", head: "Connect with your perfect", em: "training partner.",
    labels: [
      { side: "L", title: "Why you match", text: "See what similarities connected you and your partner.", at: [44, 676] },
      { side: "R", title: "Compare calendars", text: "Find out when you’re both free to train.", at: [1119, 1824] },
      { side: "R", title: "Send a message", text: "Set up a session in your chat.", at: [1158, 2259] },
    ] },
  /* no Accept label (owner, 2026-10-24: "delete the accept") */
  { kind: "feature", img: "board", head: "Post your session and", em: "see if anyone else wants to join.",
    labels: [
      { side: "L", title: "Post your session", text: "Show people what you’re up to.", at: [36, 258] },
      { side: "L", title: "Filter sessions", text: "Find your gym, day, and exercises.", at: [39, 419] },
      { side: "R", title: "Search by time", text: "Look for a time you want to train and connect with others going at the same time.", at: [1168, 258] },
    ] },
  /* the chat ends on a plan Arjun sent that you have just accepted
     (capture-launch.mjs); the sentence points at its "You're on" */
  { kind: "feature", img: "chat", head: "Plan partner sessions", em: "in the chat.",
    labels: [
      { side: "R", title: "Plan a session", text: "Tap the calendar button to get your chat going.", at: [1166, 84] },
      { side: "L", text: "Once you accept the session, it will appear in both of your calendars.", at: [109, 1836] },
    ] },
  POST_CLOSER,
];

/* THE PROFILE POST: your own training, then the points it earns */
const POST_PROFILE = [
  { kind: "feature", img: "profile", head: "Track your stats.", em: "Check the leaderboards.",
    labels: [
      { side: "R", title: "Log your sessions", text: "Track exercises, sets, reps, and weight.", at: [1132, 758] },
      { side: "L", title: "Calendar", text: "Shows every session.", at: [42, 1240] },
    ] },
  /* the Log sheet with two muscle groups picked. Add exercise opens the
     exercise library, with your own when it isn't there (ExercisePicker.tsx) */
  { kind: "feature", img: "log", head: "Log your session", em: "in the app.",
    labels: [
      { side: "L", title: "Add exercises", text: "Search for common exercises or input your own.", at: [48, 948] },
      { side: "L", title: "Earn points", text: "Log your workout to earn points.", at: [48, 2480] },
      { side: "R", title: "Snap a picture", text: "Make memories with your training partners.", at: [308, 2140] },
    ] },
  /* a buddy earns more: lib/points.ts gives 10 alone, 15 with a partner */
  { kind: "feature", img: "leaderboards", head: "Participate in", em: "college leaderboards.",
    labels: [
      { side: "R", title: "Rack up points", text: "You earn more when you have a buddy.", at: [1162, 316] },
      { side: "L", title: "Join a competition", text: "See how you rank on your campus.", at: [48, 526] },
    ] },
  POST_CLOSER,
];

const SLIDES = { launch: LAUNCH, "post-match": POST_MATCH, "post-profile": POST_PROFILE }[SET];
if (!SLIDES) throw new Error("no set " + SET);

/* ── the screens ── */
const b64 = (file) => "data:image/png;base64," + readFileSync(file).toString("base64");
const SCREEN = {};
const SHOTS = path.join(ROOT, "mockups/social/screens/launch");
for (const s of SLIDES) if (s.img && !SCREEN[s.img]) {
  const file = path.join(SHOTS, s.img + ".png");
  const meta = await sharp(file).metadata();
  SCREEN[s.img] = { src: b64(file), w: meta.width, aspect: meta.height / meta.width };
}
const FRAME = {}; // school -> its Gyms screen (Harvard is the account's own)
for (const s of SLIDES) if (s.schools) for (const k of s.schools) {
  const file = path.join(SHOTS, k === "harvard" ? "gyms.png" : `gyms-${k}.png`);
  const meta = await sharp(file).metadata();
  FRAME[k] = { src: b64(file), aspect: meta.height / meta.width };
}

/* THE DEVICE, the website's (components/landing/Phone.tsx), in px from its
   cqw: rim .83, bezel 1.95, screen radius 9.44, status row 3.33 top / 2.22
   bottom with a 6.1 x 23.3 island, gesture row 6.67 with a 38% bar. The
   capture fills the screen's width and its whole height shows. */
const shell = (w) => {
  const cq = w / 100, rim = 0.83 * cq, bez = 1.95 * cq;
  const sw = w - 2 * (rim + bez) - 2;
  const status = (3.33 + 2.22 + 6.1) * cq, gesture = 6.67 * cq;
  return { cq, rim, bez, sw, status, gesture, inset: rim + bez + 1 };
};
const phoneHeight = (w, aspect) => {
  const s = shell(w);
  return Math.round(s.sw * aspect + s.status + s.gesture + 2 * s.inset);
};
const widthFor = (h, aspect) => {
  let w = 300;
  for (let i = 0; i < 30; i++) w *= h / phoneHeight(w, aspect);
  return Math.floor(w);
};
/* where a capture pixel lands on the canvas, for a phone at (left, top) */
const onPhone = (w, left, top, [cx, cy], capW) => {
  const s = shell(w), k = s.sw / capW;
  return [Math.round(left + s.inset + cx * k), Math.round(top + s.inset + s.status + cy * k)];
};
const phone = ({ src, aspect }, w, style = "") => {
  const s = shell(w), px = (v) => `${v.toFixed(2)}px`;
  return `<div class="ph" style="width:${w}px;${style}">
    <div class="rim" style="border-radius:${px(12.2 * s.cq)};padding:${px(s.rim)};--cq:${s.cq}px">
      <div class="bezel" style="border-radius:${px(11.37 * s.cq)};padding:${px(s.bez)}">
        <div class="screen" style="border-radius:${px(9.44 * s.cq)}">
          <div class="status" style="height:${px(s.status)};padding:${px(3.33 * s.cq)} ${px(6.11 * s.cq)} ${px(2.22 * s.cq)};font-size:${px(3.33 * s.cq)}">
            <span>9:41</span>
            <i class="island" style="height:${px(6.1 * s.cq)};width:${px(23.3 * s.cq)}"></i>
            <span class="net" style="font-size:${px(3.06 * s.cq)}">5G</span>
          </div>
          <img src="${src}" style="width:100%;height:${px(s.sw * aspect)};display:block">
          <div class="gesture" style="height:${px(s.gesture)}"><i style="height:${px(1.1 * s.cq)}"></i></div>
        </div>
      </div>
    </div>
  </div>`;
};

/* THE PHONE IN THE MIDDLE and the labels either side of it */
const SIDE = 44, GAP = 36;           // outer margin for labels, air between a label and the phone
const stage = (s, ptop, pbottom, lbottom = pbottom) => {
  const scr = SCREEN[s.img];
  const pw = widthFor(pbottom - ptop, scr.aspect), pleft = Math.round((W - pw) / 2);
  const labW = pleft - SIDE - GAP;
  const labels = s.labels.map((l) => {
    const [tx, ty] = onPhone(pw, pleft, ptop, l.at, scr.w);
    const pos = l.side === "L" ? `right:${W - pleft + GAP}px` : `left:${pleft + pw + GAP}px`;
    /* a label is its name, its name and the site's line, or (no name) the line alone */
    const words = !l.title ? `<b class="plain">${l.text}</b>` : `<b>${l.title}</b>${l.text ? `<span>${l.text}</span>` : ""}`;
    return `<div class="lab ${l.side}${l.title && !l.text ? " solo" : ""}" data-tx="${tx}" data-ty="${ty}" data-rise="${l.rise || 0}" style="${pos};width:${labW}px">
      ${words}</div>`;
  });
  return `${phone(scr, pw, `left:${pleft}px;top:${ptop}px`)}${labels.join("")}
    <svg class="arrows" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" data-ptop="${ptop}" data-pbottom="${lbottom}"></svg>`;
};

const em = (text, colour = BLUE) => `<em style="color:${colour}">${text}</em>`;

/* the logo as the app icon draws it on white (mockups/logo/_icons.mjs): the
   left person navy, the right one blue, the viewBox cropped to the ink */
const NAVY = "#2f3b52";
const MARK = `<svg viewBox="19.5 7.5 61 81.5" height="168" style="display:inline-block">
  <path d="M28 34 V56 Q28 82 50 82 H51" fill="none" stroke="${NAVY}" stroke-width="14" stroke-linecap="butt"/>
  <path d="M72 34 V56 Q72 82 50 82" fill="none" stroke="${BLUE}" stroke-width="14" stroke-linecap="butt"/>
  <circle cx="28" cy="34" r="7" fill="${NAVY}"/><circle cx="72" cy="34" r="7" fill="${BLUE}"/>
  <circle cx="28" cy="16" r="8.5" fill="${NAVY}"/><circle cx="72" cy="16" r="8.5" fill="${BLUE}"/>
</svg>`;

const css = `
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  body { font-family:"Plus Jakarta Sans", system-ui, sans-serif; -webkit-font-smoothing:antialiased; color:${INK}; }
  .slide { position:relative; width:${W}px; height:${H}px; overflow:hidden; background:#fff; }
  .serif { font-family:"Instrument Serif", Georgia, serif; font-weight:400; letter-spacing:-.012em; line-height:1; text-wrap:balance; }
  .serif em { font-style:italic; }
  .mono { font-family:"Geist Mono", ui-monospace, monospace; font-weight:500; text-transform:uppercase; letter-spacing:.14em; }
  .top { position:absolute; left:${M}px; right:${M}px; text-align:center; }
  .badge { display:inline-flex; align-items:center; font-size:22px; color:${BLUE};
           padding:14px 26px; border-radius:999px; background:${BLUE_DIM}; border:1.5px solid ${BLUE_SOFT}; }
  .sub { font-weight:500; line-height:1.4; color:${INK2}; text-wrap:pretty; }

  /* the labels: the name, then the site's line; they face the phone */
  .lab { position:absolute; top:0; }
  .lab.L { text-align:right; }
  .lab b { display:block; font-weight:700; font-size:29px; line-height:1.18; letter-spacing:-.01em; color:${INK}; text-wrap:balance; }
  .lab span { display:block; margin-top:8px; font-weight:500; font-size:22px; line-height:1.36; color:${INK2}; text-wrap:pretty; }
  .lab.solo b { font-size:30px; }
  .lab b.plain { font-weight:500; font-size:24px; line-height:1.36; color:${INK2}; }
  .arrows { position:absolute; left:0; top:0; overflow:visible; pointer-events:none; }

  /* the phone (Phone.tsx + .l-phone-rim) */
  .ph { position:absolute; }
  .rim { position:relative; border:1px solid #767b83;
         background:linear-gradient(135deg,#f5f6f8 0%,#c8ccd3 18%,#8f949c 50%,#c8ccd3 82%,#f5f6f8 100%);
         box-shadow: inset 0 0 0 calc(var(--cq) * .28) rgba(245,246,248,.7),
                     0 calc(var(--cq) * 1.6) calc(var(--cq) * 3.2) calc(var(--cq) * -1) rgba(16,22,44,.3),
                     0 calc(var(--cq) * 9) calc(var(--cq) * 18) calc(var(--cq) * -5) rgba(16,22,44,.2); }
  .rim::before, .rim::after { content:""; position:absolute; width:calc(var(--cq) * .95); background:#8f949c; }
  .rim::before { left:calc(var(--cq) * -.95 - 1px); top:calc(var(--cq) * 47); height:calc(var(--cq) * 11);
                 border-radius:calc(var(--cq) * .5) 0 0 calc(var(--cq) * .5);
                 box-shadow:0 calc(var(--cq) * -14) 0 #8f949c, 0 calc(var(--cq) * 14) 0 #8f949c; }
  .rim::after { right:calc(var(--cq) * -.95 - 1px); top:calc(var(--cq) * 50); height:calc(var(--cq) * 18);
                border-radius:0 calc(var(--cq) * .5) calc(var(--cq) * .5) 0; }
  .bezel { background:#050506; }
  .screen { overflow:hidden; background:#fff; }
  .status { display:flex; align-items:center; justify-content:space-between; line-height:1;
            font-family:"Geist Mono", ui-monospace, monospace; color:#16150f; background:#fff; }
  .status .net { color:#9b968c; }
  .island { display:block; border-radius:999px; background:#161616; border:1px solid #222; }
  .gesture { display:flex; align-items:center; justify-content:center; background:#fff; }
  .gesture i { display:block; width:38%; border-radius:999px; background:#cfccc6; }

  .url { display:inline-block; font-weight:700; font-size:34px; letter-spacing:.005em; color:#fff;
         padding:22px 40px; border-radius:999px; background:${BLUE}; }
`;

const render = (s) => {
  if (s.kind === "hero") {
    return `<div class="slide">
      <div class="top" style="top:${M}px"><span class="badge mono">${s.badge}</span></div>
      <div class="top serif fit" style="top:${M + 88}px;font-size:100px;line-height:.98">${s.head}<br>${em(s.em, CRIMSON)}</div>
      ${stage(s, 402, H - 78, H - 30)}
    </div>`;
  }

  if (s.kind === "feature") {
    return `<div class="slide">
      <div class="top serif fit" style="top:${M}px;font-size:84px">${s.head} ${em(s.em)}</div>
      ${stage(s, 308, H - 58)}
    </div>`;
  }

  if (s.kind === "colours") {
    /* one screen, three schools: the middle one in front */
    const top = 610, hf = H - top - 70;
    const wf = widthFor(hf, FRAME.harvard.aspect), wb = Math.round(wf * 0.86);
    const hb = phoneHeight(wb, FRAME.harvard.aspect);
    const cx = W / 2;
    const [l, c, r] = s.schools;
    return `<div class="slide">
      <div class="top serif" style="top:${M + 10}px;font-size:118px">${s.head}<br>${em(s.em)}</div>
      <div class="top sub" style="top:${M + 290}px;font-size:32px">${s.sub}</div>
      ${phone(FRAME[l], wb, `left:${cx - wf / 2 - wb * 0.74}px;top:${top + (hf - hb) / 2 + 30}px;transform:rotate(-8deg)`)}
      ${phone(FRAME[r], wb, `left:${cx + wf / 2 - wb * 0.26}px;top:${top + (hf - hb) / 2 + 30}px;transform:rotate(8deg)`)}
      ${phone(FRAME[c], wf, `left:${cx - wf / 2}px;top:${top}px`)}
    </div>`;
  }

  /* closer */
  return `<div class="slide">
    <div class="top" style="top:50%;transform:translateY(-54%)">
      ${s.logo ? `<div style="margin-bottom:56px">${MARK}</div>` : ""}
      <div class="serif" style="font-size:150px">${s.head}<br>${em(s.em)}</div>
      <div class="sub" style="margin:34px auto 0;font-size:36px;max-width:820px">${s.sub}</div>
      <div style="margin-top:52px"><span class="url">${s.url}</span></div>
    </div>
  </div>`;
};

/* IN THE PAGE, once the type has wrapped: stand each label level with the
   point it names (its name's middle on the arrow's line). Where two labels on
   one side would touch, the pair moves apart evenly, one up and one down,
   rather than the lower one taking all of it; then everything stays inside
   the phone's height. Each line is STRAIGHT, from the label's inner edge at
   the height of its name closest to the point, onto the point (owner,
   2026-10-24: "make the arrows better now some of them have strange shapes").
   The curve it replaced left the label level and landed level, so any label
   not level with its point drew an S running down the phone's edge.

   The line is thin, black and SOLID, and ends in a small solid arrowhead
   whose tip touches the spot (owner, 2026-10-22: "udělej tu šipku šipkou na
   konec", then the same day, after a few hours of it dashed: "actually do
   it full lines"). Before that it was a solid line ending in a dot
   (2026-09-28: "make the arrows black, like when you make comments in
   Word, so that it's not that visible"), and before that blue. A
   hairline of white under it keeps it whole where it crosses the phone's
   black bezel. A label with `rise` stands that much higher than its spot and
   the line comes down onto it, to clear something level with the spot. */
function layOut(LINE) {
  const NS = "http://www.w3.org/2000/svg";
  for (const svg of document.querySelectorAll("svg.arrows")) {
    const slide = svg.closest(".slide");
    const ptop = +svg.dataset.ptop, pbottom = +svg.dataset.pbottom;
    const labs = [...slide.querySelectorAll(".lab")];
    for (const side of ["L", "R"]) {
      const mine = labs.filter((l) => l.classList.contains(side)).sort((a, b) => a.dataset.ty - b.dataset.ty);
      if (!mine.length) continue;
      const gap = 36;
      const title = (l) => l.querySelector("b");
      /* where each label wants to be: level with its point */
      const want = mine.map((l) => +l.dataset.ty - +l.dataset.rise - title(l).offsetHeight / 2);
      /* the closest tops that keep every label `gap` apart: labels that
         would touch are pooled and share the move evenly (pool adjacent
         violators, on each top less the room the labels above it take) */
      const room = [];
      mine.reduce((acc, l) => (room.push(acc), acc + l.offsetHeight + gap), 0);
      const pools = [];
      mine.forEach((_, i) => {
        pools.push({ sum: want[i] - room[i], n: 1 });
        while (pools.length > 1 && pools.at(-2).sum / pools.at(-2).n > pools.at(-1).sum / pools.at(-1).n) {
          const p = pools.pop();
          pools.at(-1).sum += p.sum; pools.at(-1).n += p.n;
        }
      });
      let tops = [];
      for (const p of pools) for (let k = 0; k < p.n; k++) tops.push(p.sum / p.n + room[tops.length]);
      /* then: never above the phone's top … */
      for (let i = 0; i < mine.length; i++) {
        const min = i ? tops[i - 1] + mine[i - 1].offsetHeight + gap : ptop - 40;
        tops[i] = Math.max(tops[i], min);
      }
      /* … and nothing below the phone's foot, pushing back up if needed */
      for (let i = mine.length - 1; i >= 0; i--) {
        const max = i < mine.length - 1 ? tops[i + 1] - gap - mine[i].offsetHeight : pbottom - mine[i].offsetHeight;
        tops[i] = Math.min(tops[i], max);
      }
      mine.forEach((l, i) => { l.style.top = Math.round(tops[i]) + "px"; });
    }
    for (const l of labs) {
      const r = l.getBoundingClientRect(), t = l.querySelector("b").getBoundingClientRect();
      const L = l.classList.contains("L");
      const tx = +l.dataset.tx, ty = +l.dataset.ty;
      /* just off the label's inner edge, at the height of its name nearest
         the point: level with it whenever any line of the name is */
      const sx = L ? r.right + 14 : r.left - 14;
      const sy = Math.min(Math.max(ty, t.top + 15), t.bottom - 15);
      /* a straight line; the head points along it, its tip on the spot, and
         the line stops inside the head so nothing pokes past the tip */
      const len = Math.hypot(tx - sx, ty - sy) || 1;
      const ux = (tx - sx) / len, uy = (ty - sy) / len;
      const HL = 14, HW = 6;
      const bx = tx - ux * HL, by = ty - uy * HL;
      const head = `M${tx},${ty} L${bx - uy * HW},${by + ux * HW} L${bx + uy * HW},${by - ux * HW} Z`;
      const d = `M${sx},${sy} L${tx - ux * HL * 0.6},${ty - uy * HL * 0.6}`;
      for (const [colour, width, edge] of [["#fff", 5, 3], [LINE, 2, 0]]) {
        const p = document.createElementNS(NS, "path");
        p.setAttribute("d", d); p.setAttribute("fill", "none");
        p.setAttribute("stroke", colour); p.setAttribute("stroke-width", width);
        svg.appendChild(p);
        const h = document.createElementNS(NS, "path");
        h.setAttribute("d", head); h.setAttribute("fill", colour);
        if (edge) { h.setAttribute("stroke", colour); h.setAttribute("stroke-width", edge); h.setAttribute("stroke-linejoin", "round"); }
        svg.appendChild(h);
      }
    }
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new",
  args: ["--no-sandbox", "--force-device-scale-factor=1", "--hide-scrollbars", "--font-render-hinting=none"],
});
const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
const files = [];
for (const [i, s] of SLIDES.entries()) {
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Plus+Jakarta+Sans:wght@500;600;700&family=Geist+Mono:wght@500&display=swap" rel="stylesheet">
    <style>${css}</style></head><body>${render(s)}</body></html>`, { waitUntil: "load", timeout: 60000 });
  await page.evaluate(() => Promise.all(Array.from(document.images).filter((im) => !im.complete)
    .map((im) => new Promise((r) => { im.onload = im.onerror = r; }))));
  await page.evaluateHandle("document.fonts.ready");
  /* a head never takes a third line: step the size down until it fits in two */
  await page.evaluate(() => {
    for (const el of document.querySelectorAll(".fit")) {
      let size = parseFloat(el.style.fontSize);
      while (size > 56 && el.getBoundingClientRect().height > size * 2.1) el.style.fontSize = (size -= 2) + "px";
    }
  });
  await page.evaluate(layOut, INK);
  const file = path.join(OUT, String(i + 1).padStart(2, "0") + ".png");
  await page.screenshot({ path: file, type: "png" });
  files.push(file);
  console.log("  " + path.basename(file));
}
await browser.close();

/* all of them in order, for looking at the whole thing at once */
const TW = 480, TH = Math.round(TW * H / W), GAP_S = 24, COLS = 4;
const tiles = await Promise.all(files.map((f) => sharp(f).resize(TW, TH).png().toBuffer()));
const rows = Math.ceil(files.length / COLS);
await sharp({ create: { width: COLS * TW + (COLS + 1) * GAP_S, height: rows * TH + (rows + 1) * GAP_S, channels: 3, background: "#e4e8ee" } })
  .composite(tiles.map((b, i) => ({ input: b, left: GAP_S + (i % COLS) * (TW + GAP_S), top: GAP_S + Math.floor(i / COLS) * (TH + GAP_S) })))
  .png().toFile(path.join(OUT, "sheet.png"));
console.log("wrote " + OUT);
