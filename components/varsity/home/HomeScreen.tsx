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
import { fetchNote } from "@/lib/varsity/notesStore";
import { sessionKey } from "@/lib/varsity/coachPlan";
import { buildAthleteHome } from "@/lib/varsity/athleteHome";
import { SkeletonCards, SkeletonLines } from "@/components/ui/Skeleton";
import SectionLabel from "@/components/ui/SectionLabel";
import {
  kindStyles,
  type SessionKind,
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
  IconClipboard,
  IconAnchor,
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
                  <div key={row} className={`flex-1 rounded px-1 py-1 ${kindStyles[s.kind].block}`}>
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
const LEGEND: { kind: SessionKind; label: string }[] = [
  { kind: "ut2", label: "UT2" },
  { kind: "hard", label: "Hard" },
  { kind: "weights", label: "Weights" },
  { kind: "recovery", label: "Recovery" },
  { kind: "race", label: "Race" },
  { kind: "off", label: "Off" },
];

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
                      className={`flex-1 overflow-hidden rounded px-1 py-0.5 ${kindStyles[s.kind].block}`}
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
          {LEGEND.map((l) => (
            <span key={l.kind} className="flex items-center gap-1 text-[11px] text-muted">
              <span className={`h-1.5 w-3 rounded-sm ${kindStyles[l.kind].bar}`} />
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
              <div className={`w-[3px] flex-shrink-0 rounded ${kindStyles[s.kind].bar}`} />
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

function WeekStrip({ weeks, startIndex }: { weeks: WeekView[]; startIndex: number }) {
  const [monthOpen, setMonthOpen] = useState(false);
  const [idx, setIdx] = useState(startIndex);
  const [selected, setSelected] = useState<WeekDay | null>(null);

  const last = weeks.length - 1;
  const go = (delta: number) => setIdx((i) => Math.max(0, Math.min(last, i + delta)));
  const pick = (d: WeekDay) => setSelected((cur) => (cur === d ? null : d)); // tap again to close

  const current = weeks[idx];

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
          disabled={idx === 0}
          aria-label="Previous week"
          className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted disabled:opacity-30"
        >
          <IconArrowLeft size={13} />
        </button>
        <span className="text-[11px] font-medium text-text">
          {current.label}
          {idx === startIndex && <span className="text-muted"> · this week</span>}
        </span>
        <button
          onClick={() => go(1)}
          disabled={idx === last}
          aria-label="Next week"
          className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted disabled:opacity-30"
        >
          <IconArrowRight size={13} />
        </button>
      </div>

      <WeekFit week={current} selected={selected} onSelect={pick} />

      {selected && !monthOpen && <DayDetail d={selected} onClose={() => setSelected(null)} />}

      {monthOpen && (
        <MonthOverlay
          weeks={weeks}
          selected={selected}
          onSelect={pick}
          onClearDay={() => setSelected(null)}
          onClose={() => {
            setMonthOpen(false);
            setSelected(null); // collapse back to a clean week strip
          }}
        />
      )}
    </div>
  );
}

/* ─── Today's sessions ─── */
function SessionCard({ s }: { s: TodaySession }) {
  const st = statusStyle[s.status];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex">
        <div className={`w-[3px] flex-shrink-0 ${kindStyles[s.kind].bar}`} />
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
          <div className="text-[13px] font-medium text-text">{s.title}</div>
          <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{s.detail}</div>

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

/* ─── Lineup (vertical · full names · your seat highlighted) ─── */
function SeatRow({
  label,
  name,
  mine,
  cox,
}: {
  label: string;
  name: string;
  mine?: boolean;
  cox?: boolean;
}) {
  const open = name === "—" || name === "";
  return (
    <div
      className={`flex items-center gap-2.5 rounded-lg border px-2.5 py-2 ${
        mine
          ? "border-primary bg-primary-tint"
          : cox
            ? "border-accent-line bg-accent-tint"
            : "border-border bg-surface-2"
      }`}
    >
      <span
        className={`flex h-6 w-14 flex-shrink-0 items-center justify-center rounded text-[11px] font-semibold uppercase tracking-[0.12em] ${
          cox ? "bg-accent-tint text-accent" : mine ? "bg-primary-tint text-primary" : "bg-background text-muted"
        }`}
      >
        {label}
      </span>
      <span
        className={`flex-1 truncate text-[13px] font-medium ${
          mine ? "text-primary" : open ? "italic text-text-3" : "text-text"
        }`}
      >
        {open ? "Open seat" : name}
      </span>
      {mine && (
        <span className="flex-shrink-0 rounded bg-text px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-background">
          You
        </span>
      )}
    </div>
  );
}

function LineupBoat({ l }: { l: Lineup }) {
  // Builder stores seats bow→stroke; show cox + stroke at the top, bow at the bottom.
  // The numbers are the coach's own — 8 down to 1 — so they read the same here
  // as they do in the boat the coach built. Cox gets the word: there is room.
  const rowing = [...l.seats].reverse();
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5 text-[12px] font-semibold text-text">
        {l.period}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {l.cox && <SeatRow label="Cox" name={l.cox.name} mine={l.cox.mine} cox />}
        {rowing.map((s) => (
          <SeatRow key={s.num} label={s.num} name={s.name} mine={s.mine} />
        ))}
      </div>
      {/* Which oars to take off the rack, when the coach named a set. */}
      {l.oars && (
        <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-muted">
          <IconAnchor size={13} />
          <span className="text-text">{l.oars}</span>
        </div>
      )}
    </div>
  );
}

function LineupCard({ lineups }: { lineups: Lineup[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <SectionLabel>Your Lineup</SectionLabel>
        <span className="text-[11px] text-muted">Stroke at top · bow at bottom</span>
      </div>
      <div className="flex flex-col gap-3">
        {lineups.map((l, i) => (
          <LineupBoat key={i} l={l} />
        ))}
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
      setData(buildAthleteHome(plan, firstName, lineups, today));
      setNote(coachNote);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

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

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-6">
      {consoleRole && <ConsoleDoor role={consoleRole} />}
      <Greeting g={data.greeting} />
      <WeekStrip weeks={data.weeks} startIndex={data.weekIndex} />

      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <SectionLabel>Today&apos;s Sessions</SectionLabel>
        <span className="text-[11px] text-muted">
          {data.today.length} prescribed
        </span>
      </div>
      {data.today.length > 0 ? (
        <div className="flex flex-col gap-2 px-3">
          {data.today.map((s, i) => (
            <SessionCard key={i} s={s} />
          ))}
        </div>
      ) : (
        <div className="mx-3 rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-center text-[12px] text-muted">
          Nothing scheduled for today.
        </div>
      )}

      {data.lineups.length > 0 && (
        <div className="px-3 pt-3">
          <LineupCard lineups={data.lineups} />
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
    </div>
  );
}
