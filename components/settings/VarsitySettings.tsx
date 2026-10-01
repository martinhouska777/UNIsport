"use client";

/*
  VARSITY MODE'S SETTINGS — what the gear inside Varsity Mode opens (owner,
  2026-09-30: "one per mode").

    (card)       you: photo, name, your squad and role — opens your varsity profile
    Varsity      Rowing profile (a page) · Teammates see my calendar · the Console
    (group)      Notifications · Design — pages; Units — in place
    Help         Take the tour (not for a coach), the privacy policy, the terms
    (group)      Replay athlete setup — asks first
    (bottom)     Log out

  Two things MOVED HERE off the varsity profile (owner, same day): the calendar
  switch and Replay athlete setup — they're settings, and the profile is who you
  are. Your status and your personal bests stay on the profile: they're about
  you, and the squad reads them. None of the student app's settings (training
  answers, Match, the tour of the student app) are here: that's the student's
  Settings (components/settings/StudentSettings.tsx).

  The varsity record is written with patchAthleteProfile — read fresh, merged,
  saved — so this page can never write back a stale copy over a change the
  profile screen made.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import type { ProfileSaveState } from "@/components/profile/useProfileData";
import { useMembership } from "@/components/varsity/useMembership";
import Button from "@/components/ui/Button";
import { AppRows, LegalRows } from "@/components/settings/CommonRows";
import {
  Group,
  ProfileCard,
  Row,
  SettingsBody,
  SettingsHeader,
  ToggleRow,
} from "@/components/settings/SettingsShell";
import {
  fetchAthleteProfile,
  patchAthleteProfile,
  sideLabel,
  type AthleteProfileBundle,
} from "@/lib/varsity/athleteProfile";
import { can, canOpenConsole, roleLabel } from "@/lib/varsity/membership";
import { requestTour, resetTour } from "@/lib/tour";
import { varsityTour } from "@/lib/varsity/varsityTour";
import { IconBulb, IconCalendar, IconClipboard, IconRepeat, IconUser } from "@/components/icons";

export default function VarsitySettings() {
  const { userId, logout, resetVarsitySetup } = useAppState();
  const { membership } = useMembership();
  const router = useRouter();
  const [bundle, setBundle] = useState<AthleteProfileBundle | null>(null);
  const [saveState, setSaveState] = useState<ProfileSaveState>("idle");
  const [replayArmed, setReplayArmed] = useState(false);

  useEffect(() => {
    let active = true;
    fetchAthleteProfile(userId).then((b) => {
      if (active) setBundle(b);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const role = membership?.role;
  const profile = bundle?.profile;

  // Shown at once, saved behind it; the header says if the save failed.
  const toggleCalendar = async () => {
    if (!bundle || !profile) return;
    const showCalendar = !profile.showCalendar;
    setBundle({ ...bundle, profile: { ...profile, showCalendar } });
    setSaveState("saving");
    const { error } = await patchAthleteProfile(userId, { showCalendar });
    setSaveState(error ? "error" : "saved");
  };

  // "Rower · Starboard", "Coxswain", or "Rower" until a side is picked.
  const side = profile ? sideLabel(profile.boatRole, profile.side) : null;
  const rowingDetail = profile ? (side ? `${profile.boatRole} · ${side}` : profile.boatRole) : undefined;

  return (
    <>
      <SettingsHeader title="Settings" saveState={saveState} fallback="/varsity/profile" />

      <SettingsBody>
        <ProfileCard
          name={bundle?.name ?? ""}
          photo={bundle?.photo ?? null}
          subline={membership && role ? `${membership.teamName} · ${roleLabel[role]}` : ""}
          href="/varsity/profile"
        />

        <Group title="Varsity">
          <Row
            icon={<IconUser size={20} />}
            label="Rowing profile"
            detail={rowingDetail}
            href="/settings/rowing"
          />
          {/* WHO SEES IT (owner, 2026-09-13): teammates who open you on the
              Team tab see your training month unless you switch it off. The
              coach sees it either way. */}
          <ToggleRow
            icon={<IconCalendar size={20} />}
            label="Teammates see my calendar"
            on={profile?.showCalendar ?? true}
            onChange={toggleCalendar}
          />
          {role && canOpenConsole(role) && (
            <Row
              icon={<IconClipboard size={20} />}
              label={`Open ${roleLabel[role]} Console`}
              href={can.buildPlan(role) ? "/varsity/coach/plan" : "/varsity/coach/team"}
            />
          )}
        </Group>

        <Group>
          <AppRows />
        </Group>

        {/*
          Settings sits outside the Varsity shell, like the student one, so this
          forgets the walk, leaves a request behind and goes Home — where the
          shell picks it up (lib/varsity/varsityTour.ts). Not for a coach: the
          shell doesn't run this walk for them, and their console has its own.
        */}
        <Group title="Help">
          {role && role !== "coach" && (
            <Row
              icon={<IconBulb size={20} />}
              label="Take the tour"
              onClick={() => {
                if (userId) resetTour(varsityTour, userId);
                requestTour(varsityTour);
                router.push("/varsity/home");
              }}
            />
          )}
          <LegalRows />
        </Group>

        {/*
          REPLAY THE ATHLETE SETUP — the short setup a rower answers on the way
          in: name, class year, sex, rower or cox, side, height and weight. It
          asks first, because it is not a preview: the questions start blank,
          and what you finish with replaces them. The squad, the logs and the
          personal bests are untouched.
        */}
        {replayArmed ? (
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
            <div className="text-[15px] font-medium text-text">Run the setup again?</div>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
              You&apos;ll answer the setup screen from scratch. Whatever you finish with
              replaces your name, year and measurements.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="secondary" size="lg" className="flex-1" onClick={() => setReplayArmed(false)}>
                Cancel
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={async () => {
                  await resetVarsitySetup();
                  router.replace("/varsity/setup");
                }}
              >
                Start over
              </Button>
            </div>
          </div>
        ) : (
          <Group>
            <Row
              icon={<IconRepeat size={20} />}
              label="Replay athlete setup"
              onClick={() => setReplayArmed(true)}
            />
          </Group>
        )}

        <Button
          variant="secondary"
          size="lg"
          full
          onClick={async () => {
            await logout();
            router.replace("/");
          }}
        >
          Log out
        </Button>
      </SettingsBody>
    </>
  );
}
