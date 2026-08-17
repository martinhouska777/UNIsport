# Prompt — Visual design audit of the UNIsport app

Paste this into a fresh chat (or say "run the visual design audit") whenever you want
another pass over how the app *looks and feels*, rather than what it does.

---

Act as the visual design lead for this app — a white-label university fitness PWA.
You are not adding features and you are not fixing logic. You are judging craft.

**First, read the app as it is built.** Do not guess. Go through the real code:

- `app/globals.css` and `lib/themes.ts` — the token system (this is the source of truth
  for colour; `CLAUDE.md` rule 1 forbids hardcoded hex in components).
- Every screen under `app/(app)/`, `app/varsity/`, `app/onboarding`, `app/login`.
- The shared chrome: `components/BottomNav.tsx`, `SideNav.tsx`, the bottom sheets.
- Count what is actually in use. Run greps for the things a design system standardises:
  `rounded-*`, `text-[Npx]`, `font-*`, `active:*`, `transition*`, `duration-*`,
  `shadow*`, and token colours with an opacity suffix (`bg-primary/15` and friends).
  Numbers make the argument; adjectives don't.

**Then judge these six things, in this order of importance:**

1. **What each colour MEANS.** A colour used for five different jobs communicates
   nothing. Find every distinct job `--primary` / `--accent` are doing and say which
   ones they should keep. Check real contrast ratios, including interactive fills
   against the page ground (WCAG needs 3:1 for a control's own shape, 4.5:1 for text).
2. **Tap feedback.** Every single tappable thing must visibly react the instant a
   finger lands, before any data moves. Count the buttons; count the ones with a press
   state. Name the ones that need a celebration (toggles, ratings) rather than a dim.
3. **Buttons.** How many different ways does the same action get styled? Propose one
   set of variants and sizes, with real pixel heights and a 44px minimum touch target.
4. **Type.** How many sizes exist, and how many are below the legibility floor (11px)?
   Where text is too small, ask whether the *layout* is wrong rather than the type.
5. **Shape, elevation, spacing.** How many corner radii? Is there any sense of a card
   sitting above the page, or is everything one flat plane of 1px borders?
6. **Motion.** Page transitions, sheet entrances, loading states. Are there skeletons
   or is it the word "Loading…"?

**Rules for your recommendations:**

- Every fix must land as a **token or a shared component**, never as a per-screen patch.
  If a school with a pale primary would break your fix, the fix is wrong.
- Respect the two zones: Zone 1 (pre-login) is neutral brand only; Zone 2 is one
  university's runtime theme.
- Respect `prefers-reduced-motion`, and keep the 16px input rule (phones auto-zoom).
- Give file paths and line numbers for every claim, and a concrete replacement value.
- Rank the work by how much the app improves per hour spent, and say what each item
  costs.

**Deliver it as a published Artifact** rendered in the app's own dark palette, with
the proposed buttons and press animations *live on the page* so they can be tapped on
a phone. The product owner reviews visually and does not read code — the page must be
understandable without opening the repo. Then summarise it in plain English in chat.
