"use client";

/*
  TRAINING — moved here off the Profile tab.

  A profile is what other people see; settings are what only you see. Your level,
  your split, which gyms you use and when you're free are none of them things a
  visitor reads — they're the answers matching runs on. They took about 200px of
  the profile and pushed the parts that are actually about you further down.

  Every row EXPANDS IN PLACE rather than opening a sheet. The schedule especially:
  it's a week, and a week wants to be looked at where it lives, not thrown up over
  the screen. One row open at a time, so the section never becomes a wall.

  Everything saves the moment you change it — the same savePreferences() the
  profile used, which re-derives the display labels so what you see and what you
  are matched on can never drift apart. There is no Save button because there is
  nothing to lose by tapping away.

  Colors are theme tokens; every option list is the onboarding data, so a new
  gym or a new split appears here with no change to this file.
*/
import { useState } from "react";
import {
  experienceLevels,
  primaryActivities,
  gymSplits,
  gymStyles,
  verifiedGyms,
  MAX_TOP_GYMS,
  weekDays,
  activityFrequencies,
  otherActivityLabels,
  type OnboardingProfile,
  type OtherActivity,
  type PrimaryActivity,
} from "@/lib/onboarding";
import { daySlots, slotToText, timeChoices, slotLabel, type Slot } from "@/lib/schedule";
import { Pill } from "@/components/onboarding/controls";
import {
  IconChevronDown,
  IconPlus,
  IconTrash,
  IconCheck,
} from "@/components/icons";

const choices = timeChoices();

// One expandable row: label on the left, the saved answer on the right, and the
// editor underneath once it's open.
function Row({
  label,
  value,
  open,
  onToggle,
  children,
}: {
  label: string;
  value: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tap44 flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm text-text">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs text-muted">{value}</span>
          <span
            className={`flex-shrink-0 text-muted transition-transform duration-150 motion-reduce:transition-none ${
              open ? "rotate-180" : ""
            }`}
          >
            <IconChevronDown size={14} />
          </span>
        </span>
      </button>
      {open && <div className="pb-3">{children}</div>}
    </div>
  );
}

export default function TrainingSettings({
  answers,
  onSave,
}: {
  answers: Partial<OnboardingProfile>;
  onSave: (patch: Partial<OnboardingProfile>) => void;
}) {
  // One at a time. Several open at once turns the section into a scroll.
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  const schedule = answers.trainingSchedule ?? {};
  const topGyms = answers.topGyms ?? [];
  const extras = answers.otherActivities ?? [];

  // ---- the values shown on the closed rows -------------------------------
  const levelLabel =
    experienceLevels.find((l) => l.key === answers.experienceLevel)?.name ?? "—";
  const activityLabel =
    primaryActivities.find((a) => a.key === answers.primaryActivity)?.label ?? "—";
  const extrasLabel =
    extras.length === 0
      ? "None"
      : extras
          .map((e) => primaryActivities.find((a) => a.key === e.key)?.label ?? e.key)
          .join(" · ");
  const slotCount = weekDays.reduce(
    (n, d) => n + daySlots(schedule[d.key]).length,
    0,
  );
  const scheduleLabel =
    slotCount === 0 ? "Not set" : `${slotCount} ${slotCount === 1 ? "time" : "times"} a week`;

  // ---- schedule editing ---------------------------------------------------
  const writeDay = (dayKey: string, slots: Slot[]) =>
    onSave({
      trainingSchedule: { ...schedule, [dayKey]: slots.map(slotToText) },
    });

  const addSlot = (dayKey: string) => {
    const slots = daySlots(schedule[dayKey]);
    writeDay(dayKey, [...slots, { start: "17:00", end: "19:00" }]);
  };
  const editSlot = (dayKey: string, i: number, patch: Partial<Slot>) => {
    const slots = daySlots(schedule[dayKey]).map((s, n) => (n === i ? { ...s, ...patch } : s));
    writeDay(dayKey, slots);
  };
  const removeSlot = (dayKey: string, i: number) =>
    writeDay(dayKey, daySlots(schedule[dayKey]).filter((_, n) => n !== i));

  // ---- the extras ---------------------------------------------------------
  const patchExtra = (key: string, changes: Partial<OtherActivity>) =>
    onSave({
      otherActivities: extras.map((o) => (o.key === key ? { ...o, ...changes } : o)),
    });

  const toggleExtra = (key: PrimaryActivity) =>
    onSave({
      otherActivities: extras.some((o) => o.key === key)
        ? extras.filter((o) => o.key !== key)
        : [...extras, { key, perWeek: "2×", days: [], note: "" }],
    });

  // ---- ranked gyms --------------------------------------------------------
  const toggleGym = (gym: string) => {
    if (topGyms.includes(gym)) {
      onSave({ topGyms: topGyms.filter((g) => g !== gym) });
      return;
    }
    if (topGyms.length >= MAX_TOP_GYMS) return; // full — the tap does nothing
    onSave({ topGyms: [...topGyms, gym] });
  };

  return (
    <div className="rounded-xl border border-border bg-surface px-3.5">
      <Row
        label="Level"
        value={levelLabel}
        open={open === "level"}
        onToggle={() => toggle("level")}
      >
        <div className="flex flex-wrap gap-1.5">
          {experienceLevels.map((l) => (
            <Pill
              key={l.key}
              label={l.name}
              selected={answers.experienceLevel === l.key}
              onClick={() => onSave({ experienceLevel: l.key })}
            />
          ))}
        </div>
      </Row>

      <Row
        label="Main activity"
        value={activityLabel}
        open={open === "activity"}
        onToggle={() => toggle("activity")}
      >
        <div className="flex flex-wrap gap-1.5">
          {primaryActivities.map((a) => (
            <Pill
              key={a.key}
              label={a.label}
              selected={answers.primaryActivity === a.key}
              onClick={() => onSave({ primaryActivity: a.key })}
            />
          ))}
        </div>
      </Row>

      {/*
        The editor that never existed. Onboarding asks what else you do, and
        until now the only way to change the answer was to replay the whole
        flow — so anyone who tapped wrong on that screen was stuck with it.
      */}
      <Row
        label="Also do"
        value={extrasLabel}
        open={open === "extras"}
        onToggle={() => toggle("extras")}
      >
        <div className="flex flex-col gap-2">
          {primaryActivities
            .filter((a) => a.key !== answers.primaryActivity)
            .map((a) => {
              const picked = extras.find((o) => o.key === a.key);
              return (
                <div
                  key={a.key}
                  className={`rounded-[10px] border px-3 py-2.5 ${
                    picked ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExtra(a.key)}
                    aria-pressed={Boolean(picked)}
                    className="flex w-full items-center justify-between gap-2 text-left"
                  >
                    <span className="text-[13px] text-text">{otherActivityLabels[a.key]}</span>
                    <span
                      className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border ${
                        picked
                          ? "border-primary bg-primary text-primary-contrast"
                          : "border-border text-transparent"
                      }`}
                    >
                      <IconCheck size={11} />
                    </span>
                  </button>
                  {picked && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {activityFrequencies.map((f) => (
                        <Pill
                          key={f}
                          label={`${f} a week`}
                          selected={picked.perWeek === f}
                          onClick={() => patchExtra(a.key, { perWeek: f })}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </Row>

      {/* Only the gym asks about a split — it means nothing on a cross-trainer. */}
      {answers.primaryActivity === "gym" && (
        <>
          <Row
            label="How you train"
            value={answers.gymStyle || "—"}
            open={open === "style"}
            onToggle={() => toggle("style")}
          >
            <div className="flex flex-wrap gap-1.5">
              {gymStyles.map((g) => (
                <Pill
                  key={g}
                  label={g}
                  selected={answers.gymStyle === g}
                  onClick={() => onSave({ gymStyle: g })}
                />
              ))}
            </div>
          </Row>

          <Row
            label="Split"
            value={answers.gymSplit || "—"}
            open={open === "split"}
            onToggle={() => toggle("split")}
          >
            <div className="flex flex-wrap gap-1.5">
              {gymSplits.map((sp) => (
                <Pill
                  key={sp}
                  label={sp}
                  selected={answers.gymSplit === sp}
                  onClick={() => onSave({ gymSplit: answers.gymSplit === sp ? "" : sp })}
                />
              ))}
            </div>
          </Row>
        </>
      )}

      <Row
        label="Gyms"
        value={topGyms.join(" · ") || "—"}
        open={open === "gyms"}
        onToggle={() => toggle("gyms")}
      >
        <p className="mb-2 text-[11px] text-muted">
          Up to {MAX_TOP_GYMS}, in the order you&apos;d pick them. Where you both train is
          worth real points.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {verifiedGyms.map((g) => {
            const rank = topGyms.indexOf(g);
            return (
              <Pill
                key={g}
                label={rank >= 0 ? `${rank + 1}. ${g}` : g}
                selected={rank >= 0}
                onClick={() => toggleGym(g)}
              />
            );
          })}
        </div>
      </Row>

      {/*
        THE WEEK, opened in place. It used to be a sheet thrown up over the whole
        screen; a week is a thing you look at, and it belongs where it lives.
      */}
      <Row
        label="When you train"
        value={scheduleLabel}
        open={open === "schedule"}
        onToggle={() => toggle("schedule")}
      >
        <p className="mb-1 text-[11px] text-muted">
          The times you&apos;re usually free. This is how we find people who are there
          when you are.
        </p>
        <div className="flex flex-col divide-y divide-border">
          {weekDays.map((day) => {
            const slots = daySlots(schedule[day.key]);
            return (
              <div key={day.key} className="py-2.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-text">{day.label}</span>
                  <button
                    type="button"
                    onClick={() => addSlot(day.key)}
                    aria-label={`Add a time on ${day.label}`}
                    className="tap44 flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary-tint"
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
                          className="flex-1 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-base text-text"
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
                          className="flex-1 rounded-[10px] border border-border bg-surface-2 px-3 py-2 text-base text-text"
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
                          className="tap44 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
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
      </Row>
    </div>
  );
}
