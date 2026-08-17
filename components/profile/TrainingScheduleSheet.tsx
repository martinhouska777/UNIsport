"use client";

/*
  "When do you train" — the whole week, Monday to Sunday, with real times.

  Replaces a free-text row that only edited a DISPLAY string: typing a new
  schedule on the profile changed the label and left `trainingSchedule` — the
  field matching actually reads — untouched. So people could set new times, see
  them stick, and keep being matched on their old ones.

  Anyone whose times came from onboarding has coarse blocks saved ("AM"). Those
  are widened to the hours they always meant on open, so the editor only ever
  deals in real times and saving quietly upgrades that person's answers.
*/
import { useState } from "react";
import Button from "@/components/ui/Button";
import { IconX, IconPlus, IconTrash } from "@/components/icons";
import { weekDays } from "@/lib/onboarding";
import {
  daySlots,
  minutesOf,
  slotLabel,
  slotToText,
  timeChoices,
  type Slot,
} from "@/lib/schedule";

// A sensible first suggestion when adding a slot to an empty day.
const DEFAULT_SLOT: Slot = { start: "07:00", end: "09:00" };

type Week = Record<string, Slot[]>;

function toWeek(saved: Record<string, string[]>): Week {
  const week: Week = {};
  for (const day of weekDays) week[day.key] = daySlots(saved?.[day.key]);
  return week;
}

export default function TrainingScheduleSheet({
  schedule,
  onSave,
  onClose,
}: {
  schedule: Record<string, string[]>;
  onSave: (next: Record<string, string[]>) => void;
  onClose: () => void;
}) {
  const [week, setWeek] = useState<Week>(() => toWeek(schedule));
  const choices = timeChoices();

  const setDay = (day: string, slots: Slot[]) =>
    setWeek((w) => ({ ...w, [day]: slots }));

  const addSlot = (day: string) => setDay(day, [...week[day], DEFAULT_SLOT]);

  const removeSlot = (day: string, index: number) =>
    setDay(day, week[day].filter((_, i) => i !== index));

  /* Keep each slot coherent: end must stay after start. */
  const editSlot = (day: string, index: number, patch: Partial<Slot>) =>
    setDay(
      day,
      week[day].map((slot, i) => {
        if (i !== index) return slot;
        const next = { ...slot, ...patch };
        if (minutesOf(next.end) <= minutesOf(next.start)) {
          // Nudge the other end rather than rejecting the change silently.
          if (patch.start) {
            const later = choices.find((t) => minutesOf(t) > minutesOf(next.start));
            next.end = later ?? next.start;
          } else {
            const earlier = [...choices].reverse().find((t) => minutesOf(t) < minutesOf(next.end));
            next.start = earlier ?? next.end;
          }
        }
        return next;
      })
    );

  const save = () => {
    const out: Record<string, string[]> = {};
    for (const day of weekDays) {
      const slots = week[day.key];
      if (slots.length) out[day.key] = slots.map(slotToText);
    }
    onSave(out);
    onClose();
  };

  const totalSlots = weekDays.reduce((n, d) => n + week[d.key].length, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      {/* Slides up from the bottom; closed with the X, Cancel, or the backdrop.
          Not drag-dismissible on purpose — dragging over a sheet full of time
          dropdowns would fight the pickers. */}
      <div className="relative flex max-h-[90%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div>
          <div className="flex justify-center pb-1.5 pt-2.5">
            <div className="h-1 w-9 rounded-full bg-border" />
          </div>

          <div className="flex items-center justify-between border-b border-border px-4 pb-3">
            <div>
              <div className="text-[15px] font-medium text-text">When you train</div>
              <div className="mt-0.5 text-[11px] text-muted">
                {totalSlots === 0
                  ? "Add the times you're usually free"
                  : `${totalSlots} ${totalSlots === 1 ? "time" : "times"} a week · used to match you`}
              </div>
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

        <div className="flex flex-col divide-y divide-border overflow-y-auto px-4">
          {weekDays.map((day) => {
            const slots = week[day.key];
            return (
              <div key={day.key} className="py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-text">{day.label}</span>
                  <button
                    type="button"
                    onClick={() => addSlot(day.key)}
                    aria-label={`Add a time on ${day.label}`}
                    className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <IconPlus size={12} />
                    Add time
                  </button>
                </div>

                {slots.length === 0 ? (
                  <p className="text-[11px] text-muted">Not training</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {slots.map((slot, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <select
                          value={slot.start}
                          onChange={(e) => editSlot(day.key, i, { start: e.target.value })}
                          aria-label={`${day.label} start time`}
                          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-text"
                        >
                          {choices.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <span className="text-xs text-muted">to</span>
                        <select
                          value={slot.end}
                          onChange={(e) => editSlot(day.key, i, { end: e.target.value })}
                          aria-label={`${day.label} end time`}
                          className="flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-base text-text"
                        >
                          {choices.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => removeSlot(day.key, i)}
                          aria-label={`Remove ${slotLabel(slot)} on ${day.label}`}
                          className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-2 text-muted"
                        >
                          <IconTrash size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex gap-2.5 border-t border-border px-4 py-3">
          <Button variant="secondary" size="lg" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button size="lg" onClick={save} className="flex-1">
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
