"use client";

import { useEffect, useRef, useState } from "react";
import { IconSearch, IconChevronDown, IconCheck } from "@/components/icons";

/*
  ONE reusable searchable dropdown, used on screens 2 (single), 4 and 6 (multi).
  - Closed: a field showing the selection (single) or chips (multi).
  - Open: a search box that filters the options, click to select.
  All colors come from theme variables.
*/
type BaseProps = {
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
};
type SingleProps = BaseProps & { multiple?: false; value: string; onChange: (v: string) => void };
type MultiProps = BaseProps & { multiple: true; value: string[]; onChange: (v: string[]) => void };
type Props = SingleProps | MultiProps;

export default function SearchableDropdown(props: Props) {
  const {
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    ariaLabel,
  } = props;
  const multiple = props.multiple === true;
  const selectedArr = multiple ? props.value : [];

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter((o) => o.toLowerCase().includes(query.toLowerCase()));
  const isSelected = (o: string) => (multiple ? selectedArr.includes(o) : props.value === o);

  const choose = (o: string) => {
    if (multiple) {
      const next = selectedArr.includes(o)
        ? selectedArr.filter((x) => x !== o)
        : [...selectedArr, o];
      props.onChange(next);
    } else {
      props.onChange(o);
      setQuery("");
      setOpen(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      {multiple && selectedArr.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selectedArr.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 rounded-full border border-primary bg-primary/15 px-2.5 py-1 text-xs text-primary"
            >
              {s}
              <button type="button" onClick={() => choose(s)} aria-label={`Remove ${s}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className="flex w-full items-center justify-between rounded-[10px] border border-border bg-surface-2 px-3.5 py-3 text-base"
      >
        <span className={!multiple && props.value ? "text-text" : "text-muted"}>
          {!multiple && props.value ? props.value : placeholder}
        </span>
        <span className="text-muted">
          <IconChevronDown size={16} />
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-muted">
            <IconSearch size={15} />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label="Search options"
              className="w-full bg-transparent text-base text-text placeholder:text-muted focus:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3.5 py-3 text-sm text-muted">No matches</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => choose(o)}
                  className={`flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm ${
                    isSelected(o) ? "bg-primary/10 text-primary" : "text-text"
                  }`}
                >
                  <span>{o}</span>
                  {isSelected(o) && <IconCheck size={15} className="text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
