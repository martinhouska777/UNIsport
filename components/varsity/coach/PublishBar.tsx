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
  each one before pressing it. It is Publish and Unpublish now, everywhere:

    draft            → [Publish]
    live, untouched  → [Unpublish]
    live, edited     → [Unpublish] [Publish]

  The database holds one copy of a lineup or a plan, not a published copy and a
  draft copy, so editing something live changes what the squad sees the moment
  it saves — which is why the third state still offers Publish.

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
}) {
  const edited = live && changed;
  const title = !live ? "Draft" : edited ? "Live · edited" : "Live";

  if (stack) {
    return (
      <div data-tour={tourId} className="flex w-full flex-col gap-2">
        {live && (
          <Button variant="secondary" size="md" full onClick={onUnpublish} disabled={busy}>
            Unpublish
          </Button>
        )}
        {(!live || edited) && (
          <Button size="md" full onClick={live ? onNotify : onPublish} disabled={busy}>
            <IconSend size={13} /> Publish
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      data-tour={tourId}
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
        {live && (
          <button
            type="button"
            onClick={onUnpublish}
            disabled={busy}
            className="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-muted disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
        {/* The same word for both: a draft goes out, and a change to something
            already live goes out. Which of the two it is is the state of the
            thing, not a different button. */}
        {(!live || edited) && (
          <Button size="sm" onClick={live ? onNotify : onPublish} disabled={busy}>
            <IconSend size={13} /> Publish
          </Button>
        )}
      </div>
    </div>
  );
}
