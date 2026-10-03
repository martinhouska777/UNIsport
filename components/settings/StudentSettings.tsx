"use client";

/*
  THE STUDENT'S SETTINGS — what the gear on the Profile tab opens.

    (card)       you: photo, name, the address you signed in with
    (group)      Training · Notifications · Design — pages; Units — in place
    Match        Train alone, mentorship, Partner — in that order
    Help         the tour, the privacy policy, the terms
    (group)      the way into a varsity team, when you aren't on one
    (bottom)     Invite a friend and Log out, side by side

  Every answer has one home: training answers in Training, matching answers in
  Match, and what other people read about you on your profile. Nothing about a
  squad lives here — that is Varsity Mode's own Settings
  (components/settings/VarsitySettings.tsx).
*/
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useProfileData } from "@/components/profile/useProfileData";
import { useMembership } from "@/components/varsity/useMembership";
import ShareInviteButton from "@/components/ShareInviteButton";
import Button from "@/components/ui/Button";
import MatchSettings from "@/components/settings/MatchSettings";
import { AppRows, LegalRows } from "@/components/settings/CommonRows";
import {
  Group,
  ProfileCard,
  Row,
  SettingsBody,
  SettingsHeader,
} from "@/components/settings/SettingsShell";
import { primaryActivities, type OnboardingProfile } from "@/lib/onboarding";
import { LIVE_UNIVERSITY, universities } from "@/lib/themes";
import SchoolCrest from "@/components/SchoolCrest";
import { crestFor } from "@/lib/crests";
import { appTour, requestTour, resetTour } from "@/lib/tour";
import { IconBarbell, IconBulb, IconPencil, IconShield } from "@/components/icons";

// Dev-only affordances are compiled out of the production bundle.
const isProduction = process.env.NODE_ENV === "production";

export default function StudentSettings() {
  const { email, userId, studentReady, logout, resetOnboarding, universityKey, setUniversity } =
    useAppState();
  const { data, loading, saveState, savePreferences } = useProfileData();
  const { membership } = useMembership();
  const router = useRouter();

  const answers = (data ?? {}) as Partial<OnboardingProfile>;
  const activityLabel =
    answers.primaryActivity === "other" && answers.activityOther
      ? answers.activityOther
      : primaryActivities.find((a) => a.key === answers.primaryActivity)?.label;

  return (
    <>
      <SettingsHeader title="Settings" saveState={saveState} fallback="/profile" />

      <SettingsBody>
        <ProfileCard
          name={answers.name ?? ""}
          photo={answers.photo ?? null}
          subline={email ?? "Not signed in"}
          href="/profile"
        />

        {/* "Your answers" only exist if there ARE answers: someone who joined
            through a team link never did the student flow, so they are
            offered it rather than an editor over empty fields. */}
        <Group>
          {studentReady ? (
            <Row
              icon={<IconBarbell size={20} />}
              label="Training"
              detail={loading ? undefined : activityLabel}
              href="/settings/training"
            />
          ) : (
            <Row icon={<IconPencil size={20} />} label="Set up the student side" href="/onboarding" />
          )}
          <AppRows />
        </Group>

        {/*
          THE UNIVERSITY SWITCHER — the white-label demo, visible. One tap
          re-skins the whole app to another Ivy: theme, crest, gyms. Everything
          it flips is DATA (lib/themes.ts, lib/crests.ts, lib/gyms.ts). Hidden
          while the app is pinned to one school (LIVE_UNIVERSITY).
        */}
        {!LIVE_UNIVERSITY && (
          <section>
            <h2 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              University
            </h2>
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
          </section>
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
        <Group title="Help">
          <Row
            icon={<IconBulb size={20} />}
            label="Take the tour"
            onClick={() => {
              if (userId) resetTour(appTour, userId);
              requestTour(appTour);
              router.push("/match");
            }}
          />
          <LegalRows />
        </Group>

        {/* The way into a varsity team — the only varsity thing here. */}
        {(!membership || membership.status === "pending") && (
          <Group>
            {!membership ? (
              <Row icon={<IconShield size={20} />} label="Join a varsity team" href="/join" />
            ) : (
              <Row
                icon={<IconShield size={20} />}
                label={membership.teamName}
                detail="Waiting"
                href="/varsity/waiting"
              />
            )}
          </Group>
        )}

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
          {/* Bringing a friend and leaving, side by side (owner, 2026-09-30). */}
          <div className="grid grid-cols-2 gap-2">
            <ShareInviteButton label="Invite a friend" full size="lg" />
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
          </div>
        </div>
      </SettingsBody>
    </>
  );
}
