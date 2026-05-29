"use client";

import { useState } from "react";
import { IconPencil } from "@/components/icons";

/*
  Tap-to-edit text. Shows the value with a dashed underline + pencil; tapping
  turns it into an input (or textarea) in place. Commits on blur / Enter,
  cancels on Escape. Used for the name, bio, and the Training rows.
  Colors all come from theme variables; inputs use 16px to avoid mobile zoom.
*/
export default function InlineEdit({
  value,
  onChange,
  placeholder = "Add",
  ariaLabel,
  maxLength,
  multiline = false,
  textClassName = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  ariaLabel: string;
  maxLength?: number;
  multiline?: boolean;
  textClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const start = () => {
    setDraft(value);
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    if (multiline) {
      return (
        <div>
          <textarea
            autoFocus
            value={draft}
            maxLength={maxLength}
            aria-label={ariaLabel}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditing(false);
            }}
            className="min-h-[72px] w-full resize-none rounded-lg border border-primary bg-surface-2 px-3 py-2 text-base text-text focus:outline-none"
          />
          {maxLength != null && (
            <div className="mt-1 text-right text-[11px] text-muted">
              {draft.length} / {maxLength}
            </div>
          )}
        </div>
      );
    }
    return (
      <input
        autoFocus
        value={draft}
        maxLength={maxLength}
        aria-label={ariaLabel}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className={`border-b border-primary bg-transparent text-base text-text focus:outline-none ${textClassName}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={start}
      aria-label={`Edit ${ariaLabel}`}
      className="group inline-flex items-start gap-1 text-left"
    >
      <span
        className={`${multiline ? "" : "border-b border-dashed border-muted"} ${
          value ? "" : "text-muted"
        } ${textClassName}`}
      >
        {value || placeholder}
      </span>
      <IconPencil size={multiline ? 14 : 12} className="mt-0.5 shrink-0 text-muted" />
    </button>
  );
}
