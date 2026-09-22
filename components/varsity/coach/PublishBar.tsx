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
    just unpublished → [Publish again], under the line that says why

  The database holds one copy of a lineup or a plan, not a published copy and a
  draft copy, so editing something live changes what the squad sees the moment
  it saves — which is why the third state still offers Publish. Nothing new goes
  out; pressing it is what makes their phones buzz about the change. The line of
  words above the buttons is where that is said, not on the button.
*/
import { useState } from "react";
import Button from "@/components/ui/Button";
import { IconSend } from "@/components/icons";

/*
  UNPUBLISH DOES IT, THEN ASKS (owner, 2026-09-21: "make it unpublished right
  away and ask you a question").

  It used to stop and ask first — Unpublish, then "Take it off the squad's
  phones?", then Unpublish again — two taps to undo something the coach had
  already decided, with the buttons moving under the thumb in between. Now one
  press takes it down and the QUESTION comes after: the bar says what just
  happened and offers to put it back. Undoing is the cheap direction, so that
  is the one that goes second.
*/

export default function PublishBar({
  live,
  changed,
  what,
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
  /** The noun for the thing, used in the sentence: "week", "lineup". */
  what: string;
  busy?: boolean;
  onPublish: () => void;
  onNotify: () => void;
  onUnpublish: () => void;
  tourId?: string;
  /**
   * Buttons only — no card, no "Draft" heading, no sentence under it. The
   * Lineup tab uses this: the boats already fill the screen and a white panel
   * floating over the bottom of them was the biggest thing on it (owner,
   * 2026-09-17). The one line that still has to be read — the unpublish
   * question — is kept even here.
   */
  bare?: boolean;
  /**
   * A COLUMN, not a row: full-width buttons stacked one under another, sized
   * to match the Edit button beside them. The Plan tab's block card uses this
   * — the whole right-hand side of the card is that column (owner,
   * 2026-09-20). The unpublish question is asked in the column's own width,
   * so it is short there.
   */
  stack?: boolean;
}) {
  const edited = live && changed;
  /*
    JUST TAKEN DOWN, this sitting. It is what turns the ordinary draft bar into
    an answer to "what did I just do" — and it clears itself the moment the
    thing is live again, so it can never outlive what it describes.
  */
  const [tookDown, setTookDown] = useState(false);
  /* Derived, never stored: the message belongs to a thing that is DOWN. The
     moment it is live again there is nothing to undo, whatever was pressed. */
  const undoing = tookDown && !live;

  const takeDown = () => {
    setTookDown(true);
    onUnpublish();
  };
  const putBack = () => {
    setTookDown(false);
    if (live) onNotify();
    else onPublish();
  };

  const title = !live ? (undoing ? "Taken down" : "Draft") : edited ? "Live · edited" : "Live";
  const sub = !live
    ? undoing
      ? `Off the squad's phones. Publish puts this ${what} back.`
      : `Only you can see this ${what}.`
    : edited
      ? "Your squad can see the change already."
      : `Your squad can see this ${what}.`;

  if (stack) {
    return (
      <div data-tour={tourId} className="flex w-full flex-col gap-2">
        {/* The question, AFTER the fact: it is already down, and the button
            under this line is the way back. The column is narrow, so it is
            short here. */}
        {!live && undoing && (
          <p className="text-[11px] leading-snug text-muted">Off the squad&apos;s phones.</p>
        )}
        {live && (
          <Button variant="secondary" size="md" full onClick={takeDown} disabled={busy}>
            Unpublish
          </Button>
        )}
        {(!live || edited) && (
          <Button size="md" full onClick={putBack} disabled={busy}>
            <IconSend size={13} /> {undoing ? "Publish again" : "Publish"}
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
        <>
          <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
            <span className={`h-2 w-2 rounded-full ${live ? "bg-success" : "bg-warn"}`} />
            {title}
          </div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{sub}</div>
        </>
      )}
      {/* Bare or not, the moment something comes OFF the squad's phones is
          said in words — after the press, beside the button that puts it
          back. */}
      {bare && !live && undoing && (
        <div className="mb-1.5 text-right text-[11px] leading-relaxed text-muted">{sub}</div>
      )}

      {/* One row, right-aligned. Stacked under the words rather than beside
          them so a narrow phone never squeezes the sentence into four lines. */}
      <div className={`${bare ? "" : "mt-2.5 "}flex items-center justify-end gap-2`}>
        {live && (
          <button
            type="button"
            onClick={takeDown}
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
          <Button size="sm" onClick={putBack} disabled={busy}>
            <IconSend size={13} /> {undoing ? "Publish again" : "Publish"}
          </Button>
        )}
      </div>
    </div>
  );
}
