"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppState } from "@/components/AppState";
import VarsityShield from "@/components/varsity/VarsityShield";
import { createClient, hasSupabaseEnv } from "@/lib/supabase/client";
import InlineEdit from "@/components/profile/InlineEdit";
import SessionCalendar from "@/components/profile/SessionCalendar";
import SessionSheet from "@/components/profile/SessionSheet";
import WorkoutDetail from "@/components/profile/WorkoutDetail";
import LogSessionSheet from "@/components/profile/LogSessionSheet";
import PartnersSheet from "@/components/profile/PartnersSheet";
import UpcomingSessions from "@/components/profile/UpcomingSessions";
import StreakCard from "@/components/profile/StreakCard";
import PersonalRecords from "@/components/profile/PersonalRecords";
import PhotoGrid from "@/components/profile/PhotoGrid";
import PreferencesSheet from "@/components/profile/PreferencesSheet";
import {
  profileFromOnboarding,
  deriveTrainingDisplay,
  classOfLabel,
  type CurrentUser,
  type PersonalRecord,
} from "@/lib/currentUser";
import {
  listMonth,
  countWorkouts,
  listPartners,
  deleteWorkout,
  type WorkoutLog,
  type PartnerSummary,
} from "@/lib/supabase/workouts";
import { fileToDataUrl } from "@/lib/image";
import { getMyFollowCounts } from "@/lib/supabase/follows";
import { residenceLabel, type OnboardingProfile } from "@/lib/onboarding";
import { ThemeModeToggle } from "@/components/ThemeMode";
import { IconSettings, IconUser, IconCamera, IconPencil, IconArrowRight } from "@/components/icons";

export default function ProfilePage() {
  const { userId, logout, resetOnboarding } = useAppState();
  const router = useRouter();

  const [supabase] = useState(() => (hasSupabaseEnv() ? createClient() : null));
  // The saved profile JSON (onboarding answers + any profile edits).
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  // Logged workouts for the current month + the all-time count (Sessions stat).
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [partnersOpen, setPartnersOpen] = useState(false); // "Partners" stat → who list
  const [openDate, setOpenDate] = useState<string | null>(null); // day sheet
  const [openLog, setOpenLog] = useState<WorkoutLog | null>(null); // full-screen workout detail
  const [logging, setLogging] = useState(false); // "Log session" (new) editor open
  const [editLog, setEditLog] = useState<WorkoutLog | null>(null); // editing an existing log
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [followCounts, setFollowCounts] = useState<{ following: number; followers: number } | null>(null);
  // Tiny status so saving to the database is visible (and failures aren't silent).
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Avatar picker: downscale the chosen image and store it as the profile photo.
  const pickAvatar = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      update({ photo: await fileToDataUrl(file) });
    } catch {
      // Ignore images that won't decode.
    }
  };

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

  // Real "Following" count from the follow graph.
  useEffect(() => {
    if (!supabase || !userId) return;
    let active = true;
    getMyFollowCounts()
      .then((c) => active && setFollowCounts(c))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  // Fetch this month's logged workouts (for the calendar) + the all-time count.
  // Pure (no setState) so it's safe to call from both the effect and handlers.
  const fetchLogs = useCallback(async (): Promise<{
    logs: WorkoutLog[];
    total: number;
    partners: PartnerSummary[];
  }> => {
    if (!userId) return { logs: [], total: 0, partners: [] };
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const from = `${y}-${pad(m + 1)}-01`;
    const to = `${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`;
    const [logs, total, partners] = await Promise.all([
      listMonth(userId, from, to),
      countWorkouts(userId),
      listPartners(userId),
    ]);
    return { logs, total, partners };
  }, [userId]);

  useEffect(() => {
    let active = true;
    fetchLogs().then((r) => {
      if (!active) return;
      setLogs(r.logs);
      setSessionsCount(r.total);
      setPartners(r.partners);
    });
    return () => {
      active = false;
    };
  }, [fetchLogs]);

  // Reload after logging a session.
  const reloadLogs = async () => {
    const r = await fetchLogs();
    setLogs(r.logs);
    setSessionsCount(r.total);
    setPartners(r.partners);
  };

  // Edit a logged session: close the detail + day sheet and reopen it in the editor.
  const handleEditLog = (log: WorkoutLog) => {
    setOpenLog(null);
    setOpenDate(null);
    setEditLog(log);
  };

  // Delete a logged session, refresh, close the detail, and close the day sheet
  // if that day is now empty (use the freshly fetched logs, not the async state).
  const handleDeleteLog = async (log: WorkoutLog) => {
    if (userId) await deleteWorkout(userId, log.id);
    const r = await fetchLogs();
    setLogs(r.logs);
    setSessionsCount(r.total);
    setPartners(r.partners);
    setOpenLog(null);
    if (!r.logs.some((l) => l.date === log.date)) setOpenDate(null);
  };

  // Edit handler: merges the patch into the saved JSON and persists it to the DB.
  // The write lives OUTSIDE the state updater (so it runs once, not twice in
  // StrictMode) and reports a save status the user can see.
  const update = (patch: Partial<CurrentUser>) => {
    const next = { ...(data ?? {}), ...patch };
    setData(next);
    if (!supabase || !userId) return; // no DB in this environment → in-memory only
    setSaveState("saving");
    supabase
      .from("profiles")
      .update({ data: next, updated_at: new Date().toISOString() })
      .eq("id", userId)
      .then(({ error }) => {
        if (error) {
          console.error("Profile save failed:", error.message);
          setSaveState("error");
        } else {
          setSaveState("saved");
        }
      });
  };

  // Save edited onboarding answers, and re-derive the Training rows so they stay
  // consistent with the new answers.
  const savePreferences = (patch: Partial<OnboardingProfile>) => {
    const merged = { ...(data as Partial<OnboardingProfile>), ...patch } as OnboardingProfile;
    update({ ...patch, trainingDisplay: deriveTrainingDisplay(merged) });
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

  const stats: { label: string; value: number; onClick?: () => void }[] = [
    { label: "Sessions", value: sessionsCount },
    { label: "Partners", value: partners.length, onClick: () => setPartnersOpen(true) },
    { label: "Following", value: followCounts?.following ?? user.stats.following },
  ];

  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  // "Who you train with" summary, e.g. "Partner · Any".
  const trainWithLabel = user.trainingType
    ? cap(user.trainingType) +
      (user.trainingType !== "solo" && user.partnerPreference
        ? ` · ${cap(user.partnerPreference)}`
        : "")
    : "—";

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
          {saveState !== "idle" && (
            <span
              className={`text-[11px] ${saveState === "error" ? "text-danger" : "text-muted"}`}
            >
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Couldn’t save"}
            </span>
          )}
          <ThemeModeToggle />
          <button type="button" aria-label="Settings" className="text-muted">
            <IconSettings size={18} />
          </button>
        </div>
      </div>

      {/* Identity block */}
      <div className="flex flex-col items-center gap-2 border-b border-border px-3.5 pb-3 pt-4">
        <div className="relative">
          <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary/15 text-primary">
            {user.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo} alt={user.name || "Profile photo"} className="h-full w-full object-cover" />
            ) : (
              <IconUser size={30} />
            )}
          </div>
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pickAvatar(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => avatarInputRef.current?.click()}
            aria-label={user.photo ? "Change photo" : "Add photo"}
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
            {user.residence ? `${residenceLabel(user.residence)} · ` : ""}
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
            {s.onClick ? (
              <button
                type="button"
                onClick={s.onClick}
                className="px-4 text-center transition-colors active:bg-surface-2"
              >
                <div className="text-[17px] font-medium text-text">{s.value}</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[0.06em] text-primary">
                  {s.label}
                </div>
              </button>
            ) : (
              <div className="px-4 text-center">
                <div className="text-[17px] font-medium text-text">{s.value}</div>
                <div className="mt-0.5 text-[9px] uppercase tracking-[0.06em] text-muted">
                  {s.label}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Streak & points — rise only from verified chat-planned sessions */}
      <StreakCard userId={userId} />

      {/* Upcoming accepted sessions (chat-planned) */}
      <UpcomingSessions />

      {/* Session calendar */}
      <SessionCalendar logs={logs} onPickDate={(d) => setOpenDate(d)} />

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

      {/* Preferences — your editable onboarding answers */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[9px] font-medium uppercase tracking-[0.1em] text-primary">
            Preferences
          </div>
          <button
            type="button"
            onClick={() => setEditingPrefs(true)}
            className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            <IconPencil size={11} />
            Edit answers
          </button>
        </div>

        <div className="flex items-center justify-between py-1.5">
          <span className="text-xs text-muted">Train with</span>
          <span className="text-xs text-text">{trainWithLabel}</span>
        </div>

        {user.interests.length > 0 && (
          <div className="mt-2.5">
            <div className="mb-1.5 text-[11px] text-muted">Interests</div>
            <div className="flex flex-wrap gap-1.5">
              {user.interests.map((i) => (
                <span
                  key={i}
                  className="rounded-full border border-accent bg-accent/15 px-2.5 py-1 text-[11px] text-accent"
                >
                  {i}
                </span>
              ))}
            </div>
          </div>
        )}

        {user.languages.length > 0 && (
          <div className="mt-2.5">
            <div className="mb-1.5 text-[11px] text-muted">Languages</div>
            <div className="flex flex-wrap gap-1.5">
              {user.languages.map((l) => (
                <span
                  key={l}
                  className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] text-text"
                >
                  {l}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Personal records */}
      <PersonalRecords
        records={user.personalRecords}
        onChange={(records: PersonalRecord[]) => update({ personalRecords: records })}
        visible={user.showPersonalRecords}
        onVisibleChange={(v) => update({ showPersonalRecords: v })}
      />

      {/* Photos */}
      <PhotoGrid
        photos={user.photos}
        onChange={(photos) => update({ photos })}
        visible={user.showPhotos}
        onVisibleChange={(v) => update({ showPhotos: v })}
      />

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
          onClick={() => setLogging(true)}
          className="flex-1 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-contrast"
        >
          Log Session
        </button>
      </div>

      {partnersOpen && (
        <PartnersSheet partners={partners} onClose={() => setPartnersOpen(false)} />
      )}

      {openDate && (
        <SessionSheet
          date={openDate}
          logs={logs.filter((l) => l.date === openDate)}
          onClose={() => setOpenDate(null)}
          onOpen={(log) => setOpenLog(log)}
        />
      )}

      {openLog && (
        <WorkoutDetail
          log={openLog}
          onBack={() => setOpenLog(null)}
          onEdit={handleEditLog}
          onDelete={handleDeleteLog}
        />
      )}

      {(logging || editLog) && userId && (
        <LogSessionSheet
          userId={userId}
          existing={editLog ?? undefined}
          onClose={() => {
            setLogging(false);
            setEditLog(null);
          }}
          onSaved={async () => {
            await reloadLogs();
            setLogging(false);
            setEditLog(null);
          }}
        />
      )}

      {editingPrefs && (
        <PreferencesSheet
          profile={user}
          onSave={savePreferences}
          onClose={() => setEditingPrefs(false)}
        />
      )}
    </div>
  );
}
