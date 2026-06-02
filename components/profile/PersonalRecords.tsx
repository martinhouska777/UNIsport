"use client";

import { useState } from "react";
import type { PersonalRecord } from "@/lib/currentUser";
import { IconPencil, IconCheck, IconTrash, IconPlus } from "@/components/icons";
import VisibilityToggle from "@/components/profile/VisibilityToggle";

/*
  Personal records block: a read-only list that flips into an editor when the
  pencil is tapped. In edit mode each record is two inputs (lift + value) with a
  trash button, plus an "Add record" row. Changes are pushed up via onChange and
  persisted by the page. Colors come from theme variables; inputs use 16px text
  (text-base) so phones don't auto-zoom.
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

  return (
    <div className="border-b border-border px-3.5 py-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
          Personal records
        </div>
        <div className="flex items-center gap-2">
          <VisibilityToggle visible={visible} onChange={onVisibleChange} />
          <button
            type="button"
            onClick={() => (editing ? done() : setEditing(true))}
            aria-label={editing ? "Done editing personal records" : "Edit personal records"}
            className="rounded-full p-1 text-muted transition-colors hover:bg-muted/20"
          >
            {editing ? <IconCheck size={14} /> : <IconPencil size={13} />}
          </button>
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
                className="shrink-0 rounded-full p-1.5 text-muted transition-colors hover:bg-danger/15 hover:text-danger"
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
      ) : records.length > 0 ? (
        <div className="flex flex-col divide-y divide-border">
          {records.map((pr, i) => (
            <div key={i} className="flex items-center justify-between py-2">
              <span className="text-xs text-muted">{pr.lift}</span>
              <span className="text-xs font-medium text-text">{pr.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            addRecord();
            setEditing(true);
          }}
          className="w-full rounded-lg border border-dashed border-border bg-surface-2 px-3 py-4 text-center text-[12px] text-muted"
        >
          Add your personal records
        </button>
      )}
    </div>
  );
}
