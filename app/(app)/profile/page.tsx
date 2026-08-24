"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import { SkeletonLines, SkeletonRows } from "@/components/ui/Skeleton";
import Link from "next/link";
import { useRouter } from "next/navigation";
import UniversityCrest from "@/components/UniversityCrest";
import ModeSwitcherSheet from "@/components/ModeSwitcherSheet";
import useTapOrDoubleTap from "@/components/useTapOrDoubleTap";
import { useMembership } from "@/components/varsity/useMembership";
import { VARSITY_HOME } from "@/lib/varsity/theme";
import InlineEdit from "@/components/profile/InlineEdit";
import SessionCalendar from "@/components/profile/SessionCalendar";
import SessionSheet from "@/components/profile/SessionSheet";
import WorkoutDetail from "@/components/profile/WorkoutDetail";
import LogSessionSheet from "@/components/profile/LogSessionSheet";
import PartnersSheet from "@/components/profile/PartnersSheet";
import UpcomingSessions from "@/components/profile/UpcomingSessions";
import LeaderboardStrip from "@/components/leaderboards/LeaderboardStrip";
import MemoriesStrip from "@/components/profile/MemoriesStrip";
import PersonalRecords from "@/components/profile/PersonalRecords";
import PhotoGrid from "@/components/profile/PhotoGrid";
import PreferencesSheet from "@/components/profile/PreferencesSheet";
import TrainingScheduleSheet from "@/components/profile/TrainingScheduleSheet";
import OptionPickerSheet from "@/components/profile/OptionPickerSheet";
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
import {
  residenceLabel,
  experienceLevels,
  primaryActivities,
  gymSplits,
  verifiedGyms,
  MAX_TOP_GYMS,
  type OnboardingProfile,
} from "@/lib/onboarding";
import {
  IconSettings,
  IconUser,
  IconCamera,
  IconPencil,
  IconChevronDown,
  IconChevronRight,
} from "@/components/icons";

export default function ProfilePage() {
  // The saved profile JSON (onboarding answers + any profile edits) and its
  // writer, shared with the Settings page so both edit the same row the same way.
  const { data, loading, saveState, update, savePreferences, supabase, userId } =
    useProfileData();

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
  const [editingSchedule, setEditingSchedule] = useState(false);
  // Which Training row is being picked, if any.
  const [picker, setPicker] = useState<"level" | "activity" | "split" | "gyms" | null>(null);
  const [followCounts, setFollowCounts] = useState<{ following: number; followers: number } | null>(null);
  // True once the counts have actually been fetched. Without it a brand-new
  // profile would show three zeros for a beat before the starter card replaced
  // them — the exact "0 / 0 / 0" moment this slice exists to remove.
  const [statsLoaded, setStatsLoaded] = useState(false);
  const [switchingMode, setSwitchingMode] = useState(false); // mode switcher sheet
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

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

  // Real "Following" count from the follow graph.
  useEffect(() => {
    // Settle on zeros when there's nobody to ask, so the stats block doesn't sit
    // in "still loading" forever.
    if (!supabase || !userId) {
      setFollowCounts({ following: 0, followers: 0 });
      return;
    }
    let active = true;
    getMyFollowCounts()
      .then((c) => active && setFollowCounts(c))
      .catch(() => active && setFollowCounts({ following: 0, followers: 0 }));
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
  const stats: { label: string; value: number; onClick?: () => void }[] = [
    { label: "Sessions", value: sessionsCount },
    { label: "Partners", value: partners.length, onClick: () => setPartnersOpen(true) },
    { label: "Following", value: following },
  ];

  /*
    A profile with nothing on it yet. Counters that all read 0 tell you nothing
    except that you're behind, so until there's a single session, partner or
    follow, the stats strip is replaced by the one thing that starts all three.
  */
  const statsReady = statsLoaded && followCounts !== null;
  const brandNew = sessionsCount === 0 && partners.length === 0 && following === 0;

  const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
  // "Who you train with" summary, e.g. "Partner · Any".
  const trainWithLabel = user.trainingType
    ? cap(user.trainingType) +
      (user.trainingType !== "solo" && user.partnerPreference
        ? ` · ${cap(user.partnerPreference)}`
        : "")
    : "—";

  /*
    Each row shows the saved answer and opens the picker that edits it. Saving
    goes through savePreferences, which re-derives the display rows, so the
    label and the stored answer can never disagree.
  */
  const answers = data as Partial<OnboardingProfile>;
  const trainingRows: { key: string; label: string; value: string; onEdit: () => void }[] = [
    {
      key: "level",
      label: "Level",
      value: user.trainingDisplay.level,
      onEdit: () => setPicker("level"),
    },
    {
      key: "type",
      label: "Activity",
      value: user.trainingDisplay.type,
      onEdit: () => setPicker("activity"),
    },
    {
      key: "split",
      label: "Split",
      value: user.trainingDisplay.split,
      onEdit: () => setPicker("split"),
    },
    {
      key: "schedule",
      label: "Days",
      value: user.trainingDisplay.schedule,
      onEdit: () => setEditingSchedule(true),
    },
    {
      key: "gym",
      label: "Gyms",
      value: answers.topGyms?.join(" · ") || "—",
      onEdit: () => setPicker("gyms"),
    },
  ];

  return (
    <div className="mx-auto w-full max-w-screen-sm">
      {/* Top bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-3.5 py-3">
        {/* The university sigil LEADS the top bar for EVERYONE — it's the
            school's mark, the same one the student mode uses, and says nothing
            about varsity. It sits first and big (26px) so the student side has
            a logo in the corner the way Varsity Mode does, rather than a
            trailing decoration after the name. What only a squad member gets is
            the chevron and the tap: the title then doubles as the mode switcher
            (tap for the sheet, double-tap to go straight into Varsity Mode). */}
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
          {/* One button, and it's a cog. The light/dark toggle used to sit here
              too, but IconSettings was drawn as a circle with rays — the same
              picture as IconSun — so this read as two sun buttons. Both the
              toggle and the preferences sheet now live on /settings. */}
          <Link href="/settings" aria-label="Settings" className="text-muted">
            <IconSettings size={18} />
          </Link>
        </div>
      </div>

      {/* Identity block */}
      <div className="flex flex-col items-center gap-2 border-b border-border px-3.5 pb-3 pt-4">
        <div className="relative">
          <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary">
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
            className="tap44 press-icon absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
          >
            <IconCamera size={12} />
          </button>

          {/* No varsity crest pinned to the photo. It used to sit here as a
              quiet hint that another mode exists, but the switcher in the top
              bar and the VARSITY badge under the name already say it — on the
              photo it just crowded the face. */}
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

          {/* On your OWN profile the varsity badge comes from live membership:
              profiles.data has no record of it (the squad lives in its own
              table), so unlike a profile you're viewing, it can't come through
              profileFromOnboarding. */}
          {(isMember || user.badges.mentor) && (
            <div className="flex items-center justify-center gap-1.5">
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
          )}

          <div className="text-[11px] text-muted">
            {user.residence ? `${residenceLabel(user.residence)} · ` : ""}
            {classOfLabel(user.classYear)}
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Bio</div>
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

      {/* Stats — or, on a profile with nothing on it yet, the first step */}
      {!statsReady ? (
        // Same height as either block, so nothing jumps when the counts land.
        <div className="h-[58px] border-b border-border" />
      ) : brandNew ? (
        <div className="border-b border-border px-3.5 py-3">
          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
            <div className="text-sm font-medium text-text">Log your first session</div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">
              Your calendar, your sessions and the people you train with all start here.
              It takes about ten seconds.
            </p>
            <Button size="md" onClick={() => setLogging(true)} className="mt-3">
              Log a session
            </Button>
          </div>
        </div>
      ) : (
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
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-primary">
                  {s.label}
                </div>
              </button>
            ) : (
              <div className="px-4 text-center">
                <div className="text-[17px] font-medium text-text">{s.value}</div>
                <div className="mt-0.5 text-[11px] uppercase tracking-[0.06em] text-muted">
                  {s.label}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      )}

      {/* Upcoming accepted sessions (chat-planned) */}
      <UpcomingSessions />

      {/* Leaderboards — one line, roughly a centimetre tall, straight into the
          full boards. It sits ABOVE the calendar deliberately: it's the thing
          worth glancing at every time this tab opens. */}
      <LeaderboardStrip />

      {/* Session calendar — an all-blank month says nothing, so it only appears
          once there's at least one logged session to mark on it. */}
      {statsReady && sessionsCount > 0 && (
        <SessionCalendar logs={logs} onPickDate={(d) => setOpenDate(d)} />
      )}

      {/* Memories — the same history as pictures. Directly under the calendar
          because it answers the other half of the question: the calendar says
          what you did, this says what it looked like. Hides itself entirely
          until there's a photo to show. */}
      <MemoriesStrip />

      {/* Training — every row opens a real picker and saves the real answer.
          These used to be free-text boxes writing to `trainingDisplay`, a
          display-only copy, so edits here never reached matching. */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-1 flex items-baseline justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Training
          </div>
          <span className="text-[11px] text-muted">affects who you match with</span>
        </div>
        <div className="flex flex-col divide-y divide-border">
          {trainingRows.map((row) => (
            <button
              key={row.key}
              type="button"
              onClick={row.onEdit}
              className="flex items-center justify-between gap-3 py-2.5 text-left"
            >
              <span className="text-xs text-muted">{row.label}</span>
              <span className="flex items-center gap-1.5">
                <span className="text-xs text-text">{row.value}</span>
                <span className="text-muted">
                  <IconChevronRight size={13} />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preferences — your editable onboarding answers */}
      <div className="border-b border-border px-3.5 py-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Preferences
          </div>
          <button
            type="button"
            onClick={() => setEditingPrefs(true)}
            className="flex items-center gap-1 rounded-full px-1.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary-tint"
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

      {/* Varsity Mode isn't a row down here any more — it's the switcher on the
          name in the top bar (tap = sheet, double-tap = straight in). */}

      {/* Bottom action bar (sticks above the tab nav) */}
      <div className="sticky bottom-0 z-20 flex gap-2.5 border-t border-border bg-surface px-3.5 py-3">
        {/* "Log Session" is the job of this screen, so it gets the weight —
            these used to be two equal halves. */}
        <Button variant="secondary" size="lg" className="flex-1">
          Share
        </Button>
        {/* data-tour: the Profile tour opens on this button (lib/tour.ts). */}
        <Button
          data-tour="profile-log"
          size="lg"
          onClick={() => setLogging(true)}
          className="flex-[2]"
        >
          Log Session
        </Button>
      </div>

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

      {editingSchedule && (
        <TrainingScheduleSheet
          schedule={answers.trainingSchedule ?? {}}
          onSave={(trainingSchedule) => savePreferences({ trainingSchedule })}
          onClose={() => setEditingSchedule(false)}
        />
      )}

      {picker === "level" && (
        <OptionPickerSheet
          title="Experience level"
          hint="How long you've been training"
          options={experienceLevels.map((l) => ({ value: l.key, label: `${l.name} — ${l.desc}` }))}
          selected={answers.experienceLevel ? [answers.experienceLevel] : []}
          onSave={([experienceLevel]) =>
            savePreferences({ experienceLevel: experienceLevel as OnboardingProfile["experienceLevel"] })
          }
          onClose={() => setPicker(null)}
        />
      )}

      {picker === "activity" && (
        <OptionPickerSheet
          title="Main activity"
          hint="What you mostly do"
          options={primaryActivities.map((a) => ({ value: a.key, label: a.label }))}
          selected={answers.primaryActivity ? [answers.primaryActivity] : []}
          onSave={([primaryActivity]) =>
            savePreferences({ primaryActivity: primaryActivity as OnboardingProfile["primaryActivity"] })
          }
          onClose={() => setPicker(null)}
        />
      )}

      {picker === "split" && (
        <OptionPickerSheet
          title="Training split"
          hint="How you organise your week"
          options={gymSplits.map((s) => ({ value: s, label: s }))}
          selected={answers.gymSplit ? [answers.gymSplit] : []}
          onSave={([gymSplit]) => savePreferences({ gymSplit })}
          onClose={() => setPicker(null)}
        />
      )}

      {picker === "gyms" && (
        <OptionPickerSheet
          title="Your gyms"
          hint={`Up to ${MAX_TOP_GYMS}, in order of preference`}
          options={verifiedGyms.map((g) => ({ value: g, label: g }))}
          selected={answers.topGyms ?? []}
          multiple
          max={MAX_TOP_GYMS}
          onSave={(topGyms) => savePreferences({ topGyms })}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
