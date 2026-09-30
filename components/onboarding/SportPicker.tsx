"use client";

import { useState } from "react";
import { otherSports, MAX_INTEREST_LENGTH } from "@/lib/onboarding";
import { Pill } from "@/components/onboarding/controls";
import { IconPlus, IconX } from "@/components/icons";

/*
  WHICH SPORT — the answer behind "Other", on both the main activity screen and
  the "anything else" one. It is a list of what students actually play (data:
  otherSports) plus a way to type in anything the list misses, so the answer is
  never an empty box. Whatever is chosen or typed is stored as ONE string, the
  same as it always was.

  Used by onboarding and by Settings → Training, so the question is the same
  in both places.
*/
export default function SportPicker({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  // null = not typing. "" = the field is open and empty.
  const [typed, setTyped] = useState<string | null>(null);
  const own = value !== "" && !otherSports.includes(value);

  const add = () => {
    const next = (typed ?? "").trim();
    setTyped(null);
    if (next !== "") onChange(next);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {otherSports.map((sport) => (
          <Pill
            key={sport}
            label={sport}
            selected={value === sport}
            onClick={() => onChange(value === sport ? "" : sport)}
          />
        ))}

        {/* Whatever they typed themselves sits with the rest, and comes off
            with a tap like any other answer. */}
        {own && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Remove ${value}`}
            className="tap44 flex items-center gap-1.5 rounded-full border border-primary bg-primary-tint px-3.5 py-2 text-[13px] text-primary"
          >
            {value}
            <IconX size={13} />
          </button>
        )}

        {typed === null && (
          <button
            type="button"
            onClick={() => setTyped("")}
            className="tap44 flex items-center gap-1 rounded-full border border-dashed border-border bg-surface px-3.5 py-2 text-[13px] text-muted"
          >
            <IconPlus size={13} />
            Add
          </button>
        )}
      </div>

      {typed !== null && (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={typed}
            maxLength={MAX_INTEREST_LENGTH}
            onChange={(e) => setTyped(e.target.value)}
            /* Enter adds it, Escape backs out — the two keys a thumb reaches
               for on a phone. */
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              } else if (e.key === "Escape") {
                setTyped(null);
              }
            }}
            aria-label={ariaLabel}
            className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3.5 py-3 text-base text-text placeholder:text-faint focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={add}
            disabled={typed.trim() === ""}
            className="tap44 flex-shrink-0 rounded-full border border-primary bg-primary-tint px-4 py-2 text-[13px] text-primary disabled:opacity-40"
          >
            Add
          </button>
        </div>
      )}
    </div>
  );
}
