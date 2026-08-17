"use client";

/*
  THE SHORT ATHLETE SETUP — the varsity-first way into UNIsport.

  A rower who arrives through a team invite gets asked a handful of things, not
  nine screens. The student onboarding is about finding training partners: gyms,
  splits, weekly availability, interests, who you'd like to train with. None of
  that means anything to someone whose training is written by their coach.

  So this asks two kinds of question and nothing else:
    • WHO YOU ARE — name, class year, sex. What the varsity profile displays.
    • HOW YOU ROW — rower or coxswain, which side, height and weight. What the
      coach's lineup builder needs and currently has to guess: its roster
      defaults every athlete to "Both" sides because nobody was ever asked.

  Everything is written onto the SAME profile row the student side uses, in ONE
  request, and marks only the varsity flag — so the student app stays available,
  unstarted, whenever they want it (offered from the mode switcher).

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
import { boatRoleOptions, sideOptions, type BoatRole } from "@/lib/varsity/athleteProfile";
import { weightOptions, weightToKg, type WeightUnit } from "@/lib/varsity/units";
import type { Side } from "@/lib/varsity/coachLineup";

// Digits only, so nobody can save "about 82" as a weight.
const digits = (v: string) => v.replace(/[^\d]/g, "");
const decimal = (v: string) => v.replace(/[^\d.]/g, "");

export default function VarsitySetupPage() {
  const router = useRouter();
  const { ready, loggedIn, varsityReady, saveVarsitySetup } = useAppState();

  const [name, setName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [sex, setSex] = useState("");
  // "Both" is the default because it is what the coach's roster already assumes
  // — answering can only ever make the lineup builder more accurate, never less.
  const [boatRole, setBoatRole] = useState<BoatRole>("Rower");
  const [side, setSide] = useState<Side>("B");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  // Which unit the number above is typed in. Stored weight is ALWAYS kilos
  // (lib/varsity/units.ts), so this choice can never corrupt the record — and
  // it is saved, so the rest of the app keeps showing pounds to a pounds person.
  const [weightUnit, setWeightUnit] = useState<WeightUnit>("kg");
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
    const typedWeight = weight.trim() ? Number(weight) : null;
    await saveVarsitySetup({
      name: name.trim(),
      classYear,
      sex,
      varsity: {
        boatRole,
        // A coxswain has no side. Storing "B" rather than the last pill they
        // happened to tap keeps the record honest if they switch back later.
        side: boatRole === "Coxswain" ? "B" : side,
        heightCm: height.trim() ? Number(height) : null,
        weightKg:
          typedWeight == null
            ? null
            : Math.round(weightToKg(typedWeight, weightUnit) * 10) / 10,
      },
      units: { weight: weightUnit },
    });
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
        subtitle="Who you are and how you row. One screen, and you're into your team's training — the rest of your profile can wait."
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
          <div className="mb-6 flex flex-wrap gap-1.5">
            {sexOptions.map((s) => (
              <Pill key={s} label={s} selected={sex === s} onClick={() => setSex(s)} />
            ))}
          </div>

          {/* ── How you row: what the lineup builder needs ── */}
          <div className="mb-4 h-px bg-border" />

          <FieldLabel>In the boat</FieldLabel>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {boatRoleOptions.map((r) => (
              <Pill
                key={r}
                label={r}
                selected={boatRole === r}
                onClick={() => setBoatRole(r)}
              />
            ))}
          </div>

          {/* A coxswain never takes a rowing seat, so the side question goes away
              entirely rather than sitting there greyed out. */}
          {boatRole === "Rower" && (
            <>
              <FieldLabel>Which side do you row?</FieldLabel>
              <div className="mb-2 flex flex-wrap gap-1.5">
                {sideOptions.map((o) => (
                  <Pill
                    key={o.key}
                    selected={side === o.key}
                    onClick={() => setSide(o.key)}
                    label={
                      <span className="flex flex-col items-center leading-tight">
                        <span>{o.label}</span>
                        <span className="text-[10px] opacity-70">{o.sub}</span>
                      </span>
                    }
                  />
                ))}
              </div>
              <p className="mb-4 text-[11px] leading-relaxed text-muted">
                Your coach sees this when they build lineups. Pick “Either side” if you
                genuinely swing both ways — it isn’t a wrong answer.
              </p>
            </>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Height (cm)</FieldLabel>
              <TextField
                value={height}
                onChange={(v) => setHeight(digits(v))}
                placeholder="—"
                ariaLabel="Your height in centimetres"
              />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium uppercase tracking-[0.04em] text-muted">
                  Weight
                </span>
                {/* Two words, so a segmented switch rather than another pill row. */}
                <div className="flex overflow-hidden rounded-full border border-border">
                  {weightOptions.map((u) => (
                    <button
                      key={u.key}
                      type="button"
                      aria-pressed={weightUnit === u.key}
                      onClick={() => setWeightUnit(u.key)}
                      className={`px-2 py-0.5 text-[11px] font-medium transition-colors ${
                        weightUnit === u.key ? "bg-primary text-primary-contrast" : "text-muted"
                      }`}
                    >
                      {u.short}
                    </button>
                  ))}
                </div>
              </div>
              <TextField
                value={weight}
                onChange={(v) => setWeight(decimal(v))}
                placeholder="—"
                ariaLabel={`Your weight in ${weightUnit === "lb" ? "pounds" : "kilograms"}`}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted">
            Both optional — you can fill them in later from your profile.
          </p>
        </div>
      </OnboardingShell>
    </ThemeProvider>
  );
}
