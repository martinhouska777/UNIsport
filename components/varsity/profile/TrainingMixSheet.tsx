"use client";

/*
  TRAINING MIX — the window behind the Statistics block.

  The block itself lives in ./TrainingMixList, because the statistics full
  screen shows exactly the same thing at the bottom and the two must never
  disagree. This is only the sheet it sits in.

  It is computed from the logs the profile has ALREADY loaded, so opening it
  costs nothing and its numbers can never disagree with the graph above it.
*/
import Sheet from "@/components/varsity/Sheet";
import TrainingMixList from "@/components/varsity/profile/TrainingMixList";
import type { MixRow } from "@/lib/varsity/trainingMix";

export default function TrainingMixSheet({
  rows,
  rangeKey,
  onRange,
  onClose,
}: {
  rows: MixRow[];
  rangeKey: string;
  onRange: (key: string) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title="Training mix" onClose={onClose}>
      {/* The sentence that used to close this sheet — "a session takes its kind
          from the coach's plan… anything else sits in Other" — is gone with the
          Other row it was explaining (owner, 2026-09-21). */}
      <TrainingMixList rows={rows} rangeKey={rangeKey} onRange={onRange} />
    </Sheet>
  );
}
