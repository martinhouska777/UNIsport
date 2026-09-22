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
| **`@getunisport`** | **free** | not checked yet |
| `@unisportapp` | **free** | not checked yet |
| `@unisport.app` | **free** | not checked yet |
| `@unisporthq` | **free** | not checked yet |
| `@unisport` | **TAKEN** — Unisport.dk, Danish football retailer, 453K followers | — |

`@unisport` is not gettable. It is the same company as the `unisport.com` domain in
`EMAIL.md` §2 — a real business with half a million followers.

### Recommended: `@getunisport`

Because it is **the same word as everything else you own**: the site is
`getunisport.com`, the email will be `hello@getunisport.com`, and the handle matches
both. One name, spelled one way, everywhere. Nobody has to remember which variant.

`@unisportapp` is the reasonable alternative if "get" bothers you. Check both on TikTok
before committing — the handle should be the same on both platforms.

### The Name field — not the same thing as the handle

Instagram **searches the Name field**, which most people do not realise. The handle is
the address; the Name field is where the words people actually type go.

> Recommended: **`UNIsport · train with your team`**

Or whatever one-line description of the app you prefer — the point is that "UNIsport"
alone tells a stranger nothing, and the search only sees this field.

Small trap: the Name field can only be changed **twice in 14 days**. Do not fiddle.

### The profile picture is a real blocker

A brand account needs a logo, and **the logo is not decided.** Four directions were
drawn up (Wordmark / Gate / Pennant / Partners, in `mockups/logo`) and none was picked;
the app icon is still a blank navy square.

Do not let this stop the account being created — a plain wordmark on the brand colour is
fine for now and can be swapped any time. But it is the one asset that is genuinely
missing.

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
| Instagram handle | TO FILL IN |
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
- Full name → the Name field: `UNIsport · train with your team`
- Handle: `@getunisport`
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
- **Link**: `getunisport.com`.
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

- [ ] Handle confirmed on TikTok as well as Instagram (§2)
- [ ] New Outlook address created, 2-step verification on it
- [ ] Bitwarden installed, password saved there
- [ ] Instagram account created in the phone app
- [ ] Switched to **Creator** (not Business)
- [ ] Profile picture — blocked on the logo decision (§2)
- [ ] Name field and bio written
- [ ] 2FA via authenticator app, backup codes saved
- [ ] TikTok handle reserved, YouTube brand channel made
- [ ] Contact button set to `hello@getunisport.com` — blocked on `EMAIL.md` step 5
- [ ] First video posted

**Status 2026-09-22:** nothing created yet. Strategy corrected to a UNIsport product
account (the earlier admissions plan is gone). Handles checked live — `@getunisport` is
free on Instagram. Blocked on nothing except the logo, which should not hold up creating
the account.
