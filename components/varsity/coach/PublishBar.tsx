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
  it saves — which is why the third state still offers Publish. Nothing new goes
  out; pressing it is what makes their phones buzz about the change. The line of
  words above the buttons is where that is said, not on the button.
*/
import { useState } from "react";
import Button from "@/components/ui/Button";
import { IconSend } from "@/components/icons";

/*
  UNPUBLISH ASKS FIRST. On a live, untouched lineup it is the ONLY button on
  this bar, and it is the one that takes the boats off forty phones — a thumb
  aiming for the bar on a dock should not be able to do that in one press.
  The question is asked in place, on the same row, so it is still two taps and
  never a modal over the boat.
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
}) {
  const edited = live && changed;
  const [confirming, setConfirming] = useState(false);
  const title = !live ? "Draft" : edited ? "Live · edited" : "Live";
  const sub = !live
    ? `Only you can see this ${what}.`
    : confirming
      ? `Take this ${what} off the squad's phones? It goes back to a draft only you can see.`
      : edited
        ? "Your squad can see the change already."
        : `Your squad can see this ${what}.`;

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
      {/* Bare or not, the unpublish question is asked in words before the red
          button is pressed — it is the one that takes the boats off forty
          phones. */}
      {bare && live && confirming && (
        <div className="mb-1.5 text-right text-[11px] leading-relaxed text-muted">{sub}</div>
      )}

      {/* One row, right-aligned. Stacked under the words rather than beside
          them so a narrow phone never squeezes the sentence into four lines. */}
      <div className={`${bare ? "" : "mt-2.5 "}flex items-center justify-end gap-2`}>
        {live && confirming && (
          <>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={busy}
              className="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-text disabled:opacity-50"
            >
              Keep live
            </button>
            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                onUnpublish();
              }}
              disabled={busy}
              className="rounded-lg border border-danger-line bg-danger-tint px-3 py-2 text-[12px] font-semibold text-danger disabled:opacity-50"
            >
              Unpublish
            </button>
          </>
        )}
        {live && !confirming && (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={busy}
            className="rounded-lg border border-border px-3 py-2 text-[12px] font-semibold text-muted disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
        {/* The same word for both: a draft goes out, and a change to something
            already live goes out. Which of the two it is is the state of the
            thing, not a different button. */}
        {(!live || (edited && !confirming)) && (
          <Button size="sm" onClick={live ? onNotify : onPublish} disabled={busy}>
            <IconSend size={13} /> Publish
          </Button>
        )}
      </div>
    </div>
  );
}
