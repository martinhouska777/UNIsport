/*
  ONE LINE OF A DETAILS CARD: the name on the left, the answer on the right.
  Stack a few inside one white card (`overflow-hidden rounded-2xl border
  border-border bg-surface`) and the hairline between them comes with the row.

  A <label>, so a tap anywhere on the line lands in its field. Used by both
  workout editors — the student Log session and the Varsity log — so the two
  read as one screen. Colours are theme tokens only.
*/
export default function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-h-[52px] items-center gap-3 border-b border-border px-3.5 last:border-b-0">
      <span className="min-w-20 flex-shrink-0 whitespace-nowrap text-[14px] font-medium text-text">{label}</span>
      <span className="flex min-w-0 flex-1 items-center justify-end">{children}</span>
    </label>
  );
}

/* The field inside a DetailRow: no box of its own, the answer on the right. */
export const detailRowInput =
  "w-full min-w-0 bg-transparent py-3 text-right text-base text-text outline-none";
