"use client";

/*
  SETTINGS — a full-screen page, not a sheet.

  Deliberately its OWN route rather than a tab inside the Zone 2 shell, so it
  covers the whole screen with no bottom tab bar underneath (the Instagram
  pattern the owner asked for) and the phone's back gesture leaves it.

  Everything here used to be scattered: the light/dark toggle sat in the profile
  header next to a "settings" button that was drawn as a second sun, notification
  switches sat in the middle of the profile page, and log out was pinned to the
  bottom of it. This is now the one place for switches, so the profile page can
  be about the person.
*/
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import ThemeProvider from "@/components/ThemeProvider";
import { useThemeMode } from "@/components/ThemeMode";
import { useProfileData } from "@/components/profile/useProfileData";
import PreferencesSheet from "@/components/profile/PreferencesSheet";
import NotificationSettings from "@/components/profile/NotificationSettings";
import { useMembership } from "@/components/varsity/useMembership";
import { useUnits } from "@/components/useUnits";
import { distanceOptions, weightOptions } from "@/lib/varsity/units";
import { profileFromOnboarding } from "@/lib/currentUser";
import { getUniversity, neutralTheme } from "@/lib/themes";
import { roleLabel } from "@/lib/varsity/membership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import {
  IconArrowLeft,
  IconChevronRight,
  IconMoon,
  IconPencil,
  IconShield,
  IconSun,
} from "@/components/icons";

// Dev-only affordances are compiled out of the production bundle.
const isProduction = process.env.NODE_ENV === "production";

/* A titled group of rows, matching the section labels used across the app. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border px-3.5 py-4">
      <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {title}
      </h2>
      {children}
    </div>
  );
}

/* One tappable row: icon, label, optional detail, chevron. */
function Row({
  icon,
  label,
  detail,
  onClick,
  href,
}: {
  icon?: React.ReactNode;
  label: string;
  detail?: string;
  onClick?: () => void;
  href?: string;
}) {
  const inner = (
    <>
      {icon && <span className="text-muted">{icon}</span>}
      <span className="flex-1 text-sm text-text">{label}</span>
      {detail && <span className="text-xs text-muted">{detail}</span>}
      <span className="text-muted">
        <IconChevronRight size={16} />
      </span>
    </>
  );
  const className =
    "flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left";
  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>
      {inner}
    </button>
  );
}

/* One unit choice: a label with the options as segmented pills beside it. */
function UnitRow({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: { key: string; label: string; short: string }[];
  value: string;
  onPick: (key: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-2.5">
      <span className="flex-1 text-sm text-text">{label}</span>
      <div className="flex gap-1 rounded-full border border-border bg-surface-2 p-0.5">
        {options.map((o) => (
          <button
            key={o.key}
            type="button"
            onClick={() => onPick(o.key)}
            aria-pressed={value === o.key}
            aria-label={o.label}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
              value === o.key ? "bg-text text-background" : "text-muted"
            }`}
          >
            {o.short}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { ready, loggedIn, email, studentReady, logout, resetOnboarding, universityKey } =
    useAppState();
  const { mode, toggle } = useThemeMode();
  const { data, loading, saveState, update, savePreferences } = useProfileData();
  const { membership, loading: membershipLoading } = useMembership();
  const { units, setUnits } = useUnits();
  const router = useRouter();
  const [editingPrefs, setEditingPrefs] = useState(false);

  useEffect(() => {
    if (ready && !loggedIn) router.replace("/");
  }, [ready, loggedIn, router]);

  if (!ready || !loggedIn) return null;

  const uni = getUniversity(universityKey);
  const theme = uni?.theme ?? neutralTheme;
  const user = data ? profileFromOnboarding(data) : null;

  return (
    <ThemeProvider
      tokens={theme}
      light={uni?.themeLight}
      paintRoot
      className="flex h-dvh flex-col overflow-hidden bg-background"
    >
      {/* Header — back arrow leaves the page, exactly like a native screen. */}
      <div className="flex items-center gap-3 border-b border-border bg-surface px-3.5 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="text-text"
        >
          <IconArrowLeft size={20} />
        </button>
        <h1 className="flex-1 text-base font-medium text-text">Settings</h1>
        {saveState !== "idle" && (
          <span className={`text-[11px] ${saveState === "error" ? "text-danger" : "text-muted"}`}>
            {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Couldn’t save"}
          </span>
        )}
      </div>

      <div className="mx-auto w-full max-w-screen-sm flex-1 overflow-y-auto">
        <Section title="Account">
          <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-text">
            {email ?? "Not signed in"}
            <span className="mt-0.5 block text-[11px] text-muted">
              The account you&apos;re signed in as
            </span>
          </p>
        </Section>

        <Section title="Appearance">
          <button
            type="button"
            onClick={toggle}
            className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-left"
          >
            <span className="text-muted">
              {mode === "dark" ? <IconMoon size={18} /> : <IconSun size={18} />}
            </span>
            <span className="flex-1 text-sm text-text">Appearance</span>
            <span className="text-xs text-muted">{mode === "dark" ? "Dark" : "Light"}</span>
          </button>
        </Section>

        {/* Varsity — a team you belong to sits alongside the student account.
            Three states: not on a team, waiting for a captain, or in. */}
        <Section title="Varsity">
          {membershipLoading ? (
            <p className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-muted">
              Checking…
            </p>
          ) : !membership ? (
            <>
              <Row icon={<IconShield size={18} />} label="Join a varsity team" href="/join" />
              <p className="mt-2 px-1 text-[11px] text-muted">
                Paste the invite link your coach or captain sent you.
              </p>
            </>
          ) : membership.status === "pending" ? (
            <Row
              icon={<IconShield size={18} />}
              label={membership.teamName}
              detail="Waiting"
              href="/varsity/waiting"
            />
          ) : (
            <Row
              icon={<IconShield size={18} />}
              label={membership.teamName}
              detail={roleLabel[membership.role]}
              href={VARSITY_HOME}
            />
          )}
        </Section>

        {/* Units — what the app shows, not what it stores. Everything is kept
            in metres and kilograms underneath, so switching is only ever a
            change of display. */}
        <Section title="Units">
          <div className="flex flex-col gap-2">
            <UnitRow
              label="Distance"
              options={distanceOptions}
              value={units.distance}
              onPick={(v) => setUnits({ ...units, distance: v as typeof units.distance })}
            />
            <UnitRow
              label="Weight"
              options={weightOptions}
              value={units.weight}
              onPick={(v) => setUnits({ ...units, weight: v as typeof units.weight })}
            />
          </div>
        </Section>

        {/* "Your answers" only exists if there ARE answers. Someone who joined
            through a team link never did the student flow, so they're offered
            it rather than shown an editor over empty fields. */}
        {studentReady ? (
          <Section title="Your answers">
            <Row
              icon={<IconPencil size={18} />}
              label="Edit answers"
              detail={loading ? "Loading…" : undefined}
              onClick={() => user && setEditingPrefs(true)}
            />
            <p className="mt-2 px-1 text-[11px] text-muted">
              Training, schedule, gyms, interests and who you want to train with.
            </p>
          </Section>
        ) : (
          <Section title="Student mode">
            <Row icon={<IconPencil size={18} />} label="Set up the student side" href="/onboarding" />
            <p className="mt-2 px-1 text-[11px] text-muted">
              Campus gyms, finding people to train with, and messages. Separate from your team,
              and entirely up to you.
            </p>
          </Section>
        )}

        {/* Reused as-is: device permission plus which kinds you receive. */}
        {user && (
          <NotificationSettings
            messages={user.notifyMessages}
            plans={user.notifyPlans}
            onChange={update}
          />
        )}

        <Section title="About">
          <div className="flex flex-col gap-2">
            <Row label="Privacy Policy" href="/privacy" />
            <Row label="Terms of Service" href="/terms" />
          </div>
        </Section>

        <div className="px-3.5 py-4">
          <div className="flex flex-col gap-2">
            {!isProduction && (
              <button
                type="button"
                onClick={async () => {
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
      </div>

      {editingPrefs && user && (
        <PreferencesSheet
          profile={user}
          onSave={savePreferences}
          onClose={() => setEditingPrefs(false)}
        />
      )}
    </ThemeProvider>
  );
}
