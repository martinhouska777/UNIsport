/*
  "THIS IS AN EXAMPLE" — the tag a worked example wears.
  ---------------------------------------------------------------------------
  Several Varsity screens fall back to made-up data when a squad has nothing
  real yet (team boards, water outings), so a screen can be looked at before
  anyone has trained a day. Made-up numbers must never pass for real ones: a
  new rower tapping Workouts on their first Tuesday and finding a 2k board
  "41 of 44 logged" would take it for the squad's — and every real result later
  would be read against a fiction.

  So an example says so, twice: a small pill on its row in a list, and one
  plain line at the top of the sheet it opens. Both are theme tokens only; the
  warn tone is the app's "look twice" colour and is not tied to any sport.
*/

/** The pill for a list row — sits beside the row's other tags. */
export function ExampleTag() {
  return (
    <span className="flex-shrink-0 rounded border border-warn-line bg-warn-tint px-1.5 py-px text-[8px] font-bold uppercase tracking-[0.08em] text-warn">
      Example
    </span>
  );
}

/** The one-line note at the top of an opened example. `what` names the thing:
    "board", "outing". */
export function ExampleNote({ what }: { what: string }) {
  return (
    <p className="mb-3 rounded-xl border border-warn-line bg-warn-tint px-3 py-2 text-[11px] leading-relaxed text-warn">
      <span className="font-semibold">Example {what}.</span> Made-up results, so the screen can be
      seen before the squad has one. It disappears the moment a real one exists.
    </p>
  );
}
