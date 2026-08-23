# Prompt for Claude Design — the eight university crests

Paste everything below the line into Claude Design. Run it once for all eight,
or swap in a single row to redo one school.

Why the rules are the rules: the crest ships inside a white-label app, so it
has to re-colour from CSS variables (CLAUDE.md rule 1) and it must never be a
copy of a real university's arms.

---

Design a set of eight university crests for a campus fitness app. They are one
family, not eight one-offs: same shield, same construction, same optical
weight. Only the motif, the letter and the two colours change.

## What each crest is

A heater shield containing:
1. an inner hairline border, inset from the edge (the classic crest device),
2. one simple motif that says which place this is,
3. the school's letter, in a serif display face, as the largest single element.

## Hard rules

- **Original heraldry only.** Do NOT reproduce, trace, or approximate any real
  university's actual coat of arms, seal, motto text, mascot character or
  wordmark. Draw from the *place* — its architecture, landscape, and colours —
  never from the institution's own mark. If a motif you are reaching for
  appears on the real school's shield, pick a different one.
- **Exactly two colours per crest**, and never as literal hex. Use
  `var(--crest-field)` for the shield and `var(--crest-mark)` for the border,
  motif and letter. The app maps that pair per surface — on a coloured button
  the pair inverts — so the drawing must read correctly either way round.
- **No gradients, shadows, blurs, filters, or transparency.** Flat fills only.
- **Two variants per school:**
  - `full` — for 48px and up. Motif plus letter plus inner border.
  - `compact` — for 16–32px. The same shield, letter, and the motif reduced to
    a single shape (or dropped entirely). This one has to survive at 18px on a
    button, so: nothing thinner than 4 units, no detail under 6 units, at most
    three shapes besides the letter.
- One `viewBox="0 0 100 116"` for every crest, so they swap without relayout.
- The letter is ~50–58% of the shield's width and sits on the optical centre,
  which is above the geometric centre because of the point.

## The eight

Two schools share "P" and two share "C", so the motif carries the identity, not
the letter. Make those four unmistakably different from each other.

| school    | letter | colour  | motif direction (change it if it collides with their real arms) |
|-----------|--------|---------|------------------------------------------------------------------|
| Harvard   | H      | #a51c30 | a campus gateway arch                                            |
| Yale      | Y      | #00356b | a hanging lantern                                                |
| Princeton | P      | #e77500 | two bold horizontal bars across the field                        |
| Penn      | P      | #011f5b | a quill                                                          |
| Brown     | B      | #6b4423 | a bridge of three arches                                         |
| Columbia  | C      | #6cace4 | a city skyline silhouette along the base                         |
| Cornell   | C      | #b31b1b | a bell tower                                                     |
| Dartmouth | D      | #00693e | a mountain peak                                                  |

## Deliver

Sixteen artboards — `full` and `compact` for each school — laid out in two
rows, each labelled. Then repeat the compact row twice more: once at 18px on a
solid button of that school's colour, once at 26px on a near-black bar. Those
two strips are the real test; if a crest fails there it fails.
