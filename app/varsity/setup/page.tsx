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
      splits the squad half port, half starboard because nobody was ever asked.

  Everything is written onto the SAME profile row the student side uses, in ONE
  request, and marks only the varsity flag — so the student app stays available,
  unstarted, whenever they want it (offered from the mode switcher).

  IT IS DRESSED AS THE APP, not as the student onboarding (owner, 2026-09-21:
  "make it consistent with the app's UI"). It used to borrow OnboardingShell,
  which put a one-of-one progress bar over a screen that has no second step and
  a serif heading nothing else in Varsity Mode uses. Now it is what every other
  screen is: a heading, labelled cards on the page background, and the app's own
  Button pinned at the bottom — the questions themselves unchanged.

  Nothing on it explains itself. The name field said who would see it, the
  measurements said they were optional; both lines are gone, because a caption
  that describes the control under it is the app's own rule. "Optional" is
  written where it applies — inside the two boxes it applies to.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import Button from "@/components/ui/Button";
import { FieldLabel, Pill, TextField } from "@/components/onboarding/controls";
import { classYears, sexOptions } from "@/lib/onboarding";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
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
  const vTheme = useVarsityTheme();

  const [name, setName] = useState("");
  const [classYear, setClassYear] = useState("");
  const [sex, setSex] = useState("");
  // Nothing is pre-picked: port and starboard are the only two answers now, and
  // guessing one FOR somebody would seat them on the wrong side of the boat.
  const [boatRole, setBoatRole] = useState<BoatRole>("Rower");
  const [side, setSide] = useState<Side | null>(null);
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
        // A coxswain has no side, and neither has a rower who skipped the
        // question — "B" is the record for both, never a third kind of rower.
        side: boatRole === "Coxswain" ? "B" : (side ?? "B"),
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
      tokens={vTheme.dark}
      light={vTheme.light}
      paintRoot
      className="h-dvh bg-background"
    >
      <div className="flex h-dvh flex-col bg-background text-text">
        {/*
          The page scrolls, the button does not. `overscroll-contain` stops a
          flick at the end of the list from dragging the page behind it, which
          is what made this feel loose on a phone.
        */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-screen-sm px-3.5 pb-8 pt-9">
            <h1 className="mb-5 text-[26px] font-semibold leading-tight tracking-[-0.01em] text-text">
              Let&apos;s set you up.
            </h1>

            {/* -- Who you are -- */}
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Who you are
            </div>
            <div className="rounded-2xl border border-border bg-surface p-3.5">
              <FieldLabel>Your name</FieldLabel>
              <TextField value={name} onChange={setName} ariaLabel="Your name" />

              <div className="mt-4">
                <FieldLabel>Class year</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {classYears.map((y) => (
                    <Pill
                      key={y}
                      label={y}
                      selected={classYear === y}
                      onClick={() => setClassYear(y)}
                    />
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <FieldLabel>Sex</FieldLabel>
                <div className="flex flex-wrap gap-1.5">
                  {sexOptions.map((s) => (
                    <Pill key={s} label={s} selected={sex === s} onClick={() => setSex(s)} />
                  ))}
                </div>
              </div>
            </div>

            {/* -- How you row: what the lineup builder needs -- */}
            <div className="mb-2 mt-5 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              How you row
            </div>
            <div className="rounded-2xl border border-border bg-surface p-3.5">
              <FieldLabel>In the boat</FieldLabel>
              <div className="flex flex-wrap gap-1.5">
                {boatRoleOptions.map((r) => (
                  <Pill
                    key={r}
                    label={r}
                    selected={boatRole === r}
                    onClick={() => setBoatRole(r)}
                  />
                ))}
              </div>

              {/* A coxswain never takes a rowing seat, so the side question goes
                  away entirely rather than sitting there greyed out. */}
              {boatRole === "Rower" && (
                <div className="mt-4">
                  <FieldLabel>Which side do you row?</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {sideOptions.map((o) => (
                      <Pill
                        key={o.key}
                        selected={side === o.key}
                        onClick={() => setSide(o.key)}
                        label={o.label}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/*
                Two boxes side by side, and they sit on the SAME line (owner,
                2026-09-21: "the weight is not aligned with the height"). The
                unit switch lives in the weight's label row, so both label rows
                are given the switch's height and the two inputs line up.
              */}
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                <div>
                  <div className="mb-2 flex h-6 items-center">
                    <span className="text-xs font-medium uppercase tracking-[0.04em] text-muted">
                      Height (cm)
                    </span>
                  </div>
                  <TextField
                    value={height}
                    onChange={(v) => setHeight(digits(v))}
                    placeholder="Optional"
                    ariaLabel="Your height in centimetres"
                  />
                </div>
                <div>
                  <div className="mb-2 flex h-6 items-center justify-between gap-2">
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
                            weightUnit === u.key
                              ? "bg-primary text-primary-contrast"
                              : "text-muted"
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
                    placeholder="Optional"
                    ariaLabel={`Your weight in ${weightUnit === "lb" ? "pounds" : "kilograms"}`}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The one action, always reachable - it never scrolls away. */}
        <div className="border-t border-border bg-background px-3.5 pb-[max(0.875rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto w-full max-w-screen-sm">
            <Button
              size="lg"
              full
              disabled={!name.trim() || !classYear || saving}
              onClick={finish}
            >
              {saving ? "Saving…" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}
