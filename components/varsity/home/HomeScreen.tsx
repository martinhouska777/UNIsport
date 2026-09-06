"use client";

/*
  Varsity HOME screen — the athlete's daily anchor.
  Renders the data from lib/varsity/home.ts: greeting, race countdown, the week
  strip, today's prescribed sessions (with coach notes + watch-verify), the
  day's lineup, and the coach's weekly focus. All colors are theme tokens.
*/
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { can, canOpenConsole, roleLabel, type VarsityRole } from "@/lib/varsity/membership";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { fetchPlan, fetchProfileFullName } from "@/lib/varsity/planStore";
import { fetchTodayLineups } from "@/lib/varsity/lineupStore";
import LineupBoatCard, { LineupSeats, isMyBoat } from "@/components/varsity/LineupBoatCard";
import UploadVideoSheet from "@/components/varsity/UploadVideoSheet";
import { driveConfigured, driveFolderLink } from "@/lib/varsity/drive";
import { fetchNote } from "@/lib/varsity/notesStore";
import { sessionKey, parseDate } from "@/lib/varsity/coachPlan";
import { buildAthleteHome, daySessionToCard } from "@/lib/varsity/athleteHome";
import { SkeletonCards, SkeletonLines } from "@/components/ui/Skeleton";
import SectionLabel from "@/components/ui/SectionLabel";
import {
  kindBar,
  kindBlock,
  kindLegend,
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
  IconCheck,
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
} from "@/components/icons";

const statusStyle: Record<
  SessionStatus,
  { cls: string; label: string; Icon: (p: { size?: number }) => React.ReactElement }
> = {
  verified: { cls: "text-success", label: "VERIFIED", Icon: IconCheckCircle },
  upcoming: { cls: "text-muted", label: "UPCOMING", Icon: IconClock },
  flagged: { cls: "text-warn", label: "FLAGGED", Icon: IconFlag },
  missed: { cls: "text-danger", label: "MISSED", Icon: IconX },
};

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
   Two views of the coach's plan. WEEK = the seven days side by side, styled
   after the team's training Excel. MONTH = a full wall calendar, one month at a
   time. Tap any cell/day to see the full workout. */

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

// MONTH view: a full-screen wall calendar, opened from the Month button and
// closed with the X. Taking over the whole screen is what buys the room to
// print the coach's actual workout text inside each day instead of a dot.
// One month at a time, Monday-first; days outside the block are greyed and dead.
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

function MonthOverlay({
  weeks,
  selected,
  onSelect,
  onClearDay,
  onClose,
}: {
  weeks: WeekView[];
  selected: WeekDay | null;
  onSelect: (d: WeekDay) => void;
  onClearDay: () => void;
  onClose: () => void;
}) {
  const vTheme = useVarsityTheme();
  // Every planned day, keyed by date, so any calendar month can be filled in
  // from whichever weeks of the block overlap it.
  const byIso = useMemo(() => {
    const map: Record<string, WeekDay> = {};
    for (const wk of weeks) for (const d of wk.days) map[d.iso] = d;
    return map;
  }, [weeks]);

  // The block's span, as {y, m} bounds for the month arrows.
  const isos = useMemo(() => Object.keys(byIso).sort(), [byIso]);
  const monthOf = (iso: string) => {
    const [y, m] = iso.split("-").map(Number);
    return { y, m: m - 1 };
  };
  const firstMonth = monthOf(isos[0] ?? "2000-01-01");
  const lastMonth = monthOf(isos[isos.length - 1] ?? "2000-01-01");

  // Open on the month containing today, falling back to the block's start.
  const [view, setView] = useState(() => {
    const todayIso = isos.find((iso) => byIso[iso].today);
    return monthOf(todayIso ?? isos[0] ?? "2000-01-01");
  });

  const goMonth = (delta: number) =>
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const asNum = (v: { y: number; m: number }) => v.y * 12 + v.m;
  const atStart = asNum(view) <= asNum(firstMonth);
  const atEnd = asNum(view) >= asNum(lastMonth);

  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const leadingEmpty = (new Date(view.y, view.m, 1).getDay() + 6) % 7; // Monday-first
  const pad = (n: number) => String(n).padStart(2, "0");

  // Escape closes, same as every other overlay in Varsity Mode.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Portalled to <body> (and re-wrapped in the Varsity theme) so it covers the
  // tab bar instead of being painted underneath it — same trick as <Sheet>.
  return createPortal(
    <ThemeProvider tokens={vTheme.dark} light={vTheme.light}>
      <div className="fixed inset-0 z-[60] flex flex-col bg-background [animation:backdrop-in_0.18s_ease-out]">
        {/* Header: month + arrows + close */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-3 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => goMonth(-1)}
              disabled={atStart}
              aria-label="Previous month"
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
            >
              <IconArrowLeft size={14} />
            </button>
            <button
              onClick={() => goMonth(1)}
              disabled={atEnd}
              aria-label="Next month"
              className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
            >
              <IconArrowRight size={14} />
            </button>
          </div>
          <div className="text-center">
            <div className="text-[8px] font-semibold uppercase tracking-[0.16em] text-accent">
              Training plan
            </div>
            <div className="flex items-baseline justify-center gap-1.5">
              <span className="text-[15px] font-semibold leading-tight text-text">
                {MONTH_NAMES[view.m]}
              </span>
              <span className="text-[11px] font-medium text-muted">{view.y}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close month view"
            className="tap44 press-icon flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-muted"
          >
            <IconX size={15} />
          </button>
        </div>

        {/* Weekday header */}
        <div className="grid flex-shrink-0 grid-cols-7 gap-1 border-b border-border px-1.5 py-1">
          {DAY_LETTERS.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold tracking-[0.12em] text-muted">
              {d}
            </div>
          ))}
        </div>

        {/* Days — the rows share whatever height is left, so the month always
            fills the screen and the cells are big enough to read. */}
        <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1 overflow-y-auto p-1.5">
          {Array.from({ length: leadingEmpty }).map((_, i) => (
            <div key={`e${i}`} />
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((num) => {
            const iso = `${view.y}-${pad(view.m + 1)}-${pad(num)}`;
            const day = byIso[iso];
            const sel = day != null && selected === day;
            return (
              <button
                key={num}
                type="button"
                disabled={!day}
                onClick={() => day && onSelect(day)}
                className={`flex min-h-[64px] flex-col overflow-hidden rounded-lg border p-[3px] text-left ${
                  sel
                    ? "border-primary bg-primary-tint ring-1 ring-primary"
                    : day?.today
                      ? "border-primary bg-primary-tint"
                      : day
                        ? "border-border bg-surface"
                        : "border-transparent"
                }`}
              >
                <span
                  className={`px-px text-[11px] font-semibold leading-none ${
                    day?.today ? "text-primary" : day ? "text-text" : "text-muted/40"
                  }`}
                >
                  {num}
                </span>
                {/* The coach's actual workout text, one tinted block per session. */}
                <span className="mt-0.5 flex flex-1 flex-col gap-px overflow-hidden">
                  {(day?.sessions ?? []).map((s, j) => (
                    <span
                      key={j}
                      className="flex-1 overflow-hidden rounded px-1 py-0.5" style={kindBlock(s.kind)}
                    >
                      <span className="block text-[6px] font-bold leading-none text-text-3">
                        {s.time}
                      </span>
                      <span className="mt-px block break-words text-[8px] font-medium leading-[1.15] text-text">
                        {s.label}
                      </span>
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* What the colors mean */}
        <div className="flex flex-shrink-0 flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-border bg-surface px-3 py-2">
          {kindLegend.map((l) => (
            <span key={l.kind} className="flex items-center gap-1 text-[11px] text-muted">
              <span className="h-1.5 w-3 rounded-sm" style={kindBar(l.kind)} />
              {l.label}
            </span>
          ))}
        </div>

        {/* Tapped day: the full workout, over the calendar. */}
        {selected && (
          <div className="absolute inset-x-0 bottom-0 max-h-[60%] overflow-y-auto border-t border-border bg-background px-3 pb-4 [animation:sheet-up_0.24s_cubic-bezier(0.2,0.8,0.2,1)]">
            <DayDetail d={selected} onClose={onClearDay} />
          </div>
        )}
      </div>
    </ThemeProvider>,
    document.body,
  );
}

// The tapped day's full workout(s): period + time, type, description, note.
function DayDetail({ d, onClose }: { d: WeekDay; onClose: () => void }) {
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border bg-surface-2 px-3 py-2">
        <span className="text-[12px] font-semibold text-text">
          {d.dateLabel ?? `${d.letter} ${d.num}`}
        </span>
        <button onClick={onClose} aria-label="Close" className="text-muted">
          <IconX size={14} />
        </button>
      </div>
      {d.sessions.length > 0 ? (
        <div className="flex flex-col divide-y divide-border">
          {d.sessions.map((s, i) => (
            <div key={i} className="flex items-stretch gap-2.5 px-3 py-2.5">
              <div className="w-[3px] flex-shrink-0 rounded" style={kindBar(s.kind)} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[8px] font-semibold tracking-[0.06em] text-muted">
                    {s.time}
                    {s.clock ? ` · ${s.clock}` : ""}
                  </span>
                  {s.type && <span className="text-[11px] text-muted">{s.type}</span>}
                </div>
                <div className="mt-1 text-[13px] font-medium text-text">{s.label}</div>
                {s.note && (
                  <div className="mt-1.5 flex gap-2 rounded-lg border border-accent-line bg-accent-tint px-2.5 py-1.5">
                    <span className="mt-0.5 flex-shrink-0 text-accent">
                      <IconMessage size={11} />
                    </span>
                    <span className="text-[11px] leading-relaxed text-text-2">{s.note}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-3 py-4 text-center text-[12px] text-muted">Nothing scheduled this day.</div>
      )}
    </div>
  );
}

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
  const [monthOpen, setMonthOpen] = useState(false);
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
        {/* The week always lives on the page; Month opens the whole thing
            full-screen and the X drops you back here. */}
        <button
          onClick={() => setMonthOpen(true)}
          className="press flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[11px] font-medium text-text"
        >
          <IconCalendar size={13} />
          Month
        </button>
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

      {monthOpen && (
        <MonthOverlay
          weeks={weeks}
          selected={selected}
          onSelect={pick}
          onClearDay={onClearDay}
          /* Closing the month KEEPS the day you tapped: you opened the whole
             calendar to find a day, and the page below is now showing it. */
          onClose={() => setMonthOpen(false)}
        />
      )}
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
            <div className="mb-2 text-[8px] font-semibold tracking-[0.12em] text-muted">
              {l.period.toUpperCase()}
            </div>
            <LineupSeats l={l} />
            {l.oars && (
              <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                <IconAnchor size={13} />
                <span className="text-text">{l.oars}</span>
              </div>
            )}
          </div>
        ))}

      {s.verify && (
        <div className="flex items-center gap-3 border-t border-border bg-background/60 px-3 py-2">
          {s.verify.map((v, i) => (
            <div key={i} className="flex items-center gap-1 text-[11px]">
              <span className="text-success">
                <IconCheck size={11} />
              </span>
              <span className="text-muted">{v.label}</span>
              <span className="font-medium text-text">{v.value}</span>
            </div>
          ))}
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
  const [myName, setMyName] = useState<string | null>(null); // for "your seat"

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
      const fullName = await fetchProfileFullName(userId);
      const [plan, lineups, coachNote] = await Promise.all([
        fetchPlan(),
        fetchTodayLineups((p) => sessionKey(today, p), fullName),
        fetchNote(userId),
      ]);
      if (!active) return;
      const firstName = fullName.split(/\s+/)[0] ?? "";
      setMyName(fullName);
      setData(buildAthleteHome(plan, firstName, lineups, today));
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
      const found = await fetchTodayLineups((p) => sessionKey(parseDate(iso), p), myName);
      if (active) setAwayLineups({ iso, lineups: found });
    })();
    return () => {
      active = false;
    };
  }, [onToday, viewDay, myName]);

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
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-screen-sm pb-6">
        {consoleRole && <ConsoleDoor role={consoleRole} />}
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
    : (viewDay?.sessions ?? []).map(daySessionToCard);
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
