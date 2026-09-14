"use client";

/*
  Varsity TEAM tab — the squad.
  ---------------------------------------------------------------------------
  A top sub-navigation switches between:
    • Roster   — the whole squad (grouped like the lineup pool), searchable; tap
                 a rower to open their profile (team year, height/weight, status,
                 their training calendar if they share it, erg PRs).
    • Workouts — every session the coach flagged as a TEAM WORKOUT, with the
                 board of everyone's results (components/varsity/team/…).

  Roster comes from lib/varsity/coachLineup; each athlete's profile detail from
  lib/varsity/teamProfiles (stable demo data until accounts link to the squad).
  All colors are theme tokens; the rowing-side dot is a CONTENT color from data
  applied via inline style (the rule-1 exception the lineup screens use).
*/
import { useMemo, useState } from "react";
import Link from "next/link";
import Sheet from "@/components/varsity/Sheet";
import TeamWorkouts from "@/components/varsity/team/TeamWorkouts";
import { useUnits } from "@/components/useUnits";
import { formatWeight } from "@/lib/varsity/units";
import { roster, rosterById, sideMeta, COX_COLOR, COX_INK, type Athlete } from "@/lib/varsity/coachLineup";
import { teamProfile } from "@/lib/varsity/teamProfiles";
import { teamTrainingMonth, formatDuration, type CatTotal } from "@/lib/varsity/teamTraining";
import { formatMetrics } from "@/lib/varsity/logParse";
import {
  statusOptions,
  prPieces,
  logCategoryColor,
  logCategoryLabel,
  legendCategories,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import {
  IconSearch,
  IconChevronRight,
  IconChevronDown,
  IconUser,
  IconActivity,
  IconEyeOff,
} from "@/components/icons";

// The status pill — the same one the athlete sees on their own profile.
const toneRing: Record<StatusTone, string> = {
  success: "border-success-line bg-success-tint text-success",
  warn: "border-warn-line bg-warn-tint text-warn",
  danger: "border-danger-line bg-danger-tint text-danger",
  muted: "border-border bg-surface-2 text-muted",
};
/*
  The side dot. It carries a hairline of its own ink so the dot keeps a crisp
  edge on both the light and the dark varsity theme, whatever colour it is.
*/
const sideDot = (a: Athlete): React.CSSProperties => {
  const color = a.cox ? COX_COLOR : sideMeta[a.side].color;
  const ink = a.cox ? COX_INK : sideMeta[a.side].ink;
  return { background: color, border: `1px solid color-mix(in oklab, ${ink} 30%, transparent)` };
};
const sideLabel = (a: Athlete) => (a.cox ? "Cox" : sideMeta[a.side].label);

/* ─────────────────────────  athlete profile sheet  ───────────────────────── */
/*
  A TEAMMATE'S CARD — who they are, how they row, their status, their training
  month and their erg PRs.

  THE CALENDAR IS THEIR CHOICE (owner, 2026-09-13). On 2026-09-11 the month was
  taken off this card, because it was the athlete's own log handed to forty
  peers with no say. The owner wants it back — so the squad can see how the
  people who train best actually train — and the missing piece was the say:
  every athlete now has a "Teammates see my calendar" switch on their own
  profile (VarsityAthleteProfile.showCalendar). Off, and this card says so in
  one line instead of drawing the month. The coach sees it either way.

  Until accounts are linked to roster seats the month is demo data
  (lib/varsity/teamTraining), as is who has the switch off (teamProfiles).
*/
const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

function CatBreakdown({ rows, empty }: { rows: CatTotal[]; empty: string }) {
  if (rows.length === 0) {
    return <div className="px-3.5 py-3 text-[11px] text-muted">{empty}</div>;
  }
  return (
    <div className="flex flex-col divide-y divide-border">
      {rows.map((row) => (
        <div key={row.cat} className="flex items-center gap-2.5 px-3.5 py-2">
          <span
            className="h-2.5 w-2.5 flex-shrink-0 rounded-full"
            style={{ background: logCategoryColor[row.cat] ?? "var(--muted)" }}
          />
          <span className="flex-1 text-[12px] font-medium text-text">
            {logCategoryLabel[row.cat] ?? row.cat}
          </span>
          <span className="text-[11px] text-muted">{row.sessions}×</span>
          <span className="w-16 text-right text-[12px] font-semibold text-text">
            {formatDuration(row.minutes)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* Their month: switcher, three numbers, the calendar, the day you tap, a key. */
function TeammateCalendar({ athleteId }: { athleteId: string }) {
  const now = useMemo(() => new Date(), []);
  const [view, setView] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selDay, setSelDay] = useState<number | null>(null);
  const [openBreak, setOpenBreak] = useState<"trained" | "extra" | null>(null);

  const month = teamTrainingMonth(athleteId, view.y, view.m);
  const atCurrent = view.y === now.getFullYear() && view.m === now.getMonth();
  const goMonth = (delta: number) => {
    setView((v) => {
      const d = new Date(v.y, v.m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
    setSelDay(null);
  };
  const selected = selDay != null ? month.days.find((d) => d.day === selDay) ?? null : null;

  const dotsFor = (sessions: { cat: string }[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const x of sessions) {
      if (!seen.has(x.cat) && out.length < 3) {
        seen.add(x.cat);
        out.push(x.cat);
      }
    }
    return out;
  };

  const tileCls = (active: boolean) =>
    `rounded-2xl border px-2 py-3 text-center ${
      active ? "border-primary bg-primary-tint" : "border-border bg-surface-2"
    }`;

  return (
    <>
      {/* month switcher — the numbers and the calendar follow it */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Training</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => goMonth(-1)}
            className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted"
          >
            <IconChevronDown size={13} className="rotate-90" />
          </button>
          <span className="min-w-[5.5rem] text-center text-[12px] font-semibold text-text">
            {month.monthLabel} {month.y}
          </span>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => goMonth(1)}
            disabled={atCurrent}
            className="tap44 press-icon flex h-6 w-6 items-center justify-center rounded-md border border-border bg-surface-2 text-muted disabled:opacity-30"
          >
            <IconChevronDown size={13} className="-rotate-90" />
          </button>
        </div>
      </div>

      {/* the month in three numbers — Trained and Extra open a breakdown */}
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <div className={tileCls(false)}>
          <div className="text-lg font-semibold leading-none text-text">{month.consistency}%</div>
          <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">
            Consistency
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpenBreak((o) => (o === "trained" ? null : "trained"))}
          className={tileCls(openBreak === "trained")}
        >
          <div className="text-lg font-semibold leading-none text-text">{formatDuration(month.minutes)}</div>
          <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Trained</div>
        </button>
        <button
          type="button"
          onClick={() => setOpenBreak((o) => (o === "extra" ? null : "extra"))}
          className={tileCls(openBreak === "extra")}
        >
          <div className="text-lg font-semibold leading-none text-text">{month.extraCount}</div>
          <div className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-muted">Extra</div>
        </button>
      </div>

      {openBreak && (
        <div className="mt-1.5 overflow-hidden rounded-2xl border border-border bg-surface-2">
          <div className="border-b border-border px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            {openBreak === "trained" ? "By activity" : "Extra by activity"}
          </div>
          <CatBreakdown
            rows={openBreak === "trained" ? month.byCategory : month.extraByCategory}
            empty={openBreak === "trained" ? "Nothing logged this month." : "No extra sessions this month."}
          />
        </div>
      )}

      {/* the calendar */}
      <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="grid grid-cols-7 border-b border-border px-2 pb-1 pt-2">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className="py-0.5 text-center text-[9px] font-semibold tracking-[0.12em] text-muted">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-[3px] px-2 pb-2.5 pt-1.5">
          {Array.from({ length: month.leadingEmpty }).map((_, i) => (
            <div key={`e${i}`} className="aspect-square" />
          ))}
          {month.days.map((d) => {
            const dots = dotsFor(d.sessions);
            const isSel = selDay === d.day;
            const isToday = d.day === month.todayDay;
            return (
              <button
                key={d.day}
                type="button"
                onClick={() => setSelDay(d.day)}
                className={`flex aspect-square flex-col items-center justify-center rounded-[9px] pt-0.5 ${
                  isSel
                    ? "border border-primary bg-primary-tint"
                    : isToday
                      ? "border border-primary-line bg-primary-tint"
                      : dots.length
                        ? "active:bg-surface"
                        : ""
                }`}
              >
                <span
                  className={`text-[11px] font-medium leading-none ${
                    isSel || isToday ? "text-primary" : d.future ? "text-text-3" : "text-text"
                  }`}
                >
                  {d.day}
                </span>
                <span className="mt-[3px] flex h-1 items-center gap-0.5">
                  {dots.map((c, i) => (
                    <span
                      key={i}
                      className="h-1 w-1 rounded-full"
                      style={{ background: logCategoryColor[c] ?? "var(--muted)" }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        {/* the day you tapped — what they did, with minutes · metres · split */}
        <div className="border-t border-border px-3.5 py-2.5">
          {selected == null ? (
            <div className="text-[11px] text-muted">Tap a day to see what they did.</div>
          ) : selected.sessions.length === 0 ? (
            <div className="text-[11px] text-muted">
              {month.monthLabel} {selected.day} · {selected.future ? "Upcoming" : "Rest day"}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {selected.sessions.map((x, i) => {
                const metrics = formatMetrics(x.minutes, x.metres, x.split);
                return (
                  <div key={i} className="flex items-start gap-2">
                    <span
                      className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full"
                      style={{ background: logCategoryColor[x.cat] ?? "var(--muted)" }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-text">
                          {logCategoryLabel[x.cat] ?? x.cat}
                        </span>
                        {x.extra && (
                          <span className="rounded border border-border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted">
                            Extra
                          </span>
                        )}
                      </div>
                      {metrics && <div className="mt-0.5 text-[11px] text-text-2">{metrics}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* key */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border px-3.5 py-2.5">
          {legendCategories.map((c) => (
            <div key={c} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: logCategoryColor[c] ?? "var(--muted)" }} />
              {logCategoryLabel[c]}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function AthleteSheet({ athleteId, onClose }: { athleteId: string; onClose: () => void }) {
  const a = rosterById[athleteId];
  const p = teamProfile(athleteId);
  const { units } = useUnits();
  const classLine = [p.classYear, p.teamYear].filter(Boolean).join(" · ");
  const status = statusOptions.find((s) => s.title === p.status);

  return (
    <Sheet title="Athlete" onClose={onClose}>
      <div className="flex items-start gap-3.5">
        {/* The same rule as the roster row: a person, not a monogram. */}
        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-primary-line bg-gradient-to-br from-primary/15 to-primary/5 text-primary">
          <IconUser size={30} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-lg font-semibold leading-tight text-text">{a?.name ?? "Unknown"}</div>
          {classLine && <div className="mt-1 text-[11px] text-muted">{classLine}</div>}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-text">
              <span className="h-2 w-2 rounded-full" style={sideDot(a)} />
              {sideLabel(a)}
            </span>
            <span className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-text">
              {p.heightCm} cm
            </span>
            <span className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] text-text">
              {formatWeight(p.weightKg, units.weight)}
            </span>
          </div>
        </div>
        {/* Status — top right, one word in a pill, exactly as on your own
            profile (owner, 2026-09-13). The grey card that sat under the
            header, and its "Available for training and selection" line, went. */}
        {status && (
          <span
            className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${toneRing[status.tone]}`}
          >
            <IconActivity size={13} />
            <span className="text-[11px] font-medium">{status.title}</span>
          </span>
        )}
      </div>

      {p.showCalendar ? (
        <TeammateCalendar athleteId={athleteId} />
      ) : (
        <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-border bg-surface-2 px-3.5 py-3 text-[12px] text-muted">
          <IconEyeOff size={15} />
          {(a?.name ?? "").split(" ")[0] || "They"} keeps their calendar private.
        </div>
      )}

      {/* erg PRs — not for a coxswain: nobody compares a cox's 2k, and a card
          that printed one would be asking to be. */}
      {!a?.cox && (
        <>
          <div className="mb-2 mt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Personal Bests
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {prPieces.map((piece) => (
              <div
                key={piece}
                className="flex items-baseline justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{piece}</span>
                <span className="text-[14px] font-semibold text-text">{p.prs[piece] ?? "—"}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

/* ─────────────────────────  roster row  ───────────────────────── */
/*
  The row is a button that opens the squad profile sheet — unless a `href` is
  given, which is the coach's version: it goes to that rower's full training
  screen instead. Same row either way; only where it leads changes.
*/
/* data-tour: the Coach Console tour lights the first row to explain that
   opening a rower shows what they have actually trained. Harmless in the
   athletes' own Team tab, where no tour looks for it. */
function RosterRow({
  a,
  onOpen,
  href,
  tour,
}: {
  a: Athlete;
  onOpen: () => void;
  href?: string;
  tour?: string;
}) {
  const cls =
    "relative flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left active:bg-surface-2";
  const inner = (
    <>
      {/*
        A PERSON, NOT TWO LETTERS. The owner does not want initials on a roster:
        a person is their photo, and somebody we have no photo of is a
        person-shaped glyph rather than a monogram. Nobody on the squad has one
        yet — these are demo profiles and real accounts are not linked to roster
        seats — so today this is always the glyph, and it is where the photo goes
        the day they are.

        (The status dot that used to sit in the top-right corner of the row went
        with it, also the owner's call. The status itself is still on the
        athlete's own screen, said in words.)
      */}
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary-tint text-primary">
        <IconUser size={18} />
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-text">{a.name}</span>
      <span className="flex items-center gap-1 text-[11px] text-muted">
        <span className="h-2 w-2 rounded-full" style={sideDot(a)} />
        {sideLabel(a)}
      </span>
      <span className="text-muted">
        <IconChevronRight size={15} />
      </span>
    </>
  );
  return href ? (
    <Link href={href} data-tour={tour} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onOpen} data-tour={tour} className={cls}>
      {inner}
    </button>
  );
}

/* ─────────────────────────  screen  ───────────────────────── */
type Tab = "roster" | "workouts";

/*
  ONE screen, shown to athletes and to coaches alike — the Coach Console's Team
  tab renders this exact component. The only difference a coach gets is
  `athleteHref`: for a rower who is also a real account on this squad it returns
  the link to their full training screen, which is a permission an athlete does
  not have. Everything else — roster, workouts, the erg boards, the water
  telemetry — is identical, on purpose: a coach and a rower should be looking
  at the same numbers.
*/
export default function TeamScreen({
  athleteHref,
  only,
  topAction,
}: {
  athleteHref?: (a: Athlete) => string | null;
  /* The Coach Console shows the two halves as two bottom tabs (Team = roster,
     Workouts = the boards), so it asks for one half and gets no switch. */
  only?: Tab;
  /* Something to put above the roster — the coach's "Write a technical note". */
  topAction?: React.ReactNode;
} = {}) {
  const [picked, setTab] = useState<Tab>("roster");
  const tab = only ?? picked;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  /*
    THE WHOLE SQUAD, in two groups: rowers, then coxswains, each in name order.
    Coxswains used to be filtered out of this list altogether — on a roster for
    an app whose setup screen asks "Rower or Coxswain", a cox who joined could
    never find themselves. They are listed apart, as a boathouse lists them,
    not left off.
  */
  const byName = (a: Athlete, b: Athlete) => a.name.localeCompare(b.name);
  const rowers = useMemo(() => roster.filter((a) => !a.cox).sort(byName), []);
  const coxes = useMemo(() => roster.filter((a) => a.cox).sort(byName), []);

  const q = query.trim().toLowerCase();
  const matches = (a: Athlete) => !q || a.name.toLowerCase().includes(q);
  const shownRowers = rowers.filter(matches);
  const shownCoxes = coxes.filter(matches);
  const shownCount = shownRowers.length + shownCoxes.length;

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      {/* No "Team" title — the tab bar already says it; the Roster / Workouts
          switch is the top of the screen. */}
      <h1 className="sr-only">{only === "workouts" ? "Workouts" : "Team"}</h1>

      {/* sub-navigation */}
      {!only && (
        <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
          {(["roster", "workouts"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-[12px] font-semibold capitalize transition-colors ${
                tab === t ? "bg-text text-background" : "text-muted"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {tab === "roster" ? (
        <>
          {topAction && <div className={only ? "mb-3" : "mt-3"}>{topAction}</div>}
          {/* search */}
          <div className={`${only ? "" : "mt-3 "}flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5`}>
            <span className="text-muted">
              <IconSearch size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent text-base text-text outline-none placeholder:text-muted"
            />
          </div>

          <div className="mt-3 flex flex-col gap-1.5">
            {shownRowers.map((a, i) => (
              <RosterRow
                key={a.id}
                a={a}
                tour={i === 0 ? "coach-team-first-rower" : undefined}
                onOpen={() => setOpen(a.id)}
                href={athleteHref?.(a) ?? undefined}
              />
            ))}
            {/* Coxswains, under their own heading — only when there are any to show. */}
            {shownCoxes.length > 0 && (
              <div className={`px-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted ${shownRowers.length > 0 ? "mt-3 mb-0.5" : "mb-0.5"}`}>
                Coxswains
              </div>
            )}
            {shownCoxes.map((a) => (
              <RosterRow
                key={a.id}
                a={a}
                onOpen={() => setOpen(a.id)}
                href={athleteHref?.(a) ?? undefined}
              />
            ))}
            {shownCount === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] text-muted">
                No one matches “{query}”.
              </div>
            )}
          </div>
        </>
      ) : (
        <TeamWorkouts />
      )}

      {open && <AthleteSheet athleteId={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
