# Email on the UNIsport domain

Setting up **martin@getunisport.com** (and `hello@`, `team@`, …) using **Zoho Mail**.

Written for the product owner, who does not read code. Plain English throughout.
If a Claude session picks this up on another machine: the **Checklist** at the bottom
is the live state — read it first to see what is already done.

---

## 1. The starting position (re-verified 2026-09-20)

| Thing | State |
|---|---|
| Domain | **getunisport.com** — owned, live, what the app links to everywhere |
| Who runs its DNS | **Vercel** (nameservers are `ns1.vercel-dns.com` / `ns2.vercel-dns.com`) |
| Mail records (MX) | **None yet** — clean slate, nothing to undo |
| Existing TXT record | One `google-site-verification=…` from Google Search Console — **must not be deleted** |
| Other records | Two CAA records (`pki.goog`, `sectigo.com`) — leave them alone |

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

## 3. Which provider, and what it costs

**Decision 2026-09-20: Zoho Mail, Forever Free plan. $0.**

Google Workspace was started and abandoned partway through signup — no account was
created, no card was entered, nothing to cancel. The reasoning is below so it does not
get re-litigated every time someone opens this file.

| | Zoho Free | Zoho Mail Lite | Google Workspace Starter |
|---|---|---|---|
| Price | **$0 forever** | $1–1.25/user/month, billed yearly (**$12–15/yr**) | ~$7/user/month (**~$84/yr**) |
| Card needed to start | **no** | yes | yes (free 14 days, then auto-charges) |
| Own address + proper DKIM signing | yes | yes | yes |
| **IMAP / POP / ActiveSync** | **NO** | **yes** | yes |
| Read it in the Gmail app | **no** — Zoho webmail or Zoho app only | yes | yes |
| Users included | up to 5 | any | per user |
| Mail storage | 5 GB/user | 5 GB ($1) or 10 GB ($1.25) | 30 GB/user |

**What the recipient sees is identical in all three.** A university gets
`martin@getunisport.com`, SPF/DKIM/DMARC-signed, in their inbox. Zoho is a real mail
host, not a forwarding trick. Nobody on the other end can tell which row of that table
we picked.

**The one real cost of Free is the missing IMAP.** It means the mail lives in Zoho's own
webmail and Zoho's own phone app — never the Gmail app — and no outside tool (mail merge,
CRM, Gmail "send as") can send on your behalf.

**If that chafes, the fix is ~$12 a year, not $84.** Mail Lite adds IMAP/POP/ActiveSync
and can be upgraded to in place, at any time, without changing the address or redoing any
DNS. That is the intended escape hatch — reach for it before reaching for Google.

Whatever the plan: pay for **one** mailbox. `hello@`, `team@`, `support@`, `info@` are
then **free aliases** that all land in that same inbox.

### The free plan is deliberately hard to find

Zoho's Forever Free plan is **not shown** in the normal org-creation flow — that flow
offers only Mail Lite / Mail Premium / Standard / Professional. It is reached only from
the bottom of `zoho.com/mail/zohomail-pricing.html` → *Sign Up Now*, or directly at
`workplace.zoho.com/signup?type=org&plan=free`.

It is also "available only in select data centers". If the account lands in a data centre
that does not offer it, the fallback is Mail Lite at ~$12–15/yr.

---

## 4. Who does what

Three things Claude cannot do, and they are all in the first five minutes:
**creating/signing into the account, setting the password, accepting the terms.**
Those are the owner's. Buying a plan is the owner's too.

Everything after that — DNS records, checking they took effect, the anti-spam setup —
Claude can do or verify.

**Two snags hit on 2026-09-20:**

1. `martinhouska777@gmail.com` **already has a Zoho account** from some earlier signup.
   Do not create a second one — sign in to the existing account and add the organisation
   and domain to it.
2. Claude drives one specific Chrome window via the browser extension. If the owner signs
   in to Zoho in a *different* window or profile, Claude cannot see it. Sign in inside the
   window Claude is already driving, or Claude is reduced to reading screenshots.

---

## 5. Step by step

### Step 1 — Get into Zoho (owner)

Sign in at **zoho.com** with `martinhouska777@gmail.com` (password reset if needed), then
start org setup via the free-plan link above, choosing **"add an existing domain"** →
`getunisport.com`. Organisation name: `UNIsport`.

### Step 2 — Verify the domain

Zoho shows a **TXT record** (and offers CNAME/HTML alternatives — TXT is simplest).
Add it in Vercel → Domains → getunisport.com → DNS Records.

**Do not delete the `google-site-verification` record already there** — Search Console
uses it. Several TXT records can sit side by side happily; deleting the old one breaks the
Google search setup.

### Step 3 — Mail (MX) records

**Copy exactly what Zoho's wizard shows**, not what any guide says — the hostnames differ
by which data centre the account lands in (`…zoho.com` vs `…zoho.eu`). Typically three
records at priorities 10 / 20 / 50. Same place in Vercel.

Then wait. Usually minutes, occasionally a couple of hours.

### Step 4 — The three anti-spam records

**The step everyone skips, and then wonders why their email goes to spam.** All three are
TXT records added in Vercel. Again: take the exact values from Zoho's own screens, because
they are data-centre specific.

**SPF** — "Zoho is allowed to send as me."

| Field | Value |
|---|---|
| Type | TXT |
| Name / Host | `@` (the bare domain) |
| Value | `v=spf1 include:zoho.com ~all` (or `include:zoho.eu` — whichever Zoho shows) |

If an SPF record already exists, **do not add a second one** — a domain may only have one.
Merge the `include:` into the existing one instead.

**DKIM** — cryptographically signs outgoing mail. **Off by default; must be switched on.**

1. Zoho Mail admin console → **Domains → getunisport.com → Email Configuration → DKIM**
2. Add a selector (Zoho's default is usually `zmail`) and let it generate the key
3. It gives a host (e.g. `zmail._domainkey`) and a long value → add as TXT in Vercel
4. Come back and press **Verify**

**DMARC** — tells receiving servers what to do with fakes. Start permissive, tighten later.

| Field | Value |
|---|---|
| Type | TXT |
| Name / Host | `_dmarc` |
| Value | `v=DMARC1; p=none; rua=mailto:martin@getunisport.com` |

Once mail has been flowing for a few weeks with no problems, change `p=none` to `p=quarantine`.

### Step 5 — Aliases

Zoho admin console → Users → the account → **Mail Alias**.
Add `hello@`, `team@`, whatever is wanted. Free, and they all arrive in the one inbox.

### Step 6 — Reading it

On Free: **Zoho Mail webmail** in a browser, plus the **Zoho Mail** app on the phone.
The Gmail app will not work — that needs IMAP, which is the Mail Lite upgrade.

---

## 6. Things that would otherwise surprise you

- **Adding MX and TXT records does not touch the website.** The records pointing
  `getunisport.com` at Vercel are a different type and stay exactly as they are. Nothing
  about the app, the deploys or the landing page changes.
- **A brand-new domain has no sending reputation.** Do not email 200 universities on day
  one — that is the fastest way to get the domain flagged. A handful a day for the first
  couple of weeks.
- **Free-plan sending caps are lower than Google's** (well under 2,000/day). Fine for
  hand-written outreach; a wall for any bulk campaign. Exact figure not confirmed —
  Zoho's published help page for it 404s.
- **Not in scope here:** the emails the *app itself* sends (login links, invites) currently
  come from Supabase's default sender, not from this domain. Changing that is a separate job
  with a separate provider, and it should send from a **subdomain** (e.g.
  `mail.getunisport.com`) so a bad campaign cannot poison the reputation of the domain that
  personal email goes out on. Later, not now.
- **Unrelated but spotted 2026-09-20:** Vercel shows *"the billing address on your payment
  method is missing or incomplete"*. The domain auto-renews 19 Sept 2027; a card that
  cannot be charged is a bad way to lose a domain.

---

## 7. Checklist — the live state

Tick these off as they are done, so any session on any machine can pick up mid-way.

- [ ] Step 1 — signed in to the existing Zoho account, organisation `UNIsport` created,
      `getunisport.com` added as an existing domain, **on the free plan**
- [ ] Step 2 — verification TXT added in Vercel, domain verified by Zoho
- [ ] Step 3 — MX records added, a test email arrives
- [ ] Step 4a — SPF TXT added
- [ ] Step 4b — DKIM generated, TXT added, verified
- [ ] Step 4c — DMARC TXT added (`p=none` for now)
- [ ] Step 5 — mailbox `martin@` created, aliases added (`hello@`, …)
- [ ] Step 6 — Zoho Mail app installed on the phone
- [ ] Later — tighten DMARC to `p=quarantine` after a few quiet weeks
- [ ] Optional — upgrade to Mail Lite if the missing Gmail-app support annoys

**Status 2026-09-20:** provider decided (**Zoho Free**, after pricing out Google at ~$84/yr).
Google signup abandoned mid-flow — nothing created, no card entered, nothing to cancel.
Vercel DNS confirmed clean and reachable, and Claude has the Vercel dashboard open and
logged in. Blocked on Step 1: the owner reached Zoho's paid-only plan chooser, which does
not offer the free plan — see §3 for the free-plan link.
