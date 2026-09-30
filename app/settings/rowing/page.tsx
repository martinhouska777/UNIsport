"use client";

/*
  SETTINGS → ROWING PROFILE (Varsity Mode). What the squad and the coach's
  lineup builder know about you as a rower: your year on the team, rower or
  cox, which side, height and weight.

  It was an "Edit profile" sheet on the varsity profile, reached only through
  Settings (/varsity/profile?edit=1). Now it is a page like Settings → Training
  (owner, 2026-09-30): every answer on screen, saved the moment it changes —
  typed ones when you leave the box — with no Save button to forget.

  Weight is shown and typed in your unit and ALWAYS stored in kilos, so
  switching units later can't corrupt the record. Each change is merged onto the
  record as it is now (patchAthleteProfile), one save after another, so two
  quick taps can't overwrite each other.
*/
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/components/AppState";
import type { ProfileSaveState } from "@/components/profile/useProfileData";
import { useUnits } from "@/components/useUnits";
import { SettingsBody, SettingsHeader } from "@/components/settings/SettingsShell";
import { Pill, TextField } from "@/components/onboarding/controls";
import { SkeletonLines } from "@/components/ui/Skeleton";
import {
  boatRoleOptions,
  fetchAthleteProfile,
  patchAthleteProfile,
  sideOptions,
  teamYearOptions,
  type VarsityAthleteProfile,
} from "@/lib/varsity/athleteProfile";
import { kgToUnit, weightToKg } from "@/lib/varsity/units";

const card = "rounded-2xl border border-border bg-surface p-4 shadow-card";

/* A heading in the Settings style, then its card. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </h2>
      <div className={card}>{children}</div>
    </section>
  );
}

export default function RowingProfilePage() {
  const { userId } = useAppState();
  const { units } = useUnits();
  const [profile, setProfile] = useState<VarsityAthleteProfile | null>(null);
  const [saveState, setSaveState] = useState<ProfileSaveState>("idle");
  // What's being typed; null = not touched, so the saved value shows (and in
  // the current unit, even if the unit arrives after the profile).
  const [height, setHeight] = useState<string | null>(null);
  const [weight, setWeight] = useState<string | null>(null);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    fetchAthleteProfile(userId).then((b) => {
      if (active) setProfile(b.profile);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = (patch: Partial<VarsityAthleteProfile>) => {
    setProfile((p) => (p ? { ...p, ...patch } : p));
    setSaveState("saving");
    queue.current = queue.current.then(async () => {
      const { error } = await patchAthleteProfile(userId, patch);
      setSaveState(error ? "error" : "saved");
    });
  };

  const heightShown = height ?? (profile?.heightCm != null ? String(profile.heightCm) : "");
  const weightShown =
    weight ??
    (profile?.weightKg != null ? String(Math.round(kgToUnit(profile.weightKg, units.weight))) : "");

  return (
    <>
      <SettingsHeader title="Rowing profile" saveState={saveState} />
      <SettingsBody>
        {!profile ? (
          <SkeletonLines count={5} />
        ) : (
          <>
            <Group title="Year on the team">
              <div className="flex flex-wrap gap-1.5">
                {teamYearOptions.map((y) => (
                  <Pill
                    key={y}
                    label={y}
                    selected={profile.teamYear === y}
                    onClick={() => save({ teamYear: y })}
                  />
                ))}
              </div>
            </Group>

            <Group title="In the boat">
              <div className="flex flex-wrap gap-1.5">
                {boatRoleOptions.map((r) => (
                  <Pill
                    key={r}
                    label={r}
                    selected={profile.boatRole === r}
                    // A coxswain has no side, so a stale one isn't kept.
                    onClick={() => save(r === "Coxswain" ? { boatRole: r, side: "B" } : { boatRole: r })}
                  />
                ))}
              </div>
              {/* A coxswain never takes a rowing seat, so the side question disappears. */}
              {profile.boatRole === "Rower" && (
                <div className="mt-4">
                  <div className="mb-2 text-[13px] font-medium text-text">Side</div>
                  <div className="flex flex-wrap gap-1.5">
                    {sideOptions.map((o) => (
                      <Pill
                        key={o.key}
                        label={o.label}
                        selected={profile.side === o.key}
                        onClick={() => save({ side: o.key })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </Group>

            <Group title="Height and weight">
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  value={heightShown}
                  onChange={(v) => setHeight(v.replace(/[^\d]/g, ""))}
                  onBlur={() => {
                    if (height === null) return;
                    save({ heightCm: height.trim() ? Number(height) : null });
                    setHeight(null);
                  }}
                  inputMode="numeric"
                  ariaLabel="Height in centimetres"
                  suffix="cm"
                />
                <TextField
                  value={weightShown}
                  onChange={(v) => setWeight(v.replace(/[^\d.]/g, ""))}
                  onBlur={() => {
                    if (weight === null) return;
                    const typed = weight.trim() ? Number(weight) : null;
                    save({
                      weightKg:
                        typed == null || Number.isNaN(typed)
                          ? null
                          : Math.round(weightToKg(typed, units.weight) * 10) / 10,
                    });
                    setWeight(null);
                  }}
                  inputMode="decimal"
                  ariaLabel={`Weight in ${units.weight === "lb" ? "pounds" : "kilograms"}`}
                  suffix={units.weight}
                />
              </div>
            </Group>
          </>
        )}
      </SettingsBody>
    </>
  );
}
