# Landing page — the scroll story (build brief)

Hand this back as a prompt when you want it built. It is written so the copy can
be lifted straight into the page.

---

## The job

The landing page has one job: a stranger arrives knowing nothing, scrolls with one
thumb, and by the bottom understands **what the app does, who it is for, and why it
is not another fitness tracker**. No paragraphs of explanation — the app explains
itself through real screens, one idea per screen.

**Two separate animations**, not one long one:

- **Animation 1 — the app for every student.** Gyms → people → plan → proof.
- **Animation 2 — Varsity Mode.** The same app, built for the squad you actually
  compete with.

They are independent. Each opens with its own statement, runs its own sequence of
beats in its own phone frame, and closes before the next begins. Nothing carries over
between them — the first one finishes, the page resets, the second one starts.

Why separate rather than one continuous scroll: they are aimed at two different
people. Animation 1 must land completely for a visitor who will never read further,
and Animation 2 has to introduce itself from scratch, as a reveal rather than a
continuation. It also means either can be reordered, shortened or dropped without
touching the other.

**Build it as one component fed by two data sets** — a `ScrollStory` that takes a list
of beats (headline, sub-line, image) and renders the whole mechanic. The beats live in
a data file, never inside the component (rule 7). A third story later is then a data
entry, not new code.

---

## Positioning (why this app exists)

Every fitness app treats you as one person alone with a log. On a campus, training is
neither solitary nor unstructured: it happens in specific buildings, with specific
people, on a schedule someone else often sets. **UNIsport is the only app that knows
your campus.** Everything below is in service of that sentence — never say it outright.

---

## Voice

- Plain, specific, confident. Short sentences.
- Name real things: *Malkin*, *house gyms*, *the 1V*, *Head of the Charles*.
- Never: "seamless", "revolutionise", "elevate", "your fitness journey", "AI-powered".
- Never claim numbers we do not have. No fake user counts, no fake testimonials.

---

## Act 0 — Hero

**Slogan (recommended):**

> # Never train alone.

**Sub:** Every gym on campus, the people worth training with, and the plan that
actually gets you both there.

**Alternates, if the above feels too gym-specific:**
- *Your campus, in training.*
- *Training is a team sport.*

**Buttons:** primary → `/join`, label "Bring it to your university". Secondary, quiet
→ anchor down to the first animation, label "See how it works".

Under the fold indicator, one small line of honesty that doubles as the white-label
pitch:

> Shown in one university's colours. Yours gets its own.

---

## Animation 1 — five beats, five screens

One screenshot per beat. The phone frame **never leaves the screen** — only the screen
inside it changes. That is what makes it read as one app instead of five features.

| # | Headline | Sub-line | Screen |
|---|---|---|---|
| 1 | **Every gym on campus. One list.** | Opening hours, how busy it is right now, and what is actually in the room — including the house gyms nobody has a map of. | Gyms list |
| 2 | **Then it finds your people.** | Sorted by how well you genuinely fit: same gym, same hours, same level, same interests. | Match browse |
| 3 | **And it tells you why.** | Every reason is a real fact off both profiles. No black box, no "you might like". | A person's profile — the *Why you match* checklist |
| 4 | **Agree on a session without leaving the chat.** | One tap proposes it. One tap accepts. It is on both your calendars. | Chat with the session-plan card |
| 5 | **Afterwards, it logs itself.** | You both confirm it happened and the session is written to your log — verified, with the photos from it. | Log session / memories |

**Beat 3 gets the most room.** It is the only thing here no competitor can copy in a
sprint, so let it breathe: more whitespace above and below, slower reveal, and let the
checklist tick in line by line rather than appearing all at once.

**Beat 5 closes the first animation** — the loop shutting. Land on the word *verified*.

---

## Between the two — a full stop, then a new opening

Animation 1 ends. Give it a real ending: the phone frame fades out, the progress rail
goes, and the page returns to plain background. A visitor should feel the section
close.

Animation 2 then opens with its own statement section, full width, no screenshot, no
phone — the same weight as the hero at the top of the page:

> ### And if you train for the university itself —
> # Varsity Mode.
> The app your squad has been running out of a group chat.

Only after that does the second phone frame arrive and its beats begin.

---

## Animation 2 — Varsity Mode, four beats

| # | Headline | Sub-line | Screen |
|---|---|---|---|
| 1 | **Varsity Mode.** | The coach's plan, the boat lineups and the next race — everything that currently lives in a group chat and a PDF nobody can find. | Varsity home: this week + countdown to the Head of the Charles |
| 2 | **Log straight off the plan.** | The session your coach prescribed is already there. You just say what you actually did. | Log screen, prescribed session pre-filled |
| 3 | **See how the squad is training.** | Who did what this month, and where you sit — without having to ask anyone. | Teammate's training month |
| 4 | **Your name, in the boat.** | Lineups published by the coach, on every athlete's phone, the night before. | Published lineup with the 1V |

**Closing on the lineup is deliberate.** A statistics graph is the one screen every
fitness app already has; a seat in a named boat, published by a coach, is the one
screen none of them can show. Stats belong inside beat 2's frame, not as the finale.

---

## Final CTA

> ### One app per university. Yours next.

Button → `/join`. Under it, small: the two-line honest note that it is currently live
for one university and new ones are onboarded by hand.

---

## Motion

The rule: **motion explains, it never decorates.** If an animation does not help the
eye understand the screen it is attached to, cut it.

**Desktop (≥ 1024px)** — two columns.
- Right column: the phone frame, `position: sticky`, vertically centred, never moves.
- Left column: the beats, each roughly one viewport tall.
- As a beat scrolls into the middle band, its screenshot cross-fades in inside the
  phone (opacity 0→1 plus an 8px rise, ~300ms, ease-out) and the outgoing one fades
  under it. Never slide sideways — it reads as a carousel and carousels read as ads.
- A thin progress rail on the far left with one dot per beat; the active dot fills.

**Mobile / tablet (< 1024px)** — single column, no pinning.
- Each beat is a stack: headline, sub-line, screenshot.
- Screenshot enters with opacity 0→1 and translateY 24px→0 across the first 40% of its
  own view timeline. Headline enters ~80ms ahead of it, so the words land first.

**Hero:** slogan and sub rise 12px and fade in on load, 400ms apart. One quiet
scroll cue that bobs, and stops bobbing once the user has scrolled.

**Beat 3 special case:** the *Why you match* rows tick in at 60ms intervals.

**Between the two animations:** the first phone frame fades and scales down 4% as it
leaves, the background steps one surface level darker behind the Varsity Mode opening,
and the second phone frame arrives only after that statement has been read. That is
the entire "reveal" — nothing more.

---

## Non-negotiables

1. **Zone 1 rules apply to the page chrome.** Neutral brand only — no crimson, no gold,
   no university colour anywhere in the page's own design. All colour comes from theme
   tokens (`bg-background`, `bg-surface`, `text-muted`, …), never a hex literal.
   The screenshots themselves obviously show a themed app; that is content, and the
   line under the hero already tells the visitor why.
2. **No external anything.** No CDN scripts, no web fonts from a third party, no
   animation library. CSS scroll-driven animations where the browser supports them
   (`@supports (animation-timeline: view())`), IntersectionObserver adding a class as
   the fallback. Both paths must look right — the fallback is not allowed to be the
   broken one.
3. **`prefers-reduced-motion: reduce` → everything static.** No pinning, no fades:
   headline, sub-line and screenshot, stacked and visible. The story still reads.
4. **Mobile first.** Most visitors arrive from a phone link. Design that layout first
   and treat the desktop pinned version as the enhancement.
5. **Weight budget.** Screenshots ≤ 900px wide, WebP, explicit `width`/`height` on
   every image so nothing shifts as they load. Only the hero image is `priority`.
   The whole section under ~1.5MB.
6. **Text is real text.** Never bake a headline into an image — it has to be
   selectable, translatable and readable by a screen reader.

---

## Done means

- Read it on a phone with sound off and no prior knowledge: you can say what the app
  does in one sentence.
- Every screenshot is of the real app with real data — nothing mocked up in Figma.
- Nothing on the page claims something the app cannot currently do.
