"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconSearch, IconChevronDown, IconCheck } from "@/components/icons";

/*
  ONE reusable searchable dropdown, used on screens 2 (single), 4 and 6 (multi).
  - Closed: a field showing the selection (single) or chips (multi).
  - Open: a search box that filters the options, click to select.
  All colors come from theme variables.

  Four optional behaviours, each switched on by one prop:
  - `icon`        — an emblem in front of every row (and in front of the chosen
                    value when closed). The residence picker draws each House's
                    own sigil here.
  - `groupOf`     — a heading whenever the group changes going down the list, so
                    "Somewhere else" reads as its own section under the Houses.
  - `hideSelected`— (multi) a chosen option leaves the list instead of sitting
                    there with a tick. You've said it; it's in the chips above.
  - `locked`      — (multi) chips that can't be removed, e.g. English at Harvard.
*/
type BaseProps = {
  options: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  ariaLabel?: string;
  icon?: (option: string) => ReactNode;
  groupOf?: (option: string) => string;
};
type SingleProps = BaseProps & { multiple?: false; value: string; onChange: (v: string) => void };
type MultiProps = BaseProps & {
  multiple: true;
  value: string[];
  onChange: (v: string[]) => void;
  hideSelected?: boolean;
  locked?: string[];
};
type Props = SingleProps | MultiProps;

export default function SearchableDropdown(props: Props) {
  const {
    options,
    placeholder = "Select…",
    searchPlaceholder = "Search…",
    ariaLabel,
    icon,
    groupOf,
  } = props;
  const multiple = props.multiple === true;
  const selectedArr = multiple ? props.value : [];
  const locked = multiple ? (props.locked ?? []) : [];
  const hideSelected = multiple ? props.hideSelected === true : false;

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

  const filtered = options.filter(
    (o) =>
      o.toLowerCase().includes(query.toLowerCase()) &&
      !(hideSelected && selectedArr.includes(o)),
  );
  const isSelected = (o: string) => (multiple ? selectedArr.includes(o) : props.value === o);

  const choose = (o: string) => {
    if (multiple) {
      if (locked.includes(o)) return; // a locked answer isn't the user's to change
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
          {selectedArr.map((s) => {
            const fixed = locked.includes(s);
            return (
              <span
                key={s}
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
                  fixed
                    ? "border-border bg-surface-2 text-muted"
                    : "border-primary bg-primary-tint text-primary"
                }`}
              >
                {s}
                {!fixed && (
                  <button type="button" onClick={() => choose(s)} aria-label={`Remove ${s}`}>
                    ×
                  </button>
                )}
              </span>
            );
          })}
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
        <span className="flex min-w-0 items-center gap-2.5">
          {!multiple && props.value && icon && (
            <span className="flex-shrink-0">{icon(props.value)}</span>
          )}
          <span className={!multiple && props.value ? "truncate text-text" : "truncate text-muted"}>
            {!multiple && props.value ? props.value : placeholder}
          </span>
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
              filtered.map((o, i) => {
                // A heading only where the group actually changes, so a list
                // with one group never grows a pointless header.
                const group = groupOf?.(o);
                const newGroup = group !== undefined && group !== groupOf?.(filtered[i - 1]);
                return (
                  <div key={o}>
                    {newGroup && (
                      <div
                        className={`px-3.5 pb-1 text-[10px] font-medium uppercase tracking-[0.06em] text-muted ${
                          i === 0 ? "pt-1.5" : "mt-1 border-t border-border pt-2"
                        }`}
                      >
                        {group}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => choose(o)}
                      className={`flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm ${
                        isSelected(o) ? "bg-primary-tint text-primary" : "text-text"
                      }`}
                    >
                      <span className="flex min-w-0 items-center gap-2.5">
                        {icon && <span className="flex-shrink-0">{icon(o)}</span>}
                        <span className="truncate">{o}</span>
                      </span>
                      {isSelected(o) && <IconCheck size={15} className="text-primary" />}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
