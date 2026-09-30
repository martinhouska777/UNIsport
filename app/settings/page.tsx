"use client";

/*
  SETTINGS — the front page. A short list, top to bottom (owner, 2026-09-30):

    Account      the address you signed in with
    (list)       Training · Notifications · Design · Units — each opens a page
    Match        Train alone, and who you'd be matched with
    Help         the tour, the privacy policy, the terms
    (bottom)     the varsity link and Invite a friend, then Log out

  Everything used to sit open on this one page — seven notification switches,
  the whole training setup, a units block — and an "Edit your answers" sheet
  that repeated half of it. The big groups are pages of their own now, and each
  answer has exactly one home: training answers in Training, matching answers
  in Match, and what other people read about you on your profile.

  VARSITY is not a section here any more — only the way IN (join, or waiting
  for the captain). What a squad member manages about their team belongs to
  Varsity Mode, so the team rows appear only when Settings was opened from
  Varsity Mode (its gear leads here too, see lib/varsity/mode.ts).
*/
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useThemeMode } from "@/components/ThemeMode";
import { useProfileData } from "@/components/profile/useProfileData";
import { useMembership } from "@/components/varsity/useMembership";
import ShareInviteButton from "@/components/ShareInviteButton";
import { useUnits } from "@/components/useUnits";
import MatchSettings from "@/components/settings/MatchSettings";
import { Row, Section, SettingsBody, SettingsHeader } from "@/components/settings/SettingsShell";
import { primaryActivities, type OnboardingProfile } from "@/lib/onboarding";
import { LIVE_UNIVERSITY, universities } from "@/lib/themes";
import SchoolCrest from "@/components/SchoolCrest";
import { crestFor } from "@/lib/crests";
import { can, canOpenConsole, roleLabel } from "@/lib/varsity/membership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import { inVarsityMode } from "@/lib/varsity/mode";
import { appTour, requestTour, resetTour } from "@/lib/tour";
import {
  IconBarbell,
  IconBell,
  IconBulb,
  IconClipboard,
  IconInfo,
  IconLock,
  IconPalette,
  IconPencil,
  IconRuler,
  IconShield,
} from "@/components/icons";

// Dev-only affordances are compiled out of the production bundle.
const isProduction = process.env.NODE_ENV === "production";

export default function SettingsPage() {
  const { email, userId, studentReady, logout, resetOnboarding, universityKey, setUniversity } =
    useAppState();
  const { mode } = useThemeMode();
  const { data, loading, saveState, savePreferences } = useProfileData();
  const { membership, loading: membershipLoading } = useMembership();
  const { units } = useUnits();
  const router = useRouter();
  /*
    Opened from Varsity Mode? The mode is remembered for the tab, not read off
    the URL, and this page only mounts once the app is ready (the layout waits),
    so reading it once here is safe.
  */
  const [fromVarsity] = useState(inVarsityMode);

  const answers = (data ?? {}) as Partial<OnboardingProfile>;
  const activityLabel =
    answers.primaryActivity === "other" && answers.activityOther
      ? answers.activityOther
      : primaryActivities.find((a) => a.key === answers.primaryActivity)?.label;

  const inSquad = membership?.status === "approved";

  return (
    <>
      <SettingsHeader title="Settings" saveState={saveState} fallback="/profile" />

      <SettingsBody>
        <Section title="Account">
          <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text">
            {email ?? "Not signed in"}
          </p>
        </Section>

        {/* The squad, when you came here from Varsity Mode. */}
        {fromVarsity && inSquad && membership && (
          <Section title="Varsity">
            <Row
              icon={<IconShield size={18} />}
              label={membership.teamName}
              detail={roleLabel[membership.role]}
              href={VARSITY_HOME}
            />
            {/* EDIT YOUR VARSITY PROFILE — it was a pencil in Varsity Mode's
                top bar (owner, 2026-09-19: "put it in Settings"). The profile
                screen opens its editor from ?edit=1 and tidies the URL. */}
            <Row icon={<IconPencil size={18} />} label="Edit varsity profile" href="/varsity/profile?edit=1" />
            {canOpenConsole(membership.role) && (
              <Row
                icon={<IconClipboard size={18} />}
                label={`Open ${roleLabel[membership.role]} Console`}
                href={can.buildPlan(membership.role) ? "/varsity/coach/plan" : "/varsity/coach/team"}
              />
            )}
          </Section>
        )}

        {/* The pages. "Your answers" only exist if there ARE answers: someone
            who joined through a team link never did the student flow, so they
            are offered it rather than an editor over empty fields. */}
        <Section>
          {studentReady ? (
            <Row
              icon={<IconBarbell size={18} />}
              label="Training"
              detail={loading ? undefined : activityLabel}
              href="/settings/training"
            />
          ) : (
            <Row icon={<IconPencil size={18} />} label="Set up the student side" href="/onboarding" />
          )}
          <Row icon={<IconBell size={18} />} label="Notifications" href="/settings/notifications" />
          <Row
            icon={<IconPalette size={18} />}
            label="Design"
            detail={mode === "dark" ? "Dark" : "Light"}
            href="/settings/design"
          />
          <Row
            icon={<IconRuler size={18} />}
            label="Units"
            detail={`${units.distance} · ${units.weight}`}
            href="/settings/units"
          />
        </Section>

        {/*
          THE UNIVERSITY SWITCHER — the white-label demo, visible. One tap
          re-skins the whole app to another Ivy: theme, crest, gyms. Everything
          it flips is DATA (lib/themes.ts, lib/crests.ts, lib/gyms.ts). Hidden
          while the app is pinned to one school (LIVE_UNIVERSITY).
        */}
        {!LIVE_UNIVERSITY && (
          <Section title="University">
            <div className="grid grid-cols-2 gap-2">
              {Object.values(universities).map((u) => {
                const active = u.key === universityKey;
                return (
                  <button
                    key={u.key}
                    type="button"
                    onClick={() => setUniversity(u.key)}
                    aria-pressed={active}
                    className={`flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left ${
                      active ? "border-primary bg-surface" : "border-border bg-surface"
                    }`}
                  >
                    <SchoolCrest
                      crest={crestFor(u.key)}
                      width={20}
                      height={23}
                      style={
                        {
                          "--crest-field": u.theme.primary,
                          "--crest-mark": u.theme.primaryContrast,
                        } as React.CSSProperties
                      }
                    />
                    <span className={`flex-1 text-sm ${active ? "font-semibold text-text" : "text-text"}`}>
                      {u.shortName}
                    </span>
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Waits for the profile, so the rows under the switch don't appear
            and vanish again while it loads. */}
        {studentReady && !loading && <MatchSettings answers={answers} onSave={savePreferences} />}

        {/*
          The tour points at things inside the tab shell, and Settings
          deliberately sits outside it. So this forgets the tour, leaves a
          request behind, and goes to Gyms — where the shell picks it up and
          walks the whole app again from the start.
        */}
        <Section title="Help">
          <Row
            icon={<IconBulb size={18} />}
            label="Take the tour"
            onClick={() => {
              if (userId) resetTour(appTour, userId);
              requestTour(appTour);
              router.push("/gyms");
            }}
          />
          <Row icon={<IconLock size={18} />} label="Privacy Policy" href="/privacy" />
          <Row icon={<IconInfo size={18} />} label="Terms of Service" href="/terms" />
        </Section>

        {/* At the bottom: the way into a varsity team, and bringing a friend. */}
        <Section>
          {!membershipLoading && !membership && (
            <Row icon={<IconShield size={18} />} label="Join a varsity team" href="/join" />
          )}
          {membership?.status === "pending" && (
            <Row
              icon={<IconShield size={18} />}
              label={membership.teamName}
              detail="Waiting"
              href="/varsity/waiting"
            />
          )}
          <ShareInviteButton label="Invite a friend" full size="lg" />
        </Section>

        <div className="px-3.5 py-4">
          <div className="flex flex-col gap-2">
            {!isProduction && (
              <button
                type="button"
                onClick={async () => {
                  // Forget the tour too, so replaying onboarding reproduces the
                  // genuine first run — the app introducing itself included.
                  if (userId) resetTour(appTour, userId);
                  await resetOnboarding();
                  router.replace("/onboarding");
                }}
                className="w-full rounded-full border border-border bg-surface-2 px-5 py-2.5 text-sm font-medium text-text"
              >
                Replay onboarding (dev)
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                await logout();
                router.replace("/");
              }}
              className="w-full rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-text"
            >
              Log out
            </button>
          </div>
        </div>
      </SettingsBody>
    </>
  );
}
