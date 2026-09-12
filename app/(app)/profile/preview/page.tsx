"use client";

/*
  PROFILE — NEW LAYOUT PREVIEW (Hevy-style).

  This is a PREVIEW of a different arrangement of the Profile tab, sitting at
  /profile/preview so the live tab (app/(app)/profile/page.tsx) is untouched
  while the owner looks at it. Nothing here is a new feature: it is the same
  data, the same components and the same sheets, laid out differently.

  What changes versus the live tab:
    1. SHARE is no longer a half-width button next to Log Session. It is a
       small icon in the top bar, next to the cog — the size it deserves.
    2. The BIO is back on the page (it had been folded into "More about you"),
       left-aligned under the name rather than centred.
    3. The identity block is two columns, so the screen is full: name, class,
       bio on the LEFT — Workouts, Partners, Followers stacked on the RIGHT.
    4. The CALENDAR sits directly under that block: this week first, then the
       month, the way Hevy shows a week strip above its history.

  Colours are theme tokens only (rule 1).
*/
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { SkeletonLines, SkeletonRows } from "@/components/ui/Skeleton";
import UniversityCrest from "@/components/UniversityCrest";
import ShareInviteButton from "@/components/ShareInviteButton";
import InlineEdit from "@/components/profile/InlineEdit";
import WeekCalendar, { thisWeek } from "@/components/profile/WeekCalendar";
import SessionCalendar from "@/components/profile/SessionCalendar";
import SessionSheet from "@/components/profile/SessionSheet";
import WorkoutDetail from "@/components/profile/WorkoutDetail";
import LogSessionSheet from "@/components/profile/LogSessionSheet";
import PartnersSheet from "@/components/profile/PartnersSheet";
import { useProfileData } from "@/components/profile/useProfileData";
import { profileFromOnboarding, classOfLabel } from "@/lib/currentUser";
import {
  listMonth,
  countWorkouts,
  listPartners,
  deleteWorkout,
  type WorkoutLog,
  type PartnerSummary,
} from "@/lib/supabase/workouts";
import { getMyFollowCounts } from "@/lib/supabase/follows";
import { fileToDataUrl } from "@/lib/image";
import { residenceLabel, nameError } from "@/lib/onboarding";
import {
  IconSettings,
  IconUser,
  IconCamera,
  IconPlus,
  IconArrowLeft,
} from "@/components/icons";

export default function ProfilePreviewPage() {
  const { data, loading, saveState, update, supabase, userId } = useProfileData();

  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [partnersOpen, setPartnersOpen] = useState(false);
  const [followers, setFollowers] = useState<number | null>(null);
  const [openDate, setOpenDate] = useState<string | null>(null);
  const [openLog, setOpenLog] = useState<WorkoutLog | null>(null);
  const [logging, setLogging] = useState(false);
  const [editLog, setEditLog] = useState<WorkoutLog | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Same window the live tab reads: the current month, widened to cover a week
  // that straddles the 1st.
  const fetchLogs = useCallback(async () => {
    if (!userId) return { logs: [] as WorkoutLog[], total: 0, partners: [] as PartnerSummary[] };
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    const week = thisWeek(now);
    const from = [`${y}-${pad(m + 1)}-01`, week[0].iso].sort()[0];
    const to = [`${y}-${pad(m + 1)}-${pad(new Date(y, m + 1, 0).getDate())}`, week[6].iso].sort()[1];
    const [monthLogs, total, partnerList] = await Promise.all([
      listMonth(userId, from, to),
      countWorkouts(userId),
      listPartners(userId),
    ]);
    return { logs: monthLogs, total, partners: partnerList };
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

  useEffect(() => {
    let active = true;
    // No database configured (or nobody signed in) settles on zero rather than
    // sitting in "loading" — same as the live tab.
    const read =
      supabase && userId ? getMyFollowCounts() : Promise.resolve({ following: 0, followers: 0 });
    read
      .then((c) => active && setFollowers(c.followers))
      .catch(() => active && setFollowers(0));
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  const reloadLogs = async () => {
    const r = await fetchLogs();
    setLogs(r.logs);
    setSessionsCount(r.total);
    setPartners(r.partners);
  };

  const pickAvatar = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      update({ photo: await fileToDataUrl(file) });
    } catch {
      // Ignore images that won't decode.
    }
  };

  const handleDeleteLog = async (log: WorkoutLog) => {
    if (userId) await deleteWorkout(userId, log.id);
    const r = await fetchLogs();
    setLogs(r.logs);
    setSessionsCount(r.total);
    setPartners(r.partners);
    setOpenLog(null);
    if (!r.logs.some((l) => l.date === log.date)) setOpenDate(null);
  };

  const user = data ? profileFromOnboarding(data) : null;

  if (loading || !user) {
    return (
      <div className="mx-auto w-full max-w-screen-sm">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
          <h1 className="text-base font-medium text-text">My Profile</h1>
          <span className="text-muted">
            <IconSettings size={18} />
          </span>
        </div>
        <SkeletonLines count={5} />
        <SkeletonRows count={3} avatar={false} />
      </div>
    );
  }

  // The three numbers that go down the right-hand side.
  const stats: { label: string; value: number | null; onClick?: () => void }[] = [
    { label: "Workouts", value: sessionsCount },
    { label: "Partners", value: partners.length, onClick: () => setPartnersOpen(true) },
    { label: "Followers", value: followers },
  ];

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* A preview, and it says so — with the way back to the real tab. */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-surface-2 px-3.5 py-2">
        <span className="text-[11px] text-muted">Preview · new profile layout</span>
        <Link href="/profile" className="flex items-center gap-1 text-[11px] font-medium text-primary">
          <IconArrowLeft size={12} /> Back to the current one
        </Link>
      </div>

      {/* TOP BAR — crest, name, and the two small controls: Share (now an
          icon, not a half-width button) and the cog. */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
        <div className="flex items-center gap-1.5">
          <UniversityCrest size={26} />
          <h1 className="text-base font-medium text-text">{user.name || "My Profile"}</h1>
        </div>
        <div className="flex items-center gap-2">
          {saveState !== "idle" && (
            <span className={`text-[11px] ${saveState === "error" ? "text-danger" : "text-muted"}`}>
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Couldn’t save"}
            </span>
          )}
          <ShareInviteButton iconOnly />
          <Link href="/settings" aria-label="Settings" className="text-muted">
            <IconSettings size={18} />
          </Link>
        </div>
      </div>

      {/* IDENTITY — two columns, so the width is used: you on the left, your
          numbers on the right. */}
      <div className="flex items-start gap-3 border-b border-border px-3.5 py-3.5">
        {/* LEFT: photo, name, class, bio — all left-aligned. */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <div className="relative flex-shrink-0">
              <div className="flex h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary">
                {user.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.photo}
                    alt={user.name || "Profile photo"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <IconUser size={26} />
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
                className="tap44 press-icon absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
              >
                <IconCamera size={11} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <InlineEdit
                value={user.name}
                onChange={(v) => update({ name: v })}
                ariaLabel="name"
                placeholder="Your name"
                maxLength={40}
                validate={nameError}
                textClassName="text-[15px] font-medium text-text"
              />
              <div className="mt-0.5 text-[11px] text-muted">
                {user.residence ? `${residenceLabel(user.residence)} · ` : ""}
                {classOfLabel(user.classYear)}
              </div>
            </div>
          </div>

          {/* BIO — back on the page, under the name, left-aligned. */}
          <div className="mt-2.5">
            <InlineEdit
              value={user.bio}
              onChange={(v) => update({ bio: v })}
              ariaLabel="bio"
              placeholder="Add a short bio"
              maxLength={160}
              multiline
              textClassName="text-[12px] leading-relaxed text-muted"
            />
          </div>
        </div>

        {/* RIGHT: the three counts, stacked. */}
        <div className="w-[104px] flex-shrink-0 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-2">
          {stats.map((s) => {
            const body = (
              <>
                <div className="text-[17px] font-medium leading-none text-text">
                  {s.value === null ? "—" : s.value}
                </div>
                <div
                  className={`mt-1 text-[10px] uppercase tracking-[0.06em] ${
                    s.onClick ? "text-primary" : "text-muted"
                  }`}
                >
                  {s.label}
                </div>
              </>
            );
            return s.onClick ? (
              <button
                key={s.label}
                type="button"
                onClick={s.onClick}
                className="block w-full px-2 py-2.5 text-center transition-colors active:bg-surface"
              >
                {body}
              </button>
            ) : (
              <div key={s.label} className="px-2 py-2.5 text-center">
                {body}
              </div>
            );
          })}
        </div>
      </div>

      {/* INTERESTS — near the top, where somebody reads them, as rectangles in
          the school's own colour (accent tokens, so a different university
          re-skins them by changing data — rule 1). Six at most: the strip is a
          glance, not a list, and "+N" says the rest are there. Languages sit
          under them in the neutral rectangle, so the two don't compete. */}
      {(user.interests.length > 0 || user.languages.length > 0) && (
        <div className="border-b border-border px-3.5 py-3">
          {user.interests.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5">
              {/* Six cells, always: six interests, or five and the "+N" that
                  says the rest are there. Either way the grid is two full rows
                  rather than a widow on a line of its own. */}
              {user.interests.slice(0, user.interests.length > 6 ? 5 : 6).map((i) => (
                <span
                  key={i}
                  className="truncate rounded-md border border-accent-line bg-accent-tint px-2 py-1.5 text-center text-[11px] font-medium text-accent"
                >
                  {i}
                </span>
              ))}
              {user.interests.length > 6 && (
                <span className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-center text-[11px] font-medium text-muted">
                  +{user.interests.length - 5} more
                </span>
              )}
            </div>
          )}

          {user.languages.length > 0 && (
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {user.languages.slice(0, 3).map((l) => (
                <span
                  key={l}
                  className="truncate rounded-md border border-border bg-surface-2 px-2 py-1.5 text-center text-[11px] text-text"
                >
                  {l}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* LOG SESSION — full width now that Share has moved to the top bar. */}
      <div className="border-b border-border px-3.5 py-3">
        <Button size="lg" full onClick={() => setLogging(true)}>
          <IconPlus size={16} /> Log Session
        </Button>
      </div>

      {/* CALENDAR, directly under the identity block: the week, then the month. */}
      <WeekCalendar logs={logs} onPickDate={(d) => setOpenDate(d)} />
      <SessionCalendar logs={logs} onPickDate={(d) => setOpenDate(d)} />

      {partnersOpen && <PartnersSheet partners={partners} onClose={() => setPartnersOpen(false)} />}

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
          onEdit={(log) => {
            setOpenLog(null);
            setOpenDate(null);
            setEditLog(log);
          }}
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
    </div>
  );
}
