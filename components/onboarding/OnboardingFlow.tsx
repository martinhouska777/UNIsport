"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { Pill, FieldLabel, TextField } from "@/components/onboarding/controls";
import {
  classYears,
  genderOptions,
  emptyProfile,
  type OnboardingProfile,
} from "@/lib/onboarding";

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
        return profile.name.trim() !== "" && profile.classYear !== "" && profile.gender !== "";
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
                <Pill key={y} label={y} selected={profile.classYear === y} onClick={() => set("classYear", y)} />
              ))}
            </div>

            <FieldLabel>Gender</FieldLabel>
            <div className="flex flex-wrap gap-1.5">
              {genderOptions.map((g) => (
                <Pill key={g} label={g} selected={profile.gender === g} onClick={() => set("gender", g)} />
              ))}
            </div>
          </div>
        );
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
