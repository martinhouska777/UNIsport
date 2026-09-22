# Instagram and social media for UNIsport

Setting up the account, who it is for, which email it lives on, and what goes on it.

Written for the product owner, who does not read code. Plain English throughout.
If a Claude session picks this up on another machine: the **Checklist** at the bottom
is the live state — read it first to see what is already done.

Related files: `EMAIL.md` (the domain mailbox, not finished yet), `LANDING.md`
(the public page the bio link points at), `VIDEO.md` (the app's own video work).

---

## 1. What this account is

**It is UNIsport's account.** The product, in English.

Corrected 2026-09-22. An earlier version of this file built the whole thing around
admissions content under a personal handle. That was wrong and has been removed.

- **One account, named UNIsport, in English.**
- **The content is the product**: the app, the gyms, the crews, training, the people
  using it. Screen recordings, footage, before/after, build-in-public.
- **You appear in it when it helps** — talking to camera about what you are building —
  but as the founder of UNIsport, not as the subject.
- **Czech stays on your personal account**, which is a separate thing entirely.

---

## 2. The handle and the name

**Checked live on 2026-09-22.** Instagram and TikTok were asked for each name directly;
a free handle answers "Profile isn't available" / "Couldn't find this account".

| Handle | Instagram | TikTok |
|---|---|---|
| **`@unisportapp`** | **free** | **free** |
| `@getunisport` | **free** | **free** |
| `@unisport.team` | **free** | not checked |
| `@unisporthq` | **free** | not checked |
| `@unisport.app` | free — but see below | not checked |
| `@unisport` | **TAKEN** — Unisport.dk, Danish football retailer, 453K followers | **TAKEN** — dead account, 6 followers |

`@unisport` is not gettable on either platform. On Instagram it is the same company as
the `unisport.com` domain in `EMAIL.md` §2 — a real business with half a million
followers.

### Taken: `@unisportapp` ✅

The account exists as of **2026-09-22**. The handle is live on the site too: it is in
`lib/landingCopy.ts` (`contact.socials`), which draws the "Find us" row on /contact and
the follow button at the end of the waitlist.

Why it was the right one of the two:

Free on both platforms, so the name is the same everywhere.

**Why not `@getunisport`**, which an earlier draft of this file recommended: the "get"
prefix exists only to dodge the taken `.com`. It is a **URL artifact, not a name**. A
handle is said out loud and tagged, not typed into a browser — "check out @getunisport"
reads like an advert, "@unisportapp" reads like an identity. It is also what people
actually guess: someone hears the name, tries `@unisport`, finds the football shop, and
guesses `@unisportapp` next. Nobody guesses "get". The bio link carries the domain; the
handle does not have to.

**Avoid `@unisport.app`.** It looks clean, but `unisport.app` is a real domain owned by
somebody else (`EMAIL.md` §2). The handle would point people at a stranger's parked page.

### The Name field (limit 30) and the bio (limit 150)

Shaped after **Hevy** (`@hevyapp`), which the owner pointed at 2026-09-22 as the model:
handle with an `app` suffix, a name that is *product + what it does*, and a two-line bio.

**The match is the pitch.** `db/matching.sql` scores two halves — AFFINITY (interests 18,
concentration 12, origin 12, languages 8) and LOGISTICS (activity 12, gym 12, level 12,
schedule 8, training 6). The affinity half is the differentiator; no other gym app has it.
The bio should name it, not the gyms.

#### Name — Hevy's is `Hevy - Gym Workout Tracker` (26)

> Recommended: **`UNIsport - Training Partners`** — 28 characters

| Alternative | Chars | |
|---|---|---|
| `UNIsport - Find Gym Partners` | 28 | Puts "gym" in for search |
| ~~`UNIsport - Find Training Partners`~~ | **33** | Does not fit |
| ~~`UNIsport - College Gym Partners`~~ | **31** | Does not fit |

Small trap: the Name field can only be changed **twice in 14 days**. Do not fiddle.

#### Bio

> **The social app for training partners at college**
> **Matched on your interests, concentration, gym and hours ⬇️**

106 characters. Shorter option, 65:

```
The social app for finding who to train with
Built for college ⬇️
```

**⚠️ The one part of Hevy's structure that cannot be copied.** Their second line is
social proof — *"Join +16 Million people training Hevy"* — and that is the line doing
the persuading. UNIsport has **3 real sign-ins ever**. Do not fake a number: on a single
campus where everyone knows everyone, an inflated figure is found out in a week, and it
breaks the same trust as the Harvard rule in §7B. So line 2 explains **how the matching
works** instead, which is the thing Hevy genuinely does not have. When the numbers are
real, that is the line they go on.

**Also copy their category label.** The grey "App page" above Hevy's bio is free real
estate that comes from setting a Creator category — pick one in Step 3.

### The profile picture — done, pick a ground

**The logo IS decided** (an earlier note in this file wrongly said otherwise): the mark
is a **U split down the middle, each half a person** — own leg, own head — one navy
`#2f3b52`, one blue `#1f32c1`, on white. Chosen 2026-09-19 and already shipping as the
app icon, the Apple touch icon and the favicon. `mockups/logo/_icons.mjs` draws it.

`mockups/logo/_profile.mjs` renders it for social, in three grounds, at 1080x1080 —
`mockups/logo/profile/`. Run `node mockups/logo/_profile.mjs` to rebuild.

A profile picture is not an app icon, for two reasons:

1. **It is shown as a circle.** The icon centres the mark at 0.56 of the width, which is
   right when the corners are usable. In a circle they are not, so the mark runs at 0.62.
2. **It sits on a white feed.** The white ground was chosen for the app icon knowing it
   can vanish into a pale wallpaper. On Instagram that is not a risk, it is a certainty —
   a white disc on a white feed has no edge at all.

| | Ground | The trade |
|---|---|---|
| **A** | white `#ffffff` | Identical to the app icon. No visible edge in the feed |
| **B** | page blue-grey `#ebf0f6` | Holds an edge, keeps both mark colours. The Zone 1 page colour |
| **C** | navy `#2f3b52` | Strongest at 40px. But the split becomes white + lifted blue, so it tells a different colour story from the app icon |

All three survive 40px, which was the thing worth checking. **Owner picks.**

### Personal handles, if a separate personal account is ever wanted

Checked at the same time and all free on Instagram: `@martinatharvard`,
`@martinfromharvard`, `@czechatharvard`, `@martin.at.harvard`, `@martin.harvard`,
`@internationalatharvard`, `@europeanatharvard`. The first three are free on TikTok too.
Taken: `@martinhouska`, `@martin.houska`, `@harvardmartin`.

Not part of this plan. Recorded only so the check does not have to be redone.

---

## 3. Which email

Short answer: **a new email just for this**, ideally on **Outlook.com** — free, five
minutes. Gmail and Yahoo are both maxed out for you (see below).

That address is the **login** for Instagram and TikTok. It is never shown to anyone.

**One address covers Instagram and TikTok.** Both sign in happily with the same email,
whoever provides it.

**YouTube is the exception** — a YouTube channel *is* a Google account, so it cannot
live on an Outlook address. Since making another Google account is the thing that is
blocked, the answer there is a **brand channel on the Google account you already have**:
YouTube lets one Google account own several channels, each with its own name and
picture, so the channel can be called UNIsport. Nothing to create. Do it when you
actually want to post there.

**And none of it is permanent.** The email on an Instagram or TikTok account can be
changed in settings at any time. If you want `social@getunisport.com` on it once Zoho is
finished, you swap it then.

### Why not `martinhouska777@gmail.com`

It works, but it tangles a business asset up with everything else you own. This account
is company property — it should outlive any one person's personal inbox. That address is
also already your Zoho, GitHub and Vercel. One address holding all of it is one thing to
lose.

That said: **it is survivable.** Instagram allows a few accounts per address now, and the
email can be swapped later. If the choice is between the personal email tonight and
nothing for a week, use the personal email.

### Why not `martin@getunisport.com`

Because **it does not exist yet.** Every box on the `EMAIL.md` checklist is still
unticked — the Zoho signup is stuck on their paid-only plan chooser. Do not wait for it.

And even once it exists, it is the wrong thing to hang account recovery on: Zoho's free
plan has **no IMAP**, so that mail only opens in Zoho's own app, and a password-reset
code you cannot reach in a minute is how people lose accounts. It is also a brand-new
domain — if its DNS ever breaks, you lose the recovery address for every social account
at the same moment as everything else.

### Where `getunisport.com` DOES belong

On the **profile itself**. An Instagram Creator account has a public "Email" contact
button — that is where `hello@getunisport.com` goes, once `EMAIL.md` step 5 is done.

**Login address is private, public contact address is the domain.** Two different jobs.

### Gmail and Yahoo are maxed out

Noted 2026-09-22. That cap is **per phone number**, not per person, and it usually frees
up later. Not worth fighting.

| Provider | Free? | Reclaims a dormant account after | Notes |
|---|---|---|---|
| **Outlook.com / Hotmail** | yes | **2 years** — the most forgiving | **Recommended.** Trusted everywhere, good phone app, authenticator 2FA |
| Proton Mail | yes | 1 year | Good second choice. Free plan has no IMAP, same as Zoho |
| Yahoo | yes | not clearly documented | Works, but weakest security reputation after its breaches. Skip it |
| iCloud | yes | — | You may already have one via your Apple ID; nothing to create |
| `mail.com`, GMX, temp-mail | — | — | **Avoid.** Instagram and TikTok flag these at signup — verification loops or an instant ban |

**This problem disappears once `EMAIL.md` is finished.** `social@getunisport.com` is then
a free alias on your own domain, as are as many more as you want.

---

## 3b. Where the logins are kept

### ⚠️ Never in this repo

**`github.com/martinhouska777/UNIsport` is a PUBLIC repository.** Verified 2026-09-22 by
asking GitHub for it with no login at all: `"private": false`. Every file in it is
readable by anyone on the internet.

And git history is permanent. A password committed once stays recoverable from the
history even after the line is deleted. So: **no password, no backup code, no API key
ever goes in a file here.**

(Checked at the same time, and all fine: `.gitignore` already covers `.env*` and
`*.env`, `feed.env` is untracked, and the only committed env file is the example
template. Nothing is leaking today.)

### The password goes in a password manager

**Bitwarden** is the pick — free forever, works on Windows, iPhone and in the browser,
and syncs between them. The password saving built into Windows or Chrome works too. The
point is only that it is not a file.

The **2FA backup codes** go in there as well, or on paper. Not in this repo.

### What CAN be tracked safely — the account register

None of this is secret, and all of it is annoying to reconstruct later.

| | Value |
|---|---|
| Login email | TO FILL IN |
| Email provider | Outlook.com / Microsoft |
| Instagram handle | `@unisportapp` |
| Instagram account type | Creator |
| TikTok handle | TO FILL IN |
| YouTube channel | a brand channel on the existing Google account — see §3. TO FILL IN |
| 2FA method | authenticator app |
| Where the password lives | Bitwarden (or: TO FILL IN) |
| Where the backup codes live | TO FILL IN |
| Public contact address on the profile | `hello@getunisport.com` — blocked on `EMAIL.md` |

---

## 4. Who does what

**Claude cannot do the first five minutes.** Creating an account, setting a password,
entering a password and accepting the terms are things a person has to do — that is a
hard limit here, not a missing feature. Same as with Zoho in `EMAIL.md`.

Everything after it — writing the bio, drafting captions, planning the videos, editing
footage, checking the profile reads well — is shared.

---

## 5. Step by step

### Step 1 — The email (you, 5 min)

`signup.live.com` → create an Outlook address. A password you do not use anywhere else,
saved straight into Bitwarden. Turn on 2-step verification on it **first** — every
account below recovers through it.

### Step 2 — The Instagram account (you, 5 min)

Sign up **in the phone app**, not the website. Instagram trusts phone signups more, and
a brand-new account made in a desktop browser is likelier to get an instant verification
challenge.

- Email: the new address
- Full name → the Name field: `UNIsport - Training Partners`
- Handle: `@unisportapp`
- Skip the "find your contacts" step

### Step 3 — Make it a Creator account, NOT a Business account (you, 1 min)

Settings → Account type and tools → Switch to professional account → **Creator**.

**This matters more than it looks.** Business accounts are restricted to a royalty-free
music catalogue — they **cannot use trending commercial songs** in reels. Creator
accounts can. For a reels-led account that is a large, permanent handicap, and switching
later does not un-mute videos you already posted.

You only need Business for paid ads or a shop. Neither applies yet.

### Step 4 — The profile (together)

- **Profile picture**: the logo — see §2, it is not decided. Wordmark on brand colour for now.
- **Name field**: as above. This is what gets searched.
- **Bio**: three short lines. What the app is, who it is for, what the link does.
- **Link**: `getunisport.com/waitlist` — see §5b. NOT the bare domain: the landing page
  sends people to a sign-up they cannot finish yet.
- **Contact button**: `hello@getunisport.com` once `EMAIL.md` is done.

### Step 5 — Lock it down (you, 5 min)

- **2FA with an authenticator app, not SMS.** Settings → Accounts Centre → Password and
  security → Two-factor authentication → Authentication app.
- **Not SMS specifically because of your situation**: a Czech number you may stop using,
  or a US number you may switch, and the account is gone. SIM-swap theft is routine.
- **Save the backup codes** somewhere that is not your phone.

### Step 6 — Reserve the handle on TikTok and YouTube (you, 5 min)

Same vertical video posts to all three with no extra editing, and handles are
first-come. Even if you never post there, take the name now.

---

## 5b. The link in the bio — the waitlist

**`getunisport.com/waitlist`**. Built 2026-09-22.

### Why the bio link is not the landing page

The landing page's main button says **"Get started with .edu"** and leads to a real
sign-up. Somebody who finishes it today is alone in an empty app — no partners to match
with, no one on the leaderboard, nothing in the feed. They look once and never come back,
and you cannot un-spend a first impression.

So the Instagram link goes to a list instead: everybody who joins is let in **on the same
day**, so the first morning has people in it. That is what the page says, in those words.

### What it is

One screen. First name, email, one button. It asks for a Harvard address because Harvard
opens first, but it **accepts anything** — the Instagram account will reach students at
schools the app has not got to yet, and turning them away loses them for good. The school
is worked out from the email domain by itself, so the list sorts into "ready" and "not
yet" with no extra question on the screen.

When they are done, the last thing on the screen is **Follow @unisportapp**. Instagram
feeds the list; the list feeds Instagram back.

### Where the names go

Your own database — the `waitlist` table (`db/waitlist.sql`, already applied). Nobody can
read that list through the website, not even a signed-in user: it can only be added to.
**To see it: Supabase → Table editor → `waitlist`.** Columns: email, first name, school,
source, and when they joined.

### Two versions of the link

| Where | Link |
|---|---|
| **The bio** | `getunisport.com/waitlist` |
| **A story sticker, a comment, a DM** | `getunisport.com/waitlist?from=ig-story` |

The bare link is for the bio, because a profile link with a `?` on the end looks like
tracking and people are right to distrust it. The tagged one is for places the address is
never shown anyway — the sticker just says "link" — and it fills the `source` column, so
you can tell which posts actually bring people in. `?from=` accepts `ig`, `ig-story`,
`tiktok` and `site`; anything else is ignored rather than stored.

### Two doors on purpose, while the owner compares them

**This is a REVIEW state, not a final answer (2026-09-22).** The page was briefly all
waitlist and everything is in place to make it so again; the owner asked for the two side
by side first, so:

| Where | Says | Goes to |
|---|---|---|
| **Top right of the bar** | Join the waitlist | `/waitlist` |
| **The big button in the middle** (and the student view's, and the one under the features) | Get started with .edu | `/login?mode=signup` |

So the page does currently say two different things on one screen, knowingly. Whoever
picks this up: ask before "fixing" it.

**Switching to all-waitlist is two lines** — `hero.primaryCta` and `hero.primaryHref` in
`lib/landingCopy.ts` (commit efbb3ba did exactly that and was reverted for the comparison).
Every public button reads them, so all four move together, and launch day is those same two
lines going back to "Get started with .edu" / `/login?mode=signup`.

### How the owner gets in while a waitlist is up

**"Log in", top right — untouched, and that screen has its own Sign up.** Both doors in
one: his existing account, or a new `.edu` one for anybody he wants to let in early. The
`.edu` rule in `lib/universityEmail.ts` has never changed. Direct address:
`getunisport.com/login`.

### How he READS the list

**Supabase → the `wavxyrgtaotrhnyepyor` project → Table editor → `waitlist`.** Not through
the website: the table has no read policy at all, on purpose, so nobody can pull other
people's email addresses out of the site. The dashboard is the only door, and it shows
email, first name, school, source and when they joined. If that gets annoying, the thing to
build is a private in-app view gated to his own account — not a loosening of the table.

---

## 6. The videos

What is already on this machine:

- **CapCut** (phone) — what nearly everyone uses for reels. Fastest by far for 9:16,
  captions and trending audio. Start here.
- **DaVinci Resolve** — already installed, free version, and a Claude session can drive
  it through the MCP bridge. Worth it for anything longer or more careful. Never buy
  Studio.
- **ChatCut** — also connected in this session.

Two things that are not obvious:

- **Burn the captions in.** Most of the audience watches with the sound off.
- **The first 1.5 seconds decide everything.** Not an intro, not "hi guys" — the thing
  itself, immediately.

### 6b. The post kit — what is already made (2026-09-22)

Everything below is drawn from the app's REAL screens, shot signed in, in dark mode,
in the look the owner picked from the reference reels. Every line of text is the
website's own wording. Rebuild any of it with the script named; the screens need a
signed-in session (`scripts/landing/save-cookie.mjs --fresh`, then
`scripts/social/capture.mjs`).

| What | Where | Script |
|---|---|---|
| 7-slide feed carousel | `mockups/social/carousel/` | `scripts/social/carousel.mjs` |
| 8 single posts, 4:5 | `mockups/social/posts/` | `scripts/social/posts.mjs` |
| the same 8 as stories, 9:16 | `mockups/social/stories/` | `scripts/social/posts.mjs` |
| 12 transparent overlays for talking-head footage | `mockups/social/overlays/` | `scripts/social/overlays.mjs` |
| 6 feature clips + hook + end card, 9:16 | `mockups/video/clip-*.mp4` (not in git) | `scripts/social/clips.mjs` |
| the 23 s launch reel | `mockups/video/unisport-reel.mp4` (not in git) | `scripts/video/reel.mjs` |

**The posts:** 01 waitlist ("Get in on day one." + the link) · 02 the headline
("Your campus. Your gym. Your people.") · 03 Match · 04 Why you match · 05 Plan in the
chat · 06 Leaderboards · 07 Gyms · 08 founder — a template with an empty photo slot for
the owner's own picture, added in the phone.

**Not in the kit, on purpose: Varsity Mode.** Its captures carry "Harvard Rowing", the
shield and the squad's real names (§7B). A varsity post needs a demo team with invented
rowers first.

### 6c. The reels with the owner on camera

The pattern is **face → clip → face**: he says one sentence to camera, the matching
`clip-*.mp4` shows the screen for 3–5 s, back to him. Overlays go on the face shots:
`tag-founder` on his first appearance, `phone-<screen>` while he talks about a feature,
`split-<screen>` when the screen should stay up while he keeps talking. Captions burned
in, in CapCut.

Three to start with, each 20–30 s:

1. **Why I built it** — `clip-hook` (2.6 s) → him: the first sentence of the About
   page, in his words ("I often found myself…") → `clip-match` → him: what the match
   is scored on → `clip-plan` → him: "the link is in the bio" → `clip-end`.
2. **How the match works** — him: "It is not who is free, it is who fits" → `clip-why`
   with the person screen → him, with `split-person` up: interests, concentration,
   level, language, hometown → `clip-end`.
3. **The waitlist** — `clip-waitlist` → him, `phone-match` beside him: everyone on the
   list gets in on the same day, so the first morning is not an empty gym → `clip-end`.

He does not read a script; the beats above are the order, the words are his.

---

## 7. Two things to get right

### A. Who can actually sign up — better news than expected

Checked in the code 2026-09-22:

- Signup accepts **any address ending in `.edu`** (`lib/universityEmail.ts`), so any US
  university student can get in. `EXTRA_DOMAINS` is empty, so nothing outside `.edu` can.
- **All eight Ivies are real in the app**, not just Harvard — Harvard, Yale, Princeton,
  Penn, Brown, Columbia, Cornell, Dartmouth each have a full theme in `lib/themes.ts`
  **and** their own gyms in `lib/gyms.ts`.

So for a UNIsport account aimed at college students, the link in the bio works. That is
the audience, and they all have `.edu` addresses.

**The real edge:** a student at a `.edu` that is *not* one of those eight can sign up,
but `gymsFor()` falls back to Harvard's gyms, so they would see a campus that is not
theirs. Market to the eight, not to "US students" in general, until that is handled.

**Not for applicants.** High-school students have no `.edu` and cannot sign up at all.

### B. Never say or imply that Harvard uses UNIsport

The standing rule from the Italy pitch work, and far more dangerous on a public account
than in a PDF:

> "I'm a student at Harvard and I row" is fine. **"Harvard uses it" is a lie** that would
> get out, because rowing is a small world.

It is a trademark question too — universities restrict commercial use of their name and
marks. Do not put a shield on the product or let a video imply endorsement.

The real number today is 3 students who have ever signed in. Say what is true.

---

## 8. Ideas

Owner's dump area — put ideas here in any form, no structure needed.

<!-- YOUR IDEAS BELOW -->



<!-- END -->

### Seed list (suggestions only — delete freely)

The product:

- One feature, 15 seconds, screen recording, no voiceover, good music
- The crew card being built — a boat filling up seat by seat
- Logging a session, start to finish, in real time
- The leaderboard after a week of a house challenge

The people:

- The boathouse at 5am — what training here actually looks like
- Two people matched as training partners, and what happened next
- A coach seeing their squad's week in one screen

Build in public:

- One thing that broke this week
- Why the app has no levels and only points
- Designing the same app for eight different schools' colours

---

## 9. Checklist — the live state

- [x] Handle taken on Instagram — `@unisportapp` (§2)
- [ ] Same handle reserved on TikTok (§2)
- [ ] New Outlook address created, 2-step verification on it
- [ ] Bitwarden installed, password saved there
- [x] Instagram account created — `@unisportapp`, 2026-09-22
- [ ] Switched to **Creator** (not Business)
- [ ] Profile picture — three rendered, pick a ground (§2)
- [ ] Name field and bio written
- [ ] 2FA via authenticator app, backup codes saved
- [ ] TikTok handle reserved, YouTube brand channel made
- [ ] Contact button set to `hello@getunisport.com` — blocked on `EMAIL.md` step 5
- [x] Waitlist built, and the bio link decided — `getunisport.com/waitlist` (§5b)
- [ ] Bio link actually pasted into the profile
- [ ] First video posted — the kit is ready (§6b), the face footage is his to shoot

**Status 2026-09-22 (evening):** the Instagram account EXISTS — `@unisportapp`. The
handle is live on the website's Contact row, and the waitlist it should link to is built
and working: `getunisport.com/waitlist` (§5b). Profile pictures are still waiting on a
choice of ground, TikTok is still unreserved, and the one open question is whether the
landing page's own button should point at the waitlist too.
