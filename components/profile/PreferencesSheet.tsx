"use client";

import { useEffect, useState } from "react";
import { IconX } from "@/components/icons";
import { Pill, FieldLabel, Toggle, TextField } from "@/components/onboarding/controls";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import {
  primaryActivities,
  experienceLevels,
  gymSplits,
  cardioTypes,
  verifiedGyms,
  MAX_TOP_GYMS,
  weekDays,
  timeBlocks,
  interestOptions,
  languageOptions,
  concentrations,
  trainingTypes,
  partnerPreferences,
  peerAdvising,
  gymMentorship,
  type OnboardingProfile,
} from "@/lib/onboarding";

/*
  "Edit your answers" sheet. Lets the user revisit the onboarding answers that
  sensibly change over time — what they do, where & when they train, interests,
  who they want to train with, mentorship — while leaving fixed identity facts
  (name, class year, house, sex, hometown) out. Edits a local draft, then hands
  the whole patch back on Save. All colors come from theme variables.
*/

// Only these fields are editable here (identity facts are intentionally omitted).
type Editable = Pick<
  OnboardingProfile,
  | "primaryActivity"
  | "activityOther"
  | "experienceLevel"
  | "gymSplit"
  | "runningDistance"
  | "runningPace"
  | "cardioType"
  | "topGyms"
  | "trainingSchedule"
  | "interests"
  | "languages"
  | "concentration"
  | "trainingType"
  | "partnerPreference"
  | "mentorFreshmen"
  | "beMentored"
  | "helpOthers"
  | "getHelp"
>;

export default function PreferencesSheet({
  profile,
  onSave,
  onClose,
}: {
  profile: Editable;
  onSave: (patch: Editable) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Editable>(profile);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const set = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const toggleInArray = (key: "topGyms" | "interests" | "languages", value: string) => {
    const arr = draft[key];
    if (arr.includes(value)) {
      set(key, arr.filter((x) => x !== value));
    } else {
      if (key === "topGyms" && arr.length >= MAX_TOP_GYMS) return;
      set(key, [...arr, value]);
    }
  };

  const toggleTimeBlock = (day: string, block: string) => {
    const current = draft.trainingSchedule[day] ?? [];
    const next = current.includes(block)
      ? current.filter((b) => b !== block)
      : [...current, block];
    const sched = { ...draft.trainingSchedule };
    if (next.length) sched[day] = next;
    else delete sched[day];
    set("trainingSchedule", sched);
  };

  const save = () => {
    onSave(draft);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 [animation:backdrop-in_0.2s_ease-out]"
      />

      <div className="relative flex max-h-[90%] flex-col rounded-t-3xl border-t border-border bg-surface [animation:sheet-up_0.28s_cubic-bezier(0.2,0.8,0.2,1)]">
        <div className="flex justify-center pb-1.5 pt-2.5">
          <div className="h-1 w-9 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 pb-3">
          <div>
            <div className="text-[15px] font-medium text-text">Edit your answers</div>
            <div className="mt-0.5 text-[11px] text-muted">
              Update your training & matching preferences
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

        {/* Scrollable body */}
        <div className="flex flex-col gap-5 overflow-y-auto px-4 py-4">
          {/* What you do */}
          <div>
            <FieldLabel>Primary activity</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {primaryActivities.map((a) => (
                <Pill
                  key={a.key}
                  label={a.label}
                  selected={draft.primaryActivity === a.key}
                  onClick={() => set("primaryActivity", a.key)}
                />
              ))}
            </div>
            {draft.primaryActivity === "other" && (
              <div className="mt-2">
                <TextField
                  value={draft.activityOther}
                  onChange={(v) => set("activityOther", v)}
                  placeholder="What do you do?"
                  ariaLabel="Other activity"
                />
              </div>
            )}
          </div>

          {/* Experience */}
          <div>
            <FieldLabel>Experience level</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {experienceLevels.map((l) => (
                <Pill
                  key={l.key}
                  label={l.name}
                  selected={draft.experienceLevel === l.key}
                  onClick={() => set("experienceLevel", l.key)}
                />
              ))}
            </div>
          </div>

          {/* Conditional detail by activity */}
          {draft.primaryActivity === "gym" && (
            <div>
              <FieldLabel>Training split</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {gymSplits.map((s) => (
                  <Pill
                    key={s}
                    label={s}
                    selected={draft.gymSplit === s}
                    onClick={() => set("gymSplit", draft.gymSplit === s ? "" : s)}
                  />
                ))}
              </div>
            </div>
          )}
          {draft.primaryActivity === "cardio" && (
            <div>
              <FieldLabel>Cardio type</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {cardioTypes.map((c) => (
                  <Pill
                    key={c}
                    label={c}
                    selected={draft.cardioType === c}
                    onClick={() => set("cardioType", draft.cardioType === c ? "" : c)}
                  />
                ))}
              </div>
            </div>
          )}
          {draft.primaryActivity === "running" && (
            <div className="flex flex-col gap-2">
              <FieldLabel>Running</FieldLabel>
              <TextField
                value={draft.runningDistance}
                onChange={(v) => set("runningDistance", v)}
                placeholder="Typical distance (e.g. 5–10 km)"
                ariaLabel="Running distance"
              />
              <TextField
                value={draft.runningPace}
                onChange={(v) => set("runningPace", v)}
                placeholder="Typical pace (e.g. 5:00 / km)"
                ariaLabel="Running pace"
              />
            </div>
          )}

          {/* Top gyms */}
          <div>
            <FieldLabel>Top gyms (up to {MAX_TOP_GYMS})</FieldLabel>
            <SearchableDropdown
              multiple
              options={verifiedGyms}
              value={draft.topGyms}
              onChange={(v) => {
                // Cap at MAX_TOP_GYMS — ignore additions beyond the limit.
                if (v.length <= MAX_TOP_GYMS) set("topGyms", v);
              }}
              placeholder="Add a gym…"
              searchPlaceholder="Search gyms…"
              ariaLabel="Top gyms"
            />
          </div>

          {/* When you train */}
          <div>
            <FieldLabel>When you train</FieldLabel>
            <div className="flex flex-col gap-2.5">
              {weekDays.map((d) => (
                <div key={d.key}>
                  <div className="mb-1.5 text-[11px] font-medium text-muted">{d.label}</div>
                  <div className="flex flex-wrap gap-1.5">
                    {timeBlocks.map((b) => (
                      <Pill
                        key={b}
                        label={b}
                        selected={(draft.trainingSchedule[d.key] ?? []).includes(b)}
                        onClick={() => toggleTimeBlock(d.key, b)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Who you train with */}
          <div>
            <FieldLabel>Train with</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {trainingTypes.map((t) => (
                <Pill
                  key={t.key}
                  label={t.label}
                  selected={draft.trainingType === t.key}
                  onClick={() => set("trainingType", t.key)}
                />
              ))}
            </div>
            {draft.trainingType !== "solo" && (
              <div className="mt-3">
                <FieldLabel>Partner preference</FieldLabel>
                <div className="flex flex-wrap gap-2">
                  {partnerPreferences.map((p) => (
                    <Pill
                      key={p.key}
                      label={p.label}
                      selected={draft.partnerPreference === p.key}
                      onClick={() => set("partnerPreference", p.key)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Mentorship */}
          <div>
            <FieldLabel>Mentorship</FieldLabel>
            <div className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface-2">
              {[...peerAdvising, ...gymMentorship].map((m) => (
                <div key={m.key} className="flex items-center justify-between gap-3 px-3.5 py-3">
                  <div>
                    <div className="text-[13px] text-text">{m.label}</div>
                    <div className="text-[11px] text-muted">{m.sub}</div>
                  </div>
                  <Toggle
                    on={draft[m.key]}
                    onChange={() => set(m.key, !draft[m.key])}
                    ariaLabel={m.label}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Interests */}
          <div>
            <FieldLabel>Interests</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {interestOptions.map((it) => (
                <Pill
                  key={it}
                  label={it}
                  variant="gold"
                  selected={draft.interests.includes(it)}
                  onClick={() => toggleInArray("interests", it)}
                />
              ))}
            </div>
          </div>

          {/* Languages */}
          <div>
            <FieldLabel>Languages</FieldLabel>
            <SearchableDropdown
              multiple
              options={languageOptions}
              value={draft.languages}
              onChange={(v) => set("languages", v)}
              placeholder="Add a language…"
              searchPlaceholder="Search languages…"
              ariaLabel="Languages"
            />
          </div>

          {/* Concentration */}
          <div>
            <FieldLabel>Concentration</FieldLabel>
            <SearchableDropdown
              options={concentrations}
              value={draft.concentration}
              onChange={(v) => set("concentration", v)}
              placeholder="Select a concentration…"
              searchPlaceholder="Search concentrations…"
              ariaLabel="Concentration"
            />
          </div>
        </div>

        {/* Sticky save bar */}
        <div className="flex gap-2.5 border-t border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
