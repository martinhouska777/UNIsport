"use client";

/*
  THE SHORT ATHLETE SETUP — the varsity-first way into UNIsport.

  A rower who arrives through a team invite gets asked two things, not nine.
  The student onboarding is about finding training partners: gyms, splits,
  weekly availability, interests, who you'd like to train with. None of that
  means anything to someone whose training is written by their coach, so this
  asks only what the varsity side actually shows — name and class year — plus
  sex, which the profile displays.

  It writes onto the SAME profile row the student side uses and marks only the
  varsity flag, so the student app stays available, unstarted, whenever they
  want it (offered from the mode switcher).

  Chrome and controls are the onboarding ones, so this feels like part of the
  same app rather than a second front door.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import OnboardingShell from "@/components/onboarding/OnboardingShell";
import { FieldLabel, Pill, TextField } from "@/components/onboarding/controls";
import { classYears, sexOptions } from "@/lib/onboarding";
import { varsityTheme, varsityLightTheme, VARSITY_HOME } from "@/lib/varsity/theme";
import { PENDING_INVITE_KEY } from "@/lib/varsity/invites";

export default function VarsitySetupPage() {
  const router = useRouter();
  const { ready, loggedIn, varsityReady, saveVarsitySetup } = useAppState();

  const [name, setName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [sex, setSex] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!loggedIn) router.replace("/");
    // Already done — don't make anyone re-answer it.
    else if (varsityReady) router.replace(VARSITY_HOME);
  }, [ready, loggedIn, varsityReady, router]);

  if (!ready || !loggedIn || varsityReady) return null;

  const finish = async () => {
    setSaving(true);
    await saveVarsitySetup({ name: name.trim(), classYear, sex });
    /*
      Back to the invite that started this, if there was one — the captain's
      queue should show a name, not "Unnamed", so the request is only made
      after this screen. With no parked code (a returning athlete re-doing
      setup) go straight to Varsity Mode.
    */
    let parked: string | null = null;
    try {
      parked = localStorage.getItem(PENDING_INVITE_KEY);
    } catch {
      /* private browsing — fall through to the home screen */
    }
    router.replace(parked ? `/join/${parked}` : VARSITY_HOME);
  };

  return (
    <ThemeProvider
      tokens={varsityTheme}
      light={varsityLightTheme}
      paintRoot
      className="h-dvh bg-background"
    >
      <OnboardingShell
        step={1}
        total={1}
        showBack={false}
        onBack={() => {}}
        skippable={false}
        onSkip={() => {}}
        title="Let's set you up."
        subtitle="Two things, and you're into your team's training. The rest of your profile can wait."
        primaryLabel={saving ? "Saving…" : "Continue"}
        primaryDisabled={!name.trim() || !classYear || saving}
        onPrimary={finish}
      >
        <div>
          <FieldLabel>What should we call you?</FieldLabel>
          <div className="mb-4">
            <TextField
              value={name}
              onChange={setName}
              placeholder="e.g. Martin Novák"
              ariaLabel="Your name"
            />
          </div>
          <p className="mb-4 -mt-2 text-[11px] leading-relaxed text-muted">
            Your captain sees this when they approve you, so use the name they know.
          </p>

          <FieldLabel>Class year</FieldLabel>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {classYears.map((y) => (
              <Pill
                key={y}
                label={y}
                selected={classYear === y}
                onClick={() => setClassYear(y)}
              />
            ))}
          </div>

          <FieldLabel>Sex</FieldLabel>
          <div className="flex flex-wrap gap-1.5">
            {sexOptions.map((s) => (
              <Pill key={s} label={s} selected={sex === s} onClick={() => setSex(s)} />
            ))}
          </div>
        </div>
      </OnboardingShell>
    </ThemeProvider>
  );
}
