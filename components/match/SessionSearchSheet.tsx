"use client";

/*
  SEARCH BY TIME — "who is going on Thursday around 7?", as its own sheet.

  The QUESTION only. You pick what, when and where, press Search, and the
  sheet folds back up into the ceiling: the answer is the Buddy Board itself,
  narrowed to the posted sessions that fit (owner, 2026-09-28 — posted
  sessions only, no people cards, and the search out of the way once asked).
  The board says the search back in one line, which reopens this sheet with
  the same answers still in it. Matching: postsForSearch in lib/buddyBoard.ts.

  What it asks: an activity (the last pill, "Any", is every activity — it is
  the onboarding "Other" key reused, relabelled, because here it filters
  nothing rather than meaning "a sport not on the list") and a day; the hour
  is optional (no hour = anything that day) and how far either side of it
  still counts is SESSION_WINDOW_HOURS (lib/onboarding.ts).

  IT DROPS FROM THE TOP (owner, 2026-09-22: "there is no reason to be from
  bottom"). You tap "Search by time" on the board's top row, and the search
  comes down from the ceiling over it — out of the thing you tapped, the way
  the mode switcher drops out of the top bar (components/ModeSwitcherSheet).

  Colours are theme tokens.
*/
import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { primaryActivities, sessionTimeSlots, verifiedGyms } from "@/lib/onboarding";
import type { TimeSearch } from "@/lib/buddyBoard";
import { Pill, FieldLabel, SelectField } from "@/components/onboarding/controls";
import WeekPicker from "@/components/match/WeekPicker";
import { IconX } from "@/components/icons";

export default function SessionSearchSheet({
  value,
  onSearch,
  onClose,
}: {
  /** The search on the board right now, if any — the form starts from it. */
  value: TimeSearch | null;
  onSearch: (next: TimeSearch) => void;
  onClose: () => void;
}) {
  // --- REQUIRED: what and when ---
  const [activity, setActivity] = useState<string | null>(value?.activity ?? null);
  const [date, setDate] = useState<string | null>(value?.date ?? null);
  /* OPTIONAL. No time means anything that day. */
  const [hour, setHour] = useState<number | null>(value?.hour ?? null);
  const [gym, setGym] = useState<string | null>(value?.gym ?? null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const canSearch = !!activity && !!date;

  const search = () => {
    if (!canSearch) return;
    onSearch({ activity: activity!, date: date!, hour, gym });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-start">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="sheet-ceiling relative flex max-h-[92%] flex-col rounded-b-3xl border-b border-border bg-surface [animation:sheet-down_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex items-center justify-between border-b border-border px-4 pb-3 pt-4">
          <div className="text-[15px] font-medium text-text">Search by time</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="tap44 press-icon flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={14} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="flex flex-col gap-3 p-3.5">
            <div>
              <FieldLabel>Activity</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {primaryActivities.map((a) => (
                  <Pill
                    key={a.key}
                    label={a.key === "other" ? "Any" : a.label}
                    selected={activity === a.key}
                    onClick={() => setActivity(a.key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <FieldLabel>Day</FieldLabel>
              <WeekPicker value={date} onChange={setDate} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <FieldLabel>Gym</FieldLabel>
                <SelectField
                  value={gym ?? ""}
                  onChange={(v) => setGym(v === "" ? null : v)}
                  options={verifiedGyms.map((g) => ({ value: g, label: g }))}
                  placeholder="Any gym"
                  ariaLabel="Gym"
                />
              </div>
              <div>
                <FieldLabel>Time</FieldLabel>
                <SelectField
                  value={hour === null ? "" : String(hour)}
                  onChange={(v) => setHour(v === "" ? null : Number(v))}
                  options={sessionTimeSlots.map((t) => ({ value: String(t.value), label: t.label }))}
                  placeholder="Any time"
                  ariaLabel="Time"
                />
              </div>
            </div>

            {/* Only the four answers and the button — the explainer lines and
                the ±hours pills were cut as noise (the default window applies). */}
            <Button size="lg" full onClick={search} disabled={!canSearch}>
              Search
            </Button>
          </div>
        </div>

        {/* The grab edge, at the bottom now: it marks the edge the sheet ends
            at, which for a sheet hanging from the ceiling is this one. */}
        <div className="flex flex-shrink-0 justify-center pb-2.5 pt-1.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>
      </div>
    </div>
  );
}
