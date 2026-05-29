"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { Pill, FieldLabel, TextField } from "@/components/onboarding/controls";
import SearchableDropdown from "@/components/onboarding/SearchableDropdown";
import {
  IconBarbell,
  IconRun,
  IconActivity,
  IconPlus,
  IconChevronUp,
  IconChevronDown,
  IconX,
} from "@/components/icons";
import {
  classYears,
  sexOptions,
  freshmanClassYear,
  residenceOptions,
  primaryActivities,
  experienceLevels,
  gymSplits,
  cardioTypes,
  verifiedGyms,
  MAX_TOP_GYMS,
  emptyProfile,
  type OnboardingProfile,
} from "@/lib/onboarding";

const activityIcons: Record<string, (p: { size?: number; className?: string }) => React.ReactNode> = {
  barbell: IconBarbell,
  run: IconRun,
  activity: IconActivity,
  plus: IconPlus,
};

type StepMeta = {
  key: string;
  title: string;
  subtitle?: string;
  skippable?: boolean;
  centered?: boolean;
};

// The 9 screens (structure per spec). Bodies are filled in screen by screen.
const STEPS: StepMeta[] = [
  { key: "basics", title: "Let's get to know you.", subtitle: "A few quick basics so other members can find you." },
  { key: "residence", title: "Where do you live on campus?", subtitle: "We'll connect you with people nearby." },
  { key: "activity", title: "What do you train?", subtitle: "Pick your main thing — you can do everything else too." },
  { key: "topgyms", title: "Your top gyms.", subtitle: "Where do you actually train? Pick and rank your top 3." },
  { key: "schedule", title: "When do you train?", subtitle: "Tap the days you train and pick your usual times." },
  { key: "background", title: "Who are you, outside the gym?", subtitle: "All optional — shared backgrounds make better gym friends.", skippable: true },
  { key: "preferences", title: "Your preferences.", subtitle: "Who you'd like to train with and how you want to help out." },
  { key: "finish", title: "Finish your profile.", subtitle: "All optional — add a little more about you.", skippable: true },
  { key: "notifications", title: "Stay in the loop.", subtitle: "Get notified the moment something matters.", centered: true },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const { completeOnboarding } = useAppState();

  const [step, setStep] = useState(0); // 0-based index into STEPS
  const [profile, setProfile] = useState<OnboardingProfile>(emptyProfile);

  const meta = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const set = <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) =>
    setProfile((p) => ({ ...p, [key]: value }));

  // Required-field gating per screen (only built screens enforce; rest pass for now).
  const canContinue = (): boolean => {
    switch (meta.key) {
      case "basics":
        return profile.name.trim() !== "" && profile.classYear !== "" && profile.sex !== "";
      case "residence":
        return profile.residence !== "";
      case "topgyms":
        return profile.topGyms.length > 0;
      case "activity": {
        if (profile.primaryActivity === "" || profile.experienceLevel === "") return false;
        switch (profile.primaryActivity) {
          case "gym":
            return profile.gymSplit !== "";
          case "running":
            return profile.runningDistance.trim() !== "" && profile.runningPace.trim() !== "";
          case "cardio":
            return profile.cardioType !== "";
          case "other":
            return profile.activityOther.trim() !== "";
          default:
            return false;
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

  const finish = () => {
    // No Supabase yet — keep the object in memory and log it so it's inspectable.
    // eslint-disable-next-line no-console
    console.log("UNIsport onboarding profile:", profile);
    completeOnboarding();
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
                    className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-colors ${
                      on ? "border-primary bg-primary/10" : "border-border bg-surface-2"
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

            {/* Experience level (always shown) */}
            <FieldLabel>Experience level</FieldLabel>
            <div className="mb-5 flex flex-col gap-2">
              {experienceLevels.map((lvl) => {
                const on = profile.experienceLevel === lvl.key;
                return (
                  <button
                    key={lvl.key}
                    type="button"
                    onClick={() => set("experienceLevel", lvl.key)}
                    aria-pressed={on}
                    className={`rounded-[10px] border p-3 text-left transition-colors ${
                      on ? "border-primary bg-primary/10" : "border-border bg-surface-2"
                    }`}
                  >
                    <div className="text-[13px] font-medium text-text">{lvl.name}</div>
                    <div className="text-[11px] text-muted">{lvl.desc}</div>
                  </button>
                );
              })}
            </div>

            {/* Conditional on the chosen activity */}
            {profile.primaryActivity === "gym" && (
              <>
                <FieldLabel>Your split</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {gymSplits.map((s) => (
                    <Pill key={s} label={s} selected={profile.gymSplit === s} onClick={() => set("gymSplit", s)} />
                  ))}
                </div>
              </>
            )}

            {profile.primaryActivity === "running" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <FieldLabel>Usual distance</FieldLabel>
                  <TextField
                    value={profile.runningDistance}
                    onChange={(v) => set("runningDistance", v)}
                    placeholder="e.g. 5 km"
                    ariaLabel="Usual distance"
                  />
                </div>
                <div>
                  <FieldLabel>Usual pace</FieldLabel>
                  <TextField
                    value={profile.runningPace}
                    onChange={(v) => set("runningPace", v)}
                    placeholder="e.g. 5:00 /km"
                    ariaLabel="Usual pace"
                  />
                </div>
              </div>
            )}

            {profile.primaryActivity === "cardio" && (
              <>
                <FieldLabel>Type</FieldLabel>
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
              ariaLabel="Where you live"
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
                    className="flex items-center gap-2.5 rounded-[10px] border border-border bg-surface-2 px-3 py-2.5"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
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
            ) : (
              <p className="text-[12px] text-muted">That&apos;s your top 3 — remove one to swap.</p>
            )}

            <p className="mt-2 text-[11px] text-muted">
              Pick up to 3, in order — your #1 is where you train most.
            </p>
          </div>
        );
      }
      default:
        return (
          <div className="rounded-xl border border-border bg-surface-2 p-6 text-center text-[13px] text-muted">
            This screen is coming next.
          </div>
        );
    }
  };

  // Screen 9 finishes with a gold CTA + "Maybe later"; all others use Continue.
  const ctaProps = isLast
    ? {
        primaryLabel: "Enable notifications",
        primaryVariant: "gold" as const,
        onPrimary: finish,
        secondaryLabel: "Maybe later",
        onSecondary: finish,
      }
    : {
        primaryLabel: "Continue",
        primaryVariant: "primary" as const,
        primaryDisabled: !canContinue(),
        onPrimary: goNext,
      };

  return (
    <OnboardingShell
      step={step + 1}
      total={STEPS.length}
      showBack={step > 0}
      onBack={goBack}
      skippable={!!meta.skippable}
      onSkip={goNext}
      title={meta.title}
      subtitle={meta.subtitle}
      centered={meta.centered}
      {...ctaProps}
    >
      {renderBody()}
    </OnboardingShell>
  );
}
