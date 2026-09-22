"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { Pill, FieldLabel, TextField, Toggle, Section } from "@/components/onboarding/controls";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import {
  IconBarbell,
  IconRun,
  IconActivity,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconX,
  IconCamera,
  IconShield,
  IconMapPin,
  HouseSigil,
  IconCheck,
} from "@/components/icons";
import {
  classYears,
  sexOptions,
  freshmanClassYear,
  residenceOptions,
  primaryActivities,
  experienceLevels,
  gymStyles,
  gymSplits,
  cardioTypes,
  activityFrequencies,
  otherActivityLabels,
  type OtherActivity,
  runningUnits,
  runningHints,
  runningExperiences,
  verifiedGyms,
  MAX_TOP_GYMS,
  weekDays,
  concentrations,
  countries,
  languageOptions,
  campusLanguage,
  interestOptions,
  MAX_INTEREST_LENGTH,
  residenceKind,
  residenceGroup,
  peerAdvising,
  gymMentorship,
  emptyProfile,
  nameError,
  onboardingChapters,
  chapterOf,
  ONBOARDING_TAIL_LABEL,
  MIN_INTERESTS,
  readOnboardingDraft,
  writeOnboardingDraft,
  clearOnboardingDraft,
  type OnboardingProfile,
} from "@/lib/onboarding";
import { houseColorsFor } from "@/lib/gyms";
import { hoursOfDay, hoursToSlots } from "@/lib/schedule";
import WeekHourGrid from "@/components/onboarding/WeekHourGrid";
import { fileToDataUrl } from "@/lib/image";

const activityIcons: Record<string, (p: { size?: number; className?: string }) => React.ReactNode> = {
  barbell: IconBarbell,
  run: IconRun,
  activity: IconActivity,
  plus: IconPlus,
};

/*
  The emblem in front of a place in the residence picker.
    • a House  → its OWN two identity colours, which are gym data (lib/gyms.ts)
                 and reach the component as values, never as hardcoded hex.
    • a dorm   → the neutral shield, in the theme's gold.
    • anywhere
      else     → a pin. Off campus isn't a crest.
*/
function ResidenceEmblem({
  residence,
  universityKey,
}: {
  residence: string;
  universityKey: string;
}) {
  const kind = residenceKind(residence);
  const colors = kind === "house" ? houseColorsFor(universityKey, residence) : null;
  if (colors) {
    return <HouseSigil primary={colors.primary} secondary={colors.secondary} size={20} />;
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center text-accent">
      {kind === "other" ? <IconMapPin size={16} /> : <IconShield size={17} />}
    </span>
  );
}

type StepMeta = {
  key: string;
  title: string;
  skippable?: boolean;
  centered?: boolean;
};

/*
  The screens, in three chapters plus a short tail (lib/onboarding.ts,
  onboardingChapters). The progress bar counts chapters rather than screens.

  NOTHING HERE EXPLAINS ITSELF (owner, 2026-09-22). Every screen was a heading,
  a line saying why we were asking, and then the question — and under half the
  controls, another line saying what the control did. All of it is gone. The
  question IS the screen; the same rule the Varsity setup screen already
  follows.
*/
const STEPS: StepMeta[] = [
  { key: "basics", title: "Let's get to know you." },
  { key: "residence", title: "Where do you live on campus?" },
  { key: "activity", title: "What do you train?" },
  /*
    The follow-up to the screen above. Skippable, because plenty of people
    genuinely do one thing — and because the moment this feels like homework
    people start ticking boxes at random, which is worse than no answer.
  */
  { key: "alsodo", title: "Anything else you do?", skippable: true },
  { key: "topgyms", title: "Your top gyms." },
  { key: "schedule", title: "When do you usually train?" },
  /*
    No longer skippable. A concentration and three interests are required; the
    hometown and languages stay optional. This chapter is the reason two
    strangers at the same rack say hello, so a profile without it is one the
    match has nothing to say about.
  */
  { key: "background", title: "Who are you, outside the gym?" },
  { key: "preferences", title: "Your preferences." },
  { key: "finish", title: "Finish your profile.", skippable: true },
];

/*
  What the progress bar says for a screen: the chapter and where it sits —
  "How you train · 2 of 3" — or the tail's own label.
*/
function chapterMeta(stepKey: string): {
  label: string;
  index: number; // 0-based chapter, or onboardingChapters.length for the tail
  progress: number; // 0..1 through the current chapter's screens
} {
  const i = chapterOf(stepKey);
  if (i < 0) {
    return { label: ONBOARDING_TAIL_LABEL, index: onboardingChapters.length, progress: 1 };
  }
  const chapter = onboardingChapters[i];
  const at = chapter.steps.indexOf(stepKey);
  return {
    label: `${chapter.title} · ${i + 1} of ${onboardingChapters.length}`,
    index: i,
    progress: (at + 1) / chapter.steps.length,
  };
}

export default function OnboardingFlow() {
  const router = useRouter();
  const { saveOnboarding, userId, universityKey } = useAppState();

  const [step, setStep] = useState(0); // 0-based index into STEPS
  // Why the last save failed, shown on the screen instead of swallowed.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [profile, setProfile] = useState<OnboardingProfile>(emptyProfile);
  const [newInterest, setNewInterest] = useState<string | null>(null); // Screen 6 UI
  /*
    Nothing is written back to the draft until the draft has been READ. Without
    this the first render — an empty profile on screen 1 — would save itself
    over the answers we were about to restore.
  */
  const [restored, setRestored] = useState(false);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  /*
    THE PHOTO. Downscaled harder than the one on the Profile tab (640px, not
    1280): every answer is mirrored into a localStorage draft after each change,
    and a full-size data URL there can blow the storage quota — which fails
    silently and would stop the REST of the answers from being saved.
  */
  const pickPhoto = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      set("photo", await fileToDataUrl(file, 640, 0.8));
    } catch {
      // An image the browser can't decode just leaves the photo as it was.
    }
  };

  // Coming back in: pick the flow up exactly where it was left. localStorage
  // can only be touched after mount, so this can't be the initial state.
  useEffect(() => {
    const draft = readOnboardingDraft(userId);
    if (draft) {
      setProfile(draft.profile);
      setStep(Math.min(Math.max(draft.step, 0), STEPS.length - 1));
    }
    setRestored(true);
  }, [userId]);

  // Going out: every answer and the screen it was given on, after every change.
  useEffect(() => {
    if (!restored) return;
    writeOnboardingDraft(userId, step, profile);
  }, [restored, userId, step, profile]);

  const meta = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const set = <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  // Keep the Screen 7 mentorship answers consistent with eligibility if the user
  // goes back and changes their class year or experience level.
  useEffect(() => {
    setProfile((p) => {
      const isFreshman = p.classYear === freshmanClassYear;
      const next = {
        ...p,
        mentorFreshmen: isFreshman ? false : p.mentorFreshmen,
        beMentored: isFreshman ? p.beMentored : false,
        helpOthers: p.experienceLevel === "beginner" ? false : p.helpOthers,
        getHelp: p.experienceLevel === "advanced" ? false : p.getHelp,
      };
      const same =
        next.mentorFreshmen === p.mentorFreshmen &&
        next.beMentored === p.beMentored &&
        next.helpOthers === p.helpOthers &&
        next.getHelp === p.getHelp;
      return same ? p : next;
    });
  }, [profile.classYear, profile.experienceLevel]);

  // Required-field gating per screen (only built screens enforce; rest pass for now).
  const canContinue = (): boolean => {
    switch (meta.key) {
      case "basics":
        return (
          nameError(profile.name) === null && profile.classYear !== "" && profile.sex !== ""
        );
      case "residence":
        return profile.residence !== "";
      case "background":
        // The chapter that gives two strangers something to say. "Undecided"
        // is a concentration; three interests is the floor (lib/onboarding.ts).
        return profile.concentration !== "" && profile.interests.length >= MIN_INTERESTS;
      case "topgyms":
        return profile.topGyms.length > 0;
      case "schedule":
        return Object.values(profile.trainingSchedule).some((blocks) => blocks.length > 0);
      case "preferences":
        // Nothing here is required: the switch and the toggles all have a
        // sensible off state. (Partner preference left this screen on
        // 2026-09-21; it is still on the Profile tab, and an empty answer
        // reads as "any" in matching.sql.)
        return true;
      case "alsodo":
        /*
          The screen as a whole is optional, but a HALF-answer isn't allowed
          through: an activity ticked with no frequency tells matching nothing,
          and "something else" with no name tells it less than that. Untick it
          or finish it.
        */
        return profile.otherActivities.every(
          (a) => a.perWeek !== "" && (a.key !== "other" || a.note.trim() !== ""),
        );
      case "activity": {
        // Each activity has its own required answers. Experience level is a
        // gym question; the split and how long you've run are optional.
        switch (profile.primaryActivity) {
          case "gym":
            return profile.experienceLevel !== "" && profile.gymStyle !== "";
          case "running":
            return profile.runningDistance.trim() !== "" && profile.runningPace.trim() !== "";
          case "cardio":
            return profile.cardioType !== "";
          case "other":
            return profile.activityOther.trim() !== "";
          default:
            return false; // nothing picked yet
        }
      }
      default:
        return true;
    }
  };

  const goNext = () => {
    if (isLast) finish();
    else setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const finish = async () => {
    setSaveError(null);
    const failure = await saveOnboarding(profile); // saves to the DB + marks this account onboarded
    if (failure) {
      // The draft stays on this device, so nothing is lost — say so instead of
      // quietly walking into an app that will bounce them straight back here.
      setSaveError(failure);
      return;
    }
    clearOnboardingDraft(); // the answers live in the database now
    router.replace("/gyms");
  };

  const renderBody = () => {
    switch (meta.key) {
      case "basics":
        return (
          <div>
            <FieldLabel>What should we call you?</FieldLabel>
            <div className="mb-4">
              <TextField
                value={profile.name}
                onChange={(v) => set("name", v)}
                placeholder="e.g. Martin Novák"
                ariaLabel="Your name"
              />
              {/* Only complains once something has been typed — an empty field
                  on arrival is not a mistake, it's the starting state. */}
              {profile.name.trim() !== "" && nameError(profile.name) && (
                <p className="mt-1.5 text-[11px] text-danger">{nameError(profile.name)}</p>
              )}
            </div>

            <FieldLabel>Class year</FieldLabel>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {classYears.map((y) => (
                <Pill
                  key={y}
                  label={y}
                  selected={profile.classYear === y}
                  onClick={() =>
                    // Changing class year clears a now-possibly-invalid residence.
                    setProfile((p) =>
                      p.classYear === y ? p : { ...p, classYear: y, residence: "" }
                    )
                  }
                />
              ))}
            </div>

            <FieldLabel>Sex</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {sexOptions.map((s) => (
                <Pill key={s} label={s} selected={profile.sex === s} onClick={() => set("sex", s)} />
              ))}
            </div>
          </div>
        );
      case "activity":
        return (
          <div>
            {/* Activity cards (pick one) */}
            <div className="mb-5 grid grid-cols-2 gap-2.5">
              {primaryActivities.map((a) => {
                const ActIcon = activityIcons[a.icon];
                const on = profile.primaryActivity === a.key;
                return (
                  <button
                    key={a.key}
                    type="button"
                    onClick={() => set("primaryActivity", a.key)}
                    aria-pressed={on}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border p-4 shadow-card transition-colors ${
                      on ? "border-primary bg-primary-tint" : "border-border bg-surface"
                    }`}
                  >
                    <span className="text-accent">
                      <ActIcon size={22} />
                    </span>
                    <span className="text-[13px] font-medium text-text">{a.label}</span>
                  </button>
                );
              })}
            </div>

            {/* From here down, each activity asks its OWN questions.
                Experience level is one of the GYM ones — "advanced" says
                nothing about a cross-trainer, and a wrong answer would feed
                matching. */}
            {profile.primaryActivity === "gym" && (
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>How do you train?</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {gymStyles.map((g) => (
                      <Pill
                        key={g}
                        label={g}
                        selected={profile.gymStyle === g}
                        onClick={() => set("gymStyle", g)}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <FieldLabel>Experience level</FieldLabel>
                  <div className="flex flex-col gap-2">
                    {experienceLevels.map((lvl) => {
                      const on = profile.experienceLevel === lvl.key;
                      return (
                        <button
                          key={lvl.key}
                          type="button"
                          onClick={() => set("experienceLevel", lvl.key)}
                          aria-pressed={on}
                          className={`rounded-[10px] border p-3 text-left transition-colors ${
                            on ? "border-primary bg-primary-tint" : "border-border bg-surface"
                          }`}
                        >
                          <div className="text-[13px] font-medium text-text">{lvl.name}</div>
                          <div className="text-[11px] text-muted">{lvl.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <FieldLabel>Your split — optional</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {/* Tapping the chosen split again clears it: it's optional,
                        so there has to be a way back to no answer. */}
                    {gymSplits.map((sp) => (
                      <Pill
                        key={sp}
                        label={sp}
                        selected={profile.gymSplit === sp}
                        onClick={() => set("gymSplit", profile.gymSplit === sp ? "" : sp)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {profile.primaryActivity === "running" && (
              <div className="flex flex-col gap-5">
                <div>
                  <FieldLabel>Kilometres or miles?</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {runningUnits.map((u) => (
                      <Pill
                        key={u.key}
                        label={u.label}
                        selected={profile.runningUnit === u.key}
                        onClick={() => set("runningUnit", u.key)}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <FieldLabel>Usual distance</FieldLabel>
                    <TextField
                      value={profile.runningDistance}
                      onChange={(v) => set("runningDistance", v)}
                      placeholder={runningHints[profile.runningUnit].distance}
                      ariaLabel="Usual distance"
                    />
                  </div>
                  <div>
                    <FieldLabel>Usual pace</FieldLabel>
                    <TextField
                      value={profile.runningPace}
                      onChange={(v) => set("runningPace", v)}
                      placeholder={runningHints[profile.runningUnit].pace}
                      ariaLabel="Usual pace"
                    />
                  </div>
                </div>

                <div>
                  <FieldLabel>How long have you been running? — optional</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {runningExperiences.map((r) => (
                      <Pill
                        key={r}
                        label={r}
                        selected={profile.runningExperience === r}
                        onClick={() =>
                          set("runningExperience", profile.runningExperience === r ? "" : r)
                        }
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {profile.primaryActivity === "cardio" && (
              <>
                <FieldLabel>What do you do most often?</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {cardioTypes.map((c) => (
                    <Pill key={c} label={c} selected={profile.cardioType === c} onClick={() => set("cardioType", c)} />
                  ))}
                </div>
              </>
            )}

            {profile.primaryActivity === "other" && (
              <>
                <FieldLabel>Tell us what</FieldLabel>
                <TextField
                  value={profile.activityOther}
                  onChange={(v) => set("activityOther", v)}
                  placeholder="e.g. Climbing, martial arts…"
                  ariaLabel="Your activity"
                />
              </>
            )}
          </div>
        );
      case "alsodo": {
        /*
          Everything you do that ISN'T your main thing. Deliberately shallow:
          which ones, how often, and a usual day only if one actually exists.
          See the note above OtherActivity in lib/onboarding.ts for why a run
          is not asked to name an hour the way a gym session is.
        */
        const others = primaryActivities.filter((a) => a.key !== profile.primaryActivity);
        const picked = (key: string) => profile.otherActivities.find((o) => o.key === key);

        const toggle = (key: OtherActivity["key"]) =>
          set(
            "otherActivities",
            picked(key)
              ? profile.otherActivities.filter((o) => o.key !== key)
              : [...profile.otherActivities, { key, perWeek: "", days: [], note: "" }],
          );

        const patch = (key: string, changes: Partial<OtherActivity>) =>
          set(
            "otherActivities",
            profile.otherActivities.map((o) => (o.key === key ? { ...o, ...changes } : o)),
          );

        const toggleDay = (key: string, day: string) => {
          const days = picked(key)?.days ?? [];
          patch(key, { days: days.includes(day) ? days.filter((d) => d !== day) : [...days, day] });
        };

        return (
          <div className="flex flex-col gap-2.5">
            {others.map((a) => {
              const ActIcon = activityIcons[a.icon];
              const chosen = picked(a.key);
              const on = Boolean(chosen);
              return (
                <div
                  key={a.key}
                  className={`rounded-xl border transition-colors ${
                    on ? "border-primary bg-primary-tint" : "border-border bg-surface"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(a.key)}
                    aria-pressed={on}
                    className="flex min-h-11 w-full items-center gap-3 p-3.5 text-left"
                  >
                    <span className="text-accent">
                      <ActIcon size={20} />
                    </span>
                    <span className="flex-1 text-[13px] font-medium text-text">
                      {otherActivityLabels[a.key]}
                    </span>
                    <span
                      className={`flex h-[22px] w-[22px] items-center justify-center rounded-full border ${
                        on
                          ? "border-primary bg-primary text-primary-contrast"
                          : "border-border text-transparent"
                      }`}
                    >
                      <IconCheck size={13} />
                    </span>
                  </button>

                  {on && chosen && (
                    <div className="flex flex-col gap-4 border-t border-border px-3.5 pb-4 pt-3.5">
                      {a.key === "other" && (
                        <div>
                          <FieldLabel>What is it?</FieldLabel>
                          <TextField
                            value={chosen.note}
                            onChange={(v) => patch(a.key, { note: v })}
                            placeholder="e.g. Climbing, martial arts…"
                            ariaLabel="What the activity is"
                          />
                        </div>
                      )}

                      <div>
                        <FieldLabel>How often?</FieldLabel>
                        <div className="flex flex-wrap gap-1.5">
                          {activityFrequencies.map((f) => (
                            <Pill
                              key={f}
                              label={`${f} a week`}
                              selected={chosen.perWeek === f}
                              onClick={() => patch(a.key, { perWeek: f })}
                            />
                          ))}
                        </div>
                      </div>

                      <div>
                        <FieldLabel>A usual day? — optional</FieldLabel>
                        <div className="flex gap-1.5">
                          {weekDays.map((d) => {
                            const dayOn = chosen.days.includes(d.key);
                            return (
                              <button
                                key={d.key}
                                type="button"
                                onClick={() => toggleDay(a.key, d.key)}
                                aria-pressed={dayOn}
                                aria-label={d.label}
                                className={`h-10 flex-1 rounded-[10px] border text-[13px] font-medium transition-colors ${
                                  dayOn
                                    ? "border-primary bg-primary text-primary-contrast"
                                    : "border-border bg-surface text-muted"
                                }`}
                              >
                                {d.letter}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      }
      case "residence": {
        const isFreshman = profile.classYear === freshmanClassYear;
        return (
          <div>
            <FieldLabel>{isFreshman ? "Your Yard dorm" : "Your house"}</FieldLabel>
            <SearchableDropdown
              options={residenceOptions(profile.classYear)}
              value={profile.residence}
              onChange={(v) => set("residence", v)}
              placeholder={isFreshman ? "Select your dorm" : "Select your house"}
              searchPlaceholder={isFreshman ? "Search dorms…" : "Search houses…"}
              ariaLabel="Where you live"
              groupOf={residenceGroup}
              icon={(o) => <ResidenceEmblem residence={o} universityKey={universityKey} />}
            />
          </div>
        );
      }
      case "topgyms": {
        const top = profile.topGyms;
        const available = verifiedGyms.filter((g) => !top.includes(g));
        const move = (i: number, dir: -1 | 1) => {
          const j = i + dir;
          if (j < 0 || j >= top.length) return;
          const arr = [...top];
          [arr[i], arr[j]] = [arr[j], arr[i]];
          set("topGyms", arr);
        };
        const add = (g: string) => {
          if (top.length >= MAX_TOP_GYMS || top.includes(g)) return;
          set("topGyms", [...top, g]);
        };
        const remove = (g: string) => set("topGyms", top.filter((x) => x !== g));
        return (
          <div>
            {top.length > 0 && (
              <div className="mb-4 flex flex-col gap-2">
                {top.map((g, i) => (
                  <div
                    key={g}
                    className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-tint text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-text">{g}</span>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${g} up`}
                      className="text-muted disabled:opacity-30"
                    >
                      <IconChevronUp size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === top.length - 1}
                      aria-label={`Move ${g} down`}
                      className="text-muted disabled:opacity-30"
                    >
                      <IconChevronDown size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(g)}
                      aria-label={`Remove ${g}`}
                      className="text-muted"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {top.length < MAX_TOP_GYMS ? (
              <SearchableDropdown
                options={available}
                value=""
                onChange={add}
                placeholder="Add a gym"
                searchPlaceholder="Search gyms…"
                ariaLabel="Add a gym"
              />
            ) : null}
          </div>
        );
      }
      case "schedule": {
        /*
          The week as a grid of hours (WeekHourGrid): tap every hour you're
          usually free. It replaced "pick days, then one usual time, then
          maybe a per-day panel" — three questions the grid answers at once.

          The answer is still stored as real hour ranges ("17:00-19:00"),
          which is what matching compares; the grid just joins lit hours up.
          Each hour — a tap, or one cell of a swipe — is applied to the
          schedule as it is AT THAT MOMENT, so a fast stroke lands whole.
        */
        const schedule = profile.trainingSchedule;
        const setHour = (day: string, hour: number, on: boolean) =>
          setProfile((prev) => {
            const hours = hoursOfDay(prev.trainingSchedule[day]);
            if (on) hours.add(hour);
            else hours.delete(hour);
            const next = { ...prev.trainingSchedule };
            const slots = hoursToSlots(hours);
            if (slots.length > 0) next[day] = slots;
            else delete next[day];
            return { ...prev, trainingSchedule: next };
          });

        const chosenDays = weekDays.filter((d) => hoursOfDay(schedule[d.key]).size > 0);
        const totalHours = chosenDays.reduce((n, d) => n + hoursOfDay(schedule[d.key]).size, 0);

        return (
          <div className="flex flex-col gap-2.5">
            <div className="rounded-2xl border border-border bg-surface p-3">
              <WeekHourGrid schedule={schedule} onSet={setHour} />
            </div>
            {/* What you have picked, added up — not an instruction. Nothing
                at all until there is something to add up. */}
            {chosenDays.length > 0 && (
              <p className="px-1 text-[12px] text-muted">
                {`${chosenDays.map((d) => d.label.slice(0, 3)).join(", ")} · ${totalHours} ${
                  totalHours === 1 ? "hour" : "hours"
                } a week`}
              </p>
            )}
          </div>
        );
      }
      case "background": {
        const toggleInterest = (i: string) =>
          set(
            "interests",
            profile.interests.includes(i)
              ? profile.interests.filter((x) => x !== i)
              : [...profile.interests, i]
          );
        // Anything chosen that isn't one of our ready-made pills was typed by
        // this person. Those get their own row, each with an × on it.
        const ownInterests = profile.interests.filter((i) => !interestOptions.includes(i));
        const addInterest = () => {
          const value = (newInterest ?? "").trim();
          setNewInterest(null);
          if (value === "" || profile.interests.includes(value)) return;
          set("interests", [...profile.interests, value]);
        };
        return (
          <div className="flex flex-col gap-5">
            <div>
              <FieldLabel>What are you studying?</FieldLabel>
              <SearchableDropdown
                options={concentrations}
                value={profile.concentration}
                onChange={(v) => set("concentration", v)}
                placeholder="Select your concentration"
                ariaLabel="Concentration"
              />
            </div>

            <div>
              <FieldLabel>Where are you from? — optional</FieldLabel>
              {/* The CITY, above the country it sits in. On a campus where most
                  of the list answers "United States", the country alone says
                  almost nothing — "New York" is the half somebody recognises
                  and opens with. Free text, because there is no city list here
                  and this line is for reading, not filtering. */}
              <input
                value={profile.hometownCity}
                maxLength={40}
                onChange={(e) => set("hometownCity", e.target.value)}
                placeholder="Your city or town"
                aria-label="City or town"
                className="mb-2 w-full rounded-[10px] border border-border bg-surface px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <SearchableDropdown
                options={countries}
                value={profile.hometownCountry}
                onChange={(v) => set("hometownCountry", v)}
                placeholder="Select your country"
                searchPlaceholder="Search countries…"
                ariaLabel="Country"
              />
            </div>

            <div>
              <FieldLabel>Languages you speak — optional</FieldLabel>
              {/* English is on and can't be taken off — you're at Harvard. Every
                  language you do add leaves the list, so what's left to scroll
                  is only what you haven't said yet. */}
              <SearchableDropdown
                multiple
                hideSelected
                locked={[campusLanguage]}
                options={languageOptions}
                value={profile.languages}
                onChange={(v) => set("languages", v)}
                placeholder="Add languages"
                searchPlaceholder="Search languages…"
                ariaLabel="Languages"
              />
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <FieldLabel>Interests outside training</FieldLabel>
                {/* The floor, and how far off it you are — said as a count, so
                    the disabled Continue button is never a mystery. */}
                <span
                  className={`mb-2 text-[11px] tabular-nums ${
                    profile.interests.length >= MIN_INTERESTS ? "text-success" : "text-muted"
                  }`}
                >
                  {profile.interests.length >= MIN_INTERESTS
                    ? `${profile.interests.length} picked`
                    : `pick ${MIN_INTERESTS - profile.interests.length} more`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {interestOptions.map((i) => (
                  <Pill
                    key={i}
                    label={i}
                    selected={profile.interests.includes(i)}
                    onClick={() => toggleInterest(i)}
                  />
                ))}

                {/* Whatever people typed themselves, always on and removable. */}
                {ownInterests.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleInterest(i)}
                    aria-label={`Remove ${i}`}
                    className="tap44 flex items-center gap-1.5 rounded-full border border-primary bg-primary-tint px-3.5 py-2 text-[13px] text-primary"
                  >
                    {i}
                    <IconX size={13} />
                  </button>
                ))}

                {newInterest === null ? (
                  <button
                    type="button"
                    onClick={() => setNewInterest("")}
                    className="tap44 flex items-center gap-1 rounded-full border border-dashed border-border bg-surface px-3.5 py-2 text-[13px] text-muted"
                  >
                    <IconPlus size={13} />
                    Add
                  </button>
                ) : null}
              </div>

              {newInterest !== null && (
                <div className="mt-2 flex items-center gap-2">
                  <input
                    autoFocus
                    value={newInterest}
                    maxLength={MAX_INTEREST_LENGTH}
                    onChange={(e) => setNewInterest(e.target.value)}
                    /* Enter adds it, Escape backs out — the two things a thumb
                       on a phone keyboard reaches for. */
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addInterest();
                      } else if (e.key === "Escape") {
                        setNewInterest(null);
                      }
                    }}
                    placeholder="Your own interest"
                    aria-label="Your own interest"
                    className="min-w-0 flex-1 rounded-[10px] border border-border bg-surface px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={addInterest}
                    disabled={newInterest.trim() === ""}
                    className="tap44 flex-shrink-0 rounded-full border border-primary bg-primary-tint px-4 py-2 text-[13px] text-primary disabled:opacity-40"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      }
      case "preferences": {
        const isFreshman = profile.classYear === freshmanClassYear;
        // Peer advising: freshmen can only be mentored; upperclassmen can only mentor.
        const peerRows = peerAdvising.filter((r) =>
          isFreshman ? r.key === "beMentored" : r.key === "mentorFreshmen"
        );
        // Gym mentorship by experience: beginner -> get help only; advanced -> help only;
        // intermediate -> both.
        const gymRows = gymMentorship.filter((r) => {
          if (profile.experienceLevel === "beginner") return r.key === "getHelp";
          if (profile.experienceLevel === "advanced") return r.key === "helpOthers";
          return true;
        });
        const renderToggleRows = (rows: typeof peerAdvising) =>
          rows.map((row, i) => (
            <div
              key={row.key}
              className={`flex items-start justify-between gap-3 py-3 ${
                i < rows.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className="flex-1">
                <div className="text-[13px] font-medium text-text">{row.label}</div>
              </div>
              <Toggle on={profile[row.key]} onChange={() => set(row.key, !profile[row.key])} ariaLabel={row.label} />
            </div>
          ));
        return (
          <div className="flex flex-col gap-5">
            {/* "I prefer to train alone" is NOT asked here (owner, 2026-09-22).
                It is a setting, not an introduction — and it already exists as
                one, in app/settings/page.tsx. */}
            <Section title="Peer advising">
              {renderToggleRows(peerRows)}
            </Section>

            {profile.experienceLevel !== "" && (
              <Section title="Gym mentorship">
                {renderToggleRows(gymRows)}
              </Section>
            )}
          </div>
        );
      }
      case "finish":
        return (
          <div className="flex flex-col gap-5">
            <div>
              <FieldLabel>Bio</FieldLabel>
              <textarea
                value={profile.bio}
                maxLength={160}
                onChange={(e) => set("bio", e.target.value)}
                placeholder="A line about you — your sport, goals, what you're training for."
                aria-label="Bio"
                className="min-h-[90px] w-full resize-none rounded-[10px] border border-border bg-surface px-3.5 py-3 text-base text-text placeholder:text-muted focus:border-primary focus:outline-none"
              />
              <div className="mt-1 text-right text-[11px] text-muted">{profile.bio.length} / 160</div>
            </div>

            <div>
              <FieldLabel>Profile photo</FieldLabel>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickPhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                aria-label={profile.photo ? "Change your photo" : "Add a photo"}
                className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-7 text-center"
              >
                {profile.photo ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={profile.photo}
                      alt="Your profile photo"
                      className="h-[84px] w-[84px] rounded-full border-2 border-primary object-cover"
                    />
                    <span className="text-[13px] text-text">Change photo</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted">
                      <IconCamera size={28} />
                    </span>
                    <span className="text-[13px] text-text">Add a photo</span>
                  </>
                )}
              </button>
              {profile.photo && (
                <button
                  type="button"
                  onClick={() => set("photo", null)}
                  className="tap44 mt-2 w-full text-center text-[12px] text-muted"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>
        );
      default:
        return (
          <div className="rounded-2xl border border-border bg-surface p-6 text-center text-[13px] text-muted shadow-card">
            This screen is coming next.
          </div>
        );
    }
  };

  /*
    The last screen finishes the flow. It used to be a notifications ask with a
    gold "Enable notifications" CTA; that screen is gone (owner, 2026-09-22 —
    notifications don't work yet, and an ask nobody can honour is worse than no
    ask). Permission is still asked for later, from Settings.
  */
  const ctaProps = isLast
    ? {
        primaryLabel: "Finish",
        primaryVariant: "primary" as const,
        primaryDisabled: !canContinue(),
        onPrimary: finish,
      }
    : {
        primaryLabel: "Continue",
        primaryVariant: "primary" as const,
        primaryDisabled: !canContinue(),
        onPrimary: goNext,
      };

  // The chapter this screen sits in — what the progress bar counts.
  const chapter = chapterMeta(meta.key);

  return (
    <OnboardingShell
      chapterLabel={chapter.label}
      chapterIndex={chapter.index}
      chapterTotal={onboardingChapters.length}
      chapterProgress={chapter.progress}
      showBack={step > 0}
      onBack={goBack}
      skippable={!!meta.skippable}
      onSkip={goNext}
      title={meta.title}
      centered={meta.centered}
      {...ctaProps}
    >
      {saveError && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-danger"
        >
          Your answers couldn&apos;t be saved ({saveError}). They are kept on this
          device — check your connection and tap the button again.
        </p>
      )}
      {renderBody()}
    </OnboardingShell>
  );
}
