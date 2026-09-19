"use client";

/*
  COACH → ONE ATHLETE. Everything the squad's coach may see about one rower's
  training, on one screen, read-only.

  Three blocks, in the order a coach asks the questions:
    1. WHO — side, status, class year, height, weight, erg PRs. From the narrow
       `varsity_athlete_card` RPC, not from their profile row.
    2. WHEN — a month calendar of what they actually did, with the same category
       colours the athlete sees on their own Calendar tab. Tap a day for the
       sessions. This is the part that needed a new database permission
       (db/varsity_coach_reads.sql); everything else was already readable.
    3. HOW FAST — every erg result they have posted to the team board.

  READ ONLY, deliberately and at the database level: there is no policy that
  would let a coach edit or delete a session. The log stays the athlete's own
  record of their own training; the coach gets to look.

  Crew telemetry (Peach / SpeedCoach) is NOT here, because an outing belongs to
  a BOAT rather than to a person — that lives in Team → Workouts. What a rower
  did on the water as an individual is in the calendar, like everything else.

  WHEN THERE IS NOTHING YET, each of the bottom two blocks falls back on its own
  to a worked example (lib/varsity/demoAthlete.ts), labelled as one, so the
  screen can be reviewed before a squad has trained a single day. Real data
  always wins — see the header of that file.

  Colours are theme tokens (rule 1); the category dots and the side blade are
  CONTENT colours from data, applied inline (the rule-1 exception).
*/
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useUnits } from "@/components/useUnits";
import { formatDistance } from "@/lib/varsity/units";
import { fetchLogsInRange, type LogEntry } from "@/lib/varsity/logStore";
import { fetchAthleteCard, type AthleteCard } from "@/lib/varsity/coachAthlete";
import { fetchAthleteResults, type TeamResult } from "@/lib/varsity/resultsStore";
import { rosterIdForName, demoAthleteLogs, demoAthleteResults } from "@/lib/varsity/demoAthlete";
import { secToSplit, deriveWatts } from "@/lib/varsity/ergMath";
import { dayKeyLabel, toISO } from "@/lib/varsity/coachPlan";
import { sideMeta } from "@/lib/varsity/coachLineup";
import {
  prPieces,
  statusOptions,
  type StatusTone,
} from "@/lib/varsity/athleteProfile";
import { IconActivity, IconArrowLeft, IconCalendar, IconClipboard } from "@/components/icons";
import AthleteNote from "@/components/varsity/coach/athlete/AthleteNote";
import AthleteStats from "@/components/varsity/coach/athlete/AthleteStats";
import AthleteWorkouts from "@/components/varsity/coach/athlete/AthleteWorkouts";
import AthleteWindow from "@/components/varsity/coach/athlete/AthleteWindow";
import CalendarScreen from "@/components/varsity/calendar/CalendarScreen";


const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  warn: "bg-warn",
  danger: "bg-danger",
  muted: "bg-muted",
};
const toneOf = (title: string): StatusTone =>
  statusOptions.find((s) => s.title === title)?.tone ?? "muted";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {children}
    </div>
  );
}

/* Says, without room for doubt, that what is below is made up. */
function ExampleTag() {
  return (
    <span className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-warn">
      Example
    </span>
  );
}


export default function AthleteDataScreen({ athleteId }: { athleteId: string }) {
  const { units } = useUnits();
  const now = useMemo(() => new Date(), []);

  const [card, setCard] = useState<AthleteCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<TeamResult[]>([]);
  /* THIS MONTH, and only this month. The page no longer draws a calendar — it
     reads one month of logs for a single purpose: to know whether this rower
     has ever logged anything, and so whether the three screens should fall
     back to the worked example. */
  const view = useMemo(() => ({ y: now.getFullYear(), m: now.getMonth() }), [now]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  // Which of the two bottom blocks is showing the worked example rather than
  // the athlete's own rows. They fall back separately — a rower can have ergs
  // posted and an empty month, or the other way round.
  /* STATISTICS or CALENDAR (owner, 2026-09-19, then "above calendar put
     statistics"). Who they are stays above the switch — their side, their
     status, the coach's note and their bests are true whichever question is
     being asked; what CHANGES is whether you want the sum of their training or
     the days that made it. The page OPENS ON THE STATISTICS: a coach coming to
     a rower's page is asking how much they have trained, and the calendar is
     where you go when the answer needs explaining. */
  const [openScreen, setOpenScreen] = useState<"stats" | "workouts" | "calendar" | null>(null);
  const [exampleLogs, setExampleLogs] = useState(false);
  const [exampleResults, setExampleResults] = useState(false);

  /*
    The roster athlete this account is, if it is one of them — the example is
    built from their id, so a heavy rower's example is a heavy rower's numbers.
    Null for anyone not on the (still mock) roster: they get "nothing yet".
  */
  const demoId = useMemo(() => rosterIdForName(card?.name), [card]);

  // Who they are + every erg they have posted. Both are athlete-wide, so once.
  useEffect(() => {
    let active = true;
    (async () => {
      const [c, r] = await Promise.all([
        fetchAthleteCard(athleteId),
        fetchAthleteResults(athleteId),
      ]);
      if (!active) return;
      setCard(c);
      const stand = rosterIdForName(c?.name);
      const example = r.length === 0 && !!stand;
      setResults(example ? demoAthleteResults(stand!) : r);
      setExampleResults(example);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [athleteId]);

  // Their calendar, one month at a time.
  useEffect(() => {
    if (loading) return;
    let active = true;
    (async () => {
      const from = toISO(new Date(view.y, view.m, 1));
      const to = toISO(new Date(view.y, view.m + 1, 0));
      const rows = await fetchLogsInRange(athleteId, from, to);
      if (!active) return;
      const example = rows.length === 0 && !!demoId;
      setLogs(example ? demoAthleteLogs(demoId!, view.y, view.m) : rows);
      setExampleLogs(example);
    })();
    return () => {
      active = false;
    };
  }, [athleteId, view, demoId, loading]);

  /* The month grid, its dots, its totals and its month arrows all lived here.
     They are gone: the Calendar card opens the athlete's REAL calendar screen
     now, and this page's job is who they are plus the three doors. */

  if (loading) {
    return <p className="px-4 py-16 text-center text-sm text-muted">Loading…</p>;
  }

  /*
    No card means the database said no: a captain (who never gets athlete data),
    or someone no longer on this squad. Say so plainly rather than showing an
    empty screen that looks like the athlete has never trained.
  */
  if (!card) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
        <Link href="/varsity/coach/team" className="flex items-center gap-1.5 text-[12px] text-muted">
          <IconArrowLeft size={14} />
          Squad
        </Link>
        <div className="mt-6 rounded-2xl border border-dashed border-border bg-surface px-4 py-8 text-center text-[12px] leading-relaxed text-muted">
          You can&apos;t see this athlete&apos;s training. Only a coach of their squad can, and only
          while they are on it.
        </div>
      </div>
    );
  }

  const p = card.profile;
  const cox = p.boatRole === "Coxswain";
  const side = sideMeta[p.side];
  const pinned = prPieces.filter((piece) => (p.prs[piece] ?? "").trim());

  /* Their name, or the honest absence of one — the page's title, and the name
     each of the three screens is opened under. */
  const who = card.name || "Unnamed athlete";

  return (
    <div className="mx-auto w-full max-w-screen-sm px-4 pb-10 pt-4">
      <Link href="/varsity/coach/team" className="flex items-center gap-1.5 text-[12px] text-muted">
        <IconArrowLeft size={14} />
        Squad
      </Link>

      {/* ── 1. Who ── */}
      <h1 className="mt-2 text-2xl font-semibold text-text">{who}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {cox ? (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            Coxswain
          </span>
        ) : (
          <span
            className="rounded-md border px-2 py-1 text-[11px] font-semibold"
            style={{
              background: side.color,
              color: side.ink,
              borderColor: `color-mix(in oklab, ${side.ink} 22%, transparent)`,
            }}
          >
            {side.label}
          </span>
        )}
        {p.teamYear && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.teamYear}
          </span>
        )}
        {card.classYear && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            Class of {card.classYear}
          </span>
        )}
        {p.heightCm != null && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.heightCm} cm
          </span>
        )}
        {p.weightKg != null && (
          <span className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
            {p.weightKg} kg
          </span>
        )}
        <span className="flex items-center gap-1.5 rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-text">
          <span className={`h-1.5 w-1.5 rounded-full ${toneDot[toneOf(p.status)]}`} />
          {p.status}
        </span>
      </div>

      {/* The technical note — it used to have a Notes tab of its own. */}
      <SectionLabel>Technical note</SectionLabel>
      <AthleteNote athleteId={athleteId} name={card.name || "this athlete"} />

      {pinned.length > 0 && (
        <>
          <SectionLabel>Personal bests</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {pinned.map((piece) => (
              <div
                key={piece}
                className="flex-1 rounded-xl border border-border bg-surface px-3 py-2.5 text-center"
              >
                <div className="text-[13px] font-semibold leading-none text-text">{p.prs[piece]}</div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                  {piece}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── THREE DOORS (owner, 2026-09-19) ──────────────────────────────────
          Not a switch that swaps the middle of this page: each one opens a
          whole screen of its own with a cross to come back. This page holds
          more than two halves — the erg is below, and more after it — and
          three long things taking turns in one panel is a page you get lost
          in. */}
      <div className="mt-6 grid grid-cols-3 gap-2">
        {(
          [
            ["stats", "Statistics", <IconActivity key="i" size={18} />],
            ["workouts", "Past workouts", <IconClipboard key="i" size={18} />],
            ["calendar", "Calendar", <IconCalendar key="i" size={18} />],
          ] as const
        ).map(([k, label, icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setOpenScreen(k)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface px-2 py-4 text-center active:bg-surface-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-tint text-primary">
              {icon}
            </span>
            <span className="text-[12px] font-semibold leading-tight text-text">{label}</span>
          </button>
        ))}
      </div>

      {/* ── 3. How fast ── */}
      <SectionLabel>
        Erg results · {results.length}
        {exampleResults && <ExampleTag />}
      </SectionLabel>
      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center text-[12px] text-muted">
          Nothing posted to the team board yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {results.map((r) => {
            /* A hand-typed result carries the split as the monitor showed it; a
               scanned or derived one only carries the seconds. Show whichever
               exists, and let the split imply the watts when none were typed —
               the same arithmetic the team board does. */
            const split = r.split ?? (r.splitSec != null ? secToSplit(r.splitSec) : null);
            const watts = deriveWatts(r.watts, r.splitSec);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-surface px-3.5 py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[13px] font-semibold text-text">
                    {dayKeyLabel(r.dayKey)}
                  </span>
                  {split && (
                    <span className="flex-shrink-0 text-[13px] font-semibold text-text">{split}</span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted">
                  {r.metres != null && <span>{formatDistance(r.metres, units.distance)}</span>}
                  {r.strokeRate != null && <span>r{r.strokeRate}</span>}
                  {/* ROUNDED, like the board and the result detail. Watts that
                      came from the athlete's monitor are whole; watts we work
                      out from a split are not, and this line was printing
                      "283.31454972708934 W". */}
                  {watts != null && <span>{Math.round(watts)} W</span>}
                  {r.weightKg != null && <span>{r.weightKg} kg</span>}
                  {r.monitor && <span>{r.monitor}</span>}
                </div>
                {r.note && <div className="mt-1 text-[11px] leading-relaxed text-muted">{r.note}</div>}
              </div>
            );
          })}
        </div>
      )}

      {/* ── the three screens ── */}
      {openScreen === "stats" && (
        <AthleteWindow name={who} title="Statistics" onClose={() => setOpenScreen(null)}>
          <AthleteStats athleteId={athleteId} demo={exampleLogs ? logs : undefined} />
        </AthleteWindow>
      )}
      {openScreen === "workouts" && (
        <AthleteWindow name={who} title="Past workouts" onClose={() => setOpenScreen(null)}>
          <AthleteWorkouts athleteId={athleteId} demo={exampleLogs ? logs : undefined} />
        </AthleteWindow>
      )}
      {openScreen === "calendar" && (
        /* THE REAL CALENDAR, full size (owner, 2026-09-19: "when it's over the
           whole page… make it the same as it was there in the normal"). It IS
           the screen a rower has under their own Calendar tab — the wall
           calendar with the workout written inside each day — read-only, and
           `real` so the month comes from this athlete's actual logs rather than
           the invented team-mate data the Team tab shows. The coach's own small
           month grid that used to be on this page is gone with it: two
           calendars of the same month is one too many. */
        <AthleteWindow name={who} title="Calendar" fill onClose={() => setOpenScreen(null)}>
          <CalendarScreen teammate={{ id: athleteId, real: true }} />
        </AthleteWindow>
      )}

    </div>
  );
}
