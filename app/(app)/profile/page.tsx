"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import InlineEdit from "@/components/profile/InlineEdit";
import { currentUser, classOfLabel, type CurrentUser } from "@/lib/currentUser";
import { IconSettings, IconUser, IconCamera } from "@/components/icons";

export default function ProfilePage() {
  const { logout, resetOnboarding } = useAppState();
  const router = useRouter();

  // Edits update this in-memory object (no Supabase yet) and log the change.
  const [user, setUser] = useState<CurrentUser>(currentUser);
  const update = (patch: Partial<CurrentUser>) =>
    setUser((prev) => {
      // eslint-disable-next-line no-console
      console.log("My Profile updated:", patch);
      return { ...prev, ...patch };
    });

  const stats = [
    { label: "Sessions", value: user.stats.sessions },
    { label: "Partners", value: user.stats.partners },
    { label: "Following", value: user.stats.following },
  ];

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
        <span className="text-base font-medium text-text">My Profile</span>
        <button type="button" aria-label="Settings" className="text-muted">
          <IconSettings size={18} />
        </button>
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
            {user.residence} House · {classOfLabel(user.classYear)}
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

      {/* Temporary dev tools (until real settings/profile flows exist) */}
      <div className="px-3.5 py-4">
        <div className="mb-2 text-[9px] font-medium uppercase tracking-[0.1em] text-muted">Dev tools</div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              resetOnboarding();
              router.replace("/onboarding");
            }}
            className="w-full rounded-full border border-border bg-surface-2 px-5 py-2.5 text-sm font-medium text-text"
          >
            Replay onboarding (dev)
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace("/");
            }}
            className="w-full rounded-full border border-border bg-background px-5 py-2.5 text-sm font-medium text-text"
          >
            Log out (demo)
          </button>
        </div>
      </div>
    </div>
  );
}
