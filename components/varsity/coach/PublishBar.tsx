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
import Button from "@/components/ui/Button";
import { IconSend } from "@/components/icons";

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
  const title = !live ? "Draft" : edited ? "Live · edited" : "Live";
  const sub = !live
    ? `Only you can see this ${what}.`
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
      <div className="mt-0.5 text-[11px] text-muted">{sub}</div>

      {/* One row, right-aligned. Stacked under the words rather than beside
          them so a narrow phone never squeezes the sentence into four lines. */}
      <div className="mt-2.5 flex items-center justify-end gap-2">
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
        {!live && (
          <Button size="sm" onClick={onPublish} disabled={busy}>
            <IconSend size={13} /> Publish to team
          </Button>
        )}
        {edited && (
          <Button size="sm" onClick={onNotify} disabled={busy}>
            <IconSend size={13} /> Tell the squad
          </Button>
        )}
      </div>
    </div>
  );
}
