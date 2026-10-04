"use client";

/*
  THE ONE PUBLISH CONTROL.
  ------------------------------------------------------------------
  Both things a coach publishes — a training block and a day's lineup — used to
  own their own buttons, with their own words ("Save draft", "Publish to team",
  "Update live lineup"), so the same decision looked different depending on
  which tab you were standing in. This is that decision, once.

  TWO WORDS, AND ONLY TWO (owner, 2026-09-20). "Publish to team" and "Tell the
  squad" were three different labels for two things, and the coach has to read
  each one before pressing it. It is Publish and Unpublish now, everywhere —
  and NEVER BOTH AT ONCE (owner, 2026-09-27: "definitely don't make it so
  there are Publish and Unpublish buttons"):

    draft            → [Publish]
    live, untouched  → [Unpublish]
    live, edited     → [Publish]

  The database holds one copy of a lineup or a plan, not a published copy and a
  draft copy, so editing something live changes what the squad sees the moment
  it saves — which is why an edited live one offers Publish (it tells the
  squad). Once that is pressed it is live and untouched again, and Unpublish
  is back.

  UNPUBLISH DOES IT ON THE FIRST PRESS (owner, 2026-09-21). It used to stop and
  ask — Unpublish, then "Take it off the squad's phones?", then Unpublish again
  — two taps to undo a decision the coach had already made, with the buttons
  moving under the thumb in between.

  NO SENTENCES (owner, 2026-09-21). Under the heading there used to be a line
  of small grey words explaining each state: who could see it, what had just
  come off the squad's phones, what Publish would put back. There are two
  buttons on this bar and WHICH ONE IS THERE is the state — Publish means it is
  not out, Unpublish means it is. Writing that underneath is a sentence nobody
  reads.
*/
import Button from "@/components/ui/Button";
import { IconSend } from "@/components/icons";

export default function PublishBar({
  live,
  changed,
  busy = false,
  onPublish,
  onNotify,
  onUnpublish,
  tourId,
  bare = false,
  stack = false,
  full = false,
}: {
  live: boolean;
  /** Edited since it was published (this sitting). Only meaningful when live. */
  changed: boolean;
  busy?: boolean;
  onPublish: () => void;
  onNotify: () => void;
  onUnpublish: () => void;
  tourId?: string;
  /**
   * Buttons only — no card, no "Draft" heading. The Lineup tab uses this: the
   * boats already fill the screen and a white panel floating over the bottom
   * of them was the biggest thing on it (owner, 2026-09-17).
   */
  bare?: boolean;
  /**
   * A COLUMN, not a row: full-width buttons stacked one under another, sized
   * to match the Edit button beside them. The Plan tab's block card uses this
   * — the whole right-hand side of the card is that column (owner,
   * 2026-09-20).
   */
  stack?: boolean;
  /**
   * The button fills the width it is given. The Plan tab's block card sets
   * it so Publish / Unpublish and the Edit under it are the same width
   * (owner, 2026-09-28).
   */
  full?: boolean;
}) {
  const edited = live && changed;
  const title = !live ? "Draft" : edited ? "Live · edited" : "Live";
  // The one button there is: Publish for a draft or an edited live one,
  // Unpublish for a live one nobody has touched.
  const publish = !live || edited;
  // Which of the three it is, for the console walk's caption (lib/tour.ts
  // `bodyWhen`) — the walk lights this bar and must not say Publish over an
  // Unpublish button.
  const tourState = tourId ? (!live ? "draft" : edited ? "edited" : "live") : undefined;

  if (stack) {
    return (
      /* Below sm the column dissolves (`contents`), so its buttons share the
         row they are placed in with whatever sits beside them — the Plan
         card's Edit — at equal widths. */
      <div data-tour={tourId} data-tour-state={tourState} className="flex w-full flex-col gap-2 max-sm:contents">
        {publish ? (
          <Button size="md" full onClick={live ? onNotify : onPublish} disabled={busy}>
            <IconSend size={13} /> Publish
          </Button>
        ) : (
          <Button variant="secondary" size="md" full onClick={onUnpublish} disabled={busy}>
            Unpublish
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      data-tour={tourId}
      data-tour-state={tourState}
      className={bare ? "" : "rounded-xl border border-border bg-surface px-3.5 py-3"}
    >
      {!bare && (
        <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
          <span className={`h-2 w-2 rounded-full ${live ? "bg-success" : "bg-warn"}`} />
          {title}
        </div>
      )}

      {/* One row, right-aligned. */}
      <div className={`${bare ? "" : "mt-2.5 "}flex items-center justify-end gap-2`}>
        {/* The same word for both: a draft goes out, and a change to something
            already live goes out. Which of the two it is is the state of the
            thing, not a different button. */}
        {publish ? (
          <Button size="sm" full={full} onClick={live ? onNotify : onPublish} disabled={busy}>
            <IconSend size={13} /> Publish
          </Button>
        ) : (
          <Button variant="secondary" size="sm" full={full} onClick={onUnpublish} disabled={busy}>
            Unpublish
          </Button>
        )}
      </div>
    </div>
  );
}
