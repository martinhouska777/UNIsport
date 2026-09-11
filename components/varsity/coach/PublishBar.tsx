"use client";

/*
  THE ONE PUBLISH CONTROL.
  ------------------------------------------------------------------
  Both things a coach publishes — a training block and a day's lineup — used to
  own their own buttons, with their own words ("Save draft", "Publish to team",
  "Update live lineup"), so the same decision looked different depending on
  which tab you were standing in. This is that decision, once.

  It has exactly three states, and only ever ONE thing to press:

    draft            → "Publish to team"     (nobody can see it yet)
    live, untouched  → "Unpublish"           (nothing to announce)
    live, edited     → "Tell the squad"      (they can SEE it already — the
                                              work autosaves and a live thing
                                              is live — so the only question
                                              left is whether their phone
                                              should buzz about it)

  That last state is the honest one. The database holds one copy of a lineup or
  a plan, not a published copy and a draft copy, so editing something live
  changes what the squad sees the moment it saves. Pretending otherwise with an
  "Update live lineup" button was the confusing part: it offered to send
  something that had already gone.
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
      className="rounded-xl border border-border bg-surface px-3.5 py-3"
    >
      <div className="flex items-center gap-2 text-[12px] font-semibold text-text">
        <span className={`h-2 w-2 rounded-full ${live ? "bg-success" : "bg-warn"}`} />
        {title}
      </div>
      <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{sub}</div>

      {/* One row, right-aligned. Stacked under the words rather than beside
          them so a narrow phone never squeezes the sentence into four lines. */}
      <div className="mt-2.5 flex items-center justify-end gap-2">
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
        {!live && (
          <Button size="sm" onClick={onPublish} disabled={busy}>
            <IconSend size={13} /> Publish to team
          </Button>
        )}
        {edited && !confirming && (
          <Button size="sm" onClick={onNotify} disabled={busy}>
            <IconSend size={13} /> Tell the squad
          </Button>
        )}
      </div>
    </div>
  );
}
