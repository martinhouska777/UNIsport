"use client";

import { useState } from "react";
import type { PersonalRecord } from "@/lib/currentUser";
import { IconCheck, IconTrash, IconPlus, IconPencil } from "@/components/icons";
import VisibilityToggle from "@/components/profile/VisibilityToggle";

/*
  Personal records block.

  A record is a small brag, not a settings row — so it's shown as a PILL: the
  lift's name and the number side by side on one line, the same chip shape as
  Interests and Languages higher up the page. They pack left to right and wrap,
  so four or five fit on a line instead of two.

  They were half-width tiles before (name stacked over a big number, two to a
  line). The number was bigger, but "Bench press / 100 kg" is a short thing in
  a wide box: each record used a tenth of the row and left the rest of its tile
  empty, so the block read as mostly blank space. Sizing each one to its own
  content fixes that without truncating a long value like "100 kg × 1".
  And before THAT it was a list of two faint 12px lines with a dashed grey box
  permanently parked underneath, which read as an empty form no matter how much
  you'd filled in.

  The dashed box now only appears when there is nothing yet. Once there is,
  changing things is the pencil in the heading — the same pencil, in the same
  place, as the block above it. The editor is unchanged in substance: each
  record is two inputs (lift + value) with a trash button, plus "Add record".

  Changes are pushed up via onChange and persisted by the page. Colors come
  from theme variables; inputs use 16px text (text-base) so phones don't
  auto-zoom.
*/
export default function PersonalRecords({
  records,
  onChange,
  visible,
  onVisibleChange,
}: {
  records: PersonalRecord[];
  onChange: (records: PersonalRecord[]) => void;
  visible: boolean;
  onVisibleChange: (visible: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);

  const setRecord = (i: number, patch: Partial<PersonalRecord>) =>
    onChange(records.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const removeRecord = (i: number) =>
    onChange(records.filter((_, idx) => idx !== i));
  const addRecord = () => onChange([...records, { lift: "", value: "" }]);

  const done = () => {
    // Drop empty rows on the way out so a stray "Add" doesn't linger.
    onChange(records.filter((r) => r.lift.trim() || r.value.trim()));
    setEditing(false);
  };

  // Only rows with something in them are worth a tile.
  const filled = records.filter((r) => r.lift.trim() || r.value.trim());

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Personal records
        </div>
        <div className="flex items-center gap-2">
          <VisibilityToggle visible={visible} onChange={onVisibleChange} />
          {editing ? (
            /* The tick that closes the editor. */
            <button
              type="button"
              onClick={done}
              aria-label="Done editing personal records"
              className="tap44 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface-2 text-muted transition-colors"
            >
              <IconCheck size={14} />
            </button>
          ) : (
            filled.length > 0 && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="tap44 flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium text-primary active:opacity-60"
              >
                <IconPencil size={11} />
                Edit
              </button>
            )
          )}
        </div>
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          {records.map((pr, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={pr.lift}
                onChange={(e) => setRecord(i, { lift: e.target.value })}
                aria-label={`Record ${i + 1} name`}
                placeholder="Lift"
                maxLength={28}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-base text-text focus:border-primary focus:outline-none"
              />
              <input
                value={pr.value}
                onChange={(e) => setRecord(i, { value: e.target.value })}
                aria-label={`Record ${i + 1} value`}
                placeholder="e.g. 100 kg × 1"
                maxLength={28}
                className="min-w-0 flex-1 rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-base text-text focus:border-primary focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeRecord(i)}
                aria-label={`Remove record ${i + 1}`}
                className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-danger-tint hover:text-danger"
              >
                <IconTrash size={15} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRecord}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-border bg-surface-2 px-3 py-2.5 text-[12px] font-medium text-muted"
          >
            <IconPlus size={14} />
            Add record
          </button>
        </div>
      ) : filled.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {filled.map((pr, i) => (
            <span
              key={i}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-surface-2 py-1.5 pl-3 pr-2.5"
            >
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.08em] text-muted">
                {pr.lift || "Record"}
              </span>
              <span className="shrink-0 text-[13px] font-semibold tabular-nums leading-none text-text">
                {pr.value || "—"}
              </span>
            </span>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            addRecord();
            setEditing(true);
          }}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border bg-surface-2 px-3 py-4 text-[12px] font-medium text-muted"
        >
          <IconPlus size={14} />
          Add personal records
        </button>
      )}
    </div>
  );
}
