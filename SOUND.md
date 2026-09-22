# Sound — where the effects come from, and what goes where

Companion to `VIDEO.md` (which holds the picture). Bottom-appended: read the last
dated section first.

The point of this file: the sound knowledge used to live only in code comments and in
`mockups/video/sfx-bank.mp3`, which is gitignored and disappears if the script isn't
re-run. Here it is in plain English, with the licence for every source, so a sound can
be replaced a year from now without guessing.

---

## 2026-09-22 — what the reference reels taught us

The owner sent five reels from Instagram creators. Nobody's audio was copied; what we
took is **which sounds they are** and **how they're placed**, then we source them
ourselves. (Same rule as the music: never rip the reference.)

### What each reel gave us

**1. `4.29.44 PM` — the AI-prompt reel (split screen: "Final Render" / "Sound design").**
The single most useful one. It shows the editor's actual timeline with the clip names
readable. This is the whole recipe, see below.

**2. `4.29.59 PM` — @benkaluza, "my favourite free sound effect sites".**
A ranked list of seven: Mixkit, ZapSplat, Freesound (650,000 sounds), MyInstants,
tuna.voicemod, Pixabay (90,000), freeSFX — ending on the **BBC Sound Effects archive**
(33,000 sounds) as the big finish.
⚠️ **The BBC one is a trap for us.** Those are released under the BBC's RemArc licence:
personal, educational and research use only. UNIsport is a product, so that is
commercial use and the BBC library is **off limits** unless we licence a sound directly.
MyInstants and tuna.voicemod are meme/gaming soundboards — wrong register for us anyway.

**3. `4.30.01 PM` — @akhilfilms.exe, text-animation presets.**
Not sound at all: Bounce Up, Words Down, Words Up, Characters Down, Typewriter, Glitch,
Flicker Words. Worth keeping in mind for the headline, but nothing for this file.

**4. `4.30.12 PM` — "The Art of Still Frames", a photography reel.**
Timeline visible again, all camera sounds: Camera Burst, Single, Reflex Lens Clicks,
Digital Cam, Shutter x Woosh, Rapid Fire Shutter, DSLR. Nothing our reel needs — we
have no camera — but it confirms the same working method as #1: many small named
sounds, stacked, one per beat.

**5. `4.30.21 PM` — Matt Ashbee, "5 sound effects I use in every single video".**
His kit, in order: **1 The Riser · 2 The Impact · 3 The Whoosh · 4 Camera Shutter ·
5 Apple Keyboard.** He ends holding up a "My top 5 sound effects sites" sheet, but it's
deliberately blurred in the video (you have to comment "SFX" to get it). The word
shapes read as Epidemic Sound / Artlist / Freesound / YouTube Audio Library / one more
— that's an inference from the blur, not something we actually read.

### The recipe (from reel 1's timeline)

Five audio tracks, read off the screen. Names verbatim:

| Track | Clips, left to right |
|---|---|
| A1 | `ES_Sci Fi Games, UI Menu, Very Sl…` — one long sound under the whole opening |
| A2 | `Granular, Transform, Move,…` · a row of tiny blips · `Keyboard Clicking.mp3` · `EXT PREMIUM SFX I…` · `Keyboard 7-8 let…` · `Enter.wav` · `Enter.wav` |
| A3 | `Gra…` · `The muffled "whoosh" sou…` · `Granular,` · `Keyboard 7-8 let…` · `Enter.wav` |
| A4 | `EXT…` · `Whoosh (35)` · `Whoosh (10).wav` |
| A5 | `Whoosh (18).wav` |

Four things we're taking from it:

1. **The `ES_` prefix is Epidemic Sound.** That exact file is real and findable:
   *SFX — Sci Fi Games, UI Menu, Very Short, Open 02*, in their User Interface →
   Click category. So the pro-looking half of this reel is a $15/month subscription,
   not a secret free pack. Good to know before we spend a week hunting for it free.
2. **Typing is placed as a phrase, not per letter.** `Keyboard 7-8 letters` is one
   clip covering a burst of seven or eight keystrokes, then a separate `Enter.wav`
   lands the end. Our script currently fires one sound per character, which is why it
   reads as mechanical.
3. **Whooshes come from a numbered pack** — `Whoosh (10)`, `(18)`, `(35)` — i.e. a free
   bulk pack, used generously. Three different whooshes in twelve seconds, never the
   same one twice.
4. **Three to five sounds play at once, in different registers.** Measuring the reel:
   its keystrokes sit around 4.5–5 kHz while its whooshes and impacts sit at 0–0.7 kHz.
   Each moment is a low sound plus a bright sound plus a texture, stacked — not one
   sound doing all the work.

### Does this explain why ours sounded horrible?

Partly. Measured side by side, our mix and the reference have almost the same
frequency balance, so there is no gross tone problem to fix with EQ. What's different
is the choices: one sound per beat instead of three, one sound per letter instead of a
typed phrase, and the sounds themselves pulled off the bottom shelf ("Simple Whoosh",
"Airy Short Whoosh", and a Vine Boom sitting unused in the bank).

### Where to actually get them

Ranked for *our* use — a commercial product, white and quiet, needing UI sounds:

| Source | Licence for us | Use it for |
|---|---|---|
| [Sonniss GDC bundle](https://sonniss.com/gameaudiogdc) | Royalty-free forever, no attribution, commercial fine | The serious one. Real studio interface libraries, free. Start here. |
| [Pixabay](https://pixabay.com/sound-effects/) | CC0 | Quick single sounds; ~90,000 of them |
| [ZapSplat](https://www.zapsplat.com/) | Free with account, attribution unless you pay | Best search. "single keyboard key" actually works |
| [Mixkit](https://mixkit.co/free-sound-effects/) | Free, commercial OK | Cinematic risers and whooshes |
| [Freesound](https://freesound.org/) | Mixed — check each sound | 650,000, but licences vary per file |
| [Epidemic Sound](https://www.epidemicsound.com/sound-effects/categories/user-interface/) | $15/mo | If we want reel 1's exact sounds and the trending-track problem solved too |
| ~~BBC Sound Effects~~ | **Non-commercial only** | **Not for UNIsport** |

### What goes where in our reel

Our reel needs eight sounds. Mapping each to what to search for, applying the
reference's layering:

| Moment | Layer it like this | Search terms |
|---|---|---|
| caret appears | one soft UI click, alone | "ui click soft", "menu select" |
| the headline types | **one** 7–8-key burst per word, not per letter | "keyboard typing short burst", "mechanical keyboard phrase" |
| activities lift in | low whoosh + bright UI tick | "whoosh soft low", "ui transition" |
| the three tiles | three small clicks, 120 ms apart, quieter each time | "ui tap subtle", "interface pop" |
| the two taps | finger tap on glass, two takes so they differ | "finger tap screen", "phone tap" |
| the two i's slide | the longest whoosh, low, starting 0.5 s early | "whoosh deep slow", "low pass transition" |
| they meet | one warm low note, no transient | "soft impact warm", "sub hit soft" |
| "Live now at Harvard" | quiet airy whoosh, the smallest one | "whoosh light airy short" |

Plus, under the slow fill, one long quiet bed — the reference's A1 track — rather than
the stretched whoosh the script fakes today.

### Decided / open

- **Decided:** identity of sounds may come from a reference; the audio never does.
- **Decided:** BBC archive is out, on licence grounds.
- **Open:** whether to pay for Epidemic Sound ($15/mo) or build the kit free from
  Sonniss + Pixabay. Free first; the owner hasn't heard either yet.
- **Open:** the script still places one sound per character. Changing to per-word
  bursts means changing how `intro-sound.mjs` reads `intro-times.json`.
