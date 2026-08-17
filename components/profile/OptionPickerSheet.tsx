"use client";

/*
  Pick from the app's real option lists and save to the real field.

  The Training rows on the profile used to be free-text boxes bound to
  `trainingDisplay`, a display-only copy of your answers. Typing "Advanced"
  there changed the label while `experienceLevel` stayed "beginner", so matching
  carried on using the old value. Anything editable here writes the stored
  answer, so what you see and what you're matched on cannot drift apart.

  Single-select (level, split) picks one and closes. Multi-select (top gyms)
  keeps a ranked list up to `max`, showing each pick's position.
*/
import { useState } from "react";
import Button from "@/components/ui/Button";
import { IconCheck, IconX } from "@/components/icons";

export type Option = { value: string; label: string };

export default function OptionPickerSheet({
  title,
  hint,
  options,
  selected,
  multiple = false,
  max,
  onSave,
  onClose,
}: {
  title: string;
  hint?: string;
  options: Option[];
  selected: string[];
  multiple?: boolean;
  max?: number;
  onSave: (values: string[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(selected);

  const choose = (value: string) => {
    if (!multiple) {
      onSave([value]);
      onClose();
      return;
    }
    setPicked((current) => {
      if (current.includes(value)) return current.filter((v) => v !== value);
      if (max && current.length >= max) return current; // full — ignore the tap
      return [...current, value];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      {/* Slides up from the bottom; closed with the X, Cancel, or the backdrop.
          Not drag-dismissible on purpose — a picker is a quick in-and-out. */}
      <div className="relative flex max-h-[85%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div>
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>

          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <div>
              <div className="text-[15px] font-medium text-text">{title}</div>
              {hint && <div className="mt-0.5 text-[11px] text-muted">{hint}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
            >
              <IconX size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 overflow-y-auto px-4 py-3">
          {options.map((option) => {
            const rank = picked.indexOf(option.value);
            const isPicked = rank !== -1;
            const full = !!max && picked.length >= max && !isPicked;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => choose(option.value)}
                disabled={full}
                aria-pressed={isPicked}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-sm ${
                  isPicked
                    ? "border-primary bg-primary-tint text-text"
                    : `border-border bg-surface-2 text-text ${full ? "opacity-40" : ""}`
                }`}
              >
                <span>{option.label}</span>
                {isPicked && (
                  <span className="flex items-center gap-1.5 text-primary">
                    {multiple && <span className="text-[11px] font-medium">#{rank + 1}</span>}
                    <IconCheck size={15} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {multiple && (
          <div className="flex gap-2.5 border-t border-border px-4 py-3">
            <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              size="lg"
              onClick={() => {
                onSave(picked);
                onClose();
              }}
              className="flex-1"
            >
              Save
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
