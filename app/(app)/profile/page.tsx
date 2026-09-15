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
import LeaderboardStrip from "@/components/leaderboards/LeaderboardStrip";
import MemoriesStrip from "@/components/profile/MemoriesStrip";
import PersonalRecords from "@/components/profile/PersonalRecords";
import PhotoGrid from "@/components/profile/PhotoGrid";
import AboutYouSheet from "@/components/profile/AboutYouSheet";
import { useProfileData } from "@/components/profile/useProfileData";
import {
  profileFromOnboarding,
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
import { hometownLabel, nameError } from "@/lib/onboarding";
import {
  IconSettings,
  IconUser,
  IconCamera,
  IconPencil,
  IconCheck,
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
    EDITING THE TOP OF THE PROFILE — photo, name and bio — is one pencil in the
    top bar, left of the cog. The name and bio used to carry a pencil each,
    which pushed the name off the centre line. Tap the pencil: the photo gets
    its camera and the name and bio each get a small pencil, but they still
    read as the page does. Tap the one you want and only THAT becomes a field
    (editField); tap the tick to save. The owner didn't want every field lit up
    with a red outline the moment the pencil was pressed.
  */
  const [editingTop, setEditingTop] = useState(false);
  const [editField, setEditField] = useState<"name" | "bio" | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [bioDraft, setBioDraft] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);

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

  const followers = followCounts?.followers ?? 0;
  const statsReady = statsLoaded && followCounts !== null;
  /*
    A profile with nothing on it yet. The three counts still show (zeros are
    honest, and the row is the shape of the page), but the tile that would say
    "Log a session" says what logging one gets you instead.
  */
  const brandNew = statsReady && sessionsCount === 0 && partners.length === 0 && followers === 0;

  /*
    THE THREE NUMBERS, in a row under the bio — sessions you've logged, people
    you've trained with, people following you. Partners is the only one that
    opens something.
  */
  const stats: { label: string; value: number; onClick?: () => void }[] = [
    { label: "Workouts", value: sessionsCount },
    { label: "Partners", value: partners.length, onClick: () => setPartnersOpen(true) },
    { label: "Followers", value: followers },
  ];

  /*
    THE ORDER OF THE PAGE, and the reason for it:

      1. WHO YOU ARE — photo, name, badges, house and class down the middle,
         then the bio, then the three counts.
      2. WHERE YOU STAND, beside LOG A SESSION — your rank and the one button
         that changes it, sharing a row.
      3. YOUR TRAINING — one calendar: this week, or the month, with arrows and
         a swipe (components/profile/TrainingCalendar.tsx).
      4. MEMORIES — what your training looked like, at the foot of the page.
      5. MORE ABOUT YOU — a fold holding the middle of the page: interests,
         languages, what you study, where you're from, and your records.
      6. YOUR PHOTOS, always on screen, and the replay button under them.

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
          {/* The pencil edits the top of the profile (photo, name, bio); the
              cog is everything else. While editing, the pencil is a tick. */}
          <button
            type="button"
            onClick={() => {
              if (!editingTop) {
                setNameDraft(user.name);
                setBioDraft(user.bio);
                setNameErr(null);
                setEditField(null);
                setEditingTop(true);
                return;
              }
              const why = nameError(nameDraft);
              if (why) {
                setEditField("name");
                return setNameErr(why);
              }
              const patch: { name?: string; bio?: string } = {};
              if (nameDraft !== user.name) patch.name = nameDraft;
              if (bioDraft !== user.bio) patch.bio = bioDraft;
              if (Object.keys(patch).length) update(patch);
              setEditField(null);
              setEditingTop(false);
            }}
            aria-label={editingTop ? "Save profile" : "Edit profile"}
            className={`tap44 press-icon ${editingTop ? "text-primary" : "text-muted"}`}
          >
            {editingTop ? <IconCheck size={18} /> : <IconPencil size={17} />}
          </button>
          <Link href="/settings" aria-label="Settings" className="tap44 text-muted">
            <IconSettings size={18} />
          </Link>
        </div>
      </div>

      {/*
        1 · WHO YOU ARE — the photo on the left, and beside it your name with
        the three counts under it, then the rest of you (owner, 2026-09-14,
        picking the "lines only" preview and then Instagram's own arrangement,
        where the name sits above the followers rather than above the photo):

          ( photo )   Martin Houska
                      48 | 12 | 96
                      workouts partners followers

          [VARSITY] [MENTOR]
          a line of bio
          ──────────────────────────

        LINES ONLY is the point of it. Nothing in this block is a box: the
        counts are separated by hairlines rather than sitting in a rounded
        card, and the bio is plain text rather than a grey panel. A rule under
        the bio closes the block off. Everything below it — the leaderboard row
        included — is deliberately left exactly as it was.

        Photo, name and bio are still edited from the pencil in the top bar
        (see editingTop); only the arrangement changed.
      */}
      <div className="flex items-center gap-4 px-3.5 pb-3 pt-4">
        <div className="relative shrink-0">
          {/* While editing, the photo itself is a tap target too, not just
              the little camera on its edge. */}
          <div
            onClick={editingTop ? () => avatarInputRef.current?.click() : undefined}
            className={`flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-full border-2 border-primary bg-primary-tint text-primary ${
              editingTop ? "cursor-pointer" : ""
            }`}
          >
            {user.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photo} alt={user.name || "Profile photo"} className="h-full w-full object-cover" />
            ) : (
              <IconUser size={32} />
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
          {editingTop && (
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              aria-label={user.photo ? "Change photo" : "Add photo"}
              className="tap44 press-icon absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface-2 text-muted"
            >
              <IconCamera size={12} />
            </button>
          )}
        </div>

        {/* THE RIGHT-HAND COLUMN — your name, and the three counts under it
            (owner, 2026-09-14: on Instagram the name sits above the followers,
            not above the picture). The photo is centred against the pair, so a
            name long enough to wrap makes the row taller rather than pushing
            anything sideways. */}
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          {editingTop && editField === "name" ? (
            <div>
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  if (nameErr) setNameErr(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !nameError(nameDraft)) setEditField(null);
                }}
                maxLength={40}
                aria-label="Name"
                placeholder="Your name"
                aria-invalid={nameErr ? true : undefined}
                /* 16px so a phone doesn't zoom in on focus. Red only when
                   something is actually wrong. */
                className={`w-full border-b bg-transparent text-base font-medium text-text focus:outline-none ${
                  nameErr ? "border-danger" : "border-border"
                }`}
              />
              {/* The name everyone else sees — it has to be one (lib/onboarding). */}
              {nameErr && <span className="mt-1 block text-[11px] text-danger">{nameErr}</span>}
            </div>
          ) : editingTop ? (
            <button
              type="button"
              onClick={() => setEditField("name")}
              aria-label="Edit name"
              className="flex items-center gap-1.5 text-left text-base font-medium text-text"
            >
              {nameDraft || "Your name"}
              <IconPencil size={12} className="text-muted" />
            </button>
          ) : (
            <div className="text-base font-medium text-text">{user.name || "Your name"}</div>
          )}

          {/* Three EQUAL columns, so the two hairlines land at exactly a third
              and two thirds. They show a dash until the numbers have landed, so
              the row never jumps. The labels are 10px here because a third of
              the space next to a photo is narrower than a third of the screen
              was. */}
          <div className="grid grid-cols-3">
            {stats.map((s, i) => {
              const body = (
                <>
                  <div className="text-[17px] font-medium tabular-nums text-text">
                    {statsReady ? s.value : "—"}
                  </div>
                  <div
                    className={`mt-0.5 truncate text-[10px] uppercase tracking-[0.04em] ${
                      s.onClick ? "text-primary" : "text-muted"
                    }`}
                  >
                    {s.label}
                  </div>
                </>
              );
              return (
                <div
                  key={s.label}
                  className={`flex min-w-0 items-stretch ${i > 0 ? "border-l border-border" : ""}`}
                >
                  {s.onClick ? (
                    <button
                      type="button"
                      onClick={s.onClick}
                      className="w-full min-w-0 rounded-md px-0.5 text-center transition-colors active:bg-surface-2"
                    >
                      {body}
                    </button>
                  ) : (
                    <div className="w-full min-w-0 px-0.5 text-center">{body}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* WHAT YOU ARE — VARSITY and MENTOR, left-aligned under your name.

          The "House · Class of ____" line that used to sit here is GONE from
          your own profile (owner, 2026-09-14): you know where you live, and the
          Leaderboards card a little further down already names your team. It
          still shows on SOMEBODY ELSE's profile, where it tells you something
          you didn't know — see app/(app)/people/[id]/page.tsx. */}
      <div className="flex flex-col gap-1.5 px-3.5">
        {/* On your OWN profile the varsity badge comes from live membership:
            profiles.data has no record of it (the squad lives in its own
            table), so unlike a profile you're viewing, it can't come through
            profileFromOnboarding. */}
        {(isMember || user.badges.mentor) && (
          <div className="flex items-center gap-1.5">
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
      </div>

      {/* BIO — plain text, no card. The grey panel it used to sit in was the
          last box in this block, and the whole point of the lines-only look is
          that there are none. The rule underneath is what closes the block. */}
      <div className="border-b border-border px-3.5 pb-3.5 pt-2">
        {editingTop && editField === "bio" ? (
          <div>
            <textarea
              autoFocus
              value={bioDraft}
              onChange={(e) => setBioDraft(e.target.value)}
              maxLength={160}
              aria-label="Bio"
              placeholder="Add a short bio"
              className="min-h-[96px] w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-base text-text focus:outline-none"
            />
            <div className="mt-1 text-right text-[11px] text-muted">{bioDraft.length} / 160</div>
          </div>
        ) : editingTop ? (
          <button
            type="button"
            onClick={() => setEditField("bio")}
            aria-label="Edit bio"
            className="w-full text-left text-[13px] leading-relaxed text-text-2"
          >
            {bioDraft || "Add a short bio"}
            <IconPencil size={11} className="ml-1.5 inline-block align-[-1px]" />
          </button>
        ) : (
          <p className="text-[13px] leading-relaxed text-text-2">
            {user.bio || "Add a short bio with the pencil above."}
          </p>
        )}
      </div>

      {/* "Did you train with Sam today?" — a partner tag waiting for your yes.
          High up, because it is the one thing on this page someone else is
          waiting on; saying yes also puts the session on YOUR calendar. Hidden
          when there is nothing to answer. */}
      <PartnerRequests onChanged={reloadLogs} />

      {/* Upcoming accepted sessions (chat-planned) — a date in your diary
          belongs above the fold. Hides itself when there is none. */}
      <UpcomingSessions />

      {/* 2 · WHERE YOU STAND, AND THE BUTTON THAT MOVES YOU — straight under
          the bio, where it swapped places with Memories (owner, 2026-09-14).
          It shares its line with "Log a session", which puts the rank and the
          one action that changes it side by side.

          The compact card drops the middle number (your HOUSE's own rank) so
          two numbers and the button fit a phone: what's left is where you sit
          among your housemates and where you sit on campus — both about you.

          A profile with nothing logged yet gets the starter card full width
          instead: there is no rank to show, and the card says the same thing
          the empty boards would. */}
      <div className="border-b border-border px-3.5 py-3">
        {brandNew ? (
          <button
            type="button"
            onClick={() => setLogging(true)}
            data-tour="profile-log"
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-left active:bg-surface-2"
          >
            <div className="text-[13px] font-semibold text-text">Log your first session</div>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              Your calendar, your partners and the people who follow you all start
              here. About ten seconds.
            </p>
          </button>
        ) : (
          /* ONE GREY BAR (option 3 of the owner's previews): the ranks on the
             left, a short "Log" button docked inside on the right. Two
             siblings in a grey box rather than a button inside the link, so
             tapping Log never also opens the boards.
             data-tour: the Profile tour opens on this button (lib/tour.ts). */
          <div className="flex items-center gap-2.5 rounded-2xl border border-border bg-surface py-2.5 pl-3 pr-2.5">
            <LeaderboardStrip compact />
            <Button data-tour="profile-log" size="md" className="h-11! shrink-0" onClick={() => setLogging(true)}>
              <IconPlus size={15} /> Log
            </Button>
          </div>
        )}
      </div>

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

      {/* 4 · MEMORIES — the foot of the page, where it swapped places with
          the leaderboard row (owner, 2026-09-14). The calendar is the part of
          your training you read; this is the part you look at, so it ends the
          page rather than interrupting it. Hides itself entirely until there's
          a photo. */}
      <MemoriesStrip />

      {/* 5 · THE MIDDLE OF THE PAGE, in a <details> that starts OPEN — the
          owner wants it read, not hunted for — but can still be folded away.
          It stops at the records: the photo grid below is never folded. */}
      <details open className="group border-b border-border">
        <summary className="tap44 flex cursor-pointer list-none items-center justify-between px-3.5 pb-1 pt-3 [&::-webkit-details-marker]:hidden">
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            More about you
          </span>
          {/* No counts here: they're already in the row under the bio. */}
          <span className="flex items-center gap-2 text-[11px] text-muted">
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
      {(user.interests.length > 0 ||
        user.languages.length > 0 ||
        user.concentration ||
        user.hometownCity ||
        user.hometownCountry) && (
        <div className="border-b border-border px-3.5 pb-3 pt-0">
          {/* No "About you" label — "More about you" right above already says it.
              The Edit pencil SHARES the first line with the Interests heading; on
              a row of its own it left an empty band under "More about you". */}
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[11px] text-muted">
              {user.interests.length > 0 ? "Interests" : ""}
            </span>
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
          )}

          {user.languages.length > 0 && (
            <div className="mt-2.5">
              <div className="mb-1.5 text-[11px] text-muted">Languages</div>
              <div className="flex flex-wrap gap-1.5">
                {user.languages.map((l) => (
                  <span
                    key={l}
                    className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text"
                  >
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* WHAT YOU STUDY — a chip, the same pill as Interests and Languages
              above it, rather than the label-and-value row it used to be. */}
          {user.concentration && (
            <div className="mt-2.5">
              <div className="mb-1.5 text-[11px] text-muted">Concentration</div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] text-text">
                  {user.concentration}
                </span>
              </div>
            </div>
          )}

          {/* WHERE YOU'RE FROM stays a row: it is one line of prose, not a tag.
              The hometown leads with the CITY. On a campus where most of the
              list answers "United States", the country on its own says almost
              nothing — "New York" is the half that gets recognised. */}
          {(user.hometownCity || user.hometownCountry) && (
            <div className="mt-2.5 border-t border-border pt-1">
              <div className="flex items-center justify-between gap-3 py-2">
                <span className="text-[11px] text-muted">From</span>
                <span className="text-right text-[11px] font-medium text-text">
                  {hometownLabel(user.hometownCity, user.hometownCountry)}
                </span>
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
      </details>

      {/* YOUR PHOTOS — OUTSIDE the fold, on purpose (owner, 2026-09-14): "it's
          there every time, like on Instagram". Your grid is the part of a
          profile people come to look at, so folding the section above it must
          never take it off the screen. Only the middle — interests and the
          records — is foldable. */}
      <PhotoGrid
        photos={user.photos}
        onChange={(photos) => update({ photos })}
        visible={user.showPhotos}
        onVisibleChange={(v) => update({ showPhotos: v })}
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
          <div className="rounded-xl border border-border bg-surface p-3.5">
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
            className="w-full rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text"
          >
            Replay onboarding
          </button>
        )}
      </div>

      {switchingMode && (
        <ModeSwitcherSheet current="student" onClose={() => setSwitchingMode(false)} />
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

      {/* The pencil beside the chips edits ONLY the chips: interests,
          languages, concentration and where you're from. The full "Edit your
          answers" sheet (activity, gyms, mentorship) is in Settings. */}
      {editingPrefs && (
        <AboutYouSheet
          profile={user}
          onSave={savePreferences}
          onClose={() => setEditingPrefs(false)}
        />
      )}

    </div>
  );
}
