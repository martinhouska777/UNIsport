"use client";

/*
  Varsity HOME screen — the athlete's daily anchor.
  Renders the data from lib/varsity/home.ts: greeting, race countdown, the week
  strip, today's prescribed sessions (with coach notes + watch-verify), the
  day's lineup, and the coach's weekly focus. All colors are theme tokens.
*/
import {
  home,
  kindStyles,
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
  IconBulb,
  IconX,
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
function Greeting() {
  const g = home.greeting;
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
function RaceBar() {
  const r = home.race;
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
        <div className="text-2xl font-semibold leading-none text-accent">{r.count}</div>
        <div className="text-[8px] font-semibold uppercase tracking-[0.12em] text-muted">
          {r.unit}
        </div>
      </div>
    </div>
  );
}

/* ─── Week strip ─── */
function WeekStrip() {
  return (
    <div className="px-3 pt-4">
      <div className="flex items-center justify-between px-0.5 pb-2">
        <SectionLabel>This Week</SectionLabel>
        <div className="flex overflow-hidden rounded-lg border border-border bg-surface">
          <span className="bg-primary px-2.5 py-1 text-[9px] font-medium text-primary-contrast">
            Week
          </span>
          <span className="px-2.5 py-1 text-[9px] font-medium text-muted">Month</span>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {home.week.map((d, i) => (
          <div
            key={i}
            className={`overflow-hidden rounded-lg border bg-surface ${
              d.today ? "border-primary shadow-[0_0_10px_rgba(165,28,48,0.25)]" : "border-border"
            } ${d.dimmed ? "opacity-40" : ""}`}
          >
            <div className="bg-black/20 px-0.5 py-1 text-center">
              <span className={`block text-[7px] font-semibold ${d.today ? "text-accent" : "text-muted"}`}>
                {d.letter}
              </span>
              <span className={`block text-[11px] font-medium leading-tight ${d.today ? "text-primary" : "text-text"}`}>
                {d.num}
              </span>
            </div>
            <div className="flex flex-col gap-px p-0.5">
              {d.sessions.map((s, j) => (
                <div key={j} className={`rounded px-1 py-0.5 ${kindStyles[s.kind].block}`}>
                  <span className="block text-[6px] font-semibold leading-none text-text/60">
                    {s.time}
                  </span>
                  <span className="mt-0.5 block text-[7px] font-medium leading-tight text-text/90">
                    {s.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
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

/* ─── Lineup ─── */
function Seat({ num, init, mine }: { num: string; init: string; mine?: boolean }) {
  return (
    <div
      className={`flex h-7 flex-1 flex-col items-center justify-center rounded-md border ${
        mine ? "border-primary bg-primary/15" : "border-border bg-surface-2"
      }`}
    >
      <span className="text-[6px] font-semibold leading-none text-muted">{num}</span>
      <span className={`mt-0.5 text-[8px] font-semibold leading-none ${mine ? "text-primary" : "text-text/80"}`}>
        {init}
      </span>
    </div>
  );
}

function LineupRow({ l }: { l: Lineup }) {
  return (
    <div>
      <div className="mb-1.5 text-[8px] font-semibold tracking-[0.1em] text-muted">{l.period}</div>
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] tracking-wide text-muted">STR</span>
        <div className="flex flex-1 items-center gap-1">
          {l.seats.map((s) => (
            <Seat key={s.num} {...s} />
          ))}
        </div>
        <span className="text-[7px] tracking-wide text-muted">BOW</span>
        <div className="flex h-7 w-6 flex-col items-center justify-center rounded-md border border-accent/40 bg-accent/15">
          <span className="text-[6px] font-semibold leading-none text-accent">C</span>
          <span className="mt-0.5 text-[7px] font-semibold leading-none text-accent">{l.cox.init}</span>
        </div>
      </div>
    </div>
  );
}

function LineupCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <SectionLabel>Your Lineup</SectionLabel>
        <span className="text-[10px] text-muted">Tap seat to see athlete</span>
      </div>
      <div className="flex flex-col gap-3 px-3 py-3">
        {home.lineups.map((l, i) => (
          <div key={i} className="flex flex-col gap-3">
            {i > 0 && <div className="h-px bg-border" />}
            <LineupRow l={l} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Coach focus ─── */
function CoachFocus() {
  const f = home.focus;
  return (
    <div className="relative overflow-hidden rounded-xl border border-accent/25 bg-gradient-to-br from-accent/10 to-surface p-3.5">
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-accent to-transparent" />
      <div className="mb-2 flex items-center gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-md border border-accent/30 bg-accent/15 text-accent">
          <IconBulb size={13} />
        </span>
        <div>
          <div className="text-[8px] font-semibold tracking-[0.1em] text-accent">{f.coach}</div>
          <div className="text-[9px] text-muted">{f.when}</div>
        </div>
      </div>
      <p className="text-[12px] italic leading-relaxed text-text/85">“{f.text}”</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {f.tags.map((t) => (
          <span
            key={t}
            className="rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 text-[8px] font-medium text-accent"
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function HomeScreen() {
  return (
    <div className="mx-auto w-full max-w-screen-sm pb-6">
      <Greeting />
      <RaceBar />
      <WeekStrip />

      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <SectionLabel>Today&apos;s Sessions</SectionLabel>
        <span className="text-[10px] text-muted">Fri · 2 prescribed</span>
      </div>
      <div className="flex flex-col gap-2 px-3">
        {home.today.map((s, i) => (
          <SessionCard key={i} s={s} />
        ))}
      </div>

      <div className="px-3 pt-3">
        <LineupCard />
      </div>

      <div className="px-3 pt-3">
        <CoachFocus />
      </div>
    </div>
  );
}
