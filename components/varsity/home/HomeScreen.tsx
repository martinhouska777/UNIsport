"use client";

/*
  Varsity HOME screen — the athlete's daily anchor.
  Renders the data from lib/varsity/home.ts: greeting, race countdown, the week
  strip, today's prescribed sessions (with coach notes + watch-verify), the
  day's lineup, and the coach's weekly focus. All colors are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { can, canOpenConsole, roleLabel, type VarsityRole } from "@/lib/varsity/membership";
import { fetchPlan } from "@/lib/varsity/planStore";
import { fetchTodayLineups } from "@/lib/varsity/lineupStore";
import { claimRosterSeat, fetchSeatIdentity, type SeatIdentity } from "@/lib/varsity/athleteProfile";
import LineupBoatCard, { LineupSeats, isMyBoat } from "@/components/varsity/LineupBoatCard";
import UploadVideoSheet from "@/components/varsity/UploadVideoSheet";
import ClaimSeatSheet from "@/components/varsity/ClaimSeatSheet";
import { driveConfigured, driveFolderLink } from "@/lib/varsity/drive";
import { fetchNote } from "@/lib/varsity/notesStore";
import { sessionKey, parseDate, toISO } from "@/lib/varsity/coachPlan";
import { buildAthleteHome, daySessionToCard, logSpanFor } from "@/lib/varsity/athleteHome";
import { fetchLogsInRange, LOG_DAYS_BACK } from "@/lib/varsity/logStore";
import { SkeletonCards, SkeletonLines } from "@/components/ui/Skeleton";
import SectionLabel from "@/components/ui/SectionLabel";
import {
  crewName,
  dockTime,
  kindBar,
  kindBlock,
  shellName,
  type HomeData,
  type Greeting as GreetingData,
  type Race as RaceData,
  type WeekDay,
  type WeekView,
  type TodaySession,
  type SessionStatus,
  type Lineup,
} from "@/lib/varsity/home";
import {
  IconFlag,
  IconClock,
  IconCheckCircle,
  IconMessage,
  IconX,
  IconCalendar,
  IconArrowLeft,
  IconArrowRight,
  IconChevronRight,
  IconChevronDown,
  IconChevronUp,
  IconClipboard,
  IconAnchor,
  IconPlus,
  IconVideo,
  IconUser,
} from "@/components/icons";

// Three states, all read off the athlete's own log (lib/varsity/athleteHome).
const statusStyle: Record<
  SessionStatus,
  { cls: string; label: string; Icon: (p: { size?: number }) => React.ReactElement }
> = {
  upcoming: { cls: "text-muted", label: "UPCOMING", Icon: IconClock },
  done: { cls: "text-success", label: "LOGGED", Icon: IconCheckCircle },
  missed: { cls: "text-danger", label: "MISSED", Icon: IconX },
};

/*
  CAN THIS SESSION STILL BE LOGGED? The Log tab reaches back LOG_DAYS_BACK days
  (today included) and no further, so a card offers its Log button exactly when
  the tab could open that day — anything older is simply "missed".
*/
function loggable(iso: string): boolean {
  const oldest = new Date();
  oldest.setDate(oldest.getDate() - (LOG_DAYS_BACK - 1));
  return iso >= toISO(oldest) && iso <= toISO(new Date());
}

/* The section label used to be defined here, one of more than ten versions of
   the same heading across the app. It lives in components/ui now. */

/* ─── Greeting ─── */
function Greeting({ g }: { g: GreetingData }) {
  return (
    <div className="flex items-end justify-between px-4 pb-1 pt-3">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          {g.date}
        </div>
        <div className="text-2xl font-semibold leading-none text-text">{g.name}</div>
      </div>
      <div className="text-right">
        <div className="text-[11px] font-semibold tracking-[0.1em] text-accent">{g.block}</div>
        <div className="text-[11px] text-muted">{g.week}</div>
      </div>
    </div>
  );
}

/* ─── Race countdown ─── */
function RaceBar({ r }: { r: RaceData }) {
  return (
    <div className="mx-3 mt-2 flex items-center gap-3 rounded-xl border border-primary-line bg-gradient-to-r from-primary/20 to-accent/10 px-3.5 py-2.5">
      <span className="text-primary">
        <IconFlag size={18} />
      </span>
      <div className="flex-1">
        <div className="text-xs font-medium text-text">{r.name}</div>
        <div className="text-[11px] text-muted">{r.location}</div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-semibold leading-none text-accent">{r.big}</div>
        {r.small && (
          <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
            {r.small}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Week strip ───
   The coach's plan, seven days side by side, styled after the team's training
   Excel. Tap a day to see its full workout below. The whole month is the
   Calendar tab. */

const PERIOD_ROWS = ["AM", "PM"] as const;

// WEEK view: the whole week at a glance — 7 day columns, no sideways scrolling.
// Each session is a color-coded block (the colour is the intensity: UT2, hard,
// …) showing the coach's workout text; cells grow so the full text fits.
function WeekFit({
  week,
  selected,
  onSelect,
}: {
  week: WeekView;
  selected: WeekDay | null;
  onSelect: (d: WeekDay) => void;
}) {
  return (
    <div className="grid grid-cols-7 items-stretch gap-1">
      {week.days.map((d, i) => {
        const sel = selected === d;
        return (
          <button
            key={i}
            onClick={() => onSelect(d)}
            className={`flex flex-col overflow-hidden rounded-lg border bg-surface text-left ${
              sel
                ? "border-primary ring-1 ring-primary"
                : d.today
                  ? "border-primary"
                  : "border-border"
            }`}
          >
            <div className={`px-0.5 py-1 text-center ${d.today ? "bg-primary-tint" : "bg-surface-2"}`}>
              <div className={`text-[8px] font-semibold uppercase leading-none ${d.today ? "text-accent" : "text-muted"}`}>
                {d.letter}
              </div>
              <div className={`mt-0.5 text-[12px] font-semibold leading-none ${d.today ? "text-primary" : "text-text"}`}>
                {d.num}
              </div>
            </div>
            <div className="flex flex-1 flex-col gap-0.5 p-0.5">
              {PERIOD_ROWS.map((row) => {
                const s = d.sessions.find((x) => x.time === row);
                if (!s) return null;
                return (
                  <div key={row} className="flex-1 rounded px-1 py-1" style={kindBlock(s.kind)}>
                    <span className="block text-[7px] font-bold leading-none text-text-3">{row}</span>
                    <span className="mt-0.5 block break-words text-[10px] font-medium leading-tight text-text">
                      {s.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// The MONTH view used to be a full-screen overlay here, plan only. It lives in
// the Calendar tab now, which shows one month from both sources: the plan
// ahead of today, your own log behind it. The Month button below points there.

/*
  The strip no longer owns which day is open. ONE day runs the middle of the
  page — the sessions, and the lineup under them — and it lives in HomeScreen,
  so tapping a day here swaps what is already on screen instead of wedging a
  second, smaller copy of it between the calendar and today.

  `weekOf` keeps the strip pointed at the week the open day is in, so stepping
  past Sunday with the day arrows below turns the page here too.
*/
function WeekStrip({
  weeks,
  startIndex,
  selected,
  onSelect,
  onClearDay,
}: {
  weeks: WeekView[];
  startIndex: number;
  selected: WeekDay | null;
  onSelect: (d: WeekDay) => void;
  onClearDay: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);

  const last = weeks.length - 1;
  const go = (delta: number) =>
    setIdx(() => {
      const from = weekOf >= 0 ? weekOf : idx;
      return Math.max(0, Math.min(last, from + delta));
    });
  const pick = (d: WeekDay) => (d === selected ? onClearDay() : onSelect(d));

  const weekOf = selected ? weeks.findIndex((w) => w.days.includes(selected)) : -1;
  const current = weeks[weekOf >= 0 ? weekOf : idx];

  return (
    <div className="px-3 pt-4">
      <div className="flex items-center justify-between px-0.5 pb-2">
        <SectionLabel>Training Plan</SectionLabel>
        {/* The week always lives on the page; the whole month is the Calendar
            tab (plan ahead, log behind — one calendar, not two). */}
        <Link
          href="/varsity/calendar"
          className="press flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-text"
        >
          <IconCalendar size={13} />
          Month
        </Link>
      </div>

      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => go(-1)}
          disabled={(weekOf >= 0 ? weekOf : idx) === 0}
          aria-label="Previous week"
          className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted disabled:opacity-30"
        >
          <IconArrowLeft size={13} />
        </button>
        <span className="text-[11px] font-medium text-text">
          {current.label}
          {(weekOf >= 0 ? weekOf : idx) === startIndex && (
            <span className="text-muted"> · this week</span>
          )}
        </span>
        <button
          onClick={() => go(1)}
          disabled={(weekOf >= 0 ? weekOf : idx) === last}
          aria-label="Next week"
          className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted disabled:opacity-30"
        >
          <IconArrowRight size={13} />
        </button>
      </div>

      <WeekFit week={current} selected={selected} onSelect={pick} />
    </div>
  );
}

/* ─── The day's sessions ─── */
/*
  A session card OPENS. The boat you are in is a fact about one session — the
  morning outing and the evening one are different eights — so it belongs
  inside that session rather than only in a list further down the page. The
  card is only openable when a boat has actually been published for it, which
  doubles as the answer to "are the lineups up yet?" without tapping anything.
*/
function SessionCard({ s, lineups = [] }: { s: TodaySession; lineups?: Lineup[] }) {
  const st = statusStyle[s.status];
  const [open, setOpen] = useState(false);
  const boats = lineups.filter((l) => l.periodKey === s.periodKey);
  const openable = boats.length > 0;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div
        className="flex"
        onClick={openable ? () => setOpen((o) => !o) : undefined}
        role={openable ? "button" : undefined}
        tabIndex={openable ? 0 : undefined}
        aria-expanded={openable ? open : undefined}
        onKeyDown={
          openable
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpen((o) => !o);
                }
              }
            : undefined
        }
      >
        <div className="w-[3px] flex-shrink-0" style={kindBar(s.kind)} />
        <div className="flex-1 p-3">
          <div className="mb-1 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.06em] text-muted">
                {s.period}
              </span>
              <span className="text-[11px] text-muted">{s.location}</span>
            </div>
            <span className={`flex items-center gap-1 text-[8px] font-semibold tracking-[0.06em] ${st.cls}`}>
              <st.Icon size={12} />
              {st.label}
            </span>
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-text">{s.title}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{s.detail}</div>
            </div>
            {openable && (
              <span className="mt-0.5 flex flex-shrink-0 items-center gap-1 text-[8px] font-semibold tracking-[0.06em] text-accent">
                {open ? "HIDE BOAT" : "YOUR BOAT"}
                {open ? <IconChevronUp size={12} /> : <IconChevronDown size={12} />}
              </span>
            )}
          </div>

          {s.coachNote && (
            <div className="mt-2 flex gap-2 rounded-lg border border-accent-line bg-accent-tint px-2.5 py-2">
              <span className="mt-0.5 flex-shrink-0 text-accent">
                <IconMessage size={12} />
              </span>
              <div>
                <div className="text-[7px] font-semibold tracking-[0.12em] text-accent">
                  {s.coachNote.coach}
                </div>
                <div className="mt-0.5 text-[11px] leading-relaxed text-text-2">
                  {s.coachNote.text}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {open &&
        boats.map((l, i) => (
          <div key={i} className="border-t border-border bg-background/40 px-3 py-3">
            {/* Which boat this is and when it pushes off. Built from the parts
                rather than the stored display string, so a lineup whose old
                dock field holds a BOATHOUSE doesn't print one where the time
                goes (lib/varsity/home → dockTime). */}
            <div className="mb-2 text-[8px] font-semibold tracking-[0.12em] text-muted">
              {[l.periodKey, crewName(l), dockTime(l)].filter(Boolean).join(" · ").toUpperCase()}
            </div>
            <LineupSeats l={l} />
            {/* The two things you carry down to the water, in the same order
                the full boat card gives them: which shell, then which oars. */}
            {shellName(l) && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                <IconAnchor size={13} />
                <span className="font-mono text-[9px] tracking-[0.12em]">BOAT</span>
                <span className="text-text">{shellName(l)}</span>
              </div>
            )}
            {l.oars && (
              <div className="mt-1 flex items-center gap-2 text-[11px] text-muted">
                <IconAnchor size={13} />
                <span className="font-mono text-[9px] tracking-[0.12em]">OARS</span>
                <span className="text-text">{l.oars}</span>
              </div>
            )}
          </div>
        ))}

      {/*
        THE FOOT OF THE CARD: what the log says about this session, and the way
        to the log. Done → the figures you saved, and Edit. Not yet → a Log
        button, as long as the Log tab can still open that day; older than that
        and the card only says so. Both open EXACTLY this session's editor
        (/varsity/log?day=…&open=…), not the tab's front page.
      */}
      {(s.status === "done" || loggable(s.iso)) && (
        <div className="flex items-center justify-between gap-3 border-t border-border bg-background/60 px-3 py-2">
          <span className="min-w-0 truncate text-[12px] text-text-2">
            {s.status === "done"
              ? s.log?.summary || "Logged"
              : s.status === "missed"
                ? "Not logged yet"
                : "Log it when you're done"}
          </span>
          <Link
            href={`/varsity/log?day=${s.iso}&open=${s.dayKey}`}
            className={
              s.status === "done"
                ? "flex-shrink-0 text-[12px] font-semibold text-primary"
                : "flex-shrink-0 rounded-lg bg-primary-live px-3 py-1.5 text-[12px] font-semibold text-primary-contrast"
            }
          >
            {s.status === "done" ? "Edit" : "Log"}
          </Link>
        </div>
      )}
    </div>
  );
}


/*
  THE VIDEO BAR, at the top because that is where a daily habit belongs. Two
  things bring people back to this drive every single day and neither of them is
  the training plan: putting this morning's clip up, and going to watch one.
  Both were previously buried at the bottom of a boat card.

  "Upload video" opens a sheet that ASKS which practice and which boat, rather
  than guessing at your own boat today — anybody films, and yesterday's outing
  gets posted this morning. "Open Drive" is a plain link to the squad's folder,
  and only exists once a drive is actually connected; without one there is no
  folder to open.
*/
function DriveBar({ onUpload }: { onUpload: () => void }) {
  const cls =
    "tap44 flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-[12px] font-semibold text-text active:border-primary-line active:text-primary";
  return (
    <div className="flex items-center gap-2 px-3 pt-3">
      <button type="button" onClick={onUpload} className={cls}>
        <IconPlus size={13} /> Upload video
      </button>
      {driveConfigured() && (
        <a href={driveFolderLink()} target="_blank" rel="noreferrer" className={cls}>
          <IconVideo size={13} /> Open Drive
        </a>
      )}
    </div>
  );
}

/*
  THE LINEUP SECTION — YOUR boat, and a door to everyone else's.

  It used to list every published boat, under a heading that said "Your Lineup".
  Three eights is nine names each: a screen and a half of other people's crews
  before the rest of the page. Now the section holds only the boat you are in,
  already open, and "All boats" opens the day's full sheet on its own page.

  When you are not in a boat, the section is simply EMPTY — see below. The two
  doors out of an empty day are already on the screen: the arrows above step to
  another day, and "All boats" opens this day's full sheet.
*/
function LineupCard({
  lineups,
  onToday,
  allHref,
  total,
}: {
  lineups: Lineup[];
  onToday: boolean;
  allHref: string;
  total: number;
}) {
  const mine = lineups.filter(isMyBoat);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        {/* "Your Lineup" reads as today's. On another day it says whose day
            it is, so the boats below are never mistaken for this morning's. */}
        <SectionLabel>{onToday ? "Your Lineup" : "Lineup That Day"}</SectionLabel>
        <Link
          href={allHref}
          className="flex items-center gap-0.5 text-[11px] font-semibold text-primary"
        >
          All boats{total ? ` · ${total}` : ""} <IconChevronRight size={12} />
        </Link>
      </div>
      {/*
        NOT IN A BOAT? Then nothing — on the owner's call. A paragraph
        explaining that you are not in a boat is a paragraph telling you what
        the empty space already said, and it said it every single day somebody
        was ashore. The two ways on are still right there: the arrows step to
        another day, and "All boats" opens the day's full sheet.
      */}
      {mine.length > 0 && (
        <div className="flex flex-col gap-3">
          {mine.map((l, i) => (
            <LineupBoatCard key={i} l={l} defaultOpen />
          ))}
        </div>
      )}
    </div>
  );
}

/*
  THE DAY HEADER — the one control for the middle of the page. What sits under
  it (the sessions, and the lineup under those) is whatever day this says.

  The arrows step a day at a time across the whole published block, so looking
  at Thursday's outing is two taps and no calendar. The × only exists once you
  have left today, because that is the only time there is somewhere to go back
  to — and leaving it on today would be a button that does nothing.
*/
function DayHeader({
  title,
  right,
  canPrev,
  canNext,
  onStep,
  onToday,
}: {
  title: string;
  right?: string;
  canPrev: boolean;
  canNext: boolean;
  onStep: (delta: -1 | 1) => void;
  onToday?: () => void;
}) {
  const arrow = (dir: -1 | 1, live: boolean) => (
    <button
      onClick={() => onStep(dir)}
      disabled={!live}
      aria-label={dir === -1 ? "Previous day" : "Next day"}
      className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted disabled:opacity-30"
    >
      {dir === -1 ? <IconArrowLeft size={13} /> : <IconArrowRight size={13} />}
    </button>
  );
  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
      <SectionLabel>{title}</SectionLabel>
      <div className="flex items-center gap-1.5">
        {right && <span className="mr-1 text-[11px] text-muted">{right}</span>}
        {arrow(-1, canPrev)}
        {arrow(1, canNext)}
        {onToday && (
          <button
            onClick={onToday}
            aria-label="Back to today"
            className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted"
          >
            <IconX size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Coach's note for you (red = work on this · green = all clear) ─── */
function CoachNoteCard({ note }: { note: string }) {
  if (note.trim()) {
    return (
      <div className="overflow-hidden rounded-xl border border-danger-line bg-danger-tint">
        <div className="flex items-center gap-2 border-b border-danger-line px-3.5 py-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[12px] font-black leading-none text-background">
            !
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
            Coach&apos;s note · work on this
          </span>
        </div>
        <p className="px-3.5 py-3 text-[13px] leading-relaxed text-text-2">{note}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-success-line bg-success-tint px-3.5 py-3">
      <span className="text-success">
        <IconCheckCircle size={18} />
      </span>
      <div>
        <div className="text-[13px] font-semibold text-success">Good job</div>
        <div className="text-[11px] text-muted">No notes from your coach — keep it up.</div>
      </div>
    </div>
  );
}

/*
  CLAIM YOUR SEAT — the card an UNCLAIMED athlete sees until they pick their
  name on the squad list. Without it a published boat cannot know which seat
  is theirs, so the whole lineup section below stays empty and looks exactly
  like "nothing published". It sits under the greeting because it is the one
  thing standing between this person and the answer they open the app for.
  Gone the moment a name is picked (see ClaimSeatSheet).
*/
function ClaimSeatCard({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="px-3 pt-3">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 rounded-xl border border-primary-line bg-primary-tint px-3.5 py-3 text-left"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-primary-contrast">
          <IconUser size={15} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[14px] font-semibold text-text">Which of these is you?</span>
          <span className="mt-0.5 text-[11px] text-muted">
            Pick your name on the squad list so your boat shows up here.
          </span>
        </span>
        <IconChevronRight size={16} className="flex-shrink-0 text-muted" />
      </button>
    </div>
  );
}

/* ─── Empty state (no published plan for this week) ─── */
function EmptyHome() {
  return (
    <div className="mx-auto flex w-full max-w-screen-sm flex-col items-center px-6 pt-20 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-tint text-primary">
        <IconCalendar size={22} />
      </div>
      <div className="text-[15px] font-semibold text-text">No plan published yet</div>
      <p className="mt-1 max-w-[18rem] text-[12px] leading-relaxed text-muted">
        Your coach hasn&apos;t shared this week&apos;s training plan. It&apos;ll show up here as
        soon as it&apos;s published.
      </p>
    </div>
  );
}

/*
  THE DOOR INTO THE COACH CONSOLE.

  It used to exist only at the bottom of the athlete Profile, which is the last
  place someone who RUNS the squad would look — the owner asked for it back in
  Varsity Mode as a button, so here it is: the FIRST thing on the
  first screen the mode opens, above even the greeting, and already there while
  the plan is still loading. Whoever runs the squad shouldn't have to scroll
  past their own name to reach it.
  A plain athlete never sees it, and the database refuses them regardless.

  A captain and a coach get different doors on purpose: a captain handles
  invites and cannot build a plan (lib/varsity/membership.ts), so sending them
  to the plan builder would open a screen with nothing on it.
*/
function ConsoleDoor({ role }: { role: VarsityRole }) {
  return (
    <div className="px-3 pt-3">
      <Link
        href={can.buildPlan(role) ? "/varsity/coach/plan" : "/varsity/coach/team"}
        className="flex items-center gap-3 rounded-xl border border-accent-line bg-accent-tint px-3.5 py-3"
      >
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-background">
          <IconClipboard size={16} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <span className="text-[14px] font-semibold text-text">
            {roleLabel[role]} Console
          </span>
          <span className="mt-0.5 text-[11px] text-muted">
            {can.buildPlan(role)
              ? "Training plan, lineups, notes and the squad"
              : "Invite rowers and manage the squad"}
          </span>
        </span>
        <IconChevronRight size={16} className="flex-shrink-0 text-muted" />
      </Link>
    </div>
  );
}

export default function HomeScreen() {
  const { userId } = useAppState();
  // Coach or captain? Decides whether the console door appears at the top.
  const { membership, isMember } = useMembership();
  const consoleRole =
    isMember && canOpenConsole(membership!.role) ? membership!.role : null;
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<string | null>(null); // null = still loading
  // Who I am to a boat: my name, and the roster seat I claimed (null until I
  // pick one). Both decide "your seat"; the id wins whenever it is set.
  const [me, setMe] = useState<SeatIdentity | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);

  /*
    WHICH DAY the middle of the page is showing, as an index into the block's
    days. null means today — kept distinct from "the index that happens to be
    today" so the × knows whether there is anywhere to go back to.
  */
  const [dayIdx, setDayIdx] = useState<number | null>(null);
  // Another day's published boats, remembered with the day they belong to so a
  // slow fetch can never paint Tuesday's eight under Thursday's session.
  const [awayLineups, setAwayLineups] = useState<{ iso: string; lineups: Lineup[] } | null>(null);

  // The upload sheet, which asks which practice and which boat rather than
  // guessing (components/varsity/UploadVideoSheet.tsx).
  const [uploadOpen, setUploadOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const today = new Date();
      // The plan first: which days the log is needed for depends on it.
      const [identity, plan] = await Promise.all([fetchSeatIdentity(userId), fetchPlan()]);
      const span = logSpanFor(plan, today);
      const [lineups, coachNote, logs] = await Promise.all([
        fetchTodayLineups((p) => sessionKey(today, p), identity),
        fetchNote(userId),
        span && userId ? fetchLogsInRange(userId, span.from, span.to) : Promise.resolve([]),
      ]);
      if (!active) return;
      const firstName = identity.name.split(/\s+/)[0] ?? "";
      setMe(identity);
      setData(buildAthleteHome(plan, firstName, lineups, today, logs));
      setNote(coachNote);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  // Every day of the block, in order — the track the day arrows run on.
  const allDays = useMemo(() => (data ? data.weeks.flatMap((w) => w.days) : []), [data]);
  const todayIdx = useMemo(() => {
    const i = allDays.findIndex((d) => d.today);
    return i >= 0 ? i : 0; // a block that hasn't started yet opens on its first day
  }, [allDays]);
  const viewIdx = dayIdx ?? todayIdx;
  const viewDay: WeekDay | null = allDays[viewIdx] ?? null;
  const onToday = dayIdx === null;

  // Fetch the boats for a day that isn't today. Today's came with the page.
  useEffect(() => {
    if (onToday || !viewDay) return;
    const iso = viewDay.iso;
    let active = true;
    (async () => {
      const found = await fetchTodayLineups((p) => sessionKey(parseDate(iso), p), me);
      if (active) setAwayLineups({ iso, lineups: found });
    })();
    return () => {
      active = false;
    };
  }, [onToday, viewDay, me]);

  /*
    PICKED A NAME. Save it, then re-read the boats with the new identity so the
    seat lights up on the spot — today's from the page, any other day through
    the effect above (which re-runs because `me` changed).
  */
  const claimSeat = async (rosterId: string | null) => {
    const next = me ? { ...me, rosterId } : { name: "", rosterId };
    setMe(next);
    setAwayLineups(null);
    await claimRosterSeat(userId, rosterId);
    const today = new Date();
    const lineups = await fetchTodayLineups((p) => sessionKey(today, p), next);
    setData((d) => (d ? { ...d, lineups } : d));
  };

  // The coach's note sits at the bottom of the page (shown in every state,
  // even before a plan is published).
  const noteCard =
    note !== null ? (
      <div className="px-3 pt-3">
        <CoachNoteCard note={note} />
      </div>
    ) : null;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-sm pb-6">
        {consoleRole && <ConsoleDoor role={consoleRole} />}
        <SkeletonLines count={2} />
        <SkeletonCards count={2} />
      </div>
    );
  }
  // The claim card and its sheet, shown in every loaded state — a squad with no
  // plan published yet is exactly when a new rower is picking their name.
  const unclaimed = me !== null && me.rosterId === null;
  const claimUi = (
    <>
      {unclaimed && <ClaimSeatCard onOpen={() => setClaimOpen(true)} />}
      {claimOpen && (
        <ClaimSeatSheet
          current={me?.rosterId ?? null}
          onClaim={(id) => void claimSeat(id)}
          onClose={() => setClaimOpen(false)}
        />
      )}
    </>
  );

  if (!data) {
    return (
      <div className="mx-auto w-full max-w-screen-sm pb-6">
        {consoleRole && <ConsoleDoor role={consoleRole} />}
        {claimUi}
        <EmptyHome />
        {noteCard}
      </div>
    );
  }

  /*
    What the open day actually shows. Today keeps the richer cards the plan
    built for it; any other day is drawn from the week strip's own sessions
    through the SAME card, so the two never look like different features.
  */
  const sessions: TodaySession[] = onToday
    ? data.today
    : (viewDay?.sessions ?? []).map((s) => daySessionToCard(s, viewDay!.iso));
  const lineups: Lineup[] = onToday
    ? data.lineups
    : awayLineups?.iso === viewDay?.iso
      ? awayLineups.lineups
      : []; // still fetching, or none published

  /*
    Only YOUR boat gets onto this page — inside the session card and in the
    section below it alike. Everyone else's is one tap away on its own page,
    which is the whole point: three published eights is more screen than the
    training plan itself.
  */
  const myLineups = lineups.filter(isMyBoat);
  const allBoatsHref = `/varsity/lineups${viewDay?.iso ? `?d=${viewDay.iso}` : ""}`;

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-6">
      {consoleRole && <ConsoleDoor role={consoleRole} />}
      <Greeting g={data.greeting} />
      {claimUi}
      <DriveBar onUpload={() => setUploadOpen(true)} />
      <WeekStrip
        weeks={data.weeks}
        startIndex={data.weekIndex}
        selected={onToday ? null : viewDay}
        onSelect={(d) => {
          const i = allDays.indexOf(d);
          setDayIdx(i === todayIdx ? null : i);
        }}
        onClearDay={() => setDayIdx(null)}
      />

      <DayHeader
        title={onToday ? "Today's Sessions" : (viewDay?.dateLabel ?? "")}
        right={onToday ? `${sessions.length} prescribed` : undefined}
        canPrev={viewIdx > 0}
        canNext={viewIdx < allDays.length - 1}
        onStep={(delta) => {
          const next = Math.max(0, Math.min(allDays.length - 1, viewIdx + delta));
          setDayIdx(next === todayIdx ? null : next);
        }}
        onToday={onToday ? undefined : () => setDayIdx(null)}
      />

      {sessions.length > 0 ? (
        <div className="flex flex-col gap-2 px-3">
          {sessions.map((sess, i) => (
            <SessionCard key={i} s={sess} lineups={myLineups} />
          ))}
        </div>
      ) : (
        <div className="mx-3 rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-center text-[12px] text-muted">
          {onToday ? "Nothing scheduled for today." : "Nothing scheduled this day."}
        </div>
      )}

      {lineups.length > 0 && (
        <div className="px-3 pt-3">
          <LineupCard
            lineups={lineups}
            onToday={onToday}
            allHref={allBoatsHref}
            total={lineups.length}
          />
        </div>
      )}

      {data.race && (
        <div className="pt-4">
          <div className="px-4 pb-1">
            <SectionLabel>Next Race</SectionLabel>
          </div>
          <RaceBar r={data.race} />
        </div>
      )}

      {noteCard}

      {uploadOpen && <UploadVideoSheet onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
