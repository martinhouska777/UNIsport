"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { SkeletonLines, SkeletonRows } from "@/components/ui/Skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UniversityCrest from "@/components/UniversityCrest";
import { useAppState } from "@/components/AppState";
import ModeSwitcherSheet from "@/components/ModeSwitcherSheet";
import useTapOrDoubleTap from "@/components/useTapOrDoubleTap";
import { useMembership } from "@/components/varsity/useMembership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import InlineEdit from "@/components/profile/InlineEdit";
import TrainingCalendar, {
  calendarRange,
  type CalendarMode,
} from "@/components/profile/TrainingCalendar";
import SessionSheet from "@/components/profile/SessionSheet";
import WorkoutDetail from "@/components/profile/WorkoutDetail";
import LogSessionSheet from "@/components/profile/LogSessionSheet";
import PartnersSheet from "@/components/profile/PartnersSheet";
import UpcomingSessions from "@/components/profile/UpcomingSessions";
import PartnerRequests from "@/components/profile/PartnerRequests";
import ShareInviteButton from "@/components/ShareInviteButton";
import LeaderboardStrip from "@/components/leaderboards/LeaderboardStrip";
import WeekEventLine from "@/components/leaderboards/WeekEventLine";
import MemoriesStrip from "@/components/profile/MemoriesStrip";
import PersonalRecords from "@/components/profile/PersonalRecords";
import PhotoGrid from "@/components/profile/PhotoGrid";
import PreferencesSheet from "@/components/profile/PreferencesSheet";
import { useProfileData } from "@/components/profile/useProfileData";
import {
  profileFromOnboarding,
  classOfLabel,
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
import { readLogLink } from "@/lib/reminders";
import {
  residenceLabel,
  nameError,
} from "@/lib/onboarding";
import {
  IconSettings,
  IconUser,
  IconCamera,
  IconPencil,
  IconChevronDown,
  IconPlus,
} from "@/components/icons";

export default function ProfilePage() {
  // The saved profile JSON (onboarding answers + any profile edits) and its
  // writer, shared with the Settings page so both edit the same row the same way.
  const { data, loading, saveState, update, savePreferences, supabase, userId } =
    useProfileData();

  // Logged workouts for the week/month on screen + the all-time count.
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [sessionsCount, setSessionsCount] = useState(0);
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [partnersOpen, setPartnersOpen] = useState(false); // "Partners" stat → who list
  const [openDate, setOpenDate] = useState<string | null>(null); // day sheet
  const [openLog, setOpenLog] = useState<WorkoutLog | null>(null); // full-screen workout detail
  const [logging, setLogging] = useState(false); // "Log session" (new) editor open
  // What the log reminder's deep link asked for: today's date and the usual gym.
  const [logPrefill, setLogPrefill] = useState<{ date?: string; gym?: string } | null>(null);
  const [editLog, setEditLog] = useState<WorkoutLog | null>(null); // editing an existing log
  const [editingPrefs, setEditingPrefs] = useState(false);
  const [followCounts, setFollowCounts] = useState<{ following: number; followers: number } | null>(null);
  // True once the counts have actually been fetched, so a brand-new profile
  // doesn't flash a starter card at someone who has trained all year.
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false); // mode switcher sheet
  /*
    WHICH WEEK / MONTH the calendar is showing. The anchor is any day inside it;
    the arrows and the swipe move it, and the fetch below follows — so paging
    back to April loads April. Zoom and anchor live here rather than in the
    calendar because the fetch depends on both.
  */
  const [calMode, setCalMode] = useState<CalendarMode>("week");
  const [calAnchor, setCalAnchor] = useState(() => new Date());
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { resetOnboarding } = useAppState();
  // Two taps, because finishing a replay OVERWRITES the answers on this page.
  const [replayArmed, setReplayArmed] = useState(false);

  /*
    Only an APPROVED member sees any varsity mark on this page — not someone
    still waiting to be let in, and certainly not a regular student. Until the
    captain approves you, the only place varsity is mentioned is Settings, which
    is somewhere you go looking rather than something the app puts in front of
    you. Nothing here should advertise that other accounts have a section this
    one doesn't.
  */
  const { isMember } = useMembership();

  // The name in the top bar, which only becomes a button once you're an
  // approved member: one tap opens the switcher, two go straight to Varsity
  // Mode, which plays its own intro on the way in.
  const handleModeTap = useTapOrDoubleTap(
    useCallback(() => setSwitchingMode(true), []),
    useCallback(() => router.push(VARSITY_HOME), [router]),
  );

  // Avatar picker: downscale the chosen image and store it as the profile photo.
  const pickAvatar = async (file: File | undefined) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      update({ photo: await fileToDataUrl(file) });
    } catch {
      // Ignore images that won't decode.
    }
  };

  /*
    ARRIVING FROM THE LOG REMINDER (/profile?log=1&date=…&gym=…): open the log
    sheet straight away with that date and gym filled in — the ten seconds the
    push promised. Read off the URL after mount (useSearchParams would force a
    Suspense boundary), then cleared so a refresh doesn't reopen it.
  */
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const link = readLogLink(window.location.search);
      if (!link) return;
      setLogPrefill({ date: link.date ?? undefined, gym: link.gym ?? undefined });
      setLogging(true);
      router.replace("/profile");
    });
    return () => cancelAnimationFrame(id);
  }, [router]);

  // Real follower / following counts from the follow graph.
  useEffect(() => {
    let active = true;
    // Settle on zeros when there's nobody to ask, so the stats block doesn't sit
    // in "still loading" forever. Resolved through a promise like the real
    // read, so nothing is set synchronously inside the effect body.
    const read = supabase && userId ? getMyFollowCounts() : Promise.resolve({ following: 0, followers: 0 });
    read
      .then((c) => active && setFollowCounts(c))
      .catch(() => active && setFollowCounts({ following: 0, followers: 0 }));
    return () => {
      active = false;
    };
  }, [supabase, userId]);

  /*
    Fetch the logs the calendar is showing (whatever week or month that is) +
    the all-time count. Pure (no setState) so it's safe to call from both the
    effect and the handlers.
  */
  const fetchLogs = useCallback(async (): Promise<{
    logs: WorkoutLog[];
    total: number;
    partners: PartnerSummary[];
  }> => {
    if (!userId) return { logs: [], total: 0, partners: [] };
    const { from, to } = calendarRange(calAnchor, calMode);
    const [logs, total, partners] = await Promise.all([
      listMonth(userId, from, to),
      countWorkouts(userId),
      listPartners(userId),
    ]);
    return { logs, total, partners };
  }, [userId, calAnchor, calMode]);

  useEffect(() => {
    let active = true;
    fetchLogs().then((r) => {
      if (!active) return;
      setLogs(r.logs);
      setSessionsCount(r.total);
      setPartners(r.partners);
      setStatsLoaded(true);
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

  const following = followCounts?.following ?? user.stats.following;
  const followers = followCounts?.followers ?? 0;
  const statsReady = statsLoaded && followCounts !== null;
  /*
    A profile with nothing on it yet. The three counts still show (zeros are
    honest, and the row is the shape of the page), but the tile that would say
    "Log a session" says what logging one gets you instead.
  */
  const brandNew = statsReady && sessionsCount === 0 && partners.length === 0 && followers === 0;

  /*
    THE THREE NUMBERS, across the top beside the photo — sessions you've logged,
    people you've trained with, people following you. Partners is the only one
    that opens something.
  */
  const stats: { label: string; value: number; onClick?: () => void }[] = [
    { label: "Workouts", value: sessionsCount },
    { label: "Partners", value: partners.length, onClick: () => setPartnersOpen(true) },
    { label: "Followers", value: followers },
  ];

  /*
    THE ORDER OF THE PAGE, and the reason for it:

      1. WHO YOU ARE — photo, name, the three counts beside it, bio underneath.
         Wide, not stacked down the middle, so the screen is used.
      2. WHERE YOU STAND — the boards and this week's event, one line each.
      3. YOUR TRAINING — one calendar: this week, or the month, with arrows and
         a swipe (components/profile/TrainingCalendar.tsx).
      4. LOG A SESSION, beside Memories — the button that fills the calendar,
         next to what the calendar looked like.
      5. YOUR PHOTOS, under them.
      6. Everything else folded behind "More about you".

    Training, the schedule, the gyms and who you'll train with live in Settings
    (components/settings/TrainingSettings.tsx): they are answers the app runs
    on, not things a visitor to your profile reads.
  */
  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
        {/* The university sigil LEADS the top bar for EVERYONE — it's the
            school's mark, the same one the student mode uses, and says nothing
            about varsity. What only a squad member gets is the chevron and the
            tap: the title then doubles as the mode switcher (tap for the sheet,
            double-tap to go straight into Varsity Mode). */}
        {isMember ? (
          <button
            type="button"
            onClick={handleModeTap}
            aria-label="Switch mode"
            className="flex items-center gap-1.5"
          >
            <UniversityCrest size={26} />
            <h1 className="text-base font-medium text-text">{user.name || "My Profile"}</h1>
            <IconChevronDown size={13} className="text-muted" />
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <UniversityCrest size={26} />
            <h1 className="text-base font-medium text-text">{user.name || "My Profile"}</h1>
          </div>
        )}
        <div className="flex items-center gap-2">
          {saveState !== "idle" && (
            <span
              className={`text-[11px] ${saveState === "error" ? "text-danger" : "text-muted"}`}
            >
              {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved ✓" : "Couldn’t save"}
            </span>
          )}
          {/* Share is a small icon up here beside the cog, not a half-width
              button competing with Log Session (real: an invite link,
              lib/invite.ts). */}
          <ShareInviteButton iconOnly />
          <Link href="/settings" aria-label="Settings" className="text-muted">
            <IconSettings size={18} />
          </Link>
        </div>
      </div>

      {/* 1 · WHO YOU ARE — photo on the left, name and the three counts beside
          it, bio full width underneath. */}
      <div className="border-b border-border px-3.5 pb-3 pt-3.5">
        <div className="flex items-start gap-3">
          <div className="relative flex-shrink-0">
            <div className="flex h-[68px] w-[68px] items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary">
              {user.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photo} alt={user.name || "Profile photo"} className="h-full w-full object-cover" />
              ) : (
                <IconUser size={28} />
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
              className="tap44 press-icon absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
            >
              <IconCamera size={12} />
            </button>
          </div>

          <div className="min-w-0 flex-1">
            <InlineEdit
              value={user.name}
              onChange={(v) => update({ name: v })}
              ariaLabel="name"
              placeholder="Your name"
              maxLength={40}
              /* The name everyone else sees — it has to be one (lib/onboarding). */
              validate={nameError}
              textClassName="text-[15px] font-medium text-text"
            />

            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-muted">
                {user.residence ? `${residenceLabel(user.residence)} · ` : ""}
                {classOfLabel(user.classYear)}
              </span>
              {/* On your OWN profile the varsity badge comes from live
                  membership: profiles.data has no record of it (the squad lives
                  in its own table). Gold, as it is everywhere else. */}
              {isMember && (
                <span className="rounded bg-accent px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-background">
                  VARSITY
                </span>
              )}
              {user.badges.mentor && (
                <span className="rounded border border-success bg-success-tint px-1.5 py-0.5 text-[8px] font-medium tracking-wide text-success">
                  MENTOR
                </span>
              )}
            </div>

            {/* The counts, across rather than down: three columns of the width
                left beside the photo. */}
            <div className="mt-2.5 flex items-start">
              {stats.map((s) => {
                const body = (
                  <>
                    <div
                      className={`text-[11px] ${s.onClick ? "text-primary" : "text-muted"}`}
                    >
                      {s.label}
                    </div>
                    <div className="mt-0.5 text-[15px] font-medium leading-none text-text">
                      {statsReady ? s.value : "—"}
                    </div>
                  </>
                );
                return (
                  <div key={s.label} className="min-w-0 flex-1">
                    {s.onClick ? (
                      <button type="button" onClick={s.onClick} className="block text-left">
                        {body}
                      </button>
                    ) : (
                      body
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bio — full width under the block, where a line of text belongs. */}
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

      {/* "Did you train with Sam today?" — a partner tag waiting for your yes.
          High up, because it is the one thing on this page someone else is
          waiting on; saying yes also puts the session on YOUR calendar. Hidden
          when there is nothing to answer. */}
      <PartnerRequests onChanged={reloadLogs} />

      {/* 2 · WHERE YOU STAND — one line, straight into the full boards — and
          this week's event under it, with your real count against it. */}
      <LeaderboardStrip />
      <WeekEventLine compact />

      {/* Upcoming accepted sessions (chat-planned) — a date in your diary
          belongs above the fold. Hides itself when there is none. */}
      <UpcomingSessions />

      {/* 3 · YOUR TRAINING — this week, or the whole month, with arrows or a
          swipe to move through either. */}
      <TrainingCalendar
        logs={logs}
        anchor={calAnchor}
        mode={calMode}
        onAnchorChange={setCalAnchor}
        onModeChange={setCalMode}
        onPickDate={(d) => setOpenDate(d)}
      />

      {/* 4 · LOG A SESSION, and MEMORIES beside it — the button that fills the
          calendar next to what the calendar looked like. Memories takes itself
          away until there is a photo, and then Log a session has the row. */}
      <div className="flex items-stretch gap-2.5 border-b border-border px-3.5 py-3">
        {brandNew ? (
          <button
            type="button"
            onClick={() => setLogging(true)}
            data-tour="profile-log"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left active:bg-surface"
          >
            <div className="text-[13px] font-semibold text-text">Log your first session</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Your calendar, your partners and the people who follow you all start
              here. About ten seconds.
            </p>
          </button>
        ) : (
          /* data-tour: the Profile tour opens on this button (lib/tour.ts). */
          <Button
            data-tour="profile-log"
            size="lg"
            onClick={() => setLogging(true)}
            className="min-w-0 flex-1"
          >
            <IconPlus size={16} /> Log a session
          </Button>
        )}
        <MemoriesStrip card />
      </div>

      {/* 5 · YOUR PHOTOS, under them. */}
      <PhotoGrid
        photos={user.photos}
        onChange={(photos) => update({ photos })}
        visible={user.showPhotos}
        onVisibleChange={(v) => update({ showPhotos: v })}
      />

      {/* 6 · EVERYTHING ELSE, folded. A <details>, so it opens without
          JavaScript and is announced for free. */}
      <details className="group border-b border-border">
        <summary className="tap44 flex cursor-pointer list-none items-center justify-between px-3.5 py-3 [&::-webkit-details-marker]:hidden">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            More about you
          </span>
          <span className="flex items-center gap-2 text-[11px] text-muted">
            {statsReady && !brandNew && `${sessionsCount} sessions · ${partners.length} partners · ${following} following`}
            <span className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none">
              <IconChevronDown size={16} />
            </span>
          </span>
        </summary>

      {/*
        WHAT OTHER PEOPLE SEE. Interests and languages used to sit inside a
        "Preferences" block, beside how you want to be matched and who with —
        which is why they read as settings. They aren't: they're public, they're
        what somebody else matches with you ON, and interests are the single most
        useful line on a match card — which is where they're SHOWN big, on the
        profile somebody opens from Match. Here they just need to be editable.

        The pencil edits them here rather than sending you to Settings to find
        them: you should be able to change a thing where you can see it.
      */}
      {(user.interests.length > 0 || user.languages.length > 0) && (
        <div className="border-b border-border px-3.5 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              About you
            </div>
            <button
              type="button"
              onClick={() => setEditingPrefs(true)}
              className="tap44 flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary-tint"
            >
              <IconPencil size={11} />
              Edit
            </button>
          </div>

          {user.interests.length > 0 && (
            <div>
              <div className="mb-1.5 text-[11px] text-muted">Interests</div>
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map((i) => (
                  <span
                    key={i}
                    className="rounded-full border border-accent bg-accent-tint px-2.5 py-1 text-[11px] text-accent"
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
      )}

      {/* Personal records */}
      <PersonalRecords
        records={user.personalRecords}
        onChange={(records: PersonalRecord[]) => update({ personalRecords: records })}
        visible={user.showPersonalRecords}
        onVisibleChange={(v) => update({ showPersonalRecords: v })}
      />

      {/* Varsity Mode isn't a row down here any more — it's the switcher on the
          name in the top bar (tap = sheet, double-tap = straight in). */}

      {/*
        REPLAY ONBOARDING — the last thing on the page, under everything it
        would rewrite.

        The same button exists in Settings, but only when NODE_ENV isn't
        production, which means it is invisible on the deployed app — the one
        place the owner actually reviews from. This one is always here.

        It arms first, because it is not a preview: reaching the end of the
        flow writes a fresh profile over the one above, and the questions start
        blank rather than pre-filled with these answers.
      */}
      <div className="px-3.5 pb-4 pt-6">
        {replayArmed ? (
          <div className="rounded-xl border border-border bg-surface-2 p-3.5">
            <div className="text-[13px] font-medium text-text">Start onboarding again?</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              You&apos;ll answer all nine screens from scratch. Whatever you finish with
              replaces the profile on this page.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => setReplayArmed(false)}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                className="flex-1"
                onClick={async () => {
                  await resetOnboarding();
                  router.replace("/onboarding");
                }}
              >
                Start over
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setReplayArmed(true)}
            className="w-full rounded-full border border-border bg-surface-2 px-5 py-2.5 text-sm font-medium text-text"
          >
            Replay onboarding
          </button>
        )}
      </div>
      </details>

      {switchingMode && (
        <ModeSwitcherSheet
          current="student"
          name={user.name}
          onClose={() => setSwitchingMode(false)}
        />
      )}

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
          initialDate={logPrefill?.date}
          initialGym={logPrefill?.gym}
          onClose={() => {
            setLogging(false);
            setLogPrefill(null);
            setEditLog(null);
          }}
          onSaved={async () => {
            await reloadLogs();
            setLogging(false);
            setLogPrefill(null);
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
