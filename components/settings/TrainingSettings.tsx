"use client";

/*
  SETTINGS → TRAINING (app/settings/training). The answers matching runs on:
  what you do, what else, which gyms, and when you're free.

  A profile is what other people see; settings are what only you see. None of
  these are things a visitor reads — they're the answers the app matches on.

  THE ANSWERS ARE ON SCREEN, NOT BEHIND ROWS (owner, 2026-09-30: "make the UI
  better for changing answers"). It used to be a column of rows — label, grey
  value, chevron — that each opened a row of pills. Now it looks like
  onboarding, which asks the same questions and which the owner had already
  signed off on: the main activity as four tiles, that sport's own questions in
  one card under them, the extras as the same tick rows, the gyms as a ranked
  list you can reorder, and the week as a small picture of your free hours.

  It asks what ONBOARDING asks, in the same words and with the same controls:
    • the main activity brings only ITS questions — gym: how you train, level,
      split; running: distance, pace, how long; cardio: which; other: which
      sport (the same SportPicker).
    • free time is the same tap-the-hours week grid (WeekHourGrid), opened from
      the picture with Edit. It stays shut otherwise: a swipe on the grid
      paints, so the page could not be scrolled while a finger was over it.

  Everything saves the moment it changes — the same savePreferences() the
  profile uses, which re-derives the display labels, so what you see and what
  you're matched on can't drift apart. Two exceptions, both so a save isn't
  fired per keystroke or per cell: typed answers save when you leave the box,
  and the week saves a moment after you stop painting (and on the way out).

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
  liftingUnits,
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
import { GRID_FIRST_HOUR, GRID_LAST_HOUR, hoursOfDay, hoursToSlots } from "@/lib/schedule";
import { Pill, TextField } from "@/components/onboarding/controls";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import SportPicker from "@/components/onboarding/SportPicker";
import WeekHourGrid from "@/components/onboarding/WeekHourGrid";
import {
  IconActivity,
  IconBarbell,
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconPencil,
  IconPlus,
  IconRun,
  IconX,
} from "@/components/icons";

// The activity icons, by the name the data gives them (lib/onboarding.ts).
const activityIcons: Record<string, (p: { size?: number }) => React.ReactNode> = {
  barbell: IconBarbell,
  run: IconRun,
  activity: IconActivity,
  plus: IconPlus,
};

const HOURS = Array.from(
  { length: GRID_LAST_HOUR - GRID_FIRST_HOUR + 1 },
  (_, i) => GRID_FIRST_HOUR + i,
);

/* A group: the section label used across Settings, an optional action on the
   right of it, and the group's controls under it. */
function Group({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-2 flex min-h-5 items-center justify-between gap-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/* One question inside the sport's card: its name, then its answers. */
function Question({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[13px] font-medium text-text">{label}</div>
      {children}
    </div>
  );
}

const card = "rounded-2xl border border-border bg-surface p-4 shadow-card";

export default function TrainingSettings({
  answers,
  onSave,
}: {
  answers: Partial<OnboardingProfile>;
  onSave: (patch: Partial<OnboardingProfile>) => void;
}) {
  const topGyms = answers.topGyms ?? [];
  const extras = answers.otherActivities ?? [];
  const main = answers.primaryActivity ?? "";
  const unit = answers.runningUnit ?? "km";

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
  const [editingWeek, setEditingWeek] = useState(false);
  const weekRef = useRef<HTMLDivElement>(null);
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
  // The open grid can reach below the screen — bring it up.
  useEffect(() => {
    if (editingWeek) weekRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [editingWeek]);
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
  const freeDays = weekDays.filter((d) => hoursOfDay(schedule[d.key]).size > 0);
  const freeHours = freeDays.reduce((n, d) => n + hoursOfDay(schedule[d.key]).size, 0);

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
  const moveGym = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= topGyms.length) return;
    const next = [...topGyms];
    [next[i], next[j]] = [next[j], next[i]];
    onSave({ topGyms: next });
  };
  const addGym = (gym: string) => {
    if (topGyms.length >= MAX_TOP_GYMS || topGyms.includes(gym)) return;
    onSave({ topGyms: [...topGyms, gym] });
  };
  const removeGym = (gym: string) => onSave({ topGyms: topGyms.filter((g) => g !== gym) });

  return (
    <div className="flex flex-col gap-6">
      {/* ── What you do — and that sport's own questions under it ── */}
      <Group title="Main activity">
        <div className="grid grid-cols-4 gap-2">
          {primaryActivities.map((a) => {
            const Icon = activityIcons[a.icon];
            const on = main === a.key;
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => pickMain(a.key)}
                aria-pressed={on}
                className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 shadow-card transition-colors ${
                  on ? "border-primary bg-primary-tint" : "border-border bg-surface"
                }`}
              >
                <span className="text-accent">
                  <Icon size={20} />
                </span>
                <span className="text-[12px] font-medium text-text">{a.label}</span>
              </button>
            );
          })}
        </div>

        {main === "gym" && (
          <div className={`${card} mt-2.5 flex flex-col gap-4`}>
            <Question label="How you train">
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
            </Question>
            <Question label="Level">
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
            </Question>
            <Question label="Split">
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
            </Question>
          </div>
        )}

        {main === "running" && (
          <div className={`${card} mt-2.5 flex flex-col gap-4`}>
            {/* Kilometres / miles moved to Units below (owner, 2026-10-04:
                "make it Units, put it together"); these two still say it. */}
            <div className="grid grid-cols-2 gap-3">
              <Question label="Usual distance">
                <TextField
                  value={distance}
                  onChange={setDistance}
                  onBlur={() => {
                    if (distance !== (answers.runningDistance ?? "")) onSave({ runningDistance: distance });
                  }}
                  ariaLabel="Usual distance"
                  suffix={unit}
                />
              </Question>
              <Question label="Usual pace">
                <TextField
                  value={pace}
                  onChange={setPace}
                  onBlur={() => {
                    if (pace !== (answers.runningPace ?? "")) onSave({ runningPace: pace });
                  }}
                  ariaLabel="Usual pace"
                  suffix={`/${unit}`}
                />
              </Question>
            </div>
            <Question label="Running for">
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
            </Question>
          </div>
        )}

        {main === "cardio" && (
          <div className={`${card} mt-2.5`}>
            <Question label="What you do most">
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
            </Question>
          </div>
        )}

        {main === "other" && (
          <div className={`${card} mt-2.5`}>
            <Question label="Which sport">
              <SportPicker
                value={answers.activityOther ?? ""}
                onChange={(v) => onSave({ activityOther: v })}
                ariaLabel="Your sport"
              />
            </Question>
          </div>
        )}
      </Group>

      {/* ── Everything else you do: onboarding's tick rows ── */}
      <Group title="Also do">
        <div className="flex flex-col gap-2">
          {primaryActivities
            .filter((a) => a.key !== main)
            .map((a) => {
              const Icon = activityIcons[a.icon];
              const picked = extras.find((o) => o.key === a.key);
              return (
                <div
                  key={a.key}
                  className={`rounded-2xl border shadow-card transition-colors ${
                    picked ? "border-primary bg-primary-tint" : "border-border bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleExtra(a.key)}
                    aria-pressed={Boolean(picked)}
                    className="flex min-h-11 w-full items-center gap-3 px-3.5 py-3 text-left"
                  >
                    <span className="text-accent">
                      <Icon size={18} />
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-text">
                      {otherActivityLabels[a.key]}
                    </span>
                    <span
                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border ${
                        picked
                          ? "border-primary bg-primary text-primary-contrast"
                          : "border-border text-transparent"
                      }`}
                    >
                      <IconCheck size={13} />
                    </span>
                  </button>
                  {picked && (
                    <div className="flex flex-col gap-3 border-t border-border px-3.5 pb-3.5 pt-3">
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
      </Group>

      {/* ── UNITS, together (owner, 2026-10-04: "make it Units and put it
             together"): the distance and the weights Log session uses — it
             has no switch of its own. For everyone: anybody can log a run or
             a gym session. ── */}
      <Group title="Units">
        <div className={`${card} flex flex-col gap-4`}>
          <Question label="Distance">
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
          </Question>
          <Question label="Weights">
            <div className="flex flex-wrap gap-1.5">
              {liftingUnits.map((u) => (
                <Pill
                  key={u.key}
                  label={u.label}
                  selected={(answers.weightUnit ?? "kg") === u.key}
                  onClick={() => onSave({ weightUnit: u.key })}
                />
              ))}
            </div>
          </Question>
        </div>
      </Group>

      {/* ── Your gyms, in order — the order is what matching reads ── */}
      <Group title="Gyms">
        <div className="flex flex-col gap-2">
          {topGyms.map((g, i) => (
            <div
              key={g}
              className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface px-3.5 py-2.5 shadow-card"
            >
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                {i + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-text">{g}</span>
              <button
                type="button"
                onClick={() => moveGym(i, -1)}
                disabled={i === 0}
                aria-label={`Move ${g} up`}
                className="tap44 text-muted disabled:opacity-30"
              >
                <IconChevronUp size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveGym(i, 1)}
                disabled={i === topGyms.length - 1}
                aria-label={`Move ${g} down`}
                className="tap44 text-muted disabled:opacity-30"
              >
                <IconChevronDown size={18} />
              </button>
              <button
                type="button"
                onClick={() => removeGym(g)}
                aria-label={`Remove ${g}`}
                className="tap44 text-muted"
              >
                <IconX size={16} />
              </button>
            </div>
          ))}
          {topGyms.length < MAX_TOP_GYMS && (
            <SearchableDropdown
              options={verifiedGyms.filter((g) => !topGyms.includes(g))}
              value=""
              onChange={addGym}
              placeholder="Add a gym"
              searchPlaceholder="Search gyms…"
              ariaLabel="Add a gym"
            />
          )}
        </div>
      </Group>

      {/* ── When you're free: a picture of the week, the grid behind Edit ── */}
      <Group
        title="Free time"
        action={
          <button
            type="button"
            onClick={() => setEditingWeek((e) => !e)}
            className="tap44 flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium text-primary active:opacity-60"
          >
            {editingWeek ? (
              "Done"
            ) : (
              <>
                <IconPencil size={11} />
                Edit
              </>
            )}
          </button>
        }
      >
        <div ref={weekRef} className={card}>
          {editingWeek ? (
            <WeekHourGrid schedule={schedule} onSet={setHour} />
          ) : (
            <button
              type="button"
              onClick={() => setEditingWeek(true)}
              aria-label="Edit your free time"
              className="block w-full text-left"
            >
              {/* The week in miniature: a column a day, a sliver an hour. */}
              <div className="grid grid-cols-7 gap-1.5">
                {weekDays.map((d) => {
                  const lit = hoursOfDay(schedule[d.key]);
                  return (
                    <div key={d.key} className="flex flex-col items-center gap-1">
                      <span className="text-[11px] font-medium text-muted">{d.label.slice(0, 3)}</span>
                      <div className="flex w-full flex-col gap-[2px]">
                        {HOURS.map((h) => (
                          <span
                            key={h}
                            className={`h-[5px] rounded-[2px] ${lit.has(h) ? "bg-primary" : "bg-surface-2"}`}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-[12px] text-muted">
                {freeDays.length === 0
                  ? "Not set"
                  : `${freeDays.map((d) => d.label.slice(0, 3)).join(", ")} · ${freeHours} ${
                      freeHours === 1 ? "hour" : "hours"
                    } a week`}
              </p>
            </button>
          )}
        </div>
      </Group>
    </div>
  );
}
