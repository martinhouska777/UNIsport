"use client";

/*
  SETTINGS → TRAINING (app/settings/training). The answers matching runs on:
  what you do, what else, which gyms, and when you're free.

  A profile is what other people see; settings are what only you see. None of
  these are things a visitor reads — they're the answers the app matches on.

  It asks what ONBOARDING asks, in the same words and with the same controls,
  so an answer given on the way in is changed the same way later:
    • the main activity brings only ITS questions — gym: how you train, level,
      split; running: distance, pace, how long; cardio: which; other: which
      sport (the same SportPicker). Level used to show for everyone; it is a
      lifting question.
    • free time is the same tap-the-hours week grid (WeekHourGrid). This page
      used to set it with start/end dropdowns, asking something else.

  Every row EXPANDS IN PLACE, one at a time, so the page stays a list you can
  read the answers off. Everything saves the moment it changes — the same
  savePreferences() the profile uses, which re-derives the display labels, so
  what you see and what you're matched on can't drift apart. Two exceptions,
  both so a save isn't fired per keystroke or per cell: typed answers save when
  you leave the box, and the week grid saves a moment after you stop painting
  (and on the way out).

  Colors are theme tokens; every option list is onboarding data.
*/
import { useEffect, useRef, useState } from "react";
import {
  experienceLevels,
  primaryActivities,
  gymSplits,
  gymStyles,
  cardioTypes,
  runningUnits,
  runningExperiences,
  verifiedGyms,
  MAX_TOP_GYMS,
  weekDays,
  activityFrequencies,
  otherActivityLabels,
  type OnboardingProfile,
  type OtherActivity,
  type PrimaryActivity,
} from "@/lib/onboarding";
import { hoursOfDay, hoursToSlots } from "@/lib/schedule";
import { Pill, FieldLabel, TextField } from "@/components/onboarding/controls";
import SportPicker from "@/components/onboarding/SportPicker";
import WeekHourGrid from "@/components/onboarding/WeekHourGrid";
import { IconChevronDown, IconCheck } from "@/components/icons";

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
  const ref = useRef<HTMLDivElement>(null);
  // An opened row can reach below the screen (the week especially) — bring it up.
  useEffect(() => {
    if (open) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  return (
    <div ref={ref} className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="tap44 flex w-full items-center justify-between gap-3 py-3 text-left"
      >
        <span className="flex-shrink-0 text-sm text-text">{label}</span>
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
  // One at a time. Several open at once turns the page into a scroll.
  const [open, setOpen] = useState<string | null>(null);
  const toggle = (key: string) => setOpen((cur) => (cur === key ? null : key));

  const topGyms = answers.topGyms ?? [];
  const extras = answers.otherActivities ?? [];
  const main = answers.primaryActivity ?? "";

  // ---- typed answers: kept here while typing, saved on leaving the box ----
  const [distance, setDistance] = useState(answers.runningDistance ?? "");
  const [pace, setPace] = useState(answers.runningPace ?? "");

  // ---- the week: painted here, saved shortly after the last stroke --------
  /*
    A swipe sets several hours in a row, faster than a save can come back, so
    the grid paints THIS copy (each hour applied to it as it is at that
    moment, exactly like onboarding) and the copy is saved once the painting
    stops. Leaving the page mid-wait still saves it.
  */
  const [schedule, setSchedule] = useState<Record<string, string[]>>(
    () => answers.trainingSchedule ?? {},
  );
  const scheduleDirty = useRef(false);
  const latest = useRef({ onSave, schedule });
  useEffect(() => {
    latest.current = { onSave, schedule };
  });
  useEffect(() => {
    if (!scheduleDirty.current) return;
    const t = setTimeout(() => {
      scheduleDirty.current = false;
      latest.current.onSave({ trainingSchedule: latest.current.schedule });
    }, 600);
    return () => clearTimeout(t);
  }, [schedule]);
  useEffect(
    () => () => {
      if (scheduleDirty.current) latest.current.onSave({ trainingSchedule: latest.current.schedule });
    },
    [],
  );
  const setHour = (day: string, hour: number, on: boolean) => {
    scheduleDirty.current = true;
    setSchedule((prev) => {
      const hours = hoursOfDay(prev[day]);
      if (on) hours.add(hour);
      else hours.delete(hour);
      const next = { ...prev };
      const slots = hoursToSlots(hours);
      if (slots.length > 0) next[day] = slots;
      else delete next[day];
      return next;
    });
  };

  // ---- the values shown on the closed rows -------------------------------
  const mainLabel =
    main === "other" && answers.activityOther
      ? answers.activityOther
      : (primaryActivities.find((a) => a.key === main)?.label ?? "—");
  const levelLabel =
    experienceLevels.find((l) => l.key === answers.experienceLevel)?.name ?? "—";
  const unit = answers.runningUnit ?? "km";
  const runLabel =
    [answers.runningDistance && `${answers.runningDistance} ${unit}`, answers.runningPace && `${answers.runningPace}/${unit}`]
      .filter(Boolean)
      .join(" · ") || "—";
  const extrasLabel =
    extras.length === 0
      ? "None"
      : extras
          .map((e) =>
            e.key === "other" && e.note
              ? e.note
              : (primaryActivities.find((a) => a.key === e.key)?.label ?? e.key),
          )
          .join(" · ");
  const freeDays = weekDays.filter((d) => hoursOfDay(schedule[d.key]).size > 0);
  const freeHours = freeDays.reduce((n, d) => n + hoursOfDay(schedule[d.key]).size, 0);
  const freeLabel =
    freeDays.length === 0
      ? "Not set"
      : `${freeDays.length} ${freeDays.length === 1 ? "day" : "days"} · ${freeHours} ${
          freeHours === 1 ? "hour" : "hours"
        } a week`;

  // ---- the main activity --------------------------------------------------
  // Your main thing can't also be one of your extras.
  const pickMain = (key: PrimaryActivity) =>
    onSave({ primaryActivity: key, otherActivities: extras.filter((o) => o.key !== key) });

  // ---- the extras ---------------------------------------------------------
  const patchExtra = (key: string, changes: Partial<OtherActivity>) =>
    onSave({
      otherActivities: extras.map((o) => (o.key === key ? { ...o, ...changes } : o)),
    });

  const toggleExtra = (key: PrimaryActivity) =>
    onSave({
      otherActivities: extras.some((o) => o.key === key)
        ? extras.filter((o) => o.key !== key)
        : [...extras, { key, perWeek: "2×", note: "" }],
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
        label="Main activity"
        value={mainLabel}
        open={open === "activity"}
        onToggle={() => toggle("activity")}
      >
        <div className="flex flex-wrap gap-1.5">
          {primaryActivities.map((a) => (
            <Pill
              key={a.key}
              label={a.label}
              selected={main === a.key}
              onClick={() => pickMain(a.key)}
            />
          ))}
        </div>
      </Row>

      {/* From here to "Also do", each activity asks its OWN questions. */}
      {main === "gym" && (
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
            label="Split"
            value={answers.gymSplit || "—"}
            open={open === "split"}
            onToggle={() => toggle("split")}
          >
            <div className="flex flex-wrap gap-1.5">
              {/* Optional, so tapping the chosen one again clears it. */}
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

      {main === "running" && (
        <>
          <Row
            label="Distance & pace"
            value={runLabel}
            open={open === "run"}
            onToggle={() => toggle("run")}
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {runningUnits.map((u) => (
                  <Pill
                    key={u.key}
                    label={u.label}
                    selected={unit === u.key}
                    onClick={() => onSave({ runningUnit: u.key })}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Usual distance</FieldLabel>
                  <TextField
                    value={distance}
                    onChange={setDistance}
                    onBlur={() => {
                      if (distance !== (answers.runningDistance ?? "")) onSave({ runningDistance: distance });
                    }}
                    ariaLabel="Usual distance"
                    suffix={unit}
                  />
                </div>
                <div>
                  <FieldLabel>Usual pace</FieldLabel>
                  <TextField
                    value={pace}
                    onChange={setPace}
                    onBlur={() => {
                      if (pace !== (answers.runningPace ?? "")) onSave({ runningPace: pace });
                    }}
                    ariaLabel="Usual pace"
                    suffix={`/${unit}`}
                  />
                </div>
              </div>
            </div>
          </Row>

          <Row
            label="Running for"
            value={answers.runningExperience || "—"}
            open={open === "runexp"}
            onToggle={() => toggle("runexp")}
          >
            <div className="flex flex-wrap gap-1.5">
              {runningExperiences.map((r) => (
                <Pill
                  key={r}
                  label={r}
                  selected={answers.runningExperience === r}
                  onClick={() =>
                    onSave({ runningExperience: answers.runningExperience === r ? "" : r })
                  }
                />
              ))}
            </div>
          </Row>
        </>
      )}

      {main === "cardio" && (
        <Row
          label="Cardio"
          value={answers.cardioType || "—"}
          open={open === "cardio"}
          onToggle={() => toggle("cardio")}
        >
          <div className="flex flex-wrap gap-1.5">
            {cardioTypes.map((c) => (
              <Pill
                key={c}
                label={c}
                selected={answers.cardioType === c}
                onClick={() => onSave({ cardioType: c })}
              />
            ))}
          </div>
        </Row>
      )}

      {main === "other" && (
        <Row
          label="Sport"
          value={answers.activityOther || "—"}
          open={open === "sport"}
          onToggle={() => toggle("sport")}
        >
          <SportPicker
            value={answers.activityOther ?? ""}
            onChange={(v) => onSave({ activityOther: v })}
            ariaLabel="Your sport"
          />
        </Row>
      )}

      <Row
        label="Also do"
        value={extrasLabel}
        open={open === "extras"}
        onToggle={() => toggle("extras")}
      >
        <div className="flex flex-col gap-2">
          {primaryActivities
            .filter((a) => a.key !== main)
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
                    <div className="mt-2 flex flex-col gap-2.5">
                      {a.key === "other" && (
                        <SportPicker
                          value={picked.note}
                          onChange={(v) => patchExtra(a.key, { note: v })}
                          ariaLabel="Which sport it is"
                        />
                      )}
                      <div className="flex flex-wrap gap-1.5">
                        {activityFrequencies.map((f) => (
                          <Pill
                            key={f}
                            label={`${f} a week`}
                            selected={picked.perWeek === f}
                            onClick={() => patchExtra(a.key, { perWeek: f })}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </Row>

      <Row
        label="Gyms"
        value={topGyms.join(" · ") || "—"}
        open={open === "gyms"}
        onToggle={() => toggle("gyms")}
      >
        <p className="mb-2 text-[11px] text-muted">Up to {MAX_TOP_GYMS}</p>
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

      {/* THE WEEK — onboarding's grid: tap or swipe every hour you're free. */}
      <Row
        label="Free time"
        value={freeLabel}
        open={open === "schedule"}
        onToggle={() => toggle("schedule")}
      >
        <WeekHourGrid schedule={schedule} onSet={setHour} />
      </Row>
    </div>
  );
}
