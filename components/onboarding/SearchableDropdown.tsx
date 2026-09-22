"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconChevronDown, IconCheck } from "@/components/icons";

/*
  ONE reusable searchable dropdown, used on screens 2 (single), 4 and 6 (multi).

  THE FIELD IS THE SEARCH BOX (owner, 2026-09-22). It used to be a button that,
  when tapped, dropped a SECOND box underneath with a magnifying glass in it —
  two typing boxes stacked, one of which you couldn't type in. Now there is one
  box: tap it and type in the box you tapped, and only the list of matches
  drops under it. "Add a language, click there, and write it out as well."

  - Closed (single): the field shows the chosen answer, with its emblem.
  - Closed (multi):  the chosen answers are chips ABOVE the field.
  - Open:            you type in the field; what you have already chosen stays
                     readable as the field's placeholder, so typing over it
                     never looks like it threw the answer away.

  Four optional behaviours, each switched on by one prop:
  - `icon`        — an emblem in front of every row (and in front of the chosen
                    value when closed). The residence picker draws each House's
                    own sigil here.
  - `groupOf`     — a heading whenever the group changes going down the list, so
                    "Somewhere else" reads as its own section under the Houses.
  - `hideSelected`— (multi) a chosen option leaves the list instead of sitting
                    there with a tick. You've said it; it's in the chips above.
  - `locked`      — (multi) chips that can't be removed, e.g. English at Harvard.

  All colors come from theme variables.
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
  const single = multiple ? "" : props.value;
  const locked = multiple ? (props.locked ?? []) : [];
  const hideSelected = multiple ? props.hideSelected === true : false;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = options.filter(
    (o) =>
      o.toLowerCase().includes(query.toLowerCase()) &&
      !(hideSelected && selectedArr.includes(o)),
  );
  const isSelected = (o: string) => (multiple ? selectedArr.includes(o) : single === o);

  const choose = (o: string) => {
    if (multiple) {
      if (locked.includes(o)) return; // a locked answer isn't the user's to change
      const next = selectedArr.includes(o)
        ? selectedArr.filter((x) => x !== o)
        : [...selectedArr, o];
      props.onChange(next);
      setQuery(""); // ready for the next one; the list stays open
    } else {
      props.onChange(o);
      close();
    }
  };

  /*
    What the one box shows. Closed, it is the answer (single) or nothing at all
    (multi — the answers are chips above it). Open, it is what you are typing,
    and the answer you already gave moves into the placeholder so it stays on
    screen while you type over it.
  */
  const shownValue = open ? query : single;
  const shownPlaceholder = open ? single || searchPlaceholder : placeholder;

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
                    ? "border-border bg-surface text-muted"
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

      <div
        className={`flex w-full items-center gap-2.5 rounded-[10px] border bg-surface pl-3.5 pr-1 ${
          open ? "border-primary" : "border-border"
        }`}
      >
        {!multiple && single && icon && !open && (
          <span className="flex-shrink-0">{icon(single)}</span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={shownValue}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            // Enter takes the top match — the whole point of typing three
            // letters. Escape puts the field back the way it was.
            if (e.key === "Enter") {
              e.preventDefault();
              if (filtered.length > 0) choose(filtered[0]);
            } else if (e.key === "Escape") {
              close();
              inputRef.current?.blur();
            }
          }}
          aria-label={ariaLabel}
          aria-expanded={open}
          role="combobox"
          aria-controls={undefined}
          placeholder={shownPlaceholder}
          /* 16px text so a phone doesn't zoom the page when it takes focus. */
          className="min-w-0 flex-1 bg-transparent py-3 text-base text-text placeholder:text-muted focus:outline-none"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={open ? "Close the list" : "Open the list"}
          onClick={() => {
            if (open) {
              close();
              inputRef.current?.blur();
            } else {
              inputRef.current?.focus();
            }
          }}
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          <IconChevronDown size={16} />
        </button>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-[10px] border border-border bg-surface shadow-lg">
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
                      /* mousedown, not click: the field is focused, and a click
                         would land after the blur that closes the list. */
                      onMouseDown={(e) => e.preventDefault()}
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
