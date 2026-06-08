"use client";

/*
  Varsity HOME screen — the athlete's daily anchor.
  Renders the data from lib/varsity/home.ts: greeting, race countdown, the week
  strip, today's prescribed sessions (with coach notes + watch-verify), the
  day's lineup, and the coach's weekly focus. All colors are theme tokens.
*/
import { useEffect, useState } from "react";
import { useAppState } from "@/components/AppState";
import { fetchPlan, fetchProfileFullName } from "@/lib/varsity/planStore";
import { fetchTodayLineups } from "@/lib/varsity/lineupStore";
import { fetchNote } from "@/lib/varsity/notesStore";
import { sessionKey } from "@/lib/varsity/coachPlan";
import { buildAthleteHome } from "@/lib/varsity/athleteHome";
import {
  kindStyles,
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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[9px] font-semibold uppercase tracking-[0.16em] text-muted">
      {children}
    </div>
  );
}

/* ─── Greeting ─── */
function Greeting({ g }: { g: GreetingData }) {
  return (
    <div className="flex items-end justify-between px-4 pb-1 pt-3">
      <div>
        <div className="text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
          {g.date}
        </div>
        <div className="text-2xl font-semibold leading-none text-text">{g.name}</div>
      </div>
      <div className="text-right">
        <div className="text-[9px] font-semibold tracking-[0.1em] text-accent">{g.block}</div>
        <div className="text-[11px] text-muted">{g.week}</div>
      </div>
    </div>
  );
}

/* ─── Race countdown ─── */
function RaceBar({ r }: { r: RaceData }) {
  return (
    <div className="mx-3 mt-2 flex items-center gap-3 rounded-xl border border-primary/35 bg-gradient-to-r from-primary/20 to-accent/10 px-3.5 py-2.5">
      <span className="text-primary">
        <IconFlag size={18} />
      </span>
      <div className="flex-1">
        <div className="text-xs font-medium text-text">{r.name}</div>
        <div className="text-[10px] text-muted">{r.location}</div>
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
   Two views of the coach's plan. WEEK = a spreadsheet (AM/PM rows, day columns,
   scroll sideways) styled after the team's training Excel. MONTH = a readable
   full-width agenda, day by day. Tap any cell/day to see the full workout. */

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
            <div className={`px-0.5 py-1 text-center ${d.today ? "bg-primary/15" : "bg-surface-2"}`}>
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
                    <span className="block text-[7px] font-bold leading-none text-text/45">{row}</span>
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

// MONTH view: a readable agenda — each day a full-width row with its workouts.
function MonthAgenda({
  weeks,
  selected,
  onSelect,
}: {
  weeks: WeekView[];
  selected: WeekDay | null;
  onSelect: (d: WeekDay) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {weeks.map((wk, wi) => (
        <div key={wi}>
          <div className="mb-1.5 flex items-center gap-2 px-0.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted">{wk.label}</span>
            {wk.days.some((d) => d.today) && (
              <span className="rounded bg-primary/15 px-1.5 py-px text-[8px] font-semibold text-primary">
                This week
              </span>
            )}
          </div>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {wk.days.map((d, i) => (
              <button
                key={i}
                onClick={() => onSelect(d)}
                className={`flex w-full gap-3 px-3 py-2 text-left ${
                  d.today ? "bg-primary/[0.06]" : selected === d ? "bg-surface-2" : "bg-surface"
                }`}
              >
                <div className="w-10 flex-shrink-0 pt-0.5">
                  <div className={`text-[9px] font-semibold uppercase ${d.today ? "text-accent" : "text-muted"}`}>
                    {d.letter}
                  </div>
                  <div className={`text-[15px] font-semibold leading-none ${d.today ? "text-primary" : "text-text"}`}>
                    {d.num}
                  </div>
                </div>
                <div className="flex flex-1 flex-col justify-center gap-1 py-0.5">
                  {d.sessions.length > 0 ? (
                    d.sessions.map((s, j) => (
                      <div key={j} className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-sm ${kindStyles[s.kind].bar}`} />
                        <span className="w-6 flex-shrink-0 text-[8px] font-bold text-muted">{s.time}</span>
                        <span className="text-[12px] leading-snug text-text">{s.label}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-[11px] italic text-muted/60">Rest day</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
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
                  {s.type && <span className="text-[10px] text-muted">{s.type}</span>}
                </div>
                <div className="mt-1 text-[13px] font-medium text-text">{s.label}</div>
                {s.note && (
                  <div className="mt-1.5 flex gap-2 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-1.5">
                    <span className="mt-0.5 flex-shrink-0 text-accent">
                      <IconMessage size={11} />
                    </span>
                    <span className="text-[11px] leading-relaxed text-text/80">{s.note}</span>
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
  const [mode, setMode] = useState<"week" | "month">("week");
  const [idx, setIdx] = useState(startIndex);
  const [selected, setSelected] = useState<WeekDay | null>(null);

  const last = weeks.length - 1;
  const go = (delta: number) => setIdx((i) => Math.max(0, Math.min(last, i + delta)));
  const pick = (d: WeekDay) => setSelected((cur) => (cur === d ? null : d)); // tap again to close

  const current = weeks[idx];
  const tabBtn = (m: "week" | "month") =>
    `px-2.5 py-1 text-[9px] font-medium ${
      mode === m ? "bg-primary text-primary-contrast" : "text-muted"
    }`;

  return (
    <div className="px-3 pt-4">
      <div className="flex items-center justify-between px-0.5 pb-2">
        <SectionLabel>{mode === "week" ? "Training Plan" : "Block Overview"}</SectionLabel>
        <div className="flex overflow-hidden rounded-lg border border-border bg-surface">
          <button onClick={() => setMode("week")} className={tabBtn("week")}>
            Week
          </button>
          <button onClick={() => setMode("month")} className={tabBtn("month")}>
            Month
          </button>
        </div>
      </div>

      {mode === "week" ? (
        <>
          <div className="mb-2 flex items-center justify-between">
            <button
              onClick={() => go(-1)}
              disabled={idx === 0}
              aria-label="Previous week"
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted disabled:opacity-30"
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
              className="flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface text-muted disabled:opacity-30"
            >
              <IconArrowRight size={13} />
            </button>
          </div>
          <WeekFit week={current} selected={selected} onSelect={pick} />
        </>
      ) : (
        <MonthAgenda weeks={weeks} selected={selected} onSelect={pick} />
      )}

      {selected && <DayDetail d={selected} onClose={() => setSelected(null)} />}
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
              <span className="text-[10px] text-muted">{s.location}</span>
            </div>
            <span className={`flex items-center gap-1 text-[8px] font-semibold tracking-[0.06em] ${st.cls}`}>
              <st.Icon size={12} />
              {st.label}
            </span>
          </div>
          <div className="text-[13px] font-medium text-text">{s.title}</div>
          <div className="mt-0.5 text-[10px] leading-relaxed text-muted">{s.detail}</div>

          {s.coachNote && (
            <div className="mt-2 flex gap-2 rounded-lg border border-accent/30 bg-accent/10 px-2.5 py-2">
              <span className="mt-0.5 flex-shrink-0 text-accent">
                <IconMessage size={12} />
              </span>
              <div>
                <div className="text-[7px] font-semibold tracking-[0.12em] text-accent">
                  {s.coachNote.coach}
                </div>
                <div className="mt-0.5 text-[10px] leading-relaxed text-text/80">
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
            <div key={i} className="flex items-center gap-1 text-[9px]">
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
          ? "border-primary bg-primary/15"
          : cox
            ? "border-accent/40 bg-accent/[0.08]"
            : "border-border bg-surface-2"
      }`}
    >
      <span
        className={`flex h-6 w-14 flex-shrink-0 items-center justify-center rounded text-[9px] font-bold uppercase tracking-[0.06em] ${
          cox ? "bg-accent/15 text-accent" : mine ? "bg-primary/20 text-primary" : "bg-background text-muted"
        }`}
      >
        {label}
      </span>
      <span
        className={`flex-1 truncate text-[13px] font-medium ${
          mine ? "text-primary" : open ? "italic text-muted/60" : "text-text"
        }`}
      >
        {open ? "Open seat" : name}
      </span>
      {mine && (
        <span className="flex-shrink-0 rounded bg-primary px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] text-primary-contrast">
          You
        </span>
      )}
    </div>
  );
}

function LineupBoat({ l }: { l: Lineup }) {
  // Builder stores seats bow→stroke; show cox + stroke at the top, bow at the bottom.
  const rowing = [...l.seats].reverse();
  const lastIdx = rowing.length - 1;
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-3 py-2.5 text-[12px] font-semibold text-text">
        {l.period}
      </div>
      <div className="flex flex-col gap-1.5 p-3">
        {l.cox && <SeatRow label="Cox" name={l.cox.name} mine={l.cox.mine} cox />}
        {rowing.map((s, i) => (
          <SeatRow
            key={s.num}
            label={s.num === "S" ? "Stroke" : i === lastIdx ? "Bow" : s.num}
            name={s.name}
            mine={s.mine}
          />
        ))}
      </div>
    </div>
  );
}

function LineupCard({ lineups }: { lineups: Lineup[] }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1">
        <SectionLabel>Your Lineup</SectionLabel>
        <span className="text-[10px] text-muted">Stroke at top · bow at bottom</span>
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
      <div className="overflow-hidden rounded-xl border border-danger/40 bg-danger/[0.07]">
        <div className="flex items-center gap-2 border-b border-danger/25 px-3.5 py-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[12px] font-black leading-none text-background">
            !
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-danger">
            Coach&apos;s note · work on this
          </span>
        </div>
        <p className="px-3.5 py-3 text-[13px] leading-relaxed text-text/90">{note}</p>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-success/40 bg-success/[0.07] px-3.5 py-3">
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
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
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

export default function HomeScreen() {
  const { userId } = useAppState();
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
        <div className="px-4 pt-20 text-center text-[13px] text-muted">Loading…</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto w-full max-w-screen-sm pb-6">
        <EmptyHome />
        {noteCard}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm pb-6">
      <Greeting g={data.greeting} />
      <WeekStrip weeks={data.weeks} startIndex={data.weekIndex} />

      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <SectionLabel>Today&apos;s Sessions</SectionLabel>
        <span className="text-[10px] text-muted">
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
