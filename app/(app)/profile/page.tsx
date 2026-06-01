"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import VarsityShield from "@/components/varsity/VarsityShield";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import InlineEdit from "@/components/profile/InlineEdit";
import SessionCalendar from "@/components/profile/SessionCalendar";
import SessionSheet from "@/components/profile/SessionSheet";
import {
  profileFromOnboarding,
  classOfLabel,
  type CurrentUser,
  type Session,
} from "@/lib/currentUser";
import { ThemeModeToggle } from "@/components/ThemeMode";
import { IconSettings, IconUser, IconCamera, IconPencil, IconPlus, IconArrowRight } from "@/components/icons";

export default function ProfilePage() {
  const { userId, logout, resetOnboarding } = useAppState();
  const router = useRouter();

  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  // The saved profile JSON (onboarding answers + any profile edits).
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSession, setOpenSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase || !userId) {
      setData({});
      setLoading(false);
      return;
    }
    let active = true;
    supabase
      .from("profiles")
      .select("data")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (!active) return;
        setData((row?.data as Record<string, unknown>) ?? {});
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  // Edit handler: updates the saved JSON in place and persists to the DB.
  const update = (patch: Partial<CurrentUser>) => {
    setData((prev) => {
      const next = { ...(prev ?? {}) };
      if ("name" in patch) next.name = patch.name;
      if ("bio" in patch) next.bio = patch.bio;
      if ("trainingDisplay" in patch) next.trainingDisplay = patch.trainingDisplay;
      if (supabase && userId) {
        supabase
          .from("profiles")
          .update({ data: next, updated_at: new Date().toISOString() })
          .eq("id", userId)
          .then(({ error }) => {
            // eslint-disable-next-line no-console
            if (error) console.error("Profile save failed:", error.message);
          });
      }
      return next;
    });
  };

  const user = data ? profileFromOnboarding(data) : null;

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-screen-sm">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
          <span className="text-base font-medium text-text">My Profile</span>
          <span className="text-muted">
            <IconSettings size={18} />
          </span>
        </div>
        <div className="px-6 py-20 text-center text-sm text-muted">Loading your profile…</div>
      </div>
    );
  }

  const stats = [
    { label: "Sessions", value: user.stats.sessions },
    { label: "Partners", value: user.stats.partners },
    { label: "Following", value: user.stats.following },
  ];

  const trainingRows: { key: keyof CurrentUser["trainingDisplay"]; label: string }[] = [
    { key: "level", label: "Level" },
    { key: "type", label: "Type" },
    { key: "split", label: "Split" },
    { key: "schedule", label: "Schedule" },
    { key: "gym", label: "Gym" },
  ];
  const setTraining = (key: keyof CurrentUser["trainingDisplay"], value: string) =>
    update({ trainingDisplay: { ...user.trainingDisplay, [key]: value } });

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
        <span className="text-base font-medium text-text">My Profile</span>
        <div className="flex items-center gap-2">
          <ThemeModeToggle />
          <button type="button" aria-label="Settings" className="text-muted">
            <IconSettings size={18} />
          </button>
        </div>
      </div>

      {/* Identity block */}
      <div className="flex flex-col items-center gap-2 border-b border-border px-3.5 pb-3 pt-4">
        <div className="relative">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border-2 border-primary bg-primary/15 text-primary">
            <IconUser size={30} />
          </div>
          <button
            type="button"
            aria-label="Add photo"
            className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
          >
            <IconCamera size={12} />
          </button>
        </div>

        <div className="flex flex-col items-center gap-1">
          <InlineEdit
            value={user.name}
            onChange={(v) => update({ name: v })}
            ariaLabel="name"
            placeholder="Your name"
            maxLength={40}
            textClassName="text-base font-medium text-text"
          />

          {(user.badges.varsity || user.badges.mentor) && (
            <div className="flex items-center justify-center gap-1.5">
              {user.badges.varsity && (
                <span className="rounded bg-accent px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-background">
                  VARSITY
                </span>
              )}
              {user.badges.mentor && (
                <span className="rounded border border-success bg-success/15 px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-success">
                  MENTOR
                </span>
              )}
            </div>
          )}

          <div className="text-[10px] text-muted">
            {user.residence ? `${user.residence} House · ` : ""}
            {classOfLabel(user.classYear)}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-1.5 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">Bio</div>
        <InlineEdit
          value={user.bio}
          onChange={(v) => update({ bio: v })}
          ariaLabel="bio"
          placeholder="Add a short bio"
          maxLength={160}
          multiline
          textClassName="text-[13px] leading-relaxed text-muted"
        />
      </div>

      {/* Stats */}
      <div className="flex items-stretch justify-around border-b border-border px-3.5 py-2.5">
        {stats.map((s, i) => (
          <div key={s.label} className="flex items-stretch">
            {i > 0 && <div className="mr-0 w-px self-stretch bg-border" />}
            <div className="px-4 text-center">
              <div className="text-[17px] font-medium text-text">{s.value}</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-[0.06em] text-muted">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Session calendar */}
      <SessionCalendar sessions={user.sessions} onPick={(s) => setOpenSession(s)} />

      {/* Training */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-1 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">Training</div>
        <div className="flex flex-col divide-y divide-border">
          {trainingRows.map((row) => (
            <div key={row.key} className="flex items-center justify-between gap-3 py-2">
              <span className="text-xs text-muted">{row.label}</span>
              <InlineEdit
                value={user.trainingDisplay[row.key]}
                onChange={(v) => setTraining(row.key, v)}
                ariaLabel={row.label}
                placeholder="Add"
                textClassName="text-xs text-text text-right"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Personal records */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-primary">Personal records</div>
          <button type="button" aria-label="Edit personal records" className="rounded-full p-1 text-muted transition-colors hover:bg-muted/20">
            <IconPencil size={13} />
          </button>
        </div>
        {user.personalRecords.length > 0 ? (
          <div className="flex flex-col divide-y divide-border">
            {user.personalRecords.map((pr) => (
              <div key={pr.lift} className="flex items-center justify-between py-2">
                <span className="text-xs text-muted">{pr.lift}</span>
                <span className="text-xs font-medium text-text">{pr.value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-surface-2 px-3 py-4 text-center text-[12px] text-muted">
            Add your personal records
          </div>
        )}
      </div>

      {/* Photos */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">Photos</div>
        <div className="grid grid-cols-3 gap-1.5">
          {user.photos.map((_, i) => (
            <div key={i} className="aspect-square rounded-md border border-border bg-surface-2" />
          ))}
          <button
            type="button"
            aria-label="Add photo"
            className="flex aspect-square items-center justify-center rounded-md border border-dashed border-border bg-surface-2 text-muted"
          >
            <IconPlus size={20} />
          </button>
        </div>
      </div>

      {/* Entry into Varsity Mode (the gated rowing-team section) */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
          Varsity
        </div>
        <Link
          href="/varsity/home"
          className="flex items-center gap-3 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-3.5"
        >
          <VarsityShield size={30} />
          <div className="flex-1">
            <div className="text-sm font-medium text-text">Enter Varsity Mode</div>
            <div className="text-[11px] text-muted">Harvard Rowing · training, lineups &amp; team</div>
          </div>
          <span className="text-muted">
            <IconArrowRight size={18} />
          </span>
        </Link>
      </div>

      {/* Temporary dev tools (until real settings/profile flows exist) */}
      <div className="px-3.5 py-4">
        <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.1em] text-muted">Dev tools</div>
        <div className="flex flex-col gap-2">
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

      {/* Bottom action bar (sticks above the tab nav) */}
      <div className="sticky bottom-0 z-20 flex gap-2.5 border-t border-border bg-surface px-3.5 py-3">
        <button
          type="button"
          className="flex-1 rounded-full border border-border bg-surface-2 px-5 py-3 text-sm font-medium text-text"
        >
          Share Profile
        </button>
        <button
          type="button"
          className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast"
        >
          Log Session
        </button>
      </div>

      {openSession && (
        <SessionSheet session={openSession} onClose={() => setOpenSession(null)} />
      )}
    </div>
  );
}
