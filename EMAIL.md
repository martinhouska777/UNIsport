# Email on the UNIsport domain

Setting up **martin@getunisport.com** (and `hello@`, `team@`, …) using Google Workspace.

Written for the product owner, who does not read code. Plain English throughout.
If a Claude session picks this up on another machine: the **Checklist** at the bottom
is the live state — read it first to see what is already done.

---

## 1. The starting position (verified 2026-09-19)

| Thing | State |
|---|---|
| Domain | **getunisport.com** — owned, live, what the app links to everywhere |
| Who runs its DNS | **Vercel** (nameservers are `ns1.vercel-dns.com` / `ns2.vercel-dns.com`) |
| Mail records (MX) | **None yet** — clean slate, nothing to undo |
| Existing TXT record | One `google-site-verification=…` from Google Search Console — **must not be deleted** |

Because the nameservers are Vercel's, every record below gets added in **one place**:

> Vercel dashboard → **Domains** → `getunisport.com` → **DNS Records**

That is the *account-level* Domains section, not the one inside the project.

---

## 2. Why this domain, and not the others

`unisport.com` belongs to a Scandinavian sports-equipment retailer (football boots,
handball kit). Not for sale in any realistic sense. Their market is different from ours,
so there is no real conflict in the US — but worth remembering when pitching in Europe,
since that is their home turf.

`unisportapp.com` — **taken.** Someone registered it and sits on it behind Cloudflare:
no website, no email. Buying it would mean tracking down a hidden owner and negotiating.
`unisport.app` is taken too.

**Genuinely free** as of 2026-09-19, if the name is ever revisited:
`unisporthq.com` · `myunisport.com` · `unisportapp.io` · `unisportapp.co` ·
`unisport.team` · `unisport.coach` · `unisport.fitness` · `unisport.ai`

### Site and email stay on the SAME domain

A tempting idea that was considered and rejected: website on one domain, email on another.
Technically easy, practically bad — an email from `martin@somethingelse.com` pointing at
`getunisport.com` is the textbook phishing shape. It is exactly what spam filters weight
and what university IT trains staff to spot, and universities run some of the strictest
mail systems there are. Not worth handicapping the one thing that has to work.

The legitimate version of that instinct: **own spare domains and redirect them all to
getunisport.com** (~$12/year each, five minutes, completely standard). Mail and the main
site still live on one domain.

### Is this decision reversible?

Mostly. The brand name UNIsport is not locked by any of this. A website address can be
redirected later. The one genuinely sticky part is **the email address once it is out in
the world** — on a signature, in a hundred university inboxes. So the thing to avoid is
not picking the "wrong" domain; it is picking one, emailing 50 universities, and *then*
switching.

---

## 3. What it costs

Google Workspace **Business Starter**: roughly **$7–8.40 per mailbox per month** (annual is
cheaper than monthly; the exact price varies by country — check the signup page).
**14-day free trial**, then it bills.

Pay for **one** mailbox. `hello@`, `team@`, `support@`, `info@` are then **free aliases**
that all land in that same inbox. One price, as many public-facing addresses as wanted.

Why pay at all, when free forwarding exists: an email address has two halves. *Receiving*
is easy and can be free. *Sending so it reaches a Harvard athletics director's inbox rather
than their spam folder* is the part worth paying for, and free forwarding handles it badly.

---

## 4. Who does what

Three things Claude cannot do, and they are all in the first five minutes:
**creating the account, setting the password, entering the card.** Those are the owner's.

Everything after that — DNS records, checking they took effect, the anti-spam setup —
Claude can do or verify.

---

## 5. Step by step

### Step 1 — Sign up (owner, ~10 minutes)

Go to **workspace.google.com** → *Get started*. Every question it asks:

| It asks | Answer |
|---|---|
| Business name | `UNIsport` |
| Number of employees | **Just you** — more can be added later, it is per person |
| Country | Whichever country the **payment card** is registered in |
| Do you have a domain? | **Yes, I have one** → `getunisport.com` |
| Current email | `martinhouska777@gmail.com` (recovery address — fine) |
| Username | `martin` → giving **martin@getunisport.com** |
| Password | Owner's choice. Into a password manager — this is the admin account for the whole company's email |

**Get this right:** make the first account a **personal name**, not `hello@`. The first
account created becomes the super-admin and cannot easily be renamed. The generic addresses
come later, as free aliases.

### Step 2 — Verify the domain

Google shows a **TXT record** starting `google-site-verification=`.
Add it in Vercel → Domains → getunisport.com → DNS Records.

⚠️ **Do not delete the `google-site-verification` record already there** — Search Console
uses it. Two can sit side by side happily; deleting the old one breaks the Google search setup.

### Step 3 — Mail (MX) records

Google's wizard shows them. **Copy exactly what the wizard says**, not what any guide says —
Google changed this recently: it used to be five records, now it is usually a single one
(`smtp.google.com`, priority `1`). Same place in Vercel.

Then wait. Usually minutes, occasionally a couple of hours. Google's setup page flips to
"activated" by itself.

### Step 4 — The three anti-spam records

**The step everyone skips, and then wonders why their email goes to spam.** All three are
TXT records added in Vercel.

**SPF** — "Google is allowed to send as me."

| Field | Value |
|---|---|
| Type | TXT |
| Name / Host | `@` (the bare domain) |
| Value | `v=spf1 include:_spf.google.com ~all` |

If an SPF record already exists, **do not add a second one** — a domain may only have one.
Merge `include:_spf.google.com` into the existing one instead.

**DKIM** — cryptographically signs outgoing mail. **Off by default; must be switched on.**

1. Workspace admin console → **Apps → Google Workspace → Gmail → Authenticate email**
2. **Generate new record** (2048-bit)
3. It gives a host (usually `google._domainkey`) and a long value → add as TXT in Vercel
4. Come back and press **Start authentication**

**DMARC** — tells receiving servers what to do with fakes. Start permissive, tighten later.

| Field | Value |
|---|---|
| Type | TXT |
| Name / Host | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:martin@getunisport.com` |

Once mail has been flowing for a few weeks with no problems, change `p=none` to `p=quarantine`.

### Step 5 — Aliases

Admin console → Directory → Users → the account → **Alternate email addresses**.
Add `hello@`, `team@`, whatever is wanted. Free, and they all arrive in the one inbox.

### Step 6 — Reading it

No need to merge anything with the personal Gmail. Add the new account to the Gmail app;
it switches between them like two profiles.

---

## 6. Things that would otherwise surprise you

- **Adding MX and TXT records does not touch the website.** The records pointing
  `getunisport.com` at Vercel are a different type and stay exactly as they are. Nothing
  about the app, the deploys or the landing page changes.
- **A brand-new domain has no sending reputation.** Do not email 200 universities on day
  one — that is the fastest way to get the domain flagged. A handful a day for the first
  couple of weeks.
- **Not in scope here:** the emails the *app itself* sends (login links, invites) currently
  come from Supabase's default sender, not from this domain. Changing that is a separate job
  with a separate provider, and it should send from a **subdomain** (e.g.
  `mail.getunisport.com`) so a bad campaign cannot poison the reputation of the domain that
  personal email goes out on. Later, not now.

---

## 7. Checklist — the live state

Tick these off as they are done, so any session on any machine can pick up mid-way.

- [ ] Step 1 — Google Workspace account created, `martin@getunisport.com` exists
- [ ] Step 2 — verification TXT added in Vercel, domain verified by Google
- [ ] Step 3 — MX records added, Google shows "activated", a test email arrives
- [ ] Step 4a — SPF TXT added
- [ ] Step 4b — DKIM generated, TXT added, authentication started
- [ ] Step 4c — DMARC TXT added (`p=none` for now)
- [ ] Step 5 — aliases added (`hello@`, …)
- [ ] Step 6 — account added to the phone and to the Gmail app
- [ ] Later — tighten DMARC to `p=quarantine` after a few quiet weeks

**Status 2026-09-19:** nothing started yet. Domain confirmed, DNS confirmed clean, decision
made to stay on `getunisport.com`. Next action is Step 1, by the owner.
