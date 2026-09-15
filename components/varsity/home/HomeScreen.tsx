"use client";

/*
  Varsity HOME screen — the athlete's daily anchor.
  Renders the data from lib/varsity/home.ts: greeting, race countdown, the week
  strip, today's prescribed sessions (with coach notes + watch-verify), the
  day's lineup, and the coach's weekly focus. All colors are theme tokens.
*/
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppState } from "@/components/AppState";
import { useMembership } from "@/components/varsity/useMembership";
import { can, canOpenConsole, roleLabel, type VarsityRole } from "@/lib/varsity/membership";
import ThemeProvider from "@/components/ThemeProvider";
import { useVarsityTheme } from "@/components/varsity/useVarsityTheme";
import { fetchPlan } from "@/lib/varsity/planStore";
import { fetchTodayLineups } from "@/lib/varsity/lineupStore";
import { claimRosterSeat, fetchSeatIdentity, type SeatIdentity } from "@/lib/varsity/athleteProfile";
import LineupBoatCard, { isMyBoat } from "@/components/varsity/LineupBoatCard";
import UploadVideoSheet from "@/components/varsity/UploadVideoSheet";
import ClaimSeatSheet from "@/components/varsity/ClaimSeatSheet";
import StillOutCard from "@/components/varsity/home/StillOutCard";
import { driveConfigured, driveFolderLink } from "@/lib/varsity/drive";
import { fetchNote } from "@/lib/varsity/notesStore";
import { sessionKey, parseDate, toISO } from "@/lib/varsity/coachPlan";
import { buildAthleteHome, daySessionToCard, logSpanFor } from "@/lib/varsity/athleteHome";
import { fetchLogsInRange, LOG_DAYS_BACK } from "@/lib/varsity/logStore";
import { SkeletonCards, SkeletonLines } from "@/components/ui/Skeleton";
import SectionLabel from "@/components/ui/SectionLabel";
import {
  kindBar,
  kindWash,
  kindBlock,
  kindLegend,
  type HomeData,
  type Greeting as GreetingData,
  type Race as RaceData,
  type DaySession,
  type WeekDay,
  type WeekView,
  type TodaySession,
  type SessionStatus,
  type Lineup,
} from "@/lib/varsity/home";
import {
  IconFlag,
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
  IconPlus,
  IconPencil,
  IconVideo,
  IconUser,
} from "@/components/icons";

// Three states, all read off the athlete's own log (lib/varsity/athleteHome).
const statusStyle: Record<
  SessionStatus,
  { cls: string; label: string; Icon: (p: { size?: number }) => React.ReactElement } | null
> = {
  /*
    UPCOMING is deliberately blank. Everything on today's screen is upcoming
    until it isn't, so the badge told nobody anything — the owner's words were
    "it's there and it's to nothing". LOGGED and MISSED stay: those are states
    you can act on.
  */
  upcoming: null,
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

/* The greeting — today's date over the athlete's own first name — is gone
   (owner, 2026-09-13). You know your name and your phone knows the date; the
   block and the week-of it carried are worth keeping, so they moved down onto
   the training plan's own heading, where they say what plan you are looking
   at. See WeekStrip. */

/* ─── Race countdown ───
   ONE SMALL LINE under the plan's name (owner, 2026-09-14: "it doesn't need
   to be the whole screen"). It used to be a full-width "Next Race" banner of
   its own at the bottom of the page, with the number set at 24px; now it reads
   "Head of the Charles · 12 days" at 11px, the flag in the school colour. */
function RaceLine({ r }: { r: RaceData }) {
  return (
    <div className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted">
      <span className="flex-shrink-0 text-primary">
        <IconFlag size={11} />
      </span>
      <span className="truncate">
        <span className="font-medium text-text">{r.name}</span>
        {" · "}
        <span className="font-semibold text-accent">{r.big}</span>
        {r.small && ` ${r.small.toLowerCase()}`}
      </span>
    </div>
  );
}

/* ─── Week strip ───
   Two views of the coach's plan. WEEK = the seven days side by side, styled
   after the team's training Excel. MONTH = a full wall calendar, one month at a
   time. Tap any cell/day to see the full workout. */

// WEEK view: the whole week at a glance — 7 day columns, no sideways scrolling.
// Each session is a color-coded block (the colour is the intensity: UT2, hard,
// …) showing the coach's workout text; cells grow so the full text fits.
//
// A SESSION TAKES HALF A DAY (owner, 2026-09-14, second pass). The cell is
// split into a morning half and an afternoon half: a single AM session fills
// the top and leaves the bottom empty, a single PM session sits in the bottom.
// Two sessions take a half each. (For half a day the blocks filled the whole
// cell whatever the time was — so one session looked like a day of training.)
// The "AM"/"PM" text stays gone: WHERE the block sits is what says when.
const halves = (d: WeekDay): [DaySession | undefined, DaySession | undefined] => [
  // Anything not explicitly PM belongs to the morning half — the same rule
  // daySessionToCard uses for a whole-day entry.
  d.sessions.find((s) => s.time !== "PM"),
  d.sessions.find((s) => s.time === "PM"),
];

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
              <div className={`text-[10px] font-semibold uppercase leading-none ${d.today ? "text-accent" : "text-muted"}`}>
                {d.letter}
              </div>
              <div className={`mt-0.5 text-[12px] font-semibold leading-none ${d.today ? "text-primary" : "text-text"}`}>
                {d.num}
              </div>
            </div>
            {/* TALLER, AND EDGE TO EDGE (owner, 2026-09-14). The body has a
                floor of 96px so the strip keeps its presence now that the
                page around it is lighter, and the blocks run to the cell's
                edges — no padding, no rounding — with only a hairline
                between two sessions on the same day. */}
            <div className="flex min-h-[96px] flex-1 flex-col">
              {halves(d).map((s, j) => (
                /*
                  9px ON 2px SIDES, so one word stays one word. At 10px inside
                  4px sides a block had ~31px of text on a 360px phone, and
                  "Weights" (37px) broke into "Weight / s", "8×500m" into
                  "8×500 / m". At 9px they are 33px and 34px, and the
                  narrower sides leave 35px — the whole word on one line.

                  An empty half is an empty box: it holds the other one to half
                  the day instead of letting it grow into the whole. No text
                  colour here — a block brings its own ink with its colour
                  (kindBlock), near-black on every kind but a rest day.
                */
                /*
                  THE WORKOUT'S NAME, THEN THE COACH'S WORDS, IN THE MIDDLE
                  (owner, 2026-09-14): "Flex" / "Erg" / "Weights" on top, the
                  description under it, both centred across and down the block.
                */
                <div
                  key={j}
                  className={`flex flex-1 basis-1/2 flex-col items-center justify-center px-0.5 py-1 text-center ${
                    j === 1 && d.sessions.length > 1 ? "border-t border-border" : ""
                  }`}
                  style={s ? kindBlock(s.kind) : undefined}
                >
                  {s && (
                    <>
                      <span className="block max-w-full break-words text-[9px] font-semibold leading-tight">
                        {s.name}
                      </span>
                      {s.detail && s.detail !== s.name && (
                        <span className="mt-px block max-w-full break-words text-[9px] leading-tight opacity-80">
                          {s.detail}
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}
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
        {/* Header: an arrow at each END with the month between them — the shape
            the student app's own calendar uses, and the owner's call
            (2026-09-14). Both arrows used to sit together on the left, so
            stepping back a month and stepping forward were the same gesture in
            the same corner. The close X keeps the right-hand end. */}
        <div className="flex flex-shrink-0 items-center gap-2 border-b border-border px-3 py-3">
          <button
            onClick={() => goMonth(-1)}
            disabled={atStart}
            aria-label="Previous month"
            className="tap44 press-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
          >
            <IconArrowLeft size={17} />
          </button>
          <div className="min-w-0 flex-1 text-center">
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
            onClick={() => goMonth(1)}
            disabled={atEnd}
            aria-label="Next month"
            className="tap44 press-icon flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
          >
            <IconArrowRight size={17} />
          </button>
          <button
            onClick={onClose}
            aria-label="Close month view"
            className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"
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
                /* Every day of the month is the same box, prescribed or not —
                   a rest day is empty space inside its rectangle, not a gap in
                   the grid. Only the days OUTSIDE the block stay blank. */
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
                {/*
                  The coach's actual workout text, one block per session, in the
                  same two halves as the week strip above: morning on top,
                  afternoon underneath, and the empty half of a one-session day
                  left empty (owner, 2026-09-14).
                */}
                <span className="mt-0.5 flex min-h-0 flex-1 flex-col gap-px overflow-hidden">
                  {(day ? halves(day) : [undefined, undefined]).map((s, j) => (
                    <span
                      key={j}
                      className="flex min-h-0 flex-1 basis-1/2 flex-col items-center justify-center overflow-hidden rounded px-1 py-0.5 text-center"
                      style={s ? kindBlock(s.kind) : undefined}
                    >
                      {s && (
                        <>
                          <span className="block max-w-full break-words text-[8px] font-semibold leading-[1.15]">
                            {s.name}
                          </span>
                          {s.detail && s.detail !== s.name && (
                            <span className="block max-w-full break-words text-[8px] leading-[1.15] opacity-80">
                              {s.detail}
                            </span>
                          )}
                        </>
                      )}
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
  greeting,
  race,
  selected,
  onSelect,
  onClearDay,
}: {
  weeks: WeekView[];
  startIndex: number;
  /** The block's name and "Week 10 of 15" — this section's heading now. */
  greeting: GreetingData;
  /** The next race, one small line under the plan's name (see RaceLine). */
  race: RaceData | null;
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
      <div className="flex items-center justify-between gap-3 px-0.5 pb-2">
        {/* The heading names the PLAN, not the category. "Training Plan" told
            you what the thing under it was, which the calendar already does;
            "SPRING BLOCK · Week 10 of 15" tells you which plan and how far in
            (owner, 2026-09-13 — it used to sit up in the greeting). */}
        <div className="min-w-0">
          <div className="flex min-w-0 items-baseline gap-1.5">
            <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
              {greeting.block}
            </span>
            <span className="flex-shrink-0 text-[11px] text-muted">{greeting.week}</span>
          </div>
          {race && <RaceLine r={race} />}
        </div>
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
        {/* Just the dates. "· this week" was a caption on the week you are
            standing in, which the strip under it already shows by highlighting
            today (owner, 2026-09-13). */}
        <span className="text-[11px] font-medium text-text">{current.label}</span>
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
function SessionCard({
  s,
  lineups = [],
  allBoatsHref,
  allBoatsCount = 0,
}: {
  s: TodaySession;
  lineups?: Lineup[];
  /** Where "All boats" goes when the crew is open — the day's full lineup page. */
  allBoatsHref?: string;
  allBoatsCount?: number;
}) {
  const st = statusStyle[s.status];
  const [open, setOpen] = useState(false);
  const boats = lineups.filter((l) => l.periodKey === s.periodKey);
  const openable = boats.length > 0;

  const card = (
    /*
      THE CARD IS WASHED IN ITS OWN COLOUR. The 3px bar down the left is the
      kind at full strength and the wash carries it across, fading out before
      the right edge (kindWash, lib/varsity/home.ts) — so a card says what it
      is without a word. Nothing else is painted on top of it: no foot bar, no
      second border colour.
    */
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface" style={kindWash(s.kind)}>
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
              <span className="rounded border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-muted">
                {s.period}
              </span>
              <span className="text-[11px] text-muted">{s.location}</span>
            </div>
            {/* Whatever this session's state is, said in the header line. The
                corner itself belongs to the log button (below). */}
            {st && (
              <span className={`mr-9 flex items-center gap-1 text-[10px] font-semibold tracking-[0.06em] ${st.cls}`}>
                <st.Icon size={12} />
                {st.label}
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-text">{s.title}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{s.detail}</div>
              {/* What you logged, on its own line instead of in a bar across
                  the foot of the card. */}
              {s.status === "done" && (
                <div className="mt-0.5 truncate text-[11px] text-text-2">
                  {s.log?.summary || "Logged"}
                </div>
              )}
            </div>

            {/* YOUR BOAT — the pill sits in the bottom-right corner OF THE ROW
                the workout is written on, not on a line of its own underneath
                it. On its own line it made every session that has a boat a
                whole row taller than one that doesn't, so two cards stacked on
                the same morning were different sizes for no reason a rower
                could see. Here it costs no height at all. */}
            {openable && (
              <span className="mt-auto inline-flex flex-shrink-0 items-center gap-1 self-end rounded-full border border-accent-line bg-accent-tint px-2.5 py-1 text-[10px] font-semibold tracking-[0.06em] text-accent">
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
                <div className="text-[10px] font-semibold tracking-[0.12em] text-accent">
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

      {/*
        THE LOG BUTTON, in the top-right corner of the card. It was a bar
        across the foot — a whole rectangle of card carrying one sentence
        ("Log it when you're done") and a button. The sentence is gone and the
        button is a round one up here, so a card is only as tall as the session
        it describes.

        It sits ON the card rather than in the header row so nothing has to
        make room for it, and it is a plus because that is what it does: adds
        today's numbers. Once they are in it becomes a pencil, and opens the
        same editor to change them — EXACTLY this session's
        (/varsity/log?day=…&open=…), not the tab's front page.
      */}
      {(s.status === "done" || loggable(s.iso)) && (
        <Link
          href={`/varsity/log?day=${s.iso}&open=${s.dayKey}`}
          aria-label={s.status === "done" ? `Edit ${s.title}` : `Log ${s.title}`}
          onClick={(e) => e.stopPropagation()}
          className={`tap44 press-icon absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full ${
            s.status === "done"
              ? "border border-primary-line bg-surface text-primary"
              : "bg-primary-live text-primary-contrast"
          }`}
        >
          {s.status === "done" ? <IconPencil size={13} /> : <IconPlus size={15} />}
        </Link>
      )}
    </div>
  );

  if (!openable) return card;

  /*
    THE CREW LIVES UNDER THE SESSION, NOT INSIDE IT.

    It used to be drawn into the bottom of the coloured card, which meant the
    boat was washed in the session's colour — a green crew on a UT2 morning, a
    yellow one that afternoon — and drawn in a cut-down way that existed
    nowhere else: a line of small grey capitals, the hull, then BOAT and OARS
    as two little grey lines. The squad already HAS a boat card, the one the
    Lineups page uses, and it is the polished one: its own title bar with the
    rig and the push-off time, the coach's note to the crew, the hull, BOAT and
    OARS on proper rows, and the crew's video.

    So pressing YOUR BOAT now drops exactly THAT card underneath, in the app's
    normal colours. Same component, one design.
  */
  return (
    <div className="flex flex-col gap-2">
      {card}
      {open && (
        <>
          {boats.map((l, i) => (
            <LineupBoatCard key={i} l={l} defaultOpen />
          ))}
          {/* And the door to everyone else's boat, right where you are already
              looking at your own — the same page the day's header links to. */}
          {allBoatsHref && (
            <Link
              href={allBoatsHref}
              className="tap44 flex items-center justify-center gap-1 rounded-xl border border-border bg-surface py-2.5 text-[12px] font-semibold text-primary active:border-primary-line"
            >
              All boats{allBoatsCount > 0 ? ` · ${allBoatsCount}` : ""}
              <IconChevronRight size={13} />
            </Link>
          )}
        </>
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
  THE DAY HEADER — the one control for the middle of the page. What sits under
  it (the sessions, and the lineup under those) is whatever day this says.

  THE DAY IS IN THE MIDDLE, WITH AN ARROW ON EACH SIDE (owner, 2026-09-14),
  the size they are in the student app's own weekly calendar. "Today" used to
  sit on the left with both arrows crowded into the right-hand corner, so
  going back a day and going forward a day were the same gesture in the same
  place, and the word they were moving was nowhere near them.

  The arrows step a day at a time across the whole published block, so looking
  at Thursday's outing is two taps and no calendar. "Back to today" only exists
  once you have left today, because that is the only time there is somewhere to
  go back to — and on today it would be a button that does nothing. It sits
  under the day, beside All boats, so the two ends of the row stay the arrows.
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
  right?: React.ReactNode;
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
      className="tap44 press-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-muted disabled:opacity-30"
    >
      {dir === -1 ? <IconArrowLeft size={15} /> : <IconArrowRight size={15} />}
    </button>
  );
  return (
    <div className="flex items-center gap-2 px-4 pb-2 pt-4">
      {arrow(-1, canPrev)}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
        <SectionLabel className="truncate">{title}</SectionLabel>
        {(right || onToday) && (
          <div className="flex items-center gap-3">
            {right}
            {onToday && (
              <button
                onClick={onToday}
                className="flex items-center gap-1 text-[11px] font-semibold text-muted"
              >
                <IconX size={11} /> Back to today
              </button>
            )}
          </div>
        )}
      </div>
      {arrow(1, canNext)}
    </div>
  );
}

/* ─── The TECHNICAL NOTE for you (red = work on this · green = all clear) ───
   It is the coach writing, but what he writes is a technical point — catch
   timing, a body angle, where the pressure went. The owner's word, and the
   better one: 'Coach's note' said who sent it, 'Technical note' says what it
   is, and the card it sits on is already unmistakably from the coach. */
function CoachNoteCard({ note }: { note: string }) {
  if (note.trim()) {
    return (
      <div className="overflow-hidden rounded-xl border border-danger-line bg-danger-tint">
        <div className="flex items-center gap-2 border-b border-danger-line px-3.5 py-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[12px] font-black leading-none text-background">
            !
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
            Technical note · work on this
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

function HomeScreenInner() {
  const { userId } = useAppState();
  /*
    ARRIVED FROM A LINEUP PUSH? The notification links to /varsity/home?d=<date>
    (app/api/push/notify), so the page opens on the practice's day rather than
    today's. The link counts once: the first day the athlete picks themselves
    takes over, and the × goes back to today as it always did.
  */
  const linkDay = useSearchParams().get("d");
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
  // Set once the athlete has chosen a day of their own; the link stops
  // deciding from then on. Derived rather than written from an effect, so the
  // page never renders today first and then jumps.
  const [linkConsumed, setLinkConsumed] = useState(false);
  const pickDay = (i: number | null) => {
    setLinkConsumed(true);
    setDayIdx(i);
  };
  // Another day's published boats, remembered with the day they belong to so a
  // slow fetch can never paint Tuesday's eight under Thursday's session.
  const [awayLineups, setAwayLineups] = useState<{ iso: string; lineups: Lineup[] } | null>(null);

  // The upload sheet, which asks which practice and which boat rather than
  // guessing (components/varsity/UploadVideoSheet.tsx).
  const [uploadOpen, setUploadOpen] = useState(false);

  // Where a swipe on the sessions list started. A hook, so it has to live up
  // here with the others — the loading and empty states below return early,
  // and a hook called after them runs on some renders but not others.
  const touch = useRef<{ x: number; y: number } | null>(null);

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
  // The linked day, when the block has it and nothing has been picked since.
  const linkIdx = useMemo(
    () => (linkDay && !linkConsumed ? allDays.findIndex((d) => d.iso === linkDay) : -1),
    [allDays, linkDay, linkConsumed],
  );
  const viewIdx = dayIdx ?? (linkIdx >= 0 ? linkIdx : todayIdx);
  const viewDay: WeekDay | null = allDays[viewIdx] ?? null;
  const onToday = viewIdx === todayIdx;

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
        <StillOutCard userId={userId} />
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

  // Move the day by `delta`, clamped to the block — the same step DayHeader's
  // arrows take, so swiping and tapping an arrow always land on the same day.
  const stepDay = (delta: number) => {
    const next = Math.max(0, Math.min(allDays.length - 1, viewIdx + delta));
    pickDay(next === todayIdx ? null : next);
  };

  /*
    SWIPE the sessions list to move a day — swipe right for the NEXT day (the
    owner's own stated direction, not the "swipe right = back" a calendar
    might default to). Same shape as the profile's own TrainingCalendar swipe:
    only a decisively horizontal drag counts, so scrolling the page past the
    list never moves the day.
  */
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current;
    touch.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    stepDay(dx > 0 ? 1 : -1);
  };

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-6">
      {consoleRole && <ConsoleDoor role={consoleRole} />}
      {claimUi}
      <StillOutCard userId={userId} />
      <DriveBar onUpload={() => setUploadOpen(true)} />
      <WeekStrip
        weeks={data.weeks}
        startIndex={data.weekIndex}
        greeting={data.greeting}
        race={data.race}
        selected={onToday ? null : viewDay}
        onSelect={(d) => {
          const i = allDays.indexOf(d);
          pickDay(i === todayIdx ? null : i);
        }}
        onClearDay={() => pickDay(null)}
      />

      <DayHeader
        /* THE DAY, IN THE WORD YOU'D USE FOR IT. "Today's Sessions" was the
           day plus a word for the cards under it, which are plainly sessions.
           Today is "Today", the day after is "Tomorrow", and past that there
           is no word for it so it is simply the date. */
        title={
          viewIdx === todayIdx
            ? "Today"
            : viewIdx === todayIdx + 1
              ? "Tomorrow"
              : (viewDay?.dateLabel ?? "")
        }
        /* "All boats" used to be the corner of the Your Lineup section. That
           section is gone — your own crew opens inside its session now — so
           the door to everyone else's moved up here, onto the day's own
           control row, where it is about the day the arrows are pointing at.
           It replaces the "3 prescribed" count, which was counting the cards
           directly underneath it. */
        right={
          lineups.length > 0 ? (
            <Link
              href={allBoatsHref}
              className="flex items-center gap-0.5 text-[11px] font-semibold text-primary"
            >
              All boats · {lineups.length} <IconChevronRight size={12} />
            </Link>
          ) : undefined
        }
        canPrev={viewIdx > 0}
        canNext={viewIdx < allDays.length - 1}
        onStep={stepDay}
        onToday={onToday ? undefined : () => pickDay(null)}
      />

      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {sessions.length > 0 ? (
          <div className="flex flex-col gap-2 px-3">
            {sessions.map((sess, i) => (
              <SessionCard
                key={i}
                s={sess}
                lineups={myLineups}
                allBoatsHref={lineups.length > 0 ? allBoatsHref : undefined}
                allBoatsCount={lineups.length}
              />
            ))}
          </div>
        ) : (
          <div className="mx-3 rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-center text-[12px] text-muted">
            {onToday ? "Nothing scheduled for today." : "Nothing scheduled this day."}
          </div>
        )}
      </div>

      {noteCard}

      {uploadOpen && <UploadVideoSheet onClose={() => setUploadOpen(false)} />}
    </div>
  );
}

/*
  The day to open comes out of the URL, which a page has to be allowed to wait
  for — same shape as the Log tab (LogScreen) and the All-boats page.
*/
export default function HomeScreen() {
  return (
    <Suspense
      fallback={
        <div className="px-3 pt-4">
          <SkeletonLines count={2} />
        </div>
      }
    >
      <HomeScreenInner />
    </Suspense>
  );
}
